const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','bots.js'),'utf8');
function create(){const window={},store=new Map();const context={window,Math,console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};vm.createContext(context);vm.runInContext(code,context);return window.RiverlabBots}
const card=(r,s)=>({r,s}),suits=['s','h','d','c'];
const cards=[];for(let r=2;r<=14;r++)for(const s of suits)cards.push(card(r,s));
function rng(seed){let n=seed>>>0;return ()=>((n=(1664525*n+1013904223)>>>0)/4294967296)}
function sampleCards(r,count){const pool=cards.slice(),out=[];for(let i=0;i<count;i++){const j=Math.floor(r()*pool.length);out.push(pool[j]);pool.splice(j,1)}return out}
const profiles=['loose-passive','tight-passive','tag','lag','balanced'];
const positions=['UTG','HJ','CO','BTN','SB','BB'];
function context(i,r,kind,level,phase){
 const count=phase==='preflop'?2:phase==='flop'?5:phase==='turn'?6:7;
 const drawn=sampleCards(r,count),hole=drawn.slice(0,2),board=drawn.slice(2);
 const currentBet=phase==='preflop'?(i%4?2:9):i%3===0?0:Math.max(2,(i%11)+2);
 const bet=0,pot=3+(i%70)*2,maxTotal=bet+Math.max(2,180-(i%155));
 const toCall=Math.max(0,currentBet-bet);
 const canRaise=maxTotal>currentBet+(i%4===1?0:2)&&i%13!==0;
 const minRaiseTarget=Math.min(maxTotal,currentBet+Math.max(2,i%5));
 return {seat:1,kind,level,learning:true,hole,board,phase,pot,toCall,
  stack:maxTotal,bet,currentBet,minRaiseTarget,maxTotal,canRaise,
  position:positions[i%6],effectiveStack:maxTotal,raiseCount:i%5===0?1:i%7===0?2:0,
  opponents:[{seat:0,folded:false,stack:140,bet:0,action:i%3===0?'raise':'call'},
   {seat:2,folded:i%4===1,stack:120,bet:0,action:'check'}]};
}
test('10.000 decisiones independientes: legalidad, determinismo y protección de cartas ocultas',()=>{
 const b=create(),random=rng(91944);const totals={};
 for(let i=0;i<10000;i++){
  const kind=profiles[i%5],level=b.LEVELS[Math.floor(i/5)%4];
  const phase=['preflop','flop','turn','river'][i%4];
  const c=context(i,random,kind,level,phase);
  const rSeed=i+786,decision=b.chooseAction(c,{rng:rng(rSeed)});
  assert.ok(['raise','check','call','fold'].includes(decision.kind),'invalid action '+i);
  if(c.toCall>0)assert.notEqual(decision.kind,'check');
  if(c.toCall===0)assert.notEqual(decision.kind,'call');
  if(!c.canRaise)assert.notEqual(decision.kind,'raise');
  if(decision.kind==='raise')assert.ok(Number.isInteger(decision.target)&&decision.target>=c.minRaiseTarget&&decision.target<=c.maxTotal);
  const hidden={...c,opponents:c.opponents.map(x=>({...x,cards:[card(14,'h'),card(14,'d')]}))};
  assert.equal(JSON.stringify(b.chooseAction(c,{rng:rng(rSeed)})),JSON.stringify(b.chooseAction(hidden,{rng:rng(rSeed)})));
  totals[kind]=(totals[kind]||0)+1;
 }
 assert.ok(profiles.every(k=>totals[k]===2000));
});
test('Distintos perfiles muestran tendencias preflop diferenciadas',()=>{
 const b=create(),r=rng(1212),count={};
 for(let i=0;i<2400;i++){
  const cards2=sampleCards(r,2);
  for(const kind of profiles){
   const c={...context(0,r,kind,'intermediate','preflop'),hole:cards2,position:'BTN',raiseCount:0,canRaise:true,currentBet:2,toCall:2,pot:3};
   const a=b.chooseAction(c,{rng:rng(123+i)});
   const m=count[kind]||(count[kind]={fold:0,call:0,raise:0});
   m[a.kind]=(m[a.kind]||0)+1;
  }
 }
 const loose=count['loose-passive'].call+count['loose-passive'].raise;
 const tight=count['tight-passive'].call+count['tight-passive'].raise;
 assert.ok(loose>tight*1.5,JSON.stringify(count));
});
