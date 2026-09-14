"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/profile";
import { setLibraryPersonal, setLibraryStatus, setMangaProgress, toggleOwnedUnit, type LibraryStatus } from "@/lib/repositories/personal";

const statuses = new Set<LibraryStatus>(["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED", "DROPPED"]);

function asNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function updateMangaState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;
  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  revalidatePath(`/library/manga/${workId}`);
}

export async function updateMangaProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const currentVolume = asNumber(formData.get("currentVolume"));
  const currentChapter = asNumber(formData.get("currentChapter"));
  if (!workId) return;
  const { profile } = await requireProfile();
  await setMangaProgress(profile.id, workId, currentVolume, currentChapter);
  revalidatePath(`/library/manga/${workId}`);
}

export async function updateMangaPersonal(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;
  const ratingRaw = asNumber(formData.get("rating"));
  const rating = ratingRaw !== null ? Math.min(10, ratingRaw) : null;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const favorite = formData.get("favorite") === "on";
  const { profile } = await requireProfile();
  await setLibraryPersonal(profile.id, workId, { favorite, rating, notes: notesRaw || null });
  revalidatePath(`/library/manga/${workId}`);
}

export async function toggleOwnedVolume(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  if (!workId || !editionId || !unitId) return;
  const { profile } = await requireProfile();
  await toggleOwnedUnit(profile.id, editionId, unitId);
  revalidatePath(`/library/manga/${workId}`);
}
