import "server-only";
import { withTransaction } from "@/lib/db";

function normalizePositiveInteger(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  const parsed = Math.floor(value);
  return parsed > 0 ? parsed : null;
}

export async function createManualAnime(
  title: string,
  studio: string | null = null,
  coverUrl: string | null = null,
  totalSeasons: number | null = null,
  totalEpisodes: number | null = null,
) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Inserisci almeno il titolo dell'anime.");
  const cleanStudio = studio?.trim() || null;
  const seasons = normalizePositiveInteger(totalSeasons);
  const episodes = normalizePositiveInteger(totalEpisodes);

  return withTransaction(async (client) => {
    const created = await client.query<{ id: string }>(
      `insert into works
         (media_type,title,publication_status,cover_url,total_seasons,total_episodes)
       values ('ANIME',$1,'UNKNOWN',$2,$3,$4)
       returning id`,
      [cleanTitle, coverUrl, seasons, episodes],
    );
    const workId = created.rows[0].id;

    await client.query(
      `insert into external_ids (work_id,provider,external_id)
       values ($1,'MANUAL',$2)`,
      [workId, workId],
    );

    if (cleanStudio) {
      const existing = await client.query<{ id: string }>(
        "select id from creators where lower(name)=lower($1) limit 1",
        [cleanStudio],
      );
      const creatorId =
        existing.rows[0]?.id ??
        (
          await client.query<{ id: string }>(
            "insert into creators (name) values ($1) returning id",
            [cleanStudio],
          )
        ).rows[0]?.id;

      if (creatorId) {
        await client.query(
          `insert into work_creators (work_id,creator_id,role)
           values ($1,$2,'STUDIO')
           on conflict (work_id,creator_id,role) do nothing`,
          [workId, creatorId],
        );
      }
    }

    return { workId };
  });
}
