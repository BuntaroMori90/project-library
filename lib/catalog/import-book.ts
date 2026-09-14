import "server-only";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import type { BookCatalogResult, BookEditionCatalogResult } from "@/lib/catalog/types";

async function upsertAuthor(client: PoolClient, workId: string, name: string) {
  const existing = await client.query<{ id: string }>("select id from creators where lower(name) = lower($1) limit 1", [name]);
  const creatorId = existing.rows[0]?.id ?? (await client.query<{ id: string }>("insert into creators (name) values ($1) returning id", [name])).rows[0].id;
  await client.query(`insert into work_creators (work_id, creator_id, role) values ($1, $2, 'AUTHOR') on conflict (work_id, creator_id, role) do nothing`, [workId, creatorId]);
}

async function saveEdition(client: PoolClient, workId: string, edition: BookEditionCatalogResult, isCanonical: boolean) {
  const result = await client.query<{ id: string }>(
    `insert into editions (work_id,name,publisher,language,country,isbn10,isbn13,publication_year,format,cover_url,page_count,is_canonical,source_provider,source_external_id,updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'OPEN_LIBRARY',$13,now())
     on conflict (source_provider, source_external_id) where source_provider is not null and source_external_id is not null
     do update set work_id=excluded.work_id,name=excluded.name,publisher=excluded.publisher,language=excluded.language,country=excluded.country,isbn10=excluded.isbn10,isbn13=excluded.isbn13,publication_year=excluded.publication_year,format=excluded.format,cover_url=excluded.cover_url,page_count=excluded.page_count,is_canonical=excluded.is_canonical,updated_at=now() returning id`,
    [workId,edition.title||"Edizione",edition.publisher??null,edition.language??null,edition.country??null,edition.isbn10??null,edition.isbn13??null,edition.publicationYear??null,edition.format??null,edition.coverUrl??null,edition.pageCount??null,isCanonical,edition.providerId]
  );
  return result.rows[0].id;
}

export async function importBookToCatalog(book: BookCatalogResult) {
  return withTransaction(async client => {
    const external=await client.query<{work_id:string}>("select work_id from external_ids where provider='OPEN_LIBRARY' and external_id=$1 limit 1",[book.providerId]);
    let workId=external.rows[0]?.work_id;
    if(!workId){
      const created=await client.query<{id:string}>(`insert into works (media_type,title,original_title,description,release_year,publication_status,cover_url,genres) values ('BOOK',$1,$2,$3,$4,$5,$6,$7) returning id`,[book.title,book.originalTitle??null,book.description??null,book.releaseYear??null,book.publicationStatus,book.coverUrl??null,book.genres]);
      workId=created.rows[0].id;
      await client.query("insert into external_ids (work_id,provider,external_id) values ($1,'OPEN_LIBRARY',$2)",[workId,book.providerId]);
    } else {
      await client.query(`update works set title=$2,original_title=$3,description=$4,release_year=$5,publication_status=$6,cover_url=$7,genres=$8,updated_at=now() where id=$1`,[workId,book.title,book.originalTitle??null,book.description??null,book.releaseYear??null,book.publicationStatus,book.coverUrl??null,book.genres]);
    }
    for(const creator of book.creators) await upsertAuthor(client,workId,creator.name);
    let canonicalEditionId:string|null=null;
    const editions=book.editions??[];
    if(editions.length) await client.query("update editions set is_canonical=false,updated_at=now() where work_id=$1 and is_canonical=true",[workId]);
    for(let index=0;index<editions.length;index+=1){ const editionId=await saveEdition(client,workId,editions[index],index===0); if(index===0) canonicalEditionId=editionId; }
    if(!canonicalEditionId){
      const existingCanonical=await client.query<{id:string}>("select id from editions where work_id=$1 and is_canonical=true limit 1",[workId]);
      canonicalEditionId=existingCanonical.rows[0]?.id??null;
      if(!canonicalEditionId&&book.coverUrl){ const created=await client.query<{id:string}>("insert into editions (work_id,name,cover_url,is_canonical) values ($1,'Edizione catalogo',$2,true) returning id",[workId,book.coverUrl]); canonicalEditionId=created.rows[0].id; }
    }
    return {workId,editionId:canonicalEditionId};
  });
}
