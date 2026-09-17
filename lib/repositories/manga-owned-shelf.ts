import "server-only";
import { query } from "@/lib/db";

export type OwnedMangaShelfVolume = {
  unitId: string;
  editionId: string;
  unitNumber: number;
  coverUrl: string | null;
  editionName: string;
  explicitOwned: boolean;
};

export async function listOwnedMangaShelfVolumes(
  profileId: string,
  workId: string,
): Promise<OwnedMangaShelfVolume[]> {
  const result = await query<{
    unit_id: string;
    edition_id: string;
    unit_number: string | number;
    cover_url: string | null;
    edition_name: string;
    explicit_owned: boolean;
  }>(
    `with explicit_owned as (
       select cu.id as unit_id,
              e.id as edition_id,
              cu.unit_number,
              case
                when o.custom_cover_url like 'data:image/%'
                  then '/api/library/cover/' || e.id::text
                else coalesce(o.custom_cover_url,cu.cover_url)
              end as cover_url,
              coalesce(nullif(btrim(o.custom_name),''),e.name) as edition_name,
              true as explicit_owned
         from owned_units ou
         join content_units cu on cu.id=ou.unit_id
         join editions e on e.id=ou.edition_id
         left join ownership o
           on o.profile_id=ou.profile_id and o.edition_id=ou.edition_id
        where ou.profile_id=$1
          and e.work_id=$2
          and cu.unit_type='VOLUME'
          and cu.unit_number is not null
     ), personal_specials as (
       select cu.id as unit_id,
              e.id as edition_id,
              cu.unit_number,
              case
                when o.custom_cover_url like 'data:image/%'
                  then '/api/library/cover/' || e.id::text
                else coalesce(o.custom_cover_url,cu.cover_url)
              end as cover_url,
              coalesce(nullif(btrim(o.custom_name),''),e.name) as edition_name,
              false as explicit_owned
         from ownership o
         join editions e on e.id=o.edition_id
         join content_units cu on cu.edition_id=e.id
        where o.profile_id=$1
          and e.work_id=$2
          and o.ownership_format='PHYSICAL'
          and o.custom_format is not null
          and lower(o.custom_format) <> 'standard'
          and cu.unit_type='VOLUME'
          and cu.unit_number is not null
          and not exists (
            select 1
              from owned_units ou
             where ou.profile_id=o.profile_id
               and ou.edition_id=e.id
               and ou.unit_id=cu.id
          )
     )
     select unit_id,edition_id,unit_number,cover_url,edition_name,explicit_owned
       from (
         select * from explicit_owned
         union all
         select * from personal_specials
       ) shelf
      order by unit_number,edition_name`,
    [profileId, workId],
  );

  return result.rows.map((row) => ({
    unitId: row.unit_id,
    editionId: row.edition_id,
    unitNumber: Number(row.unit_number),
    coverUrl: row.cover_url,
    editionName: row.edition_name,
    explicitOwned: row.explicit_owned,
  }));
}

export async function removeOwnedMangaShelfVolume(
  profileId: string,
  workId: string,
  editionId: string,
  unitId: string,
) {
  const result = await query<{ id: string }>(
    `delete from owned_units ou
      using editions e,content_units cu
      where ou.profile_id=$1
        and ou.edition_id=$2
        and ou.unit_id=$3
        and e.id=ou.edition_id
        and e.work_id=$4
        and cu.id=ou.unit_id
        and cu.edition_id=e.id
        and cu.work_id=e.work_id
        and cu.unit_type='VOLUME'
      returning ou.id`,
    [profileId, editionId, unitId, workId],
  );

  return result.rows.length > 0;
}
