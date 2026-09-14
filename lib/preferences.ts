export type GroupBy = "title" | "creator";
export type Density = "comfortable" | "compact";
export type CoverView = "front" | "spine";
export type Theme = "dark" | "light" | "auto";
export type WoodTone = "walnut" | "oak" | "ebony";

export type LibraryPreferences = {
  theme: Theme;
  woodTone: WoodTone;
  books: {
    groupBy: GroupBy;
    sort: "az";
    coverView: CoverView;
    density: Density;
  };
  manga: {
    groupBy: GroupBy;
    sort: "az";
    coverView: CoverView;
    density: Density;
  };
  anime: {
    groupBy: GroupBy;
    sort: "az";
    density: Density;
  };
};

export const defaultLibraryPreferences: LibraryPreferences = {
  theme: "dark",
  woodTone: "walnut",
  books: { groupBy: "title", sort: "az", coverView: "front", density: "comfortable" },
  manga: { groupBy: "title", sort: "az", coverView: "front", density: "compact" },
  anime: { groupBy: "title", sort: "az", density: "comfortable" },
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizePreferences(value: unknown): LibraryPreferences {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const books = input.books && typeof input.books === "object" ? input.books as Record<string, unknown> : {};
  const manga = input.manga && typeof input.manga === "object" ? input.manga as Record<string, unknown> : {};
  const anime = input.anime && typeof input.anime === "object" ? input.anime as Record<string, unknown> : {};

  return {
    theme: pick(input.theme, ["dark", "light", "auto"] as const, defaultLibraryPreferences.theme),
    woodTone: pick(input.woodTone, ["walnut", "oak", "ebony"] as const, defaultLibraryPreferences.woodTone),
    books: {
      groupBy: pick(books.groupBy, ["title", "creator"] as const, defaultLibraryPreferences.books.groupBy),
      sort: "az",
      coverView: pick(books.coverView, ["front", "spine"] as const, defaultLibraryPreferences.books.coverView),
      density: pick(books.density, ["comfortable", "compact"] as const, defaultLibraryPreferences.books.density),
    },
    manga: {
      groupBy: pick(manga.groupBy, ["title", "creator"] as const, defaultLibraryPreferences.manga.groupBy),
      sort: "az",
      coverView: pick(manga.coverView, ["front", "spine"] as const, defaultLibraryPreferences.manga.coverView),
      density: pick(manga.density, ["comfortable", "compact"] as const, defaultLibraryPreferences.manga.density),
    },
    anime: {
      groupBy: pick(anime.groupBy, ["title", "creator"] as const, defaultLibraryPreferences.anime.groupBy),
      sort: "az",
      density: pick(anime.density, ["comfortable", "compact"] as const, defaultLibraryPreferences.anime.density),
    },
  };
}
