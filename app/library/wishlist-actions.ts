"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/profile";
import { withTransaction } from "@/lib/db";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function toggleWorkWishlist(formData: FormData) {
  const workId = String(formData.get("workId") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "");
  if (!UUID.test(workId)) return;

  const { profile } = await requireProfile();
  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      "select id from wishlist where profile_id=$1 and work_id=$2 and edition_id is null and unit_id is null limit 1",
      [profile.id, workId],
    );
    if (existing.rows[0]) {
      await client.query("delete from wishlist where id=$1", [
        existing.rows[0].id,
      ]);
    } else {
      await client.query(
        "insert into wishlist (profile_id,work_id,priority) values ($1,$2,'NORMAL')",
        [profile.id, workId],
      );
    }
  });

  revalidatePath("/library");
  revalidatePath("/library/wishlist");
  if (returnPath.startsWith("/library/")) revalidatePath(returnPath);
}
