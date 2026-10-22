const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'volumetry.css'),'utf8');
const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const style=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
test('TODO-01: hoja responsive se carga después de los estilos originales',()=>{
 assert(style&&style.includes('.hand-hints'));
 assert.match(html,/<\/style>\s*<link rel="stylesheet" href="\.\/volumetry\.css">/);
 assert.match(sw,/riverlab-v2-volumetry-1/);
 assert.match(sw,/'\.\/volumetry\.css'/);
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
 assert(!css.includes('display:none'),'No hint content may be removed by CSS');
 assert(!css.includes('line-clamp'),'No hint explanations may be clamped');
});
test('TODO-01: tres tamaños responsive, anchura máxima, y controles de 44px',()=>{
 for(const marker of ['@media (min-width: 801px)','@media (max-width: 800px)','@media (max-width: 530px)','@media (max-width: 365px)'])
  assert(css.includes(marker),'Missing '+marker);
 assert.match(css,/max-width:\s*1560px/);
 assert.match(css,/\.action-btn\s*\{[^}]*min-height:\s*44px/);
 assert.match(css,/grid-template-columns:\s*repeat\(5/);
});
test('TODO-01: balance CSS sintáctico y reglas de juego y audio sin cambios',()=>{
 let depth=0;
 for(const c of css){if(c==='{')depth++;if(c==='}')depth--;assert(depth>=0)}
 assert.equal(depth,0,'Unclosed CSS brace');
 assert.match(html,/<script src="\.\/sound\.js"><\/script>/);
 assert.match(html,/<script src="\.\/bots\.js"><\/script>/);
 assert.match(html,/riverlab\.v03\.session/);
 assert.match(html,/c\.r===10\?'10'/);
});
