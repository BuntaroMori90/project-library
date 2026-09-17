import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

const statusLabels: Record<string, string> = {
  PLANNED: "Da iniziare",
  IN_PROGRESS: "In lettura",
  COMPLETED: "Completato",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

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
      status: statusLabels[row.status] ?? "Da iniziare",
      progress: `${owned} ${owned === 1 ? "volume" : "volumi"}`,
      coverUrl: row.cover_url ?? undefined,
      coverClass: "cover-ink",
      href: `/library/manga/${row.id}`,
    };
  });

  return (
    <main className="page page-library page-manga collection-room-page">
      <header className="page-header immersive-head page-header-actions collection-section-head">
        <div>
          <p className="eyebrow">La tua collezione · Manga</p>
          <h1 className="title">Le tue serie.</h1>
          <p className="subtitle">
            Una sola copertina per serie. Apri la scheda per consultare volumi,
            edizioni speciali e variant.
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
        <div className="empty-collection-shelf">
          <div className="empty-shelf-space" aria-hidden="true" />
          <div>
            <strong>Nessun manga nella libreria.</strong>
            <p>Aggiungi la prima serie alla tua collezione.</p>
            <Link className="primary-btn" href="/library/add?type=manga">
              Aggiungi il primo manga
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
