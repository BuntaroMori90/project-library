import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

type MangaShelfItem = DemoItem & {
  href?: string;
};

export default async function MangaPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const worksResult = await listLibraryWorks(profile.id, "MANGA");
  const rows = worksResult.rows;
  const ownedCounts = await getMangaOwnedCounts(
    profile.id,
    rows.map((row) => row.id),
  );

  const items: MangaShelfItem[] = rows.map((row) => {
    const owned = ownedCounts.get(row.id) ?? 0;
    return {
      id: row.id,
      title: row.title,
      creator: row.creators?.join(" · ") || "Autore non disponibile",
      progress:
        owned === 1
          ? "1 volume posseduto"
          : owned > 1
            ? `${owned} volumi posseduti`
            : "Serie catalogata",
      coverUrl: row.cover_url ?? undefined,
      coverClass: "cover-ink",
    };
  });

  return (
    <main className="page page-library page-manga">
      <header className="page-header immersive-head page-header-actions">
        <div>
          <p className="eyebrow">La tua collezione · Manga</p>
          <h1 className="title">Una serie, una sola scheda.</h1>
          <p className="subtitle">
            La vista generale mostra una copertina rappresentativa per serie e
            quanti volumi possiedi. Variant, limited e speciali restano nella
            scheda della serie, senza duplicarla sullo scaffale principale.
          </p>
        </div>
        <div className="library-header-actions">
          <Link className="primary-btn add-library-button" href="/library/add?type=manga">
            <Plus size={17} /> Aggiungi manga
          </Link>
        </div>
      </header>

      {items.length ? (
        <ShelfBrowser
          items={items}
          kind="manga"
          defaultGroupBy={preferences.manga.groupBy}
          density={preferences.manga.density}
          coverView={preferences.manga.coverView}
        />
      ) : (
        <div className="catalog-notice">
          <div>
            <strong>Nessun manga nella libreria.</strong>
            <p>Cerca una serie e aggiungila al tuo catalogo personale.</p>
            <Link className="primary-btn" href="/library/add?type=manga">
              Aggiungi il primo manga
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
