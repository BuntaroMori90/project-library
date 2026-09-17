import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiProfile } from "@/lib/profile";
import { UUID } from "@/lib/inventory/volume-cover";
import { findAutomaticMangaVolumeCover } from "@/lib/catalog/manga-volume-cover-lookup";
import {
  listMissingMangaVolumeCovers,
  saveAutomaticMangaVolumeCover,
} from "@/lib/repositories/owned-volume-covers";

const BATCH_SIZE = 8;
const CONCURRENCY = 2;

type LookupResult = {
  ownedId: string;
  volume: number;
  saved: boolean;
  source?: "GOOGLE_BOOKS" | "OPEN_LIBRARY";
};

export async function POST(request: Request) {
  const session = await getApiProfile();
  if (!session) {
    return NextResponse.json(
      { error: "Accedi per recuperare le copertine." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const workId = typeof body?.workId === "string" ? body.workId : "";
  const requestedOffset = Number(body?.offset ?? 0);
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0
    ? Math.min(requestedOffset, 5000)
    : 0;

  if (!UUID.test(workId)) {
    return NextResponse.json({ error: "Manga non valido." }, { status: 400 });
  }

  try {
    const candidatesResult = await listMissingMangaVolumeCovers(
      session.profile.id,
      workId,
      BATCH_SIZE + 1,
      offset,
    );
    const hasMore = candidatesResult.rows.length > BATCH_SIZE;
    const candidates = candidatesResult.rows.slice(0, BATCH_SIZE);
    const outcomes: LookupResult[] = [];

    for (let index = 0; index < candidates.length; index += CONCURRENCY) {
      const chunk = candidates.slice(index, index + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (candidate): Promise<LookupResult> => {
          const volume = Number(candidate.unit_number);
          if (!Number.isInteger(volume) || volume < 1) {
            return { ownedId: candidate.owned_id, volume, saved: false };
          }

          const match = await findAutomaticMangaVolumeCover({
            workTitle: candidate.work_title,
            unitNumber: volume,
            publisher: candidate.publisher,
            isbn: candidate.isbn,
            editionName: candidate.edition_name,
          });
          if (!match) {
            return { ownedId: candidate.owned_id, volume, saved: false };
          }

          const saved = await saveAutomaticMangaVolumeCover(
            session.profile.id,
            candidate.owned_id,
            match.coverUrl,
          );
          return {
            ownedId: candidate.owned_id,
            volume,
            saved: Boolean(saved),
            source: match.source,
          };
        }),
      );
      outcomes.push(...chunkResults);
    }

    const updated = outcomes.filter((item) => item.saved).length;
    const checked = outcomes.length;
    if (updated > 0) {
      revalidatePath(`/library/manga/${workId}`);
      revalidatePath("/library/manga");
      revalidatePath("/library");
    }

    return NextResponse.json({
      checked,
      updated,
      unresolved: checked - updated,
      hasMore,
      nextOffset: updated > 0 ? 0 : offset + checked,
      sources: {
        googleBooks: outcomes.filter(
          (item) => item.saved && item.source === "GOOGLE_BOOKS",
        ).length,
        openLibrary: outcomes.filter(
          (item) => item.saved && item.source === "OPEN_LIBRARY",
        ).length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ricerca automatica non disponibile in questo momento." },
      { status: 500 },
    );
  }
}
