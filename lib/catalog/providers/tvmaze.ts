import type { AnimeCatalogProvider, AnimeCatalogResult, AnimeEpisodeCatalogResult, AnimeSeasonCatalogResult, PublicationStatus } from "@/lib/catalog/types";

const BASE = "https://api.tvmaze.com";

function stripHtml(input?: string | null) {
  return input ? input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : null;
}

function year(value?: string | null) {
  return value ? Number(value.slice(0, 4)) || null : null;
}

function status(value?: string | null): PublicationStatus {
  switch ((value ?? "").toLowerCase()) {
    case "running": return "ONGOING";
    case "ended": return "COMPLETED";
    default: return "UNKNOWN";
  }
}

type TvMazeImage = { medium?: string | null; original?: string | null } | null;
type TvMazeShow = { id:number; url?:string; name:string; language?:string|null; genres?:string[]; status?:string|null; premiered?:string|null; summary?:string|null; image?:TvMazeImage; network?:{name?:string|null}|null; webChannel?:{name?:string|null}|null };
type TvMazeSeason = { id:number; number:number; name?:string|null; episodeOrder?:number|null; premiereDate?:string|null; endDate?:string|null; image?:TvMazeImage };
type TvMazeEpisode = { id:number; season:number; number?:number|null; name?:string|null; airdate?:string|null };

export class TvMazeProvider implements AnimeCatalogProvider {
  readonly name = "TVMAZE" as const;
  private headers() { return { Accept: "application/json", "User-Agent": process.env.CATALOG_USER_AGENT ?? "ProjectLibrary/0.1" }; }
  private mapShow(show: TvMazeShow): AnimeCatalogResult {
    return { provider:this.name, providerId:String(show.id), title:show.name, originalTitle:null, description:stripHtml(show.summary), coverUrl:show.image?.original ?? show.image?.medium ?? null, releaseYear:year(show.premiered), publicationStatus:status(show.status), genres:show.genres ?? [], network:show.webChannel?.name ?? show.network?.name ?? null, language:show.language ?? null, seasonCount:null, episodeCount:null, sourceUrl:show.url ?? `https://www.tvmaze.com/shows/${show.id}` };
  }
  async search(query:string): Promise<AnimeCatalogResult[]> {
    const response = await fetch(`${BASE}/search/shows?q=${encodeURIComponent(query)}`, { headers:this.headers(), next:{revalidate:1800} });
    if (!response.ok) throw new Error("TVmaze non è disponibile in questo momento.");
    const payload = await response.json() as Array<{score:number;show:TvMazeShow}>;
    return payload.map(({show})=>this.mapShow(show)).sort((a,b)=>Number(b.genres.some(g=>g.toLowerCase()==="anime"))-Number(a.genres.some(g=>g.toLowerCase()==="anime"))).slice(0,8);
  }
  async getById(id:string): Promise<AnimeCatalogResult> {
    const safeId=encodeURIComponent(id);
    const [showResponse,seasonsResponse,episodesResponse]=await Promise.all([
      fetch(`${BASE}/shows/${safeId}`,{headers:this.headers(),cache:"no-store"}),
      fetch(`${BASE}/shows/${safeId}/seasons`,{headers:this.headers(),cache:"no-store"}),
      fetch(`${BASE}/shows/${safeId}/episodes?specials=1`,{headers:this.headers(),cache:"no-store"}),
    ]);
    if(!showResponse.ok) throw new Error("Anime non trovato su TVmaze.");
    const show=await showResponse.json() as TvMazeShow;
    const rawSeasons=seasonsResponse.ok?await seasonsResponse.json() as TvMazeSeason[]:[];
    const rawEpisodes=episodesResponse.ok?await episodesResponse.json() as TvMazeEpisode[]:[];
    const seasons:AnimeSeasonCatalogResult[]=rawSeasons.map(season=>({providerId:String(season.id),number:season.number,title:season.name ?? (season.number===0?"Speciali":`Stagione ${season.number}`),episodeCount:season.episodeOrder ?? rawEpisodes.filter(e=>e.season===season.number).length,premiereDate:season.premiereDate ?? null,endDate:season.endDate ?? null,coverUrl:season.image?.original ?? season.image?.medium ?? null}));
    const episodes:AnimeEpisodeCatalogResult[]=rawEpisodes.filter(e=>typeof e.number==="number").map(e=>({providerId:String(e.id),seasonNumber:e.season,episodeNumber:e.number!,title:e.name ?? null,airDate:e.airdate ?? null}));
    const base=this.mapShow(show);
    return {...base,seasonCount:seasons.filter(s=>s.number>0).length,episodeCount:episodes.filter(e=>e.seasonNumber>0).length,seasons,episodes};
  }
}
