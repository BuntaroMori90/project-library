import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";

const statusLabels: Record<string, string> = {
  PLANNED: "Da leggere",
  IN_PROGRESS: "In lettura",
  COMPLETED: "Letto",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

export default async function BooksPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const rows = (await listLibraryWorks(profile.id, "BOOK")).rows;
  const items: DemoItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    creator: row.creators?.join(" · ") || "Autore non disponibile",
    status: statusLabels[row.status] ?? "Da leggere",
    progress: row.current_page
      ? `${row.current_page}${row.total_pages ? ` / ${row.total_pages}` : ""} pagine`
      : undefined,
    meta: row.rating != null ? `${row.rating} / 10` : undefined,
    coverUrl: row.cover_url ?? undefined,
    coverClass: "cover-ink",
  }));

  return (
    <main className="page page-library">
      <header className="page-header immersive-head page-header-actions">
        <div>
          <p className="eyebrow">La tua stanza · Libri</p>
          <h1 className="title">La libreria.</h1>
          <p className="subtitle">
            Una lettera, un ripiano. Quando i libri sono molti, scorri lo scaffale
            lateralmente senza allungare inutilmente la pagina.
          </p>
        </div>
        <div className="library-header-actions">
          <Link className="secondary-btn library-switch-link" href="/library/manga">
            Manga →
          </Link>
          <Link className="primary-btn add-library-button" href="/library/add?type=book">
            <Plus size={17} /> Aggiungi libro
          </Link>
        </div>
      </header>
      {items.length ? (
        <ShelfBrowser
          items={items}
          kind="book"
          defaultGroupBy={preferences.books.groupBy}
          density={preferences.books.density}
          coverView={preferences.books.coverView}
        />
      ) : (
        <div className="catalog-notice">
          <div>
            <strong>Nessun libro nella libreria.</strong>
            <p>Cerca un titolo e aggiungilo al tuo catalogo personale.</p>
            <Link className="primary-btn" href="/library/add?type=book">
              Aggiungi il primo libro
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
