import Link from "next/link";
import { BookOpen, Clapperboard, LibraryBig, Plus } from "lucide-react";
import { DemoCover } from "@/components/demo-cover";
import type { DemoItem } from "@/lib/demo-data";
import { requireProfile } from "@/lib/profile";
import { listLibraryCreatedOrder } from "@/lib/repositories/home";
import { listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

type MediaType = "BOOK" | "MANGA" | "ANIME";
type LibraryRow = Awaited<ReturnType<typeof listLibraryWorks>>["rows"][number] & {
  mediaType: MediaType;
};

const statusLabels: Record<MediaType, Record<string, string>> = {
  BOOK: {
    PLANNED: "Da leggere",
    IN_PROGRESS: "In lettura",
    COMPLETED: "Letto",
    PAUSED: "In pausa",
    DROPPED: "Abbandonato",
  },
  MANGA: {
    PLANNED: "In collezione",
    IN_PROGRESS: "In collezione",
    COMPLETED: "In collezione",
    PAUSED: "In collezione",
    DROPPED: "In collezione",
  },
  ANIME: {
    PLANNED: "Da vedere",
    IN_PROGRESS: "In visione",
    COMPLETED: "Completato",
    PAUSED: "In pausa",
    DROPPED: "Abbandonato",
  },
};

function itemHref(row: LibraryRow) {
  const section =
    row.mediaType === "BOOK"
      ? "books"
      : row.mediaType === "ANIME"
        ? "anime"
        : "manga";
  return `/library/${section}/${row.id}`;
}

function toItem(row: LibraryRow, mangaOwned: number): DemoItem {
  const coverUrl = row.cover_url?.startsWith("data:image/")
    ? `/api/library/cover/work/${row.id}`
    : row.cover_url ?? undefined;

  const inventoryLabel =
    row.mediaType === "MANGA"
      ? `${mangaOwned} ${mangaOwned === 1 ? "volume" : "volumi"}`
      : statusLabels[row.mediaType][row.status] ??
        (row.mediaType === "BOOK" ? "In libreria" : "Catalogato");

  return {
    id: row.id,
    title: row.title,
    creator: row.creators?.join(" · ") ||
      (row.mediaType === "ANIME" ? "Studio non disponibile" : "Autore non disponibile"),
    status: inventoryLabel,
    coverUrl,
    coverClass: row.mediaType === "ANIME" ? "poster-blue" : "cover-ink",
  };
}

export default async function LibraryHomePage() {
  const { profile } = await requireProfile();
  const [worksResult, createdOrderResult] = await Promise.all([
    listLibraryWorks(profile.id),
    listLibraryCreatedOrder(profile.id),
  ]);

  const all: LibraryRow[] = worksResult.rows.map((row) => ({
    ...row,
    mediaType: row.media_type,
  }));
  const books = all.filter((row) => row.mediaType === "BOOK");
  const manga = all.filter((row) => row.mediaType === "MANGA");
  const anime = all.filter((row) => row.mediaType === "ANIME");
  const mangaOwnedCounts = await getMangaOwnedCounts(
    profile.id,
    manga.map((row) => row.id),
  );
  const mangaOwnedTotal = Array.from(mangaOwnedCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );

  const byId = new Map(all.map((row) => [row.id, row] as const));
  const recent = createdOrderResult.rows
    .map((entry) => byId.get(entry.work_id))
    .filter((row): row is LibraryRow => Boolean(row))
    .slice(0, 6);
  const favorites = all.filter((row) => row.favorite).slice(0, 6);

  return (
    <main className="page home-page collection-home">
      <section className="collection-overview" aria-labelledby="collection-title">
        <div className="collection-overview-copy">
          <p className="eyebrow">Libronia</p>
          <h1 id="collection-title">La tua collezione</h1>
          <p>
            Libri, manga e anime organizzati come una libreria personale: pochi dati,
            quelli utili, e le opere subito a portata di mano.
          </p>
          <Link className="primary-btn collection-add" href="/library/add">
            <Plus size={18} />
            Aggiungi alla collezione
          </Link>
        </div>

        <div className="collection-stats" aria-label="Riepilogo collezione">
          <Link href="/library/books" className="collection-stat">
            <BookOpen size={18} />
            <strong>{books.length}</strong>
            <span>Libri</span>
          </Link>
          <Link href="/library/manga" className="collection-stat">
            <LibraryBig size={18} />
            <strong>{mangaOwnedTotal}</strong>
            <span>Volumi manga</span>
            <small>{manga.length} {manga.length === 1 ? "serie" : "serie"}</small>
          </Link>
          <Link href="/library/anime" className="collection-stat">
            <Clapperboard size={18} />
            <strong>{anime.length}</strong>
            <span>Anime</span>
          </Link>
        </div>
      </section>

      <section className="collection-home-section" aria-labelledby="recent-title">
        <div className="collection-section-heading">
          <div>
            <p className="eyebrow">Ultimi aggiunti</p>
            <h2 id="recent-title">Sul ripiano da poco</h2>
          </div>
          <span>{recent.length} {recent.length === 1 ? "opera" : "opere"}</span>
        </div>

        {recent.length ? (
          <div className="collection-shelf collection-shelf-summary">
            <div className="collection-shelf-items">
              {recent.map((row) => (
                <DemoCover
                  key={row.id}
                  item={toItem(row, mangaOwnedCounts.get(row.id) ?? 0)}
                  href={itemHref(row)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-wood-shelf">
            <div>
              <strong>Il primo ripiano è libero.</strong>
              <p>Aggiungi la prima opera per iniziare la tua collezione.</p>
              <Link className="primary-btn" href="/library/add">
                Aggiungi la prima opera
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="collection-home-section" aria-labelledby="favorites-title">
        <div className="collection-section-heading">
          <div>
            <p className="eyebrow">Preferiti</p>
            <h2 id="favorites-title">I tuoi punti fermi</h2>
          </div>
          <span>{favorites.length} {favorites.length === 1 ? "preferito" : "preferiti"}</span>
        </div>

        {favorites.length ? (
          <div className="collection-shelf collection-shelf-summary favorites-shelf">
            <div className="collection-shelf-items">
              {favorites.map((row) => (
                <DemoCover
                  key={row.id}
                  item={toItem(row, mangaOwnedCounts.get(row.id) ?? 0)}
                  href={itemHref(row)}
                  favorite
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="collection-empty-copy">
            <strong>Nessun preferito per ora.</strong>
            <p>Puoi contrassegnare un’opera dalla sua scheda personale.</p>
          </div>
        )}
      </section>
    </main>
  );
}
