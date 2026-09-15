import "server-only";
import { withTransaction } from "@/lib/db";
import type { MangaCatalogResult } from "@/lib/catalog/types";

export async function importMangaToCatalog(manga: MangaCatalogResult) {
  return withTransaction(async (client) => {
    let provider: "MAL" | "KITSU";
    if (manga.provider === "MAL" || manga.provider === "JIKAN_DEV") {
      provider = "MAL";
    } else if (manga.provider === "KITSU") {
      provider = "KITSU";
    } else {
      throw new Error(`Unsupported manga provider: ${manga.provider}`);
    }

    const existingExternal = await client.query<{ work_id: string }>(
      "select work_id from external_ids where provider=$1 and external_id=$2 limit 1",
      [provider, manga.providerId],
    );
    let workId = existingExternal.rows[0]?.work_id;

    if (!workId) {
      const created = await client.query<{ id: string }>(
        `insert into works (
          media_type,title,original_title,description,release_year,publication_status,cover_url,genres,total_volumes,total_chapters
        ) values ('MANGA',$1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [manga.title, manga.originalTitle ?? null, manga.description ?? null, manga.releaseYear ?? null, manga.publicationStatus, manga.coverUrl ?? null, manga.genres, manga.volumeCount ?? null, manga.chapterCount ?? null],
      );
      workId = created.rows[0].id;
      await client.query(
        "insert into external_ids (work_id,provider,external_id) values ($1,$2,$3)",
        [workId, provider, manga.providerId],
      );
    } else {
      await client.query(
        `update works set title=$2, original_title=$3, description=$4, release_year=$5,
         publication_status=$6, cover_url=coalesce($7,cover_url), genres=$8,
         total_volumes=coalesce($9,total_volumes), total_chapters=coalesce($10,total_chapters), updated_at=now()
         where id=$1`,
        [workId, manga.title, manga.originalTitle ?? null, manga.description ?? null, manga.releaseYear ?? null, manga.publicationStatus, manga.coverUrl ?? null, manga.genres, manga.volumeCount ?? null, manga.chapterCount ?? null],
      );
    }

    for (const creator of manga.creators) {
      const existing = await client.query<{ id: string }>(
        "select id from creators where lower(name)=lower($1) limit 1",
        [creator.name],
      );
      const creatorId =
        existing.rows[0]?.id ??
        (
          await client.query<{ id: string }>(
            "insert into creators (name) values ($1) returning id",
            [creator.name],
          )
        ).rows[0].id;
      await client.query(
        `insert into work_creators (work_id,creator_id,role) values ($1,$2,$3)
         on conflict (work_id,creator_id,role) do nothing`,
        [workId, creatorId, creator.role],
      );
    }

    const canonical = await client.query<{ id: string }>(
      "select id from editions where work_id=$1 and is_canonical=true limit 1",
      [workId],
    );
    let editionId = canonical.rows[0]?.id;
    if (!editionId) {
      const created = await client.query<{ id: string }>(
        "insert into editions (work_id,name,total_units,is_canonical) values ($1,'Edizione catalogo',$2,true) returning id",
        [workId, manga.volumeCount ?? null],
      );
      editionId = created.rows[0].id;
    } else {
      await client.query(
        "update editions set total_units=coalesce($2,total_units), updated_at=now() where id=$1",
        [editionId, manga.volumeCount ?? null],
      );
    }

    if (manga.volumeCount && manga.volumeCount > 0) {
      for (let number = 1; number <= manga.volumeCount; number += 1) {
        await client.query(
          `insert into content_units (work_id,edition_id,unit_type,unit_number,sort_order)
           values ($1,$2,'VOLUME',$3,$3)
           on conflict (edition_id,unit_type,unit_number) where edition_id is not null and unit_number is not null do nothing`,
          [workId, editionId, number],
        );
      }
    }

    return { workId, editionId };
  });
}
