import type { MangaCatalogProvider, MangaCatalogResult } from "@/lib/catalog/types";

const BASE_URL = "https://api.myanimelist.net/v2";

function status(value?: string | null): MangaCatalogResult["publicationStatus"] {
  switch (value) {
    case "currently_publishing": return "ONGOING";
    case "finished": return "COMPLETED";
    case "on_hiatus": return "HIATUS";
    case "discontinued": return "CANCELLED";
    default: return "UNKNOWN";
  }
}

function year(value?: string | null) {
  if (!value) return null;
  const parsed = Number(value.slice(0, 4));
  return Number.isFinite(parsed) ? parsed : null;
}

type MalAuthor = { node?: { first_name?: string; last_name?: string }; role?: string };
type MalManga = {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  alternative_titles?: { ja?: string; en?: string; synonyms?: string[] };
  synopsis?: string;
  start_date?: string;
  status?: string;
  num_volumes?: number;
  num_chapters?: number;
  authors?: MalAuthor[];
  genres?: Array<{ name?: string }>;
};

type MalListResponse = { data?: Array<{ node?: MalManga }> };

function normalize(manga: MalManga): MangaCatalogResult {
  const creators = (manga.authors ?? []).flatMap((entry) => {
    const first = entry.node?.first_name?.trim() ?? "";
    const last = entry.node?.last_name?.trim() ?? "";
    const name = [first, last].filter(Boolean).join(" ");
    if (!name) return [];
    return [{
      name,
      role: entry.role === "Art" ? "ARTIST" as const : "AUTHOR" as const,
    }];
  });

  return {
    provider: "MAL",
    providerId: String(manga.id),
    title: manga.title,
    originalTitle: manga.alternative_titles?.ja ?? manga.alternative_titles?.en ?? null,
    description: manga.synopsis ?? null,
    coverUrl: manga.main_picture?.large ?? manga.main_picture?.medium ?? null,
    releaseYear: year(manga.start_date),
    publicationStatus: status(manga.status),
    volumeCount: manga.num_volumes && manga.num_volumes > 0 ? manga.num_volumes : null,
    chapterCount: manga.num_chapters && manga.num_chapters > 0 ? manga.num_chapters : null,
    creators,
    genres: (manga.genres ?? []).flatMap((genre) => genre.name ? [genre.name] : []),
  };
}

export class MyAnimeListProvider implements MangaCatalogProvider {
  name = "MAL" as const;

  private get clientId() {
    const id = process.env.MAL_CLIENT_ID;
    if (!id) throw new Error("MAL_CLIENT_ID non configurato.");
    return id;
  }

  private async request<T>(path: string) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-MAL-CLIENT-ID": this.clientId },
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) throw new Error(`MyAnimeList API: ${response.status}`);
    return await response.json() as T;
  }

  async search(query: string) {
    const fields = "alternative_titles,start_date,status,num_volumes,num_chapters,authors,genres,synopsis";
    const params = new URLSearchParams({ q: query, limit: "12", fields });
    const payload = await this.request<MalListResponse>(`/manga?${params}`);
    return (payload.data ?? []).flatMap((entry) => entry.node ? [normalize(entry.node)] : []);
  }

  async getById(id: string) {
    const fields = "alternative_titles,start_date,status,num_volumes,num_chapters,authors,genres,synopsis";
    const manga = await this.request<MalManga>(`/manga/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`);
    return normalize(manga);
  }
}
