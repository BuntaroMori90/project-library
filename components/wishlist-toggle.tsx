import { Bookmark } from "lucide-react";
import { query } from "@/lib/db";
import { toggleWorkWishlist } from "@/app/library/wishlist-actions";

export async function WishlistToggle({ profileId, workId, returnPath }: { profileId: string; workId: string; returnPath: string }) {
  const result = await query<{ id: string }>(
    "select id from wishlist where profile_id=$1 and work_id=$2 and edition_id is null and unit_id is null limit 1",
    [profileId, workId],
  );
  const active = Boolean(result.rows[0]);

  return <form action={toggleWorkWishlist}>
    <input type="hidden" name="workId" value={workId}/>
    <input type="hidden" name="returnPath" value={returnPath}/>
    <button type="submit" className={`soft-action ${active ? "active" : ""}`} aria-pressed={active}>
      <Bookmark size={16} fill={active ? "currentColor" : "none"}/>
      {active ? "Nella wishlist" : "Aggiungi alla wishlist"}
    </button>
  </form>;
}
