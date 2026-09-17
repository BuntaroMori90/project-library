export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateVolumeCover(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 220_000)
    throw new Error("Usa un’immagine più piccola (massimo 220 KB codificati).");
  const cover = value.trim();
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(cover))
    return cover;
  try {
    const url = new URL(cover);
    if (
      cover.length <= 2048 &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {}
  throw new Error(
    "Carica un’immagine JPG, PNG o WebP oppure usa un indirizzo HTTPS valido.",
  );
}
