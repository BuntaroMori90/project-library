const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name === 'server-only' ? {} : imports[name], compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
(async () => {
  for (const route of ['import', 'manual']) {
    for (const alreadyPresent of [false, true]) {
      for (const intent of ['digital', 'mixed', 'collection']) {
        const writes = [];
        const handler = load(`app/api/catalog/manga/${route}/route.ts`, {
          'next/server': { NextResponse: { json: value => value } },
          '@/lib/profile': { getApiProfile: async () => ({ profile: { id: 'profile' } }) },
          '@/lib/db': { query: async () => ({ rows: [] }) },
          '@/lib/catalog/manga-provider': { getMangaCatalogProviderByName: () => ({ getById: async () => ({}) }) },
          '@/lib/catalog/import-manga': { importMangaToCatalog: async () => ({ workId: 'work' }) },
          '@/lib/catalog/import-manual-manga': { createManualManga: async () => ({ workId: 'work', editionId: 'edition' }) },
          '@/lib/repositories/catalog-destination': { saveCatalogDestination: async () => ({ placement: 'library', alreadyPresent }) },
          '@/lib/repositories/manga-reading': { normalizeMangaReadingStatus: value => value, saveInitialMangaReading: async (...args) => writes.push(args) },
        });
        const result = await handler.POST({ json: async () => ({ title: 'Test', providerId: '1', destination: 'library', intent, readingStatus: 'IN_PROGRESS', currentVolume: 4 }) });
        assert.equal(result.ok, true);
        assert.equal(writes.length, !alreadyPresent && intent !== 'collection' ? 1 : 0, `${route}/${intent}/existing=${alreadyPresent}`);
      }
    }
  }
  // A competing insert can win after the initial SELECT; RETURNING determines ownership.
  const destination = load('lib/repositories/catalog-destination.ts', {
    '@/lib/db': { withTransaction: async run => run({ query: async () => ({ rows: [] }) }) },
  });
  assert.equal((await destination.saveCatalogDestination('p', 'w', 'library')).alreadyPresent, true);
  console.log('PASS: new manga initialization, duplicate preservation, physical-only additions, concurrent insert detection');
})().catch(error => { console.error(error); process.exitCode = 1; });

