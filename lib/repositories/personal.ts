import "server-only";
import { query, withTransaction } from "@/lib/db";

export type LibraryStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED" | "DROPPED";

export async function setLibraryStatus(profileId: string, workId: string, status: LibraryStatus) {
  await query(
    `insert into library_entries (profile_id, work_id, status, updated_at)
     values ($1,$2,$3,now())
     on conflict (profile_id,work_id) do update set status=excluded.status, updated_at=now()`,
    [profileId, workId, status],
  );
}

export async function setLibraryPersonal(profileId: string, workId: string, values: { favorite: boolean; rating: number | null; notes: string | null }) {
  await query(
    `insert into library_entries (profile_id,work_id,favorite,rating,notes,updated_at)
     values ($1,$2,$3,$4,$5,now())
     on conflict (profile_id,work_id) do update set
       favorite=excluded.favorite, rating=excluded.rating, notes=excluded.notes, updated_at=now()`,
    [profileId, workId, values.favorite, values.rating, values.notes],
  );
}

export async function setBookProgress(profileId: string, workId: string, currentPage: number | null, totalPages: number | null, percentage: number | null) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress (profile_id,work_id,current_page,total_pages,percentage,updated_at)
       values ($1,$2,$3,$4,$5,now())
       on conflict (profile_id,work_id) do update set
         current_page=excluded.current_page, total_pages=excluded.total_pages,
         percentage=excluded.percentage, updated_at=now()`,
      [profileId, workId, currentPage, totalPages, percentage],
    );
    if ((currentPage ?? 0) > 0) {
      const status: LibraryStatus = percentage === 100 ? "COMPLETED" : "IN_PROGRESS";
      await client.query(
        `insert into library_entries (profile_id,work_id,status,updated_at) values ($1,$2,$3,now())
         on conflict (profile_id,work_id) do update set status=excluded.status, updated_at=now()`,
        [profileId, workId, status],
      );
    }
  });
}

export async function setMangaProgress(profileId: string, workId: string, currentVolume: number | null, currentChapter: number | null) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress (profile_id,work_id,current_volume,current_chapter,updated_at)
       values ($1,$2,$3,$4,now())
       on conflict (profile_id,work_id) do update set
         current_volume=excluded.current_volume, current_chapter=excluded.current_chapter, updated_at=now()`,
      [profileId, workId, currentVolume, currentChapter],
    );
    if ((currentVolume ?? 0) > 0 || (currentChapter ?? 0) > 0) {
      await client.query(
        `insert into library_entries (profile_id,work_id,status,updated_at) values ($1,$2,'IN_PROGRESS',now())
         on conflict (profile_id,work_id) do update set status='IN_PROGRESS', updated_at=now()`,
        [profileId, workId],
      );
    }
  });
}

export async function setAnimeProgress(
  profileId: string,
  workId: string,
  values: { currentSeason: number | null; currentEpisode: number | null; platformId: string | null; sourceLabel: string | null },
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress (profile_id,work_id,current_season,current_episode,platform_id,source_label,updated_at)
       values ($1,$2,$3,$4,$5,$6,now())
       on conflict (profile_id,work_id) do update set
         current_season=excluded.current_season, current_episode=excluded.current_episode,
         platform_id=excluded.platform_id, source_label=excluded.source_label, updated_at=now()`,
      [profileId, workId, values.currentSeason, values.currentEpisode, values.platformId, values.sourceLabel],
    );
    if ((values.currentSeason ?? 0) > 0 || (values.currentEpisode ?? 0) > 0) {
      await client.query(
        `insert into library_entries (profile_id,work_id,status,updated_at) values ($1,$2,'IN_PROGRESS',now())
         on conflict (profile_id,work_id) do update set status='IN_PROGRESS', updated_at=now()`,
        [profileId, workId],
      );
    }
  });
}

export async function toggleOwnedUnit(profileId: string, editionId: string, unitId: string) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      "select id from owned_units where profile_id=$1 and unit_id=$2 limit 1",
      [profileId, unitId],
    );
    if (existing.rows[0]?.id) {
      await client.query("delete from owned_units where id=$1", [existing.rows[0].id]);
      return false;
    }
    await client.query(
      `insert into ownership (profile_id,edition_id,ownership_format,updated_at)
       values ($1,$2,'PHYSICAL',now())
       on conflict (profile_id,edition_id) do update set updated_at=now()`,
      [profileId, editionId],
    );
    await client.query(
      `insert into owned_units (profile_id,edition_id,unit_id) values ($1,$2,$3)
       on conflict (profile_id,edition_id,unit_id) do nothing`,
      [profileId, editionId, unitId],
    );
    return true;
  });
}
