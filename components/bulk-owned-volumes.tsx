"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Layers3 } from "lucide-react";
import { parseVolumeSelection } from "@/lib/inventory/volume-selection";

type OwnedVolume = {
  unitId: string;
  editionId: string;
  unitNumber: number;
  coverUrl: string | null;
  editionName: string;
  explicitOwned: boolean;
};

export function BulkOwnedVolumes({
  workId,
  editions,
}: {
  workId: string;
  editions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [selection, setSelection] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ownedVolumes, setOwnedVolumes] = useState<OwnedVolume[]>([]);
  const [shelfLoading, setShelfLoading] = useState(true);
  const [shelfError, setShelfError] = useState("");
  const [removingKey, setRemovingKey] = useState("");

  const loadShelf = useCallback(async () => {
    setShelfLoading(true);
    setShelfError("");
    try {
      const response = await fetch(
        `/api/manga/owned-volumes?workId=${encodeURIComponent(workId)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Impossibile caricare i volumi.");
      setOwnedVolumes(Array.isArray(result.volumes) ? result.volumes : []);
    } catch (caught) {
      setShelfError(
        caught instanceof Error ? caught.message : "Impossibile caricare i volumi posseduti.",
      );
    } finally {
      setShelfLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void loadShelf();
  }, [loadShelf]);

  let numbers: number[] = [];
  let invalid = "";
  if (selection.trim()) {
    try {
      numbers = parseVolumeSelection(selection);
    } catch (caught) {
      invalid = (caught as Error).message;
    }
  }

  if (!editions.length) return null;

  return (
    <div className="owned-manga-collection">
      <div className="owned-manga-heading">
        <div>
          <span className="eyebrow">La tua collezione</span>
          <h2>Volumi posseduti</h2>
        </div>
        <span>
          {shelfLoading
            ? "Carico…"
            : `${ownedVolumes.length} ${ownedVolumes.length === 1 ? "volume" : "volumi"}`}
        </span>
      </div>

      {shelfError ? <p className="catalog-error">{shelfError}</p> : null}

      {!shelfLoading && !shelfError && ownedVolumes.length ? (
        <>
          <div className="owned-volume-track" aria-label="Volumi manga posseduti">
            {ownedVolumes.map((volume) => {
              const key = `${volume.editionId}-${volume.unitId}`;
              return (
                <article className="owned-volume-book" key={key}>
                  <div className="owned-volume-cover">
                    {volume.coverUrl ? (
                      // Mantiene funzionanti sia URL esterni sia endpoint autenticati delle cover personali.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={volume.coverUrl}
                        alt={`Copertina volume ${volume.unitNumber}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="owned-volume-placeholder">
                        <span>VOL.</span>
                        <strong>{volume.unitNumber}</strong>
                      </div>
                    )}
                  </div>
                  <div className="owned-volume-caption">
                    <strong>Volume {volume.unitNumber}</strong>
                    <span>{volume.editionName}</span>
                  </div>
                  {volume.explicitOwned ? (
                    <button
                      type="button"
                      className="owned-volume-remove"
                      disabled={removingKey === key}
                      onClick={async () => {
                        if (!window.confirm(`Rimuovere il volume ${volume.unitNumber} dai posseduti?`)) {
                          return;
                        }
                        setRemovingKey(key);
                        try {
                          const response = await fetch("/api/manga/owned-volumes", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              workId,
                              editionId: volume.editionId,
                              unitId: volume.unitId,
                            }),
                          });
                          const result = await response.json();
                          if (!response.ok) {
                            throw new Error(result.error ?? "Rimozione non riuscita.");
                          }
                          await loadShelf();
                          router.refresh();
                        } catch (caught) {
                          setShelfError(
                            caught instanceof Error ? caught.message : "Rimozione non riuscita.",
                          );
                        } finally {
                          setRemovingKey("");
                        }
                      }}
                    >
                      {removingKey === key ? "Rimuovo…" : "Rimuovi"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>

          {ownedVolumes.length > 24 ? (
            <details className="owned-volume-compact-view">
              <summary>Vista compatta · {ownedVolumes.length} volumi</summary>
              <div>
                {ownedVolumes.map((volume) => (
                  <span key={`compact-${volume.editionId}-${volume.unitId}`}>
                    {volume.unitNumber}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      {!shelfLoading && !shelfError && !ownedVolumes.length ? (
        <div className="owned-volume-empty">
          <strong>Nessun volume fisico registrato.</strong>
          <p>Aggiungi qui sotto i numeri dei volumi che possiedi.</p>
        </div>
      ) : null}

      <details className="bulk-owned-volumes">
        <summary className="bulk-owned-summary">
          <span className="bulk-owned-summary-icon" aria-hidden="true">
            <Layers3 size={18} />
          </span>
          <span className="bulk-owned-summary-copy">
            <strong>Aggiungi più volumi posseduti</strong>
            <small>Inserisci numeri o intervalli, per esempio 1–12, 15, 18.</small>
          </span>
          <ChevronDown className="bulk-owned-chevron" size={18} aria-hidden="true" />
        </summary>

        <form
          className="bulk-owned-form"
          aria-busy={pending}
          onSubmit={async (event) => {
            event.preventDefault();
            if (lock.current || !numbers.length || invalid) return;

            lock.current = true;
            setPending(true);
            setError("");
            setMessage("");

            try {
              const response = await fetch("/api/manga/owned-volumes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workId, editionId, selection }),
              });
              const result = await response.json();
              if (!response.ok) {
                throw new Error(result.error ?? "Salvataggio non riuscito.");
              }
              setMessage(
                `${result.added} volumi aggiunti; ${result.alreadyOwned} già presenti e lasciati invariati.`,
              );
              setSelection("");
              await loadShelf();
              router.refresh();
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Salvataggio non confermato. Puoi riprovare: i volumi già presenti non vengono duplicati.",
              );
            } finally {
              lock.current = false;
              setPending(false);
            }
          }}
        >
          <div className="bulk-owned-fields">
            <label>
              <span>Edizione</span>
              <select
                value={editionId}
                disabled={pending}
                onChange={(event) => {
                  setEditionId(event.target.value);
                  setMessage("");
                }}
              >
                {editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Volumi cartacei posseduti</span>
              <input
                value={selection}
                disabled={pending}
                placeholder="1–12, 15, 18"
                onChange={(event) => {
                  setSelection(event.target.value);
                  setMessage("");
                  setError("");
                }}
                aria-describedby="bulk-volume-help"
              />
            </label>
          </div>

          <p id="bulk-volume-help" className="bulk-owned-help">
            I volumi già registrati vengono saltati. Per volumi speciali usa la scheda dell’edizione.
          </p>

          {numbers.length ? (
            <p role="status" className="bulk-owned-selection">
              <strong>{numbers.length} volumi riconosciuti</strong>
              <span>
                {numbers.length <= 30
                  ? numbers.join(", ")
                  : `${numbers.slice(0, 15).join(", ")}… fino al ${numbers[numbers.length - 1]}`}
                . Nessun dato di lettura verrà modificato.
              </span>
            </p>
          ) : null}

          {invalid || error ? (
            <p role="alert" className="catalog-error bulk-owned-message">
              {error || invalid}
            </p>
          ) : null}

          {message ? (
            <p role="status" className="bulk-owned-success">
              {message}
            </p>
          ) : null}

          <div className="bulk-owned-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={pending || !numbers.length || Boolean(invalid)}
            >
              {pending ? "Salvo…" : "Conferma volumi posseduti"}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
