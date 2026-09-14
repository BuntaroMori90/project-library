import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Heart, Star, StickyNote } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { getBookDetail } from "@/lib/repositories/library";
import { demoBooks } from "@/lib/demo-data";
import { DemoCover } from "@/components/demo-cover";
import { WishlistToggle } from "@/components/wishlist-toggle";
import { BookDeleteForm } from "@/components/book-delete-form";
import {
  chooseBookEdition,
  updateBookPersonal,
  updateBookProgress,
  updateBookState,
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

const savedLabels: Record<string, string> = {
  state: "Stato di lettura salvato.",
  progress: "Progresso salvato.",
  personal: "Scheda personale salvata.",
  edition: "Edizione selezionata e aggiunta alla tua collezione.",
};

function BookTabs() {
  return (
    <nav className="detail-tabs book-tabs" aria-label="Sezioni libro">
      <a className="active" href="#panoramica">
        Panoramica
      </a>
      <a href="#edizioni">Edizioni</a>
      <a href="#personale">La mia scheda</a>
    </nav>
  );
}

function ReadingProgress({ current, total }: { current: number; total: number }) {
  const percentage =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="book-progress-visual" aria-label={`${percentage}% letto`}>
      <div className="book-progress-track">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div>
        <strong>{percentage}%</strong>
        <span>
          {current} / {total} pagine
        </span>
      </div>
    </div>
  );
}

function DemoBookDetail({ id }: { id: string }) {
  const item = demoBooks.find((book) => book.id === id);
  if (!item) notFound();
  return (
    <main className="page book-detail-page work-detail-v2">
      <Link href="/library/books" className="back-link">
        ← Libri
      </Link>
      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap">
          <DemoCover item={item} />
        </div>
        <div className="work-identity">
          <p className="eyebrow">Libro · demo</p>
          <h1>{item.title}</h1>
          <p className="work-byline">{item.creator}</p>
          <p className="work-description">
            Questa è una scheda dimostrativa. Le opere reali usano stato,
            progresso ed edizioni salvati nel tuo profilo.
          </p>
        </div>
      </section>
    </main>
  );
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; chooseEdition?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!UUID.test(id)) return <DemoBookDetail id={id} />;

  const { profile } = await requireProfile();
  const detail = await getBookDetail(profile.id, id);
  const { work, creators, libraryEntry, progress, editions, ownedEditionIds } =
    detail;
  if (!work) notFound();

  const selectedEdition =
    editions.find((edition) => edition.id === progress?.edition_id) ??
    editions.find((edition) => ownedEditionIds.has(edition.id)) ??
    null;
  const currentPage = progress?.current_page ?? null;
  const totalPages =
    progress?.total_pages ??
    selectedEdition?.page_count ??
    selectedEdition?.total_units ??
    null;
  const percentage =
    progress?.percentage != null
      ? Number(progress.percentage)
      : currentPage !== null && totalPages
        ? Math.min(100, Math.round((currentPage / totalPages) * 1000) / 10)
        : null;
  const status = libraryEntry?.status ?? "PLANNED";
  const statusText = statusLabels[status] ?? "Da iniziare";
  const heroCover = selectedEdition?.cover_url ?? work.cover_url;
  const savedMessage = query.saved ? savedLabels[query.saved] : null;

  const sortedEditions = [...editions].sort((a, b) => {
    const score = (edition: (typeof editions)[number]) =>
      (edition.id === selectedEdition?.id ? 1000 : 0) +
      (ownedEditionIds.has(edition.id) ? 500 : 0) +
      (edition.language === "Italiano" ? 200 : 0) +
      (edition.is_canonical ? 100 : 0) +
      (edition.cover_url ? 20 : 0) +
      (edition.page_count ? 10 : 0);
    return score(b) - score(a);
  });

  return (
    <main className="page book-detail-page work-detail-v2">
      <Link href="/library/books" className="back-link">
        ← Libri
      </Link>

      {savedMessage ? (
        <div className="catalog-notice">
          <CheckCircle2 size={20} />
          <div>
            <strong>{savedMessage}</strong>
          </div>
        </div>
      ) : null}

      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap">
          {heroCover ? (
            <div className="book-real-cover">
              <Image
                src={heroCover}
                alt={`Copertina di ${work.title}`}
                width={500}
                height={750}
                sizes="(max-width: 640px) 55vw, 260px"
                priority
              />
            </div>
          ) : (
            <div className="book-real-cover fallback">
              <span>{work.title}</span>
              <small>{creators[0] ?? "Autore da verificare"}</small>
            </div>
          )}
          <span
            className={`round-favorite ${libraryEntry?.favorite ? "active" : ""}`}
            aria-label="Preferito"
          >
            <Heart
              size={18}
              fill={libraryEntry?.favorite ? "currentColor" : "none"}
            />
          </span>
        </div>
        <div className="work-identity">
          <p className="eyebrow">Libro</p>
          <h1>{work.title}</h1>
          {work.original_title ? (
            <p className="work-original">{work.original_title}</p>
          ) : null}
          <p className="work-byline">
            {creators.join(", ") || "Autore da verificare"}
            {work.release_year ? ` · ${work.release_year}` : ""}
          </p>
          {work.genres?.length ? (
            <div className="meta-pills">
              {work.genres.slice(0, 4).map((genre: string) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          ) : null}
          <p className="work-description">
            {work.description || "Descrizione non ancora disponibile."}
          </p>
        </div>
      </section>

      <section
        className="personal-dashboard book-personal-dashboard"
        id="personale"
      >
        <div className="personal-dashboard-head">
          <div>
            <span className="eyebrow">La mia scheda</span>
            <h2>{work.title} nella mia libreria</h2>
          </div>
          <WishlistToggle
            profileId={profile.id}
            workId={work.id}
            returnPath={`/library/books/${work.id}`}
          />
        </div>

        <div className="personal-metrics book-personal-metrics">
          <div>
            <span>Stato</span>
            <strong>{statusText}</strong>
            <small>Stato personale</small>
          </div>
          <div>
            <span>Progresso</span>
            <strong>{currentPage !== null ? `Pag. ${currentPage}` : "—"}</strong>
            <small>
              {percentage !== null ? `${percentage}% letto` : "Nessun progresso"}
            </small>
          </div>
          <div>
            <span>Edizione selezionata</span>
            <strong>{selectedEdition?.name || "Da scegliere"}</strong>
            <small>
              {[selectedEdition?.publisher, selectedEdition?.language]
                .filter(Boolean)
                .join(" · ") || "Scegli la versione che possiedi"}
            </small>
          </div>
          <div>
            <span>Il mio voto</span>
            <strong>
              {libraryEntry?.rating ?? "—"}
              {libraryEntry?.rating ? (
                <>
                  <span> </span>
                  <Star size={15} fill="currentColor" />
                </>
              ) : null}
            </strong>
            <small>Personale</small>
          </div>
        </div>

        {currentPage !== null && totalPages ? (
          <ReadingProgress current={currentPage} total={totalPages} />
        ) : null}

        <div className="book-edit-grid">
          <form action={updateBookState} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <label>
              Stato
              <select name="status" defaultValue={status}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="soft-action">
              Salva stato
            </button>
          </form>

          <form action={updateBookProgress} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <input
              type="hidden"
              name="editionId"
              value={selectedEdition?.id ?? ""}
            />
            <label>
              Pagina attuale
              <input
                name="currentPage"
                type="number"
                min="0"
                max={totalPages ?? undefined}
                defaultValue={currentPage ?? ""}
              />
            </label>
            <label>
              Pagine edizione
              <input
                name="totalPages"
                type="number"
                min="1"
                defaultValue={totalPages ?? ""}
              />
            </label>
            <button type="submit" className="soft-action">
              Salva progresso
            </button>
          </form>

          <form action={updateBookPersonal} className="mini-edit-form wide">
            <input type="hidden" name="workId" value={work.id} />
            <label className="check-line">
              <input
                name="favorite"
                type="checkbox"
                defaultChecked={Boolean(libraryEntry?.favorite)}
              />{" "}
              Preferito
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
              />
            </label>
            <label className="wide-field">
              Note
              <textarea name="notes" defaultValue={libraryEntry?.notes ?? ""} />
            </label>
            <button type="submit" className="soft-action">
              Salva scheda
            </button>
          </form>
        </div>
      </section>

      <BookTabs />

      <section
        id="panoramica"
        className="detail-section overview-grid book-overview-grid"
      >
        <article className="overview-card book-facts-card">
          <span className="eyebrow">Opera</span>
          <h2>Panoramica</h2>
          <dl>
            <div>
              <dt>Autore</dt>
              <dd>{creators.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Prima pubblicazione</dt>
              <dd>{work.release_year ?? "—"}</dd>
            </div>
            <div>
              <dt>Stato editoriale</dt>
              <dd>
                {work.publication_status === "COMPLETED"
                  ? "Completa"
                  : work.publication_status === "ONGOING"
                    ? "In pubblicazione"
                    : "Da verificare"}
              </dd>
            </div>
            <div>
              <dt>Generi</dt>
              <dd>{work.genres?.join(", ") || "—"}</dd>
            </div>
          </dl>
        </article>
        <article className="overview-card note-preview book-note-preview">
          <StickyNote size={20} />
          <span className="eyebrow">Le mie note</span>
          <p>{libraryEntry?.notes || "Nessuna nota personale."}</p>
        </article>
      </section>

      <section id="edizioni" className="detail-section book-editions-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Edizioni</span>
            <h2>Scegli la tua versione di {work.title}</h2>
          </div>
          <span>{ownedEditionIds.size} possedute</span>
        </div>

        {query.chooseEdition === "1" || !selectedEdition ? (
          <div className="catalog-notice">
            <div>
              <strong>Scegli l'edizione che possiedi.</strong>
              <p>
                La scelta imposta copertina, editore, ISBN e numero di pagine
                della tua copia. Le edizioni italiane sono mostrate per prime.
              </p>
            </div>
          </div>
        ) : null}

        <p className="subtitle detail-explainer">
          L'opera resta unica, ma puoi possedere più edizioni. Quella selezionata
          è la versione usata per il progresso di lettura.
        </p>

        {sortedEditions.length ? (
          <div className="book-edition-grid">
            {sortedEditions.map((edition) => {
              const owned = ownedEditionIds.has(edition.id);
              const selected = edition.id === selectedEdition?.id;
              return (
                <article
                  key={edition.id}
                  className={`book-edition-card ${owned ? "owned" : ""} ${selected ? "selected" : ""}`}
                >
                  <div className="edition-book-mini">
                    {edition.cover_url ? (
                      <Image
                        src={edition.cover_url}
                        alt={`Copertina ${edition.name}`}
                        width={240}
                        height={360}
                        sizes="120px"
                      />
                    ) : (
                      <span>{edition.name || work.title}</span>
                    )}
                  </div>
                  <div className="book-edition-copy">
                    {selected ? (
                      <span className="edition-badge">Edizione selezionata</span>
                    ) : owned ? (
                      <span className="edition-badge">Posseduta</span>
                    ) : null}
                    <h3>{edition.name}</h3>
                    <p>
                      {[edition.publisher, edition.language, edition.format]
                        .filter(Boolean)
                        .join(" · ") || "Dati da arricchire"}
                    </p>
                    <dl>
                      <div>
                        <dt>Pagine</dt>
                        <dd>{edition.page_count ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>ISBN</dt>
                        <dd>{edition.isbn13 || edition.isbn10 || "—"}</dd>
                      </div>
                    </dl>
                    <form action={chooseBookEdition}>
                      <input type="hidden" name="workId" value={work.id} />
                      <input type="hidden" name="editionId" value={edition.id} />
                      <button
                        type="submit"
                        className="soft-action"
                        disabled={selected}
                      >
                        {selected
                          ? "Edizione in uso"
                          : owned
                            ? "Usa questa edizione"
                            : "Scegli questa edizione"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="catalog-notice">
            <div>
              <strong>Nessuna edizione ancora collegata.</strong>
              <p>
                L'opera resta nella libreria, ma il catalogo non ha restituito
                versioni selezionabili.
              </p>
            </div>
          </div>
        )}
      </section>

      {libraryEntry ? (
        <section className="detail-section">
          <div className="catalog-notice">
            <div>
              <strong>Gestione libreria</strong>
              <p>
                Rimuovere il libro cancella solo i tuoi dati personali di stato,
                progresso e possesso. L'opera resta nel catalogo condiviso.
              </p>
              <BookDeleteForm workId={work.id} title={work.title} />
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
