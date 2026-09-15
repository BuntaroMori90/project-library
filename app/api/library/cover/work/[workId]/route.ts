import { getApiProfile } from "@/lib/profile";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workId: string }> },
) {
  const session = await getApiProfile();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { workId } = await params;
  if (!UUID.test(workId)) return new Response("Not found", { status: 404 });

  const result = await query<{ custom_cover_url: string | null }>(
    `select o.custom_cover_url
       from progress p
       join ownership o
         on o.profile_id=p.profile_id
        and o.edition_id=p.edition_id
      where p.profile_id=$1 and p.work_id=$2
      limit 1`,
    [session.profile.id, workId],
  );
  const value = result.rows[0]?.custom_cover_url ?? null;
  if (!value?.startsWith("data:image/")) {
    return new Response("Not found", { status: 404 });
  }

  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
  if (!match) return new Response("Unsupported image", { status: 415 });

  const [, mime, payload] = match;
  const bytes = Buffer.from(payload, "base64");

  return new Response(bytes, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
