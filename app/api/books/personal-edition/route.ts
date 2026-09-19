import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { saveManualBookAuthors } from "@/lib/repositories/manual-book-authors";
import { getApiProfile } from "@/lib/profile";
import { createPersonalBookEdition } from "@/lib/repositories/book-editions";
import {
  saveBookEditionOverrides,
  type BookEditionOverrides,
} from "@/lib/repositories/personal";

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

function editionValues(formData: FormData): BookEditionOverrides {
  return {
    name: asText(formData.get("customName")),
    publisher: asText(formData.get("customPublisher")),
    language: asText(formData.get("customLanguage")),
    format: asText(formData.get("customFormat")),
    coverUrl: asText(formData.get("customCoverUrl")),
    pageCount: asNumber(formData.get("customPageCount")),
    isbn: asText(formData.get("customIsbn")),
    publicationYear: asNumber(formData.get("customPublicationYear")),
  };
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
    const editionId = asText(formData.get("editionId"));

    if (!workId) {
      return NextResponse.json({ error: "Libro non valido." }, { status: 400 });
    }

    const values = editionValues(formData);

    stage = "auth";
    const sessionProfile = await getApiProfile();
    if (!sessionProfile) {
      return NextResponse.json(
        { error: "Sessione scaduta. Accedi di nuovo e riprova." },
        { status: 401 },
      );
    }

    stage = "database";
    if (editionId) {
      await saveBookEditionOverrides(
        sessionProfile.profile.id,
        workId,
        editionId,
        values,
      );
    } else {
      await createPersonalBookEdition(
        sessionProfile.profile.id,
        workId,
        values,
      );
    }

    await saveManualBookAuthors(workId, asText(formData.get("customAuthor")));

    stage = "refresh";
    revalidatePath(`/library/books/${workId}`);
    revalidatePath("/library/books");
    revalidatePath("/library");

    const saved = editionId ? "editionDetails" : "personalEdition";
    return NextResponse.json({
      ok: true,
      redirect: `/library/books/${workId}?saved=${saved}#edizioni`,
    });
  } catch (error) {
    console.error(`personal-edition upload failed at ${stage}`, error);
    const hint = stage === "database" ? databaseHint(error) : "";
    return NextResponse.json(
      {
        error: `Non siamo riusciti a salvare la copertina (fase: ${stage}${hint}).`,
      },
      { status: 500 },
    );
  }
}
