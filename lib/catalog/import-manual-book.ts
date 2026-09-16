import "server-only";
import { withTransaction } from "@/lib/db";

function parseAuthors(rawAuthors?: string | null) {
  if (!rawAuthors) return [];
  return Array.from(
    new Set(
      rawAuthors
        .split(/[;,]+/)
        .map((author) => author.trim())
        .filter(Boolean),
    ),
  );
}

export async function createManualBook(title: string, rawAuthors?: string | null) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Inserisci almeno il titolo del libro.");
  const authors = parseAuthors(rawAuthors);

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

    for (const name of authors) {
      const existing = await client.query<{ id: string }>(
        "select id from creators where lower(name)=lower($1) limit 1",
        [name],
      );
      const creatorId =
        existing.rows[0]?.id ??
        (
          await client.query<{ id: string }>(
            "insert into creators (name) values ($1) returning id",
            [name],
          )
        ).rows[0]?.id;

      if (!creatorId) continue;
      await client.query(
        `insert into work_creators (work_id,creator_id,role)
         values ($1,$2,'AUTHOR')
         on conflict (work_id,creator_id,role) do nothing`,
        [workId, creatorId],
      );
    }

    const edition = await client.query<{ id: string }>(
      `insert into editions (work_id,name,is_canonical)
       values ($1,'Edizione da completare',true) returning id`,
      [workId],
    );

    return { workId, editionId: edition.rows[0].id };
  });
}
