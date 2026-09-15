import "server-only";
import { withTransaction } from "@/lib/db";

export type PersonalMangaEditionInput = {
  name: string | null;
  publisher: string | null;
  language: string | null;
  editionType: string | null;
  coverUrl: string | null;
  isbn: string | null;
  publicationYear: number | null;
  volumeNumber: number | null;
  totalVolumes: number | null;
};

export async function createPersonalMangaEdition(
  profileId: string,
  workId: string,
  values: PersonalMangaEditionInput,
) {
  return withTransaction(async (client) => {
    const workResult = await client.query<{ id: string }>(
      "select id from works where id=$1 and media_type='MANGA' limit 1",
      [workId],
    );
    if (!workResult.rows[0]) throw new Error("Manga non valido.");

    const isStandard = values.editionType?.toLowerCase() === "standard";
    const fallbackName = isStandard
      ? "Edizione personale"
      : [
          values.editionType,
          values.volumeNumber ? `Vol. ${values.volumeNumber}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Edizione personale";

    const editionResult = await client.query<{ id: string }>(
      `insert into editions
         (work_id,name,total_units,source_provider,source_external_id,is_canonical,created_at,updated_at)
       values ($1,$2,$3,'MANUAL',concat($4,':',gen_random_uuid()::text),false,now(),now())
       returning id`,
      [workId, values.name || fallbackName, values.totalVolumes, profileId],
    );
    const editionId = editionResult.rows[0].id;

    await client.query(
      `insert into ownership
         (profile_id,edition_id,ownership_format,custom_name,custom_publisher,
          custom_language,custom_format,custom_cover_url,custom_isbn,
          custom_publication_year,updated_at)
       values ($1,$2,'PHYSICAL',$3,$4,$5,$6,$7,$8,$9,now())`,
      [
        profileId,
        editionId,
        values.name || fallbackName,
        values.publisher,
        values.language,
        values.editionType,
        values.coverUrl,
        values.isbn,
        values.publicationYear,
      ],
    );

    if (values.totalVolumes && values.totalVolumes > 0) {
      for (let number = 1; number <= values.totalVolumes; number += 1) {
        await client.query(
          `insert into content_units
             (work_id,edition_id,unit_type,unit_number,sort_order)
           values ($1,$2,'VOLUME',$3,$3)
           on conflict (edition_id,unit_type,unit_number)
             where edition_id is not null and unit_number is not null
           do nothing`,
          [workId, editionId, number],
        );
      }
    } else if (values.volumeNumber && values.volumeNumber > 0) {
      await client.query(
        `insert into content_units
           (work_id,edition_id,unit_type,unit_number,sort_order,cover_url)
         values ($1,$2,'VOLUME',$3,$3,$4)
         on conflict (edition_id,unit_type,unit_number)
           where edition_id is not null and unit_number is not null
         do update set cover_url=coalesce(excluded.cover_url,content_units.cover_url)`,
        [workId, editionId, values.volumeNumber, values.coverUrl],
      );
    }

    return editionId;
  });
}
