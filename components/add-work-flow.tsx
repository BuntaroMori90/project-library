"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ManualWorkCover } from "@/components/manual-work-cover";

export type AddWorkType = "book" | "manga" | "anime";
type EntryMode = "catalog" | "manual";
type Result = BookCatalogResult | MangaCatalogResult | AnimeCatalogResult;

const typeMeta = {
  book: {
    label: "Libro",
    icon: BookOpen,
    placeholder: "Titolo, autore o ISBN…",
    hint: "Cerchiamo tra le edizioni e diamo priorità a quelle italiane. La copertina mostrata è quella reale restituita dal catalogo.",
    provider: "Open Library · ricerca edizioni italiane",
  },
  manga: {
    label: "Manga",
    icon: LibraryBig,
    placeholder: "Titolo italiano, inglese, originale o autore…",
    hint: "Cerchiamo la stessa opera su più cataloghi e uniamo i risultati. Variant, speciali o titoli assenti possono essere inseriti manualmente.",
    provider: "MyAnimeList/Jikan + Kitsu",
  },
  anime: {
    label: "Anime",
    icon: Film,
    placeholder: "Cerca Vinland Saga, Monster, Pluto…",
    hint: "Recuperiamo serie, stagioni ed episodi; il tuo progresso resta personale.",
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
  return [anime.releaseYear, anime.genres.slice(0, 2).join(" · ") || null, anime.network]
    .filter(Boolean)
    .map(String);
}

export function AddWorkFlow({
  initialType = "manga",
}: {
  initialType?: AddWorkType;
}) {
  const router = useRouter();
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
  const [manualCoverUrl, setManualCoverUrl] = useState("");
  const [manualSaving, setManualSaving] = useState<"library" | "wishlist" | null>(null);

  function resetManual() {
    setManualTitle("");
    setManualAuthor("");
    setManualTotalVolumes("");
    setManualCoverUrl("");
    setManualSaving(null);
  }

  function switchType(next: AddWorkType) {
    setType(next);
    setEntryMode("catalog");
    setQuery("");
    setResults([]);
    setError(null);
    setSearched(false);
    setImporting(null);
    resetManual();
  }

  function switchEntryMode(next: EntryMode) {
    setEntryMode(next);
    setError(null);
    if (next === "manual" && !manualTitle.trim()) {
      setManualTitle(query.trim());
    }
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) return;

    setError(null);
    setSearched(true);
    setLoading(true);
    setResults([]);

    const controller = new AbortController();
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

      const nextResults = (payload.results ?? []) as Result[];
      setResults(nextResults);
      if ((type === "book" || type === "manga") && nextResults.length === 0) {
        setManualTitle(normalized);
        setEntryMode("manual");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("La ricerca sta impiegando troppo tempo. Puoi riprovare o usare l'inserimento manuale.");
      } else {
        setError(err instanceof Error ? err.message : "Ricerca non disponibile.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function importWork(
    result: Result,
    destination: "library" | "wishlist",
  ) {
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

      if (destination === "wishlist" && payload.placement === "wishlist") {
        router.push("/library/wishlist");
        return;
      }

      if (type === "book") {
        router.push(`/library/books/${payload.workId}?chooseEdition=1#edizioni`);
        return;
      }

      const target = type === "anime" ? "anime" : "manga";
      router.push(`/library/${target}/${payload.workId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import non riuscito.");
    } finally {
      setImporting(null);
    }
  }

  async function addManualWork(destination: "library" | "wishlist") {
    if (type === "anime") return;
    const title = manualTitle.trim();
    if (!title) return;

    const totalVolumes =
      type === "manga" && manualTotalVolumes.trim()
        ? Number(manualTotalVolumes)
        : undefined;

    if (
      type === "manga" &&
      totalVolumes !== undefined &&
      (!Number.isInteger(totalVolumes) || totalVolumes <= 0)
    ) {
      setError("Il numero di volumi deve essere un numero intero maggiore di zero.");
      return;
    }

    setManualSaving(destination);
    setError(null);

    try {
      const response = await fetch(`/api/catalog/${type}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author: manualAuthor.trim() || undefined,
          totalVolumes: type === "manga" ? totalVolumes : undefined,
          coverUrl: manualCoverUrl.trim() || undefined,
          destination,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Inserimento manuale non riuscito.");
      }

      if (destination === "wishlist" && payload.placement === "wishlist") {
        router.push("/library/wishlist");
        return;
      }

      if (type === "book") {
        router.push(`/library/books/${payload.workId}?chooseEdition=1#edizioni`);
      } else if (totalVolumes) {
        router.push(`/library/manga/${payload.workId}#volumi`);
      } else {
        router.push(`/library/manga/${payload.workId}#edizione-personale`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inserimento manuale non riuscito.");
    } finally {
      setManualSaving(null);
    }
  }

  const meta = typeMeta[type];
  const Icon = meta.icon;
  const canInsertManually = type === "book" || type === "manga";

  return (
    <section className="add-work-flow">
      <div className="add-steps" aria-label="Flusso di aggiunta">
        <span className="active"><b>1</b> Tipologia</span>
        <span className="active"><b>2</b> Metodo</span>
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

      {canInsertManually ? (
        <div className="add-mode-grid" aria-label="Metodo di inserimento">
          <button
            type="button"
            className={`add-mode-card ${entryMode === "catalog" ? "active" : ""}`}
            onClick={() => switchEntryMode("catalog")}
          >
            <Search size={19} />
            <span>
              <strong>Cerca nei cataloghi</strong>
              <small>Copertine reali e dati recuperati automaticamente.</small>
            </span>
          </button>
          <button
            type="button"
            className={`add-mode-card ${entryMode === "manual" ? "active" : ""}`}
            onClick={() => switchEntryMode("manual")}
          >
            <PenLine size={19} />
            <span>
              <strong>Inserisci manualmente</strong>
              <small>Per edizioni, variant o titoli non trovati.</small>
            </span>
          </button>
        </div>
      ) : null}

      {entryMode === "catalog" ? (
        <div className="add-search-stage">
          <div className="add-search-copy">
            <div className="add-search-icon"><Icon size={20} /></div>
            <div>
              <span className="eyebrow">Aggiungi {meta.label.toLowerCase()}</span>
              <h2>Trova l&apos;opera giusta.</h2>
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
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={loading || query.trim().length < 2}
            >
              {loading ? "Cerco…" : "Cerca"}
            </button>
          </form>

          <div className="provider-note add-provider-note">
            <Sparkles size={16} />
            <span>
              Fonte: {meta.provider}. Le copertine del catalogo restano quelle reali.
            </span>
          </div>
        </div>
      ) : canInsertManually ? (
        <section className="manual-work-entry open">
          <div className="manual-work-entry-head">
            <div className="manual-work-icon"><PenLine size={20} /></div>
            <div>
              <span className="eyebrow">Inserimento manuale</span>
              <strong>Aggiungi solo quello che conosci.</strong>
              <p>
                Il titolo è l&apos;unico dato obbligatorio. Copertina e dettagli possono essere completati anche dopo.
              </p>
            </div>
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
                title={manualTitle}
              />

              <div className="manual-work-fields">
                <label className="manual-primary-field">
                  <span>Titolo {type === "book" ? "libro" : "manga"} <b>obbligatorio</b></span>
                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder={type === "book" ? "Inserisci il titolo del libro" : "Titolo italiano, originale o quello che conosci"}
                    autoFocus
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
                      <span>Autore <small>facoltativo</small></span>
                      <input
                        value={manualAuthor}
                        onChange={(event) => setManualAuthor(event.target.value)}
                        placeholder={type === "book" ? "Es. Haruki Murakami" : "Es. Takehiko Inoue"}
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
                        />
                        <small>Se lo conosci, prepariamo subito Vol. 1…N.</small>
                      </label>
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
                disabled={Boolean(manualSaving) || !manualTitle.trim()}
              >
                {manualSaving === "wishlist" ? <LoaderCircle className="spin" size={18} /> : <Bookmark size={18} />}
                Wishlist
              </button>
              <button
                className="primary-btn"
                type="submit"
                disabled={Boolean(manualSaving) || !manualTitle.trim()}
              >
                {manualSaving === "library" ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                {manualSaving === "library" ? "Aggiungo…" : "Aggiungi alla libreria"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? <p className="catalog-error">{error}</p> : null}

      {searched && !loading && results.length === 0 && !error && entryMode === "catalog" ? (
        <div className="catalog-empty add-empty-state">
          <strong>Nessun risultato preciso.</strong>
          <span>Prova un titolo più breve oppure passa all&apos;inserimento manuale.</span>
        </div>
      ) : null}

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
                    disabled={Boolean(importing)}
                  >
                    {importing === wishlistKey ? <LoaderCircle className="spin" size={18} /> : <Bookmark size={18} />}
                    <span>{importing === wishlistKey ? "Salvo" : "Wishlist"}</span>
                  </button>
                  <button
                    className="add-result"
                    type="button"
                    onClick={() => importWork(result, "library")}
                    disabled={Boolean(importing)}
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
