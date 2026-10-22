const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
const card=(r,s)=>({r,s});
function engine(){const w={};let data={};const c={window:w,Math,console,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}};vm.createContext(c);vm.runInContext(code,c);return w.RiverlabBots}
const profile={seat:1,kind:'tag',level:'expert',learning:true,hole:[card(14,'s'),card(13,'s')],board:[card(14,'h'),card(13,'h'),card(2,'d')],phase:'flop',position:'BTN',pot:20,toCall:0,stack:160,currentBet:0,minRaiseTarget:2,maxTotal:160,canRaise:true,effectiveStack:160,raiseCount:1,opponents:[{seat:0,folded:false,action:'call'}]};
test('0.4.2 identifica versión y mantiene contrato de API',()=>{const b=engine();assert.equal(b.policyVersion,'0.4.2');assert.equal(b.catalog.length,169)});
test('las oportunidades de fold se segregan por calle, sin doble contabilización',()=>{const b=engine();b.startHand(1);b.observe({hand:1,seat:0,street:'preflop',kind:'call',toCall:2,paid:2});
 b.observe({hand:1,seat:0,street:'flop',kind:'fold',toCall:6,paid:0});b.finishHand({hand:1,shown:[],winners:[1]});const m=b.metrics(0);
 assert.equal(m.flopFaced,1);assert.equal(m.flopFold,1);assert.equal(m.turnFaced,0);assert.equal(m.riverFaced,0);assert.equal(m.foldToBet,1)});
test('las acciones ante una calling station mantienen apuestas de valor',()=>{const b=engine();const c={...profile};let raises=0;for(let k=0;k<100;k++){const r=b.chooseAction(c,{rng:()=>k/100});if(r.kind==='raise')raises++}assert.ok(raises>20,'Must value bet at least some top-two-pair spots')});
test('cartas de rivales ocultas no cambian la decisión',()=>{const b=engine();const a=b.chooseAction(profile,{rng:()=>.33});const w={...profile,opponents:[{...profile.opponents[0],cards:[card(14,'d'),card(14,'c')]}]};assert.equal(JSON.stringify(a),JSON.stringify(b.chooseAction(w,{rng:()=>.33})))});
