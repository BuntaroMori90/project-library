"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import {
  setAnimeProgress,
  setLibraryPersonal,
  setLibraryStatus,
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

function refreshAnime(workId: string) {
  revalidatePath(`/library/anime/${workId}`);
  revalidatePath("/library/anime");
  revalidatePath("/library");
}

export async function updateAnimeState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;

  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  refreshAnime(workId);
  redirect(`/library/anime/${workId}?saved=state#personale`);
}

export async function updateAnimeProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const currentSeason = asNumber(formData.get("currentSeason"));
  const currentEpisode = asNumber(formData.get("currentEpisode"));
  const platformIdRaw = String(formData.get("platformId") ?? "").trim();
  const sourceLabelRaw = String(formData.get("sourceLabel") ?? "").trim();
  if (!workId) return;

  const { profile } = await requireProfile();
  const currentStateResult = await query<{ status: LibraryStatus }>(
    "select status from library_entries where profile_id=$1 and work_id=$2 limit 1",
    [profile.id, workId],
  );
  const currentState = currentStateResult.rows[0]?.status ?? null;

  await setAnimeProgress(profile.id, workId, {
    currentSeason,
    currentEpisode,
    platformId: platformIdRaw || null,
    sourceLabel: sourceLabelRaw || null,
  });

  if (currentState && currentState !== "PLANNED" && currentState !== "IN_PROGRESS") {
    await setLibraryStatus(profile.id, workId, currentState);
  }

  refreshAnime(workId);
  redirect(`/library/anime/${workId}?saved=progress#personale`);
}

export async function updateAnimePersonal(formData: FormData) {
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
  refreshAnime(workId);
  redirect(`/library/anime/${workId}?saved=personal#personale`);
}
