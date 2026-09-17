import "server-only";
import { query } from "@/lib/db";

export async function getBookShelfEditionMeta(
  profileId: string,
  workIds: string[],
) {
  if (!workIds.length) return new Map<string, { edition: string | null; format: string | null }>();

  const result = await query<{
    work_id: string;
    edition_name: string | null;
    edition_format: string | null;
  }>(
    `select distinct on (e.work_id)
            e.work_id,
            coalesce(nullif(btrim(o.custom_name),''),e.name) as edition_name,
            coalesce(nullif(btrim(o.custom_format),''),e.format) as edition_format
       from editions e
       left join ownership o
         on o.edition_id=e.id and o.profile_id=$1
      where e.work_id=any($2::uuid[])
      order by e.work_id,
               (o.profile_id is not null) desc,
               e.is_canonical desc,
               e.publication_year desc nulls last`,
    [profileId, workIds],
  );

  return new Map(
    result.rows.map((row) => [
      row.work_id,
      { edition: row.edition_name, format: row.edition_format },
    ] as const),
  );
}
