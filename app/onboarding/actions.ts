"use server";

import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";

export async function saveOnboarding(input: { displayName: string; username: string; selected: string[] }) {
  const { profile } = await requireProfile();
  const allowed = new Set(["BOOK", "MANGA", "ANIME"]);
  const selected = input.selected.filter((item) => allowed.has(item));
  if (!selected.length) return { ok: false, message: "Scegli almeno una sezione." };
  try {
    await query(`update profiles set display_name=$2,username=$3,preferred_sections=$4::text[],onboarding_completed=true,updated_at=now() where id=$1`,[profile.id,input.displayName.trim()||null,input.username.trim()||null,selected]);
    return { ok: true };
  } catch (error) {
    const code=(error as {code?:string}).code;
    return { ok:false, message: code === "23505" ? "Questo username è già utilizzato." : "Non siamo riusciti a salvare il profilo." };
  }
}
