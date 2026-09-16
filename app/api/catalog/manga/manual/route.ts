import { NextResponse } from "next/server";
import { createManualManga } from "@/lib/catalog/import-manual-manga";
import { query } from "@/lib/db";
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

export async function POST(request: Request) {
  const authContext = await getApiProfile();
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      totalVolumes?: number | string;
      destination?: CatalogDestination;
    };
    const title = body.title?.trim() ?? "";
    if (!title) {
      return NextResponse.json(
        { error: "Inserisci almeno il titolo del manga." },
        { status: 400 },
      );
    }

    const totalVolumes = asPositiveInteger(body.totalVolumes);
    const created = await createManualManga(title, totalVolumes);
    const destination =
      body.destination === "wishlist" ? "wishlist" : "library";
    const placement = await saveCatalogDestination(
      authContext.profile.id,
      created.workId,
      destination,
    );

    if (destination === "library") {
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
