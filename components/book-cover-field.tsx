"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

const MAX_DATA_URL_LENGTH = 320_000;

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
          let canvas = drawResized(image, 480, 720);
          let quality = 0.76;
          let value = canvas.toDataURL("image/jpeg", quality);

          while (value.length > MAX_DATA_URL_LENGTH && quality > 0.5) {
            quality -= 0.07;
            value = canvas.toDataURL("image/jpeg", quality);
          }

          if (value.length > MAX_DATA_URL_LENGTH) {
            canvas = drawResized(image, 360, 540);
            value = canvas.toDataURL("image/jpeg", 0.62);
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

export function BookCoverField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setValue(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il caricamento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="book-cover-field">
      <input type="hidden" name="customCoverUrl" value={value} />
      {value ? (
        <div className="book-cover-preview">
          <img src={value} alt="Anteprima copertina personale" />
          <button type="button" onClick={() => setValue("")} aria-label="Rimuovi copertina personale">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="book-cover-placeholder-upload"><ImagePlus size={22} /><span>Copertina</span></div>
      )}
      <div className="book-cover-field-actions">
        <label className="soft-action book-cover-upload">
          <ImagePlus size={16} />
          {busy ? "Ottimizzo…" : value ? "Cambia copertina" : "Carica copertina"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        <span>oppure</span>
        <input
          type="url"
          placeholder="URL immagine (facoltativo)"
          value={value.startsWith("data:") ? "" : value}
          onChange={(event) => setValue(event.target.value)}
          disabled={value.startsWith("data:")}
        />
        <small className="book-cover-help">La foto viene ridotta automaticamente prima del salvataggio.</small>
      </div>
      {error ? <small className="catalog-error">{error}</small> : null}
    </div>
  );
}
