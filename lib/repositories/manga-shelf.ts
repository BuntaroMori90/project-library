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
    `select e.id as edition_id,e.work_id,w.title as work_title,
            o.custom_name,o.custom_format,o.custom_publisher,o.custom_language,
            case when cover.value like 'data:image/%'
              then '/api/manga/volume-cover/' || volume.owned_id::text || '?v=' || md5(cover.value)
              else cover.value end as cover_url,
            volume.unit_number::float8 as volume_number
       from ownership o
       join editions e on e.id=o.edition_id
       join works w on w.id=e.work_id and w.media_type='MANGA'
       join library_entries le on le.profile_id=o.profile_id and le.work_id=e.work_id
       join lateral (
         select ou.id as owned_id,cu.unit_number,
           coalesce(to_jsonb(ou)->>'custom_cover_url',cu.cover_url) as cover_url
         from owned_units ou
         join content_units cu on cu.id=ou.unit_id and cu.edition_id=ou.edition_id
         where ou.profile_id=o.profile_id and ou.edition_id=e.id and cu.unit_type='VOLUME'
         order by cu.unit_number nulls last,ou.id limit 1
       ) volume on true
       cross join lateral (select coalesce(volume.cover_url,o.custom_cover_url) as value) cover
      where o.profile_id=$1 and e.source_provider='MANUAL'
        and lower(coalesce(o.custom_format,'')) in ('variant','limited','deluxe','speciale','box / cofanetto','altro')
      order by w.title,volume.unit_number nulls last,o.custom_name nulls last,e.created_at desc`,
    [profileId],
  );
}
