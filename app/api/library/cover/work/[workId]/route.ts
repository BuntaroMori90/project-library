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

  const result = await query<{ cover_url: string | null }>(
    `select coalesce(
       (
         select o.custom_cover_url
           from ownership o
           join editions e on e.id=o.edition_id
           left join progress p
             on p.profile_id=o.profile_id
            and p.work_id=e.work_id
            and p.edition_id=o.edition_id
          where o.profile_id=$1
            and e.work_id=$2
            and o.custom_cover_url like 'data:image/%'
          order by (p.edition_id is not null) desc,
                   (lower(coalesce(o.custom_format,''))='standard') desc,
                   o.updated_at desc
          limit 1
       ),
       (
         select e.cover_url
           from progress p
           join editions e on e.id=p.edition_id
          where p.profile_id=$1
            and p.work_id=$2
            and e.cover_url like 'data:image/%'
          limit 1
       ),
       (
         select e.cover_url
           from editions e
          where e.work_id=$2
            and e.cover_url like 'data:image/%'
          order by e.is_canonical desc,
                   e.publication_year desc nulls last,
                   e.id
          limit 1
       ),
       w.cover_url
     ) as cover_url
       from works w
       join library_entries le
         on le.work_id=w.id
        and le.profile_id=$1
      where w.id=$2
        and w.media_type='BOOK'
      limit 1`,
    [session.profile.id, workId],
  );
  const value = result.rows[0]?.cover_url ?? null;
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
