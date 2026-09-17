import "server-only";
import { query } from "@/lib/db";

export async function listLibraryCreatedOrder(profileId: string) {
  return query<{
    work_id: string;
    created_at: Date;
  }>(
    `select work_id,created_at
       from library_entries
      where profile_id=$1
      order by created_at desc`,
    [profileId],
  );
}
