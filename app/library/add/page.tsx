import Link from "next/link";
import { AddWorkFlow, type AddWorkType } from "@/components/add-work-flow";
import { MangaAddFlow } from "@/components/manga-add-flow";

const allowed = new Set<AddWorkType>(["book", "manga", "anime"]);

export default async function AddWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const raw = params.type as AddWorkType | undefined;
  const initialType: AddWorkType = raw && allowed.has(raw) ? raw : "manga";
  const isManga = initialType === "manga";

  return (
    <main className="page add-work-page">
      <Link href={isManga ? "/library/manga" : "/library"} className="back-link">
        ← {isManga ? "Manga" : "Libreria"}
      </Link>
      <header className="page-header immersive-head compact-head add-work-header">
        <div>
          <p className="eyebrow">{isManga ? "Nuovo manga" : "Nuova opera"}</p>
          <h1 className="title">Aggiungi senza perdere tempo.</h1>
          <p className="subtitle">
            {isManga
              ? "Trova prima il manga nel catalogo, poi indica se lo possiedi, lo leggi in digitale o entrambe le cose. Se non lo trovi, compare automaticamente il modulo manuale."
              : "Cerchiamo prima l'opera nel catalogo per recuperare dati e copertina. Solo se non troviamo risultati ti proponiamo l'inserimento manuale con i dati essenziali."}
          </p>
        </div>
      </header>
      {isManga ? <MangaAddFlow /> : <AddWorkFlow initialType={initialType} />}
    </main>
  );
}
