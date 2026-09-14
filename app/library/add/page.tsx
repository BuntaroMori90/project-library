import Link from "next/link";
import { AddWorkFlow, type AddWorkType } from "@/components/add-work-flow";

const allowed = new Set<AddWorkType>(["book", "manga", "anime"]);

export default async function AddWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const raw = params.type as AddWorkType | undefined;
  const initialType: AddWorkType = raw && allowed.has(raw) ? raw : "manga";
  return (
    <main className="page add-work-page">
      <Link href="/library" className="back-link">
        ← Libreria
      </Link>
      <header className="page-header immersive-head compact-head add-work-header">
        <div>
          <p className="eyebrow">Nuova opera</p>
          <h1 className="title">Trova la prossima opera.</h1>
          <p className="subtitle">
            Cercala nel catalogo, poi scegli se inserirla subito nella Libreria
            oppure conservarla nella Wishlist.
          </p>
        </div>
      </header>
      <AddWorkFlow initialType={initialType} />
    </main>
  );
}
