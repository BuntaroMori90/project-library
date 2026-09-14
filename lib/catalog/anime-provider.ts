import type { AnimeCatalogProvider } from "@/lib/catalog/types";
import { TvMazeProvider } from "@/lib/catalog/providers/tvmaze";

export function getAnimeCatalogProvider(): AnimeCatalogProvider {
  return new TvMazeProvider();
}
