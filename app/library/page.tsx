import Link from "next/link";
import { BookOpen, Clapperboard, LibraryBig, Plus } from "lucide-react";
import {
  CollectionShelf,
  type CollectionShelfItem,
} from "@/components/collection-shelf";
import { requireProfile } from "@/lib/profile";
import {
  listHomeCollectionWorks,
  type HomeCollectionRow,
} from "@/lib/repositories/home-preview";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

function itemHref(row: HomeCollectionRow) {
  const section =
    row.media_type === "BOOK"
      ? "books"
      : row.media_type === "ANIME"
        ? "anime"
        : "manga";
  return `/library/${section}/${row.id}`;
}

function compactBookInfo(row: HomeCollectionRow) {
  const primary = row.edition_name?.trim() || row.edition_publisher?.trim();
  const format = row.edition_format?.trim();
  if (primary && format) return `${primary} · ${format}`;
  if (primary) return primary;
  if (format) return format;
  return row.creators?.join(" · ") || "Edizione da completare";
}

function toShelfItem(
  row: HomeCollectionRow,
  mangaOwnedCounts: Map<string, number>,
): CollectionShelfItem {
  const owned = mangaOwnedCounts.get(row.id) ?? 0;
  const kind =
    row.media_type === "BOOK"
      ? "book"
      : row.media_type === "MANGA"
        ? "manga"
        : "anime";

  const subtitle =
    row.media_type === "BOOK"
      ? compactBookInfo(row)
      : row.media_type === "MANGA"
        ? owned === 1
          ? "1 volume posseduto"
          : `${owned} volumi posseduti`
        : "Anime catalogato";

  return {
    id: row.id,
    title: row.title,
    subtitle,
    href: itemHref(row),
    coverUrl: row.cover_url ?? undefined,
    kind,
    favorite: row.favorite,
  };
}

export default async function LibraryHomePage() {
  const { profile } = await requireProfile();
  const result = await listHomeCollectionWorks(profile.id);
  const all = result.rows;
  const books = all.filter((row) => row.media_type === "BOOK");
  const manga = all.filter((row) => row.media_type === "MANGA");
  const anime = all.filter((row) => row.media_type === "ANIME");
  const mangaOwnedCounts = await getMangaOwnedCounts(
    profile.id,
    manga.map((row) => row.id),
  );
  const ownedMangaVolumes = Array.from(mangaOwnedCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );

  // La query è ordinata per library_entries.created_at: qui "recenti"
  // significa davvero aggiunti di recente, non modificati di recente.
  const recent = all.slice(0, 7);
  const favorites = all.filter((row) => row.favorite).slice(0, 7);

  return (
    <main className="page home-libronia-preview">
      <div className="design-preview-banner" role="note">
        <span>Anteprima grafica · nessuna modifica ai dati</span>
        <Link href="/library/design-preview/manga">
          Vedi proposta serie manga →
        </Link>
      </div>

      <section className="collection-overview" aria-labelledby="collection-title">
        <div className="collection-overview-copy">
          <p className="eyebrow">Libronia</p>
          <h1 id="collection-title">La tua collezione</h1>
          <p>
            Una libreria domestica digitale: copertine protagoniste, ripiani
            credibili e informazioni di possesso essenziali.
          </p>
        </div>
        <Link className="collection-add-action" href="/library/add">
          <Plus size={18} />
          <span>Aggiungi alla collezione</span>
        </Link>
      </section>

      <section className="collection-count-grid" aria-label="Riepilogo collezione">
        <Link href="/library/books" className="collection-count-card">
          <BookOpen size={17} />
          <strong>{books.length}</strong>
          <span>libri</span>
        </Link>
        <Link href="/library/manga" className="collection-count-card manga-count-card">
          <LibraryBig size={17} />
          <strong>{manga.length}</strong>
          <span>serie manga</span>
          <small>{ownedMangaVolumes} volumi posseduti</small>
        </Link>
        <Link href="/library/anime" className="collection-count-card">
          <Clapperboard size={17} />
          <strong>{anime.length}</strong>
          <span>anime</span>
        </Link>
      </section>

      <CollectionShelf
        eyebrow="Inventario"
        title="Ultimi aggiunti"
        items={recent.map((row) => toShelfItem(row, mangaOwnedCounts))}
        emptyTitle="Il primo ripiano è pronto."
        emptyText="Aggiungi la prima opera per iniziare a costruire la tua libreria."
        preloadFirst
      />

      <CollectionShelf
        eyebrow="Scelti da te"
        title="Preferiti"
        items={favorites.map((row) => toShelfItem(row, mangaOwnedCounts))}
        emptyTitle="Nessun preferito ancora."
        emptyText="I preferiti salvati dalle schede compariranno qui, sullo stesso mobile."
      />
    </main>
  );
}
