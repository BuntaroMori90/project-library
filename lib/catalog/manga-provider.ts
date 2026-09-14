import type { MangaCatalogProvider } from "@/lib/catalog/types";
import { MyAnimeListProvider } from "@/lib/catalog/providers/myanimelist";
import { JikanDevelopmentProvider } from "@/lib/catalog/providers/jikan";

export function getMangaCatalogProvider(): MangaCatalogProvider {
  if (process.env.MAL_CLIENT_ID) return new MyAnimeListProvider();

  if (process.env.NODE_ENV !== "production" && process.env.CATALOG_DEV_FALLBACK === "jikan") {
    return new JikanDevelopmentProvider();
  }

  throw new Error("Nessun provider manga configurato. Imposta MAL_CLIENT_ID oppure abilita il fallback di sviluppo.");
}
