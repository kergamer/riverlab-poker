'use strict';
/* V0.4.1 tournament against fixed reference behaviours using the production
 * game engine in a sandbox, actual pots/positions/showdowns, deterministic
 * shuffle per hand and common random numbers for fair comparison.
 * This is play-money poker. bb/100 is descriptive, NOT proof of bot superiority.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const bots=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
assert(game,'Game source unavailable');
const kind=process.env.BOT_KIND||'tag',level=process.env.BOT_LEVEL||'intermediate';
const n=Number(process.env.BENCH_HANDS||'1200');
const modes=(process.env.BENCH_MODES||'mixed,station,overfolder').split(',');
const kinds=['loose-passive','tight-passive','tag','lag','balanced'],levels=['beginner','intermediate','advanced','expert'];
assert(kinds.includes(kind)&&levels.includes(level));assert(Number.isInteger(n)&&n>=60&&n<=25000&&n%6===0);
function prng(seed){
 let x=seed>>>0;return ()=>((x=(Math.imul(1664525,x)+1013904223)>>>0)/4294967296);
}
function setup(seed){
 const records=new Map(),nodes={},timers=new Map();
 let deckRand=prng(seed+17),actionRand=prng(seed+29),t=0;
 const setDeal=(h)=>{deckRand=prng((seed ^ Math.imul(h+1,0x9e3779b9))>>>0);actionRand=prng((seed ^ Math.imul(h+1,0x85ebca6b) ^ 0x1f123bb5)>>>0)};
 const element=id=>nodes[id]??=( {innerHTML:'',textContent:'',value:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return {classList:{add(){}}}}} );
 const document={hidden:false,documentElement:{lang:'es'},getElementById:element,querySelectorAll:()=>[],addEventListener(){}};
 const window={RiverlabAudio:{play(){},supported:false,enabled:false,volume:0,status:'off'},addEventListener(){}};
 const localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>{if(k!=='riverlab.v03.session')records.set(k,String(v))},removeItem:k=>records.delete(k)};
 const crypto={getRandomValues(a){a[0]=Math.floor(deckRand()*0x100000000)>>>0;return a}};
 const sandbox={window,document,localStorage,Math:Object.assign(Object.create(Math),{random:()=>actionRand()}),
  Date,Intl,console,crypto,Uint32Array,setTimeout:fn=>{timers.set(++t,fn);return t},clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){}};
 sandbox.globalThis=sandbox;
 vm.createContext(sandbox);
 setDeal(0);vm.runInContext(bots,sandbox);vm.runInContext(game,sandbox);
 return {state:window.__riverlab.state,app:window.__riverlab,bot:window.RiverlabBots,setDeal,rand:()=>actionRand()};
}
function scripted(mode,c,rand){
 const p=c.player,toCall=c.toCall;
 if(mode==='station')return {kind:toCall?'call':'check'};
 if(mode==='overfolder'){
  if(toCall>0&&rand()<(.81+(c.phase==='preflop'?.045:0)))
   return {kind:'fold'};
  if(!toCall)return {kind:'check'};
  return {kind:'call'};
 }
 if(mode==='baseline')return {kind:toCall?'call':'check'};
 throw Error('Unknown reference '+mode);
}
function safeStats(){
 return {hands:0,netUnits:0,netSquares:0,wins:0,showdowns:0,vpip:0,pfr:0,
  preRaises:0,preCalls:0,preFolds:0,postRaises:0,postCalls:0,postFolds:0,
  faced:0,foldToBet:0,raise3Bet:0,uncontested:0,totalActions:0,
  illegal:0,chipErrors:0,stuck:0,blocks:[],samples:[]};
}
function run(mode,seed){
 assert(['mixed','station','overfolder'].includes(mode));
 const x=setup(seed),state=x.state,app=x.app,result=safeStats(),blocks=[],blockSize=60;
 state.autoplay=false;state.botLearning=false;x.bot.setLearning(false);
 state.players[0].kind=kind; // The subject is seat 0; the button cycles all 6 positions.
 for(let h=0;h<n;h++){
  if(h>0){
   for(const p of state.players)p.stack=200; // Independent 100 BB cash-game hands.
   x.setDeal(h);app.newHand();
  }
  const subject=state.players[0];subject.kind=kind;
  assert(['preflop','flop','turn','river'].includes(state.phase),'Hand did not start');
  const before=state.players.reduce((a,p)=>a+p.stack+p.invested,0);
  assert.equal(before,1200,'Invalid start bankroll');
  let steps=0;
  while(['preflop','flop','turn','river'].includes(state.phase)){
   if(++steps>160){result.stuck++;throw Error('Stuck at '+h+' '+state.phase)}
   const seat=state.turn,p=state.players[seat],toCall=Math.max(0,state.currentBet-p.bet);
   const raisedBefore=state.handEvents.some(e=>e.street==='preflop'&&['sube hasta','apuesta'].includes(e.kind));
   let action;
   if(seat===0||mode==='mixed'){
    state.botDifficulty=seat===0?level:'intermediate';
    action=app.chooseBotAction(p);
   }else{
    action=scripted(mode,{player:p,toCall,phase:state.phase},x.rand);
   }
   const beforeActions=state.handEvents.length;
   const ok=app.act(seat,action.kind,action.target);
   if(!ok){result.illegal++;throw Error('Illegal '+JSON.stringify({mode,kind,level,h,seat,action}))}
   if(seat===0){
    const recorded=state.handEvents[beforeActions],st=recorded?.street;
    const ak=recorded?.kind;
    result.totalActions++;
    if(recorded?.toCall>0){result.faced++;if(ak==='se retira')result.foldToBet++}
    if(st==='preflop'){
     if(ak==='sube hasta'||ak==='apuesta'){result.preRaises++;if(raisedBefore)result.raise3Bet++}
     if(ak==='iguala')result.preCalls++;
     if(ak==='se retira')result.preFolds++;
    }else{
     if(ak==='sube hasta'||ak==='apuesta')result.postRaises++;
     if(ak==='iguala')result.postCalls++;
     if(ak==='se retira')result.postFolds++;
    }
   }
  }
  if(state.phase!=='complete'){result.stuck++;throw Error('Hand did not resolve')}
  const after=state.players.reduce((a,p)=>a+p.stack,0);
  if(before!==after){result.chipErrors++;throw Error('Chip leak hand '+h+' '+(after-before))}
  const net=subject.stack-200;result.hands++;
  result.netUnits+=net;result.netSquares+=net*net;
  result.wins+=(net>0?1:0);result.showdowns+=(state.didShowdown?1:0);
  result.vpip+=(subject.wasVPIP?1:0);result.pfr+=(subject.wasPFR?1:0);
  if(state.resultData?.kind==='uncontested')result.uncontested++;
  const b=Math.floor(h/blockSize);blocks[b]=(blocks[b]||0)+net;
  if(h<5)result.samples.push({hand:h+1,net,board:state.board.length,steps,showdown:state.didShowdown});
 }
 // Player seat 0 cycles through every table position, independent of who wins.
 assert.equal(n%6,0);
 const bbPer100=100*(result.netUnits/2)/n;
 const blockRate=blocks.map(z=>z/2*100/blockSize);
 const average=blockRate.reduce((a,b)=>a+b,0)/blockRate.length;
 const blockVariance=blockRate.reduce((a,b)=>a+(b-average)**2,0)/Math.max(1,blockRate.length-1);
 const standardError=Math.sqrt(blockVariance/blockRate.length);
 const ci95=1.96*standardError;
 const fmt=v=>Math.round(v*1000)/1000;
 const summary={
  kind,level,mode,seed,hands:n,blocks:blockRate.length,independentStackBB:100,
  bb100:fmt(bbPer100),ci95:[fmt(bbPer100-ci95),fmt(bbPer100+ci95)],ciHalfWidth:fmt(ci95),
  totalNetBB:fmt(result.netUnits/2),
  vpip:fmt(100*result.vpip/n),pfr:fmt(100*result.pfr/n),
  winHandsPct:fmt(100*result.wins/n),showdownPct:fmt(100*result.showdowns/n),
  postAgg:fmt(result.postRaises/Math.max(1,result.postCalls)),
  foldVsBet:fmt(100*result.foldToBet/Math.max(1,result.faced)),
  threeBetActions:result.raise3Bet,decisions:result.totalActions,
  illegal:result.illegal,stuck:result.stuck,chipErrors:result.chipErrors,
  resultType:'live-game-v04-static-opponents',
  note:'95% normal approximate CI from 60-hand blocks; exploratory, no GTO claim'
 };
 return summary;
}
for(const mode of modes){
 const seed=(0xf0371a ^ Math.imul(0x76ebca, modes.indexOf(mode)+1))>>>0;
 const summary=run(mode,seed);
 console.log('RIVERLAB_TOURNAMENT_JSON '+JSON.stringify(summary));
 console.log('RESULT '+[summary.kind,summary.level,summary.mode,
  'hands='+summary.hands,'bb100='+summary.bb100,'CI95=['+summary.ci95.join(',')+']',
  'VPIP='+summary.vpip,'PFR='+summary.pfr,'foldVsBet='+summary.foldVsBet,
  'illegal='+summary.illegal,'chipErrors='+summary.chipErrors].join(' '));
}
