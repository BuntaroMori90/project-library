import "server-only";
import { query } from "@/lib/db";

export type WorkRow = {
  id: string;
  title: string;
  original_title: string | null;
  description: string | null;
  release_year: number | null;
  publication_status: string;
  cover_url: string | null;
  genres: string[];
  total_volumes?: number | null;
  total_chapters?: number | null;
  total_seasons?: number | null;
  total_episodes?: number | null;
};

export type LibraryEntryRow = {
  status: string;
  favorite: boolean;
  rating: string | number | null;
  notes: string | null;
};
export type EditionRow = {
  id: string;
  name: string;
  publisher: string | null;
  language: string | null;
  country?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publication_year: number | null;
  format?: string | null;
  cover_url?: string | null;
  total_units: number | null;
  page_count?: number | null;
  is_canonical: boolean;
};

export async function getBookDetail(profileId: string, workId: string) {
  const [
    workResult,
    creatorsResult,
    entryResult,
    progressResult,
    editionsResult,
    ownershipResult,
  ] = await Promise.all([
    query<WorkRow>(
      "select id,title,original_title,description,release_year,publication_status,cover_url,genres from works where id=$1 and media_type='BOOK' limit 1",
      [workId],
    ),
    query<{ name: string }>(
      `select c.name from work_creators wc join creators c on c.id=wc.creator_id where wc.work_id=$1 order by wc.role,c.name`,
      [workId],
    ),
    query<LibraryEntryRow>(
      "select status,favorite,rating,notes from library_entries where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<{
      current_page: number | null;
      total_pages: number | null;
      percentage: string | number | null;
    }>(
      "select current_page,total_pages,percentage from progress where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<EditionRow>(
      `select id,name,publisher,language,country,isbn10,isbn13,publication_year,format,cover_url,total_units,page_count,is_canonical from editions where work_id=$1 order by is_canonical desc, publication_year desc nulls last, name`,
      [workId],
    ),
    query<{ edition_id: string }>(
      `select o.edition_id from ownership o join editions e on e.id=o.edition_id where o.profile_id=$1 and e.work_id=$2`,
      [profileId, workId],
    ),
  ]);
  return {
    work: workResult.rows[0] ?? null,
    creators: creatorsResult.rows.map((row) => row.name),
    libraryEntry: entryResult.rows[0] ?? null,
    progress: progressResult.rows[0] ?? null,
    editions: editionsResult.rows,
    ownedEditionIds: new Set(ownershipResult.rows.map((row) => row.edition_id)),
  };
}

export async function getMangaDetail(profileId: string, workId: string) {
  const [
    workResult,
    creatorsResult,
    entryResult,
    progressResult,
    editionsResult,
  ] = await Promise.all([
    query<WorkRow>(
      "select id,title,original_title,description,release_year,publication_status,cover_url,genres,total_volumes,total_chapters from works where id=$1 and media_type='MANGA' limit 1",
      [workId],
    ),
    query<{ name: string }>(
      `select c.name from work_creators wc join creators c on c.id=wc.creator_id where wc.work_id=$1 order by wc.role,c.name`,
      [workId],
    ),
    query<LibraryEntryRow>(
      "select status,favorite,rating,notes from library_entries where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<{
      current_volume: string | number | null;
      current_chapter: string | number | null;
    }>(
      "select current_volume,current_chapter from progress where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<EditionRow>(
      "select id,name,total_units,publisher,language,publication_year,is_canonical from editions where work_id=$1 order by is_canonical desc, publication_year desc nulls last, name",
      [workId],
    ),
  ]);
  const editions = editionsResult.rows;
  const canonicalEdition =
    editions.find((edition) => edition.is_canonical) ?? editions[0] ?? null;
  let volumes: Array<{ id: string; unit_number: number }> = [];
  let ownedIds = new Set<string>();
  if (canonicalEdition) {
    const [unitResult, ownedResult] = await Promise.all([
      query<{ id: string; unit_number: string | number }>(
        "select id,unit_number from content_units where work_id=$1 and edition_id=$2 and unit_type='VOLUME' order by unit_number",
        [workId, canonicalEdition.id],
      ),
      query<{ unit_id: string }>(
        "select unit_id from owned_units where profile_id=$1 and edition_id=$2",
        [profileId, canonicalEdition.id],
      ),
    ]);
    volumes = unitResult.rows.map((row) => ({
      id: row.id,
      unit_number: Number(row.unit_number),
    }));
    ownedIds = new Set(ownedResult.rows.map((row) => row.unit_id));
  }
  return {
    work: workResult.rows[0] ?? null,
    creators: creatorsResult.rows.map((row) => row.name),
    libraryEntry: entryResult.rows[0] ?? null,
    progress: progressResult.rows[0] ?? null,
    editions,
    canonicalEdition,
    volumes,
    ownedIds,
  };
}

export async function getAnimeDetail(profileId: string, workId: string) {
  const [
    workResult,
    creatorsResult,
    entryResult,
    progressResult,
    unitsResult,
    platformsResult,
  ] = await Promise.all([
    query<WorkRow>(
      "select id,title,original_title,description,release_year,publication_status,cover_url,genres,total_seasons,total_episodes from works where id=$1 and media_type='ANIME' limit 1",
      [workId],
    ),
    query<{ name: string }>(
      `select c.name from work_creators wc join creators c on c.id=wc.creator_id where wc.work_id=$1 order by wc.role,c.name`,
      [workId],
    ),
    query<LibraryEntryRow>(
      "select status,favorite,rating,notes from library_entries where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<{
      current_season: number | null;
      current_episode: string | number | null;
      platform_id: string | null;
      source_label: string | null;
    }>(
      "select current_season,current_episode,platform_id,source_label from progress where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<{
      id: string;
      parent_unit_id: string | null;
      unit_type: "SEASON" | "EPISODE";
      unit_number: string | number;
      title: string | null;
    }>(
      "select id,parent_unit_id,unit_type,unit_number,title from content_units where work_id=$1 and unit_type in ('SEASON','EPISODE') order by sort_order nulls last, unit_number",
      [workId],
    ),
    query<{ id: string; name: string }>(
      "select id,name from platforms where platform_type='STREAMING' order by name",
      [],
    ),
  ]);
  return {
    work: workResult.rows[0] ?? null,
    creators: creatorsResult.rows.map((row) => row.name),
    libraryEntry: entryResult.rows[0] ?? null,
    progress: progressResult.rows[0] ?? null,
    units: unitsResult.rows,
    platforms: platformsResult.rows,
  };
}

export async function listLibraryWorks(
  profileId: string,
  mediaType: "BOOK" | "MANGA" | "ANIME",
) {
  return query<{
    id: string;
    title: string;
    cover_url: string | null;
    total_volumes: number | null;
    total_seasons: number | null;
    total_episodes: number | null;
    status: string;
    favorite: boolean;
    rating: string | number | null;
    updated_at: Date;
    creators: string[] | null;
    current_volume: string | number | null;
    current_chapter: string | number | null;
    current_season: number | null;
    current_episode: string | number | null;
    current_page: number | null;
    total_pages: number | null;
    percentage: string | number | null;
    owned_units: string | number;
  }>(
    `select w.id,w.title,w.cover_url,w.total_volumes,w.total_seasons,w.total_episodes,
       le.status,le.favorite,le.rating,le.updated_at,
       coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}') as creators,
       p.current_volume,p.current_chapter,p.current_season,p.current_episode,p.current_page,p.total_pages,p.percentage,
       count(distinct ou.id) as owned_units
     from library_entries le
     join works w on w.id=le.work_id and w.media_type=$2
     left join progress p on p.profile_id=le.profile_id and p.work_id=w.id
     left join work_creators wc on wc.work_id=w.id
     left join creators c on c.id=wc.creator_id
     left join editions e on e.work_id=w.id
     left join owned_units ou on ou.profile_id=le.profile_id and ou.edition_id=e.id
     where le.profile_id=$1
     group by w.id,le.status,le.favorite,le.rating,le.updated_at,p.current_volume,p.current_chapter,p.current_season,p.current_episode,p.current_page,p.total_pages,p.percentage
     order by le.updated_at desc`,
    [profileId, mediaType],
  );
}

export async function listWishlistWorks(profileId: string) {
  return query<{
    wishlist_id: string;
    work_id: string;
    title: string;
    media_type: "BOOK" | "MANGA" | "ANIME";
    cover_url: string | null;
    priority: string;
    created_at: Date;
    creators: string[];
  }>(
    `select wl.id as wishlist_id, w.id as work_id, w.title, w.media_type,
       w.cover_url, wl.priority, wl.created_at,
       coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}') as creators
     from wishlist wl
     join works w on w.id=wl.work_id
     left join work_creators wc on wc.work_id=w.id
     left join creators c on c.id=wc.creator_id
     where wl.profile_id=$1 and wl.edition_id is null and wl.unit_id is null
     group by wl.id,w.id
     order by wl.created_at desc`,
    [profileId],
  );
}
