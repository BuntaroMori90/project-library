import "server-only";
import { withTransaction } from "@/lib/db";

export async function saveManualBookAuthors(workId: string, rawAuthors: string | null) {
  if (!rawAuthors) return;

  const authors = Array.from(
    new Set(
      rawAuthors
        .split(/[;,]+/)
        .map((author) => author.trim())
        .filter(Boolean),
    ),
  );
  if (!authors.length) return;

  await withTransaction(async (client) => {
    const source = await client.query<{ manual: boolean; catalog: boolean }>(
      `select
         exists(select 1 from external_ids where work_id=$1 and provider='MANUAL') as manual,
         exists(select 1 from external_ids where work_id=$1 and provider='OPEN_LIBRARY') as catalog`,
      [workId],
    );
    const canEdit = Boolean(source.rows[0]?.manual && !source.rows[0]?.catalog);
    if (!canEdit) return;

    await client.query(
      "delete from work_creators where work_id=$1 and role='AUTHOR'",
      [workId],
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
  });
}

