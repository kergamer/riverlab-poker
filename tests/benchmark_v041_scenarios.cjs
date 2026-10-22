'use strict';
/* RIVERLAB V0.4.1: reproducible policy diagnostics; no game modifications.
   Rates describe behaviour, not GTO nor skill certification. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
const LEVEL=process.env.BENCH_LEVEL||'intermediate';
const PROFILES=['loose-passive','tight-passive','tag','lag','balanced'];
const POS=['UTG','HJ','CO','BTN','SB','BB'];
const RANK='23456789TJQKA',SUITS='shdc';
const rng=seed=>{let n=seed>>>0;return ()=>((n=(1664525*n+1013904223)>>>0)/4294967296)};
const card=(r,s)=>({r,s});
const DECK=[];for(let r=2;r<=14;r++)for(const s of SUITS)DECK.push(card(r,s));
const shuffle=(r,n)=>{const deck=DECK.slice(),out=[];for(let k=0;k<n;k++){const i=Math.floor(r()*deck.length);out.push(deck[i]);deck[i]=deck[deck.length-1];deck.pop()}return out};
function makeEngine(){
 const localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const window={};const ctx={window,localStorage,Math,console};
 vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'bots.js'});
 return window.RiverlabBots;
}
function scenario(type,i){
 const seed=0xABC1830+97*i+({open:5,openPremium:7,openTrash:11,defend:13,threebet:17,blind:19,post:23,strongRiver:29,weakRiver:31}[type]||0);
 const r=rng(seed);let hole=shuffle(r,2),board=[],position=POS[i%6],phase='preflop';
 const rankMap=s=>RANK.indexOf(s)+2;
 if(type==='openPremium'){const v=[['A','s','A','h'],['K','s','K','h'],['Q','s','Q','h'],['A','s','K','s']][i%4];hole=[card(rankMap(v[0]),v[1]),card(rankMap(v[2]),v[3])]}
 if(type==='openTrash')hole=[card(7,'h'),card(2,'c')];
 const stack=100+(i%75)*2,pot=3+2*(i%17),otherStack=110+(i%41)*2;
 let bet=0,currentBet=2,raiseCount=0,canRaise=true;
 if(type==='defend'){currentBet=6+(i%7)*2;raiseCount=1}
 if(type==='threebet'){currentBet=16+(i%13)*2;raiseCount=2}
 if(type==='blind'){position='BB';bet=2;currentBet=2}
 if(type==='post'){
  phase=['flop','turn','river'][i%3];
  const dealt=shuffle(r,2+[3,4,5][i%3]);hole=dealt.slice(0,2);board=dealt.slice(2);
  currentBet=i%2===0?0:Math.max(2,Math.round(pot*(.35+(i%6)*.14)));
  if(i%23===0)canRaise=false;
 }
 if(type==='strongRiver'){
  phase='river';hole=[card(14,'s'),card(14,'h')];
  board=[card(14,'d'),card(14,'c'),card(2,'h'),card(7,'d'),card(9,'c')];
  currentBet=35;canRaise=true;
 }
 if(type==='weakRiver'){
  phase='river';hole=[card(7,'h'),card(2,'c')];
  board=[card(14,'s'),card(13,'d'),card(11,'h'),card(10,'c'),card(4,'s')];
  currentBet=90;canRaise=true;
 }
 const toCall=Math.max(0,currentBet-bet),maxTotal=stack+bet;
 const minRaiseTarget=Math.min(maxTotal,currentBet+Math.max(2,currentBet-bet));
 const maxOpp=(type==='post'?1+i%3:1+(i%2));
 const opponents=Array.from({length:maxOpp},(_,j)=>({
  seat:j===0?0:j+1,folded:false,stack:otherStack,bet:Math.min(currentBet,10),
  action:currentBet>0?'raise':'check'
 }));
 if(type==='post')opponents.forEach((x,j)=>{x.action=i%5===0?'raise':j?'check':'call'});
 return {seat:5,kind:'tag',level:LEVEL,learning:false,hole,board,position,phase,
  pot,type,toCall,stack,bet,currentBet,minRaiseTarget,maxTotal,canRaise,
  effectiveStack:Math.min(stack,otherStack),raiseCount,opponents};
}
function timed(run){const start=process.hrtime.bigint();const x=run();return {x,ms:Number(process.hrtime.bigint()-start)/1e6}}
function percentile(arr,f){if(!arr.length)return 0;arr.sort((a,b)=>a-b);return arr[Math.floor(f*(arr.length-1))]}
function evaluateFor(level){
 const b=makeEngine();assert(b.LEVELS.includes(level));
 const cases=[['open',1080],['openPremium',240],['openTrash',240],['defend',720],
  ['threebet',480],['blind',240],['post',900],['strongRiver',120],['weakRiver',120]];
 const scenarios=cases.flatMap(([type,n])=>Array.from({length:n},(_,i)=>scenario(type,i)));
 const results=[];
 for(const kind of PROFILES){
  const cells={},latencies=[];
  let errors=[],illegal=0,total=0,hiddenViolations=0;
  for(let i=0;i<scenarios.length;i++){
   const c={...scenarios[i],kind,level};
   const out=timed(()=>b.chooseAction(c,{rng:rng(0x7e9e370+i*17)}));
   const action=out.x,cell=cells[c.type]??={n:0,fold:0,call:0,check:0,raise:0};
   cell.n++;cell[action.kind]=(cell[action.kind]||0)+1;total++;
   if(c.type==='post')latencies.push(out.ms);
   const fail=!['fold','call','check','raise'].includes(action.kind) ||
    (c.toCall>0&&action.kind==='check') ||(c.toCall===0&&action.kind==='call')||
    (action.kind==='raise'&&(!c.canRaise||!Number.isInteger(action.target)||
      action.target<c.minRaiseTarget||action.target>c.maxTotal));
   if(fail){illegal++;if(errors.length<4)errors.push({i,c:{type:c.type,phase:c.phase,toCall:c.toCall,canRaise:c.canRaise},action})}
   if(i%37===0){
    const polluted={...c,opponents:c.opponents.map(x=>({...x,cards:[card(14,'s'),card(14,'h')]}))};
    const again=b.chooseAction(polluted,{rng:rng(0x7e9e370+i*17)});
    if(JSON.stringify(again)!==JSON.stringify(action))hiddenViolations++;
   }
  }
  const m=(type,action)=>Number(((cells[type]?.[action]||0)/Math.max(1,cells[type]?.n||0)*100).toFixed(2));
  const round=v=>Math.round(v*1000)/1000;
  results.push({
   personality:kind,level,cases:total,illegal,hiddenViolations,errors,
   openVPIP:+(m('open','raise')+m('open','call')).toFixed(2),
   openPFR:m('open','raise'),premiumOpenRaise:m('openPremium','raise'),
   trashOpenVPIP:+(m('openTrash','raise')+m('openTrash','call')).toFixed(2),
   defendContinue:+(m('defend','raise')+m('defend','call')).toFixed(2),
   facing3betContinue:+(m('threebet','raise')+m('threebet','call')).toFixed(2),
   postFold:m('post','fold'),postRaise:m('post','raise'),
   strongRiverContinue:+(m('strongRiver','raise')+m('strongRiver','call')).toFixed(2),
   weakRiverFold:m('weakRiver','fold'),
   postP50ms:round(percentile(latencies,.5)),postP95ms:round(percentile(latencies,.95)),
   breakdown:cells
  });
 }
 return {version:'RIVERLAB-v0.4.0',kind:'scenario-policy',level,scenariosPerPersonality:scenarios.length,results};
}
const result=evaluateFor(LEVEL);
console.log('RIVERLAB_BENCHMARK_JSON '+JSON.stringify(result));
for(const x of result.results)console.log('AUDIT '+[
 LEVEL,x.personality,'openVPIP='+x.openVPIP+'%','openPFR='+x.openPFR+'%',
 'premiumRaise='+x.premiumOpenRaise+'%','trashVPIP='+x.trashOpenVPIP+'%',
 'foldPost='+x.postFold+'%','riverStrongContinue='+x.strongRiverContinue+'%',
 'p95ms='+x.postP95ms,'illegal='+x.illegal,'hidden='+x.hiddenViolations
].join(' '));
assert.equal(result.results.reduce((a,v)=>a+v.illegal+v.hiddenViolations,0),0,'Illegal or information leaking decision');
