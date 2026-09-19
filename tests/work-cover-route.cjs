const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('app/api/library/cover/work/[workId]/route.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const workId = '11111111-1111-4111-8111-111111111111';
let signedIn = true, mediaType = 'MANGA', cover = 'data:image/png;base64,aGVsbG8=', calls = 0;
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)(name => ({
 '@/lib/profile': { getApiProfile: async () => signedIn ? { profile: { id: 'owner' } } : null },
 '@/lib/db': { query: async (sql, params) => {
   calls++; assert.deepEqual(params, ['owner', workId]);
   assert.match(sql, /le.profile_id=\$1/);
   assert.match(sql, /o.profile_id=\$1/);
   // Exercise the media predicate from the actual query: BOOK-only must fail for manga.
   const predicate = sql.match(/and w.media_type[^\n]+/)[0];
   return { rows: predicate.includes(`'${mediaType}'`) ? [{ cover_url: cover }] : [] };
 } },
})[name], mod, mod.exports);
const get = () => mod.exports.GET(new Request('https://example.test'), { params: Promise.resolve({workId}) });
(async () => {
 for (mediaType of ['MANGA', 'BOOK']) {
  const response = await get(); assert.equal(response.status, 200, mediaType);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'private, no-cache');
  assert.equal(await response.text(), 'hello');
 }
 cover='data:image/jpeg;base64,bmV3'; assert.equal(await (await get()).text(), 'new');
 cover=null; assert.equal((await get()).status,404);
 cover='data:image/svg+xml;base64,aGVsbG8='; assert.equal((await get()).status,415);
 signedIn=false; const before=calls; assert.equal((await get()).status,401); assert.equal(calls,before);
 console.log('PASS: manga and book work covers, updated bytes, private cache revalidation, missing/unsupported image, authentication');
})().catch(error=>{console.error(error);process.exitCode=1});
