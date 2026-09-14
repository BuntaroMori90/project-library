import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  if (!profile.onboarding_completed) redirect("/onboarding");
  const preferences = normalizePreferences(profile.preferences);
  return (
    <AppShell
      preferences={preferences}
      displayName={profile.display_name ?? user.name ?? null}
      avatarUrl={profile.avatar_url ?? user.image ?? null}
    >
      {children}
    </AppShell>
  );
}
