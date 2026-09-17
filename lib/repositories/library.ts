import "server-only";
import { query } from "@/lib/db";
import { getMangaOwnedVolumeNumbers } from "@/lib/repositories/manga-ownership";

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
  source_provider?: string | null;
  source_external_id?: string | null;
};

export type OwnershipEditionRow = {
  edition_id: string;
  custom_name: string | null;
  custom_publisher: string | null;
  custom_language: string | null;
  custom_format: string | null;
  custom_cover_url: string | null;
  custom_page_count: number | null;
  custom_isbn: string | null;
  custom_publication_year: number | null;
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
      `select c.name
         from work_creators wc
         join creators c on c.id=wc.creator_id
        where wc.work_id=$1
        order by wc.role,c.name`,
      [workId],
    ),
    query<LibraryEntryRow>(
      "select status,favorite,rating,notes from library_entries where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<{
      edition_id: string | null;
      current_page: number | null;
      total_pages: number | null;
      percentage: string | number | null;
    }>(
      "select edition_id,current_page,total_pages,percentage from progress where profile_id=$1 and work_id=$2 limit 1",
      [profileId, workId],
    ),
    query<EditionRow>(
      `select e.id,e.name,e.publisher,e.language,e.country,e.isbn10,e.isbn13,
              e.publication_year,e.format,e.cover_url,e.total_units,e.page_count,
              e.is_canonical,e.source_provider,e.source_external_id
         from editions e
        where e.work_id=$1
          and (
            coalesce(e.source_provider,'') <> 'MANUAL'
            or exists (
              select 1 from ownership own
               where own.edition_id=e.id and own.profile_id=$2
            )
          )
        order by (e.language='Italiano') desc,e.is_canonical desc,
                 e.publication_year desc nulls last,e.name`,
      [workId, profileId],
    ),
    query<OwnershipEditionRow>(
      `select o.edition_id,o.custom_name,o.custom_publisher,o.custom_language,
              o.custom_format,o.custom_cover_url,o.custom_page_count,
              o.custom_isbn,o.custom_publication_year
         from ownership o
         join editions e on e.id=o.edition_id
        where o.profile_id=$1 and e.work_id=$2`,
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
    ownershipByEdition: new Map(
      ownershipResult.rows.map((row) => [row.edition_id, row] as const),
    ),
  };
}

export async function getMangaDetail(profileId: string, workId: string) {
  const [
    workResult,
    creatorsResult,
    entryResult,
    progressResult,
    editionsResult,
    ownedVolumeNumbers,
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
      `select e.id,e.name,e.publisher,e.language,e.country,e.isbn10,e.isbn13,
              e.publication_year,e.format,e.cover_url,e.total_units,e.page_count,
              e.is_canonical,e.source_provider,e.source_external_id
         from editions e
        where e.work_id=$1
          and (
            coalesce(e.source_provider,'') <> 'MANUAL'
            or exists (
              select 1 from ownership own
               where own.edition_id=e.id and own.profile_id=$2
            )
          )
        order by e.is_canonical desc,e.publication_year desc nulls last,e.name`,
      [workId, profileId],
    ),
    getMangaOwnedVolumeNumbers(profileId, workId),
  ]);

  const editions = editionsResult.rows;
  const canonicalEdition =
    editions.find((edition) => edition.is_canonical) ?? editions[0] ?? null;
  let volumes: Array<{ id: string; unit_number: number }> = [];
  let ownedIds = new Set<string>();

  if (canonicalEdition) {
    const unitResult = await query<{id:string; unit_number:string|number; owned:boolean}>(
      `select cu.id,cu.unit_number,(ou.id is not null) as owned
       from content_units cu
       left join owned_units ou on ou.unit_id=cu.id and ou.edition_id=cu.edition_id and ou.profile_id=$3
       where cu.work_id=$1 and cu.edition_id=$2 and cu.unit_type='VOLUME'
       order by cu.unit_number`,
      [workId, canonicalEdition.id, profileId],
    );
    volumes = unitResult.rows.map(row => ({id:row.id, unit_number:Number(row.unit_number)}));
    ownedIds = new Set(unitResult.rows.filter(row => row.owned).map(row => row.id));
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
    ownedVolumeNumbers,
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

type LibraryMediaType = "BOOK" | "MANGA" | "ANIME";

export async function listLibraryWorks(
  profileId: string,
  mediaType?: LibraryMediaType,
) {
  return query<{
    id: string;
    media_type: LibraryMediaType;
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
    `select w.id,w.media_type,w.title,
            case when w.media_type='BOOK'
              then coalesce(
                case
                  when so.custom_cover_url like 'data:image/%'
                    then '/api/library/cover/work/' || w.id::text
                  else so.custom_cover_url
                end,
                se.cover_url,
                w.cover_url
              )
              else w.cover_url
            end as cover_url,
            w.total_volumes,w.total_seasons,w.total_episodes,
            le.status,le.favorite,le.rating,le.updated_at,
            coalesce(creators.names,'{}') as creators,
            p.current_volume,p.current_chapter,p.current_season,p.current_episode,
            p.current_page,p.total_pages,p.percentage,
            coalesce(owned.count,0) as owned_units
       from library_entries le
       join works w on w.id=le.work_id
       left join progress p on p.profile_id=le.profile_id and p.work_id=w.id
       left join editions se on se.id=p.edition_id
       left join ownership so on so.profile_id=le.profile_id and so.edition_id=p.edition_id
       left join lateral (
         select array_agg(c.name order by wc.role,c.name) as names
           from work_creators wc
           join creators c on c.id=wc.creator_id
          where wc.work_id=w.id
       ) creators on true
       left join lateral (
         select count(*) as count
           from owned_units ou
           join editions e on e.id=ou.edition_id
          where ou.profile_id=le.profile_id
            and e.work_id=w.id
       ) owned on w.media_type='MANGA'
      where le.profile_id=$1
        and ($2::text is null or w.media_type=$2)
      order by le.updated_at desc`,
    [profileId, mediaType ?? null],
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
    `select wl.id as wishlist_id,w.id as work_id,w.title,w.media_type,
            w.cover_url,wl.priority,wl.created_at,
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
