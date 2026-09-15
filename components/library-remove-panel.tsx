import { LibraryRemoveForm } from "@/components/library-remove-form";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import type { RemovableMediaType } from "@/lib/repositories/remove-library";

export async function LibraryRemovePanel({
  workId,
  mediaType,
}: {
  workId: string;
  mediaType: RemovableMediaType;
}) {
  const { profile } = await requireProfile();
  const result = await query<{ title: string }>(
    `select w.title
       from library_entries le
       join works w on w.id=le.work_id
      where le.profile_id=$1 and le.work_id=$2 and w.media_type=$3
      limit 1`,
    [profile.id, workId, mediaType],
  );

  const work = result.rows[0];
  if (!work) return null;

  const destination = mediaType === "ANIME" ? "videoteca" : "libreria";

  return (
    <section className="page">
      <section className="detail-section danger-zone">
        <div className="catalog-notice">
          <div>
            <strong>Gestione {destination}</strong>
            <p>
              Rimuovere l&apos;opera cancella dal tuo profilo stato, progresso e dati
              personali. L&apos;opera catalogo resta disponibile e potrai aggiungerla
              di nuovo in seguito.
            </p>
            <LibraryRemoveForm
              workId={workId}
              title={work.title}
              mediaType={mediaType}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
