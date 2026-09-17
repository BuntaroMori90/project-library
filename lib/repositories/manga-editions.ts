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
  if (values.totalVolumes != null && (!Number.isInteger(values.totalVolumes) || values.totalVolumes < 1 || values.totalVolumes > 10_000)) {
    throw new Error("Il totale deve essere un numero intero tra 1 e 10000.");
  }
  return withTransaction(async (client) => {
    const workResult = await client.query<{
      id: string;
      cover_url: string | null;
      manual: boolean;
    }>(
      `select w.id,w.cover_url,
              exists(
                select 1 from external_ids x
                 where x.work_id=w.id and x.provider='MANUAL'
              ) as manual
         from works w
        where w.id=$1 and w.media_type='MANGA'
        limit 1`,
      [workId],
    );
    const work = workResult.rows[0];
    if (!work) throw new Error("Manga non valido.");

    const isStandard = values.editionType?.toLowerCase() === "standard";
    const fallbackName = isStandard
      ? "Edizione personale"
      : [
          values.editionType,
          values.volumeNumber ? `Vol. ${values.volumeNumber}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Edizione personale";

    let editionId: string | null = null;

    if (isStandard) {
      const existingStandard = await client.query<{ id: string }>(
        `select e.id
           from editions e
           join ownership o on o.edition_id=e.id
          where e.work_id=$1
            and o.profile_id=$2
            and lower(coalesce(o.custom_format,''))='standard'
          order by o.updated_at desc
          limit 1`,
        [workId, profileId],
      );
      editionId = existingStandard.rows[0]?.id ?? null;

      if (!editionId && work.manual) {
        const placeholder = await client.query<{ id: string }>(
          `select e.id
             from editions e
            where e.work_id=$1 and e.is_canonical=true
            order by e.created_at
            limit 1`,
          [workId],
        );
        editionId = placeholder.rows[0]?.id ?? null;
      }
    }

    if (!editionId) {
      const editionResult = await client.query<{ id: string }>(
        `insert into editions
           (work_id,name,total_units,source_provider,source_external_id,is_canonical,created_at,updated_at)
         values ($1,$2,$3,'MANUAL',concat($4::text,':',gen_random_uuid()::text),false,now(),now())
         returning id`,
        [workId, values.name || fallbackName, values.totalVolumes, profileId],
      );
      editionId = editionResult.rows[0].id;
    } else {
      await client.query(
        `update editions
            set name=coalesce($2,name),
                total_units=coalesce($3,total_units),
                source_provider=case when $4 then 'MANUAL' else source_provider end,
                source_external_id=case
                  when $4 then coalesce(source_external_id,$5)
                  else source_external_id
                end,
                updated_at=now()
          where id=$1`,
        [editionId, values.name, values.totalVolumes, work.manual, workId],
      );
    }

    const existingOwnership = await client.query<{ edition_id: string }>(
      `select edition_id from ownership
        where profile_id=$1 and edition_id=$2
        limit 1`,
      [profileId, editionId],
    );

    if (existingOwnership.rows[0]) {
      await client.query(
        `update ownership
            set ownership_format='PHYSICAL',
                custom_name=coalesce($3,custom_name),
                custom_publisher=coalesce($4,custom_publisher),
                custom_language=coalesce($5,custom_language),
                custom_format=coalesce($6,custom_format),
                custom_cover_url=coalesce($7,custom_cover_url),
                custom_isbn=coalesce($8,custom_isbn),
                custom_publication_year=coalesce($9,custom_publication_year),
                updated_at=now()
          where profile_id=$1 and edition_id=$2`,
        [
          profileId,
          editionId,
          values.name,
          values.publisher,
          values.language,
          values.editionType,
          values.coverUrl,
          values.isbn,
          values.publicationYear,
        ],
      );
    } else {
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
    }

    if (values.totalVolumes && values.totalVolumes > 0) {
      await client.query(
        `insert into content_units
           (work_id,edition_id,unit_type,unit_number,sort_order)
         select $1,$2,'VOLUME',number,number
           from generate_series(1,$3::integer) as number
         on conflict (edition_id,unit_type,unit_number)
           where edition_id is not null and unit_number is not null
         do nothing`,
        [workId, editionId, values.totalVolumes],
      );
    } else if (values.volumeNumber && values.volumeNumber > 0) {
      const unitResult = await client.query<{ id: string }>(
        `insert into content_units
           (work_id,edition_id,unit_type,unit_number,sort_order,cover_url)
         values ($1,$2,'VOLUME',$3,$3,$4)
         on conflict (edition_id,unit_type,unit_number)
           where edition_id is not null and unit_number is not null
         do update set cover_url=coalesce(excluded.cover_url,content_units.cover_url)
         returning id`,
        [workId, editionId, values.volumeNumber, values.coverUrl],
      );

      const unitId = unitResult.rows[0]?.id;
      if (!isStandard && unitId) {
        await client.query(
          `insert into owned_units (profile_id,edition_id,unit_id)
           values ($1,$2,$3)
           on conflict (profile_id,edition_id,unit_id) do nothing`,
          [profileId, editionId, unitId],
        );
      }
    }

    if (isStandard && work.manual) {
      const coverValue = values.coverUrl
        ? values.coverUrl.startsWith("data:image/")
          ? `/api/library/cover/work/${workId}`
          : values.coverUrl
        : null;

      await client.query(
        `update works
            set cover_url=case
                  when $2::text is not null
                    and (cover_url is null or cover_url like '/api/library/cover/work/%')
                    then $2
                  else cover_url
                end,
                total_volumes=coalesce($3,total_volumes),
                updated_at=now()
          where id=$1`,
        [workId, coverValue, values.totalVolumes],
      );
    }

    return editionId;
  });
}
