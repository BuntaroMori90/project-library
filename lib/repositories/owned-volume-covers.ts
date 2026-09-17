import "server-only";
import { query } from "@/lib/db";

export type OwnedMangaVolume = {
  owned_id: string;
  unit_id: string;
  edition_id: string;
  work_id: string;
  unit_number: string | number | null;
  edition_name: string;
  edition_format: string | null;
  cover_url: string | null;
  has_custom_cover: boolean;
};
export async function listOwnedMangaVolumes(profileId: string, workId: string) {
  return query<OwnedMangaVolume>(
    `select ou.id as owned_id,ou.unit_id,ou.edition_id,e.work_id,
      cu.unit_number::float8 as unit_number,coalesce(o.custom_name,e.name) as edition_name,o.custom_format as edition_format,
      (to_jsonb(ou)->>'custom_cover_url') is not null as has_custom_cover,
      case when effective.cover like 'data:image/%'
        then '/api/manga/volume-cover/' || ou.id::text || '?v=' || md5(effective.cover)
        else effective.cover end as cover_url
    from owned_units ou
    join content_units cu on cu.id=ou.unit_id and cu.edition_id=ou.edition_id
    join editions e on e.id=ou.edition_id
    join works w on w.id=e.work_id and w.media_type='MANGA'
    join library_entries le on le.profile_id=ou.profile_id and le.work_id=e.work_id
    left join ownership o on o.profile_id=ou.profile_id and o.edition_id=e.id
    cross join lateral (select coalesce(to_jsonb(ou)->>'custom_cover_url',cu.cover_url,
      case when lower(coalesce(o.custom_format,'')) in ('variant','limited','deluxe','speciale','box / cofanetto','altro')
        then o.custom_cover_url end) as cover) effective
    where ou.profile_id=$1 and e.work_id=$2 and cu.unit_type='VOLUME'
    order by cu.unit_number nulls last,edition_name,ou.id`,
    [profileId, workId],
  );
}
export async function saveOwnedVolumeCover(
  profileId: string,
  ownedId: string,
  cover: string | null,
) {
  const result = await query<{ work_id: string }>(
    `update owned_units ou set custom_cover_url=$3
    from editions e, works w, library_entries le
    where ou.id=$2 and ou.profile_id=$1 and e.id=ou.edition_id and w.id=e.work_id
      and w.media_type='MANGA' and le.profile_id=$1 and le.work_id=w.id
    returning e.work_id`,
    [profileId, ownedId, cover],
  );
  return result.rows[0] ?? null;
}

export async function getOwnedVolumeCover(profileId: string, ownedId: string) {
  const result = await query<{ cover: string | null }>(
    `select coalesce(
      to_jsonb(ou)->>'custom_cover_url',cu.cover_url,
      case when lower(coalesce(o.custom_format,'')) in ('variant','limited','deluxe','speciale','box / cofanetto','altro')
        then o.custom_cover_url end) as cover
    from owned_units ou
    join content_units cu on cu.id=ou.unit_id and cu.edition_id=ou.edition_id
    join editions e on e.id=ou.edition_id
    join works w on w.id=e.work_id and w.media_type='MANGA'
    join library_entries le on le.profile_id=ou.profile_id and le.work_id=e.work_id
    left join ownership o on o.profile_id=ou.profile_id and o.edition_id=e.id
    where ou.id=$1 and ou.profile_id=$2 and cu.unit_type='VOLUME'`,
    [ownedId, profileId],
  );
  return result.rows[0]?.cover ?? null;
}
