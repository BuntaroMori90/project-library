"use client";
/* eslint-disable @next/next/no-img-element */
import { Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ManualWorkCover } from "@/components/manual-work-cover";
import { ThemedConfirmDialog } from "@/components/themed-confirm-dialog";
import type { OwnedMangaVolume } from "@/lib/repositories/owned-volume-covers";

function VolumeCard({ volume }: { volume: OwnedMangaVolume }) {
  const router = useRouter();
  const lock = useRef(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cover, setCover] = useState("");
  const [pending, setPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const busy = pending || processing || removing;

  async function save(value: string | null) {
    if (lock.current || processing || removing) return;
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

  async function removeVolume() {
    if (lock.current || pending || processing) return;
    lock.current = true;
    setRemoving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/manga/owned-volumes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownedId: volume.owned_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setConfirmingRemove(false);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Rimozione non confermata. Riprova.",
      );
    } finally {
      lock.current = false;
      setRemoving(false);
    }
  }

  const volumeLabel = volume.unit_number ?? "speciale";

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
      <div className="owned-volume-actions">
        <button
          className="soft-action"
          type="button"
          aria-expanded={editing}
          disabled={busy}
          onClick={() => {
            setEditing(!editing);
            setError("");
            setSaved(false);
          }}
        >
          {editing ? "Chiudi" : "Cambia copertina"}
        </button>
        <button
          className="owned-volume-remove"
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            setConfirmingRemove(true);
          }}
          aria-label={`Rimuovi volume ${volumeLabel} dalla collezione`}
        >
          <Trash2 size={15} />
          {removing ? "Rimuovo…" : "Rimuovi"}
        </button>
      </div>
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
            disabled={pending || removing}
          />
          <p>Questa immagine appartiene solo al tuo volume.</p>
          <button
            className="primary-btn"
            disabled={!cover.trim() || pending || processing || removing}
          >
            {pending ? "Salvo…" : "Salva copertina"}
          </button>
          {volume.has_custom_cover ? (
            <button
              className="secondary-btn"
              type="button"
              disabled={pending || processing || removing}
              onClick={() => void save(null)}
            >
              Ripristina copertina del catalogo
            </button>
          ) : null}
        </form>
      ) : null}
      {error && !confirmingRemove ? (
        <p role="alert" className="catalog-error">
          {error}
        </p>
      ) : null}
      {saved ? <small role="status">Copertina aggiornata.</small> : null}
      <ThemedConfirmDialog
        open={confirmingRemove}
        title={`Rimuovere il volume ${volumeLabel}?`}
        description="Verrà rimosso solo questo volume dalla tua collezione. La serie, l’edizione e gli altri volumi resteranno invariati."
        confirmLabel="Rimuovi volume"
        pending={removing}
        error={error}
        onCancel={() => {
          if (!removing) {
            setConfirmingRemove(false);
            setError("");
          }
        }}
        onConfirm={() => void removeVolume()}
      />
    </article>
  );
}

function isAutomaticCoverEligible(volume: OwnedMangaVolume) {
  const format = volume.edition_format?.trim().toLowerCase();
  return (
    !volume.cover_url &&
    volume.unit_number != null &&
    (!format || format === "standard" || format === "edizione standard")
  );
}

export function OwnedVolumeGallery({
  volumes,
}: {
  volumes: OwnedMangaVolume[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(24);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");
  const [autoError, setAutoError] = useState("");
  const [autoOffset, setAutoOffset] = useState(0);
  const workId = volumes[0]?.work_id ?? null;
  const missingAutomatic = volumes.filter(isAutomaticCoverEligible).length;

  const recoverAutomaticCovers = useCallback(
    async (silent = false, requestedOffset?: number) => {
      if (!workId || autoLoading) return;
      setAutoLoading(true);
      setAutoError("");
      if (!silent) setAutoMessage("");

      try {
        const response = await fetch("/api/manga/volume-cover/auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workId,
            offset: requestedOffset ?? autoOffset,
          }),
        });
        const result = (await response.json()) as {
          error?: string;
          checked?: number;
          updated?: number;
          hasMore?: boolean;
          nextOffset?: number;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "Ricerca automatica non disponibile.");
        }

        const updated = result.updated ?? 0;
        const checked = result.checked ?? 0;
        setAutoOffset(result.nextOffset ?? 0);

        if (updated > 0) {
          setAutoMessage(
            `${updated} ${updated === 1 ? "copertina recuperata" : "copertine recuperate"} automaticamente.`,
          );
          router.refresh();
        } else if (!silent) {
          setAutoMessage(
            checked > 0
              ? "Nessuna copertina abbastanza affidabile in questo gruppo. Puoi continuare la ricerca o inserirla manualmente."
              : "Non ci sono altri volumi standard da controllare in questo punto della serie.",
          );
        }
      } catch (caught) {
        if (!silent) {
          setAutoError(
            caught instanceof Error
              ? caught.message
              : "Ricerca automatica non disponibile.",
          );
        }
      } finally {
        setAutoLoading(false);
      }
    },
    [autoLoading, autoOffset, router, workId],
  );

  useEffect(() => {
    if (!workId || missingAutomatic === 0) return;
    const key = `libronia:auto-manga-covers:${workId}:${volumes.length}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // La ricerca automatica può comunque partire senza sessionStorage.
    }
    void recoverAutomaticCovers(true, 0);
  }, [missingAutomatic, recoverAutomaticCovers, volumes.length, workId]);

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
      {missingAutomatic > 0 ? (
        <div className="owned-volume-auto-cover" aria-busy={autoLoading}>
          <div>
            <strong>Copertine automatiche</strong>
            <small>
              Libronia prova titolo, numero, editore e ISBN quando disponibili.
              Variant e speciali restano manuali per evitare abbinamenti errati.
            </small>
          </div>
          <button
            type="button"
            className="soft-action"
            disabled={autoLoading}
            onClick={() => void recoverAutomaticCovers(false)}
          >
            <Sparkles size={16} aria-hidden="true" />
            {autoLoading ? "Cerco…" : "Recupera copertine"}
          </button>
        </div>
      ) : null}
      {autoMessage ? <p className="owned-volume-auto-status" role="status">{autoMessage}</p> : null}
      {autoError ? <p className="catalog-error" role="alert">{autoError}</p> : null}
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
