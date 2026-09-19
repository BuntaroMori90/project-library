import "server-only";
export type IsbnEdition = { title: string; isbn: string; publisher: string; year: string; pages: string; language: string; cover: string };
export function normalizeIsbn(value: string) { return value.replace(/[\s-]/g, "").toUpperCase(); }
export function validIsbn(value: string) {
  if (/^\d{13}$/.test(value)) return [...value].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0) % 10 === 0;
  if (/^\d{9}[\dX]$/.test(value)) return [...value].reduce((sum, digit, i) => sum + (digit === "X" ? 10 : Number(digit)) * (10 - i), 0) % 11 === 0;
  return false;
}
async function json(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "User-Agent": process.env.CATALOG_USER_AGENT || "Libronia/1.0" }, next: { revalidate: 86400 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Catalogo non disponibile");
  return response.json();
}
export async function lookupIsbnEdition(isbn: string): Promise<IsbnEdition | null> {
  let failed = false;
  try {
    const book = await json(`https://openlibrary.org/isbn/${isbn}.json`);
    if (book?.title && [...(book.isbn_10 ?? []), ...(book.isbn_13 ?? [])].some((value: string) => normalizeIsbn(value) === isbn)) {
      return { title: book.title, isbn, publisher: book.publishers?.[0] ?? "", year: String(book.publish_date ?? "").match(/\b\d{4}\b/)?.[0] ?? "", pages: String(book.number_of_pages ?? ""), language: book.languages?.[0]?.key === "/languages/ita" ? "Italiano" : "", cover: book.covers?.[0] > 0 ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg` : "" };
    }
  } catch { failed = true; }
  try {
    const data = await json(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5`);
    const book = data?.items?.find((item: { volumeInfo?: { industryIdentifiers?: { identifier: string }[] } }) => item.volumeInfo?.industryIdentifiers?.some((id) => normalizeIsbn(id.identifier) === isbn))?.volumeInfo;
    if (book?.title) return { title: book.title, isbn, publisher: book.publisher ?? "", year: book.publishedDate?.slice(0, 4) ?? "", pages: String(book.pageCount ?? ""), language: book.language === "it" ? "Italiano" : book.language ?? "", cover: (book.imageLinks?.thumbnail ?? "").replace(/^http:/, "https:") };
  } catch { failed = true; }
  if (failed) throw new Error("Un catalogo non risponde. Riprova oppure compila i dati a mano.");
  return null;
}
