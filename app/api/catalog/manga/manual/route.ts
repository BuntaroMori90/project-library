import { NextResponse } from "next/server";
import { createManualManga } from "@/lib/catalog/import-manual-manga";
import { query } from "@/lib/db";
import { getApiProfile } from "@/lib/profile";
import {
  saveCatalogDestination,
  type CatalogDestination,
} from "@/lib/repositories/catalog-destination";
import {
  normalizeMangaReadingStatus,
  saveInitialMangaReading,
} from "@/lib/repositories/manga-reading";

function asPositiveInteger(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function asOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeCoverUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const coverUrl = value.trim();
  if (!coverUrl) return null;
  if (coverUrl.length > 240_000) {
    throw new Error("La copertina è troppo pesante.");
  }
  if (
    /^https?:\/\//i.test(coverUrl) ||
    /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(coverUrl)
  ) {
    return coverUrl;
  }
  throw new Error("La copertina deve essere un'immagine valida o un URL http/https.");
}

export async function POST(request: Request) {
  const authContext = await getApiProfile();
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      author?: string;
      coverUrl?: string;
      totalVolumes?: number | string;
      destination?: CatalogDestination;
      intent?: "collection" | "digital" | "mixed";
      readingStatus?: string;
      currentVolume?: number | string;
      currentChapter?: number | string;
    };
    const title = body.title?.trim() ?? "";
    if (!title) {
      return NextResponse.json(
        { error: "Inserisci almeno il titolo del manga." },
        { status: 400 },
      );
    }

    const totalVolumes = asPositiveInteger(body.totalVolumes);
    const author = body.author?.trim() || null;
    const coverUrl = normalizeCoverUrl(body.coverUrl);
    const created = await createManualManga(
      title,
      totalVolumes,
      coverUrl,
      author,
    );
    const destination =
      body.destination === "wishlist" ? "wishlist" : "library";
    const placement = await saveCatalogDestination(
      authContext.profile.id,
      created.workId,
      destination,
    );

    const intent =
      body.intent === "digital" || body.intent === "mixed"
        ? body.intent
        : "collection";

    if (destination === "library" && intent !== "digital") {
      await query(
        `insert into ownership
           (profile_id,edition_id,ownership_format,custom_format,custom_name,updated_at)
         values ($1,$2,'PHYSICAL','Standard','Edizione personale',now())
         on conflict (profile_id,edition_id) do update set
           custom_format=coalesce(ownership.custom_format,'Standard'),
           updated_at=now()`,
        [authContext.profile.id, created.editionId],
      );
    }

    if (!placement.alreadyPresent && destination === "library" && intent !== "collection") {
      await saveInitialMangaReading(authContext.profile.id, created.workId, {
        mode: intent === "mixed" ? "BOTH" : "DIGITAL",
        status: normalizeMangaReadingStatus(body.readingStatus) ?? "IN_PROGRESS",
        currentVolume: asOptionalNumber(body.currentVolume),
        currentChapter: asOptionalNumber(body.currentChapter),
      });
    }

    return NextResponse.json({
      ok: true,
      workId: created.workId,
      totalVolumes,
      ...placement,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Inserimento manuale non riuscito.",
      },
      { status: 500 },
    );
  }
}
