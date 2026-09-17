"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import {
  removeWorkFromLibrary,
  type RemovableMediaType,
} from "@/lib/repositories/remove-library";

const destinations: Record<RemovableMediaType, string> = {
  MANGA: "/library/manga",
  ANIME: "/library/anime",
};

export async function removeWorkFromLibraryAction(formData: FormData) {
  const workId = String(formData.get("workId") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "") as RemovableMediaType;
  if (!/^[0-9a-f-]{36}$/i.test(workId) || !Object.hasOwn(destinations, mediaType)) return { error: "Opera non valida." };

  const { profile } = await requireProfile();
  await removeWorkFromLibrary(profile.id, workId, mediaType);

  revalidatePath("/library");
  revalidatePath(destinations[mediaType]);
  redirect(`${destinations[mediaType]}?removed=1`);
}
