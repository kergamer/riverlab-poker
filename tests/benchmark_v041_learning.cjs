'use strict';
/* Learning effect sensitivity controls: meaningful counterfactual action changes
 * must be possible without opponent hidden cards. No claim of higher win rate. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const bots=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
const rng=s=>{let n=s>>>0;return ()=>((n=(Math.imul(1664525,n)+1013904223)>>>0)/4294967296)};
const card=(r,s)=>({r,s});
function engine(){
 const window={},store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={window,localStorage,Math,console};vm.createContext(ctx);vm.runInContext(bots,ctx);
 return {b:window.RiverlabBots,store};
}
const profiles=['loose-passive','tight-passive','tag','lag','balanced'];
const scenarios=[];
for(let i=0;i<240;i++){
 const vals=[2,4,6,7,8,9,10,11,12,13,14];
 const a=vals[i%vals.length],c=vals[Math.floor(i/vals.length)%vals.length];
 scenarios.push({seat:1,kind:'lag',level:'expert',learning:true,hole:[card(a,'s'),card(c,a===c?'h':'d')],board:[],phase:'preflop',position:['CO','BTN','SB'][i%3],pot:3,toCall:2,
 stack:200,currentBet:2,minRaiseTarget:4,maxTotal:200,canRaise:true,effectiveStack:200,raiseCount:0,
 opponents:[{seat:0,folded:false,stack:200,bet:0,action:'check'}]});
}
function seedProfile(b,mode){
 for(let hand=1;hand<=600;hand++){
  b.startHand(hand);
  if(mode==='overfolder'){
   b.observe({hand,seat:0,street:'preflop',kind:'fold',toCall:6,paid:0});
   b.observe({hand,seat:0,street:'flop',kind:'fold',toCall:30,paid:0});
  }else if(mode==='station'){
   b.observe({hand,seat:0,street:'preflop',kind:'call',toCall:2,paid:2});
   b.observe({hand,seat:0,street:'flop',kind:'call',toCall:30,paid:30});
  }else{
   b.observe({hand,seat:0,street:'preflop',kind:hand%4?'fold':'call',toCall:2,paid:hand%4?0:2});
   b.observe({hand,seat:0,street:'flop',kind:hand%2?'fold':'call',toCall:20,paid:hand%2?0:20});
  }
  b.finishHand({hand,shown:[],winners:[1]});
 }
}
const result=[];
for(const mode of ['overfolder','station','control']){
 const e=engine(),b=e.b;seedProfile(b,mode);
 const metrics=b.metrics(0),diff={};
 for(const kind of profiles){
  let changed=0,raisesOn=0,raisesOff=0;
  for(let i=0;i<scenarios.length;i++){
   const s={...scenarios[i],kind};
   b.setLearning(false);const off=b.chooseAction(s,{rng:rng(999+i)});
   b.setLearning(true);const on=b.chooseAction(s,{rng:rng(999+i)});
   if(JSON.stringify(off)!==JSON.stringify(on))changed++;
   if(off.kind==='raise')raisesOff++;
   if(on.kind==='raise')raisesOn++;
  }
  diff[kind]={changed,raisesOff,raisesOn};
 }
 result.push({mode,samples:metrics.hands,vpip:metrics.vpipRate,foldRate:metrics.foldRate,byPersona:diff});
}
console.log('RIVERLAB_LEARNING_JSON '+JSON.stringify(result));
for(const z of result){
 console.log('LEARNING '+z.mode+' '+JSON.stringify(z.byPersona));
 assert.equal(z.samples,600);
}
// The on/off feature MUST produce some measurable response after sufficient evidence.
assert(result.some(x=>Object.values(x.byPersona).some(p=>p.changed>0)),
 'Learning feature cannot affect decisions even after 600 opponent hands');
