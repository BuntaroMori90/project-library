import type { PublicationStatus } from "@/lib/catalog/types";

const SEARCH_URL = "https://api.mangaupdates.com/v1/series/search";
const SERIES_URL = "https://api.mangaupdates.com/v1/series";

type SearchRecord = {
  series_id?: number | string;
  title?: string | null;
};

type SearchPayload = {
  results?: Array<{ record?: SearchRecord }>;
};

type SeriesPayload = {
  latest_chapter?: string | number | null;
  status?: string | null;
  completed?: boolean | null;
};

export type MangaUpdatesCounts = {
  chapterCount: number | null;
  volumeCount: number | null;
  publicationStatus: PublicationStatus | null;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function positiveInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Math.floor(Number(match[0]));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function volumeCountFromStatus(status?: string | null) {
  if (!status) return null;
  const match = status.match(/(\d+)\s*vol(?:ume)?s?\b/i);
  return match ? positiveInteger(match[1]) : null;
}

function chapterCountFromStatus(status?: string | null) {
  if (!status) return null;
  const match = status.match(/(\d+)\s*chapters?\b/i);
  return match ? positiveInteger(match[1]) : null;
}

function statusFromSeries(payload: SeriesPayload): PublicationStatus | null {
  const value = payload.status?.toLowerCase() ?? "";
  if (payload.completed || value.includes("complete") || value.includes("finished")) {
    return "COMPLETED";
  }
  if (value.includes("hiatus")) return "HIATUS";
  if (value.includes("discontinued") || value.includes("cancel")) return "CANCELLED";
  if (value.includes("ongoing")) return "ONGOING";
  return null;
}

async function request(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMangaUpdatesCounts(
  title: string,
): Promise<MangaUpdatesCounts | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  try {
    const searchResponse = await request(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: cleanTitle, stype: "title", perpage: 5 }),
    });
    if (!searchResponse.ok) return null;

    const search = (await searchResponse.json()) as SearchPayload;
    const records = (search.results ?? [])
      .map((item) => item.record)
      .filter((record): record is SearchRecord => Boolean(record?.series_id));
    if (!records.length) return null;

    const target = normalize(cleanTitle);
    const record =
      records.find((candidate) => normalize(candidate.title ?? "") === target) ??
      records[0];
    if (!record.series_id) return null;

    const detailResponse = await request(
      `${SERIES_URL}/${encodeURIComponent(String(record.series_id))}`,
      { cache: "no-store" },
    );
    if (!detailResponse.ok) return null;

    const detail = (await detailResponse.json()) as SeriesPayload;
    const latestChapter = positiveInteger(detail.latest_chapter);
    const statusChapterCount = chapterCountFromStatus(detail.status);

    return {
      chapterCount:
        latestChapter && statusChapterCount
          ? Math.max(latestChapter, statusChapterCount)
          : latestChapter ?? statusChapterCount,
      volumeCount: volumeCountFromStatus(detail.status),
      publicationStatus: statusFromSeries(detail),
    };
  } catch {
    return null;
  }
}
