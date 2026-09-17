import "server-only";
import { query, withTransaction } from "@/lib/db";

export type LibraryStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED";

export type BookEditionOverrides = {
  name: string | null;
  publisher: string | null;
  language: string | null;
  format: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  isbn: string | null;
  publicationYear: number | null;
};

export async function setLibraryStatus(
  profileId: string,
  workId: string,
  status: LibraryStatus,
) {
  await query(
    `insert into library_entries (profile_id, work_id, status, updated_at)
     values ($1,$2,$3,now())
     on conflict (profile_id,work_id) do update
       set status=excluded.status, updated_at=now()`,
    [profileId, workId, status],
  );
}

export async function setLibraryPersonal(
  profileId: string,
  workId: string,
  values: { favorite: boolean; rating: number | null; notes: string | null },
) {
  await query(
    `insert into library_entries
       (profile_id,work_id,favorite,rating,notes,updated_at)
     values ($1,$2,$3,$4,$5,now())
     on conflict (profile_id,work_id) do update set
       favorite=excluded.favorite,
       rating=excluded.rating,
       notes=excluded.notes,
       updated_at=now()`,
    [profileId, workId, values.favorite, values.rating, values.notes],
  );
}

export async function setBookProgress(
  profileId: string,
  workId: string,
  currentPage: number | null,
  totalPages: number | null,
  percentage: number | null,
  editionId: string | null = null,
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress
         (profile_id,work_id,edition_id,current_page,total_pages,percentage,updated_at)
       values ($1,$2,$3,$4,$5,$6,now())
       on conflict (profile_id,work_id) do update set
         edition_id=coalesce(excluded.edition_id,progress.edition_id),
         current_page=excluded.current_page,
         total_pages=excluded.total_pages,
         percentage=excluded.percentage,
         updated_at=now()`,
      [profileId, workId, editionId, currentPage, totalPages, percentage],
    );

    if (percentage === 100) {
      await client.query(
        `update library_entries
            set status='COMPLETED',updated_at=now()
          where profile_id=$1 and work_id=$2`,
        [profileId, workId],
      );
    } else if ((currentPage ?? 0) > 0) {
      await client.query(
        `update library_entries
            set status='IN_PROGRESS',updated_at=now()
          where profile_id=$1 and work_id=$2 and status='PLANNED'`,
        [profileId, workId],
      );
    }
  });
}

export async function selectBookEdition(
  profileId: string,
  workId: string,
  editionId: string,
) {
  return withTransaction(async (client) => {
    const editionResult = await client.query<{
      id: string;
      page_count: number | null;
      format: string | null;
    }>(
      `select id,page_count,format
         from editions
        where id=$1 and work_id=$2
        limit 1`,
      [editionId, workId],
    );
    const edition = editionResult.rows[0];
    if (!edition) throw new Error("Edizione non valida per questa opera.");

    await client.query(
      `insert into ownership
         (profile_id,edition_id,ownership_format,updated_at)
       values ($1,$2,$3,now())
       on conflict (profile_id,edition_id) do update set updated_at=now()`,
      [
        profileId,
        editionId,
        edition.format?.toLowerCase().includes("ebook") ? "DIGITAL" : "PHYSICAL",
      ],
    );

    const personalResult = await client.query<{ custom_page_count: number | null }>(
      `select custom_page_count from ownership
        where profile_id=$1 and edition_id=$2 limit 1`,
      [profileId, editionId],
    );
    const totalPages = personalResult.rows[0]?.custom_page_count ?? edition.page_count;

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
      [profileId, workId, editionId, totalPages],
    );

    return edition;
  });
}

export async function saveBookEditionOverrides(
  profileId: string,
  workId: string,
  editionId: string,
  values: BookEditionOverrides,
) {
  await withTransaction(async (client) => {
    const editionResult = await client.query<{ id: string; format: string | null }>(
      `select id,format from editions where id=$1 and work_id=$2 limit 1`,
      [editionId, workId],
    );
    if (!editionResult.rows[0]) throw new Error("Edizione non valida.");

    await client.query(
      `insert into ownership
         (profile_id,edition_id,ownership_format,updated_at)
       values ($1,$2,$3,now())
       on conflict (profile_id,edition_id) do nothing`,
      [
        profileId,
        editionId,
        editionResult.rows[0].format?.toLowerCase().includes("ebook")
          ? "DIGITAL"
          : "PHYSICAL",
      ],
    );

    await client.query(
      `update ownership set
         custom_name=$3,
         custom_publisher=$4,
         custom_language=$5,
         custom_format=$6,
         custom_cover_url=$7,
         custom_page_count=$8,
         custom_isbn=$9,
         custom_publication_year=$10,
         updated_at=now()
       where profile_id=$1 and edition_id=$2`,
      [
        profileId,
        editionId,
        values.name,
        values.publisher,
        values.language,
        values.format,
        values.coverUrl,
        values.pageCount,
        values.isbn,
        values.publicationYear,
      ],
    );

    if (values.pageCount) {
      await client.query(
        `update progress set
           total_pages=$3,
           percentage=case
             when current_page is not null and $3 > 0
               then least(100,round((current_page::numeric / $3) * 100,1))
             else percentage
           end,
           updated_at=now()
         where profile_id=$1 and work_id=$2 and edition_id=$4`,
        [profileId, workId, values.pageCount, editionId],
      );
    }
  });
}

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
       values ($1,$2,'MANUAL',concat('USER:',$3,':',gen_random_uuid()::text),false,now(),now())
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

export async function removeBookFromLibrary(profileId: string, workId: string) {
  await withTransaction(async (client) => {
    await client.query(
      `delete from owned_units
        where profile_id=$1
          and edition_id in (select id from editions where work_id=$2)`,
      [profileId, workId],
    );
    await client.query(
      `delete from ownership
        where profile_id=$1
          and edition_id in (select id from editions where work_id=$2)`,
      [profileId, workId],
    );
    await client.query(
      "delete from progress where profile_id=$1 and work_id=$2",
      [profileId, workId],
    );
    await client.query(
      "delete from library_entries where profile_id=$1 and work_id=$2",
      [profileId, workId],
    );
    await client.query(
      `delete from editions e
        where e.work_id=$1
          and e.source_provider='MANUAL'
          and e.source_external_id like concat('USER:',$2,':%')
          and not exists (select 1 from ownership o where o.edition_id=e.id)`,
      [workId, profileId],
    );
  });
}

export async function setMangaProgress(
  profileId: string,
  workId: string,
  currentVolume: number | null,
  currentChapter: number | null,
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress
         (profile_id,work_id,current_volume,current_chapter,updated_at)
       values ($1,$2,$3,$4,now())
       on conflict (profile_id,work_id) do update set
         current_volume=excluded.current_volume,
         current_chapter=excluded.current_chapter,
         updated_at=now()`,
      [profileId, workId, currentVolume, currentChapter],
    );
    if ((currentVolume ?? 0) > 0 || (currentChapter ?? 0) > 0) {
      await client.query(
        `insert into library_entries
           (profile_id,work_id,status,updated_at)
         values ($1,$2,'IN_PROGRESS',now())
         on conflict (profile_id,work_id) do update set
           status=case
             when library_entries.status='PLANNED' then 'IN_PROGRESS'
             else library_entries.status
           end,
           updated_at=now()`,
        [profileId, workId],
      );
    }
  });
}

export async function setAnimeProgress(
  profileId: string,
  workId: string,
  values: {
    currentSeason: number | null;
    currentEpisode: number | null;
    platformId: string | null;
    sourceLabel: string | null;
  },
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress
         (profile_id,work_id,current_season,current_episode,platform_id,source_label,updated_at)
       values ($1,$2,$3,$4,$5,$6,now())
       on conflict (profile_id,work_id) do update set
         current_season=excluded.current_season,
         current_episode=excluded.current_episode,
         platform_id=excluded.platform_id,
         source_label=excluded.source_label,
         updated_at=now()`,
      [
        profileId,
        workId,
        values.currentSeason,
        values.currentEpisode,
        values.platformId,
        values.sourceLabel,
      ],
    );
    if ((values.currentSeason ?? 0) > 0 || (values.currentEpisode ?? 0) > 0) {
      await client.query(
        `insert into library_entries
           (profile_id,work_id,status,updated_at)
         values ($1,$2,'IN_PROGRESS',now())
         on conflict (profile_id,work_id) do update set
           status='IN_PROGRESS',updated_at=now()`,
        [profileId, workId],
      );
    }
  });
}

export async function toggleOwnedUnit(
  profileId: string,
  editionId: string,
  unitId: string,
) {
  return withTransaction(async (client) => {
    const unit = await client.query<{ id: string }>(
      `select cu.id
         from content_units cu
         join editions e on e.id=cu.edition_id
        where cu.id=$1 and cu.edition_id=$2 and cu.unit_type='VOLUME'
        limit 1`,
      [unitId, editionId],
    );
    if (!unit.rows[0]) throw new Error("Volume non valido per questa edizione.");

    const existing = await client.query<{ id: string }>(
      "select id from owned_units where profile_id=$1 and unit_id=$2 limit 1",
      [profileId, unitId],
    );
    if (existing.rows[0]?.id) {
      await client.query("delete from owned_units where id=$1", [
        existing.rows[0].id,
      ]);
      return false;
    }
    await client.query(
      `insert into ownership
         (profile_id,edition_id,ownership_format,updated_at)
       values ($1,$2,'PHYSICAL',now())
       on conflict (profile_id,edition_id) do update set updated_at=now()`,
      [profileId, editionId],
    );
    await client.query(
      `insert into owned_units (profile_id,edition_id,unit_id)
       values ($1,$2,$3)
       on conflict (profile_id,edition_id,unit_id) do nothing`,
      [profileId, editionId, unitId],
    );
    return true;
  });
}
