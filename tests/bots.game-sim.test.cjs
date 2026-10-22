const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];const bots=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
function start(seed){
 let val=seed>>>0;
 const rnd=()=>((val=(val*1664525+1013904223)>>>0)/4294967296);
 const listeners={},nodes={},storage=new Map(),timeouts=new Map();
 const element=id=>nodes[id]??={innerHTML:'',textContent:'',hidden:false,value:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return {classList:{add(){}}}}};
 const document={hidden:false,documentElement:{lang:'es'},getElementById:element,querySelectorAll:()=>[],addEventListener(k,fn){listeners[k]=fn}};
 const window={RiverlabAudio:{play(){},get status(){return 'ready'},get enabled(){return false},get supported(){return false}},addEventListener(){}};
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 let timer=0;const setTimeout=fn=>{timeouts.set(++timer,fn);return timer},clearTimeout=id=>timeouts.delete(id);
 const sandbox={window,document,localStorage,console,Math:Object.assign(Object.create(Math),{random:rnd}),Date,Intl,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){}};
 sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(bots,sandbox);vm.runInContext(game,sandbox);
 return {sandbox,state:window.__riverlab.state,app:window.__riverlab,rnd};
}
test('2.000 manos integradas de 6 jugadores: finalización, fichas y botes',()=>{
 const e=start(20261022),{app,state}=e;
 state.autoplay=false;state.botSpeed='fast';state.botDifficulty='intermediate';
 let finishes=0,showdowns=0;
 for(let h=0;h<2000;h++){
  let rebuys=0;
  for(let seat=0;seat<6;seat++)if(state.players[seat].stack===0){
   state.players[seat].stack=200;state.buyIns+=seat===0?200:0;rebuys+=200;
  }
  const totalBefore=state.players.reduce((a,p)=>a+p.stack,0);
  if(state.phase==='complete'||state.phase==='busted')app.newHand();
  let steps=0;
  while(['preflop','flop','turn','river'].includes(state.phase)){
   assert.ok(++steps<120,'possible stuck hand #'+h+' phase '+state.phase);
   const seat=state.turn;assert.ok(Number.isInteger(seat)&&seat>=0&&seat<6);
   const p=state.players[seat],toCall=Math.max(0,state.currentBet-p.bet);
   let a;
   if(seat===0){
    const d=e.rnd();
    a=toCall>0?(d<.18?{kind:'fold'}:{kind:'call'}):(d<.09?{kind:'raise',target:Math.min(p.bet+p.stack,state.currentBet+state.minRaise+4)}:{kind:'check'});
   }else a=app.chooseBotAction(p);
   assert.equal(app.act(seat,a.kind,a.target),true,'invalid action '+h+' '+seat+' '+JSON.stringify(a));
  }
  assert.equal(state.phase,'complete','hand must finish');
  const totalAfter=state.players.reduce((a,p)=>a+p.stack,0);
  assert.equal(totalAfter,totalBefore,'chip conservation on hand '+h);
  if(state.didShowdown)showdowns++;
  finishes++;
 }
 assert.equal(finishes,2000);assert.ok(showdowns>0);
});
