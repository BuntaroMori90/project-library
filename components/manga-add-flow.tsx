"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Bookmark,
  BookOpenCheck,
  ChevronDown,
  Layers3,
  LibraryBig,
  LoaderCircle,
  Plus,
  Search,
  Smartphone,
} from "lucide-react";
import type { MangaCatalogResult } from "@/lib/catalog/types";
import { ManualWorkCover } from "@/components/manual-work-cover";

type EntryMode = "catalog" | "manual";
type MangaIntent = "collection" | "digital" | "mixed";
type ReadingStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED";

const intentions = [
  {
    value: "collection" as const,
    label: "Possiedo volumi",
    description: "Per manga presenti nella tua collezione fisica.",
    icon: LibraryBig,
  },
  {
    value: "digital" as const,
    label: "Solo lettura digitale",
    description: "Lo leggi o lo hai letto senza possedere volumi.",
    icon: Smartphone,
  },
  {
    value: "mixed" as const,
    label: "Possiedo + digitale",
    description: "Hai dei volumi ma continui o hai continuato online.",
    icon: Layers3,
  },
];

const statusLabels: Array<[ReadingStatus, string]> = [
  ["IN_PROGRESS", "In lettura"],
  ["COMPLETED", "Completato"],
  ["PLANNED", "Da iniziare"],
  ["PAUSED", "In pausa"],
  ["DROPPED", "Abbandonato"],
];

function subtitle(result: MangaCatalogResult) {
  return (
    result.creators.map((creator) => creator.name).join(" · ") ||
    "Autore non disponibile"
  );
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function MangaAddFlow() {
  const router = useRouter();
  const requestRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const [mode, setMode] = useState<EntryMode>("catalog");
  const [intent, setIntent] = useState<MangaIntent>("collection");
  const [readingStatus, setReadingStatus] =
    useState<ReadingStatus>("IN_PROGRESS");
  const [currentVolume, setCurrentVolume] = useState("");
  const [currentChapter, setCurrentChapter] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualTotalVolumes, setManualTotalVolumes] = useState("");
  const [manualCoverUrl, setManualCoverUrl] = useState("");
  const [coverProcessing, setCoverProcessing] = useState(false);

  const hasReading = intent === "digital" || intent === "mixed";

  function readingPayload() {
    return hasReading
      ? {
          readingStatus,
          currentVolume: parseOptionalNumber(currentVolume),
          currentChapter: parseOptionalNumber(currentChapter),
        }
      : {};
  }

  function finish(workId: string, placement: string) {
    if (placement === "wishlist") {
      router.push("/library/wishlist");
      return;
    }
    router.push(
      intent === "digital"
        ? `/library/manga/${workId}#personale`
        : `/library/manga/${workId}#i-miei-volumi`,
    );
  }

  function openManualEntry() {
    if (savingRef.current || coverProcessing) return;
    const pending = requestRef.current;
    requestRef.current = null;
    pending?.abort();
    setLoading(false);
    setError(null);
    setManualTitle((title) => title || query.trim());
    setMode("manual");
  }

  function backToSearch() {
    if (savingRef.current || coverProcessing) return;
    setMode("catalog");
    setResults([]);
    setError(null);
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2 || loading || savingRef.current) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    setLoading(true);
    setResults([]);
    setError(null);

    try {
      const response = await fetch(
        `/api/catalog/manga/search?q=${encodeURIComponent(normalized)}`,
        { signal: controller.signal },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Ricerca non disponibile.");
      if (requestRef.current !== controller) return;
      const next = (payload.results ?? []) as MangaCatalogResult[];
      setResults(next);
      if (!next.length) {
        setManualTitle(normalized);
        setMode("manual");
      }
    } catch (caught) {
      if (requestRef.current !== controller) return;
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "La ricerca sta impiegando troppo tempo. Riprova tra poco."
          : caught instanceof Error
            ? caught.message
            : "Ricerca non disponibile.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  async function importResult(
    result: MangaCatalogResult,
    destination: "library" | "wishlist",
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    const key = `${result.provider}:${result.providerId}:${destination}`;
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/catalog/manga/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: result.providerId,
          provider: result.provider,
          destination,
          intent,
          ...readingPayload(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Import non riuscito.");
      finish(payload.workId, payload.placement);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import non riuscito.");
    } finally {
      savingRef.current = false;
      setSavingKey(null);
    }
  }

  async function saveManual(destination: "library" | "wishlist") {
    const title = manualTitle.trim();
    if (!title || savingRef.current || coverProcessing) return;
    const totalVolumes = manualTotalVolumes.trim()
      ? Number(manualTotalVolumes)
      : undefined;
    if (
      totalVolumes !== undefined &&
      (!Number.isInteger(totalVolumes) || totalVolumes <= 0)
    ) {
      setError("Il numero di volumi deve essere un intero maggiore di zero.");
      return;
    }

    savingRef.current = true;
    setSavingKey(`manual:${destination}`);
    setError(null);
    try {
      const response = await fetch("/api/catalog/manga/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author: manualAuthor.trim() || undefined,
          totalVolumes,
          coverUrl: manualCoverUrl.trim() || undefined,
          destination,
          intent,
          ...readingPayload(),
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Inserimento manuale non riuscito.");
      finish(payload.workId, payload.placement);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Inserimento manuale non riuscito.",
      );
    } finally {
      savingRef.current = false;
      setSavingKey(null);
    }
  }

  return (
    <section className="manga-easy-add">
      <section className="manga-intent-stage">
        <div>
          <span className="eyebrow">Cosa vuoi registrare?</span>
          <h2>Come segui questo manga?</h2>
        </div>
        <div className="manga-intent-grid">
          {intentions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.value}
                className={intent === item.value ? "active" : ""}
                onClick={() => setIntent(item.value)}
              >
                <Icon size={20} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        {hasReading ? (
          <div className="manga-reading-quick-fields">
            <label>
              Stato
              <select
                value={readingStatus}
                onChange={(event) =>
                  setReadingStatus(event.target.value as ReadingStatus)
                }
              >
                {statusLabels.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Volume raggiunto <small>facoltativo</small>
              <input
                value={currentVolume}
                onChange={(event) => setCurrentVolume(event.target.value)}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Es. 12"
              />
            </label>
            <label>
              Capitolo raggiunto <small>facoltativo</small>
              <input
                value={currentChapter}
                onChange={(event) => setCurrentChapter(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Es. 137"
              />
            </label>
          </div>
        ) : null}
      </section>

      {mode === "catalog" ? (
        <>
          <form className="manga-easy-search" onSubmit={search}>
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Titolo italiano, originale o autore…"
              autoFocus
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={loading || query.trim().length < 2}
            >
              {loading ? <LoaderCircle className="spin" size={18} /> : null}
              {loading ? "Cerco" : "Cerca"}
            </button>
          </form>

          <button type="button" className="manual-entry-link" onClick={openManualEntry} disabled={Boolean(savingKey)}>Non trovi l’opera? Inseriscila manualmente</button>

          <div className="manga-easy-results">
            {results.map((result) => {
              const libraryKey = `${result.provider}:${result.providerId}:library`;
              const wishlistKey = `${result.provider}:${result.providerId}:wishlist`;
              return (
                <article key={`${result.provider}:${result.providerId}`}>
                  <div className="manga-easy-result-cover">
                    {result.coverUrl ? (
                      <Image
                        src={result.coverUrl}
                        alt={`Copertina di ${result.title}`}
                        width={110}
                        height={165}
                        sizes="74px"
                        quality={72}
                      />
                    ) : (
                      <span>{result.title.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="manga-easy-result-copy">
                    <strong>{result.title}</strong>
                    <span>{subtitle(result)}</span>
                    <small>
                      {[
                        result.volumeCount ? `${result.volumeCount} volumi` : null,
                        result.chapterCount ? `${result.chapterCount} capitoli` : null,
                        result.releaseYear,
                      ].filter(Boolean).join(" · ") || "Dati catalogo"}
                    </small>
                  </div>
                  <div className="manga-easy-result-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={Boolean(savingKey)}
                      onClick={() => void importResult(result, "wishlist")}
                    >
                      {savingKey === wishlistKey ? <LoaderCircle className="spin" size={17} /> : <Bookmark size={17} />}
                      Wishlist
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={Boolean(savingKey)}
                      onClick={() => void importResult(result, "library")}
                    >
                      {savingKey === libraryKey ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
                      Aggiungi
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <section className="manga-manual-fallback">
          <div className="manga-manual-fallback-head">
            <div>
              <span className="eyebrow">Inserimento manuale</span>
              <h2>Inseriscilo manualmente.</h2>
              <p>Basta il titolo. Copertina e dettagli sono facoltativi.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={backToSearch}>
              <Search size={16} /> Torna alla ricerca
            </button>
          </div>
          <form
            className="manga-easy-manual"
            onSubmit={(event) => {
              event.preventDefault();
              void saveManual("library");
            }}
          >
            <ManualWorkCover
              value={manualCoverUrl}
              onChange={setManualCoverUrl}
              onBusyChange={setCoverProcessing}
              title={manualTitle}
              disabled={Boolean(savingKey)}
            />
            <div className="manga-easy-manual-fields">
              <label className="manual-primary-field">
                Titolo <b>obbligatorio</b>
                <input
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  placeholder="Titolo del manga"
                  autoFocus
                />
              </label>
              <details>
                <summary>
                  <span><strong>Altri dettagli</strong><small>Facoltativi</small></span>
                  <ChevronDown size={17} />
                </summary>
                <div className="manga-easy-optional-fields">
                  <label>
                    Autore
                    <input
                      value={manualAuthor}
                      onChange={(event) => setManualAuthor(event.target.value)}
                      placeholder="Es. Takehiko Inoue"
                    />
                  </label>
                  <label>
                    Volumi pubblicati
                    <input
                      value={manualTotalVolumes}
                      onChange={(event) => setManualTotalVolumes(event.target.value)}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="Es. 37"
                    />
                  </label>
                </div>
              </details>
              <div className="manga-easy-manual-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={!manualTitle.trim() || Boolean(savingKey) || coverProcessing}
                  onClick={() => void saveManual("wishlist")}
                >
                  {savingKey === "manual:wishlist" ? <LoaderCircle className="spin" size={17} /> : <Bookmark size={17} />}
                  Wishlist
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={!manualTitle.trim() || Boolean(savingKey) || coverProcessing}
                >
                  {savingKey === "manual:library" ? <LoaderCircle className="spin" size={17} /> : <BookOpenCheck size={17} />}
                  Salva manga
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {error ? <p className="catalog-error" role="alert">{error}</p> : null}
    </section>
  );
}
