import "server-only";
import { withTransaction } from "@/lib/db";

function normalizeTotalVolumes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  const total = Math.floor(value);
  return total > 0 ? total : null;
}

export async function createManualManga(
  title: string,
  totalVolumes: number | null = null,
) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Inserisci almeno il titolo del manga.");
  const total = normalizeTotalVolumes(totalVolumes);

  return withTransaction(async (client) => {
    const created = await client.query<{ id: string }>(
      `insert into works (media_type,title,publication_status,total_volumes)
       values ('MANGA',$1,'UNKNOWN',$2) returning id`,
      [cleanTitle, total],
    );
    const workId = created.rows[0].id;

    await client.query(
      `insert into external_ids (work_id,provider,external_id)
       values ($1,'MANUAL',$2)`,
      [workId, workId],
    );

    const edition = await client.query<{ id: string }>(
      `insert into editions
         (work_id,name,total_units,source_provider,source_external_id,is_canonical)
       values ($1,'Edizione da completare',$2,'MANUAL',$3,true)
       returning id`,
      [workId, total, workId],
    );
    const editionId = edition.rows[0].id;

    if (total) {
      for (let number = 1; number <= total; number += 1) {
        await client.query(
          `insert into content_units
             (work_id,edition_id,unit_type,unit_number,sort_order)
           values ($1,$2,'VOLUME',$3,$3)
           on conflict (edition_id,unit_type,unit_number)
             where edition_id is not null and unit_number is not null
           do nothing`,
          [workId, editionId, number],
        );
      }
    }

    return { workId, editionId };
  });
}
