"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { createPersonalMangaEdition } from "@/lib/repositories/manga-editions";
import {
  normalizeMangaReadingMode,
  setMangaReadingProgress,
} from "@/lib/repositories/manga-reading";
import {
  setLibraryPersonal,
  setLibraryStatus,
  toggleOwnedUnit,
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
  const text = value.trim();
  return text || null;
}

function refreshManga(workId: string) {
  revalidatePath(`/library/manga/${workId}`);
  revalidatePath("/library/manga");
  revalidatePath("/library");
}

export async function updateMangaState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;
  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  refreshManga(workId);
  redirect(`/library/manga/${workId}?saved=state#personale`);
}

export async function updateMangaProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const currentVolume = asNumber(formData.get("currentVolume"));
  const currentChapter = asNumber(formData.get("currentChapter"));
  const readingMode = normalizeMangaReadingMode(formData.get("readingMode"));
  if (!workId) return;
  const { profile } = await requireProfile();
  await setMangaReadingProgress(profile.id, workId, {
    mode: readingMode,
    currentVolume,
    currentChapter,
  });
  refreshManga(workId);
  redirect(`/library/manga/${workId}?saved=progress#personale`);
}

export async function updateMangaPersonal(formData: FormData) {
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
  refreshManga(workId);
  redirect(`/library/manga/${workId}?saved=personal#personale`);
}

export async function addPersonalMangaEdition(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;

  const { profile } = await requireProfile();
  await createPersonalMangaEdition(profile.id, workId, {
    name: asText(formData.get("customName")),
    publisher: asText(formData.get("customPublisher")),
    language: asText(formData.get("customLanguage")),
    editionType: asText(formData.get("editionType")),
    coverUrl: asText(formData.get("customCoverUrl")),
    isbn: asText(formData.get("customIsbn")),
    publicationYear: asNumber(formData.get("customPublicationYear")),
    volumeNumber: asNumber(formData.get("volumeNumber")),
    totalVolumes: asNumber(formData.get("totalVolumes")),
  });

  refreshManga(workId);
}

export async function toggleOwnedVolume(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  if (!workId || !editionId || !unitId) return;
  const { profile } = await requireProfile();
  await toggleOwnedUnit(profile.id, editionId, unitId);
  refreshManga(workId);
}
