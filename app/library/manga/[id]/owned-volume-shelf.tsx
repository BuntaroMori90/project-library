import Image from "next/image";
import { canOptimizeCover } from "@/components/demo-cover";
import { listOwnedMangaShelfVolumes } from "@/lib/repositories/manga-owned-shelf";
import { toggleOwnedVolume } from "./actions";

export async function OwnedVolumeShelf({
  profileId,
  workId,
}: {
  profileId: string;
  workId: string;
}) {
  const volumes = await listOwnedMangaShelfVolumes(profileId, workId);

  if (!volumes.length) {
    return (
      <div className="owned-volume-empty">
        <strong>Nessun volume fisico registrato.</strong>
        <p>Usa il pannello di aggiunta per segnare i volumi che possiedi.</p>
      </div>
    );
  }

  return (
    <>
      <div className="owned-volume-track" aria-label="Volumi manga posseduti">
        {volumes.map((volume) => (
          <article
            className="owned-volume-book"
            key={`${volume.editionId}-${volume.unitId}`}
          >
            <div className="owned-volume-cover">
              {volume.coverUrl ? (
                canOptimizeCover(volume.coverUrl) ? (
                  <Image
                    src={volume.coverUrl}
                    alt={`Copertina volume ${volume.unitNumber}`}
                    width={220}
                    height={330}
                    sizes="(max-width: 520px) 112px, 136px"
                    loading="lazy"
                  />
                ) : (
                  // Copertine personali/autenticate: richiesta diretta per mantenere la sessione.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={volume.coverUrl}
                    alt={`Copertina volume ${volume.unitNumber}`}
                    loading="lazy"
                    decoding="async"
                  />
                )
              ) : (
                <div className="owned-volume-placeholder" aria-label={`Volume ${volume.unitNumber} senza copertina`}>
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
              <form action={toggleOwnedVolume} className="owned-volume-remove-form">
                <input type="hidden" name="workId" value={workId} />
                <input type="hidden" name="editionId" value={volume.editionId} />
                <input type="hidden" name="unitId" value={volume.unitId} />
                <button type="submit">Rimuovi dal possesso</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>

      {volumes.length > 24 ? (
        <details className="owned-volume-compact-view">
          <summary>Vista compatta · {volumes.length} volumi</summary>
          <div>
            {volumes.map((volume) => (
              <span key={`compact-${volume.editionId}-${volume.unitId}`}>
                {volume.unitNumber}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
