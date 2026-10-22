'use strict';
/* Valid-trajectory behavioral learning audit. Unlike exploratory synthetic
 * controls, a player who folds preflop never acts postflop in this test.
 * This does NOT assess EV or payoff, only response to public observations.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
const types=['loose-passive','tight-passive','tag','lag','balanced'];
const rng=s=>{let n=s>>>0;return ()=>((n=(Math.imul(1664525,n)+1013904223)>>>0)/4294967296)};
const card=(r,s)=>({r,s});
function make(){
 const window={},storage=new Map(),localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const ctx={window,localStorage,Math,console};vm.createContext(ctx);vm.runInContext(source,ctx);return window.RiverlabBots;
}
function train(bot,profile,n=600){
 let folds=0,opportunities=0,preflopFolds=0,postflopActions=0;
 for(let h=1;h<=n;h++){
  bot.startHand(h);
  const foldPre=profile==='overfolder'?h%4!==0:false;
  const toCall=profile==='overfolder'?6:2;
  bot.observe({hand:h,seat:0,street:'preflop',kind:foldPre?'fold':'call',paid:foldPre?0:toCall,toCall,raisedBefore:0});
  opportunities++;
  if(foldPre){folds++;preflopFolds++}
  else {
   const foldFlop=profile==='overfolder'?h%20!==0:h%20===0;
   bot.observe({hand:h,seat:0,street:'flop',kind:foldFlop?'fold':'call',paid:foldFlop?0:30,toCall:30,raisedBefore:0});
   opportunities++;postflopActions++;
   if(foldFlop)folds++;
  }
  bot.finishHand({hand:h,shown:[],winners:[1]});
 }
 return {hands:n,folds,opportunities,preflopFolds,postflopActions};
}
function scenarios(){
 const list=[];
 for(let i=0;i<240;i++){
  const ranks=[2,4,6,7,8,9,10,11,12,13,14];
  const a=ranks[i%ranks.length],b=ranks[Math.floor(i/ranks.length)%ranks.length];
  list.push({seat:1,kind:'tag',level:'expert',learning:true,hole:[card(a,'s'),card(b,a===b?'h':'d')],
   board:[],phase:'preflop',position:['CO','BTN','SB'][i%3],pot:3,toCall:2,
   stack:200,currentBet:2,minRaiseTarget:4,maxTotal:200,canRaise:true,
   effectiveStack:200,raiseCount:0,
   opponents:[{seat:0,folded:false,stack:200,bet:0,action:'check'}]});
 }
 return list;
}
const list=scenarios(),results=[];
for(const profile of ['overfolder','station']){
 const bot=make(),training=train(bot,profile),hero=bot.metrics(0);
 const byKind={};
 for(const kind of types){
  let offRaises=0,onRaises=0,changed=0;
  for(let i=0;i<list.length;i++){
   const context={...list[i],kind};
   bot.setLearning(false);const off=bot.chooseAction(context,{rng:rng(9000+i)});
   bot.setLearning(true);const on=bot.chooseAction(context,{rng:rng(9000+i)});
   if(off.kind==='raise')offRaises++;
   if(on.kind==='raise')onRaises++;
   if(JSON.stringify(off)!==JSON.stringify(on))changed++;
  }
  byKind[kind]={changed,offRaises,onRaises};
 }
 results.push({profile,training,foldRate:hero.foldRate,vpip:hero.vpipRate,byKind});
}
console.log('RIVERLAB_VALID_LEARNING_JSON '+JSON.stringify(results));
for(const r of results){
 assert.equal(r.training.hands,600);
 assert.equal(r.training.postflopActions,600-r.training.preflopFolds);
 assert(r.byKind.tag.changed>0,'TAG does not respond after 600 observations');
 assert(r.byKind.balanced.changed>0,'balanced does not respond after 600 observations');
}
const over=results[0].byKind,station=results[1].byKind;
assert(over.tag.onRaises>over.tag.offRaises,'TAG should increase pressure against overfolder');
assert(station.tag.onRaises<station.tag.offRaises,'TAG should reduce pressure against station');
assert(over.balanced.onRaises>over.balanced.offRaises,'balanced should pressure overfolder');
assert(station.balanced.onRaises<station.balanced.offRaises,'balanced should check more versus station');
