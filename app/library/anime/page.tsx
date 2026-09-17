import Link from "next/link";
import { Plus } from "lucide-react";
import { ShelfBrowser } from "@/components/shelf-browser";
import type { DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";

const statusLabels: Record<string, string> = {
  PLANNED: "Da vedere",
  IN_PROGRESS: "In visione",
  COMPLETED: "Completato",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

type AnimeShelfItem = DemoItem & { favorite?: boolean };

export default async function AnimePage() {
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  const rows = (await listLibraryWorks(profile.id, "ANIME")).rows;
  const items: AnimeShelfItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    creator: row.creators?.join(" · ") || "Studio non disponibile",
    status: statusLabels[row.status] ?? "Catalogato",
    meta: row.total_episodes ? `${row.total_episodes} episodi` : undefined,
    coverUrl: row.cover_url ?? undefined,
    coverClass: "poster-blue",
    favorite: row.favorite,
  }));

  return (
    <main className="page page-library page-anime">
      <header className="page-header immersive-head page-header-actions compact-library-head">
        <div>
          <p className="eyebrow">La tua collezione · Anime</p>
          <h1 className="title">Anime</h1>
          <p className="subtitle">
            Una videoteca da consultare come catalogo: locandine, titoli e informazioni, senza modalità di riproduzione.
          </p>
        </div>
        <div className="library-header-actions">
          <Link className="primary-btn add-library-button" href="/library/add?type=anime">
            <Plus size={17} /> Aggiungi anime
          </Link>
        </div>
      </header>

      {items.length ? (
        <ShelfBrowser
          items={items}
          kind="anime"
          defaultGroupBy={preferences.anime.groupBy}
          density={preferences.anime.density}
        />
      ) : (
        <div className="empty-wood-shelf">
          <div>
            <strong>Nessun anime nella videoteca.</strong>
            <p>Cerca una serie e aggiungila al tuo catalogo personale.</p>
            <Link className="primary-btn" href="/library/add?type=anime">
              Aggiungi il primo anime
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
