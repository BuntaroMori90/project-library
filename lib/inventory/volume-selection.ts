export function parseVolumeSelection(value: string): number[] {
  if (!value.trim()) throw new Error("Indica i volumi, ad esempio 1–12, 15, 18.");
  if (value.length > 4000) throw new Error("Inserisci al massimo 500 volumi per volta.");
  const selected = new Set<number>();
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (!match) throw new Error("Usa numeri interi e intervalli separati da virgole, ad esempio 1–12, 15.");
    const start = Number(match[1]); const end = Number(match[2] ?? match[1]);
    if (start < 1 || end > 10000 || end < start || end - start >= 500) throw new Error("Intervallo non valido: usa numeri da 1 a 10000 e al massimo 500 volumi.");
    for (let n = start; n <= end; n++) selected.add(n);
    if (selected.size > 500) throw new Error("Inserisci al massimo 500 volumi per volta.");
  }
  return [...selected].sort((a, b) => a - b);
}
