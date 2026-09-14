import "server-only";
import { withTransaction } from "@/lib/db";
import type { AnimeCatalogResult } from "@/lib/catalog/types";

export async function importAnimeToCatalog(anime: AnimeCatalogResult) {
  return withTransaction(async (client) => {
    const existingExternal = await client.query<{ work_id: string }>(
      "select work_id from external_ids where provider='TVMAZE' and external_id=$1 limit 1",
      [anime.providerId],
    );
    let workId = existingExternal.rows[0]?.work_id;

    if (!workId) {
      const created = await client.query<{ id: string }>(
        `insert into works (
          media_type,title,original_title,description,release_year,publication_status,cover_url,genres,total_seasons,total_episodes
        ) values ('ANIME',$1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [anime.title, anime.originalTitle ?? null, anime.description ?? null, anime.releaseYear ?? null, anime.publicationStatus, anime.coverUrl ?? null, anime.genres, anime.seasonCount ?? null, anime.episodeCount ?? null],
      );
      workId = created.rows[0].id;
      await client.query("insert into external_ids (work_id,provider,external_id) values ($1,'TVMAZE',$2)", [workId, anime.providerId]);
    } else {
      await client.query(
        `update works set title=$2, original_title=$3, description=$4, release_year=$5,
         publication_status=$6, cover_url=$7, genres=$8, total_seasons=$9, total_episodes=$10, updated_at=now()
         where id=$1`,
        [workId, anime.title, anime.originalTitle ?? null, anime.description ?? null, anime.releaseYear ?? null, anime.publicationStatus, anime.coverUrl ?? null, anime.genres, anime.seasonCount ?? null, anime.episodeCount ?? null],
      );
    }

    const seasonIdByNumber = new Map<number, string>();
    for (const season of anime.seasons ?? []) {
      const seasonRow = await client.query<{ id: string }>(
        `insert into content_units (
          work_id,edition_id,parent_unit_id,unit_type,unit_number,title,release_date,cover_url,sort_order,source_provider,source_external_id
        ) values ($1,null,null,'SEASON',$2,$3,$4,$5,$2,'TVMAZE',$6)
        on conflict (work_id,unit_type,unit_number) where edition_id is null and parent_unit_id is null and unit_number is not null
        do update set title=excluded.title, release_date=excluded.release_date, cover_url=excluded.cover_url,
          source_provider=excluded.source_provider, source_external_id=excluded.source_external_id
        returning id`,
        [workId, season.number, season.title ?? (season.number === 0 ? "Speciali" : `Stagione ${season.number}`), season.premiereDate ?? null, season.coverUrl ?? null, season.providerId],
      );
      seasonIdByNumber.set(season.number, seasonRow.rows[0].id);
    }

    for (const episode of anime.episodes ?? []) {
      let parentId = seasonIdByNumber.get(episode.seasonNumber);
      if (!parentId) {
        const existingSeason = await client.query<{ id: string }>(
          "select id from content_units where work_id=$1 and unit_type='SEASON' and parent_unit_id is null and unit_number=$2 limit 1",
          [workId, episode.seasonNumber],
        );
        parentId = existingSeason.rows[0]?.id;
      }
      if (!parentId) continue;
      await client.query(
        `insert into content_units (
          work_id,edition_id,parent_unit_id,unit_type,unit_number,title,release_date,sort_order,source_provider,source_external_id
        ) values ($1,null,$2,'EPISODE',$3,$4,$5,$3,'TVMAZE',$6)
        on conflict (parent_unit_id,unit_type,unit_number) where parent_unit_id is not null and unit_number is not null
        do update set title=excluded.title, release_date=excluded.release_date,
          source_provider=excluded.source_provider, source_external_id=excluded.source_external_id`,
        [workId, parentId, episode.episodeNumber, episode.title ?? null, episode.airDate ?? null, episode.providerId],
      );
    }

    return { workId };
  });
}
