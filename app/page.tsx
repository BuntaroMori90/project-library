import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/profile";

export default async function Landing() {
  const session = await getSession();
  if (session?.user) redirect("/library");

  return <main className="landing">
    <div className="eyebrow">PROJECT LIBRARY</div>
    <h1>La tua cultura, finalmente in ordine.</h1>
    <p>Libri, manga e anime. Quello che possiedi, quello che stai leggendo e dove sei arrivato.</p>
    <div className="actions">
      <Link className="primary" href="/register">Crea la tua libreria</Link>
      <Link className="ghost" href="/login">Accedi</Link>
    </div>
  </main>;
}
