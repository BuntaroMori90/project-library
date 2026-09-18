import { getMangaSearchTitles } from "@/lib/catalog/manga-search-titles";
import type {
  CatalogProviderName,
  MangaCatalogProvider,
  MangaCatalogResult,
} from "@/lib/catalog/types";
import { JikanDevelopmentProvider } from "@/lib/catalog/providers/jikan";
import { KitsuProvider } from "@/lib/catalog/providers/kitsu";
import { MyAnimeListProvider } from "@/lib/catalog/providers/myanimelist";

type MangaProviderName = Extract<
  CatalogProviderName,
  "MAL" | "JIKAN_DEV" | "KITSU"
>;

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu, " ")
    .trim();
}

function aliases(result: MangaCatalogResult) {
  return [normalize(result.title), normalize(result.originalTitle)].filter(Boolean);
}

function relevance(result: MangaCatalogResult, query: string) {
  const target = normalize(query);
  const names = aliases(result);
  if (names.some((name) => name === target)) return 100;
  if (names.some((name) => name.startsWith(target))) return 80;
  if (names.some((name) => name.includes(target))) return 60;
  return 20;
}

function sameWork(a: MangaCatalogResult, b: MangaCatalogResult) {
  const aAliases = new Set(aliases(a));
  const sharedAlias = aliases(b).some((alias) => aAliases.has(alias));
  if (!sharedAlias) return false;

  if (a.releaseYear && b.releaseYear) {
    return Math.abs(a.releaseYear - b.releaseYear) <= 1;
  }

  return true;
}

export function getMangaCatalogProvider(): MangaCatalogProvider {
  if (process.env.MAL_CLIENT_ID) return new MyAnimeListProvider();
  return new JikanDevelopmentProvider();
}

export function getMangaCatalogProviderByName(
  name?: string | null,
): MangaCatalogProvider {
  switch (name as MangaProviderName | undefined) {
    case "MAL":
      if (!process.env.MAL_CLIENT_ID) {
        throw new Error("MyAnimeList non è configurato su questo ambiente.");
      }
      return new MyAnimeListProvider();
    case "JIKAN_DEV":
      return new JikanDevelopmentProvider();
    case "KITSU":
      return new KitsuProvider();
    default:
      return getMangaCatalogProvider();
  }
}

export function getMangaSearchProviders(): MangaCatalogProvider[] {
  const primary: MangaCatalogProvider = process.env.MAL_CLIENT_ID
    ? new MyAnimeListProvider()
    : new JikanDevelopmentProvider();

  return [primary, new KitsuProvider()];
}

export async function searchMangaCatalog(query: string) {
  const providers = getMangaSearchProviders();
  const attempts = await Promise.allSettled(
    providers.map(async (provider) => ({
      provider: provider.name,
      results: await provider.search(query),
    })),
  );

  const successful = attempts.flatMap((attempt) =>
    attempt.status === "fulfilled" ? [attempt.value] : [],
  );

  if (!successful.length) {
    const firstFailure = attempts.find(
      (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
    );
    throw firstFailure?.reason instanceof Error
      ? firstFailure.reason
      : new Error("Cataloghi manga temporaneamente non disponibili.");
  }

  if (!successful.some((source) => source.results.some((result) => relevance(result, query) >= 60))) {
    const titles = await getMangaSearchTitles(query);
    const alternative = titles.find((title) => normalize(title) !== normalize(query));
    if (alternative) {
      const retries = await Promise.allSettled(providers.map(async (provider) => ({
        provider: provider.name, results: await provider.search(alternative),
      })));
      for (const retry of retries) if (retry.status === "fulfilled") successful.push(retry.value);
    }
  }

  const merged: MangaCatalogResult[] = [];
  for (const source of successful) {
    for (const result of source.results) {
      const duplicateIndex = merged.findIndex((existing) => sameWork(existing, result));
      if (duplicateIndex === -1) {
        merged.push(result);
        continue;
      }

      const existing = merged[duplicateIndex];
      merged[duplicateIndex] = {
        ...existing,
        originalTitle: existing.originalTitle ?? result.originalTitle,
        description: existing.description ?? result.description,
        coverUrl: existing.coverUrl ?? result.coverUrl,
        releaseYear: existing.releaseYear ?? result.releaseYear,
        volumeCount: existing.volumeCount ?? result.volumeCount,
        chapterCount: existing.chapterCount ?? result.chapterCount,
        creators: existing.creators.length ? existing.creators : result.creators,
        genres: existing.genres.length ? existing.genres : result.genres,
      };
    }
  }

  const results = merged
    .sort((a, b) => {
      const score = relevance(b, query) - relevance(a, query);
      if (score) return score;
      return a.title.localeCompare(b.title, "it", { sensitivity: "base" });
    })
    .slice(0, 24);

  return {
    results,
    providers: successful.map((source) => source.provider),
  };
}
