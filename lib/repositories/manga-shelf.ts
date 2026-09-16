import "server-only";
import { query } from "@/lib/db";

export type MangaShelfVariantRow = {
  edition_id: string;
  work_id: string;
  work_title: string;
  custom_name: string | null;
  custom_format: string | null;
  custom_publisher: string | null;
  custom_language: string | null;
  cover_url: string | null;
  volume_number: string | number | null;
};

export async function listMangaShelfVariants(profileId: string) {
  return query<MangaShelfVariantRow>(
    `select e.id as edition_id,
            e.work_id,
            w.title as work_title,
            o.custom_name,
            o.custom_format,
            o.custom_publisher,
            o.custom_language,
            case
              when o.custom_cover_url like 'data:image/%'
                then '/api/library/cover/' || e.id::text
              else o.custom_cover_url
            end as cover_url,
            min(cu.unit_number) as volume_number
       from ownership o
       join editions e on e.id=o.edition_id
       join works w on w.id=e.work_id and w.media_type='MANGA'
       join library_entries le
         on le.profile_id=o.profile_id
        and le.work_id=e.work_id
       left join content_units cu
         on cu.edition_id=e.id
        and cu.unit_type='VOLUME'
      where o.profile_id=$1
        and e.source_provider='MANUAL'
        and lower(coalesce(o.custom_format,'')) <> 'standard'
      group by e.id,e.work_id,w.title,
               o.custom_name,o.custom_format,o.custom_publisher,
               o.custom_language,o.custom_cover_url
      order by w.title,
               min(cu.unit_number) nulls last,
               o.custom_name nulls last,
               e.created_at desc`,
    [profileId],
  );
}
