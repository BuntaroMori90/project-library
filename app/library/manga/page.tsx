import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

type MangaShelfItem = DemoItem & { favorite?: boolean };

export default async function MangaPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const rows = (await listLibraryWorks(profile.id, "MANGA")).rows;
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
      status: `${owned} ${owned === 1 ? "volume" : "volumi"}`,
      coverUrl: row.cover_url ?? undefined,
      coverClass: "cover-ink",
      favorite: row.favorite,
    };
  });

  return (
    <main className="page page-library page-manga">
      <header className="page-header immersive-head page-header-actions compact-library-head">
        <div>
          <p className="eyebrow">La tua collezione · Manga</p>
          <h1 className="title">Manga</h1>
          <p className="subtitle">
            Una copertina per serie. Il conteggio indica solo i volumi che possiedi davvero.
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
        <div className="empty-wood-shelf">
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
