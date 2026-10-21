const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const audioSource = fs.readFileSync(path.join(__dirname,'..','sound.js'),'utf8');
const sw = fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
const game = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(game,'Main game engine embedded in index.html');
new vm.Script(audioSource,{filename:'sound.js'});
new vm.Script(game,{filename:'index.html game'});

const recorded={audioObjects:0,oscillators:0,noises:0};
let instance;
class AudioParam {
  setValueAtTime(){} exponentialRampToValueAtTime(){}
  cancelScheduledValues(){} setTargetAtTime(){}
}
class SoundNode {
  constructor(){this.gain=new AudioParam();this.frequency=new AudioParam();this.Q={value:0};}
  connect(){return this;} start(){} stop(){}
}
class FakeAudioContext {
  constructor(){this.state='suspended';this.sampleRate=44100;this.currentTime=0;this.destination={};recorded.audioObjects++;instance=this;}
  createGain(){return new SoundNode();}
  createOscillator(){recorded.oscillators++;return new SoundNode();}
  createBufferSource(){recorded.noises++;return new SoundNode();}
  createBiquadFilter(){return new SoundNode();}
  createBuffer(_ch,len){return {getChannelData:()=>new Float32Array(len)};}
  resume(){this.state='running';return Promise.resolve();}
}
function makeContext(initial={}){
 const storage=new Map(Object.entries(initial));
 const listeners={};
 const nodes={};
 const el=id=>nodes[id]??=( {innerHTML:'',textContent:'',style:{},value:'',disabled:false,setAttribute(){},classList:{add(){},toggle(){},remove(){}}} );
 const document={
  hidden:false,documentElement:{lang:'es'},getElementById:el,querySelectorAll:()=>[],
  addEventListener(kind,fn){(listeners[kind]??=[]).push(fn);}
 };
 const window={AudioContext:FakeAudioContext,webkitAudioContext:null};
 const localStorage={
  getItem:k=>storage.get(k)??null,
  setItem:(k,v)=>storage.set(k,String(v)),
  removeItem:k=>storage.delete(k)
 };
 const sandbox={window,document,localStorage,Date,Math,Intl,console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};
 sandbox.globalThis=sandbox;
 vm.createContext(sandbox);
 vm.runInContext(audioSource,sandbox,{filename:'sound.js'});
 vm.runInContext(game,sandbox,{filename:'game.js'});
 return {sandbox,storage,listeners,nodes};
}
test('PWA incluye sonido sintetizado offline y carga antes del motor',()=>{
 assert.ok(html.includes('<script src="./sound.js"></script>\n<script>'));
 assert.ok(sw.includes("'./sound.js'"));
 assert.ok(sw.includes('riverlab-v033'));
});
test('Sonido no se reproduce sin gesto del usuario',async()=>{
 const e=makeContext();
 assert.equal(recorded.audioObjects,0);
 assert.equal(e.sandbox.window.RiverlabAudio.play('ui'),false);
 assert.equal(recorded.audioObjects,0);
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 assert.equal(recorded.audioObjects,1);
 assert.equal(e.sandbox.window.RiverlabAudio.play('ui'),true);
 assert.ok(recorded.oscillators>0);
});
test('Mute y volumen persisten y afectan a la reproducción',async()=>{
 const e=makeContext();
 e.listeners.pointerdown[0]({});await Promise.resolve();
 const a=e.sandbox.window.RiverlabAudio;
 assert.equal(a.setVolume(0),0);
 assert.equal(e.storage.get('riverlab.v03.soundVolume'),'0');
 assert.equal(a.play('chip',{preview:true}),false);
 a.setVolume(42);
 assert.equal(e.storage.get('riverlab.v03.soundVolume'),'42');
 a.setEnabled(false);
 assert.equal(e.storage.get('riverlab.v03.soundEnabled'),'0');
 assert.equal(a.play('call',{preview:true}),false);
 a.setEnabled(true);await Promise.resolve();
 assert.equal(a.play('deal',{preview:true}),true);
});
test('Se muestran los ajustes de volumen y el control global de silencio',()=>{
 const e=makeContext();
 assert.equal(e.nodes['sound-toggle'].getAttribute,undefined);
 vm.runInContext('openSettings()',e.sandbox);
 assert.ok(e.nodes['modal-root'].innerHTML.includes('id="sound-volume"'));
 assert.ok(e.nodes['modal-root'].innerHTML.includes('id="sound-choice"'));
 assert.ok(e.nodes['modal-root'].innerHTML.includes('id="sound-preview"'));
 assert.ok(html.includes('id="sound-toggle"'));
});
test('No se altera el formato persistente de manos V0.3',()=>{
 const e=makeContext();
 assert.equal(e.sandbox.window.__riverlab.saveSession(),true);
 assert.equal(JSON.parse(e.storage.get('riverlab.v03.session')).version,3);
 assert.ok(!e.storage.has('riverlab.v033.session'));
});
test('La navegación de juego emite audio solo tras un gesto',async()=>{
 const e=makeContext();
 e.listeners.pointerdown[0]({});await Promise.resolve();
 const state=e.sandbox.window.__riverlab.state;
 state.turn=0;state.phase='preflop';state.players[0].folded=false;
 const before=recorded.noises+recorded.oscillators;
 assert.equal(e.sandbox.window.__riverlab.act(0,'fold'),true);
 assert.ok(recorded.noises+recorded.oscillators>before,'fold has an acoustic signal');
});
