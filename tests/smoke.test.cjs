const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,'Missing embedded game engine');
const nodes={};const el=id=>nodes[id]||={innerHTML:'',textContent:'',style:{},value:'',setAttribute(){},classList:{add(){},toggle(){},remove(){}}};
const storage=new Map();
const ctx={window:{},document:{documentElement:{lang:'es'},hidden:false,getElementById:el,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},console,Date,Math,Intl};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const app=ctx.window.__riverlab;const card=(r,s='s')=>({r,s});
test('Mesa inicial de 6 jugadores',()=>{assert.equal(app.state.players.length,6);assert.equal(app.state.hand,1)});
test('Escalera baja A-2-3-4-5',()=>{assert.equal(app.rank5([card(14,'s'),card(2,'d'),card(3,'h'),card(4,'c'),card(5,'d')])[0],4)});
test('Escalera real',()=>{assert.equal(app.rank5([card(10),card(11),card(12),card(13),card(14)])[0],8)});
test('Botes secundarios sin pérdida de fichas',()=>{
 const p=[{seat:0,invested:20,folded:false,cards:[card(14,'s'),card(14,'h')]},{seat:1,invested:100,folded:false,cards:[card(13,'s'),card(13,'h')]},{seat:2,invested:100,folded:false,cards:[card(12,'s'),card(12,'h')]},{seat:3,invested:100,folded:true,cards:[]}];
 const board=[card(2,'s'),card(4,'h'),card(6,'d'),card(8,'c'),card(10,'h')];
 const pots=app.splitPots(p,board,3);assert.deepEqual(Array.from(pots,x=>x.amount),[80,240]);assert.equal(pots.flatMap(x=>x.winners).reduce((a,x)=>a+x.amount,0),320);
});
test('Proyecto ajeno solo en tablero no se atribuye al jugador',()=>{
 const hole=[card(13,'d'),card(2,'c')],board=[card(5,'c'),card(6,'d'),card(7,'h'),card(8,'s')];
 const draws=app.detectHandDraws(hole,board,app.evaluateVisibleHand(hole,board));assert(!draws.some(x=>/escalera/i.test(x)));
});
test('Las preferencias se guardan en la versión correcta',()=>{app.setLanguage('en');assert.equal(storage.get('riverlab.v03.language'),'en');app.setLanguage('es')});
test('La versión auditada conserva el identificador de sesión anterior',()=>{assert.equal(app.saveSession(),true);const s=JSON.parse(storage.get('riverlab.v03.session'));assert.equal(s.version,3)});
