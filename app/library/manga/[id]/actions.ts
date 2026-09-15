"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { importMangaToCatalog } from "@/lib/catalog/import-manga";
import { KitsuProvider } from "@/lib/catalog/providers/kitsu";
import { requireProfile } from "@/lib/profile";
import { createPersonalMangaEdition } from "@/lib/repositories/manga-editions";
import {
  setLibraryPersonal,
  setLibraryStatus,
  setMangaProgress,
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

async function refreshMissingMangaCounts(workId: string) {
  const work = await query<{ total_volumes: number | null; total_chapters: number | null }>(
    "select total_volumes,total_chapters from works where id=$1 and media_type='MANGA' limit 1",
    [workId],
  );
  const current = work.rows[0];
  if (!current || (current.total_volumes !== null && current.total_chapters !== null)) {
    return;
  }

  const source = await query<{ provider: string; external_id: string }>(
    `select provider,external_id from external_ids
      where work_id=$1 and provider='KITSU'
      limit 1`,
    [workId],
  );
  const external = source.rows[0];
  if (!external) return;

  try {
    const manga = await new KitsuProvider().getById(external.external_id);
    await importMangaToCatalog(manga);
  } catch {
    // Il salvataggio personale non deve fallire se il catalogo esterno è offline.
  }
}

export async function updateMangaState(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const status = String(formData.get("status") ?? "") as LibraryStatus;
  if (!workId || !statuses.has(status)) return;
  const { profile } = await requireProfile();
  await setLibraryStatus(profile.id, workId, status);
  await refreshMissingMangaCounts(workId);
  revalidatePath(`/library/manga/${workId}`);
}

export async function updateMangaProgress(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const currentVolume = asNumber(formData.get("currentVolume"));
  const currentChapter = asNumber(formData.get("currentChapter"));
  if (!workId) return;
  const { profile } = await requireProfile();
  await setMangaProgress(profile.id, workId, currentVolume, currentChapter);
  await refreshMissingMangaCounts(workId);
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
  await setLibraryPersonal(profile.id, workId, {
    favorite,
    rating,
    notes: notesRaw || null,
  });
  revalidatePath(`/library/manga/${workId}`);
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
  });

  revalidatePath(`/library/manga/${workId}`);
  revalidatePath("/library/manga");
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
