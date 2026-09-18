import { NextResponse } from "next/server";
import { createManualAnime } from "@/lib/catalog/import-manual-anime";
import { getApiProfile } from "@/lib/profile";
import {
  saveCatalogDestination,
  type CatalogDestination,
} from "@/lib/repositories/catalog-destination";

function asPositiveInteger(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
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
      studio?: string;
      coverUrl?: string;
      totalSeasons?: number | string;
      totalEpisodes?: number | string;
      destination?: CatalogDestination;
    };
    const title = body.title?.trim() ?? "";
    if (!title) {
      return NextResponse.json(
        { error: "Inserisci almeno il titolo dell'anime." },
        { status: 400 },
      );
    }

    const studio = body.studio?.trim() || null;
    const coverUrl = normalizeCoverUrl(body.coverUrl);
    const totalSeasons = asPositiveInteger(body.totalSeasons);
    const totalEpisodes = asPositiveInteger(body.totalEpisodes);
    const created = await createManualAnime(
      title,
      studio,
      coverUrl,
      totalSeasons,
      totalEpisodes,
    );
    const destination =
      body.destination === "wishlist" ? "wishlist" : "library";
    const placement = await saveCatalogDestination(
      authContext.profile.id,
      created.workId,
      destination,
    );

    return NextResponse.json({
      ok: true,
      workId: created.workId,
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
