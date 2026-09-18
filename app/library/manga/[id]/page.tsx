import { OwnedVolumeGallery } from "@/components/owned-volume-gallery";
import { BulkOwnedVolumes } from "@/components/bulk-owned-volumes";
import { DemoCover } from "@/components/demo-cover";
import { WishlistToggle } from "@/components/wishlist-toggle";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, Heart, LibraryBig, StickyNote } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { demoManga } from "@/lib/demo-data";
import { getMangaDetail } from "@/lib/repositories/library";
import { normalizeMangaReadingMode } from "@/lib/repositories/manga-reading";
import { listOwnedMangaVolumes } from "@/lib/repositories/owned-volume-covers";
import {
  toggleOwnedVolume,
  updateMangaPersonal,
  updateMangaProgress,
  updateMangaState,
} from "./actions";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function DetailTabs({
  owned = false,
  showEditions = true,
}: {
  owned?: boolean;
  showEditions?: boolean;
}) {
  return (
    <nav className="detail-tabs" aria-label="Sezioni opera">
      <a href="#panoramica">Panoramica</a>
      <a className="active" href={owned ? "#i-miei-volumi" : "#volumi"}>
        Volumi
      </a>
      {showEditions ? <a href="#edizioni">Edizioni</a> : null}
      <a href="#personale">La mia scheda</a>
    </nav>
  );
}

function VolumeLegend() {
  return (
    <div className="volume-legend" aria-label="Legenda volumi">
      <span><i className="legend-dot read" /> Letto</span>
      <span><i className="legend-dot owned" /> Posseduto fisicamente</span>
      <span><i className="legend-dot current" /> Attuale</span>
      <span><i className="legend-dot empty" /> Da leggere</span>
    </div>
  );
}

function DemoDetail({ id }: { id: string }) {
  const item = demoManga.find((manga) => manga.id === id);
  if (!item) notFound();
  const totalVolumes = id === "berserk" ? 42 : id === "monster" ? 9 : 12;
  const readThrough = id === "berserk" ? 25 : totalVolumes;
  const ownedThrough = id === "berserk" ? 18 : id === "monster" ? totalVolumes : 4;

  return (
    <main className="page manga-detail-page work-detail-v2">
      <Link href="/library/manga" className="back-link">← Manga</Link>
      <section className="work-hero">
        <div className="work-cover-wrap"><DemoCover item={item} /></div>
        <div className="work-identity">
          <p className="eyebrow">Manga · catalogo demo</p>
          <h1>{item.title}</h1>
          <p className="work-byline">{item.creator}</p>
          <p className="work-description">
            Lettura e possesso restano indipendenti: l&apos;opera compare una volta
            sola anche quando possiedi alcuni volumi e prosegui in digitale.
          </p>
        </div>
      </section>
      <section className="personal-dashboard" id="personale">
        <div className="personal-dashboard-head">
          <div><span className="eyebrow">La mia scheda</span><h2>{item.title}</h2></div>
        </div>
        <div className="personal-metrics">
          <div><span>Stato</span><strong>In lettura</strong><small>Stato personale</small></div>
          <div><span>Lettura</span><strong>Fisico + digitale</strong><small>Modalità</small></div>
          <div><span>Progresso</span><strong>Vol. {readThrough}</strong><small>Ultimo punto registrato</small></div>
          <div><span>Posseduti</span><strong>{ownedThrough}</strong><small>Volumi fisici</small></div>
        </div>
      </section>
      <DetailTabs showEditions={false} />
      <section id="panoramica" className="detail-section overview-grid">
        <article className="overview-card">
          <span className="eyebrow">Opera</span><h2>Panoramica</h2>
          <dl>
            <div><dt>Autore</dt><dd>{item.creator}</dd></div>
            <div><dt>Volumi</dt><dd>{totalVolumes}</dd></div>
          </dl>
        </article>
      </section>
      <section id="volumi" className="detail-section volumes-stage">
        <div className="section-heading detail-heading">
          <div><span className="eyebrow">Collezione</span><h2>I tuoi volumi</h2></div>
        </div>
        <div className="volume-grid volume-grid-visual">
          {Array.from({ length: ownedThrough }, (_, index) => index + 1).map((volume) => (
            <article key={volume} className="volume visual-volume owned">
              <div className="volume-spine"><span>{String(volume).padStart(2, "0")}</span></div>
              <div className="volume-copy"><strong>Volume {volume}</strong><small>Posseduto</small></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) return <DemoDetail id={id} />;

  const { profile } = await requireProfile();
  const [detail, ownedVolumeRows] = await Promise.all([
    getMangaDetail(profile.id, id),
    listOwnedMangaVolumes(profile.id, id),
  ]);

  const {
    work,
    creators,
    libraryEntry,
    progress,
    editions,
    canonicalEdition,
    volumes,
    ownedIds,
    ownedVolumeNumbers,
  } = detail;
  if (!work) notFound();
  const readingMode = normalizeMangaReadingMode(progress?.source_label);

  const currentVolume =
    progress?.current_volume != null ? Number(progress.current_volume) : null;
  const currentChapter =
    progress?.current_chapter != null ? Number(progress.current_chapter) : null;
  const totalVolumes = work.total_volumes ?? canonicalEdition?.total_units ?? null;
  const ownedCount = ownedVolumeNumbers.size;
  const state = libraryEntry?.status ?? "PLANNED";
  const statusText = statusLabels[state] ?? "Da iniziare";
  const readingModeText = readingMode ? readingModeLabels[readingMode] : "Non indicata";
  const publicationLabel =
    work.publication_status === "ONGOING"
      ? "In pubblicazione"
      : work.publication_status === "COMPLETED"
        ? "Concluso"
        : work.publication_status === "HIATUS"
          ? "In pausa editoriale"
          : "Stato da verificare";

  const visibleEditions = editions.filter((edition) => {
    const normalizedName = edition.name.trim().toLowerCase();
    const genericName =
      normalizedName === "edizione da completare" ||
      normalizedName === "edizione personale" ||
      normalizedName === "edizione";
    return (
      !genericName ||
      Boolean(
        edition.publisher ||
          edition.language ||
          edition.publication_year ||
          edition.format,
      )
    );
  });

  return (
    <main className="page manga-detail-page work-detail-v2">
      <Link href="/library/manga" className="back-link">← Manga</Link>

      <section className="work-hero real-work-hero">
        <div className="work-cover-wrap">
          <div className="real-cover-shell">
            {work.cover_url ? (
              <Image
                className="real-cover"
                src={work.cover_url}
                alt={`Copertina di ${work.title}`}
                width={500}
                height={750}
                sizes="(max-width: 640px) 55vw, 260px"
                priority
                unoptimized={work.cover_url.startsWith("/api/library/cover/")}
              />
            ) : (
              <div className="cover-placeholder">{work.title.slice(0, 1)}</div>
            )}
          </div>
          {libraryEntry?.favorite ? (
            <span className="favorite-float"><Heart size={16} fill="currentColor" /> Preferito</span>
          ) : null}
        </div>
        <div className="work-identity">
          <p className="eyebrow">Manga</p>
          <h1>{work.title}</h1>
          {work.original_title ? <p className="work-original">{work.original_title}</p> : null}
          <p className="work-byline">
            {creators.join(" · ") || "Autore non disponibile"}
            {work.release_year ? ` · ${work.release_year}` : ""} · {publicationLabel}
          </p>
          {work.genres?.length ? (
            <div className="meta-pills">
              {work.genres.slice(0, 5).map((genre: string) => <span key={genre}>{genre}</span>)}
            </div>
          ) : null}
          {work.description ? <p className="work-description">{work.description}</p> : null}
        </div>
      </section>

      <section className="personal-dashboard" id="personale">
        <div className="personal-dashboard-head">
          <div>
            <span className="eyebrow">La mia scheda</span>
            <h2>Lettura e collezione</h2>
          </div>
          <WishlistToggle
            profileId={profile.id}
            workId={work.id}
            returnPath={"/library/manga/" + work.id}
          />
        </div>

        <div className="personal-metrics">
          <div>
            <span>Stato</span><strong>{statusText}</strong><small>Stato di lettura</small>
          </div>
          <div>
            <span>Lettura</span><strong>{readingModeText}</strong><small>Fisico, digitale o entrambi</small>
          </div>
          <div>
            <span>Progresso</span>
            <strong>
              {currentVolume ? `Vol. ${currentVolume}` : "—"}
              {currentChapter ? ` · Cap. ${currentChapter}` : ""}
            </strong>
            <small>Dove sei arrivato</small>
          </div>
          <div>
            <span>Posseduti</span><strong>{ownedCount}</strong><small>Volumi fisici</small>
          </div>
        </div>

        <div className="personal-editors">
          <form action={updateMangaState} className="personal-editor-card">
            <input type="hidden" name="workId" value={work.id} />
            <label>
              Stato
              <select name="status" defaultValue={state}>
                <option value="PLANNED">Da iniziare</option>
                <option value="IN_PROGRESS">In lettura</option>
                <option value="COMPLETED">Completato</option>
                <option value="PAUSED">In pausa</option>
                <option value="DROPPED">Abbandonato</option>
              </select>
            </label>
            <button type="submit">Salva stato</button>
          </form>

          <form action={updateMangaProgress} className="personal-editor-card progress-card-editor manga-reading-editor">
            <input type="hidden" name="workId" value={work.id} />
            <label>
              Modalità di lettura
              <select name="readingMode" defaultValue={readingMode ?? ""}>
                <option value="">Non indicata</option>
                <option value="PHYSICAL">Fisico</option>
                <option value="DIGITAL">Digitale</option>
                <option value="BOTH">Entrambi</option>
              </select>
            </label>
            <label>
              Volume raggiunto
              <input
                name="currentVolume"
                type="number"
                step="1"
                min="0"
                max={totalVolumes ?? undefined}
                defaultValue={currentVolume ?? ""}
                placeholder="25"
              />
            </label>
            <label>
              Capitolo raggiunto
              <input
                name="currentChapter"
                type="number"
                step="0.01"
                min="0"
                defaultValue={currentChapter ?? ""}
                placeholder="201"
              />
            </label>
            <button type="submit">Aggiorna lettura</button>
          </form>

          <form action={updateMangaPersonal} className="personal-editor-card personal-notes-editor">
            <input type="hidden" name="workId" value={work.id} />
            <label className="favorite-toggle">
              <input type="checkbox" name="favorite" defaultChecked={Boolean(libraryEntry?.favorite)} /> Preferito
            </label>
            <label>
              Voto
              <input
                name="rating"
                type="number"
                min="0"
                max="10"
                step="0.5"
                defaultValue={libraryEntry?.rating ?? ""}
                placeholder="9.5"
              />
            </label>
            <label className="notes-field">
              Note
              <textarea
                name="notes"
                defaultValue={libraryEntry?.notes ?? ""}
                placeholder="Annotazioni personali..."
              />
            </label>
            <button type="submit">Salva scheda</button>
          </form>
        </div>
      </section>

      <DetailTabs owned showEditions={visibleEditions.length > 0} />

      <section id="panoramica" className="detail-section overview-grid">
        <article className="overview-card">
          <span className="eyebrow">Opera</span>
          <h2>Panoramica</h2>
          <dl>
            <div><dt>Autore</dt><dd>{creators.join(", ") || "—"}</dd></div>
            <div><dt>Stato editoriale</dt><dd>{publicationLabel}</dd></div>
            <div><dt>Volumi</dt><dd>{totalVolumes ?? "—"}</dd></div>
            <div><dt>Capitoli</dt><dd>{work.total_chapters ?? "—"}</dd></div>
          </dl>
        </article>
        <article className="overview-card note-preview">
          <StickyNote size={20} />
          <span className="eyebrow">Le mie note</span>
          <p>{libraryEntry?.notes || "Nessuna nota personale."}</p>
        </article>
      </section>

      <OwnedVolumeGallery volumes={ownedVolumeRows.rows} />

      <section id="volumi" className="detail-section volumes-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Collezione fisica</span>
            <h2>Gestisci i volumi</h2>
          </div>
          <span>{totalVolumes ? `${totalVolumes} pubblicati` : "Totale da verificare"}</span>
        </div>
        <p className="subtitle detail-explainer">
          Qui registri solo ciò che possiedi. La lettura resta indipendente e si
          aggiorna nella tua scheda.
        </p>
        {libraryEntry ? (
          <BulkOwnedVolumes
            workId={id}
            editions={editions.map(({ id: editionId, name }) => ({ id: editionId, name }))}
          />
        ) : null}

        <details className="owned-catalog-tools">
          <summary>Apri il catalogo completo per aggiungere o rimuovere singoli volumi</summary>
          <VolumeLegend />
          {volumes.length && canonicalEdition?.id ? (
            <div className="volume-grid volume-grid-visual">
              {volumes.map((volume) => {
                const ownedThisEdition = ownedIds.has(volume.id);
                const ownedAnywhere = ownedVolumeNumbers.has(volume.unit_number);
                const read = currentVolume !== null && volume.unit_number <= currentVolume;
                const current = currentVolume === volume.unit_number;
                return (
                  <article
                    key={volume.id}
                    className={`volume visual-volume interactive-volume ${ownedAnywhere ? "owned" : ""} ${read ? "read" : ""} ${current ? "current" : ""}`}
                  >
                    <div className="volume-spine"><span>{String(volume.unit_number).padStart(2, "0")}</span></div>
                    <div className="volume-copy">
                      <strong>Volume {volume.unit_number}</strong>
                      <span>{current ? "Volume attuale" : read ? "Letto" : "Da leggere"}</span>
                      <small>
                        {ownedThisEdition
                          ? "Posseduto · edizione principale"
                          : ownedAnywhere
                            ? "Posseduto · altra edizione"
                            : "Non posseduto"}
                      </small>
                    </div>
                    <form action={toggleOwnedVolume} className="volume-toggle-form">
                      <input type="hidden" name="workId" value={work.id} />
                      <input type="hidden" name="editionId" value={canonicalEdition.id} />
                      <input type="hidden" name="unitId" value={volume.id} />
                      <button
                        className="volume-action"
                        type="submit"
                        aria-label={
                          ownedThisEdition
                            ? `Rimuovi volume ${volume.unit_number} da questa edizione`
                            : ownedAnywhere
                              ? `Segna volume ${volume.unit_number} anche in questa edizione`
                              : `Segna volume ${volume.unit_number} come posseduto`
                        }
                      >
                        {ownedThisEdition ? <Check size={14} /> : <Circle size={14} />} {ownedThisEdition ? "Posseduto" : ownedAnywhere ? "Segna anche qui" : "Segna"}
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="catalog-notice">
              <LibraryBig size={22} />
              <div>
                <strong>Volumi non ancora disponibili nel catalogo.</strong>
                <p>Puoi comunque usare l&apos;edizione personale per registrare quelli che possiedi.</p>
              </div>
            </div>
          )}
        </details>
      </section>

      {visibleEditions.length ? (
        <section id="edizioni" className="detail-section">
          <div className="section-heading detail-heading">
            <div><span className="eyebrow">Edizioni</span><h2>Edizioni con dati utili</h2></div>
          </div>
          <div className="edition-row">
            {visibleEditions.map((edition) => (
              <article
                key={edition.id}
                className={`edition-choice ${edition.id === canonicalEdition?.id ? "selected" : ""}`}
              >
                <strong>{edition.name}</strong>
                <span>
                  {[edition.publisher, edition.language, edition.publication_year, edition.format]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
