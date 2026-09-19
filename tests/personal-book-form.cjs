const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('components/personal-book-edition-form.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const slots=[];let cursor=0,reset=0,requests=0,resolveFetch;
const form={reset(){reset++},elements:{namedItem(){return {value:''}}}};
const hooks={useRef(value){return slots[cursor++]??={current:value}},useState(value){const index=cursor++;if(!(index in slots))slots[index]=value;return [slots[index],v=>slots[index]=v]}};
const jsx=(type,props)=>({type,props});const mod={exports:{}};
new Function('require','module','exports','fetch','FormData',code)(name=>({react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({replace(){},refresh(){}})},'@/components/manual-work-cover':{ManualWorkCover:'cover'}})[name],mod,mod.exports,()=>{requests++;return new Promise(resolve=>resolveFetch=resolve)},class{get(){return '9780140328721'}set(){}});
let tree;function render(){cursor=0;tree=mod.exports.PersonalBookEditionForm({workId:'w',title:'Book',author:'Author',canEditAuthor:true});tree.props.ref.current=form}
function all(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(all)]}
const event={preventDefault(){},currentTarget:form};
(async()=>{
 render();all(tree).find(n=>n.type==='cover').props.onChange('data:image/jpeg;base64,AAAA');render();
 const first=tree.props.onSubmit(event);tree.props.onSubmit(event);assert.equal(requests,1);
 resolveFetch({ok:false,json:async()=>({error:'Retry'})});await first;render();assert.equal(reset,0);assert.equal(all(tree).find(n=>n.type==='cover').props.value,'data:image/jpeg;base64,AAAA');
 const second=tree.props.onSubmit(event);resolveFetch({ok:true,json:async()=>({redirect:'/book'})});await second;render();assert.equal(reset,1);assert.equal(all(tree).find(n=>n.type==='cover').props.value,'');
 const third=tree.props.onSubmit(event);resolveFetch({ok:true,json:async()=>({redirect:'/book'})});await third;assert.equal(reset,2);
 console.log('PASS: book form preserves cover on failure, prevents double submit, resets after success and allows next save');
})().catch(error=>{console.error(error);process.exitCode=1});
