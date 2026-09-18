import "server-only";
import { withTransaction } from "@/lib/db";

export type CatalogDestination = "library" | "wishlist";
export type LibraryStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

export async function saveCatalogDestination(
  profileId: string,
  workId: string,
  destination: CatalogDestination,
  status: LibraryStatus = "PLANNED",
) {
  return withTransaction(async (client) => {
    const library = await client.query<{ id: string }>(
      "select id from library_entries where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    );

    if (destination === "wishlist") {
      if (library.rows[0])
        return { placement: "library" as const, alreadyPresent: true };
      const inserted = await client.query<{ id: string }>(
        `insert into wishlist (profile_id,work_id,priority)
         values ($1,$2,'NORMAL')
         on conflict do nothing returning id`,
        [profileId, workId],
      );
      return {
        placement: "wishlist" as const,
        alreadyPresent: !inserted.rows[0],
      };
    }

    const inserted = await client.query<{ id: string }>(
      `insert into library_entries (profile_id,work_id,status)
       values ($1,$2,$3) on conflict (profile_id,work_id) do nothing returning id`,
      [profileId, workId, status],
    );
    await client.query(
      "delete from wishlist where profile_id=$1 and work_id=$2 and edition_id is null and unit_id is null",
      [profileId, workId],
    );
    return {
      placement: "library" as const,
      alreadyPresent: !inserted.rows[0],
    };
  });
}
