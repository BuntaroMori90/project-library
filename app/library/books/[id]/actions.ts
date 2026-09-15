"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { OpenLibraryProvider } from "@/lib/catalog/providers/openlibrary";
import { importBookToCatalog } from "@/lib/catalog/import-book";
import { requireProfile } from "@/lib/profile";
import {
  createPersonalBookEdition,
  removeBookFromLibrary,
  saveBookEditionOverrides,
  selectBookEdition,
  setBookProgress,
  setLibraryPersonal,
  setLibraryStatus,
  type BookEditionOverrides,
  type LibraryStatus,
} from "@/lib/repositories/personal";

const statuses = new Set<LibraryStatus>([
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
]);

function asNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function asText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function editionValues(formData: FormData): BookEditionOverrides {
  return {
    name: asText(formData.get("customName")),
    publisher: asText(formData.get("customPublisher")),
    language: asText(formData.get("customLanguage")),
    format: asText(formData.get("customFormat")),
    coverUrl: asText(formData.get("customCoverUrl")),
    pageCount: asNumber(formData.get("customPageCount")),
    isbn: asText(formData.get("customIsbn")),
    publicationYear: asNumber(formData.get("customPublicationYear")),
  };
}

function refreshBook(workId: string) {
  revalidatePath(`/library/books/${workId}`);
  revalidatePath("/library/books");
  revalidatePath("/library");
}

export async function updateBookState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;

  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=state#personale`);
}

export async function updateBookProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const editionId = String(formData.get("editionId") ?? "") || null;
  const currentPage = asNumber(formData.get("currentPage"));
  const totalPages = asNumber(formData.get("totalPages"));
  if (!workId) return;

  const percentage =
    currentPage !== null && totalPages && totalPages > 0
      ? Math.min(100, Math.round((currentPage / totalPages) * 1000) / 10)
      : null;

  const { profile } = await requireProfile();
  await setBookProgress(
    profile.id,
    workId,
    currentPage,
    totalPages,
    percentage,
    editionId,
  );
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=progress#personale`);
}

export async function updateBookPersonal(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;

  const ratingRaw = asNumber(formData.get("rating"));
  const rating = ratingRaw !== null ? Math.min(10, ratingRaw) : null;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const favorite = formData.get("favorite") === "on";
  const { profile } = await requireProfile();

  await setLibraryPersonal(profile.id, workId, {
    favorite,
    rating,
    notes: notesRaw || null,
  });
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=personal#personale`);
}

export async function chooseBookEdition(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  if (!workId || !editionId) return;

  const { profile } = await requireProfile();
  await selectBookEdition(profile.id, workId, editionId);
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=edition#edizioni`);
}

export async function updateBookEditionDetails(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  if (!workId || !editionId) return;

  const { profile } = await requireProfile();
  await saveBookEditionOverrides(
    profile.id,
    workId,
    editionId,
    editionValues(formData),
  );
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=editionDetails#edizioni`);
}

export async function addPersonalBookEdition(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;

  const { profile } = await requireProfile();
  await createPersonalBookEdition(profile.id, workId, editionValues(formData));
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=personalEdition#edizioni`);
}

export async function refreshBookCatalogEditions(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;

  await requireProfile();
  const external = await query<{ external_id: string }>(
    `select external_id
       from external_ids
      where work_id=$1 and provider='OPEN_LIBRARY'
      limit 1`,
    [workId],
  );
  const externalId = external.rows[0]?.external_id;
  if (!externalId) {
    redirect(`/library/books/${workId}?saved=catalogMissing#edizioni`);
  }

  const provider = new OpenLibraryProvider();
  const book = await provider.getById(externalId);
  await importBookToCatalog(book);
  refreshBook(workId);
  redirect(`/library/books/${workId}?saved=catalog#edizioni`);
}

export async function removeBookFromLibraryAction(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;

  const { profile } = await requireProfile();
  await removeBookFromLibrary(profile.id, workId);
  revalidatePath("/library/books");
  revalidatePath("/library");
  redirect("/library/books?removed=1");
}
