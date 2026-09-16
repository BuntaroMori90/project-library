/* eslint-disable @next/next/no-img-element */
import { Check } from "lucide-react";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";

type SpecialVolumeRow = {
  edition_id: string;
  unit_id: string;
  unit_number: string | number;
  edition_name: string;
  custom_name: string | null;
  custom_format: string | null;
  custom_cover_url: string | null;
  custom_publisher: string | null;
  custom_publication_year: number | null;
};

export async function MangaSpecialVolumeSource({ workId }: { workId: string }) {
  const { profile } = await requireProfile();
  const result = await query<SpecialVolumeRow>(
    `select e.id as edition_id,
            cu.id as unit_id,
            cu.unit_number,
            e.name as edition_name,
            o.custom_name,
            o.custom_format,
            o.custom_cover_url,
            o.custom_publisher,
            o.custom_publication_year
       from editions e
       join ownership o
         on o.edition_id=e.id and o.profile_id=$1
       join content_units cu
         on cu.edition_id=e.id
        and cu.work_id=e.work_id
        and cu.unit_type='VOLUME'
      where e.work_id=$2
        and cu.unit_number is not null
        and lower(coalesce(o.custom_format,'')) in
          ('variant','limited','deluxe','speciale','box / cofanetto','altro')
      order by cu.unit_number,o.updated_at desc`,
    [profile.id, workId],
  );

  if (!result.rows.length) return null;

  return (
    <div id="manga-special-volume-source" hidden aria-hidden="true">
      {result.rows.map((variant) => {
        const volumeNumber = Number(variant.unit_number);
        const label = variant.custom_format || "Speciale";
        const name = variant.custom_name || variant.edition_name;
        const coverUrl = variant.custom_cover_url?.startsWith("data:image/")
          ? `/api/library/cover/${variant.edition_id}`
          : variant.custom_cover_url;

        return (
          <article
            key={variant.unit_id}
            data-special-key={variant.unit_id}
            data-volume-number={volumeNumber}
            className="volume visual-volume variant-volume owned"
          >
            <div className="variant-volume-cover">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`Copertina ${label} del volume ${volumeNumber}`}
                />
              ) : (
                <div className="variant-volume-placeholder">
                  <span>{String(volumeNumber).padStart(2, "0")}</span>
                </div>
              )}
            </div>
            <div className="volume-copy variant-volume-copy">
              <span className="variant-volume-badge">{label}</span>
              <strong>
                Volume {volumeNumber} · {label}
              </strong>
              <span>{name}</span>
              <small>
                {[variant.custom_publisher, variant.custom_publication_year]
                  .filter(Boolean)
                  .join(" · ") || "Edizione da collezione"}
              </small>
            </div>
            <span className="variant-owned-label">
              <Check size={14} /> Posseduto
            </span>
          </article>
        );
      })}
    </div>
  );
}
