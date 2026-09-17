import { NextResponse } from "next/server";
import { createManualBook } from "@/lib/catalog/import-manual-book";
import { getApiProfile } from "@/lib/profile";
import {
  saveCatalogDestination,
  type CatalogDestination,
} from "@/lib/repositories/catalog-destination";

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
      destination?: CatalogDestination;
    };
    const title = body.title?.trim() ?? "";
    const author = body.author?.trim() || null;
    const coverUrl = normalizeCoverUrl(body.coverUrl);
    if (!title) {
      return NextResponse.json(
        { error: "Inserisci almeno il titolo del libro." },
        { status: 400 },
      );
    }

    const created = await createManualBook(title, author, coverUrl);
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
