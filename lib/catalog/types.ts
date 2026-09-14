export type CatalogProviderName = "MAL" | "JIKAN_DEV" | "OPEN_LIBRARY" | "TVMAZE";
export type PublicationStatus = "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UNKNOWN";

export type MangaCatalogResult = {
  provider: CatalogProviderName;
  providerId: string;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  releaseYear?: number | null;
  publicationStatus: PublicationStatus;
  volumeCount?: number | null;
  chapterCount?: number | null;
  creators: Array<{ name: string; role: "AUTHOR" | "ARTIST" }>;
  genres: string[];
  sourceUrl?: string | null;
};

export type BookEditionCatalogResult = {
  providerId: string;
  title: string;
  publisher?: string | null;
  language?: string | null;
  country?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publicationYear?: number | null;
  format?: string | null;
  pageCount?: number | null;
  coverUrl?: string | null;
};

export type BookCatalogResult = {
  provider: "OPEN_LIBRARY";
  providerId: string;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  releaseYear?: number | null;
  publicationStatus: PublicationStatus;
  creators: Array<{ name: string; role: "AUTHOR" }>;
  genres: string[];
  editionCount?: number | null;
  editions?: BookEditionCatalogResult[];
  matchedEdition?: BookEditionCatalogResult | null;
  sourceUrl?: string | null;
};

export type AnimeEpisodeCatalogResult = {
  providerId: string;
  seasonNumber: number;
  episodeNumber: number;
  title?: string | null;
  airDate?: string | null;
};

export type AnimeSeasonCatalogResult = {
  providerId: string;
  number: number;
  title?: string | null;
  episodeCount?: number | null;
  premiereDate?: string | null;
  endDate?: string | null;
  coverUrl?: string | null;
};

export type AnimeCatalogResult = {
  provider: "TVMAZE";
  providerId: string;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  releaseYear?: number | null;
  publicationStatus: PublicationStatus;
  genres: string[];
  network?: string | null;
  language?: string | null;
  seasonCount?: number | null;
  episodeCount?: number | null;
  seasons?: AnimeSeasonCatalogResult[];
  episodes?: AnimeEpisodeCatalogResult[];
  sourceUrl?: string | null;
};

export interface MangaCatalogProvider {
  name: CatalogProviderName;
  search(query: string): Promise<MangaCatalogResult[]>;
  getById(id: string): Promise<MangaCatalogResult>;
}

export interface BookCatalogProvider {
  name: "OPEN_LIBRARY";
  search(query: string): Promise<BookCatalogResult[]>;
  getById(id: string): Promise<BookCatalogResult>;
}

export interface AnimeCatalogProvider {
  name: "TVMAZE";
  search(query: string): Promise<AnimeCatalogResult[]>;
  getById(id: string): Promise<AnimeCatalogResult>;
}
