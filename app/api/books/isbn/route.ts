import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/profile";
import { lookupIsbnEdition, normalizeIsbn, validIsbn } from "@/lib/catalog/isbn-edition";
export async function GET(request: Request) {
  if (!await getApiProfile()) return NextResponse.json({ error: "Accedi di nuovo per cercare." }, { status: 401 });
  const isbn = normalizeIsbn(new URL(request.url).searchParams.get("isbn") ?? "");
  if (!validIsbn(isbn)) return NextResponse.json({ error: "Controlla l’ISBN: servono 10 o 13 caratteri validi." }, { status: 400 });
  try { return NextResponse.json({ edition: await lookupIsbnEdition(isbn) }); }
  catch { return NextResponse.json({ error: "Il catalogo non risponde. Puoi riprovare o inserire i dati a mano." }, { status: 503 }); }
}
