import "server-only";
import { query } from "@/lib/db";

export type HomeCollectionRow = {
  id: string;
  media_type: "BOOK" | "MANGA" | "ANIME";
  title: string;
  cover_url: string | null;
  favorite: boolean;
  created_at: Date;
  creators: string[] | null;
  edition_name: string | null;
  edition_publisher: string | null;
  edition_format: string | null;
};

export async function listHomeCollectionWorks(profileId: string) {
  return query<HomeCollectionRow>(
    `select w.id,w.media_type,w.title,
            case when w.media_type='BOOK'
              then coalesce(
                case
                  when own.custom_cover_url like 'data:image/%'
                    then '/api/library/cover/work/' || w.id::text
                  else own.custom_cover_url
                end,
                e.cover_url,
                w.cover_url
              )
              else w.cover_url
            end as cover_url,
            le.favorite,le.created_at,
            coalesce(creators.names,'{}') as creators,
            coalesce(own.custom_name,e.name) as edition_name,
            coalesce(own.custom_publisher,e.publisher) as edition_publisher,
            coalesce(own.custom_format,e.format) as edition_format
       from library_entries le
       join works w on w.id=le.work_id
       left join progress p on p.profile_id=le.profile_id and p.work_id=w.id
       left join editions e on e.id=p.edition_id
       left join ownership own on own.profile_id=le.profile_id and own.edition_id=p.edition_id
       left join lateral (
         select array_agg(c.name order by wc.role,c.name) as names
           from work_creators wc
           join creators c on c.id=wc.creator_id
          where wc.work_id=w.id
       ) creators on true
      where le.profile_id=$1
      order by le.created_at desc`,
    [profileId],
  );
}
