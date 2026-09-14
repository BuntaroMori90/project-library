"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Immagine non leggibile"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Formato immagine non supportato"));
      image.onload = () => {
        const maxWidth = 700;
        const maxHeight = 1050;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Impossibile elaborare l'immagine"));
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
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
      const resized = await resizeImage(file);
      if (resized.length > 900_000) {
        throw new Error("Immagine troppo pesante. Prova una foto più piccola.");
      }
      setValue(resized);
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
      ) : null}
      <div className="book-cover-field-actions">
        <label className="soft-action book-cover-upload">
          <ImagePlus size={16} />
          {busy ? "Elaboro…" : value ? "Cambia foto" : "Carica copertina"}
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
          placeholder="Incolla URL immagine"
          value={value.startsWith("data:") ? "" : value}
          onChange={(event) => setValue(event.target.value)}
          disabled={value.startsWith("data:")}
        />
      </div>
      {error ? <small className="catalog-error">{error}</small> : null}
    </div>
  );
}
