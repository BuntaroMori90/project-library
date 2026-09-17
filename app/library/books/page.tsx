import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { getBookShelfEditionMeta } from "@/lib/repositories/book-shelf";
import { listLibraryWorks } from "@/lib/repositories/library";

type BookShelfItem = DemoItem & { favorite?: boolean };

export default async function BooksPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const rows = (await listLibraryWorks(profile.id, "BOOK")).rows;
  const editionMeta = await getBookShelfEditionMeta(
    profile.id,
    rows.map((row) => row.id),
  );

  const items: BookShelfItem[] = rows.map((row) => {
    const metadata = editionMeta.get(row.id);
    const editionLabel = [metadata?.edition, metadata?.format]
      .filter(Boolean)
      .join(" · ");

    return {
      id: row.id,
      title: row.title,
      creator: row.creators?.join(" · ") || "Autore non disponibile",
      status: editionLabel || "Edizione non specificata",
      coverUrl: row.cover_url?.startsWith("data:image/")
        ? `/api/library/cover/work/${row.id}`
        : row.cover_url ?? undefined,
      coverClass: "cover-ink",
      favorite: row.favorite,
    };
  });

  return (
    <main className="page page-library page-books">
      <header className="page-header immersive-head page-header-actions compact-library-head">
        <div>
          <p className="eyebrow">La tua collezione · Libri</p>
          <h1 className="title">Libri</h1>
          <p className="subtitle">
            Copertine ed edizioni ordinate su ripiani semplici da sfogliare anche da telefono.
          </p>
        </div>
        <div className="library-header-actions">
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
        <div className="empty-wood-shelf">
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
