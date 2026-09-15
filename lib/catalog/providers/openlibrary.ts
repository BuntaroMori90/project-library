import type {
  BookCatalogProvider,
  BookCatalogResult,
  BookEditionCatalogResult,
} from "@/lib/catalog/types";

const BASE = "https://openlibrary.org";
const SEARCH_LIMIT = 20;
const EDITION_FETCH_LIMIT = 1000;
const MAX_IMPORTED_EDITIONS = 250;
const NON_ITALIAN_FALLBACK_LIMIT = 80;
const ITALIAN_PUBLISHER_HINTS = [
  "einaudi",
  "mondadori",
  "feltrinelli",
  "adelphi",
  "bompiani",
  "rizzoli",
  "sellerio",
  "garzanti",
  "longanesi",
  "marsilio",
  "fazi",
  "minimum fax",
  "nottetempo",
  "laterza",
  "il saggiatore",
  "edizioni e/o",
  "e/o",
  "sur",
];

const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "edition_count",
  "subject",
  "editions",
  "editions.key",
  "editions.title",
  "editions.language",
  "editions.publisher",
  "editions.isbn",
  "editions.cover_i",
  "editions.publish_year",
].join(",");

function catalogHeaders() {
  const app = process.env.CATALOG_USER_AGENT ?? "ProjectLibrary/0.1";
  const contact = process.env.CATALOG_CONTACT_EMAIL;
  return {
    Accept: "application/json",
    "User-Agent": contact ? `${app} (${contact})` : app,
  };
}

function coverFromId(id?: number | null, size: "M" | "L" = "L") {
  return id
    ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false`
    : null;
}

function yearFromDate(value?: string | null) {
  const match = value?.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

function firstString(value?: string | string[] | null) {
  if (typeof value === "string") return value;
  return value?.find((item) => Boolean(item?.trim())) ?? null;
}

function firstNumber(value?: number | number[] | null) {
  if (typeof value === "number") return value;
  return value?.find((item) => Number.isFinite(item)) ?? null;
}

function languageFromCode(value?: string | null) {
  if (!value) return null;
  const code = value.split("/").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ita: "Italiano",
    it: "Italiano",
    eng: "English",
    en: "English",
    jpn: "日本語",
    ja: "日本語",
    fre: "Français",
    fra: "Français",
    fr: "Français",
    spa: "Español",
    es: "Español",
    ger: "Deutsch",
    deu: "Deutsch",
    de: "Deutsch",
  };
  return code ? map[code] ?? code.toUpperCase() : null;
}

function descriptionValue(input: unknown) {
  if (typeof input === "string") return input;
  if (
    input &&
    typeof input === "object" &&
    "value" in input &&
    typeof (input as { value?: unknown }).value === "string"
  ) {
    return (input as { value: string }).value;
  }
  return null;
}

function idFromKey(key: string | undefined, suffix: "W" | "M") {
  const id = key?.split("/").filter(Boolean).pop();
  return id?.endsWith(suffix) ? id : null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedIsbn(value: string) {
  const compact = value.toUpperCase().replace(/[^0-9X]/g, "");
  return /^(?:\d{9}[\dX]|\d{13})$/.test(compact) ? compact : null;
}

function titleMatchScore(title: string | null | undefined, query: string) {
  if (!title) return 0;
  const candidate = normalizeText(title);
  const target = normalizeText(query);
  if (!candidate || !target) return 0;
  if (candidate === target) return 120;
  if (candidate.startsWith(target) || target.startsWith(candidate)) return 75;
  if (candidate.includes(target) || target.includes(candidate)) return 55;
  const tokens = target.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;
  const hits = tokens.filter((token) => candidate.includes(token)).length;
  return Math.round((hits / tokens.length) * 45);
}

type OpenLibrarySearchEdition = {
  key?: string;
  title?: string;
  language?: string | string[];
  publisher?: string | string[];
  isbn?: string | string[];
  cover_i?: number;
  publish_year?: number | number[];
};

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  subject?: string[];
  editions?: { docs?: OpenLibrarySearchEdition[] };
};

type OpenLibraryWork = {
  key?: string;
  title?: string;
  description?: unknown;
  covers?: number[];
  subjects?: string[];
  first_publish_date?: string;
  authors?: Array<{ author?: { key?: string }; key?: string }>;
};

type OpenLibraryEdition = {
  key?: string;
  title?: string;
  publishers?: string[];
  publish_date?: string;
  publish_country?: string;
  physical_format?: string;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  covers?: number[];
  languages?: Array<{ key?: string }>;
};

function editionFromSearch(
  edition: OpenLibrarySearchEdition | undefined,
): BookEditionCatalogResult | null {
  const providerId = idFromKey(edition?.key, "M");
  if (!providerId || !edition?.title) return null;
  const isbns = Array.isArray(edition.isbn)
    ? edition.isbn
    : edition.isbn
      ? [edition.isbn]
      : [];
  const isbn13 = isbns.find(
    (isbn) => isbn.replace(/[^0-9X]/gi, "").length === 13,
  );
  const isbn10 = isbns.find(
    (isbn) => isbn.replace(/[^0-9X]/gi, "").length === 10,
  );
  return {
    providerId,
    title: edition.title,
    publisher: firstString(edition.publisher),
    language: languageFromCode(firstString(edition.language)),
    country: null,
    isbn10: isbn10 ?? null,
    isbn13: isbn13 ?? null,
    publicationYear: firstNumber(edition.publish_year),
    format: null,
    pageCount: null,
    coverUrl: coverFromId(edition.cover_i),
  };
}

function resultFromDoc(doc: OpenLibrarySearchDoc): BookCatalogResult | null {
  const providerId = idFromKey(doc.key, "W");
  if (!providerId || !doc.title) return null;
  const matchedEdition = editionFromSearch(doc.editions?.docs?.[0]);
  const displayTitle = matchedEdition?.title?.trim() || doc.title;
  const differentTitle =
    normalizeText(displayTitle) !== normalizeText(doc.title) ? doc.title : null;

  return {
    provider: "OPEN_LIBRARY",
    providerId,
    title: displayTitle,
    originalTitle: differentTitle,
    description: null,
    coverUrl: matchedEdition?.coverUrl ?? coverFromId(doc.cover_i),
    releaseYear: doc.first_publish_year ?? null,
    publicationStatus: "UNKNOWN",
    creators: (doc.author_name ?? [])
      .slice(0, 5)
      .map((name) => ({ name, role: "AUTHOR" as const })),
    genres: (doc.subject ?? []).slice(0, 8),
    editionCount: doc.edition_count ?? null,
    matchedEdition,
    sourceUrl: `${BASE}/works/${providerId}`,
  };
}

function searchScore(result: BookCatalogResult, query: string, rank: number) {
  let score = titleMatchScore(result.title, query);
  score = Math.max(score, titleMatchScore(result.originalTitle, query) - 5);

  for (const creator of result.creators) {
    score = Math.max(score, titleMatchScore(creator.name, query) - 15);
  }

  const edition = result.matchedEdition;
  if (edition?.language === "Italiano") score += 28;
  if (edition?.coverUrl) score += 8;
  if (edition?.publisher) score += 5;
  if (edition?.isbn13 || edition?.isbn10) score += 6;
  if (result.coverUrl) score += 4;
  if (result.editionCount) score += Math.min(8, Math.log2(result.editionCount + 1));
  score += Math.max(0, 20 - rank);
  return score;
}

function isItalianPublisher(publisher?: string | null) {
  if (!publisher) return false;
  const normalized = normalizeText(publisher);
  return ITALIAN_PUBLISHER_HINTS.some((hint) =>
    normalized.includes(normalizeText(hint)),
  );
}

function editionScore(edition: BookEditionCatalogResult) {
  return (
    (edition.language === "Italiano" ? 120 : 0) +
    (isItalianPublisher(edition.publisher) ? 70 : 0) +
    (edition.coverUrl ? 16 : 0) +
    (edition.isbn13 ? 12 : edition.isbn10 ? 6 : 0) +
    (edition.publisher ? 8 : 0) +
    (edition.pageCount ? 5 : 0) +
    (edition.publicationYear ? 2 : 0) +
    (edition.language === "English" ? 4 : 0)
  );
}

function editionIdentity(edition: BookEditionCatalogResult) {
  const isbn13 = edition.isbn13?.replace(/[^0-9X]/gi, "");
  if (isbn13) return `13:${isbn13}`;
  const isbn10 = edition.isbn10?.replace(/[^0-9X]/gi, "");
  if (isbn10) return `10:${isbn10}`;
  return `ol:${edition.providerId}`;
}

function selectUsefulEditions(editions: BookEditionCatalogResult[]) {
  const unique = new Map<string, BookEditionCatalogResult>();
  for (const edition of editions) {
    const key = editionIdentity(edition);
    const current = unique.get(key);
    if (!current || editionScore(edition) > editionScore(current)) {
      unique.set(key, edition);
    }
  }

  const ranked = [...unique.values()].sort(
    (a, b) => editionScore(b) - editionScore(a),
  );
  const italian = ranked.filter(
    (edition) =>
      edition.language === "Italiano" || isItalianPublisher(edition.publisher),
  );
  const fallback = ranked
    .filter(
      (edition) =>
        edition.language !== "Italiano" && !isItalianPublisher(edition.publisher),
    )
    .slice(0, NON_ITALIAN_FALLBACK_LIMIT);

  return [...italian, ...fallback]
    .sort((a, b) => editionScore(b) - editionScore(a))
    .slice(0, MAX_IMPORTED_EDITIONS);
}

async function searchOpenLibrary(params: {
  q?: string;
  title?: string;
  limit?: number;
}) {
  const url = new URL(`${BASE}/search.json`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.title) url.searchParams.set("title", params.title);
  url.searchParams.set("lang", "it");
  url.searchParams.set("limit", String(params.limit ?? SEARCH_LIMIT));
  url.searchParams.set("fields", SEARCH_FIELDS);

  const response = await fetch(url, {
    headers: catalogHeaders(),
    next: { revalidate: 1800 },
  });
  if (!response.ok) {
    throw new Error("Open Library non è disponibile in questo momento.");
  }
  const payload = (await response.json()) as { docs?: OpenLibrarySearchDoc[] };
  return payload.docs ?? [];
}

export class OpenLibraryProvider implements BookCatalogProvider {
  readonly name = "OPEN_LIBRARY" as const;

  async search(query: string): Promise<BookCatalogResult[]> {
    const normalizedQuery = query.trim();
    const isbn = normalizedIsbn(normalizedQuery);
    const searches = isbn
      ? [
          searchOpenLibrary({ q: isbn }),
          searchOpenLibrary({ q: `isbn:${isbn}` }),
        ]
      : [
          searchOpenLibrary({ q: normalizedQuery }),
          searchOpenLibrary({ title: normalizedQuery }),
        ];

    const responses = await Promise.allSettled(searches);
    const successful = responses
      .filter(
        (result): result is PromiseFulfilledResult<OpenLibrarySearchDoc[]> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    if (!successful.length) {
      throw new Error("Open Library non è disponibile in questo momento.");
    }

    const merged = new Map<
      string,
      { result: BookCatalogResult; score: number }
    >();

    successful.forEach((docs, searchIndex) => {
      docs.forEach((doc, rank) => {
        const result = resultFromDoc(doc);
        if (!result) return;
        const score =
          searchScore(result, normalizedQuery, rank) +
          (searchIndex === 1 ? 12 : 0);
        const previous = merged.get(result.providerId);
        if (!previous || score > previous.score) {
          merged.set(result.providerId, { result, score });
        }
      });
    });

    return [...merged.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_LIMIT)
      .map(({ result }) => result);
  }

  async getById(id: string): Promise<BookCatalogResult> {
    const safeId = id.replace(/^\/works\//, "");
    const [workResponse, editionsResponse] = await Promise.all([
      fetch(`${BASE}/works/${encodeURIComponent(safeId)}.json`, {
        headers: catalogHeaders(),
        cache: "no-store",
      }),
      fetch(
        `${BASE}/works/${encodeURIComponent(safeId)}/editions.json?limit=${EDITION_FETCH_LIMIT}`,
        { headers: catalogHeaders(), cache: "no-store" },
      ),
    ]);

    if (!workResponse.ok) throw new Error("Opera non trovata su Open Library.");
    const work = (await workResponse.json()) as OpenLibraryWork;
    const editionPayload = editionsResponse.ok
      ? ((await editionsResponse.json()) as {
          entries?: OpenLibraryEdition[];
          size?: number;
        })
      : { entries: [] as OpenLibraryEdition[], size: 0 };

    const authorKeys = (work.authors ?? [])
      .map((entry) => entry.author?.key ?? entry.key)
      .filter((key): key is string => Boolean(key))
      .slice(0, 5);

    const authors = await Promise.all(
      authorKeys.map(async (key) => {
        try {
          const response = await fetch(`${BASE}${key}.json`, {
            headers: catalogHeaders(),
            next: { revalidate: 86400 },
          });
          if (!response.ok) return null;
          const payload = (await response.json()) as { name?: string };
          return payload.name ?? null;
        } catch {
          return null;
        }
      }),
    );

    const normalizedEditions = (editionPayload.entries ?? [])
      .map((edition): BookEditionCatalogResult | null => {
        const providerId = idFromKey(edition.key, "M");
        if (!providerId) return null;
        const language = languageFromCode(edition.languages?.[0]?.key);
        return {
          providerId,
          title: edition.title ?? work.title ?? "Edizione",
          publisher: edition.publishers?.[0] ?? null,
          language,
          country: edition.publish_country ?? null,
          isbn10: edition.isbn_10?.[0] ?? null,
          isbn13: edition.isbn_13?.[0] ?? null,
          publicationYear: yearFromDate(edition.publish_date),
          format: edition.physical_format ?? null,
          pageCount: edition.number_of_pages ?? null,
          coverUrl: coverFromId(edition.covers?.[0]),
        };
      })
      .filter((edition): edition is BookEditionCatalogResult => Boolean(edition));

    const editions = selectUsefulEditions(normalizedEditions);
    const preferredEdition = editions[0] ?? null;
    const workTitle = work.title ?? "Titolo non disponibile";
    const displayTitle =
      preferredEdition?.language === "Italiano" && preferredEdition.title
        ? preferredEdition.title
        : workTitle;

    return {
      provider: this.name,
      providerId: safeId,
      title: displayTitle,
      originalTitle:
        normalizeText(displayTitle) !== normalizeText(workTitle)
          ? workTitle
          : null,
      description: descriptionValue(work.description),
      coverUrl:
        preferredEdition?.coverUrl ??
        coverFromId(work.covers?.[0]) ??
        editions.find((edition) => edition.coverUrl)?.coverUrl ??
        null,
      releaseYear:
        yearFromDate(work.first_publish_date) ??
        editions
          .map((edition) => edition.publicationYear)
          .filter((year): year is number => Boolean(year))
          .sort((a, b) => a - b)[0] ??
        null,
      publicationStatus: "UNKNOWN",
      creators: authors
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ name, role: "AUTHOR" as const })),
      genres: (work.subjects ?? []).slice(0, 12),
      editionCount: editionPayload.size ?? editionPayload.entries?.length ?? null,
      editions,
      matchedEdition: preferredEdition,
      sourceUrl: `${BASE}/works/${safeId}`,
    };
  }
}
