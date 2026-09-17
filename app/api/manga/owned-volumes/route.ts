import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/profile";
import { addOwnedVolumes } from "@/lib/repositories/bulk-owned-volumes";
import { listOwnedMangaShelfVolumes } from "@/lib/repositories/manga-owned-shelf";
import { toggleOwnedUnit } from "@/lib/repositories/personal";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refreshManga(workId: string) {
  revalidatePath(`/library/manga/${workId}`);
  revalidatePath("/library/manga");
  revalidatePath("/library");
}

export async function GET(request: Request) {
  const identity = await getApiProfile();
  if (!identity) {
    return NextResponse.json({ error: "Accedi per vedere i volumi." }, { status: 401 });
  }

  const workId = new URL(request.url).searchParams.get("workId") ?? "";
  if (!uuid.test(workId)) {
    return NextResponse.json({ error: "Opera non valida." }, { status: 400 });
  }

  const volumes = await listOwnedMangaShelfVolumes(identity.profile.id, workId);
  return NextResponse.json({ volumes });
}

export async function POST(request: Request) {
  const identity = await getApiProfile();
  if (!identity) {
    return NextResponse.json({ error: "Accedi per salvare i volumi." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !uuid.test(body.workId) ||
    !uuid.test(body.editionId) ||
    typeof body.selection !== "string"
  ) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await addOwnedVolumes(
      identity.profile.id,
      body.workId,
      body.editionId,
      body.selection,
    );
    refreshManga(body.workId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Salvataggio non confermato. Verifica numeri ed edizione, poi riprova: i volumi già presenti non vengono duplicati.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const identity = await getApiProfile();
  if (!identity) {
    return NextResponse.json({ error: "Accedi per modificare i volumi." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !uuid.test(body.workId) ||
    !uuid.test(body.editionId) ||
    !uuid.test(body.unitId)
  ) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  await toggleOwnedUnit(identity.profile.id, body.editionId, body.unitId);
  refreshManga(body.workId);
  return NextResponse.json({ ok: true });
}
