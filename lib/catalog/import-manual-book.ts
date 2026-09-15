import "server-only";
import { withTransaction } from "@/lib/db";

export async function createManualBook(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Inserisci almeno il titolo del libro.");

  return withTransaction(async (client) => {
    const created = await client.query<{ id: string }>(
      `insert into works (media_type,title,publication_status)
       values ('BOOK',$1,'UNKNOWN') returning id`,
      [cleanTitle],
    );
    const workId = created.rows[0].id;

    await client.query(
      `insert into external_ids (work_id,provider,external_id)
       values ($1,'MANUAL',$2)`,
      [workId, workId],
    );

    const edition = await client.query<{ id: string }>(
      `insert into editions (work_id,name,is_canonical)
       values ($1,'Edizione da completare',true) returning id`,
      [workId],
    );

    return { workId, editionId: edition.rows[0].id };
  });
}
