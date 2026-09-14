import type { BookCatalogProvider } from "@/lib/catalog/types";
import { OpenLibraryProvider } from "@/lib/catalog/providers/openlibrary";

export function getBookCatalogProvider(): BookCatalogProvider {
  return new OpenLibraryProvider();
}
