const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, imports = {}) {
  const m = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (n) => (n === "server-only" ? {} : (imports[n] ?? require(n))),
    m,
    m.exports,
  );
  return m.exports;
}
const validation = load("lib/inventory/volume-cover.ts");
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZl0AAAAASUVORK5CYII=";
assert.equal(validation.validateVolumeCover(png), png);
assert.equal(validation.validateVolumeCover(null), null);
assert.equal(
  validation.validateVolumeCover("https://example.com/cover.jpg"),
  "https://example.com/cover.jpg",
);
for (const invalid of [
  undefined,
  {},
  "javascript:alert(1)",
  "http://example.com/a.jpg",
  "https://user:pass@example.com/a",
  "data:image/svg+xml;base64,PHN2Zz4=",
  "x".repeat(220001),
])
  assert.throws(() => validation.validateVolumeCover(invalid));
const id = "3c4a3671-0841-4b0b-bb0e-16b86a8a8cc7";
let signedIn = true,
  found = true,
  dbError = null,
  writes = [],
  refreshed = [];
const auth = {
  getApiProfile: async () =>
    signedIn ? { profile: { id: "profile-a" } } : null,
};
const route = load("app/api/manga/volume-cover/route.ts", {
  "next/server": { NextResponse: Response },
  "next/cache": { revalidatePath: (p) => refreshed.push(p) },
  "@/lib/profile": auth,
  "@/lib/inventory/volume-cover": validation,
  "@/lib/repositories/owned-volume-covers": {
    saveOwnedVolumeCover: async (...args) => {
      if (dbError) throw dbError;
      writes.push(args);
      return found ? { work_id: "work-a" } : null;
    },
  },
});
const post = (body) =>
  route.POST(
    new Request("https://libronia.example/api/manga/volume-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
(async () => {
  signedIn = false;
  assert.equal((await post({ ownedId: id, cover: png })).status, 401);
  assert.equal(writes.length, 0);
  signedIn = true;
  assert.equal((await post({ ownedId: "invalid", cover: png })).status, 400);
  assert.equal(writes.length, 0);
  assert.equal(
    (await post({ ownedId: id, cover: "javascript:alert(1)" })).status,
    400,
  );
  assert.equal(writes.length, 0);
  assert.equal((await post({ ownedId: id, cover: png })).status, 200);
  assert.deepEqual(writes[0], ["profile-a", id, png]);
  assert.deepEqual(refreshed, ["/library/manga/work-a", "/library/manga"]);
  found = false;
  assert.equal((await post({ ownedId: id, cover: png })).status, 404);
  found = true;
  assert.equal((await post({ ownedId: id, cover: null })).status, 200);
  assert.equal(writes.at(-1)[2], null);
  dbError = { code: "42703" };
  assert.equal((await post({ ownedId: id, cover: png })).status, 503);
  dbError = new Error("db unavailable");
  assert.equal((await post({ ownedId: id, cover: png })).status, 500);
  let imageFound = true,
    reads = 0;
  const getRoute = load("app/api/manga/volume-cover/[ownedId]/route.ts", {
    "@/lib/profile": auth,
    "@/lib/inventory/volume-cover": validation,
    "@/lib/repositories/owned-volume-covers": {
      getOwnedVolumeCover: async (profile, owned) => {
        reads++;
        assert.equal(profile, "profile-a");
        assert.equal(owned, id);
        return imageFound ? png : null;
      },
    },
  });
  const get = (headers) =>
    getRoute.GET(
      new Request("https://libronia.example/api/manga/volume-cover/" + id, {
        headers,
      }),
      { params: Promise.resolve({ ownedId: id }) },
    );
  const image = await get();
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("Content-Type"), "image/png");
  assert.equal(image.headers.get("Cache-Control"), "private, no-cache");
  const etag = image.headers.get("ETag");
  assert.equal((await get({ "if-none-match": etag })).status, 304);
  assert.equal(reads, 2);
  imageFound = false;
  assert.equal((await get({ "if-none-match": etag })).status, 404);
  signedIn = false;
  assert.equal((await get({ "if-none-match": etag })).status, 401);
  assert.equal(reads, 3);
  console.log(
    "PASS: cover validation, login required, request errors, profile-scoped writes, reset, missing migration, DB errors, private image response and authorization before 304.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
async function testEditionBatch() {
  const calls=[];
  const repo=load('lib/repositories/manga-editions.ts', {'@/lib/db':{withTransaction:async run=>run({query:async(sql,values)=>{calls.push({sql,values});if(sql.includes('select w.id'))return{rows:[{id:'work',manual:false,cover_url:null}]};if(sql.includes('insert into editions'))return{rows:[{id:'edition'}]};return{rows:[]};}})}});
  const input={name:null,publisher:null,language:null,editionType:'standard',coverUrl:null,isbn:null,publicationYear:null,volumeNumber:null,totalVolumes:500};
  await repo.createPersonalMangaEdition('profile','work',input);
  const units=calls.filter(c=>c.sql.includes('insert into content_units'));
  assert.equal(units.length,1);assert.deepEqual(units[0].values,['work','edition',500]);
  const before=calls.length;
  for(const totalVolumes of [0,-1,1.5,10001,Infinity])await assert.rejects(repo.createPersonalMangaEdition('profile','work',{...input,totalVolumes}));
  assert.equal(calls.length,before);
  console.log('PASS: 500 volumes in one insertion; invalid totals rejected before database calls.');
}
testEditionBatch().catch(e=>{console.error(e);process.exit(1)});
