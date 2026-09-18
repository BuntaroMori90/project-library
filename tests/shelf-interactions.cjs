const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>n==='server-only'?{}:imports[n],m,m.exports);return m.exports;}
const {isbnFromBarcode}=load('lib/catalog/isbn.ts');
assert.equal(isbnFromBarcode('9780306406157'),'9780306406157');
assert.equal(isbnFromBarcode('978-0-306-40615-7'),'9780306406157');
for(const value of ['9780306406158','1234567890128','0306406152','','photo.jpg','978030640615712'])assert.equal(isbnFromBarcode(value),null);
let queryCount=0;
const repo=load('lib/repositories/library.ts',{
  '@/lib/repositories/manga-ownership':{getMangaOwnedVolumeNumbers:async()=>new Set([1])},
  '@/lib/db':{query:async(sql,values)=>{
    queryCount++;
    if(sql.includes('from works'))return{rows:[{id:'work',title:'Manga'}]};
    if(sql.includes('from work_creators'))return{rows:[{name:'Author'}]};
    if(sql.includes('from library_entries'))return{rows:[{status:'IN_PROGRESS'}]};
    if(sql.includes('from progress')){assert.ok(sql.includes('source_label'));return{rows:[{current_volume:1,source_label:'BOTH'}]};}
    if(sql.includes('from editions e'))return{rows:[{id:'edition',is_canonical:true}]};
    if(sql.includes('from content_units cu')){
      assert.deepEqual(values,['work','edition','profile']);
      return{rows:[{id:'u1',unit_number:'1.00',owned:true},{id:'u2',unit_number:'2.00',owned:false}]};
    }
    throw new Error('Unexpected query');
  }}
});
(async()=>{const detail=await repo.getMangaDetail('profile','work');assert.equal(detail.work.title,'Manga');assert.deepEqual(detail.creators,['Author']);assert.deepEqual(detail.volumes,[{id:'u1',unit_number:1},{id:'u2',unit_number:2}]);assert.deepEqual([...detail.ownedIds],['u1']);assert.equal(detail.libraryEntry.status,'IN_PROGRESS');assert.equal(detail.progress.current_volume,1);assert.equal(detail.progress.source_label,'BOTH');assert.equal(queryCount,6);console.log('PASS: ISBN checksums and book prefix; manga detail preserves ownership, progress and units with two fewer queries.');})().catch(e=>{console.error(e);process.exit(1)});
