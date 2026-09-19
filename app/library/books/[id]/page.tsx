/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Heart, RefreshCw, Search, Star, StickyNote } from "lucide-react";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import {
  getBookDetail,
  type EditionRow,
  type OwnershipEditionRow,
} from "@/lib/repositories/library";
import { demoBooks } from "@/lib/demo-data";
import { DemoCover } from "@/components/demo-cover";
import { WishlistToggle } from "@/components/wishlist-toggle";
import { BookDeleteForm } from "@/components/book-delete-form";
import { PersonalBookEditionForm } from "@/components/personal-book-edition-form";
import { BookCoverField } from "@/components/book-cover-field";
import {
  chooseBookEdition,
  refreshBookCatalogEditions,
  updateBookEditionDetails,
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
  editionDetails: "Dati della tua edizione aggiornati.",
  personalEdition: "La tua edizione personale è stata aggiunta.",
  catalog: "Catalogo edizioni aggiornato. Ora stai vedendo molte più versioni disponibili.",
  catalogMissing: "Questo libro non ha un collegamento Open Library aggiornabile. Puoi comunque inserire la tua edizione manualmente.",
};

function BookTabs() {
  return (
    <nav className="detail-tabs book-tabs" aria-label="Sezioni libro">
      <a className="active" href="#panoramica">Panoramica</a>
      <a href="#edizioni">Edizioni</a>
      <a href="#personale">La mia scheda</a>
    </nav>
  );
}

function ReadingProgress({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="book-progress-visual" aria-label={`${percentage}% letto`}>
      <div className="book-progress-track"><span style={{ width: `${percentage}%` }} /></div>
      <div><strong>{percentage}%</strong><span>{current} / {total} pagine</span></div>
    </div>
  );
}

function DemoBookDetail({ id }: { id: string }) {
  const item = demoBooks.find((book) => book.id === id);
  if (!item) notFound();
  return (
    <main className="page book-detail-page work-detail-v2">
      <div className="book-detail-topbar">
        <Link href="/library/books" className="back-link">← Libri</Link>
        <Link href="/library/add?type=book" className="soft-action add-another-book-link">＋ Aggiungi libro</Link>
      </div>
      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap"><DemoCover item={item} /></div>
        <div className="work-identity">
          <p className="eyebrow">Libro · demo</p>
          <h1>{item.title}</h1>
          <p className="work-byline">{item.creator}</p>
          <p className="work-description">Questa è una scheda dimostrativa. Le opere reali usano stato, progresso ed edizioni salvati nel tuo profilo.</p>
        </div>
      </section>
    </main>
  );
}

function editionView(edition: EditionRow, personal?: OwnershipEditionRow) {
  return {
    name: personal?.custom_name || edition.name,
    publisher: personal?.custom_publisher || edition.publisher,
    language: personal?.custom_language || edition.language,
    format: personal?.custom_format || edition.format,
    coverUrl: personal?.custom_cover_url || edition.cover_url || null,
    pageCount: personal?.custom_page_count || edition.page_count || edition.total_units || null,
    isbn: personal?.custom_isbn || edition.isbn13 || edition.isbn10 || null,
    publicationYear: personal?.custom_publication_year || edition.publication_year || null,
    customized: Boolean(
      personal?.custom_name || personal?.custom_publisher || personal?.custom_language ||
      personal?.custom_format || personal?.custom_cover_url || personal?.custom_page_count ||
      personal?.custom_isbn || personal?.custom_publication_year,
    ),
  };
}

function EditionFields({
  workId,
  edition,
  personal,
  author,
  canEditAuthor,
}: {
  workId: string;
  edition: EditionRow;
  personal?: OwnershipEditionRow;
  author: string;
  canEditAuthor: boolean;
}) {
  const current = editionView(edition, personal);
  return (
    <form action={updateBookEditionDetails} className="edition-personal-form">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="editionId" value={edition.id} />
      <BookCoverField defaultValue={personal?.custom_cover_url ?? ""} />
      <details className="optional-edition-fields">
        <summary>Modifica altri dati <span>facoltativo</span></summary>
        <div className="edition-personal-grid">
          <label>Nome / tipo edizione<input name="customName" defaultValue={personal?.custom_name ?? ""} placeholder={current.name ?? "Es. Oscar, illustrata, prima edizione…"} /></label>
          {canEditAuthor ? <label>Autore<input name="customAuthor" defaultValue={author} placeholder="Es. Mark Z. Danielewski" /></label> : null}
          <label>Editore<input name="customPublisher" defaultValue={personal?.custom_publisher ?? ""} placeholder={current.publisher ?? "Editore"} /></label>
          <label>Lingua<input name="customLanguage" defaultValue={personal?.custom_language ?? ""} placeholder={current.language ?? "Lingua"} /></label>
          <label>Formato<input name="customFormat" defaultValue={personal?.custom_format ?? ""} placeholder={current.format ?? "Brossura, rilegato, eBook…"} /></label>
          <label>Pagine<input name="customPageCount" type="number" min="1" defaultValue={personal?.custom_page_count ?? ""} placeholder={current.pageCount ? String(current.pageCount) : "Pagine"} /></label>
          <label>ISBN<input name="customIsbn" defaultValue={personal?.custom_isbn ?? ""} placeholder={current.isbn ?? "ISBN"} /></label>
          <label>Anno<input name="customPublicationYear" type="number" min="1000" max="9999" defaultValue={personal?.custom_publication_year ?? ""} placeholder={current.publicationYear ? String(current.publicationYear) : "Anno"} /></label>
        </div>
      </details>
      <button type="submit" className="primary-btn edition-save-button">Salva modifiche</button>
    </form>
  );
}

function normalizeEditionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; chooseEdition?: string; editionQ?: string; editionPage?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  if (!UUID.test(id)) return <DemoBookDetail id={id} />;

  const { profile } = await requireProfile();
  const [detail, sourceResult] = await Promise.all([
    getBookDetail(profile.id, id),
    query<{ manual: boolean; catalog: boolean }>(
      `select
         exists(select 1 from external_ids where work_id=$1 and provider='MANUAL') as manual,
         exists(select 1 from external_ids where work_id=$1 and provider='OPEN_LIBRARY') as catalog`,
      [id],
    ),
  ]);
  const {
    work,
    creators,
    libraryEntry,
    progress,
    editions,
    ownedEditionIds,
    ownershipByEdition,
  } = detail;
  if (!work) notFound();

  const canEditManualAuthor = Boolean(
    sourceResult.rows[0]?.manual && !sourceResult.rows[0]?.catalog,
  );
  const authorValue = creators.join(", ");

  const selectedEdition =
    editions.find((edition) => edition.id === progress?.edition_id) ??
    editions.find((edition) => ownedEditionIds.has(edition.id)) ??
    null;
  const selectedPersonal = selectedEdition ? ownershipByEdition.get(selectedEdition.id) : undefined;
  const selectedView = selectedEdition ? editionView(selectedEdition, selectedPersonal) : null;
  const currentPage = progress?.current_page ?? null;
  const totalPages = progress?.total_pages ?? selectedView?.pageCount ?? null;
  const percentage =
    progress?.percentage != null
      ? Number(progress.percentage)
      : currentPage !== null && totalPages
        ? Math.min(100, Math.round((currentPage / totalPages) * 1000) / 10)
        : null;
  const status = libraryEntry?.status ?? "PLANNED";
  const statusText = statusLabels[status] ?? "Da iniziare";
  const heroCover = selectedView?.coverUrl ?? work.cover_url;
  const savedMessage = queryParams.saved ? savedLabels[queryParams.saved] : null;

  const sortedEditions = [...editions].sort((a, b) => {
    const score = (edition: EditionRow) =>
      (edition.id === selectedEdition?.id ? 1000 : 0) +
      (ownedEditionIds.has(edition.id) ? 500 : 0) +
      (edition.language === "Italiano" ? 200 : 0) +
      (edition.is_canonical ? 100 : 0) +
      (edition.cover_url ? 20 : 0) +
      (edition.page_count ? 10 : 0);
    return score(b) - score(a);
  });

  const editionQuery = normalizeEditionSearch(queryParams.editionQ ?? "");
  const visibleEditions = editionQuery
    ? sortedEditions.filter((edition) => {
        const personal = ownershipByEdition.get(edition.id);
        const view = editionView(edition, personal);
        return normalizeEditionSearch(
          [
            view.name,
            view.publisher,
            view.language,
            view.format,
            view.isbn,
            view.publicationYear,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(editionQuery);
      })
    : sortedEditions;

  const editionPages = Math.max(1, Math.ceil(visibleEditions.length / 24));
  const editionPage = Math.min(editionPages, Math.max(1, Number.parseInt(queryParams.editionPage ?? "1", 10) || 1));
  const pagedEditions = visibleEditions.slice((editionPage - 1) * 24, editionPage * 24);
  const pageHref = (page: number) => `/library/books/${work.id}?${new URLSearchParams({ editionQ: queryParams.editionQ ?? "", editionPage: String(page) })}#edizioni`;
  return (
    <main className="page book-detail-page work-detail-v2">
      <div className="book-detail-topbar">
        <Link href="/library/books" className="back-link">← Libri</Link>
        <Link href="/library/add?type=book" className="soft-action add-another-book-link">＋ Aggiungi libro</Link>
      </div>

      {savedMessage ? (
        <div className="catalog-notice saved-notice">
          <CheckCircle2 size={20} />
          <div>
            <strong>{savedMessage}</strong>
            {queryParams.saved === "edition" || queryParams.saved === "personalEdition" ? (
              <Link className="saved-add-another" href="/library/add?type=book">Aggiungi un altro libro →</Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap">
          {heroCover ? (
            <div className="book-real-cover"><img src={heroCover} alt={`Copertina di ${work.title}`} /></div>
          ) : (
            <div className="book-real-cover fallback"><span>{work.title}</span><small>{creators[0] ?? "Autore da verificare"}</small></div>
          )}
          <span className={`round-favorite ${libraryEntry?.favorite ? "active" : ""}`} aria-label="Preferito">
            <Heart size={18} fill={libraryEntry?.favorite ? "currentColor" : "none"} />
          </span>
        </div>
        <div className="work-identity">
          <p className="eyebrow">Libro</p>
          <h1>{work.title}</h1>
          {work.original_title ? <p className="work-original">{work.original_title}</p> : null}
          <p className="work-byline">{creators.join(", ") || "Autore da verificare"}{work.release_year ? ` · ${work.release_year}` : ""}</p>
          {work.genres?.length ? <div className="meta-pills">{work.genres.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}</div> : null}
          <p className="work-description">{work.description || "Descrizione non ancora disponibile."}</p>
        </div>
      </section>

      <section className="personal-dashboard book-personal-dashboard" id="personale">
        <div className="personal-dashboard-head">
          <div><span className="eyebrow">La mia scheda</span><h2>{work.title} nella mia libreria</h2></div>
          <WishlistToggle profileId={profile.id} workId={work.id} returnPath={`/library/books/${work.id}`} />
        </div>

        <div className="personal-metrics book-personal-metrics">
          <div><span>Stato</span><strong>{statusText}</strong><small>Stato personale</small></div>
          <div><span>Progresso</span><strong>{currentPage !== null ? `Pag. ${currentPage}` : "—"}</strong><small>{percentage !== null ? `${percentage}% letto` : "Nessun progresso"}</small></div>
          <div><span>Edizione selezionata</span><strong>{selectedView?.name || "Da scegliere"}</strong><small>{[selectedView?.publisher, selectedView?.language].filter(Boolean).join(" · ") || "Scegli la versione che possiedi"}</small></div>
          <div><span>Il mio voto</span><strong>{libraryEntry?.rating ?? "—"}{libraryEntry?.rating ? <><span> </span><Star size={15} fill="currentColor" /></> : null}</strong><small>Personale</small></div>
        </div>

        {currentPage !== null && totalPages ? <ReadingProgress current={currentPage} total={totalPages} /> : null}

        <div className="book-edit-grid">
          <form action={updateBookState} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <label>Stato<select name="status" defaultValue={status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button type="submit" className="soft-action">Salva stato</button>
          </form>

          <form action={updateBookProgress} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <input type="hidden" name="editionId" value={selectedEdition?.id ?? ""} />
            <label>Pagina attuale<input name="currentPage" type="number" min="0" max={totalPages ?? undefined} defaultValue={currentPage ?? ""} /></label>
            <label>Pagine edizione<input name="totalPages" type="number" min="1" defaultValue={totalPages ?? ""} /></label>
            <button type="submit" className="soft-action">Salva progresso</button>
          </form>

          <form action={updateBookPersonal} className="mini-edit-form wide">
            <input type="hidden" name="workId" value={work.id} />
            <label className="check-line"><input name="favorite" type="checkbox" defaultChecked={Boolean(libraryEntry?.favorite)} /> Preferito</label>
            <label>Voto<input name="rating" type="number" min="0" max="10" step="0.5" defaultValue={libraryEntry?.rating ?? ""} /></label>
            <label className="wide-field">Note<textarea name="notes" defaultValue={libraryEntry?.notes ?? ""} /></label>
            <button type="submit" className="soft-action">Salva scheda</button>
          </form>
        </div>
      </section>

      <BookTabs />

      <section id="panoramica" className="detail-section overview-grid book-overview-grid">
        <article className="overview-card book-facts-card">
          <span className="eyebrow">Opera</span><h2>Panoramica</h2>
          <dl>
            <div><dt>Autore</dt><dd>{creators.join(", ") || "—"}</dd></div>
            <div><dt>Prima pubblicazione</dt><dd>{work.release_year ?? "—"}</dd></div>
            <div><dt>Stato editoriale</dt><dd>{work.publication_status === "COMPLETED" ? "Completa" : work.publication_status === "ONGOING" ? "In pubblicazione" : "Da verificare"}</dd></div>
            <div><dt>Generi</dt><dd>{work.genres?.join(", ") || "—"}</dd></div>
          </dl>
        </article>
        <article className="overview-card note-preview book-note-preview"><StickyNote size={20} /><span className="eyebrow">Le mie note</span><p>{libraryEntry?.notes || "Nessuna nota personale."}</p></article>
      </section>

      <section id="edizioni" className="detail-section book-editions-stage">
        <div className="section-heading detail-heading">
          <div><span className="eyebrow">Edizioni</span><h2>Scegli o correggi la tua versione</h2></div>
          <span>{visibleEditions.length}{editionQuery ? ` di ${sortedEditions.length}` : ""} edizioni</span>
        </div>

        {queryParams.chooseEdition === "1" || !selectedEdition ? (
          <div className="catalog-notice"><div><strong>Scegli l'edizione che possiedi.</strong><p>Se la trovi, basta un tocco. Se non la trovi, puoi creare la tua copia anche inserendo soltanto la copertina e completare i dati più tardi.</p></div></div>
        ) : null}

        <div className="edition-catalog-tools">
          <form action={refreshBookCatalogEditions}>
            <input type="hidden" name="workId" value={work.id} />
            <button type="submit" className="soft-action edition-refresh-button"><RefreshCw size={16} /> Aggiorna catalogo</button>
          </form>
          <form method="get" className="edition-search-form">
            <Search size={17} />
            <input name="editionQ" defaultValue={queryParams.editionQ ?? ""} placeholder="Filtra edizioni caricate: editore, ISBN, anno…" />
            <button type="submit" className="soft-action">Filtra</button>
            {editionQuery ? <Link href={`/library/books/${work.id}#edizioni`} className="edition-clear-link">Azzera</Link> : null}
          </form>
        </div>

        <details className="manual-edition-panel">
          <summary>Non trovi la tua? Crea la tua copia</summary>
          <PersonalBookEditionForm workId={work.id} title={work.title} author={authorValue} canEditAuthor={canEditManualAuthor} />
        </details>

        <p className="subtitle detail-explainer">Il catalogo è solo il punto di partenza: la tua copia può avere copertina e dati personali senza modificare quelli degli altri utenti.</p>

        {visibleEditions.length ? (
          <div className="book-edition-grid">
            {pagedEditions.map((edition) => {
              const owned = ownedEditionIds.has(edition.id);
              const selected = edition.id === selectedEdition?.id;
              const personal = ownershipByEdition.get(edition.id);
              const view = editionView(edition, personal);
              return (
                <article key={edition.id} className={`book-edition-card ${owned ? "owned" : ""} ${selected ? "selected" : ""}`}>
                  <div className="edition-book-mini">
                    {view.coverUrl ? <img loading="lazy" decoding="async" src={view.coverUrl} alt={`Copertina ${view.name}`} /> : <span>{view.name || work.title}</span>}
                  </div>
                  <div className="book-edition-copy">
                    <div className="edition-badge-row">
                      {selected ? <span className="edition-badge">Edizione in uso</span> : owned ? <span className="edition-badge">Posseduta</span> : null}
                      {view.customized ? <span className="edition-badge subtle">Dati personali</span> : null}
                    </div>
                    <h3>{view.name}</h3>
                    <p>{[view.publisher, view.language, view.format].filter(Boolean).join(" · ") || "Dati da arricchire"}</p>
                    <dl>
                      <div><dt>Pagine</dt><dd>{view.pageCount ?? "—"}</dd></div>
                      <div><dt>ISBN</dt><dd>{view.isbn || "—"}</dd></div>
                      <div><dt>Anno</dt><dd>{view.publicationYear ?? "—"}</dd></div>
                    </dl>
                    <form action={chooseBookEdition}>
                      <input type="hidden" name="workId" value={work.id} />
                      <input type="hidden" name="editionId" value={edition.id} />
                      <button type="submit" className="soft-action" disabled={selected}>{selected ? "Edizione in uso" : owned ? "Usa questa edizione" : "Scegli questa edizione"}</button>
                    </form>
                    {owned || selected ? (
                      <details className="edition-edit-details">
                        <summary>Correggi copertina o dati</summary>
                        <EditionFields
                          workId={work.id}
                          edition={edition}
                          personal={personal}
                          author={authorValue}
                          canEditAuthor={canEditManualAuthor}
                        />
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="catalog-notice"><div><strong>Nessuna edizione corrisponde alla ricerca.</strong><p>Prova un editore, l'ISBN oppure usa “Aggiorna catalogo”. Se manca ancora, puoi creare la tua copia e partire anche dalla sola copertina.</p></div></div>
        )}
        {editionPages > 1 ? <nav className="edition-catalog-tools" aria-label="Pagine delle edizioni">
          {editionPage > 1 ? <Link className="soft-action" href={pageHref(editionPage - 1)}>Precedenti</Link> : null}
          <span>Pagina {editionPage} di {editionPages}</span>
          {editionPage < editionPages ? <Link className="soft-action" href={pageHref(editionPage + 1)}>Altre edizioni</Link> : null}
        </nav> : null}
      </section>

      {libraryEntry ? (
        <section className="detail-section danger-zone">
          <div className="catalog-notice">
            <div><strong>Gestione libreria</strong><p>Rimuovere il libro cancella solo stato, progresso e copie possedute dal tuo profilo. L'opera catalogo resta disponibile.</p><BookDeleteForm workId={work.id} title={work.title} /></div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
