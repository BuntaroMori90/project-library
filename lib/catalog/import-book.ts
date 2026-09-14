import "server-only";
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
  return editions.filter((edition) => {
    const key = editionIdentity(edition);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function upsertAuthor(client: PoolClient, workId: string, name: string) {
  const existing = await client.query<{ id: string }>(
    "select id from creators where lower(name) = lower($1) limit 1",
    [name],
  );
  const creatorId =
    existing.rows[0]?.id ??
    (
      await client.query<{ id: string }>(
        "insert into creators (name) values ($1) returning id",
        [name],
      )
    ).rows[0].id;
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

async function saveEdition(
  client: PoolClient,
  workId: string,
  edition: BookEditionCatalogResult,
  isCanonical: boolean,
) {
  const isbn13 = normalizeIsbn(edition.isbn13);
  const isbn10 = normalizeIsbn(edition.isbn10);

  const existing = await client.query<{
    id: string;
    work_id: string;
    source_external_id: string | null;
  }>(
    `select id, work_id, source_external_id
       from editions
      where (source_provider='OPEN_LIBRARY' and source_external_id=$1)
         or ($2::text is not null and isbn13=$2)
         or ($3::text is not null and isbn10=$3)
      order by
        case when source_provider='OPEN_LIBRARY' and source_external_id=$1 then 0
             when $2::text is not null and isbn13=$2 then 1
             else 2 end
      limit 1`,
    [edition.providerId, isbn13, isbn10],
  );

  const found = existing.rows[0];
  if (found) {
    if (found.work_id !== workId) {
      return { id: found.id, belongsToAnotherWork: true };
    }

    await client.query(
      `update editions
          set name=$2,
              publisher=$3,
              language=$4,
              country=$5,
              isbn10=coalesce($6,isbn10),
              isbn13=coalesce($7,isbn13),
              publication_year=$8,
              format=$9,
              cover_url=coalesce($10,cover_url),
              page_count=$11,
              is_canonical=$12,
              updated_at=now()
        where id=$1`,
      [
        found.id,
        edition.title || "Edizione",
        edition.publisher ?? null,
        edition.language ?? null,
        edition.country ?? null,
        isbn10,
        isbn13,
        edition.publicationYear ?? null,
        edition.format ?? null,
        edition.coverUrl ?? null,
        edition.pageCount ?? null,
        isCanonical,
      ],
    );
    return { id: found.id, belongsToAnotherWork: false };
  }

  const result = await client.query<{ id: string }>(
    `insert into editions
      (work_id,name,publisher,language,country,isbn10,isbn13,publication_year,format,cover_url,page_count,is_canonical,source_provider,source_external_id,updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'OPEN_LIBRARY',$13,now())
     returning id`,
    [
      workId,
      edition.title || "Edizione",
      edition.publisher ?? null,
      edition.language ?? null,
      edition.country ?? null,
      isbn10,
      isbn13,
      edition.publicationYear ?? null,
      edition.format ?? null,
      edition.coverUrl ?? null,
      edition.pageCount ?? null,
      isCanonical,
      edition.providerId,
    ],
  );
  return { id: result.rows[0].id, belongsToAnotherWork: false };
}

export async function importBookToCatalog(book: BookCatalogResult) {
  return withTransaction(async (client) => {
    const editions = dedupeEditions(book.editions ?? []);

    const external = await client.query<{ work_id: string }>(
      "select work_id from external_ids where provider='OPEN_LIBRARY' and external_id=$1 limit 1",
      [book.providerId],
    );

    let workId = external.rows[0]?.work_id;
    if (!workId) {
      workId = (await findWorkByEditionIdentity(client, editions)) ?? undefined;
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
      workId = created.rows[0].id;
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

    await client.query(
      `insert into external_ids (work_id,provider,external_id)
       values ($1,'OPEN_LIBRARY',$2)
       on conflict (provider,external_id) do nothing`,
      [workId, book.providerId],
    );

    for (const creator of book.creators) {
      await upsertAuthor(client, workId, creator.name);
    }

    let canonicalEditionId: string | null = null;
    if (editions.length) {
      await client.query(
        "update editions set is_canonical=false,updated_at=now() where work_id=$1 and is_canonical=true",
        [workId],
      );
    }

    for (let index = 0; index < editions.length; index += 1) {
      const saved = await saveEdition(client, workId, editions[index], index === 0);
      if (index === 0 && !saved.belongsToAnotherWork) {
        canonicalEditionId = saved.id;
      }
    }

    if (!canonicalEditionId) {
      const existingCanonical = await client.query<{ id: string }>(
        "select id from editions where work_id=$1 and is_canonical=true limit 1",
        [workId],
      );
      canonicalEditionId = existingCanonical.rows[0]?.id ?? null;

      if (!canonicalEditionId && book.coverUrl) {
        const created = await client.query<{ id: string }>(
          `insert into editions (work_id,name,cover_url,is_canonical)
           values ($1,'Edizione catalogo',$2,true)
           returning id`,
          [workId, book.coverUrl],
        );
        canonicalEditionId = created.rows[0].id;
      }
    }

    return { workId, editionId: canonicalEditionId };
  });
}
