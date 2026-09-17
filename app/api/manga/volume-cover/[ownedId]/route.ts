import { createHash } from "node:crypto";
import { getApiProfile } from "@/lib/profile";
import { getOwnedVolumeCover } from "@/lib/repositories/owned-volume-covers";
import { UUID } from "@/lib/inventory/volume-cover";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ownedId: string }> },
) {
  const identity = await getApiProfile();
  if (!identity) return new Response("Unauthorized", { status: 401 });
  const { ownedId } = await params;
  if (!UUID.test(ownedId)) return new Response("Not found", { status: 404 });
  const cover = await getOwnedVolumeCover(identity.profile.id, ownedId);
  const match = cover?.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(match[2], "base64");
  const etag = '"' + createHash("sha256").update(bytes).digest("hex") + '"';
  const headers = {
    "Content-Type": match[1],
    "Cache-Control": "private, no-cache",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(bytes, { headers });
}
