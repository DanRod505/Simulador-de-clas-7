// js/systems/bgm.js
// Player simples de BGM baseado em <audio>, com playlist aleatória + volume/mute.
// API pública:
//   initBGM(files?: string[])   -> inicializa (uma vez) com 'files' ou com a lista padrão
//   startBGM()                  -> inicia playback (chamar no 1º toque)
//   toggleBGM()                 -> play/pause
//   nextBGM()                   -> próxima faixa (mantém shuffle)
//   setBGMVolume(v:0..1)
//   setBGMMuted(bool)
//   getBGMVolume(), isBGMPlaying(), isBGMMuted()
//   setPlaylist(files:string[]) -> troca a playlist em runtime (opcional)

import { MUSIC_FILES } from '../data/music.js';

let audio = null;
// A playlist padrão agora vem de MUSIC_FILES; ainda pode ser substituída por initBGM()/setPlaylist().
let playlist = MUSIC_FILES.slice();

let order = [];     // ordem embaralhada (índices)
let idx = -1;       // posição atual em "order"
let ready = false;

let vol = 0.6;      // volume padrão
let muted = false;

const PREFS_KEY = 'naruto_bgm_prefs_v1';

function savePrefs(){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify({ vol, muted })); }catch{}
}
function loadPrefs(){
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(typeof p.vol === 'number') vol = Math.max(0, Math.min(1, p.vol));
    if(typeof p.muted === 'boolean') muted = p.muted;
  }catch{}
}

function shuffle(n){
  const arr = Array.from({length:n}, (_,i)=>i);
  for(let i=n-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ensureAudio(){
  if(audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = muted ? 0 : vol;
  audio.addEventListener('ended', () => { nextBGM(); });
  audio.addEventListener('error', () => { nextBGM(); });
  return audio;
}

function loadCurrent(autoplay=true){
  if(!playlist.length) return;
  if(idx < 0 || idx >= order.length){
    order = shuffle(playlist.length);
    idx = 0;
  }
  const i = order[idx];
  const src = playlist[i];
  ensureAudio();
  audio.src = src;
  if(autoplay){
    audio.play().catch(()=>{/* aguardará gesto do usuário */});
  }
}

export function initBGM(files){
  if(ready) return;
  loadPrefs();
  if (Array.isArray(files) && files.length){
    playlist = files.slice();
  } // senão, mantém a lista padrão de MUSIC_FILES
  ensureAudio();
  ready = true;
}

export function startBGM(){
  if(!ready){ initBGM(); }
  if(!playlist.length) return;
  if(!audio.src) loadCurrent(true);
  else audio.play().catch(()=>{});
}

export function toggleBGM(){
  if(!audio) ensureAudio();
  if(audio.paused){ audio.play().catch(()=>{}); }
  else audio.pause();
}

export function nextBGM(){
  if(!playlist.length) return;
  if(order.length === 0) order = shuffle(playlist.length);
  idx++;
  if(idx >= order.length){
    order = shuffle(playlist.length);
    idx = 0;
  }
  loadCurrent(true);
}

export function setBGMVolume(v=0.6){
  vol = Math.max(0, Math.min(1, v));
  if(!audio) ensureAudio();
  audio.volume = muted ? 0 : vol;
  savePrefs();
}
export function getBGMVolume(){ return vol; }

export function setBGMMuted(m=false){
  muted = !!m;
  if(!audio) ensureAudio();
  audio.volume = muted ? 0 : vol;
  savePrefs();
}
export function isBGMMuted(){ return !!muted; }
export function isBGMPlaying(){ return !!audio && !audio.paused; }

// Permite trocar/definir a playlist depois
export function setPlaylist(files){
  playlist = Array.isArray(files) ? files.slice() : [];
  order = shuffle(playlist.length);
  idx = 0;
  if (audio && !audio.paused) {
    // se já está tocando, carrega a primeira da nova ordem
    loadCurrent(true);
  }
}
