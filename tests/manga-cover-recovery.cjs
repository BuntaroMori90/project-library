const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}, fetchMock) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', 'fetch', code)(name => name === 'server-only' ? {} : imports[name], compiled, compiled.exports, fetchMock);
  return compiled.exports;
}
const score = load('lib/catalog/manga-volume-cover-lookup.ts', { '@/lib/catalog/providers/openlibrary': {} }).scoreCandidate;
const input = { workTitle: 'Hikaru ga Shinda Natsu', alternativeTitles: ["L'estate in cui Hikaru è morto"], unitNumber: 1, publisher: 'J-POP', isbn: null, editionName: 'Standard' };
const candidate = { candidateTitle: "L'ESTATE IN CUI HIKARU E' MORTO VOL.1", candidatePublisher: 'J-POP', candidateLanguage: 'it', identifiers: [], input };
assert.ok(score(candidate) >= 100);
for (const changes of [
  { candidateTitle: "L'ESTATE IN CUI HIKARU E' MORTO VOL.10" },
  { candidateTitle: "L'ESTATE IN CUI HIKARU E' MORTO VOL.1 VARIANT" },
  { candidateTitle: 'Hikaru no Go VOL.1' },
  { candidateLanguage: 'en' },
  { candidatePublisher: 'Unrelated publisher' },
]) assert.equal(score({ ...candidate, ...changes }), 0);
assert.equal(score({ ...candidate, input: { ...input, editionName: 'New Edition' } }), 0);
(async () => {
  // Alias provider must verify a known title; never trust the first search hit blindly.
  const aliases = load('lib/catalog/manga-search-titles.ts', {}, async url => ({ ok: true, json: async () => url.endsWith('/search')
    ? { results: [{ record: { series_id: 1 } }] }
    : { title: 'Hikaru ga Shinda Natsu', associated: [{ title: "L'estate in cui Hikaru è morto" }, { title: 'The Summer Hikaru Died' }] } }));
  assert.ok((await aliases.getMangaSearchTitles("L'estate in cui Hikaru è morto")).includes('Hikaru ga Shinda Natsu'));
  assert.deepEqual(await aliases.getMangaSearchTitles('Different manga'), ['Different manga']);
  for (const scenario of ['mixed', 'all', 'none', 'unavailable']) {
    let remaining = Array.from({ length: 27 }, (_, index) => ({ owned_id: String(index + 1), unit_number: index + 1, work_title: 'Series', original_title: null }));
    const seen = [];
    const route = load('app/api/manga/volume-cover/auto/route.ts', {
      'next/server': { NextResponse: { json: (value, options) => ({ ...value, status: options?.status ?? 200 }) } },
      'next/cache': { revalidatePath: () => {} },
      '@/lib/profile': { getApiProfile: async () => ({ profile: { id: 'p' } }) },
      '@/lib/inventory/volume-cover': { UUID: { test: () => true } },
      '@/lib/catalog/manga-search-titles': { getMangaSearchTitles: async () => ['Series'] },
      '@/lib/catalog/manga-volume-cover-lookup': { findAutomaticMangaVolumeCover: async ({ unitNumber }) => {
        seen.push(unitNumber);
        return { match: scenario === 'all' || (scenario === 'mixed' && unitNumber % 3 === 0) ? { coverUrl: 'https://example.com/cover.jpg', source: 'POPSTORE' } : null, unavailable: scenario === 'unavailable' };
      } },
      '@/lib/repositories/owned-volume-covers': {
        listMissingMangaVolumeCovers: async (_profile, _work, limit, offset) => ({ rows: remaining.slice(offset, offset + limit) }),
        saveAutomaticMangaVolumeCover: async (_profile, id) => { remaining = remaining.filter(row => row.owned_id !== id); return { work_id: 'w' }; },
      },
    });
    let offset = 0, hasMore = true, rounds = 0, unavailable = 0;
    while (hasMore) {
      assert.ok(++rounds <= 14, 'pagination must terminate');
      const result = await route.POST({ json: async () => ({ workId: 'w', offset }) });
      assert.equal(result.status, 200);
      offset = result.nextOffset; hasMore = result.hasMore; unavailable += result.unavailable;
    }
    assert.deepEqual(seen, Array.from({ length: 27 }, (_, i) => i + 1), scenario);
    assert.equal(unavailable, scenario === 'unavailable' ? 27 : 0);
  }
  console.log('PASS: aliases, exact volume, variant/publisher/language guards, all 27 volumes once, pagination termination and provider failures');
})().catch(error => { console.error(error); process.exitCode = 1; });
