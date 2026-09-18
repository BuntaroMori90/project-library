import "server-only";

import { OpenLibraryProvider } from "@/lib/catalog/providers/openlibrary";



export type MangaVolumeCoverLookupInput = {

  workTitle: string;

  alternativeTitles?: string[];

  language?: string | null;

  unitNumber: number;

  publisher: string | null;

  isbn: string | null;

  editionName: string | null;

};



export type MangaVolumeCoverMatch = {

  coverUrl: string;

  source: "GOOGLE_BOOKS" | "OPEN_LIBRARY" | "POPSTORE";

  score: number;

  title: string;

  publisher: string | null;

};



type GoogleBooksVolume = {

  id?: string;

  volumeInfo?: {

    title?: string;

    subtitle?: string;

    publisher?: string;

    language?: string;

    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;

    imageLinks?: {

      smallThumbnail?: string;

      thumbnail?: string;

      small?: string;

      medium?: string;

      large?: string;

      extraLarge?: string;

    };

  };

};



type GoogleBooksPayload = { items?: GoogleBooksVolume[] };



const SUSPICIOUS_EDITION_MARKERS = [

  "color walk",
  "artbook",
  "novel",
  "romanzo",
  "databook",
  "new edition",

  "deluxe",

  "omnibus",

  "maximum",

  "collector",

  "collectors",

  "perfect edition",

  "kanzenban",

  "box set",

  "variant",

];



function normalize(value: string | null | undefined) {

  return (value ?? "")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[’']/g, "")

    .replace(/[^\p{L}\p{N}]+/gu, " ")

    .trim();

}



function compactIsbn(value: string | null | undefined) {

  const isbn = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "");

  return /^(?:\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : null;

}



function publisherMatches(expected: string | null, actual: string | null) {

  if (!expected || !actual) return false;

  const a = normalize(expected);

  const b = normalize(actual);

  if (!a || !b) return false;

  if (a.includes(b) || b.includes(a)) return true;

  const tokens = a.split(" ").filter((token) => token.length > 2);

  if (!tokens.length) return false;

  const hits = tokens.filter((token) => b.includes(token)).length;

  return hits / tokens.length >= 0.6;

}



function baseTitleScore(candidateTitle: string, workTitle: string) {

  const candidate = normalize(candidateTitle);

  const work = normalize(workTitle);

  if (!candidate || !work) return 0;

  if (candidate === work) return 70;

  if (candidate.includes(work)) return 68;



  const tokens = work

    .split(" ")

    .filter((token) => token.length > 1 && !/^\d+$/.test(token));

  if (!tokens.length) return 0;

  const hits = tokens.filter((token) => candidate.includes(token)).length;

  const ratio = hits / tokens.length;

  return ratio >= 0.8 ? Math.round(48 + ratio * 12) : 0;

}



function hasVolumeEvidence(candidateTitle: string, workTitle: string, volume: number) {

  const candidate = normalize(candidateTitle);

  const work = normalize(workTitle);

  const escaped = String(volume).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const explicit = new RegExp(

    `(?:^|\\s)(?:vol|volume|n|numero|num|tomo)\\s*${escaped}(?:\\s|$)`,

  );

  if (explicit.test(candidate)) return true;



  if (candidate.includes(work)) {

    const remainder = candidate.replace(work, " ").trim();

    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(remainder);

  }

  return false;

}



function hasUnexpectedEditionMarker(candidateTitle: string, editionName: string | null) {

  const candidate = normalize(candidateTitle);

  const edition = normalize(editionName);

  return SUSPICIOUS_EDITION_MARKERS.some(

    (marker) => candidate.includes(marker) && !edition.includes(marker),

  );

}



export function scoreCandidate(params: {

  candidateTitle: string;

  candidatePublisher: string | null;

  candidateLanguage: string | null;

  identifiers: string[];

  input: MangaVolumeCoverLookupInput;

}) {

  const expectedIsbn = compactIsbn(params.input.isbn);

  if (expectedIsbn) {

    const identifiers = params.identifiers

      .map(compactIsbn)

      .filter((value): value is string => Boolean(value));

    if (identifiers.includes(expectedIsbn)) return 260;

  }



  if (hasUnexpectedEditionMarker(params.candidateTitle, params.input.editionName)) {

    return 0;

  }



  const titles = [params.input.workTitle, ...(params.input.alternativeTitles ?? [])];

  const titleScore = Math.max(...titles.map((title) => baseTitleScore(params.candidateTitle, title)));

  if (!titleScore) return 0;

  if (

    !titles.some((title) => hasVolumeEvidence(params.candidateTitle, title, params.input.unitNumber))

  ) {

    return 0;

  }



  const edition = normalize(params.input.editionName);

  if (SUSPICIOUS_EDITION_MARKERS.some((marker) => edition.includes(marker) && !normalize(params.candidateTitle).includes(marker))) return 0;

  const language = normalize(params.candidateLanguage);

  const expectedLanguage = normalize(params.input.language || "it");

  if (expectedLanguage.startsWith("it") && language && !language.startsWith("it")) return 0;

  let score = titleScore + 34;

  if (params.input.publisher) {

    if (publisherMatches(params.input.publisher, params.candidatePublisher)) score += 28;

    else if (params.candidatePublisher) return 0;

  }

  if (params.candidateLanguage?.toLowerCase().startsWith("it")) score += 10;

  return score;

}



function secureImage(url: string | null | undefined) {

  if (!url) return null;

  if (url.startsWith("http://")) return `https://${url.slice(7)}`;

  return url.startsWith("https://") ? url : null;

}



function bestGoogleImage(volume: GoogleBooksVolume) {

  const links = volume.volumeInfo?.imageLinks;

  return secureImage(

    links?.extraLarge ??

      links?.large ??

      links?.medium ??

      links?.small ??

      links?.thumbnail ??

      links?.smallThumbnail,

  );

}



async function fetchWithTimeout(url: URL, timeoutMs = 5500) {

  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {

    return await fetch(url, {

      headers: { Accept: "application/json" },

      signal: controller.signal,

      next: { revalidate: 86400 },

    });

  } finally {

    clearTimeout(timeout);

  }

}



async function searchGoogleBooks(

  input: MangaVolumeCoverLookupInput,

): Promise<MangaVolumeCoverMatch[]> {

  const url = new URL("https://www.googleapis.com/books/v1/volumes");

  const exactIsbn = compactIsbn(input.isbn);

  const edition = SUSPICIOUS_EDITION_MARKERS.filter((marker) => normalize(input.editionName).includes(marker)).join(" ");

  const titleQuery = `intitle:"${input.workTitle}" ${edition} ${input.unitNumber}`;

  url.searchParams.set("q", exactIsbn ? `isbn:${exactIsbn}` : titleQuery);

  url.searchParams.set("printType", "books");

  url.searchParams.set("projection", "full");

  url.searchParams.set("maxResults", "40");

  url.searchParams.set("langRestrict", "it");

  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();

  if (key) url.searchParams.set("key", key);



  {

    const response = await fetchWithTimeout(url);

    if (!response.ok) throw new Error(`Catalogo non disponibile (${response.status}).`);

    const payload = (await response.json()) as GoogleBooksPayload;

    return (payload.items ?? [])

      .map((volume): MangaVolumeCoverMatch | null => {

        const info = volume.volumeInfo;

        const coverUrl = bestGoogleImage(volume);

        const title = [info?.title, info?.subtitle].filter(Boolean).join(" ");

        if (!coverUrl || !title) return null;

        const identifiers = (info?.industryIdentifiers ?? [])

          .map((item) => item.identifier ?? "")

          .filter(Boolean);

        const score = scoreCandidate({

          candidateTitle: title,

          candidatePublisher: info?.publisher ?? null,

          candidateLanguage: info?.language ?? null,

          identifiers,

          input,

        });

        if (score < 100) return null;

        return {

          coverUrl,

          source: "GOOGLE_BOOKS",

          score,

          title,

          publisher: info?.publisher ?? null,

        };

      })

      .filter((candidate): candidate is MangaVolumeCoverMatch => Boolean(candidate));

  }

}



async function searchOpenLibrary(

  input: MangaVolumeCoverLookupInput,

): Promise<MangaVolumeCoverMatch[]> {

  const provider = new OpenLibraryProvider();

  const exactIsbn = compactIsbn(input.isbn);

  const query = exactIsbn ?? `${input.workTitle} ${input.unitNumber}`;

  {

    const results = await provider.search(query, AbortSignal.timeout(5500));

    return results

      .slice(0, 12)

      .map((result): MangaVolumeCoverMatch | null => {

        const edition = result.matchedEdition;

        const coverUrl = secureImage(edition?.coverUrl ?? result.coverUrl);

        const title = edition?.title ?? result.title;

        if (!coverUrl || !title) return null;

        const score = scoreCandidate({

          candidateTitle: title,

          candidatePublisher: edition?.publisher ?? null,

          candidateLanguage: edition?.language ?? null,

          identifiers: [edition?.isbn13 ?? "", edition?.isbn10 ?? ""].filter(Boolean),

          input,

        });

        if (score < 100) return null;

        return {

          coverUrl,

          source: "OPEN_LIBRARY",

          score,

          title,

          publisher: edition?.publisher ?? null,

        };

      })

      .filter((candidate): candidate is MangaVolumeCoverMatch => Boolean(candidate));

  }

}



function sameBibliographicCandidate(

  first: MangaVolumeCoverMatch,

  second: MangaVolumeCoverMatch,

) {

  if (normalize(first.title) === normalize(second.title) && first.publisher && second.publisher && publisherMatches(first.publisher, second.publisher)) return true;

  return Boolean(

    first.publisher &&

      second.publisher &&

      publisherMatches(first.publisher, second.publisher) &&

      normalize(first.title).includes(normalize(second.title)),

  );

}



async function searchItalianStore(input: MangaVolumeCoverLookupInput): Promise<MangaVolumeCoverMatch[]> {

  const url = new URL("https://popstore.it/search/suggest.json");

  const edition = SUSPICIOUS_EDITION_MARKERS.filter((marker) => normalize(input.editionName).includes(marker)).join(" ");

  url.searchParams.set("q", `${input.workTitle} ${edition} ${input.unitNumber}`);

  url.searchParams.set("resources[type]", "product");

  url.searchParams.set("resources[limit]", "10");

  url.searchParams.set("resources[options][unavailable_products]", "show");

  url.searchParams.set("resources[options][fields]", "title");

  const response = await fetchWithTimeout(url);

  if (!response.ok) throw new Error("Catalogo italiano non disponibile.");

  const payload = await response.json() as { resources?: { results?: { products?: Array<{ title: string; vendor?: string; image?: string }> } } };

  return (payload.resources?.results?.products ?? []).flatMap((product) => {

    const coverUrl = secureImage(product.image);

    if (!coverUrl || !product.title) return [];

    const score = scoreCandidate({ candidateTitle: product.title, candidatePublisher: product.vendor ?? null,

      candidateLanguage: "it", identifiers: [], input });

    return score >= 100 ? [{ coverUrl, title: product.title, publisher: product.vendor ?? null, score,

      source: "POPSTORE" as const }] : [];

  });

}



export async function findAutomaticMangaVolumeCover(

  input: MangaVolumeCoverLookupInput,

): Promise<{ match: MangaVolumeCoverMatch | null; unavailable: boolean }> {

  if (!Number.isInteger(input.unitNumber) || input.unitNumber < 1 || input.unitNumber > 10000) {

    return { match: null, unavailable: false };

  }

  const titles = [...new Set([input.workTitle, ...(input.alternativeTitles ?? [])].filter(Boolean))].slice(0, 5);

  const candidates: MangaVolumeCoverMatch[] = [];

  let unavailable = false;

  // Bound provider concurrency and stop after a confident, unambiguous match.

  for (const title of titles) {

    const attemptInput = { ...input, workTitle: title, alternativeTitles: titles };

    const attempts = await Promise.allSettled([

      searchGoogleBooks(attemptInput), searchItalianStore(attemptInput), searchOpenLibrary(attemptInput),

    ]);

    for (const attempt of attempts) {

      if (attempt.status === "fulfilled") candidates.push(...attempt.value);

      else unavailable = true;

    }

    const unique = [...new Map(candidates.map((item) => [item.coverUrl, item])).values()].sort((a,b) => b.score-a.score);

    const [best, runnerUp] = unique;

    if (best && (!runnerUp || best.score-runnerUp.score >= 8 || sameBibliographicCandidate(best,runnerUp))) {

      return { match: best, unavailable };

    }

  }

  return { match: null, unavailable };

}

