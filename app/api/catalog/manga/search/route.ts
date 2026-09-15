import { NextResponse } from "next/server";
import { searchMangaCatalog } from "@/lib/catalog/manga-provider";
import { getApiProfile } from "@/lib/profile";

export async function GET(request: Request) {
  if (!(await getApiProfile())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [], providers: [] });

  try {
    const result = await searchMangaCatalog(query);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ricerca non disponibile.",
      },
      { status: 503 },
    );
  }
}
