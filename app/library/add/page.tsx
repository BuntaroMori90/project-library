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
              ? "Trova il titolo e indica subito se lo possiedi, lo leggi in digitale o entrambe le cose. Il resto può essere completato dopo."
              : "Cerca nei cataloghi quando vuoi recuperare automaticamente dati e copertine. Puoi anche partire dai dati essenziali e completare la scheda in seguito."}
          </p>
        </div>
      </header>
      {isManga ? <MangaAddFlow /> : <AddWorkFlow initialType={initialType} />}
    </main>
  );
}
