// js/systems/sfx.js
// SFX por Web Audio API (sem arquivos). Suporta "beatmap" por TAG.
// API: loadBeatmap(map), play(tag), setVolume(v), setMuted(bool), getVolume(), isMuted()

let AC = window.AudioContext || window.webkitAudioContext;
let ctx = null;
let master = null;
let masterGain = 0.7;   // volume global (0..1)
let muted = false;
let beatmap = {};

// Preferências (persistência)
const PREFS_KEY = 'naruto_sfx_prefs_v1';
function savePrefs(){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: masterGain, muted })); }catch(e){}
}
function loadPrefs(){
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(typeof p.volume === 'number') masterGain = Math.max(0, Math.min(1, p.volume));
    if(typeof p.muted === 'boolean') muted = p.muted;
    if(master) master.gain.value = muted ? 0 : masterGain;
  }catch(e){}
}

function ensureCtx(){
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterGain;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
}

export function setVolume(v=0.7){
  masterGain = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : masterGain;
  savePrefs();
}
export function setMuted(m=false){
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : masterGain;
  savePrefs();
}
export function getVolume(){ return masterGain; }
export function isMuted(){ return !!muted; }

export function loadBeatmap(map){
  beatmap = map || {};
  // aplica preferências salvas
  loadPrefs();
}

function env(node, {attack=0.005, hold=0.06, release=0.12, peak=0.6}={}, t0){
  const g = node;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
}

function mkOsc({wave='sine', freq=880, glideTo=null, glideTime=0.08}={}, t0){
  const o = ctx.createOscillator();
  o.type = wave;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo != null) {
    o.frequency.linearRampToValueAtTime(glideTo, t0 + glideTime);
  }
  return o;
}

// Ruído branco simples — útil para “cancel”/“fail”
function mkNoise(t0, dur=0.1){
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function synthPlay(spec){
  ensureCtx();
  const now = ctx.currentTime;

  const {
    wave='sine',
    freq=880,
    dur=0.08,
    attack=0.005,
    release=0.12,
    gain=0.6,
    glideTo=null,
    glideTime=0.08,
    kind='tone' // 'tone' | 'noise' | 'tone+noise'
  } = spec || {};

  // BUS local pra controlar ADSR e volume do som
  const g = ctx.createGain();
  g.connect(master);

  // aplica envelope no BUS
  env(g, {attack, hold: dur, release, peak: gain}, now);

  let osc, noise;
  if (kind === 'noise' || kind === 'tone+noise') {
    noise = mkNoise(now, attack + dur + release);
    noise.connect(g);
    noise.start(now);
    noise.stop(now + attack + dur + release);
  }
  if (kind === 'tone' || kind === 'tone+noise') {
    osc = mkOsc({wave, freq, glideTo, glideTime}, now);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + attack + dur + release);
  }
}

export function play(tag){
  if (muted) return;
  const entry = beatmap[tag];
  if (!entry) return;
  // Aceita formato { synth:{...} } ou diretamente o objeto de síntese
  const spec = entry.synth ? entry.synth : entry;
  synthPlay(spec);
}

// Desbloqueia o AudioContext no primeiro gesto do usuário (iOS/Safari)
export function warmupAudio(){ try{ ensureCtx(); }catch(e){} }
