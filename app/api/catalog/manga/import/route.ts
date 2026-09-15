import { NextResponse } from "next/server";
import { getMangaCatalogProviderByName } from "@/lib/catalog/manga-provider";
import { importMangaToCatalog } from "@/lib/catalog/import-manga";
import { getApiProfile } from "@/lib/profile";
import {
  saveCatalogDestination,
  type CatalogDestination,
} from "@/lib/repositories/catalog-destination";

export async function POST(request: Request) {
  const authContext = await getApiProfile();
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = authContext.profile.id;

  try {
    const body = (await request.json()) as {
      providerId?: string;
      provider?: string;
      destination?: CatalogDestination;
    };

    if (!body.providerId) {
      return NextResponse.json(
        { error: "providerId mancante" },
        { status: 400 },
      );
    }

    const provider = getMangaCatalogProviderByName(body.provider);
    const manga = await provider.getById(body.providerId);
    const imported = await importMangaToCatalog(manga);
    const destination =
      body.destination === "wishlist" ? "wishlist" : "library";
    const placement = await saveCatalogDestination(
      profileId,
      imported.workId,
      destination,
    );

    return NextResponse.json({
      ok: true,
      workId: imported.workId,
      ...placement,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import non riuscito.",
      },
      { status: 500 },
    );
  }
}
