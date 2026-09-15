import "server-only";
import { withTransaction } from "@/lib/db";
import type { BookEditionOverrides } from "@/lib/repositories/personal";

export async function createPersonalBookEdition(
  profileId: string,
  workId: string,
  values: BookEditionOverrides,
) {
  return withTransaction(async (client) => {
    const workResult = await client.query<{ id: string }>(
      "select id from works where id=$1 and media_type='BOOK' limit 1",
      [workId],
    );
    if (!workResult.rows[0]) throw new Error("Libro non valido.");

    const editionResult = await client.query<{ id: string }>(
      `insert into editions
         (work_id,name,source_provider,source_external_id,is_canonical,created_at,updated_at)
       values ($1,$2,'MANUAL',$3::text || ':' || gen_random_uuid()::text,false,now(),now())
       returning id`,
      [workId, values.name || "Edizione personale", profileId],
    );
    const editionId = editionResult.rows[0].id;

    await client.query(
      `insert into ownership
         (profile_id,edition_id,ownership_format,custom_name,custom_publisher,
          custom_language,custom_format,custom_cover_url,custom_page_count,
          custom_isbn,custom_publication_year,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())`,
      [
        profileId,
        editionId,
        values.format?.toLowerCase().includes("ebook") ? "DIGITAL" : "PHYSICAL",
        values.name || "Edizione personale",
        values.publisher,
        values.language,
        values.format,
        values.coverUrl,
        values.pageCount,
        values.isbn,
        values.publicationYear,
      ],
    );

    await client.query(
      `insert into progress
         (profile_id,work_id,edition_id,total_pages,updated_at)
       values ($1,$2,$3,$4,now())
       on conflict (profile_id,work_id) do update set
         edition_id=excluded.edition_id,
         total_pages=coalesce(excluded.total_pages,progress.total_pages),
         percentage=case
           when progress.current_page is not null and coalesce(excluded.total_pages,progress.total_pages) > 0
             then least(100,round((progress.current_page::numeric / coalesce(excluded.total_pages,progress.total_pages)) * 100,1))
           else progress.percentage
         end,
         updated_at=now()`,
      [profileId, workId, editionId, values.pageCount],
    );

    return editionId;
  });
}
