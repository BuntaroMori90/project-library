const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('components/book-cover-field.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const slots = []; const effects = []; let cursor = 0; let pendingEffects = [];
const hooks = {
  useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
  useEffect(callback, deps) { const index = cursor++; const previous = effects[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) pendingEffects.push(() => { previous?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; }); },
};
let requests = 0, resets = 0, refreshes = 0, resolveFetch;
const submitted = [];
const form = new EventTarget(); const button = { disabled: false };
form.querySelectorAll = () => [button]; form.reset = () => { resets++; };
const router = { replace: href => { assert.equal(href, '/same-page#variant'); }, refresh: () => refreshes++ };
const jsx = (type, props) => ({ type, props });
const compiled = { exports: {} };
new Function('require', 'module', 'exports', 'fetch', 'FormData', code)(name => ({ react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/navigation': { useRouter: () => router }, 'lucide-react': {} })[name], compiled, compiled.exports,
  (_url, options) => { requests++; submitted.push(options.body); return new Promise(resolve => { resolveFetch = resolve; }); },
  class { constructor(source) { assert.equal(source, form); } });
let tree;
function render() {
  cursor = 0; pendingEffects = [];
  tree = compiled.exports.BookCoverField({ uploadEndpoint: '/api/manga/personal-edition', resetOnSave: true, defaultValue: 'data:image/png;base64,AAAA' });
  tree.props.ref.current = { closest: () => form };
  pendingEffects.forEach(run => run());
}
function all(node) { return !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)]; }
const tick = () => new Promise(resolve => setImmediate(resolve));
function submit() { const event = new Event('submit', { cancelable: true }); form.dispatchEvent(event); assert.equal(event.defaultPrevented, true); }
(async () => {
  render();
  // Uploaded cover: double click must produce only one request.
  submit(); submit(); assert.equal(requests, 1); render(); assert.equal(button.disabled, true);
  resolveFetch({ ok: true, json: async () => ({ redirect: '/same-page#variant' }) }); await tick(); render();
  assert.equal(resets, 1); assert.equal(button.disabled, false);
  assert.equal(all(tree).find(node => node.props?.name === 'customCoverUrl').props.value, '');
  // Next variant without cover, at exactly the same URL, must save and unlock again.
  submit(); assert.equal(requests, 2);
  resolveFetch({ ok: true, json: async () => ({ redirect: '/same-page#variant' }) }); await tick(); render();
  assert.equal(resets, 2); assert.equal(refreshes, 2); assert.equal(button.disabled, false);
  // URL cover must remain available after an error, and a retry must work.
  all(tree).find(node => node.props?.type === 'url').props.onChange({ target: { value: 'https://example.com/variant.jpg' } }); render();
  submit(); render(); resolveFetch({ ok: false, json: async () => ({ error: 'Errore di prova' }) }); await tick(); render();
  assert.equal(resets, 2); assert.equal(button.disabled, false);
  assert.equal(all(tree).find(node => node.props?.name === 'customCoverUrl').props.value, 'https://example.com/variant.jpg');
  submit(); resolveFetch({ ok: true, json: async () => ({ redirect: '/same-page#variant' }) }); await tick(); render();
  assert.equal(requests, 4); assert.equal(resets, 3); assert.equal(refreshes, 3); assert.equal(button.disabled, false);
  console.log('PASS: successive variant saves at same URL, upload/no cover/URL, double-submit protection, form reset and retry after error');
})().catch(error => { console.error(error); process.exitCode = 1; });
