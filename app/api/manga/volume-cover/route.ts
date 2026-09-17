import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiProfile } from "@/lib/profile";
import { UUID, validateVolumeCover } from "@/lib/inventory/volume-cover";
import { saveOwnedVolumeCover } from "@/lib/repositories/owned-volume-covers";
export async function POST(request: Request) {
  const session = await getApiProfile();
  if (!session)
    return NextResponse.json(
      { error: "Accedi per modificare la copertina." },
      { status: 401 },
    );
  const body = await request.json().catch(() => null);
  if (!body || typeof body.ownedId !== "string" || !UUID.test(body.ownedId))
    return NextResponse.json({ error: "Volume non valido." }, { status: 400 });
  let cover: string | null;
  try {
    cover = validateVolumeCover(body.cover);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const result = await saveOwnedVolumeCover(
      session.profile.id,
      body.ownedId,
      cover,
    );
    if (!result)
      return NextResponse.json(
        { error: "Volume non presente nella tua collezione." },
        { status: 404 },
      );
    revalidatePath(`/library/manga/${result.work_id}`);
    revalidatePath("/library/manga");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const missing = (e as { code?: string }).code === "42703";
    return NextResponse.json(
      {
        error: missing
          ? "Le copertine dei volumi non sono ancora abilitate in questo ambiente."
          : "Salvataggio non confermato. La tua immagine è ancora nel modulo: puoi riprovare.",
      },
      { status: missing ? 503 : 500 },
    );
  }
}
