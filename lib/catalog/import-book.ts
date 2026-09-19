import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import type {
  BookCatalogResult,
  BookEditionCatalogResult,
} from "@/lib/catalog/types";

function normalizeIsbn(value?: string | null) {
  return value?.toUpperCase().replace(/[^0-9X]/g, "") || null;
}

function editionIdentity(edition: BookEditionCatalogResult) {
  const isbn13 = normalizeIsbn(edition.isbn13);
  if (isbn13) return `isbn13:${isbn13}`;
  const isbn10 = normalizeIsbn(edition.isbn10);
  if (isbn10) return `isbn10:${isbn10}`;
  return `source:${edition.providerId}`;
}

function dedupeEditions(editions: BookEditionCatalogResult[]) {
  const seen = new Set<string>();
  const sources = new Set<string>();
  return editions.filter((edition) => {
    const key = editionIdentity(edition);
    if (seen.has(key) || sources.has(edition.providerId)) return false;
    sources.add(edition.providerId);
    seen.add(key);
    return true;
  });
}

async function upsertAuthor(client: PoolClient, workId: string, name: string) {
  const existing = await client.query<{ id: string }>(
    "select id from creators where lower(name) = lower($1) limit 1",
    [name],
  );
  const created = existing.rows[0]
    ? null
    : await client.query<{ id: string }>(
        "insert into creators (name) values ($1) returning id",
        [name],
      );
  const creatorId = existing.rows[0]?.id ?? created?.rows[0]?.id;
  if (!creatorId) throw new Error("Impossibile salvare l'autore del libro.");

  await client.query(
    `insert into work_creators (work_id, creator_id, role)
     values ($1, $2, 'AUTHOR')
     on conflict (work_id, creator_id, role) do nothing`,
    [workId, creatorId],
  );
}

async function findWorkByEditionIdentity(
  client: PoolClient,
  editions: BookEditionCatalogResult[],
) {
  const isbn13 = editions
    .map((edition) => normalizeIsbn(edition.isbn13))
    .filter((value): value is string => Boolean(value));
  const isbn10 = editions
    .map((edition) => normalizeIsbn(edition.isbn10))
    .filter((value): value is string => Boolean(value));

  if (!isbn13.length && !isbn10.length) return null;

  const result = await client.query<{ work_id: string }>(
    `select work_id
       from editions
      where (cardinality($1::text[]) > 0 and isbn13 = any($1::text[]))
         or (cardinality($2::text[]) > 0 and isbn10 = any($2::text[]))
      limit 1`,
    [isbn13, isbn10],
  );
  return result.rows[0]?.work_id ?? null;
}

async function saveEditions(client: PoolClient, workId: string, editions: BookEditionCatalogResult[]) {
  if (!editions.length) return null;
  const existing = await client.query<{ id: string; work_id: string; source_provider: string | null; source_external_id: string | null; isbn13: string | null; isbn10: string | null }>(
    `select id,work_id,source_provider,source_external_id,isbn13,isbn10 from editions
     where (source_provider='OPEN_LIBRARY' and source_external_id=any($1::text[]))
       or isbn13=any($2::text[]) or isbn10=any($3::text[])`,
    [editions.map((edition) => edition.providerId), editions.map((edition) => normalizeIsbn(edition.isbn13)).filter(Boolean), editions.map((edition) => normalizeIsbn(edition.isbn10)).filter(Boolean)],
  );
  const seenIds = new Set<string>();
  const rows = editions.flatMap((edition, index) => {
    const isbn13 = normalizeIsbn(edition.isbn13), isbn10 = normalizeIsbn(edition.isbn10);
    const found = existing.rows.find((row) => row.source_provider === 'OPEN_LIBRARY' && row.source_external_id === edition.providerId)
      ?? existing.rows.find((row) => isbn13 && row.isbn13 === isbn13)
      ?? existing.rows.find((row) => isbn10 && row.isbn10 === isbn10);
    if (found && found.work_id !== workId) return [];
    const id = found?.id ?? randomUUID();
    if (seenIds.has(id)) return [];
    seenIds.add(id);
    return [{ id,name: edition.title || 'Edizione',publisher: edition.publisher ?? null,language: edition.language ?? null,
      country: edition.country ?? null,isbn10,isbn13,publication_year: edition.publicationYear ?? null,
      format: edition.format ?? null,cover_url: edition.coverUrl ?? null,page_count: edition.pageCount ?? null,
      is_canonical: index === 0,source_external_id: edition.providerId }];
  });
  if (rows.length) await client.query(
    `insert into editions (id,work_id,name,publisher,language,country,isbn10,isbn13,publication_year,format,cover_url,page_count,is_canonical,source_provider,source_external_id,updated_at)
     select e.id,$1,e.name,e.publisher,e.language,e.country,e.isbn10,e.isbn13,e.publication_year,e.format,e.cover_url,e.page_count,e.is_canonical,'OPEN_LIBRARY',e.source_external_id,now()
     from jsonb_to_recordset($2::jsonb) as e(id uuid,name text,publisher text,language text,country text,isbn10 text,isbn13 text,publication_year integer,format text,cover_url text,page_count integer,is_canonical boolean,source_external_id text)
     on conflict (id) do update set name=excluded.name,publisher=excluded.publisher,language=excluded.language,country=excluded.country,
       isbn10=coalesce(excluded.isbn10,editions.isbn10),isbn13=coalesce(excluded.isbn13,editions.isbn13),
       publication_year=excluded.publication_year,format=excluded.format,cover_url=coalesce(excluded.cover_url,editions.cover_url),
       page_count=excluded.page_count,is_canonical=excluded.is_canonical,updated_at=now()`,
    [workId, JSON.stringify(rows)],
  );
  return rows.find((row) => row.is_canonical)?.id ?? null;
}

export async function importBookToCatalog(book: BookCatalogResult) {
  return withTransaction(async (client) => {
    const editions = dedupeEditions(book.editions ?? []);

    const external = await client.query<{ work_id: string }>(
      "select work_id from external_ids where provider='OPEN_LIBRARY' and external_id=$1 limit 1",
      [book.providerId],
    );

    let workId: string | null = external.rows[0]?.work_id ?? null;
    if (!workId) {
      workId = await findWorkByEditionIdentity(client, editions);
    }

    if (!workId) {
      const created = await client.query<{ id: string }>(
        `insert into works
          (media_type,title,original_title,description,release_year,publication_status,cover_url,genres)
         values ('BOOK',$1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [
          book.title,
          book.originalTitle ?? null,
          book.description ?? null,
          book.releaseYear ?? null,
          book.publicationStatus,
          book.coverUrl ?? null,
          book.genres,
        ],
      );
      workId = created.rows[0]?.id ?? null;
      if (!workId) throw new Error("Impossibile creare l'opera nel catalogo.");
    } else {
      await client.query(
        `update works
            set title=$2,
                original_title=$3,
                description=$4,
                release_year=$5,
                publication_status=$6,
                cover_url=coalesce($7,cover_url),
                genres=$8,
                updated_at=now()
          where id=$1`,
        [
          workId,
          book.title,
          book.originalTitle ?? null,
          book.description ?? null,
          book.releaseYear ?? null,
          book.publicationStatus,
          book.coverUrl ?? null,
          book.genres,
        ],
      );
    }

    const resolvedWorkId = workId;

    await client.query(
      `insert into external_ids (work_id,provider,external_id)
       values ($1,'OPEN_LIBRARY',$2)
       on conflict (provider,external_id) do nothing`,
      [resolvedWorkId, book.providerId],
    );

    for (const creator of book.creators) {
      await upsertAuthor(client, resolvedWorkId, creator.name);
    }

    let canonicalEditionId: string | null = null;
    if (editions.length) {
      await client.query(
        "update editions set is_canonical=false,updated_at=now() where work_id=$1 and is_canonical=true",
        [resolvedWorkId],
      );
    }

    canonicalEditionId = await saveEditions(client, resolvedWorkId, editions);

    if (!canonicalEditionId) {
      const existingCanonical = await client.query<{ id: string }>(
        "select id from editions where work_id=$1 and is_canonical=true limit 1",
        [resolvedWorkId],
      );
      canonicalEditionId = existingCanonical.rows[0]?.id ?? null;

      if (!canonicalEditionId && book.coverUrl) {
        const created = await client.query<{ id: string }>(
          `insert into editions (work_id,name,cover_url,is_canonical)
           values ($1,'Edizione catalogo',$2,true)
           returning id`,
          [resolvedWorkId, book.coverUrl],
        );
        canonicalEditionId = created.rows[0]?.id ?? null;
      }
    }

    return { workId: resolvedWorkId, editionId: canonicalEditionId };
  });
}
