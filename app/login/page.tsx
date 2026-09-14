import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Project Library</p><h1>Bentornato.</h1><p className="subtitle">Accedi alla tua collezione personale.</p><AuthForm mode="login" /></section></main>;
}
