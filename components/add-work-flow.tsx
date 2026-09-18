"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  Film,
  LibraryBig,
  LoaderCircle,
  PenLine,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import type {
  AnimeCatalogResult,
  BookCatalogResult,
  MangaCatalogResult,
} from "@/lib/catalog/types";
import { IsbnPhotoSearch } from "@/components/isbn-photo-search";
import { ManualWorkCover } from "@/components/manual-work-cover";

export type AddWorkType = "book" | "manga" | "anime";
type EntryMode = "catalog" | "manual";
type Result = BookCatalogResult | MangaCatalogResult | AnimeCatalogResult;

const typeMeta = {
  book: {
    label: "Libro",
    icon: BookOpen,
    placeholder: "Titolo, autore o ISBN…",
    hint: "Cerchiamo prima l'edizione nei cataloghi e diamo priorità ai risultati italiani.",
    provider: "Open Library · ricerca edizioni italiane",
  },
  manga: {
    label: "Manga",
    icon: LibraryBig,
    placeholder: "Titolo italiano, inglese, originale o autore…",
    hint: "Cerchiamo la stessa opera su più cataloghi e uniamo i risultati.",
    provider: "MyAnimeList/Jikan + Kitsu",
  },
  anime: {
    label: "Anime",
    icon: Film,
    placeholder: "Cerca Vinland Saga, Monster, Pluto…",
    hint: "Cerchiamo prima la serie nel catalogo per recuperare copertina, stagioni ed episodi.",
    provider: "TVmaze",
  },
} as const;

function statusLabel(status: Result["publicationStatus"]) {
  if (status === "ONGOING") return "In corso";
  if (status === "COMPLETED") return "Completo";
  if (status === "HIATUS") return "In pausa";
  return "Catalogo";
}

function resultSubtitle(result: Result, type: AddWorkType) {
  if (type === "book") {
    const book = result as BookCatalogResult;
    return book.creators.map((creator) => creator.name).join(" · ") || "Autore non disponibile";
  }
  if (type === "manga") {
    const manga = result as MangaCatalogResult;
    return manga.creators.map((creator) => creator.name).join(" · ") || "Autore non disponibile";
  }
  const anime = result as AnimeCatalogResult;
  return [anime.network, anime.language].filter(Boolean).join(" · ") || "Serie anime";
}

function facts(result: Result, type: AddWorkType) {
  if (type === "book") {
    const book = result as BookCatalogResult;
    const edition = book.matchedEdition;
    return [
      edition?.language,
      edition?.publisher,
      edition?.isbn13
        ? `ISBN ${edition.isbn13}`
        : edition?.isbn10
          ? `ISBN ${edition.isbn10}`
          : null,
      book.editionCount ? `${book.editionCount} edizioni` : book.releaseYear,
    ]
      .filter(Boolean)
      .map(String);
  }

  if (type === "manga") {
    const manga = result as MangaCatalogResult;
    return [
      manga.volumeCount ? `${manga.volumeCount} volumi` : "Volumi da verificare",
      manga.chapterCount ? `${manga.chapterCount} capitoli` : null,
      manga.releaseYear,
    ]
      .filter(Boolean)
      .map(String);
  }

  const anime = result as AnimeCatalogResult;
  return [
    anime.seasonCount ? `${anime.seasonCount} stagioni` : null,
    anime.episodeCount ? `${anime.episodeCount} episodi` : null,
    anime.releaseYear,
    anime.network,
  ]
    .filter(Boolean)
    .map(String);
}

function positiveInteger(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function AddWorkFlow({
  initialType = "manga",
}: {
  initialType?: AddWorkType;
}) {
  const router = useRouter();
  const searchRequest = useRef<AbortController | null>(null);
  const saving = useRef(false);

  const [type, setType] = useState<AddWorkType>(initialType);
  const [entryMode, setEntryMode] = useState<EntryMode>("catalog");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualTotalVolumes, setManualTotalVolumes] = useState("");
  const [manualTotalSeasons, setManualTotalSeasons] = useState("");
  const [manualTotalEpisodes, setManualTotalEpisodes] = useState("");
  const [manualCoverUrl, setManualCoverUrl] = useState("");
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [coverProcessing, setCoverProcessing] = useState(false);
  const [manualSaving, setManualSaving] = useState<"library" | "wishlist" | null>(null);
  const [keepAdding, setKeepAdding] = useState(false);
  const [saved, setSaved] = useState<{ title: string; href: string } | null>(null);

  useEffect(() => {
    return () => {
      searchRequest.current?.abort();
      searchRequest.current = null;
    };
  }, []);

  function resetManualDraft() {
    setManualTitle("");
    setManualAuthor("");
    setManualTotalVolumes("");
    setManualTotalSeasons("");
    setManualTotalEpisodes("");
    setManualCoverUrl("");
  }

  function hasManualDraft() {
    return Boolean(
      manualTitle.trim() ||
        manualAuthor.trim() ||
        manualTotalVolumes.trim() ||
        manualTotalSeasons.trim() ||
        manualTotalEpisodes.trim() ||
        manualCoverUrl.trim(),
    );
  }

  function completeSave(workId: string, placement: string, title: string) {
    const href =
      placement === "wishlist"
        ? "/library/wishlist"
        : type === "book"
          ? `/library/books/${workId}?chooseEdition=1#edizioni`
          : `/library/${type === "anime" ? "anime" : "manga"}/${workId}`;

    if (!keepAdding) {
      router.push(href);
      return;
    }

    setSaved({ title, href });
    setEntryMode("catalog");
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
    resetManualDraft();
  }

  function switchType(next: AddWorkType) {
    if (saving.current || coverProcessing || photoProcessing || next === type) return;
    if (
      hasManualDraft() &&
      !window.confirm(
        "Cambiare tipo di opera? I dati non ancora salvati, inclusa la copertina, verranno cancellati.",
      )
    ) {
      return;
    }

    searchRequest.current?.abort();
    searchRequest.current = null;
    setLoading(false);
    setSaved(null);
    setType(next);
    setEntryMode("catalog");
    setQuery("");
    setResults([]);
    setError(null);
    setSearched(false);
    setImporting(null);
    setManualSaving(null);
    resetManualDraft();
  }

  function openManualEntry() {
    if (saving.current || coverProcessing || photoProcessing) return;
    const pending = searchRequest.current;
    searchRequest.current = null;
    pending?.abort();
    setLoading(false);
    setError(null);
    setManualTitle((title) => title || query.trim());
    setEntryMode("manual");
  }

  function backToSearch() {
    if (saving.current || coverProcessing || photoProcessing) return;
    setEntryMode("catalog");
    setError(null);
    setResults([]);
    setSearched(false);
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || coverProcessing || photoProcessing) return;

    const normalized = query.trim();
    if (normalized.length < 2) return;

    setError(null);
    setSaved(null);
    setSearched(true);
    setLoading(true);
    setResults([]);

    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        `/api/catalog/${type}/search?q=${encodeURIComponent(normalized)}`,
        { signal: controller.signal },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Ricerca non disponibile.");
      }

      if (searchRequest.current !== controller) return;

      const nextResults = (payload.results ?? []) as Result[];
      setResults(nextResults);
      if (nextResults.length === 0) {
        setManualTitle(normalized);
        setEntryMode("manual");
      }
    } catch (caught) {
      if (searchRequest.current !== controller) return;
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("La ricerca sta impiegando troppo tempo. Riprova tra poco.");
      } else {
        setError(caught instanceof Error ? caught.message : "Ricerca non disponibile.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (searchRequest.current === controller) {
        searchRequest.current = null;
        setLoading(false);
      }
    }
  }

  async function importWork(
    result: Result,
    destination: "library" | "wishlist",
  ) {
    if (saving.current || coverProcessing || photoProcessing) return;
    saving.current = true;
    setSaved(null);

    const importKey = `${result.provider}:${result.providerId}:${destination}`;
    setImporting(importKey);
    setError(null);

    try {
      const response = await fetch(`/api/catalog/${type}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: result.providerId,
          provider: result.provider,
          destination,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Import non riuscito.");
      }

      completeSave(payload.workId, payload.placement, result.title);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import non riuscito.");
    } finally {
      saving.current = false;
      setImporting(null);
    }
  }

  async function addManualWork(destination: "library" | "wishlist") {
    const title = manualTitle.trim();
    if (!title) return;

    const totalVolumes = positiveInteger(manualTotalVolumes);
    const totalSeasons = positiveInteger(manualTotalSeasons);
    const totalEpisodes = positiveInteger(manualTotalEpisodes);

    if (type === "manga" && totalVolumes === null) {
      setError("Il numero di volumi deve essere un numero intero maggiore di zero.");
      return;
    }
    if (type === "anime" && (totalSeasons === null || totalEpisodes === null)) {
      setError("Stagioni ed episodi, se inseriti, devono essere numeri interi maggiori di zero.");
      return;
    }

    if (saving.current || coverProcessing || photoProcessing) return;
    saving.current = true;
    setSaved(null);
    setManualSaving(destination);
    setError(null);

    try {
      const response = await fetch(`/api/catalog/${type}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author: type !== "anime" ? manualAuthor.trim() || undefined : undefined,
          studio: type === "anime" ? manualAuthor.trim() || undefined : undefined,
          totalVolumes: type === "manga" ? totalVolumes : undefined,
          totalSeasons: type === "anime" ? totalSeasons : undefined,
          totalEpisodes: type === "anime" ? totalEpisodes : undefined,
          coverUrl: manualCoverUrl.trim() || undefined,
          destination,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Inserimento manuale non riuscito.");
      }

      completeSave(payload.workId, payload.placement, title);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Inserimento manuale non riuscito.",
      );
    } finally {
      saving.current = false;
      setManualSaving(null);
    }
  }

  const meta = typeMeta[type];
  const Icon = meta.icon;
  const isSaving = Boolean(importing || manualSaving || coverProcessing || photoProcessing);
  const manualSubject = type === "book" ? "libro" : type === "anime" ? "anime" : "manga";
  const creatorLabel = type === "anime" ? "Studio / creatore" : "Autore";
  const creatorPlaceholder =
    type === "book"
      ? "Es. Haruki Murakami"
      : type === "anime"
        ? "Es. Madhouse"
        : "Es. Takehiko Inoue";

  return (
    <section className="add-work-flow">
      <div className="add-steps" aria-label="Flusso di aggiunta">
        <span className="active"><b>1</b> Tipologia</span>
        <span className="active"><b>2</b> Ricerca</span>
        <span className={results.length || manualTitle.trim() ? "active" : ""}><b>3</b> Salva</span>
      </div>

      <div className="add-type-grid">
        {(Object.keys(typeMeta) as AddWorkType[]).map((key) => {
          const item = typeMeta[key];
          const ItemIcon = item.icon;
          return (
            <button
              key={key}
              type="button"
              disabled={isSaving}
              onClick={() => switchType(key)}
              className={`add-type-card ${type === key ? "active" : ""}`}
            >
              <ItemIcon size={22} />
              <span>{item.label}</span>
              <small>{key === "book" ? "Libreria" : key === "manga" ? "Scaffali" : "Videoteca"}</small>
            </button>
          );
        })}
      </div>

      {entryMode === "catalog" ? (
        <div className="add-search-stage">
          <div className="add-search-copy">
            <div className="add-search-icon"><Icon size={20} /></div>
            <div>
              <span className="eyebrow">Aggiungi {meta.label.toLowerCase()}</span>
              <h2>Cerca nel catalogo</h2>
              <p>{meta.hint}</p>
            </div>
          </div>

          <form className="catalog-search add-global-search" onSubmit={search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={meta.placeholder}
              autoFocus
              disabled={isSaving}
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={loading || isSaving || query.trim().length < 2}
            >
              {loading ? "Cerco…" : "Cerca"}
            </button>
          </form>
            <button type="button" className="manual-entry-link" onClick={openManualEntry} disabled={isSaving}>Non trovi l’opera? Inseriscila manualmente</button>

          {type === "book" ? (
            <IsbnPhotoSearch
              disabled={isSaving || loading}
              onBusyChange={setPhotoProcessing}
              onDetected={(isbn) => {
                setQuery(isbn);
                setResults([]);
                setSearched(false);
                setError(null);
                setSaved(null);
              }}
            />
          ) : null}
          <div className="provider-note add-provider-note">
            <Sparkles size={16} />
            <span>Fonte: {meta.provider}. Le copertine del catalogo restano quelle reali.</span>
          </div>
        </div>
      ) : (
        <section className="manual-work-entry open manual-fallback-entry">
          <div className="manual-work-entry-head">
            <div className="manual-work-icon"><PenLine size={20} /></div>
            <div>
              <span className="eyebrow">Inserimento manuale</span>
              <strong>Inseriscilo manualmente.</strong>
              <p>
                Basta il titolo. Copertina e dettagli possono essere completati dopo.
              </p>
            </div>
            <button className="secondary-btn manual-back-search" type="button" onClick={backToSearch}>
              <Search size={16} /> Torna alla ricerca
            </button>
          </div>

          <form
            className="manual-work-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addManualWork("library");
            }}
          >
            <div className="manual-work-editor">
              <ManualWorkCover
                value={manualCoverUrl}
                onChange={setManualCoverUrl}
                onBusyChange={setCoverProcessing}
                title={manualTitle}
                disabled={Boolean(manualSaving)}
              />

              <div className="manual-work-fields">
                <label className="manual-primary-field">
                  <span>Titolo {manualSubject} <b>obbligatorio</b></span>
                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder={`Titolo ${manualSubject}`}
                    autoFocus
                    disabled={Boolean(manualSaving)}
                  />
                </label>

                <details className="manual-work-more">
                  <summary>
                    <span>
                      <strong>Altri dettagli</strong>
                      <small>Facoltativi, modificabili in seguito</small>
                    </span>
                    <ChevronDown size={18} />
                  </summary>
                  <div className="manual-work-optional-grid">
                    <label>
                      <span>{creatorLabel} <small>facoltativo</small></span>
                      <input
                        value={manualAuthor}
                        onChange={(event) => setManualAuthor(event.target.value)}
                        placeholder={creatorPlaceholder}
                        disabled={Boolean(manualSaving)}
                      />
                    </label>

                    {type === "manga" ? (
                      <label>
                        <span>Volumi totali <small>facoltativo</small></span>
                        <input
                          value={manualTotalVolumes}
                          onChange={(event) => setManualTotalVolumes(event.target.value)}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          placeholder="Es. 37"
                          disabled={Boolean(manualSaving)}
                        />
                      </label>
                    ) : null}

                    {type === "anime" ? (
                      <>
                        <label>
                          <span>Stagioni <small>facoltativo</small></span>
                          <input
                            value={manualTotalSeasons}
                            onChange={(event) => setManualTotalSeasons(event.target.value)}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            placeholder="Es. 2"
                            disabled={Boolean(manualSaving)}
                          />
                        </label>
                        <label>
                          <span>Episodi <small>facoltativo</small></span>
                          <input
                            value={manualTotalEpisodes}
                            onChange={(event) => setManualTotalEpisodes(event.target.value)}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            placeholder="Es. 24"
                            disabled={Boolean(manualSaving)}
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                </details>

                <div className="manual-work-tip">
                  <Sparkles size={16} />
                  <span>
                    {manualCoverUrl
                      ? "La copertina scelta verrà salvata con l'opera."
                      : "Senza copertina l'opera viene salvata comunque e potrai aggiungerla dopo."}
                  </span>
                </div>
              </div>
            </div>

            <div className="manual-work-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => void addManualWork("wishlist")}
                disabled={Boolean(manualSaving) || coverProcessing || !manualTitle.trim()}
              >
                {manualSaving === "wishlist" ? <LoaderCircle className="spin" size={18} /> : <Bookmark size={18} />}
                Wishlist
              </button>
              <button
                className="primary-btn"
                type="submit"
                disabled={Boolean(manualSaving) || coverProcessing || !manualTitle.trim()}
              >
                {manualSaving === "library" ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                {manualSaving === "library" ? "Aggiungo…" : "Aggiungi alla libreria"}
              </button>
            </div>
          </form>
        </section>
      )}

      <label className="add-keep-adding">
        <input
          type="checkbox"
          checked={keepAdding}
          disabled={isSaving}
          onChange={(event) => setKeepAdding(event.target.checked)}
        />
        <span>
          <strong>Dopo il salvataggio, aggiungi un’altra opera</strong>
          <small>Rimani in questa schermata e riparti con una nuova ricerca.</small>
        </span>
      </label>

      {saved ? (
        <div className="add-save-success" role="status">
          <span>“{saved.title}” salvato.</span>
          <Link href={saved.href}>{type === "book" ? "Apri e scegli l’edizione" : "Apri scheda"}</Link>
        </div>
      ) : null}

      {error ? <p className="catalog-error" role="alert">{error}</p> : null}

      {entryMode === "catalog" ? (
        <div className="catalog-results add-results">
          {results.map((result) => {
            const wishlistKey = `${result.provider}:${result.providerId}:wishlist`;
            const libraryKey = `${result.provider}:${result.providerId}:library`;
            return (
              <article
                className="catalog-result add-result-card"
                key={`${result.provider}-${result.providerId}`}
              >
                <div className="catalog-cover">
                  {result.coverUrl ? (
                    <Image
                      src={result.coverUrl}
                      alt={`Copertina di ${result.title}`}
                      width={120}
                      height={176}
                      sizes="76px"
                      quality={72}
                      loading="lazy"
                    />
                  ) : (
                    <span>{result.title.slice(0, 1)}</span>
                  )}
                </div>

                <div className="catalog-result-copy">
                  <span className="eyebrow">{statusLabel(result.publicationStatus)}</span>
                  <h2>{result.title}</h2>
                  <p>{resultSubtitle(result, type)}</p>
                  <div className="catalog-facts">
                    {facts(result, type).map((fact) => <span key={fact}>{fact}</span>)}
                  </div>
                </div>

                <div className="add-result-actions">
                  <button
                    className="add-result add-to-wishlist"
                    type="button"
                    onClick={() => importWork(result, "wishlist")}
                    disabled={isSaving}
                  >
                    {importing === wishlistKey ? <LoaderCircle className="spin" size={18} /> : <Bookmark size={18} />}
                    <span>{importing === wishlistKey ? "Salvo" : "Wishlist"}</span>
                  </button>
                  <button
                    className="add-result"
                    type="button"
                    onClick={() => importWork(result, "library")}
                    disabled={isSaving}
                  >
                    {importing === libraryKey ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                    <span>
                      {importing === libraryKey ? "Importo" : type === "book" ? "Scegli edizione" : "Libreria"}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <p className="catalog-attribution">
        Manga: MyAnimeList/Jikan e Kitsu. Libri: Open Library. Anime: TVmaze.
        Le fonti restano separate dai tuoi dati personali.
      </p>
    </section>
  );
}
