import "server-only";
import { withTransaction } from "@/lib/db";

export type RemovableMediaType = "MANGA" | "ANIME";

export async function removeWorkFromLibrary(
  profileId: string,
  workId: string,
  mediaType: RemovableMediaType,
) {
  await withTransaction(async (client) => {
    const workResult = await client.query<{ id: string }>(
      "select id from works where id=$1 and media_type=$2 limit 1",
      [workId, mediaType],
    );
    if (!workResult.rows[0]) {
      throw new Error("Opera non valida.");
    }

    await client.query(
      `delete from owned_units
        where profile_id=$1
          and edition_id in (select id from editions where work_id=$2)`,
      [profileId, workId],
    );

    await client.query(
      `delete from ownership
        where profile_id=$1
          and edition_id in (select id from editions where work_id=$2)`,
      [profileId, workId],
    );

    await client.query(
      "delete from progress where profile_id=$1 and work_id=$2",
      [profileId, workId],
    );

    await client.query(
      "delete from library_entries where profile_id=$1 and work_id=$2",
      [profileId, workId],
    );

    if (mediaType === "MANGA") {
      await client.query(
        `delete from editions e
          where e.work_id=$1
            and e.is_canonical=false
            and e.source_provider in ('USER','MANUAL')
            and not exists (select 1 from ownership o where o.edition_id=e.id)`,
        [workId],
      );

      await client.query(
        `update works
            set cover_url=null,updated_at=now()
          where id=$1 and cover_url like '/api/library/cover/work/%'`,
        [workId],
      );
    }
  });
}
