import "server-only";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

type Series = { series_id?: number; title?: string; associated?: Array<{ title?: string }> };
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("Titoli alternativi non disponibili.");
  return response;
}

/** Only aliases from a record that contains an exact known title are trusted. */
export async function getMangaSearchTitles(title: string, originalTitle?: string | null): Promise<string[]> {
  const known = [title, originalTitle].filter((item): item is string => Boolean(item?.trim()));
  try {
    const response = await request("https://api.mangaupdates.com/v1/series/search", {
      method: "POST", body: JSON.stringify({ search: title, stype: "title", perpage: 3 }),
    });
    const payload = await response.json() as { results?: Array<{ record?: Series }> };
    for (const item of (payload.results ?? []).slice(0, 2)) {
      if (!item.record?.series_id) continue;
      const detail = await (await request(`https://api.mangaupdates.com/v1/series/${item.record.series_id}`)).json() as Series;
      const aliases = [detail.title, ...(detail.associated ?? []).map((entry) => entry.title)]
        .filter((value): value is string => Boolean(value));
      if (!aliases.some((alias) => known.some((name) => normalize(name) === normalize(alias)))) continue;
      const italian = aliases.filter((alias) => /\b(il|lo|gli|dei|della|delle|nel|nella|in cui|morto|ragazza|ragazzo)\b|^l['’]/i.test(alias));
      const english = aliases.filter((alias) => /^(the|a|an)\s/i.test(alias));
      return [...new Set([title, ...italian, detail.title!, ...english, ...known, ...aliases])].slice(0, 5);
    }
  } catch {
    // Missing aliases must not prevent searching the known title.
  }
  return [...new Set(known)];
}
