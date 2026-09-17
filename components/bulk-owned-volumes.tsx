"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Layers3 } from "lucide-react";
import { parseVolumeSelection } from "@/lib/inventory/volume-selection";

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
          I volumi già registrati vengono saltati. Per volumi speciali usa la scheda
          dell’edizione.
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
  );
}
