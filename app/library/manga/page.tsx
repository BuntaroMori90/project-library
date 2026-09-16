import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";
import { listMangaShelfVariants } from "@/lib/repositories/manga-shelf";

const statusLabels: Record<string, string> = {
  PLANNED: "Da iniziare",
  IN_PROGRESS: "In lettura",
  COMPLETED: "Completato",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

type MangaShelfItem = DemoItem & {
  href?: string;
  badge?: string;
};

function variantBadge(format: string) {
  if (format.toLowerCase().includes("cofanetto")) return "BOX";
  return format.toUpperCase();
}

export default async function MangaPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const [worksResult, variantsResult] = await Promise.all([
    listLibraryWorks(profile.id, "MANGA"),
    listMangaShelfVariants(profile.id),
  ]);
  const rows = worksResult.rows;
  const ownedCounts = await getMangaOwnedCounts(
    profile.id,
    rows.map((row) => row.id),
  );
  const workById = new Map(rows.map((row) => [row.id, row] as const));

  const seriesItems: MangaShelfItem[] = rows.map((row) => {
    const currentVolume = row.current_volume != null ? Number(row.current_volume) : null;
    const currentChapter = row.current_chapter != null ? Number(row.current_chapter) : null;
    const owned = ownedCounts.get(row.id) ?? 0;

    return {
      id: row.id,
      title: row.title,
      creator: row.creators?.join(" · ") || "Autore non disponibile",
      status: statusLabels[row.status] ?? "Da iniziare",
      progress: currentVolume
        ? `Vol. ${currentVolume}${currentChapter ? ` · Cap. ${currentChapter}` : ""}`
        : undefined,
      meta:
        owned || row.total_volumes
          ? `${owned}${row.total_volumes ? ` / ${row.total_volumes}` : ""} posseduti`
          : undefined,
      coverUrl: row.cover_url ?? undefined,
      coverClass: "cover-ink",
    };
  });

  const variantItems: MangaShelfItem[] = variantsResult.rows.map((variant) => {
    const work = workById.get(variant.work_id);
    const format = variant.custom_format?.trim() || "Speciale";
    const volume =
      variant.volume_number != null ? Number(variant.volume_number) : null;
    const detail =
      variant.custom_name?.trim() ||
      variant.custom_publisher?.trim() ||
      "Edizione da collezione";

    return {
      id: `variant-${variant.edition_id}`,
      title: variant.work_title,
      creator: work?.creators?.join(" · ") || "Autore non disponibile",
      progress: volume ? `Vol. ${volume} · ${format}` : format,
      meta: detail,
      coverUrl: variant.cover_url ?? work?.cover_url ?? undefined,
      coverClass: "cover-ink",
      badge: variantBadge(format),
      href: `/library/manga/${variant.work_id}#collezione-speciale`,
    };
  });

  const items: MangaShelfItem[] = [...seriesItems, ...variantItems];

  return (
    <main className="page page-library page-manga">
      <header className="page-header immersive-head page-header-actions">
        <div>
          <p className="eyebrow">La tua stanza · Manga</p>
          <h1 className="title">Serie e collezione.</h1>
          <p className="subtitle">
            Una scheda principale per ogni serie; variant, limited e speciali che
            possiedi compaiono anche fisicamente nello scaffale senza duplicare
            l&apos;opera.
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
