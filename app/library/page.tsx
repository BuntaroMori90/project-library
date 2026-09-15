import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clapperboard, LibraryBig } from "lucide-react";
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
  if (row.mediaType === "BOOK" && row.current_page)
    progress = `${row.current_page}${row.total_pages ? ` / ${row.total_pages}` : ""} pagine`;
  if (row.mediaType === "MANGA" && row.current_volume)
    progress = `Vol. ${row.current_volume}${row.current_chapter ? ` · Cap. ${row.current_chapter}` : ""}`;
  if (row.mediaType === "ANIME" && row.current_season)
    progress = `S${row.current_season}${row.current_episode ? ` · Ep. ${row.current_episode}` : ""}`;
  const coverUrl = row.cover_url?.startsWith("data:image/")
    ? `/api/library/cover/work/${row.id}`
    : row.cover_url ?? undefined;
  return {
    id: row.id,
    title: row.title,
    creator: row.creators?.join(" · ") || "Autore non disponibile",
    status: statusLabels[row.mediaType][row.status] ?? "Da iniziare",
    progress,
    meta: row.rating != null ? `${row.rating} / 10` : undefined,
    coverUrl,
    coverClass: row.mediaType === "ANIME" ? "poster-blue" : "cover-ink",
  };
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
  const recent = all.slice(0, 5);
  const favorites = all.filter((row) => row.favorite).slice(0, 5);
  const showcase = (favorites.length ? favorites : recent).slice(0, 4);

  return (
    <main className="page home-page home-v4">
      <section className="home-collection-hero">
        <div className="home-collection-copy">
          <p className="eyebrow">La mia collezione</p>
          <h1>
            Libri, manga e anime.
            <br />
            Tutto al suo posto.
          </h1>
          <p className="home-collection-intro">
            Un archivio personale da sfogliare, ordinare e far crescere nel
            tempo.
          </p>
          <div
            className="home-collection-ledger"
            aria-label="Riepilogo collezione"
          >
            <div className="ledger-total">
              <strong>{all.length}</strong>
              <span>opere</span>
            </div>
            <Link href="/library/books" className="ledger-item">
              <BookOpen size={16} />
              <span>Libri</span>
              <strong>{books.length}</strong>
            </Link>
            <Link href="/library/manga" className="ledger-item">
              <LibraryBig size={16} />
              <span>Manga</span>
              <strong>{manga.length}</strong>
            </Link>
            <Link href="/library/anime" className="ledger-item">
              <Clapperboard size={16} />
              <span>Anime</span>
              <strong>{anime.length}</strong>
            </Link>
          </div>
        </div>
        <div className="collection-stage" aria-label="Opere in evidenza">
          <span className="stage-glow" />
          {showcase.map((row, index) => {
            const item = toItem(row);
            return (
              <Link
                href={itemHref(row)}
                key={row.id}
                className={`stage-cover stage-cover-${index + 1} ${item.coverClass}`}
              >
                {item.coverUrl ? (
                  <Image
                    className="cover-image"
                    src={item.coverUrl}
                    alt={item.title}
                    width={400}
                    height={600}
                    sizes="(max-width: 640px) 42vw, 180px"
                    unoptimized={item.coverUrl.startsWith("/api/")}
                  />
                ) : (
                  <>
                    <span>{item.title}</span>
                    <small>{item.creator}</small>
                  </>
                )}
              </Link>
            );
          })}
          {!showcase.length ? (
            <Link
              href="/library/add"
              className="stage-cover stage-cover-1 cover-ink"
            >
              <span>Inizia la collezione</span>
              <small>Aggiungi la prima opera</small>
            </Link>
          ) : null}
          <div className="stage-shadow" />
        </div>
      </section>

      <section className="home-vitrine-section">
        <div className="home-vitrine-heading">
          <div>
            <p className="eyebrow">Ultimi inserimenti</p>
            <h2>Aggiunti di recente</h2>
          </div>
          <span>{recent.length} elementi</span>
        </div>
        {recent.length ? (
          <div className="home-display-shelf">
            <div className="home-cover-row home-cover-row-clean">
              {recent.map((row) => (
                <DemoCover
                  key={row.id}
                  item={toItem(row)}
                  href={itemHref(row)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="catalog-notice">
            <div>
              <strong>La libreria è ancora vuota.</strong>
              <p>
                Aggiungi un libro, un manga o un anime per costruire la tua
                collezione.
              </p>
              <Link className="primary-btn" href="/library/add">
                Aggiungi la prima opera
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="home-vitrine-section favorites-section">
        <div className="home-vitrine-heading">
          <div>
            <p className="eyebrow">Scelti da te</p>
            <h2>Preferiti</h2>
          </div>
          <span>La parte più personale della libreria</span>
        </div>
        {favorites.length ? (
          <div className="favorites-gallery">
            {favorites.map((row, index) => (
              <div
                key={row.id}
                className={`favorite-piece favorite-piece-${index + 1}`}
              >
                <DemoCover item={toItem(row)} href={itemHref(row)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="catalog-notice">
            <div>
              <strong>Nessun preferito.</strong>
              <p>Contrassegna le opere dalla loro scheda personale.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
