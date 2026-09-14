import type { BookCatalogProvider, BookCatalogResult, BookEditionCatalogResult } from "@/lib/catalog/types";

const BASE = "https://openlibrary.org";

function catalogHeaders() {
  const app = process.env.CATALOG_USER_AGENT ?? "ProjectLibrary/0.1";
  const contact = process.env.CATALOG_CONTACT_EMAIL;
  return {
    Accept: "application/json",
    "User-Agent": contact ? `${app} (${contact})` : app,
  };
}

function coverFromId(id?: number | null, size: "M" | "L" = "L") {
  return id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false` : null;
}

function yearFromDate(value?: string | null) {
  const match = value?.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

function languageFromKey(key?: string | null) {
  if (!key) return null;
  const code = key.split("/").pop()?.toLowerCase();
  const map: Record<string, string> = { ita: "Italiano", eng: "English", jpn: "日本語", fre: "Français", spa: "Español", ger: "Deutsch" };
  return code ? map[code] ?? code.toUpperCase() : null;
}

function descriptionValue(input: unknown) {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && "value" in input && typeof (input as { value?: unknown }).value === "string") {
    return (input as { value: string }).value;
  }
  return null;
}

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  subject?: string[];
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
  physical_format?: string;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  covers?: number[];
  languages?: Array<{ key?: string }>;
};

export class OpenLibraryProvider implements BookCatalogProvider {
  readonly name = "OPEN_LIBRARY" as const;

  async search(query: string): Promise<BookCatalogResult[]> {
    const url = new URL(`${BASE}/search.json`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "8");
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,edition_count,subject");

    const response = await fetch(url, { headers: catalogHeaders(), next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("Open Library non è disponibile in questo momento.");
    const payload = await response.json() as { docs?: OpenLibrarySearchDoc[] };

    return (payload.docs ?? [])
      .filter((doc) => doc.key?.startsWith("/works/") && doc.title)
      .map((doc) => ({
        provider: this.name,
        providerId: doc.key!.replace("/works/", ""),
        title: doc.title!,
        originalTitle: null,
        description: null,
        coverUrl: coverFromId(doc.cover_i),
        releaseYear: doc.first_publish_year ?? null,
        publicationStatus: "UNKNOWN",
        creators: (doc.author_name ?? []).slice(0, 5).map((name) => ({ name, role: "AUTHOR" as const })),
        genres: (doc.subject ?? []).slice(0, 8),
        editionCount: doc.edition_count ?? null,
        sourceUrl: `${BASE}${doc.key}`,
      }));
  }

  async getById(id: string): Promise<BookCatalogResult> {
    const safeId = id.replace(/^\/works\//, "");
    const [workResponse, editionsResponse] = await Promise.all([
      fetch(`${BASE}/works/${encodeURIComponent(safeId)}.json`, { headers: catalogHeaders(), cache: "no-store" }),
      fetch(`${BASE}/works/${encodeURIComponent(safeId)}/editions.json?limit=40`, { headers: catalogHeaders(), cache: "no-store" }),
    ]);

    if (!workResponse.ok) throw new Error("Opera non trovata su Open Library.");
    const work = await workResponse.json() as OpenLibraryWork;
    const editionPayload = editionsResponse.ok ? await editionsResponse.json() as { entries?: OpenLibraryEdition[] } : { entries: [] };

    const authorKeys = (work.authors ?? [])
      .map((entry) => entry.author?.key ?? entry.key)
      .filter((key): key is string => Boolean(key))
      .slice(0, 5);

    const authors = await Promise.all(authorKeys.map(async (key) => {
      try {
        const response = await fetch(`${BASE}${key}.json`, { headers: catalogHeaders(), next: { revalidate: 86400 } });
        if (!response.ok) return null;
        const payload = await response.json() as { name?: string };
        return payload.name ?? null;
      } catch {
        return null;
      }
    }));

    const editions = (editionPayload.entries ?? [])
      .map((edition): BookEditionCatalogResult | null => {
        const providerId = edition.key?.replace("/books/", "");
        if (!providerId) return null;
        const language = languageFromKey(edition.languages?.[0]?.key);
        return {
          providerId,
          title: edition.title ?? work.title ?? "Edizione",
          publisher: edition.publishers?.[0] ?? null,
          language,
          country: null,
          isbn10: edition.isbn_10?.[0] ?? null,
          isbn13: edition.isbn_13?.[0] ?? null,
          publicationYear: yearFromDate(edition.publish_date),
          format: edition.physical_format ?? null,
          pageCount: edition.number_of_pages ?? null,
          coverUrl: coverFromId(edition.covers?.[0]),
        };
      })
      .filter((edition): edition is BookEditionCatalogResult => Boolean(edition))
      .sort((a, b) => {
        const score = (edition: BookEditionCatalogResult) =>
          (edition.language === "Italiano" ? 8 : edition.language === "English" ? 4 : 0) +
          (edition.coverUrl ? 2 : 0) +
          (edition.isbn13 ? 2 : edition.isbn10 ? 1 : 0) +
          (edition.pageCount ? 1 : 0);
        return score(b) - score(a);
      })
      .slice(0, 16);

    return {
      provider: this.name,
      providerId: safeId,
      title: work.title ?? "Titolo non disponibile",
      originalTitle: null,
      description: descriptionValue(work.description),
      coverUrl: coverFromId(work.covers?.[0]) ?? editions.find((edition) => edition.coverUrl)?.coverUrl ?? null,
      releaseYear: yearFromDate(work.first_publish_date) ?? editions.map((edition) => edition.publicationYear).filter((year): year is number => Boolean(year)).sort((a, b) => a - b)[0] ?? null,
      publicationStatus: "UNKNOWN",
      creators: authors.filter((name): name is string => Boolean(name)).map((name) => ({ name, role: "AUTHOR" as const })),
      genres: (work.subjects ?? []).slice(0, 12),
      editionCount: editionPayload.entries?.length ?? null,
      editions,
      sourceUrl: `${BASE}/works/${safeId}`,
    };
  }
}
