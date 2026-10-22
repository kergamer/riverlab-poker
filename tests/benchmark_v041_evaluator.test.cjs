'use strict';
/* V0.4.1 independent evaluator and equity consistency checks.
 * Compare bot optimized evaluator to existing canonical exhaustive 5-card evaluator.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const botCode=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
const start=html.indexOf('function straightHigh(sorted)'),end=html.indexOf('const HAND_NAMES',start);
assert(start>=0&&end>start,'Game reference evaluator extraction failed');
const g={};vm.createContext(g);vm.runInContext(html.slice(start,end)+';this.best7Ref=best7;',g);
const w={},memory={getItem(){return null},setItem(){},removeItem(){}};
const c={window:w,localStorage:memory,Math,console};vm.createContext(c);vm.runInContext(botCode,c);
const bot=w.RiverlabBots,SUITS='shdc';
function seeded(seed){let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)}
function cards(r,count){const deck=[];for(let rank=2;rank<=14;rank++)for(const s of SUITS)deck.push({r:rank,s});const out=[];for(let i=0;i<count;i++){const at=Math.floor(r()*deck.length);out.push(deck[at]);deck.splice(at,1)}return out}
function card(r,s){return {r,s}}
test('12.000 manos de 5, 6 y 7 cartas: evaluador bot idéntico al canónico del motor',()=>{
 const random=seeded(20261022);
 let tested=0;
 for(const len of [5,6,7])for(let i=0;i<4000;i++){
  const dealt=cards(random,len);
  const expected=JSON.stringify(g.best7Ref(dealt));
  const observed=JSON.stringify(bot.evaluate(dealt));
  assert.equal(observed,expected,'Mismatch #'+tested+' '+JSON.stringify(dealt));
  tested++;
 }
 assert.equal(tested,12000);
});
test('Nuts postflop: equity=100% frente a 1 a 5 manos rivales desconocidas',()=>{
 const hole=[card(14,'s'),card(10,'s')],board=[card(13,'s'),card(12,'s'),card(11,'s'),card(3,'d'),card(2,'h')];
 for(let n=1;n<=5;n++){
  const opponents=Array.from({length:n},(_,i)=>({seat:i+2,folded:false,action:'raise'}));
  const raw={seat:1,hole,board,opponents};
  assert.equal(bot.equitySample(raw,seeded(19+n),90),1);
 }
});
test('Estimación probabilística no depende de cartas privadas supuestamente reveladas por el test',()=>{
 const hole=[card(14,'s'),card(10,'s')],board=[card(13,'s'),card(12,'h'),card(11,'s'),card(7,'d')];
 const opponents=[{seat:0,folded:false,action:'raise'},{seat:2,folded:false,action:'call'}];
 const a=bot.equitySample({seat:1,hole,board,opponents},seeded(451),250);
 const poisoned=opponents.map((x,i)=>({...x,cards:i?[card(14,'d'),card(14,'h')]:[card(2,'c'),card(2,'d')]}));
 const b=bot.equitySample({seat:1,hole,board,opponents:poisoned},seeded(451),250);
 assert.equal(a,b);
 assert(a>=0&&a<=1);
});
test('Rangos: 169 clases con sumatorio de 1326 combinaciones',()=>{
 assert.equal(bot.catalog.length,169);
 assert.equal(bot.catalog.reduce((s,c)=>s+c.combos,0),1326);
 assert.equal(new Set(bot.catalog.map(x=>x.name)).size,169);
});
