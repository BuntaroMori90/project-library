import { NextResponse } from "next/server";
import { getBookCatalogProvider } from "@/lib/catalog/book-provider";
import { importBookToCatalog } from "@/lib/catalog/import-book";
import { getApiProfile } from "@/lib/profile";
import {
  saveCatalogDestination,
  type CatalogDestination,
} from "@/lib/repositories/catalog-destination";
export async function POST(request: Request) {
  const authContext = await getApiProfile();
  if (!authContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profileId = authContext.profile.id;
  try {
    const body = (await request.json()) as {
      providerId?: string;
      destination?: CatalogDestination;
    };
    if (!body.providerId)
      return NextResponse.json(
        { error: "providerId mancante" },
        { status: 400 },
      );
    const provider = getBookCatalogProvider();
    const book = await provider.getById(body.providerId);
    const imported = await importBookToCatalog(book);
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
