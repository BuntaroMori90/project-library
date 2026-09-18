import { listMangaShelfVariants } from "@/lib/repositories/manga-shelf";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser, type ShelfScope } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";
import { listMangaReadingModes } from "@/lib/repositories/manga-reading";

const statusLabels: Record<string, string> = {
  PLANNED: "Da iniziare",
  IN_PROGRESS: "In lettura",
  COMPLETED: "Completato",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

const readingModeLabels: Record<string, string> = {
  PHYSICAL: "Fisico",
  DIGITAL: "Digitale",
  BOTH: "Fisico + digitale",
};

type MangaShelfItem = DemoItem & {
  href?: string;
  badge?: string;
  shelfScope?: ShelfScope;
};

export default async function MangaPage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const [worksResult, variants] = await Promise.all([
    listLibraryWorks(profile.id, "MANGA"),
    listMangaShelfVariants(profile.id),
  ]);
  const rows = worksResult.rows;
  const readingModes = await listMangaReadingModes(
    profile.id,
    rows.map((row) => row.id),
  );

  const items: MangaShelfItem[] = rows.map((row) => {
    const owned = Number(row.owned_units ?? 0);
    const readingMode = readingModes.get(row.id) ?? null;
    const readingActivity =
      Boolean(readingMode) ||
      row.status !== "PLANNED" ||
      Number(row.current_volume ?? 0) > 0 ||
      Number(row.current_chapter ?? 0) > 0;
    const shelfScope: ShelfScope | undefined =
      owned > 0 ? "collection" : readingActivity ? "outside" : undefined;
    const progressBits = [
      row.current_volume != null ? `Vol. ${Number(row.current_volume)}` : null,
      row.current_chapter != null ? `Cap. ${Number(row.current_chapter)}` : null,
    ].filter(Boolean);

    return {
      id: row.id,
      title: row.title,
      creator: row.creators?.join(" · ") || "Autore non disponibile",
      status: statusLabels[row.status] ?? "Da iniziare",
      progress:
        owned > 0
          ? `${owned} ${owned === 1 ? "volume" : "volumi"}`
          : statusLabels[row.status] ?? "Da iniziare",
      meta:
        owned > 0
          ? [
              readingMode ? readingModeLabels[readingMode] : null,
              progressBits.length ? progressBits.join(" · ") : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          : [
              readingMode ? readingModeLabels[readingMode] : null,
              progressBits.length ? progressBits.join(" · ") : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
      coverUrl: row.cover_url ?? undefined,
      coverClass: "cover-ink",
      href: `/library/manga/${row.id}`,
      shelfScope,
    };
  });

  for (const variant of variants.rows) {
    const series = items.find((item) => item.id === variant.work_id);
    if (!series) continue;
    items.push({
      ...series,
      id: `variant:${variant.edition_id}`,
      title: `${variant.work_title} · ${variant.custom_name || variant.custom_format || "Variant"}`,
      badge: variant.custom_format || "Variant",
      progress:
        variant.volume_number != null
          ? `Volume ${variant.volume_number}`
          : "Edizione speciale",
      meta: "Collezione fisica",
      coverUrl: variant.cover_url ?? undefined,
      href: `/library/manga/${variant.work_id}#i-miei-volumi`,
      shelfScope: "collection",
    });
  }

  return (
    <main className="page page-library page-manga collection-room-page">
      <header className="page-header immersive-head page-header-actions collection-section-head">
        <div>
          <p className="eyebrow">Manga</p>
          <h1 className="title">La tua raccolta.</h1>
          <p className="subtitle">
            Parti dalla collezione fisica e passa a ciò che leggi senza
            possederlo. Una serie resta sempre una sola, anche quando continui
            la lettura in digitale.
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
          showScopeTabs
        />
      ) : (
        <div className="empty-collection-shelf">
          <div className="empty-shelf-space" aria-hidden="true" />
          <div>
            <strong>Nessun manga nella libreria.</strong>
            <p>Aggiungi la prima serie alla tua raccolta.</p>
            <Link className="primary-btn" href="/library/add?type=manga">
              Aggiungi il primo manga
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
