/*
 * RIVERLAB Sound Atelier v0.3.5
 * Procedural, self-contained Web Audio effects. No external samples or requests.
 * Unlocked by a user's pointer/key gesture to comply with Safari/iOS/Chrome.
 */
(function () {
  'use strict';

  const KEY_ON = 'riverlab.v03.soundEnabled';
  const KEY_VOL = 'riverlab.v03.soundVolume';
  function read(key, fallback) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) { /* optional preference */ }
  }
  function clamp(n, low, high) { return Math.min(high, Math.max(low, n)); }

  let enabled = read(KEY_ON, '1') !== '0';
  let volume = clamp(Number(read(KEY_VOL, '55')) || 0, 0, 100);
  let ctx = null, master = null, noiseBuffer = null;
  let scheduledUntil = 0;
  let pendingPreviewAt = 0;
  let pendingPreviewKind = 'call';
  let lastResumeAttempt = 0;
  let lastContextRestart = 0;
  const lastPlayed = Object.create(null);
  const cooldown = {
    ui: 85, chip: 85, check: 100, call: 110, raise: 130,
    allin: 140, fold: 115, deal: 170, card: 125, newHand: 300,
    showdown: 230, win: 450, pot: 200, refund: 170
  };

  function masterLevel() { return enabled ? (volume / 100) * 0.64 : 0; }
  function status() {
    if (!(window.AudioContext || window.webkitAudioContext)) return 'unsupported';
    if (!enabled) return 'off';
    if (volume <= 0) return 'zero';
    if (!ctx) return 'locked';
    if (ctx.state === 'running') return 'ready';
    if (ctx.state === 'interrupted') return 'interrupted';
    if (ctx.state === 'suspended') return 'suspended';
    return 'unavailable';
  }
  function notify() {
    try {
      if (typeof window.dispatchEvent === 'function' && typeof window.Event === 'function') {
        window.dispatchEvent(new window.Event('riverlab-audio-state'));
      }
    } catch (e) { /* diagnostics should not interrupt the game */ }
  }
  function configureOutput() {
    // Explicitly enabling game audio may require an active playback category on iOS.
    try {
      const audioSession = window.navigator && window.navigator.audioSession;
      if (audioSession && audioSession.type !== 'playback') audioSession.type = 'playback';
    } catch (e) { /* unsupported browser */ }
  }
  function makeContext() {
    if (ctx && ctx.state === 'closed') { ctx = null; master = null; noiseBuffer = null; }
    if (ctx || !enabled) return ctx;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    try {
      ctx = new Constructor({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = masterLevel();
      master.connect(ctx.destination);
      const length = Math.ceil(ctx.sampleRate * 0.43);
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.78;
      ctx.onstatechange = function () {
        notify();
        if (ctx && ctx.state === 'running') flushPreview();
      };
    } catch (e) { ctx = null; master = null; noiseBuffer = null; notify(); }
    return ctx;
  }
  function flushPreview() {
    if (!pendingPreviewAt || !ctx || ctx.state !== 'running') return;
    const elapsed = Date.now() - pendingPreviewAt;
    pendingPreviewAt = 0;
    const kind = pendingPreviewKind;
    pendingPreviewKind = 'call';
    // Never play an old preview after returning to the app much later.
    if (elapsed > 2500 || document.hidden || !enabled || volume <= 0) return;
    play(kind, { preview: true, intensity: 0.83 });
  }
  function unlock() {
    if (!enabled || volume <= 0 || document.hidden) { notify(); return false; }
    configureOutput();
    let audio = makeContext();
    if (!audio) { notify(); return false; }
    if (audio.state === 'running') { flushPreview(); notify(); return true; }
    const now = Date.now();
    // A pending Safari resume can hang after a PWA returns from background.
    // Restart only on a *later* user interaction, never in a background loop.
    if (lastResumeAttempt && now - lastResumeAttempt > 1900 &&
        now - lastContextRestart > 1900 &&
        (audio.state === 'suspended' || audio.state === 'interrupted')) {
      try { if (typeof audio.close === 'function') audio.close().catch?.(() => {}); } catch (e) {}
      ctx = null; master = null; noiseBuffer = null; scheduledUntil = 0;
      lastContextRestart = now;
      audio = makeContext();
      if (!audio) { notify(); return false; }
    }
    lastResumeAttempt = now;
    try {
      const task = audio.resume();
      if (task && typeof task.then === 'function') {
        task.then(function () {
          if (audio !== ctx) return;
          notify();
          flushPreview();
        }).catch(function () { notify(); });
      }
    } catch (e) { notify(); }
    notify();
    return audio.state === 'running';
  }
  function setMaster() {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(masterLevel(), t, 0.012);
  }
  // RIVERLAB SIGNATURE: tactile acoustic palette.
  // Soft felt noise, wooden table taps and porcelain-chip resonance.
  // There is no background music: the table gets its rhythm from real actions.
  let voiceNumber = 0;
  let lastEventAt = 0;
  const effectKinds = ['ui','chip','check','call','raise','allin','fold',
    'deal','card','newHand','showdown','win','pot','refund'];

  // Subtle, bounded detuning prevents repeated decisions sounding copy/pasted.
  function humanize(spread=0.025) {
    voiceNumber++;
    return 1 + Math.sin(voiceNumber * 2.3999632297 + 0.47) * spread;
  }
  function voice(at, hz, hzEnd, length, level, waveform, intensity) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const end = at + Math.max(0.018, length);
    osc.type = waveform || 'sine';
    osc.frequency.setValueAtTime(hz, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(48, hzEnd), end);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00015, level * intensity), at + Math.min(0.008, length * 0.21));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain); gain.connect(master);
    osc.start(at); osc.stop(end + 0.012);
  }
  function felt(at, hz, hzEnd, duration, level, intensity, softness=1) {
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.Q.value = Math.max(0.4, 0.65 * softness);
    filter.frequency.setValueAtTime(hz, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, hzEnd), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00015, level * intensity), at + Math.min(0.012, duration * 0.19));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(at); src.stop(at + duration + 0.011);
  }

  // CHECK: a short, dry wooden touch with a tiny felt reflection.
  // Not an electronic button beep, and quieter than placing chips.
  function woodTap(at, intensity, accent=1) {
    const v=humanize(0.020), level=intensity * accent;
    felt(at, 1460*v, 740*v, 0.031, 0.22, level);
    voice(at+0.002, 375*v, 293*v, 0.067, 0.22, 'triangle', level);
    voice(at+0.005, 795*v, 610*v, 0.031, 0.040, 'sine', level);
  }
  function checkTap(at, intensity) {
    woodTap(at, intensity, 0.92);
    // Very quiet second contact suggests a finger leaving the wooden table.
    felt(at+0.052, 900, 555, 0.021, 0.052, intensity);
  }

  // Fichas: porcelain-like chips clinking together, not synth bleeps.
  function chipTap(at, intensity, pitch=1) {
    const v=humanize(0.031)*pitch;
    felt(at, 3100*v, 1420*v, 0.037, 0.33, intensity);
    voice(at+0.001, 1050*v, 860*v, 0.074, 0.25, 'sine', intensity);
    voice(at+0.004, 1710*v, 1350*v, 0.047, 0.073, 'triangle', intensity);
    voice(at+0.009, 600*v, 490*v, 0.063, 0.065, 'triangle', intensity);
  }

  // Felt-backed cardstock: brushed movement plus a quiet contact at the end.
  function cardSlide(at, intensity, duration=0.097) {
    const v=humanize(0.045);
    felt(at, 2650*v, 1180*v, duration, 0.32, intensity, 0.78);
    felt(at+0.015, 1080*v, 540*v, duration*0.72, 0.082, intensity, 0.82);
    voice(at+duration*0.69, 325*v, 260*v, 0.036, 0.075, 'triangle', intensity);
  }

  // Brief airy rustling, not a looping ambience.
  function feltShuffle(at, intensity) {
    felt(at, 960, 2240, 0.115, 0.21, intensity);
    felt(at+0.050, 1830, 870, 0.099, 0.20, intensity*0.75);
  }

  // Musical feedback only for wins; sparse, warm wooden-bar overtones.
  function bellNote(at, hz, duration, intensity, emphasis=1) {
    const v=humanize(0.008);
    voice(at, hz*v, hz*0.998*v, duration, 0.130*emphasis, 'sine', intensity);
    voice(at+0.002, hz*2.01*v, hz*2.005*v, duration*0.64, 0.024*emphasis, 'sine', intensity);
  }
  function perform(kind, at, intensity) {
    switch (kind) {
      case 'ui':
        felt(at, 1500, 910, 0.022, 0.090, intensity);
        voice(at+0.001, 630, 540, 0.035, 0.095, 'sine', intensity);
        break;
      case 'chip':
        chipTap(at, intensity*0.80);
        break;
      case 'check':
        checkTap(at, intensity);
        break;
      case 'call':
        chipTap(at, intensity*0.83, 0.99);
        chipTap(at+0.068, intensity*0.72, 1.045);
        break;
      case 'raise':
        chipTap(at, intensity*0.81, 0.96);
        chipTap(at+0.052, intensity*0.77, 1.07);
        chipTap(at+0.105, intensity*0.67, 1.16);
        felt(at+0.132, 1200, 690, 0.065, 0.13, intensity);
        break;
      case 'allin':
        feltShuffle(at, intensity*0.66);
        for(let i=0;i<5;i++)chipTap(at+0.042*i, intensity*(0.74-i*0.065), 1.04-i*0.055);
        voice(at+0.207, 345, 288, 0.115, 0.105, 'triangle', intensity);
        break;
      case 'fold':
        cardSlide(at, intensity*0.88, 0.141);
        felt(at+0.083, 700, 350, 0.057, 0.11, intensity);
        break;
      case 'deal':
        cardSlide(at, intensity*0.82, 0.085);
        cardSlide(at+0.082, intensity*0.78, 0.085);
        cardSlide(at+0.165, intensity*0.82, 0.085);
        break;
      case 'card':
        cardSlide(at, intensity*0.86, 0.11);
        break;
      case 'newHand':
        feltShuffle(at, intensity*0.73);
        cardSlide(at+0.058, intensity*0.57, 0.080);
        cardSlide(at+0.137, intensity*0.61, 0.082);
        break;
      case 'showdown':
        cardSlide(at, intensity*0.76, 0.088);
        cardSlide(at+0.085, intensity*0.72, 0.090);
        // Neutral anticipation, without a harsh electronic 'reveal'.
        bellNote(at+0.128, 392, 0.172, intensity*0.39);
        break;
      case 'win':
        chipTap(at, intensity*0.61, 0.98);
        chipTap(at+0.071, intensity*0.52, 1.04);
        // Three tasteful marimba-like notes, deliberately not a casino jackpot.
        bellNote(at+0.083, 523.25, 0.230, intensity*0.90);
        bellNote(at+0.155, 659.25, 0.270, intensity*0.73);
        bellNote(at+0.226, 783.99, 0.350, intensity*0.57);
        break;
      case 'pot':
        chipTap(at, intensity*0.70, 0.91);
        chipTap(at+0.073, intensity*0.49, 0.83);
        felt(at+0.090, 1350, 710, 0.092, 0.12, intensity);
        break;
      case 'refund':
        chipTap(at, intensity*0.53, 0.84);
        break;
      default:
        return false;
    }
    return true;
  }
  function play(kind, options) {
    options = options || {};
    if (!effectKinds.includes(kind) || !enabled || volume<=0 || document.hidden ||
      !ctx || !master || ctx.state!=='running') return false;

    const now=Date.now(), isPreview=options.preview===true;
    const gap=cooldown[kind]||95;
    if(!isPreview && now-(lastPlayed[kind]||0)<gap)return false;

    // Short bursts of bot activity should feel rhythmic, not noisy.
    const since=now-lastEventAt;
    const density=isPreview?1:since<100?0.55:since<230?0.77:1;
    const raw=Number(options.intensity ?? 1);
    const intensity=clamp((Number.isFinite(raw)?raw:1)*density,0.20,1);
    const base=ctx.currentTime+0.007;
    let at=Math.max(base,scheduledUntil);
    if(at-base>0.19 && !isPreview){
      // Prioritise the player's decisions and street transitions.
      if(['ui','chip','refund'].includes(kind))return false;
      at=base+0.035;
    }
    try{
      if(!perform(kind,at,intensity))return false;
      scheduledUntil=at+({ui:0.028,chip:0.051,check:0.059,call:0.105,
        raise:0.118,allin:0.165,fold:0.091,deal:0.188,card:0.084,
        newHand:0.158,showdown:0.145,win:0.175,pot:0.108,refund:0.046}[kind]||0.080);
      lastPlayed[kind]=now;
      lastEventAt=now;
      return true;
    }catch(e){return false;}
  }
  function setEnabled(next) {
    enabled = !!next;
    write(KEY_ON, enabled ? '1' : '0');
    if (!enabled) {
      pendingPreviewAt = 0;
      // Revert to the normal device audio policy when the user mutes the game.
      try {
        const session = window.navigator && window.navigator.audioSession;
        if (session && session.type === 'playback') session.type = 'auto';
      } catch (e) {}
    } else unlock();
    setMaster();
    notify();
    return enabled;
  }
  function setVolume(next) {
    volume = clamp(Math.round(Number(next) || 0), 0, 100);
    write(KEY_VOL, volume);
    setMaster();
    if (enabled && volume > 0) unlock();
    notify();
    return volume;
  }
  function preview(kind='call') {
    if (!enabled || volume <= 0) { notify(); return false; }
    pendingPreviewKind = effectKinds.includes(kind) ? kind : 'call';
    pendingPreviewAt = Date.now();
    // On Safari, AudioContext.resume() may resolve AFTER this click callback.
    // The preview is then emitted from flushPreview() and not silently dropped.
    return unlock();
  }

  // All audio starts only after an explicit user action. No automatic page-load sounds.
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('touchend', unlock, { capture: true, passive: true });
  document.addEventListener('click', unlock, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // A suspended context will be restarted by the next real user gesture.
      pendingPreviewAt = 0;
    }
    notify();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta') return;
    unlock();
  }, true);

  // UI navigation feedback uses delegation; gameplay actions emit their own sounds.
  document.addEventListener('click', function (e) {
    const b = e.target && typeof e.target.closest === 'function' ? e.target.closest('button') : null;
    if (!b || b.disabled || b.id === 'sound-toggle') return;
    if (b.classList.contains('action-btn') || b.classList.contains('size-preset')) return;
    const action = b.getAttribute('onclick') || '';
    if (/^\s*(act|newHand|rebuy|toggleSound|previewSound|setPreset)\s*\(/.test(action)) return;
    play('ui', { intensity: 0.49 });
  });

  window.RiverlabAudio = Object.freeze({
    play, unlock, preview, setEnabled, setVolume,
    get enabled() { return enabled; },
    get volume() { return volume; },
    get status() { return status(); },
    get supported() { return !!(window.AudioContext || window.webkitAudioContext); }
  });
}());
