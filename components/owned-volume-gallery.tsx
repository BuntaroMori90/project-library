"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ManualWorkCover } from "@/components/manual-work-cover";
import type { OwnedMangaVolume } from "@/lib/repositories/owned-volume-covers";

function VolumeCard({ volume }: { volume: OwnedMangaVolume }) {
  const router = useRouter();
  const lock = useRef(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cover, setCover] = useState("");
  const [pending, setPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(value: string | null) {
    if (lock.current || processing) return;
    lock.current = true;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/manga/volume-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownedId: volume.owned_id, cover: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEditing(false);
      setCover("");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Salvataggio non confermato. Riprova.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <article className="owned-volume-card" id={`owned-${volume.owned_id}`}>
      <div className="owned-volume-cover">
        {volume.cover_url && failedCover !== volume.cover_url ? (
          <img
            src={volume.cover_url}
            alt={`Copertina volume ${volume.unit_number ?? "speciale"}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedCover(volume.cover_url)}
          />
        ) : (
          <span>Vol. {volume.unit_number ?? "speciale"}</span>
        )}
      </div>
      <strong>Volume {volume.unit_number ?? "speciale"}</strong>
      <small>{volume.edition_name}</small>
      {volume.edition_format &&
      volume.edition_format.toLowerCase() !== "standard" ? (
        <span className="edition-badge">{volume.edition_format}</span>
      ) : null}
      <button
        className="soft-action"
        type="button"
        aria-expanded={editing}
        disabled={pending || processing}
        onClick={() => {
          setEditing(!editing);
          setError("");
          setSaved(false);
        }}
      >
        {" "}
        {editing ? "Chiudi" : "Cambia copertina"}
      </button>
      {editing ? (
        <form
          className="owned-volume-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(cover);
          }}
        >
          <ManualWorkCover
            value={cover}
            title={`Volume ${volume.unit_number ?? "speciale"}`}
            onChange={setCover}
            onBusyChange={setProcessing}
            disabled={pending}
          />
          <p>Questa immagine appartiene solo al tuo volume.</p>
          <button
            className="primary-btn"
            disabled={!cover.trim() || pending || processing}
          >
            {pending ? "Salvo…" : "Salva copertina"}
          </button>
          {volume.has_custom_cover ? (
            <button
              className="secondary-btn"
              type="button"
              disabled={pending || processing}
              onClick={() => void save(null)}
            >
              Ripristina copertina del catalogo
            </button>
          ) : null}
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="catalog-error">
          {error}
        </p>
      ) : null}
      {saved ? <small role="status">Copertina aggiornata.</small> : null}
    </article>
  );
}
export function OwnedVolumeGallery({
  volumes,
}: {
  volumes: OwnedMangaVolume[];
}) {
  const [visible, setVisible] = useState(24);
  return (
    <section className="detail-section owned-volume-gallery" id="i-miei-volumi">
      <div className="section-heading">
        <h2>I miei volumi</h2>
        <span>{volumes.length} posseduti</span>
      </div>
      <p>
        Ogni volume può avere la propria copertina. Sono incluse le edizioni
        personali e le variant.
      </p>
      {volumes.length ? (
        <div className="owned-volume-grid">
          {volumes.slice(0, visible).map((v) => (
            <VolumeCard key={v.owned_id} volume={v} />
          ))}
        </div>
      ) : (
        <p>Aggiungi i volumi che possiedi usando il modulo qui sotto.</p>
      )}
      {visible < volumes.length ? (
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setVisible((n) => n + 24)}
        >
          Mostra altri volumi
        </button>
      ) : null}
    </section>
  );
}
