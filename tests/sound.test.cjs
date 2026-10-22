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
  resume(){if(FakeAudioContext.deferNextResume){return new Promise(resolve=>{FakeAudioContext.pendingResume=()=>{this.state='running';FakeAudioContext.deferNextResume=false;if(this.onstatechange)this.onstatechange();resolve();};});}this.state='running';if(this.onstatechange)this.onstatechange();return Promise.resolve();}
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
 assert.ok(html.includes('<script src="./sound.js"></script>\n<script src="./bots.js"></script>\n<script>'));
 assert.ok(sw.includes("'./sound.js'"));
 assert.ok(sw.includes('riverlab-v2-volumetry-1'));
 assert.ok(sw.includes("'./volumetry.css'"));
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

test('La prueba espera a que Safari active su AudioContext antes de sonar', async()=>{
 const before=recorded.oscillators+recorded.noises;
 FakeAudioContext.deferNextResume=true;
 const e=makeContext();
 const audio=e.sandbox.window.RiverlabAudio;
 assert.equal(audio.status,'locked');
 assert.equal(audio.preview(),false);
 assert.equal(audio.status,'suspended');
 assert.equal(recorded.oscillators+recorded.noises,before,'no se debe perder el sonido ni emitir antes de activar');
 assert.equal(typeof FakeAudioContext.pendingResume,'function');
 FakeAudioContext.pendingResume();
 await Promise.resolve();
 assert.equal(audio.status,'ready');
 assert.ok(recorded.oscillators+recorded.noises>before,'al activarse debe reproducir el sonido pendiente');
});
test('El indicador ON no se muestra hasta que el audio esté listo',async()=>{
 const e=makeContext();
 const button=e.nodes['sound-toggle'];
 assert.equal(button.textContent,'♫ ACTIVAR');
 assert.equal(e.sandbox.window.RiverlabAudio.status,'locked');
 const before=recorded.audioObjects;
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 assert.equal(recorded.audioObjects,before+1);
 vm.runInContext('updateSoundUI()',e.sandbox);
 assert.equal(button.textContent,'♫ ON');
 e.sandbox.window.RiverlabAudio.setVolume(0);
 vm.runInContext('updateSoundUI()',e.sandbox);
 assert.equal(button.textContent,'♫ 0 %');
});
test('Una interrupción de Safari puede reanudarse mediante una nueva interacción',async()=>{
 const e=makeContext();
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 const audio=e.sandbox.window.RiverlabAudio;
 assert.equal(audio.status,'ready');
 instance.state='interrupted';
 assert.equal(audio.status,'interrupted');
 const before=recorded.oscillators+recorded.noises;
 audio.preview();
 await Promise.resolve();
 assert.equal(audio.status,'ready');
 assert.ok(recorded.oscillators+recorded.noises>before);
});

test('Sound Atelier dispone de muestras independientes y un check táctil', async()=>{
 const e=makeContext();
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 const audio=e.sandbox.window.RiverlabAudio;
 const before=recorded.oscillators+recorded.noises;
 assert.equal(audio.preview('check'),true);
 assert.ok(recorded.oscillators+recorded.noises>before);
 assert.ok(audio.status==='ready');
 assert.ok(audio.preview('fold'));
 assert.ok(audio.preview('deal'));
 assert.ok(audio.preview('raise'));
 assert.ok(audio.preview('win'));
 assert.equal(audio.play('unknown',{preview:true}),false);
});
test('Panel de escucha reproduce al menos 12 efectos sin cambiar la sesión', async()=>{
 const e=makeContext();
 const oldStack=e.sandbox.window.__riverlab.state.players[0].stack;
 vm.runInContext('openSettings()',e.sandbox);
 const modal=e.nodes['modal-root'].innerHTML;
 const sounds=[...modal.matchAll(/data-sound="([a-zA-Z]+)"/g)].map(x=>x[1]);
 assert.equal(sounds.length,13);
 for(const key of ['check','call','raise','fold','deal','showdown','win','pot','ui'])assert.ok(sounds.includes(key),key);
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 for(const key of ['check','call','raise','fold','deal','showdown','win']){
   const before=recorded.oscillators+recorded.noises;
   vm.runInContext('previewSound('+JSON.stringify(key)+')',e.sandbox);
   assert.ok(recorded.oscillators+recorded.noises>before,'preview audible: '+key);
 }
 assert.equal(e.sandbox.window.__riverlab.state.players[0].stack,oldStack);
});
test('Motores sonoros conservan modo silencio y control de volumen', async()=>{
 const e=makeContext();
 e.listeners.pointerdown[0]({});
 await Promise.resolve();
 const audio=e.sandbox.window.RiverlabAudio;
 audio.setVolume(0);
 assert.equal(audio.preview('check'),false);
 audio.setVolume(35);
 audio.setEnabled(false);
 assert.equal(audio.preview('win'),false);
 audio.setEnabled(true);
 await Promise.resolve();
 assert.equal(audio.preview('check'),true);
});
