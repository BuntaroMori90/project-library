"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { isbnFromBarcode } from "@/lib/catalog/isbn";

export function IsbnPhotoSearch({
  onDetected,
  onBusyChange,
  disabled = false,
}: {
  onDetected: (isbn: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function scan(file?: File) {
    if (!file || disabled || locked.current) return;
    if (
      file.size > 12_000_000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setMessage("Scegli una foto JPG, PNG o WebP di massimo 12 MB.");
      return;
    }
    locked.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("");
    const url = URL.createObjectURL(file);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const decode = async () => {
        const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return new BrowserMultiFormatOneDReader()
          .decodeFromCanvas(canvas)
          .getText();
      };
      const value = await Promise.race([
        decode(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Timeout")), 15000);
        }),
      ]);
      const isbn = isbnFromBarcode(value);
      if (!isbn) throw new Error("Not an ISBN");
      if (mounted.current) {
        setMessage(
          `ISBN rilevato: ${isbn}. Premi Cerca per vedere i risultati.`,
        );
        onDetected(isbn);
      }
    } catch {
      if (mounted.current)
        setMessage(
          "Non riesco a leggere un ISBN. Fotografa da vicino il codice a barre sul retro, con buona luce, oppure scrivi il codice nel campo di ricerca.",
        );
    } finally {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  }
  return (
    <div className="isbn-photo-search" aria-busy={busy}>
      <div className="isbn-photo-actions">
        <button
          type="button"
          className="soft-action"
          disabled={disabled || busy}
          onClick={() => camera.current?.click()}
        >
          <Camera size={17} />
          {busy ? "Leggo il codice…" : "Fotografa ISBN"}
        </button>
        <button
          type="button"
          className="soft-action"
          disabled={disabled || busy}
          onClick={() => gallery.current?.click()}
        >
          <ImagePlus size={17} />
          Scegli foto
        </button>
      </div>
      <input
        ref={camera}
        aria-label="Fotografa il codice ISBN"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        disabled={disabled || busy}
        onChange={(e) => {
          void scan(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        aria-label="Scegli una foto del codice ISBN"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={disabled || busy}
        onChange={(e) => {
          void scan(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <small>
        Inquadra il codice a barre sul retro del libro. La foto resta sul
        dispositivo.
      </small>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
