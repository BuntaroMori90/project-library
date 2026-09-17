import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/profile";
import { createPersonalMangaEdition } from "@/lib/repositories/manga-editions";

function asText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function databaseHint(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const candidate = error as { code?: unknown; constraint?: unknown };
  const parts: string[] = [];
  if (typeof candidate.code === "string" && candidate.code) {
    parts.push(`codice ${candidate.code}`);
  }
  if (typeof candidate.constraint === "string" && candidate.constraint) {
    parts.push(`vincolo ${candidate.constraint}`);
  }
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

export async function POST(request: Request) {
  let stage = "parse";

  try {
    const formData = await request.formData();
    const workId = asText(formData.get("workId"));

    if (!workId) {
      return NextResponse.json({ error: "Manga non valido." }, { status: 400 });
    }

    stage = "auth";
    const sessionProfile = await getApiProfile();
    if (!sessionProfile) {
      return NextResponse.json(
        { error: "Sessione scaduta. Accedi di nuovo e riprova." },
        { status: 401 },
      );
    }

    const editionType = asText(formData.get("editionType"));

    const rawTotal = asText(formData.get("totalVolumes"));
    const totalVolumes = rawTotal == null ? null : Number(rawTotal);
    if (totalVolumes != null && (!Number.isInteger(totalVolumes) || totalVolumes < 1 || totalVolumes > 10_000)) {
      return NextResponse.json({ error: "Il totale deve essere un numero intero tra 1 e 10000." }, { status: 400 });
    }
    stage = "database";
    await createPersonalMangaEdition(sessionProfile.profile.id, workId, {
      name: asText(formData.get("customName")),
      publisher: asText(formData.get("customPublisher")),
      language: asText(formData.get("customLanguage")),
      editionType,
      coverUrl: asText(formData.get("customCoverUrl")),
      isbn: asText(formData.get("customIsbn")),
      publicationYear: asNumber(formData.get("customPublicationYear")),
      volumeNumber: asNumber(formData.get("volumeNumber")),
      totalVolumes,
    });

    stage = "refresh";
    revalidatePath(`/library/manga/${workId}`);
    revalidatePath("/library/manga");
    revalidatePath("/library");

    const anchor = editionType?.toLowerCase() === "standard"
      ? "edizione-personale"
      : "collezione-speciale";

    return NextResponse.json({
      ok: true,
      redirect: `/library/manga/${workId}?saved=personalEdition#${anchor}`,
    });
  } catch (error) {
    console.error(`manga personal-edition upload failed at ${stage}`, error);
    const hint = stage === "database" ? databaseHint(error) : "";
    return NextResponse.json(
      {
        error: `Non siamo riusciti a salvare l'edizione personale (fase: ${stage}${hint}).`,
      },
      { status: 500 },
    );
  }
}
