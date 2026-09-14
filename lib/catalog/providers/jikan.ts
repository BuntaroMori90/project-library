import type { MangaCatalogProvider, MangaCatalogResult } from "@/lib/catalog/types";

const BASE_URL = "https://api.jikan.moe/v4";

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
    creators: (manga.authors ?? []).flatMap((author) => author.name ? [{ name: author.name, role: "AUTHOR" as const }] : []),
    genres: (manga.genres ?? []).flatMap((genre) => genre.name ? [genre.name] : []),
  };
}

export class JikanDevelopmentProvider implements MangaCatalogProvider {
  name = "JIKAN_DEV" as const;

  private async request(path: string) {
    const response = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Jikan API: ${response.status}`);
    return await response.json() as JikanResponse;
  }

  async search(query: string) {
    const params = new URLSearchParams({ q: query, limit: "12", sfw: "true" });
    const payload = await this.request(`/manga?${params}`);
    return Array.isArray(payload.data) ? payload.data.map(normalize) : [];
  }

  async getById(id: string) {
    const payload = await this.request(`/manga/${encodeURIComponent(id)}/full`);
    if (!payload.data || Array.isArray(payload.data)) throw new Error("Manga non trovato.");
    return normalize(payload.data);
  }
}
