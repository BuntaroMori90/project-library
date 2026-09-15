import type { MangaCatalogProvider } from "@/lib/catalog/types";
import { MyAnimeListProvider } from "@/lib/catalog/providers/myanimelist";
import { JikanDevelopmentProvider } from "@/lib/catalog/providers/jikan";

export function getMangaCatalogProvider(): MangaCatalogProvider {
  if (process.env.MAL_CLIENT_ID) return new MyAnimeListProvider();

  // Public-beta fallback: keep manga search usable on Vercel until a MAL
  // client id is configured. MAL remains the preferred provider whenever
  // credentials are available.
  return new JikanDevelopmentProvider();
}
