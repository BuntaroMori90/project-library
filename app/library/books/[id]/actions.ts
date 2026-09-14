"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/profile";
import { setBookProgress, setLibraryPersonal, setLibraryStatus, type LibraryStatus } from "@/lib/repositories/personal";

const statuses = new Set<LibraryStatus>(["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED", "DROPPED"]);

function asNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function updateBookState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;
  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  revalidatePath(`/library/books/${workId}`);
}

export async function updateBookProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const currentPage = asNumber(formData.get("currentPage"));
  const totalPages = asNumber(formData.get("totalPages"));
  if (!workId) return;
  const percentage = currentPage !== null && totalPages && totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 1000) / 10) : null;
  const { profile } = await requireProfile();
  await setBookProgress(profile.id, workId, currentPage, totalPages, percentage);
  revalidatePath(`/library/books/${workId}`);
}

export async function updateBookPersonal(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  if (!workId) return;
  const ratingRaw = asNumber(formData.get("rating"));
  const rating = ratingRaw !== null ? Math.min(10, ratingRaw) : null;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const favorite = formData.get("favorite") === "on";
  const { profile } = await requireProfile();
  await setLibraryPersonal(profile.id, workId, { favorite, rating, notes: notesRaw || null });
  revalidatePath(`/library/books/${workId}`);
}
