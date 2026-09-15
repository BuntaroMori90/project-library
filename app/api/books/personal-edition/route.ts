import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/profile";
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const workId = asText(formData.get("workId"));
    const editionId = asText(formData.get("editionId"));

    if (!workId) {
      return NextResponse.json({ error: "Libro non valido." }, { status: 400 });
    }

    const values = editionValues(formData);
    const { profile } = await requireProfile();

    if (editionId) {
      await saveBookEditionOverrides(profile.id, workId, editionId, values);
    } else {
      await createPersonalBookEdition(profile.id, workId, values);
    }

    revalidatePath(`/library/books/${workId}`);
    revalidatePath("/library/books");
    revalidatePath("/library");

    const saved = editionId ? "editionDetails" : "personalEdition";
    return NextResponse.json({
      ok: true,
      redirect: `/library/books/${workId}?saved=${saved}#edizioni`,
    });
  } catch (error) {
    console.error("personal-edition upload failed", error);
    return NextResponse.json(
      { error: "Non siamo riusciti a salvare la copertina. Riprova." },
      { status: 500 },
    );
  }
}
