import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await requireProfile();
  if (profile.onboarding_completed) redirect("/library");
  return <main className="auth-page"><section className="auth-card" style={{width:"min(100%,38rem)"}}><p className="eyebrow">Primo accesso</p><h1>Costruiamo la tua libreria.</h1><p className="subtitle">Solo tre scelte iniziali. Tutto il resto lo aggiungerai quando ti serve.</p><OnboardingForm suggestedName={profile.display_name ?? user.name ?? ""} /></section></main>;
}
