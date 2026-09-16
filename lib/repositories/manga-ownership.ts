import "server-only";
import { query } from "@/lib/db";

type OwnedVolumeRow = {
  work_id: string;
  unit_number: string | number;
};

async function getOwnedVolumeRows(profileId: string, workIds: string[]) {
  if (!workIds.length) return [] as OwnedVolumeRow[];

  const result = await query<OwnedVolumeRow>(
    `with explicit_owned as (
       select e.work_id,cu.unit_number
         from owned_units ou
         join content_units cu on cu.id=ou.unit_id
         join editions e on e.id=ou.edition_id
        where ou.profile_id=$1
          and e.work_id=any($2::uuid[])
          and cu.unit_type='VOLUME'
          and cu.unit_number is not null
     ), personal_specials as (
       select e.work_id,cu.unit_number
         from ownership o
         join editions e on e.id=o.edition_id
         join content_units cu on cu.edition_id=e.id
        where o.profile_id=$1
          and e.work_id=any($2::uuid[])
          and o.ownership_format='PHYSICAL'
          and o.custom_format is not null
          and lower(o.custom_format) <> 'standard'
          and cu.unit_type='VOLUME'
          and cu.unit_number is not null
     )
     select distinct work_id,unit_number from (
       select * from explicit_owned
       union all
       select * from personal_specials
     ) owned
     order by work_id,unit_number`,
    [profileId, workIds],
  );

  return result.rows;
}

export async function getMangaOwnedVolumeNumbers(
  profileId: string,
  workId: string,
) {
  const rows = await getOwnedVolumeRows(profileId, [workId]);
  return new Set(rows.map((row) => Number(row.unit_number)));
}

export async function getMangaOwnedCounts(
  profileId: string,
  workIds: string[],
) {
  const rows = await getOwnedVolumeRows(profileId, workIds);
  const grouped = new Map<string, Set<number>>();

  for (const row of rows) {
    const current = grouped.get(row.work_id) ?? new Set<number>();
    current.add(Number(row.unit_number));
    grouped.set(row.work_id, current);
  }

  return new Map(
    Array.from(grouped.entries(), ([workId, volumes]) => [workId, volumes.size]),
  );
}
