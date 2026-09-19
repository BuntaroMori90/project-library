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

    const seasons = [...new Map((anime.seasons ?? []).map((season) => [season.number, season])).values()];
    if (seasons.length) {
      await client.query(
        `insert into content_units
          (work_id,edition_id,parent_unit_id,unit_type,unit_number,title,release_date,cover_url,sort_order,source_provider,source_external_id)
         select $1,null,null,'SEASON',s.number,s.title,s.premiere_date,s.cover_url,s.number,'TVMAZE',s.provider_id
         from jsonb_to_recordset($2::jsonb) as s(number integer,title text,premiere_date date,cover_url text,provider_id text)
         on conflict (work_id,unit_type,unit_number) where edition_id is null and parent_unit_id is null and unit_number is not null
         do update set title=excluded.title,release_date=excluded.release_date,cover_url=excluded.cover_url,
           source_provider=excluded.source_provider,source_external_id=excluded.source_external_id`,
        [workId, JSON.stringify(seasons.map((season) => ({ number: season.number,
          title: season.title ?? (season.number === 0 ? "Speciali" : `Stagione ${season.number}`),
          premiere_date: season.premiereDate ?? null,cover_url: season.coverUrl ?? null,provider_id: season.providerId })))],
      );
    }
    const episodes = [...new Map((anime.episodes ?? []).map((episode) => [`${episode.seasonNumber}:${episode.episodeNumber}`, episode])).values()];
    if (episodes.length) {
      await client.query(
        `insert into content_units
          (work_id,edition_id,parent_unit_id,unit_type,unit_number,title,release_date,sort_order,source_provider,source_external_id)
         select $1,null,parent.id,'EPISODE',ep.number,ep.title,ep.air_date,ep.number,'TVMAZE',ep.provider_id
         from jsonb_to_recordset($2::jsonb) as ep(season integer,number integer,title text,air_date date,provider_id text)
         join content_units parent on parent.work_id=$1 and parent.unit_type='SEASON'
           and parent.edition_id is null and parent.parent_unit_id is null and parent.unit_number=ep.season
         on conflict (parent_unit_id,unit_type,unit_number) where parent_unit_id is not null and unit_number is not null
         do update set title=excluded.title,release_date=excluded.release_date,
           source_provider=excluded.source_provider,source_external_id=excluded.source_external_id`,
        [workId, JSON.stringify(episodes.map((episode) => ({ season: episode.seasonNumber, number: episode.episodeNumber,
          title: episode.title ?? null,air_date: episode.airDate ?? null,provider_id: episode.providerId })))],
      );
    }

    return { workId };
  });
}
