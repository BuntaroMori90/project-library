"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Bookmark,
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

export type AddWorkType = "book" | "manga" | "anime";

const typeMeta = {
  book: {
    label: "Libro",
    icon: BookOpen,
    placeholder: "Titolo, autore o ISBN…",
    hint: "Cerchiamo anche tra le edizioni e diamo priorità a quelle italiane. Dopo l'aggiunta potrai scegliere esattamente la versione che possiedi.",
    provider: "Open Library · ricerca edizioni italiane",
  },
  manga: {
    label: "Manga",
    icon: LibraryBig,
    placeholder: "Titolo italiano, inglese, originale o autore…",
    hint: "Cerchiamo la stessa opera su più cataloghi e uniamo i risultati. Se non esiste, puoi crearla anche inserendo soltanto il titolo.",
    provider: "MyAnimeList/Jikan + Kitsu",
  },
  anime: {
    label: "Anime",
    icon: Film,
    placeholder: "Cerca Vinland Saga, Monster, Pluto…",
    hint: "Recuperiamo serie, stagioni ed episodi; il tuo progresso resta invece personale.",
    provider: "TVmaze",
  },
} as const;

type Result = BookCatalogResult | MangaCatalogResult | AnimeCatalogResult;

function statusLabel(status: Result["publicationStatus"]) {
  if (status === "ONGOING") return "In corso";
  if (status === "COMPLETED") return "Completo";
  if (status === "HIATUS") return "In pausa";
  return "Catalogo";
}

function resultSubtitle(result: Result, type: AddWorkType) {
  if (type === "book") {
    const book = result as BookCatalogResult;
    return (
      book.creators.map((creator) => creator.name).join(" · ") ||
      "Autore non disponibile"
    );
  }
  if (type === "manga") {
    const manga = result as MangaCatalogResult;
    return (
      manga.creators.map((creator) => creator.name).join(" · ") ||
      "Autore non disponibile"
    );
  }
  const anime = result as AnimeCatalogResult;
  return (
    [anime.network, anime.language].filter(Boolean).join(" · ") || "Serie anime"
  );
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
      manga.volumeCount
        ? `${manga.volumeCount} volumi`
        : "Volumi da verificare",
      manga.chapterCount ? `${manga.chapterCount} capitoli` : null,
      manga.releaseYear,
    ]
      .filter(Boolean)
      .map(String);
  }
  const anime = result as AnimeCatalogResult;
  return [
    anime.releaseYear,
    anime.genres.slice(0, 2).join(" · ") || null,
    anime.network,
  ]
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  function switchType(next: AddWorkType) {
    setType(next);
    setQuery("");
    setResults([]);
    setError(null);
    setSearched(false);
    setImporting(null);
    setManualOpen(false);
    setManualTitle("");
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) return;
    setError(null);
    setSearched(true);
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(
        `/api/catalog/${type}/search?q=${encodeURIComponent(normalized)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Ricerca non disponibile.");
      }
      const nextResults = (payload.results ?? []) as Result[];
      setResults(nextResults);
      if (type === "manga" && nextResults.length === 0) {
        setManualTitle(normalized);
        setManualOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ricerca non disponibile.");
    } finally {
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

  async function addManualManga(event: React.FormEvent) {
    event.preventDefault();
    const title = manualTitle.trim();
    if (!title) return;
    setManualSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/catalog/manga/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, destination: "library" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Inserimento manuale non riuscito.");
      }
      router.push(`/library/manga/${payload.workId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Inserimento manuale non riuscito.",
      );
    } finally {
      setManualSaving(false);
    }
  }

  const meta = typeMeta[type];
  const Icon = meta.icon;

  return (
    <section className="add-work-flow">
      <div className="add-steps" aria-label="Flusso di aggiunta">
        <span className="active">
          <b>1</b> Tipologia
        </span>
        <span className={query.trim().length >= 2 ? "active" : ""}>
          <b>2</b> Ricerca
        </span>
        <span className={results.length ? "active" : ""}>
          <b>3</b> Conferma
        </span>
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
              <small>
                {key === "book"
                  ? "Libreria"
                  : key === "manga"
                    ? "Scaffali"
                    : "Videoteca"}
              </small>
            </button>
          );
        })}
      </div>

      <div className="add-search-stage">
        <div className="add-search-copy">
          <div className="add-search-icon">
            <Icon size={20} />
          </div>
          <div>
            <span className="eyebrow">Aggiungi {meta.label.toLowerCase()}</span>
            <h2>Trova l'opera giusta.</h2>
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
        <div className="provider-note">
          <Sparkles size={16} />
          <span>
            Fonte catalogo: {meta.provider}. Dati personali e catalogo restano
            separati.
          </span>
        </div>
      </div>

      {error ? <p className="catalog-error">{error}</p> : null}

      {searched && !loading && results.length === 0 && !error ? (
        <p className="catalog-empty">
          {type === "manga"
            ? "Nessun risultato nei cataloghi. Il titolo è già pronto per l'inserimento manuale qui sotto."
            : "Nessun risultato. Prova autore, ISBN oppure una variante più breve del titolo."}
        </p>
      ) : null}

      {type === "manga" ? (
        <section className={`manual-manga-entry ${manualOpen ? "open" : ""}`}>
          <div className="manual-manga-entry-head">
            <div>
              <span className="eyebrow">Titolo assente?</span>
              <strong>Aggiungilo senza compilare una scheda intera.</strong>
              <p>Il titolo è l'unico dato obbligatorio. Il resto potrà essere completato dopo.</p>
            </div>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                setManualOpen((current) => !current);
                if (!manualTitle.trim()) setManualTitle(query.trim());
              }}
            >
              <PenLine size={16} />
              {manualOpen ? "Chiudi" : "Inserisci a mano"}
            </button>
          </div>
          {manualOpen ? (
            <form className="manual-manga-form" onSubmit={addManualManga}>
              <label>
                <span>Titolo manga</span>
                <input
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  placeholder="Titolo italiano, originale o quello che conosci"
                  autoFocus
                />
              </label>
              <button
                className="primary-btn"
                type="submit"
                disabled={manualSaving || !manualTitle.trim()}
              >
                {manualSaving ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Plus size={18} />
                )}
                {manualSaving ? "Aggiungo…" : "Aggiungi alla libreria"}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

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
                    unoptimized
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
                  {facts(result, type).map((fact) => (
                    <span key={fact}>{fact}</span>
                  ))}
                </div>
              </div>
              <div className="add-result-actions">
                <button
                  className="add-result add-to-wishlist"
                  type="button"
                  onClick={() => importWork(result, "wishlist")}
                  disabled={Boolean(importing)}
                >
                  {importing === wishlistKey ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Bookmark size={18} />
                  )}
                  <span>{importing === wishlistKey ? "Salvo" : "Wishlist"}</span>
                </button>
                <button
                  className="add-result"
                  type="button"
                  onClick={() => importWork(result, "library")}
                  disabled={Boolean(importing)}
                >
                  {importing === libraryKey ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  <span>
                    {importing === libraryKey
                      ? "Importo"
                      : type === "book"
                        ? "Scegli edizione"
                        : "Libreria"}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="catalog-attribution">
        Manga: ricerca combinata MyAnimeList/Jikan e Kitsu. Libri: Open Library.
        Anime: TVmaze. Le fonti restano separate dai tuoi dati personali.
      </p>
    </section>
  );
}
