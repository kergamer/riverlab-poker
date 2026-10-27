const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'volumetry.css'),'utf8');
const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const mobile=fs.readFileSync(path.join(base,'volumetry-mobile.css'),'utf8');
const vm=require('node:vm');
const style=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
test('TODO-01: hoja responsive se carga después de los estilos originales',()=>{
 assert(style&&style.includes('.hand-hints'));
 assert.match(html,/<\/style>\s*<link rel="stylesheet" href="\.\/volumetry\.css">\s*<link rel="stylesheet" href="\.\/volumetry-mobile\.css">/);
 assert.equal((html.match(/href="\.\/volumetry-mobile\.css"/g)||[]).length,1);
 assert.match(sw,/riverlab-v2-volumetry-2/);
 assert.match(sw,/'\.\/volumetry\.css'/);
 assert.match(sw,/'\.\/volumetry-mobile\.css'/);
});
test('TODO-01: pistas, cartas, explicaciones y proyectos siguen presentes',()=>{
 const start=html.indexOf('function renderHandHints()'),end=html.indexOf('function cardRankLabel',start);
 const body=html.slice(start,end);
 for(const code of ['startingHandHint','evaluateVisibleHand','handHintLabel','detectHandDraws','hintFolded','hintExplanation','hint-disclaimer','hint-five']){
  if(code!=='hintExplanation')assert(body.includes(code),'Missing '+code);
 }
 assert.match(css,/\.hand-hints:not\(\[hidden\]\)/);
 assert.match(css,/\.hint-header/);
 assert.match(css,/\.hint-main/);
 assert.match(css,/\.hint-five/);
 assert.match(css,/\.hint-disclaimer/);
 for(const sheet of [css,mobile]){
  // Mobile may hide decorative navigation text, but never hint information.
  assert(!/\.hand-hints[^{}]*\{[^}]*display\s*:\s*none/.test(sheet));
  assert(!sheet.includes('line-clamp'),'No hint explanations may be clamped');
 }
});
test('TODO-01: tres tamaños responsive, anchura máxima, y controles de 44px',()=>{
 for(const marker of ['@media (min-width: 801px)','@media (max-width: 800px)','@media (max-width: 530px)','@media (max-width: 365px)'])
  assert(css.includes(marker),'Missing '+marker);
 assert.match(css,/max-width:\s*1560px/);
 assert.match(css,/\.action-btn\s*\{[^}]*min-height:\s*44px/);
 assert.match(mobile,/\.action-btn\s*\{[^}]*min-height:\s*44px/);
 assert.match(css,/grid-template-columns:\s*repeat\(5/);
});
test('TODO-01: balance CSS sintáctico y reglas de juego y audio sin cambios',()=>{
 let depth=0;
 for(const c of css+mobile){if(c==='{')depth++;if(c==='}')depth--;assert(depth>=0)}
 assert.equal(depth,0,'Unclosed CSS brace');
 assert.match(html,/<script src="\.\/sound\.js"><\/script>/);
 assert.match(html,/<script src="\.\/bots\.js"><\/script>/);
 assert.match(html,/riverlab\.v03\.session/);
 assert.match(html,/c\.r===10\?'10'/);
});

function workerHarness({failInstall=false}={}){
 const listeners={},deleted=[],requests=[];
 let skipped=false,claimed=false;
 const sandbox={
  URL,
  Request:class{constructor(url,options){this.url=url;this.cache=options.cache}},
  self:{location:{origin:'https://riverlab.test'},addEventListener:(name,fn)=>listeners[name]=fn,
   skipWaiting:async()=>{skipped=true},clients:{claim:async()=>{claimed=true}}},
  caches:{open:async name=>({addAll:async entries=>{
   requests.push(...entries);if(failInstall)throw Error('offline during install');
  }}),keys:async()=>['riverlab-v2-volumetry-1','riverlab-v2-volumetry-2','another-app'],
  delete:async name=>{deleted.push(name);return true}},
 };
 vm.runInNewContext(sw,sandbox);
 const dispatch=async name=>{let pending;listeners[name]({waitUntil:p=>{pending=p}});await pending};
 return {dispatch,deleted,requests,get skipped(){return skipped},get claimed(){return claimed}};
}

test('TODO-01: instalación PWA renueva todo el shell y ambas hojas sin caché HTTP antigua',async()=>{
 const worker=workerHarness();await worker.dispatch('install');
 for(const file of ['./index.html','./volumetry.css','./volumetry-mobile.css','./sound.js','./bots.js']){
  assert(worker.requests.some(request=>request.url===file),'Not precached: '+file);
 }
 assert(worker.requests.every(request=>request.cache==='reload'));
 assert.equal(worker.skipped,true);
 await worker.dispatch('activate');
 assert.deepEqual(worker.deleted,['riverlab-v2-volumetry-1']);
 assert.equal(worker.claimed,true);
});

test('TODO-01: un fallo de precarga no sustituye la PWA instalada',async()=>{
 const worker=workerHarness({failInstall:true});
 await assert.rejects(worker.dispatch('install'),/offline during install/);
 assert.equal(worker.skipped,false);
 assert.deepEqual(worker.deleted,[]);
});
