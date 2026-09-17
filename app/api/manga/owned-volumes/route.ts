import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiProfile } from "@/lib/profile";
import { addOwnedVolumes } from "@/lib/repositories/bulk-owned-volumes";
import { removeOwnedVolume } from "@/lib/repositories/owned-volume-covers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const identity = await getApiProfile();
  if (!identity) return NextResponse.json({ error: "Accedi per salvare i volumi." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !UUID.test(body.workId) || !UUID.test(body.editionId) || typeof body.selection !== "string") return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  let result;
  try {
    result = await addOwnedVolumes(identity.profile.id, body.workId, body.editionId, body.selection);
  } catch {
    return NextResponse.json({ error: "Salvataggio non confermato. Verifica numeri ed edizione, poi riprova: i volumi già presenti non vengono duplicati." }, { status: 400 });
  }
  revalidatePath(`/library/manga/${body.workId}`);
  revalidatePath("/library/manga");
  revalidatePath("/library");
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const identity = await getApiProfile();
  if (!identity) return NextResponse.json({ error: "Accedi per modificare i tuoi volumi." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.ownedId !== "string" || !UUID.test(body.ownedId)) {
    return NextResponse.json({ error: "Volume non valido." }, { status: 400 });
  }

  try {
    const removed = await removeOwnedVolume(identity.profile.id, body.ownedId);
    if (!removed) {
      return NextResponse.json({ error: "Volume non trovato nella tua collezione." }, { status: 404 });
    }
    revalidatePath(`/library/manga/${removed.work_id}`);
    revalidatePath("/library/manga");
    revalidatePath("/library");
    return NextResponse.json({ removed: true, workId: removed.work_id });
  } catch {
    return NextResponse.json({ error: "Rimozione non confermata. Riprova." }, { status: 400 });
  }
}
