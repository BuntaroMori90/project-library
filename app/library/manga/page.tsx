import { listMangaShelfVariants } from "@/lib/repositories/manga-shelf";
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
  badge?: string;
};

export default async function MangaPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const [worksResult, variants] = await Promise.all([
    listLibraryWorks(profile.id, "MANGA"), listMangaShelfVariants(profile.id),
  ]);
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

  for (const variant of variants.rows) {
    const series = items.find(item => item.id === variant.work_id);
    if (!series) continue;
    items.push({ ...series, id: `variant:${variant.edition_id}`,
      title: `${variant.work_title} · ${variant.custom_name || variant.custom_format || "Variant"}`,
      badge: variant.custom_format || "Variant",
      progress: variant.volume_number != null ? `Volume ${variant.volume_number}` : "Edizione speciale",
      coverUrl: variant.cover_url ?? undefined,
      href: `/library/manga/${variant.work_id}#i-miei-volumi`,
    });
  }

  return (
    <main className="page page-library page-manga collection-room-page">
      <header className="page-header immersive-head page-header-actions collection-section-head">
        <div>
          <p className="eyebrow">La tua collezione · Manga</p>
          <h1 className="title">Le tue serie.</h1>
          <p className="subtitle">
            Una copertina per serie, con le tue variant in evidenza.
            Apri la scheda per consultare i singoli volumi.
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
