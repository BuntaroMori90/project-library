import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Crea il tuo spazio</p><h1>La tua libreria, finalmente ordinata.</h1><p className="subtitle">Un account unico per progresso, possesso, wishlist e collezione.</p><AuthForm mode="register" /></section></main>;
}
