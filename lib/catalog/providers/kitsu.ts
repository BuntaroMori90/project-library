import type { MangaCatalogProvider, MangaCatalogResult } from "@/lib/catalog/types";

const BASE_URL = "https://kitsu.io/api/edge";

function status(value?: string | null): MangaCatalogResult["publicationStatus"] {
  switch ((value ?? "").toLowerCase()) {
    case "current":
      return "ONGOING";
    case "finished":
      return "COMPLETED";
    case "discontinued":
      return "CANCELLED";
    case "hiatus":
      return "HIATUS";
    default:
      return "UNKNOWN";
  }
}

type KitsuManga = {
  id: string;
  type: "manga";
  attributes?: {
    canonicalTitle?: string | null;
    titles?: Record<string, string | null | undefined>;
    synopsis?: string | null;
    slug?: string | null;
    startDate?: string | null;
    status?: string | null;
    volumeCount?: number | null;
    chapterCount?: number | null;
    posterImage?: {
      tiny?: string | null;
      small?: string | null;
      medium?: string | null;
      large?: string | null;
      original?: string | null;
    } | null;
  };
};

type KitsuResponse = {
  data?: KitsuManga[] | KitsuManga;
};

function normalize(manga: KitsuManga): MangaCatalogResult {
  const attributes = manga.attributes ?? {};
  const titles = attributes.titles ?? {};
  const title =
    attributes.canonicalTitle ??
    titles.en ??
    titles.en_jp ??
    titles.ja_jp ??
    Object.values(titles).find(Boolean) ??
    `Manga ${manga.id}`;

  return {
    provider: "KITSU",
    providerId: manga.id,
    title,
    originalTitle: titles.ja_jp ?? titles.ja ?? null,
    description: attributes.synopsis ?? null,
    coverUrl:
      attributes.posterImage?.large ??
      attributes.posterImage?.original ??
      attributes.posterImage?.medium ??
      attributes.posterImage?.small ??
      null,
    releaseYear: attributes.startDate
      ? Number(attributes.startDate.slice(0, 4)) || null
      : null,
    publicationStatus: status(attributes.status),
    volumeCount: attributes.volumeCount ?? null,
    chapterCount: attributes.chapterCount ?? null,
    creators: [],
    genres: [],
    sourceUrl: attributes.slug
      ? `https://kitsu.app/manga/${attributes.slug}`
      : `https://kitsu.app/manga/${manga.id}`,
  };
}

export class KitsuProvider implements MangaCatalogProvider {
  name = "KITSU" as const;

  private async request(path: string) {
    let lastStatus: number | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          cache: "no-store",
          headers: { Accept: "application/vnd.api+json" },
          signal: controller.signal,
        });
        lastStatus = response.status;

        if (response.ok) {
          return (await response.json()) as KitsuResponse;
        }

        if (![429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`Kitsu API: ${response.status}`);
        }
      } catch (error) {
        if (attempt === 2) {
          if (error instanceof Error && error.name !== "AbortError") throw error;
          throw new Error("Kitsu non risponde in questo momento. Riprova tra poco.");
        }
      } finally {
        clearTimeout(timeout);
      }

      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }

    throw new Error(
      lastStatus
        ? `Kitsu temporaneamente non disponibile (${lastStatus}).`
        : "Kitsu temporaneamente non disponibile.",
    );
  }

  async search(query: string) {
    const params = new URLSearchParams({
      "filter[text]": query,
      "page[limit]": "10",
    });
    const payload = await this.request(`/manga?${params}`);
    return Array.isArray(payload.data) ? payload.data.map(normalize) : [];
  }

  async getById(id: string) {
    const payload = await this.request(`/manga/${encodeURIComponent(id)}`);
    if (!payload.data || Array.isArray(payload.data)) {
      throw new Error("Manga non trovato su Kitsu.");
    }
    return normalize(payload.data);
  }
}
