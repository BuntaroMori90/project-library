"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import { defaultLibraryPreferences, type CoverView, type Density, type GroupBy, type Theme, type WoodTone } from "@/lib/preferences";

function one<T extends string>(formData: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const value = formData.get(key);
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

export async function saveLibraryPreferences(formData: FormData) {
  const { profile } = await requireProfile();
  const themes=["dark","light","auto"] as const satisfies readonly Theme[]; const woods=["walnut","oak","ebony"] as const satisfies readonly WoodTone[]; const groups=["title","creator"] as const satisfies readonly GroupBy[]; const covers=["front","spine"] as const satisfies readonly CoverView[]; const densities=["comfortable","compact"] as const satisfies readonly Density[];
  const preferences={theme:one(formData,"theme",themes,defaultLibraryPreferences.theme),woodTone:one(formData,"woodTone",woods,defaultLibraryPreferences.woodTone),books:{groupBy:one(formData,"booksGroupBy",groups,defaultLibraryPreferences.books.groupBy),sort:"az" as const,coverView:one(formData,"booksCoverView",covers,defaultLibraryPreferences.books.coverView),density:one(formData,"booksDensity",densities,defaultLibraryPreferences.books.density)},manga:{groupBy:one(formData,"mangaGroupBy",groups,defaultLibraryPreferences.manga.groupBy),sort:"az" as const,coverView:one(formData,"mangaCoverView",covers,defaultLibraryPreferences.manga.coverView),density:one(formData,"mangaDensity",densities,defaultLibraryPreferences.manga.density)},anime:{groupBy:one(formData,"animeGroupBy",groups,defaultLibraryPreferences.anime.groupBy),sort:"az" as const,density:one(formData,"animeDensity",densities,defaultLibraryPreferences.anime.density)}};
  await query("update profiles set preferences=$2::jsonb,updated_at=now() where id=$1",[profile.id,JSON.stringify(preferences)]);
  redirect("/library/settings?saved=1");
}
