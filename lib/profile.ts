import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { query } from "@/lib/db";

export type AppProfile = {
  id: string;
  auth_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  preferred_sections: string[];
  preferences: unknown;
};

export const getSession = cache(async () => {
  const result = await auth.getSession();
  return result.data ?? null;
});

export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
});

export async function getOrCreateProfile(
  authUserId: string,
  defaults?: { name?: string | null; image?: string | null },
) {
  const existing = await query<AppProfile>(
    "select * from profiles where auth_user_id = $1 limit 1",
    [authUserId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query<AppProfile>(
    `insert into profiles (auth_user_id, display_name, avatar_url)
     values ($1, $2, $3)
     on conflict (auth_user_id) do update set
       display_name = coalesce(profiles.display_name, excluded.display_name),
       avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
       updated_at = now()
     returning *`,
    [authUserId, defaults?.name ?? null, defaults?.image ?? null],
  );
  return created.rows[0];
}

export const requireProfile = cache(async () => {
  const user = await requireUser();
  const profile = await getOrCreateProfile(user.id, {
    name: user.name ?? null,
    image: user.image ?? null,
  });
  return { user, profile };
});

export async function getApiProfile() {
  const session = await getSession();
  if (!session?.user) return null;
  const profile = await getOrCreateProfile(session.user.id, {
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  });
  return { user: session.user, profile };
}
