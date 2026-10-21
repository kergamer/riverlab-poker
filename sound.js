/*
 * RIVERLAB Sound Studio v0.3.3
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
  let volume = clamp(Number(read(KEY_VOL, '38')) || 0, 0, 100);
  let ctx = null, master = null, noiseBuffer = null;
  let scheduledUntil = 0;
  const lastPlayed = Object.create(null);
  const cooldown = {
    ui: 85, chip: 85, check: 100, call: 110, raise: 130,
    allin: 140, fold: 115, deal: 170, newHand: 300,
    showdown: 230, win: 450, pot: 200, refund: 170
  };

  function masterLevel() { return enabled ? (volume / 100) * 0.43 : 0; }
  function makeContext() {
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
    } catch (e) { ctx = null; master = null; noiseBuffer = null; }
    return ctx;
  }
  function unlock() {
    if (!enabled) return;
    const audio = makeContext();
    if (!audio) return;
    if (audio.state === 'suspended') {
      try { const task = audio.resume(); if (task && typeof task.catch === 'function') task.catch(() => {}); }
      catch (e) { /* browser did not accept gesture */ }
    }
  }
  function setMaster() {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(masterLevel(), t, 0.012);
  }
  function tone(at, hz, endHz, duration, strength, wave, intensity) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave || 'sine';
    osc.frequency.setValueAtTime(hz, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(50, endHz), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, strength * intensity), at + Math.min(0.008, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(at); osc.stop(at + duration + 0.007);
  }
  function rustle(at, hz, endHz, duration, strength, intensity) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = 'bandpass'; filter.Q.value = 0.83;
    filter.frequency.setValueAtTime(Math.max(90, hz), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, endHz), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, strength * intensity), at + Math.min(0.009, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(at); src.stop(at + duration + 0.008);
  }
  function chip(at, intensity, pitch) {
    const p = pitch || 1;
    rustle(at, 3500 * p, 1250 * p, 0.044, 0.29, intensity);
    tone(at, 950 * p, 670 * p, 0.058, 0.26, 'triangle', intensity);
    tone(at + 0.004, 1630 * p, 1120 * p, 0.035, 0.095, 'sine', intensity);
  }
  function card(at, intensity) {
    rustle(at, 2350, 720, 0.09, 0.23, intensity);
    tone(at + 0.022, 400, 280, 0.038, 0.07, 'triangle', intensity);
  }
  function perform(kind, at, intensity) {
    switch (kind) {
      case 'ui':
        rustle(at, 2050, 1100, 0.025, 0.16, intensity);
        tone(at, 570, 440, 0.042, 0.11, 'sine', intensity);
        break;
      case 'chip':
        chip(at, intensity, 1.0);
        break;
      case 'check':
        rustle(at, 950, 410, 0.043, 0.21, intensity);
        tone(at, 470, 330, 0.057, 0.18, 'triangle', intensity);
        break;
      case 'call':
        chip(at, intensity * 0.8, 0.96);
        chip(at + 0.055, intensity * 0.72, 1.03);
        break;
      case 'raise':
        chip(at, intensity * 0.80, 0.97);
        chip(at + 0.052, intensity * 0.72, 1.09);
        chip(at + 0.106, intensity * 0.62, 1.19);
        tone(at + 0.113, 850, 980, 0.105, 0.12, 'sine', intensity);
        break;
      case 'allin':
        for (let i = 0; i < 4; i++) chip(at + 0.043 * i, intensity * (0.82 - 0.07 * i), 0.91 + i * 0.075);
        tone(at + 0.14, 540, 420, 0.155, 0.19, 'triangle', intensity);
        break;
      case 'fold':
        rustle(at, 2500, 375, 0.142, 0.27, intensity);
        tone(at + 0.023, 320, 215, 0.082, 0.075, 'sine', intensity);
        break;
      case 'deal':
        card(at, intensity * 0.85);
        card(at + 0.055, intensity * 0.72);
        card(at + 0.112, intensity * 0.67);
        break;
      case 'newHand':
        rustle(at, 980, 3500, 0.165, 0.22, intensity);
        card(at + 0.039, intensity * 0.57);
        card(at + 0.103, intensity * 0.62);
        break;
      case 'showdown':
        card(at, intensity * 0.8);
        tone(at + 0.074, 560, 710, 0.140, 0.10, 'sine', intensity);
        tone(at + 0.112, 780, 870, 0.155, 0.08, 'sine', intensity);
        break;
      case 'win':
        chip(at, intensity * 0.70, 1.05);
        tone(at + 0.052, 523.25, 523.25, 0.210, 0.15, 'sine', intensity);
        tone(at + 0.117, 659.26, 659.26, 0.245, 0.13, 'sine', intensity);
        tone(at + 0.177, 783.99, 783.99, 0.320, 0.105, 'sine', intensity);
        break;
      case 'pot':
        chip(at, intensity * 0.80, 0.85);
        tone(at + 0.046, 510, 415, 0.079, 0.10, 'triangle', intensity);
        break;
      case 'refund':
        chip(at, intensity * 0.6, 0.8);
        break;
      default:
        return false;
    }
    return true;
  }
  function play(kind, options) {
    options = options || {};
    if (!enabled || volume <= 0 || document.hidden || !ctx || !master || ctx.state !== 'running') return false;
    const now = Date.now(), minGap = cooldown[kind] || 90;
    if (!options.preview && now - (lastPlayed[kind] || 0) < minGap) return false;
    const at = Math.max(ctx.currentTime + 0.005, scheduledUntil);
    if (at - ctx.currentTime > 0.24 && !options.preview && kind !== 'win') return false;
    const intensity = clamp(Number(options.intensity) || 1, 0.18, 1);
    try {
      if (!perform(kind, at, intensity)) return false;
      scheduledUntil = at + (kind === 'win' ? 0.22 : kind === 'allin' ? 0.18 : kind === 'raise' ? 0.125 : kind === 'deal' ? 0.13 : 0.065);
      lastPlayed[kind] = now;
      return true;
    } catch (e) { return false; }
  }
  function setEnabled(next) {
    enabled = !!next;
    write(KEY_ON, enabled ? '1' : '0');
    if (enabled) unlock();
    setMaster();
    return enabled;
  }
  function setVolume(next) {
    volume = clamp(Math.round(Number(next) || 0), 0, 100);
    write(KEY_VOL, volume);
    setMaster();
    return volume;
  }
  function preview() {
    unlock();
    return play('call', { preview: true, intensity: 0.8 });
  }

  // All audio starts only after an explicit user action. No automatic page-load sounds.
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
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
    get supported() { return !!(window.AudioContext || window.webkitAudioContext); }
  });
}());
