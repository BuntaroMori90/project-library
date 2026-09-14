import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  if (!profile.onboarding_completed) redirect("/onboarding");
  const preferences = normalizePreferences(profile.preferences);
  return <AppShell preferences={preferences}>{children}</AppShell>;
}
