"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Link2, X } from "lucide-react";
import { useState } from "react";

const MAX_DATA_URL_LENGTH = 220_000;

function drawResized(image: HTMLImageElement, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossibile elaborare l'immagine");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Immagine non leggibile"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Formato immagine non supportato"));
      image.onload = () => {
        try {
          let canvas = drawResized(image, 420, 630);
          let quality = 0.72;
          let value = canvas.toDataURL("image/jpeg", quality);

          while (value.length > MAX_DATA_URL_LENGTH && quality > 0.46) {
            quality -= 0.06;
            value = canvas.toDataURL("image/jpeg", quality);
          }

          if (value.length > MAX_DATA_URL_LENGTH) {
            canvas = drawResized(image, 320, 480);
            value = canvas.toDataURL("image/jpeg", 0.56);
          }

          if (value.length > MAX_DATA_URL_LENGTH) {
            throw new Error("Immagine ancora troppo pesante. Prova una foto più piccola.");
          }

          resolve(value);
        } catch (error) {
          reject(error);
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ManualWorkCover({
  value,
  title,
  onChange,
  disabled = false,
}: {
  value: string;
  title: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = busy || disabled;

  async function onFile(file: File | undefined) {
    if (!file || disabled) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il caricamento");
    } finally {
      setBusy(false);
    }
  }

  const hasCover = Boolean(value);

  return (
    <aside className={`manual-cover-card ${disabled ? "is-disabled" : ""}`} aria-busy={busy}>
      <div className={`manual-cover-preview ${hasCover ? "has-cover" : ""}`}>
        {hasCover ? (
          <>
            <img src={value} alt={title ? `Copertina di ${title}` : "Anteprima copertina"} />
            <button
              type="button"
              className="manual-cover-remove"
              onClick={() => onChange("")}
              aria-label="Rimuovi copertina"
              disabled={locked}
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <div className="manual-cover-empty">
            <ImagePlus size={30} />
            <strong>Copertina</strong>
            <span>Facoltativa</span>
          </div>
        )}
      </div>

      <div className="manual-cover-actions">
        <label className={`soft-action manual-cover-upload ${locked ? "is-disabled" : ""}`}>
          <ImagePlus size={16} />
          {busy ? "Elaboro…" : hasCover ? "Cambia immagine" : "Carica immagine"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={locked}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>

        <div className={`manual-cover-url ${locked ? "is-disabled" : ""}`}>
          <Link2 size={15} />
          <input
            type="url"
            placeholder="Oppure incolla URL"
            value={value.startsWith("data:") ? "" : value}
            disabled={value.startsWith("data:") || locked}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>

      <small className="manual-cover-note">
        Usa la copertina reale dell&apos;edizione. Puoi cambiarla in seguito.
      </small>
      {error ? <small className="catalog-error">{error}</small> : null}
    </aside>
  );
}
