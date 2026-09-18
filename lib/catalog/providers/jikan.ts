import type { MangaCatalogProvider, MangaCatalogResult } from "@/lib/catalog/types";

const BASE_URL = "https://api.jikan.moe/v4";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 8000;

function status(value?: string | null): MangaCatalogResult["publicationStatus"] {
  if (!value) return "UNKNOWN";
  const normalized = value.toLowerCase();
  if (normalized.includes("publishing")) return "ONGOING";
  if (normalized.includes("finished")) return "COMPLETED";
  if (normalized.includes("hiatus")) return "HIATUS";
  if (normalized.includes("discontinued")) return "CANCELLED";
  return "UNKNOWN";
}

type JikanManga = {
  mal_id: number;
  title: string;
  title_japanese?: string;
  synopsis?: string;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  published?: { from?: string };
  status?: string;
  volumes?: number | null;
  chapters?: number | null;
  authors?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
};

type JikanResponse = { data?: JikanManga[] | JikanManga };

function normalize(manga: JikanManga): MangaCatalogResult {
  return {
    provider: "JIKAN_DEV",
    providerId: String(manga.mal_id),
    title: manga.title,
    originalTitle: manga.title_japanese ?? null,
    description: manga.synopsis ?? null,
    coverUrl: manga.images?.jpg?.large_image_url ?? manga.images?.jpg?.image_url ?? null,
    releaseYear: manga.published?.from ? Number(manga.published.from.slice(0, 4)) || null : null,
    publicationStatus: status(manga.status),
    volumeCount: manga.volumes ?? null,
    chapterCount: manga.chapters ?? null,
    creators: (manga.authors ?? []).flatMap((author) =>
      author.name ? [{ name: author.name, role: "AUTHOR" as const }] : [],
    ),
    genres: (manga.genres ?? []).flatMap((genre) =>
      genre.name ? [genre.name] : [],
    ),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class JikanDevelopmentProvider implements MangaCatalogProvider {
  name = "JIKAN_DEV" as const;

  private async request(path: string) {
    let lastStatus: number | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": process.env.CATALOG_USER_AGENT ?? "ProjectLibrary/0.1",
          },
        });

        if (response.ok) {
          return (await response.json()) as JikanResponse;
        }

        lastStatus = response.status;
        if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) {
          break;
        }

        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 700 * attempt;
        await wait(delay);
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        if (!aborted || attempt === MAX_ATTEMPTS) break;
        await wait(700 * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastStatus) {
      throw new Error(
        `Catalogo manga temporaneamente non disponibile (Jikan ${lastStatus}). Riprova tra qualche secondo.`,
      );
    }

    throw new Error(
      "Catalogo manga temporaneamente non disponibile. Riprova tra qualche secondo.",
    );
  }

  async search(query: string) {
    const params = new URLSearchParams({ q: query, limit: "24", sfw: "true" });
    const payload = await this.request(`/manga?${params}`);
    return Array.isArray(payload.data) ? payload.data.map(normalize) : [];
  }

  async getById(id: string) {
    const payload = await this.request(`/manga/${encodeURIComponent(id)}/full`);
    if (!payload.data || Array.isArray(payload.data)) {
      throw new Error("Manga non trovato.");
    }
    return normalize(payload.data);
  }
}
