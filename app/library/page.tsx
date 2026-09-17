import Link from "next/link";
import { BookOpen, Clapperboard, LibraryBig, Plus } from "lucide-react";
import { DemoCover } from "@/components/demo-cover";
import type { DemoItem } from "@/lib/demo-data";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";

type MediaType = "BOOK" | "MANGA" | "ANIME";
type LibraryRow = Awaited<
  ReturnType<typeof listLibraryWorks>
>["rows"][number] & { mediaType: MediaType };

const statusLabels: Record<MediaType, Record<string, string>> = {
  BOOK: {
    PLANNED: "Da leggere",
    IN_PROGRESS: "In lettura",
    COMPLETED: "Letto",
    PAUSED: "In pausa",
    DROPPED: "Abbandonato",
  },
  MANGA: {
    PLANNED: "Da iniziare",
    IN_PROGRESS: "In lettura",
    COMPLETED: "Completato",
    PAUSED: "In pausa",
    DROPPED: "Abbandonato",
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

function toItem(row: LibraryRow): DemoItem {
  let progress: string | undefined;

  if (row.mediaType === "BOOK" && row.current_page) {
    progress = `${row.current_page}${row.total_pages ? ` / ${row.total_pages}` : ""} pagine`;
  }

  if (row.mediaType === "MANGA") {
    const owned = Number(row.owned_units ?? 0);
    progress = `${owned} ${owned === 1 ? "volume" : "volumi"}`;
  }

  if (row.mediaType === "ANIME" && row.current_season) {
    progress = `S${row.current_season}${row.current_episode ? ` · Ep. ${row.current_episode}` : ""}`;
  }

  const coverUrl = row.cover_url?.startsWith("data:image/")
    ? `/api/library/cover/work/${row.id}`
    : row.cover_url ?? undefined;

  return {
    id: row.id,
    title: row.title,
    creator: row.creators?.join(" · ") || "Autore non disponibile",
    status: statusLabels[row.mediaType][row.status] ?? "In collezione",
    progress,
    meta: row.rating != null ? `${row.rating} / 10` : undefined,
    coverUrl,
    coverClass: row.mediaType === "ANIME" ? "poster-blue" : "cover-ink",
  };
}

function HomeShelf({
  title,
  eyebrow,
  rows,
  emptyCopy,
}: {
  title: string;
  eyebrow: string;
  rows: LibraryRow[];
  emptyCopy: string;
}) {
  return (
    <section className="collection-home-section">
      <div className="collection-home-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {rows.length ? <span>{rows.length} elementi</span> : null}
      </div>

      {rows.length ? (
        <div className="collection-summary-shelf">
          <div className="collection-summary-row">
            {rows.map((row) => (
              <DemoCover
                key={row.id}
                item={toItem(row)}
                href={itemHref(row)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-collection-shelf compact-empty-shelf">
          <div className="empty-shelf-space" aria-hidden="true" />
          <p>{emptyCopy}</p>
        </div>
      )}
    </section>
  );
}

export default async function LibraryHomePage() {
  const { profile } = await requireProfile();
  const result = await listLibraryWorks(profile.id);
  const all: LibraryRow[] = result.rows.map((row) => ({
    ...row,
    mediaType: row.media_type,
  }));

  const books = all.filter((row) => row.mediaType === "BOOK");
  const manga = all.filter((row) => row.mediaType === "MANGA");
  const anime = all.filter((row) => row.mediaType === "ANIME");
  const mangaVolumes = manga.reduce(
    (total, row) => total + Number(row.owned_units ?? 0),
    0,
  );

  // listLibraryWorks currently exposes updated_at as the reliable ordering field.
  // Keep this section concise and do not infer missing creation dates.
  const recent = all.slice(0, 6);
  const favorites = all.filter((row) => row.favorite).slice(0, 6);

  return (
    <main className="page home-page collection-home">
      <section className="collection-home-intro">
        <div className="collection-home-title">
          <p className="eyebrow">Libronia</p>
          <h1>La tua collezione</h1>
          <p>
            Libri, manga e anime organizzati come una libreria personale, senza
            distrazioni.
          </p>
        </div>

        <Link className="primary-btn collection-add-button" href="/library/add">
          <Plus size={18} />
          Aggiungi alla collezione
        </Link>

        <div className="collection-counts" aria-label="Riepilogo collezione">
          <Link href="/library/books" className="collection-count-card">
            <BookOpen size={18} />
            <span>Libri</span>
            <strong>{books.length}</strong>
          </Link>
          <Link href="/library/manga" className="collection-count-card">
            <LibraryBig size={18} />
            <span>Volumi manga</span>
            <strong>{mangaVolumes}</strong>
            <small>{manga.length} {manga.length === 1 ? "serie" : "serie"}</small>
          </Link>
          <Link href="/library/anime" className="collection-count-card">
            <Clapperboard size={18} />
            <span>Anime</span>
            <strong>{anime.length}</strong>
          </Link>
        </div>
      </section>

      <HomeShelf
        eyebrow="Attività recente"
        title="Ultimi aggiunti"
        rows={recent}
        emptyCopy="Il ripiano è ancora vuoto. Aggiungi la prima opera alla tua collezione."
      />

      <HomeShelf
        eyebrow="Scelti da te"
        title="Preferiti"
        rows={favorites}
        emptyCopy="Non hai ancora contrassegnato opere come preferite."
      />
    </main>
  );
}
