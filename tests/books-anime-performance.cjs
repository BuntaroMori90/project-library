const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
 const mod = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 new Function('require', 'module', 'exports', code)(name => name === 'server-only' ? {} : imports[name] ?? require(name), mod, mod.exports);
 return mod.exports;
}
(async () => {
 const calls = [];
 const db = { withTransaction: async run => run({ query: async (sql, params) => {
  calls.push({sql, params});
  if (sql.includes('select work_id from external_ids')) return { rows: [{work_id: 'work'}] };
  return { rows: [] };
 } }) };
 const anime = load('lib/catalog/import-anime.ts', { '@/lib/db': db });
 await anime.importAnimeToCatalog({ providerId:'1',title:'Long series',genres:[],publicationStatus:'ONGOING',seasons:[{number:1,providerId:'s1'}],episodes:Array.from({length:1000},(_,i)=>({seasonNumber:1,episodeNumber:i+1,providerId:String(i)})) });
 assert.equal(calls.length,4,'1000 episodes require four database queries');
 assert.equal(JSON.parse(calls[3].params[1]).length,1000);
 assert.match(calls[3].sql,/on conflict \(parent_unit_id,unit_type,unit_number\)/);
 calls.length=0;
 const books = load('lib/catalog/import-book.ts', { '@/lib/db': db });
 await books.importBookToCatalog({providerId:'OL1W',title:'Book',genres:[],creators:[],publicationStatus:'COMPLETED',editions:Array.from({length:250},(_,i)=>({providerId:`OL${i}M`,title:'Edition '+i}))});
 assert.equal(calls.length,6,'250 editions require six queries without authors');
 const batch=calls.find(call=>call.sql.includes('jsonb_to_recordset'));
 assert.equal(JSON.parse(batch.params[1]).length,250);
 assert.equal(JSON.parse(batch.params[1]).filter(row=>row.is_canonical).length,1);
 const isbn = load('lib/catalog/isbn-edition.ts');
 assert.equal(isbn.validIsbn('9780140328721'),true);
 assert.equal(isbn.validIsbn('0140328726'),true);
 assert.equal(isbn.validIsbn('9780140328722'),false);
 const originalFetch=global.fetch;
 try {
  global.fetch=async url=>({ok:true,status:200,json:async()=>url.includes('openlibrary') ? {title:'Wrong edition',isbn_13:['9780140328722']} : {items:[{volumeInfo:{title:'Correct edition',industryIdentifiers:[{identifier:'9780140328721'}]}}]} });
  assert.equal((await isbn.lookupIsbnEdition('9780140328721')).title,'Correct edition');
  global.fetch=async()=>({ok:true,status:200,json:async()=>({})});
  assert.equal(await isbn.lookupIsbnEdition('9780140328721'),null);
  global.fetch=async()=>{throw new Error('offline')};
  await assert.rejects(()=>isbn.lookupIsbnEdition('9780140328721'),/catalogo/);
 } finally { global.fetch=originalFetch; }
 console.log('PASS: bounded import query counts, 1000 episodes, 250 editions, ISBN validation, exact match, fallback, outage vs no result');
})().catch(error=>{console.error(error);process.exitCode=1});
