import type { MangaCatalogProvider } from "@/lib/catalog/types";
import { MyAnimeListProvider } from "@/lib/catalog/providers/myanimelist";
import { KitsuProvider } from "@/lib/catalog/providers/kitsu";

export function getMangaCatalogProvider(): MangaCatalogProvider {
  if (process.env.MAL_CLIENT_ID) return new MyAnimeListProvider();

  // Public fallback with no API key required. MAL remains the preferred
  // provider whenever a client id is configured.
  return new KitsuProvider();
}
