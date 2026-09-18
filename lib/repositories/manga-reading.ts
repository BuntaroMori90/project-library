import "server-only";
import { query, withTransaction } from "@/lib/db";

export type MangaReadingMode = "PHYSICAL" | "DIGITAL" | "BOTH";
export type MangaReadingStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED";

const readingModes = new Set<MangaReadingMode>([
  "PHYSICAL",
  "DIGITAL",
  "BOTH",
]);

const readingStatuses = new Set<MangaReadingStatus>([
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
]);

export function normalizeMangaReadingMode(value: unknown): MangaReadingMode | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase() as MangaReadingMode;
  return readingModes.has(normalized) ? normalized : null;
}

export function normalizeMangaReadingStatus(
  value: unknown,
): MangaReadingStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase() as MangaReadingStatus;
  return readingStatuses.has(normalized) ? normalized : null;
}

export async function getMangaReadingMode(profileId: string, workId: string) {
  const result = await query<{ source_label: string | null }>(
    `select source_label
       from progress
      where profile_id=$1 and work_id=$2
      limit 1`,
    [profileId, workId],
  );
  return normalizeMangaReadingMode(result.rows[0]?.source_label);
}

export async function listMangaReadingModes(
  profileId: string,
  workIds: string[],
) {
  const map = new Map<string, MangaReadingMode>();
  if (!workIds.length) return map;

  const result = await query<{ work_id: string; source_label: string | null }>(
    `select work_id,source_label
       from progress
      where profile_id=$1
        and work_id=any($2::uuid[])
        and source_label in ('PHYSICAL','DIGITAL','BOTH')`,
    [profileId, workIds],
  );

  for (const row of result.rows) {
    const mode = normalizeMangaReadingMode(row.source_label);
    if (mode) map.set(row.work_id, mode);
  }
  return map;
}

export async function setMangaReadingProgress(
  profileId: string,
  workId: string,
  values: {
    mode: MangaReadingMode | null;
    currentVolume: number | null;
    currentChapter: number | null;
  },
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into progress
         (profile_id,work_id,current_volume,current_chapter,source_label,updated_at)
       values ($1,$2,$3,$4,$5,now())
       on conflict (profile_id,work_id) do update set
         current_volume=excluded.current_volume,
         current_chapter=excluded.current_chapter,
         source_label=excluded.source_label,
         updated_at=now()`,
      [
        profileId,
        workId,
        values.currentVolume,
        values.currentChapter,
        values.mode,
      ],
    );

    if ((values.currentVolume ?? 0) > 0 || (values.currentChapter ?? 0) > 0) {
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

export async function saveInitialMangaReading(
  profileId: string,
  workId: string,
  values: {
    mode: MangaReadingMode;
    status: MangaReadingStatus;
    currentVolume: number | null;
    currentChapter: number | null;
  },
) {
  await withTransaction(async (client) => {
    await client.query(
      `insert into library_entries (profile_id,work_id,status,updated_at)
       values ($1,$2,$3,now())
       on conflict (profile_id,work_id) do update set
         status=excluded.status,
         updated_at=now()`,
      [profileId, workId, values.status],
    );

    await client.query(
      `insert into progress
         (profile_id,work_id,current_volume,current_chapter,source_label,updated_at)
       values ($1,$2,$3,$4,$5,now())
       on conflict (profile_id,work_id) do update set
         current_volume=coalesce(excluded.current_volume,progress.current_volume),
         current_chapter=coalesce(excluded.current_chapter,progress.current_chapter),
         source_label=excluded.source_label,
         updated_at=now()`,
      [
        profileId,
        workId,
        values.currentVolume,
        values.currentChapter,
        values.mode,
      ],
    );
  });
}
