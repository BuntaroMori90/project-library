import "server-only";
import { OpenLibraryProvider } from "@/lib/catalog/providers/openlibrary";

export type MangaVolumeCoverLookupInput = {
  workTitle: string;
  unitNumber: number;
  publisher: string | null;
  isbn: string | null;
  editionName: string | null;
};

export type MangaVolumeCoverMatch = {
  coverUrl: string;
  source: "GOOGLE_BOOKS" | "OPEN_LIBRARY";
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
    .replace(/[^a-z0-9]+/g, " ")
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

function scoreCandidate(params: {
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

  const titleScore = baseTitleScore(params.candidateTitle, params.input.workTitle);
  if (!titleScore) return 0;
  if (
    !hasVolumeEvidence(
      params.candidateTitle,
      params.input.workTitle,
      params.input.unitNumber,
    )
  ) {
    return 0;
  }

  let score = titleScore + 34;
  if (params.input.publisher) {
    if (publisherMatches(params.input.publisher, params.candidatePublisher)) score += 28;
    else if (params.candidatePublisher) score -= 24;
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
  const titleQuery = `intitle:"${input.workTitle}" ${input.unitNumber}`;
  url.searchParams.set("q", exactIsbn ? `isbn:${exactIsbn}` : titleQuery);
  url.searchParams.set("printType", "books");
  url.searchParams.set("projection", "lite");
  url.searchParams.set("maxResults", "16");
  url.searchParams.set("langRestrict", "it");
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (key) url.searchParams.set("key", key);

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
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
  } catch {
    return [];
  }
}

async function searchOpenLibrary(
  input: MangaVolumeCoverLookupInput,
): Promise<MangaVolumeCoverMatch[]> {
  const provider = new OpenLibraryProvider();
  const exactIsbn = compactIsbn(input.isbn);
  const query = exactIsbn ?? `${input.workTitle} ${input.unitNumber}`;
  try {
    const results = await provider.search(query);
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
  } catch {
    return [];
  }
}

function sameBibliographicCandidate(
  first: MangaVolumeCoverMatch,
  second: MangaVolumeCoverMatch,
) {
  if (normalize(first.title) === normalize(second.title)) return true;
  return Boolean(
    first.publisher &&
      second.publisher &&
      publisherMatches(first.publisher, second.publisher) &&
      normalize(first.title).includes(normalize(second.title)),
  );
}

export async function findAutomaticMangaVolumeCover(
  input: MangaVolumeCoverLookupInput,
): Promise<MangaVolumeCoverMatch | null> {
  if (
    !Number.isInteger(input.unitNumber) ||
    input.unitNumber < 1 ||
    input.unitNumber > 10000
  ) {
    return null;
  }

  const google = await searchGoogleBooks(input);
  const bestGoogle = google.sort((a, b) => b.score - a.score)[0];
  if (bestGoogle?.score >= 130) return bestGoogle;

  const openLibrary = await searchOpenLibrary(input);
  const candidates = [...google, ...openLibrary].sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 100) return null;

  const runnerUp = candidates[1];
  if (
    runnerUp &&
    runnerUp.coverUrl !== best.coverUrl &&
    best.score - runnerUp.score < 8 &&
    !sameBibliographicCandidate(best, runnerUp)
  ) {
    return null;
  }
  return best;
}
