/* RIVERLAB V0.4 — Bot Strategy Engine
 * Public-information only, deterministic injectable RNG, no hidden opponent cards.
 * Play-money poker training: calibrated heuristics, not a solved/GTO strategy.
 */
(function(root){
'use strict';
const N=6, BB=2, RANK='23456789TJQKA', SUITS='shdc';
const LEVELS=['beginner','intermediate','advanced','expert'];
const PROFILE={
 'loose-passive':{open:.17,aggression:.15,threeBet:.045,bluff:.025,call:.17,foldPressure:-.08,pace:1.12},
 'tight-passive':{open:-.085,aggression:.12,threeBet:.055,bluff:.014,call:-.09,foldPressure:.08,pace:1.06},
 'tag':{open:-.014,aggression:.62,threeBet:.23,bluff:.075,call:-.035,foldPressure:.015,pace:.96},
 'lag':{open:.145,aggression:.83,threeBet:.35,bluff:.15,call:.045,foldPressure:-.035,pace:1.05},
 'balanced':{open:.015,aggression:.54,threeBet:.18,bluff:.065,call:.015,foldPressure:0,pace:.99}
};
const POSITION_OPEN={UTG:.17,HJ:.22,CO:.31,BTN:.47,SB:.42,BB:.50};
const POSITION_ORDER=['UTG','HJ','CO','BTN','SB','BB'];
const MEMORY_KEY='riverlab.v04.botMemory';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const randomDefault=()=>Math.random();
function roll(rng){return clamp(Number(rng()),0,0.9999999999)}
function code(rank){return RANK[rank-2]}
function parseCard(c){return c&&Number.isInteger(c.r)&&c.r>=2&&c.r<=14&&SUITS.includes(c.s)}
function classOf(cards){
 if(!Array.isArray(cards)||cards.length!==2||!cards.every(parseCard))throw Error('Two valid hole cards required');
 const a=Math.max(cards[0].r,cards[1].r),b=Math.min(cards[0].r,cards[1].r);
 return code(a)+code(b)+(a===b?'':cards[0].s===cards[1].s?'s':'o');
}
function classScore(a,b,suited){
 if(a===b)return 43.5 + a*3.55 + (a<7?0:1.5);
 const high=10.5 + a*3.65, low=(b-2)*0.86;
 const gap=Math.max(0,a-b-1);
 const gapPenalty=gap===0?0:gap===1?3.4:gap===2?7:gap===3?10.8:14+gap*1.4;
 const connector=a<=11&&gap===0?4.5:a<=12&&gap===1?1.4:0;
 const aceBonus=a===14&&b>=10?5:0;
 return clamp(high+low+(suited?7.5:0)-gapPenalty+connector+aceBonus,0,99);
}
const CATALOG=[];
for(let a=14;a>=2;a--){
 CATALOG.push({name:code(a)+code(a),score:classScore(a,a,false),combos:6,high:a,low:a,suited:false});
 for(let b=a-1;b>=2;b--){
  CATALOG.push({name:code(a)+code(b)+'s',score:classScore(a,b,true),combos:4,high:a,low:b,suited:true});
  CATALOG.push({name:code(a)+code(b)+'o',score:classScore(a,b,false),combos:12,high:a,low:b,suited:false});
 }
}
CATALOG.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
const CLASS_MAP=new Map();
let handCombos=0;
CATALOG.forEach(c=>{handCombos+=c.combos;CLASS_MAP.set(c.name,Object.freeze({...c,percentile:(handCombos-c.combos/2)/1326}));});
if(CATALOG.length!==169||handCombos!==1326)throw Error('Invalid preflop 169-class catalog');
const catalog=Object.freeze(CATALOG.map(c=>CLASS_MAP.get(c.name)));
function straightHigh(vals){
 const r=new Set(vals);
 if(r.has(14))r.add(1);
 for(let hi=14;hi>=5;hi--)if([0,1,2,3,4].every(n=>r.has(hi-n)))return hi;
 return 0;
}
function evaluate(cards){
 if(!Array.isArray(cards)||cards.length<5||cards.length>7||!cards.every(parseCard))throw Error('Evaluate needs five to seven visible cards');
 const counts=Array(15).fill(0),bySuit={s:[],h:[],d:[],c:[]};
 for(const c of cards){counts[c.r]++;bySuit[c.s].push(c.r)}
 const ranks=[];for(let r=14;r>=2;r--)if(counts[r])ranks.push(r);
 const flushSuit=SUITS.split('').find(s=>bySuit[s].length>=5);
 if(flushSuit){
  const flush=bySuit[flushSuit].sort((a,b)=>b-a),str=straightHigh(flush);
  if(str)return [8,str];
 }
 const quads=ranks.find(r=>counts[r]===4);
 if(quads)return [7,quads,ranks.find(r=>r!==quads)];
 const trips=ranks.filter(r=>counts[r]>=3);
 if(trips.length){
  const pair=ranks.find(r=>r!==trips[0]&&counts[r]>=2);
  if(pair)return [6,trips[0],pair];
 }
 if(flushSuit)return [5,...bySuit[flushSuit].sort((a,b)=>b-a).slice(0,5)];
 const straight=straightHigh(ranks);
 if(straight)return [4,straight];
 if(trips.length)return [3,trips[0],...ranks.filter(r=>r!==trips[0]).slice(0,2)];
 const pairs=ranks.filter(r=>counts[r]>=2);
 if(pairs.length>=2)return [2,pairs[0],pairs[1],ranks.find(r=>r!==pairs[0]&&r!==pairs[1])];
 if(pairs.length)return [1,pairs[0],...ranks.filter(r=>r!==pairs[0]).slice(0,3)];
 return [0,...ranks.slice(0,5)];
}
function compare(a,b){
 for(let i=0;i<Math.max(a.length,b.length);i++){const v=(a[i]||0)-(b[i]||0);if(v)return Math.sign(v)}
 return 0;
}
function boardTexture(board){
 const ranks=board.map(c=>c.r),counts={};
 for(const r of ranks)counts[r]=(counts[r]||0)+1;
 const suits=SUITS.split('').map(s=>board.filter(c=>c.s===s).length);
 const maxSuit=Math.max(0,...suits),unique=[...new Set(ranks)].sort((a,b)=>a-b);
 let near=0;for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++)if(unique[j]-unique[i]<=4)near++;
 const paired=Object.values(counts).some(n=>n>=2);
 const high=Math.max(0,...ranks);
 const wet=clamp((maxSuit>=3?.27:maxSuit===2?.11:0)+(near>=3?.23:near>=2?.12:0)+(paired?.07:0),0,.61);
 return {paired,maxSuit,high,wet,connected:near>=2,monotone:maxSuit>=3};
}
function draws(hole,board){
 const all=[...hole,...board],suits=SUITS.split('');
 const flush=suits.some(s=>all.filter(c=>c.s===s).length===4&&hole.some(c=>c.s===s));
 const ranks=new Set(all.map(c=>c.r)),holeRanks=new Set(hole.map(c=>c.r)),boardRanks=new Set(board.map(c=>c.r));
 if(ranks.has(14))ranks.add(1);if(holeRanks.has(14))holeRanks.add(1);if(boardRanks.has(14))boardRanks.add(1);
 let open=false,gutshot=false;
 for(let base=1;base<=10;base++){
  const sequence=[base,base+1,base+2,base+3,base+4];
  const present=sequence.filter(x=>ranks.has(x)),personal=present.some(x=>holeRanks.has(x)&&!boardRanks.has(x));
  if(present.length===4&&personal){
   const missing=sequence.find(x=>!ranks.has(x));
   if(missing===base||missing===base+4)open=true;else gutshot=true;
  }
 }
 const overcards=hole.filter(c=>c.r>Math.max(...board.map(b=>b.r))).length;
 return {flush,open,gutshot,overcards,outs:(flush?9:0)+(open?8:gutshot?4:0)};
}
function baseEquity(hole,board){
 const rank=evaluate([...hole,...board]),cat=rank[0],info=draws(hole,board),tex=boardTexture(board);
 const boardRank=board.length===5?evaluate(board):null;
 let value=[.205,.49,.73,.86,.925,.955,.975,.991,.999][cat];
 if(cat===1){
  const pairRank=rank[1],inHand=hole.some(c=>c.r===pairRank),boardTop=tex.high;
  value=inHand?(pairRank>=boardTop?.60:.49):.32;
  if(hole[0].r===hole[1].r&&hole[0].r<boardTop)value-=.065;
 }
 if(cat===2&&!hole.some(c=>c.r===rank[1]||c.r===rank[2]))value-=.17;
 if(cat===3&&!hole.some(c=>c.r===rank[1]))value-=.10;
 if(boardRank&&compare(boardRank,rank)===0)value=Math.min(value,.55);
 if(board.length<5&&cat<=2){
  if(info.flush)value+=board.length===3?.17:.115;
  if(info.open)value+=board.length===3?.115:.075;
  else if(info.gutshot)value+=board.length===3?.056:.037;
  if(cat===0&&info.overcards===2)value+=.055;
 }
 if(tex.monotone&&!hole.some(c=>c.s===board.find(c=>board.filter(x=>x.s===c.s).length>=3)?.s))value-=.075;
 return clamp(value,.04,.999);
}
function drawRandom(deck,rng){
 const j=Math.floor(roll(rng)*deck.length);
 const c=deck[j];deck[j]=deck[deck.length-1];deck.pop();return c;
}
function equitySample(context,rng=randomDefault,samples=24){
 const hero=context.hole,board=context.board,others=context.opponents.filter(p=>!p.folded&&p.seat!==context.seat);
 if(board.length<3||board.length>5||others.length===0)return null;
 const used=new Set([...hero,...board].map(c=>c.r+c.s));
 const unseen=[];for(let rank=2;rank<=14;rank++)for(const suit of SUITS)if(!used.has(rank+suit))unseen.push({r:rank,s:suit});
 let credit=0;
 for(let t=0;t<samples;t++){
  const deck=unseen.slice(),runout=board.slice();
  while(runout.length<5)runout.push(drawRandom(deck,rng));
  const mine=evaluate([...hero,...runout]);
  let best=mine,tied=1,heroBest=true;
  for(const other of others){
   // Opponents are independently sampled from an unknown deck, NEVER from
   // their actual private cards. Tight action is modelled as *range weighting*.
   let choices=null,chosen=-1;
   const attempts=other.action==='raise'&&samples>=20?3:1;
   for(let attempt=0;attempt<attempts;attempt++){
    if(deck.length<2)break;
    const j=Math.floor(roll(rng)*deck.length),k=Math.floor(roll(rng)*(deck.length-1));
    const c1=deck[j],c2=deck[k>=j?k+1:k];
    const score=CLASS_MAP.get(classOf([c1,c2])).percentile;
    if(choices===null||score<chosen){choices=[c1,c2];chosen=score}
   }
   const cards=choices||[deck[0],deck[1]];
   for(const c of cards){const i=deck.findIndex(v=>v.r===c.r&&v.s===c.s);if(i>=0){deck[i]=deck[deck.length-1];deck.pop()}}
   const rival=evaluate([...cards,...runout]),cmp=compare(rival,best);
   if(cmp>0){best=rival;heroBest=false;tied=1}
   else if(cmp===0)tied++;
  }
  if(heroBest&&compare(mine,best)===0)credit+=1/tied;
 }
 return credit/samples;
}
function emptyRecord(){
 return {hands:0,vpip:0,pfr:0,threeBet:0,threeBetOpportunities:0,
  actions:0,bets:0,raises:0,calls:0,checks:0,folds:0,facedBets:0,foldToBet:0,showdowns:0,showdownWins:0};
}
const stats=Object.create(null),pending=Object.create(null);
let currentHand=-1,learnEnabled=true,dirty=false;
function readMemory(){
 try{
  const raw=localStorage.getItem(MEMORY_KEY);if(!raw)return;
  const obj=JSON.parse(raw);
  if(obj.version!==1||!obj.players||typeof obj.players!=='object')return;
  for(let seat=0;seat<N;seat++){
   const src=obj.players[seat];
   if(!src||typeof src!=='object')continue;
   const out=emptyRecord();
   for(const key of Object.keys(out))if(Number.isSafeInteger(src[key])&&src[key]>=0)out[key]=Math.min(src[key],1e7);
   stats[seat]=out;
  }
 }catch(e){/* private browsing storage may be disabled */}
}
readMemory();
function record(seat){return stats[seat]||(stats[seat]=emptyRecord())}
function startHand(hand){
 if(!Number.isSafeInteger(hand)||hand<0)return;
 currentHand=hand;
 for(let s=0;s<N;s++)pending[s]={vpip:false,pfr:false,threeBet:false,threeBetOpportunity:false};
}
function observe(a){
 if(!a||!Number.isInteger(a.seat)||a.seat<0||a.seat>=N||
 !['preflop','flop','turn','river'].includes(a.street)||
 !['fold','check','call','raise'].includes(a.kind))return;
 if(currentHand!==a.hand)startHand(a.hand);
 const p=pending[a.seat],r=record(a.seat);
 r.actions++;
 if(a.kind==='fold')r.folds++;
 if(a.kind==='check')r.checks++;
 if(a.kind==='call')r.calls++;
 if(a.kind==='raise'){r.raises++;r.bets++;}
 if(a.toCall>0){r.facedBets++;if(a.kind==='fold')r.foldToBet++}
 if(a.street==='preflop'){
  if(!p.vpip&&Number(a.paid)>0&&['call','raise'].includes(a.kind)){p.vpip=true;r.vpip++}
  if(!p.pfr&&a.kind==='raise'){p.pfr=true;r.pfr++}
  if(a.raisedBefore>0&&!p.threeBetOpportunity){p.threeBetOpportunity=true;r.threeBetOpportunities++}
  if(a.kind==='raise'&&a.raisedBefore>0&&!p.threeBet){p.threeBet=true;r.threeBet++}
 }
 dirty=true;
}
function finishHand(result){
 if(result&&Number.isSafeInteger(result.hand)&&currentHand!==result.hand)return;
 for(let seat=0;seat<N;seat++)record(seat).hands++;
 if(result&&Array.isArray(result.shown)){
  for(const seat of result.shown){if(!Number.isInteger(seat)||seat<0||seat>=N)continue;
   record(seat).showdowns++;
   if(Array.isArray(result.winners)&&result.winners.includes(seat))record(seat).showdownWins++;
  }
 }
 dirty=true;saveMemory();
}
function saveMemory(){
 if(!dirty)return;
 try{localStorage.setItem(MEMORY_KEY,JSON.stringify({version:1,players:stats}));dirty=false}catch(e){}
}
function resetMemory(){
 for(const k of Object.keys(stats))delete stats[k];
 for(const k of Object.keys(pending))delete pending[k];
 currentHand=-1;dirty=false;
 try{localStorage.removeItem(MEMORY_KEY)}catch(e){}
}
function metrics(seat){
 const r={...record(seat)},smooth=(value,n,prior)=>clamp((value+prior*24)/(n+24),0,1);
 return {...r,vpipRate:smooth(r.vpip,r.hands,.26),pfrRate:smooth(r.pfr,r.hands,.16),
  foldRate:smooth(r.foldToBet,r.facedBets,.42),
  aggressionRate:smooth(r.raises,r.raises+r.calls,.43),
  reliability:clamp(r.hands/65,0,1)};
}
function setLearning(flag){learnEnabled=!!flag}
function adjustRead(context){
 if(!learnEnabled||!context.learning)return {pressure:0,calling:0,confidence:0};
 const hero=metrics(0),c=hero.reliability;
 // Bots learn only from PUBLIC observed behaviour of the human opponent.
 return {pressure:clamp((hero.foldRate-.42)*.32*c,-.11,.11),
  calling:clamp((hero.vpipRate-.26)*.29*c,-.12,.12),
  confidence:c};
}
function sanitizedContext(context){
 if(!context||!Array.isArray(context.hole)||context.hole.length!==2||
 !context.hole.every(parseCard)||!Array.isArray(context.board)||
 !context.board.every(parseCard)||context.board.length>5)throw Error('Invalid public bot context');
 if(!LEVELS.includes(context.level))throw Error('Unknown bot level');
 if(!PROFILE[context.kind])throw Error('Unknown bot persona');
 return context;
}
function safeAction(context){return {kind:context.toCall>0?'call':'check',reason:'safe-legal'}}
function makeRaise(context,factor,bbFloor){
 if(!context.canRaise)return safeAction(context);
 const min=Math.max(0,context.minRaiseTarget||0),max=context.maxTotal;
 const target=Math.round(context.currentBet+Math.max(bbFloor||BB,factor*(context.pot+context.toCall)));
 return {kind:'raise',target:clamp(target,min,max)};
}
function preflop(context,rng){
 const prof=PROFILE[context.kind],classInfo=CLASS_MAP.get(classOf(context.hole));
 const position=context.position;
 const levelIndex=LEVELS.indexOf(context.level),isBeginner=levelIndex===0;
 const read=adjustRead(context),committed=context.raiseCount||0;
 const effectiveBB=Math.max(1,context.effectiveStack/BB);
 const p=classInfo.percentile;
 const openRange=clamp((POSITION_OPEN[position]||.25)+prof.open+(isBeginner?.05:0)
   +(read.pressure*(prof.aggression>.5?1.1:.4)),.045,.85);
 const toCall=context.toCall;
 const potOdds=toCall/Math.max(1,context.pot+toCall);
 const jitter=(roll(rng)-.5)*(isBeginner?.13:levelIndex===1?.045:levelIndex===2?.022:.008);
 const score=p+jitter;
 if(committed===0){
  if(score<=openRange){
   if(effectiveBB<=11&&score<openRange*.50&&context.canRaise&&prof.aggression>.35)
    return {kind:'raise',target:context.maxTotal,reason:'preflop-short-stack'};
   const initiative=clamp(.30+prof.aggression*.75+(levelIndex>=2?.08:0),.12,.91);
   if(context.canRaise&&roll(rng)<initiative){
    const blind=position==='SB'?5:position==='BTN'?5:6;
    return {kind:'raise',target:clamp(blind,context.minRaiseTarget,context.maxTotal),reason:'preflop-position-open'};
   }
   return {kind:toCall>0?'call':'check',reason:'preflop-enter-range'};
  }
  // Passive recreational players sometimes limp with borderline holdings.
  const limp=.05+Math.max(0,prof.call)*.47+(isBeginner?.045:0);
  if(toCall<=BB &&score<openRange+.13&&roll(rng)<limp)
   return {kind:toCall?'call':'check',reason:'preflop-limp'};
  return {kind:toCall?'fold':'check',reason:'preflop-discipline'};
 }
 const threeBetOrMore=committed>=2;
 const rangeVsRaise=clamp((threeBetOrMore?.058:.15)+prof.open*.43
   +(position==='BB'?.12:position==='SB'?.025:position==='BTN'?.07:0)
   +(effectiveBB<=12?.085:0)+(isBeginner?.075:0),.027,.43);
 const priceMod=clamp((.25-potOdds)*.30,-.13,.065);
 const defend=clamp(rangeVsRaise+priceMod+prof.call*.30+read.calling*.09,.018,.69);
 if(score>defend)return {kind:'fold',reason:'preflop-facing-raise'};
 const premium=score<clamp((threeBetOrMore?.025:.075)+prof.open*.10,.016,.125);
 const foldPressure=read.pressure;
 const threeBetChance=clamp(prof.threeBet*(premium?2.7:.54)+(foldPressure*.22)
   +(levelIndex>=2?.04:0),.015,.87);
 if(context.canRaise&&(premium||(!threeBetOrMore&&score<defend*.49))&&roll(rng)<threeBetChance){
  const target=context.currentBet * (position==='SB'||position==='BB'?3.4:2.85);
  return {kind:'raise',target:clamp(Math.round(target),context.minRaiseTarget,context.maxTotal),reason:threeBetOrMore?'preflop-fourbet':'preflop-threebet'};
 }
 return {kind:'call',reason:'preflop-continue-range'};
}
function postflop(context,rng){
 const prof=PROFILE[context.kind],levelIndex=LEVELS.indexOf(context.level);
 const board=context.board,tex=boardTexture(board),d=draws(context.hole,board);
 const rank=evaluate([...context.hole,...board]),made=baseEquity(context.hole,board);
 const multi=context.opponents.filter(p=>!p.folded&&p.seat!==context.seat).length;
 let equity=made;
 const samples=levelIndex===3?30:levelIndex===2?16:0;
 if(samples>0&&multi>0){
  const mc=equitySample(context,rng,samples);
  if(mc!==null)equity=clamp(mc*(levelIndex===3?.64:.48)+made*(levelIndex===3?.36:.52),.015,.99);
 }
 const read=adjustRead(context),toCall=context.toCall,pot=context.pot;
 const odds=toCall/Math.max(1,pot+toCall);
 const spr=context.effectiveStack/Math.max(2,pot);
 const inPosition=['BTN','CO'].includes(context.position);
 const beginner=levelIndex===0;
 const opponentsFactor=multi>2?.080:multi===2?.045:0;
 const textureRisk=(tex.monotone&&rank[0]<5?.045:0)+(tex.connected&&rank[0]===1?.025:0);
 const uncertain=(roll(rng)-.5)*(beginner?.23:levelIndex===1?.11:levelIndex===2?.057:.028);
 const adjusted=clamp(equity+uncertain-opponentsFactor-textureRisk,0,1);
 const strongDraw=(d.flush||d.open)&&board.length<5;
 const semiBluff=strongDraw&&(equity>.19);
 const valueThreshold=clamp(.63-prof.aggression*.065+(multi>1?.04:0)+(spr>8?.02:0),.55,.80);
 const bluffRate=prof.bluff*(beginner?.45:levelIndex===1?.75:levelIndex===2?1:1.08);
 const potSize=clamp((rank[0]>=2?.58:.38)+tex.wet*.34+(prof.aggression-.4)*.15,.26,.9);
 if(!toCall){
  if(context.canRaise){
   if(adjusted>valueThreshold){
    const chance=clamp(.36+prof.aggression*.63-(multi>2?.14:0),.18,.96);
    if(roll(rng)<chance)return {...makeRaise(context,potSize,BB),reason:'postflop-value'};
   }
   const bluffSpot=inPosition||tex.wet<.28||context.phase==='river';
   const pressure=clamp(bluffRate+(semiBluff?.14:0)+read.pressure*.40,.01,.40);
   if(bluffSpot&&adjusted<.59&&(semiBluff||adjusted>.12)&&roll(rng)<pressure)
    return {...makeRaise(context,semiBluff?.55:.43,BB),reason:semiBluff?'postflop-semibluff':'postflop-bluff'};
  }
  return {kind:'check',reason:'postflop-pot-control'};
 }
 const levelMargin=beginner?.09:levelIndex===1?.065:levelIndex===2?.038:.018;
 const threshold=clamp(odds+levelMargin+prof.foldPressure-read.calling*.30,.08,.92);
 const potCommit=toCall/Math.max(2,context.stack+toCall);
 const defending=adjusted>=threshold||rank[0]>=6||
   (strongDraw&&odds<.33&&board.length<5&&adjusted>threshold-.075);
 if(!defending&&potCommit>.24)return {kind:'fold',reason:'postflop-unfavourable-price'};
 if(!defending&&adjusted<threshold-.08)return {kind:'fold',reason:'postflop-fold-vs-bet'};
 const valueRaise=adjusted>valueThreshold+.09&&rank[0]>=2;
 const pressureRaise=semiBluff&&adjusted>threshold+.14&&roll(rng)<bluffRate*.70;
 if(context.canRaise&&(valueRaise||pressureRaise)){
  const chance=clamp((valueRaise?.21+prof.aggression*.64:prof.aggression*.15)+read.pressure*.16,.08,.85);
  if(roll(rng)<chance)
   return {...makeRaise(context,potSize+.23,context.toCall+BB),reason:valueRaise?'postflop-value-raise':'postflop-draw-raise'};
 }
 return {kind:'call',reason:'postflop-pot-odds'};
}
function chooseAction(raw,option={}){
 const c=sanitizedContext(raw),rng=typeof option.rng==='function'?option.rng:randomDefault;
 const action=c.phase==='preflop'?preflop(c,rng):postflop(c,rng);
 if(!action||!['check','call','fold','raise'].includes(action.kind))return safeAction(c);
 if(action.kind==='check'&&c.toCall>0)return safeAction(c);
 if(action.kind==='call'&&c.toCall<=0)return {kind:'check',reason:action.reason};
 if(action.kind==='raise'){
  if(!c.canRaise||!Number.isFinite(action.target)||action.target<=c.currentBet)return safeAction(c);
  const min=c.minRaiseTarget,max=c.maxTotal;
  return {...action,target:clamp(Math.floor(action.target),min,max)};
 }
 return action;
}
function delay(context,speed='normal',rng=randomDefault){
 const prof=PROFILE[context.kind]||PROFILE.balanced;
 const hard=LEVELS.indexOf(context.level);
 const potUrgency=context.toCall>Math.max(BB,context.pot*.35)?155:0;
 const late=['turn','river'].includes(context.phase)?160:0;
 const time=Math.round((520+roll(rng)*730+hard*135+potUrgency+late)*prof.pace);
 return speed==='fast'?clamp(Math.round(time*.24),120,550):clamp(time,440,3500);
}
const api={LEVELS,PROFILE,catalog,classOf,evaluate,compare,boardTexture,draws,baseEquity,equitySample,
 chooseAction,delay,observe,startHand,finishHand,saveMemory,resetMemory,metrics,setLearning,
 memoryKey:MEMORY_KEY,positionOpen:POSITION_OPEN};
root.RiverlabBots=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
