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

    stage = "database";
    await createPersonalMangaEdition(sessionProfile.profile.id, workId, {
      name: asText(formData.get("customName")),
      publisher: asText(formData.get("customPublisher")),
      language: asText(formData.get("customLanguage")),
      editionType: asText(formData.get("editionType")),
      coverUrl: asText(formData.get("customCoverUrl")),
      isbn: asText(formData.get("customIsbn")),
      publicationYear: asNumber(formData.get("customPublicationYear")),
      volumeNumber: asNumber(formData.get("volumeNumber")),
    });

    stage = "refresh";
    revalidatePath(`/library/manga/${workId}`);
    revalidatePath("/library/manga");
    revalidatePath("/library");

    return NextResponse.json({
      ok: true,
      redirect: `/library/manga/${workId}?saved=personalEdition#collezione-speciale`,
    });
  } catch (error) {
    console.error(`manga personal-edition upload failed at ${stage}`, error);
    const hint = stage === "database" ? databaseHint(error) : "";
    return NextResponse.json(
      {
        error: `Non siamo riusciti a salvare la copertina (fase: ${stage}${hint}).`,
      },
      { status: 500 },
    );
  }
}
