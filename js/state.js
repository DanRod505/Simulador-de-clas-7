// js/state.js
// Estado global do jogo + utilitários de recursos, gasto e turno.

import { CLANS } from './data/clans.js';
import { CHARACTERS } from './data/characters.js';
import { processEconomy } from './systems/economy.js';
import { progressTasks } from './systems/tasks.js';
import { maybeRollEvent } from './systems/events.js';
import { initRelations, nextTurnHook as relationsNextTurn } from './systems/relations.js';
import { aiNextTurn } from './systems/ai.js';

/**
 * Pontuações iniciais por CLÃ (valores base do “mundo”).
 */
export const CLAN_BASE_STATS = {
  uchiha:   { politica:12, militar:18, economia:22, reputacao:14 },
  hyuga:    { politica:14, militar:16, economia:23, reputacao:15 },
  nara:     { politica:16, militar:12, economia:24, reputacao:12 },
  inuzuka:  { politica:11, militar:15, economia:21, reputacao:13 },
  yamanaka: { politica:15, militar:11, economia:23, reputacao:13 },
  aburame:  { politica:12, militar:14, economia:22, reputacao:12 },
  uzumaki:  { politica:12, militar:17, economia:25, reputacao:16 },
  akimichi: { politica:11, militar:18, economia:21, reputacao:12 },
};

let state = null;

export function getState(){ return state; }
export function setState(s){ state = s; }
export function getPlayerKey(){ return state?.playerClan?.key; }

/* ==========================================================
   Atributos de personagem (formato oficial: poder/diplomacia/estrategia)
   ========================================================== */
function clampAttr(v){ return Math.max(0, Math.min(20, Math.round(v || 0))); }

// Cria um alias stats.power ↔ stats.poder (compatibilidade)
function ensurePowerAlias(stats){
  if (!Object.prototype.hasOwnProperty.call(stats, 'power')) {
    Object.defineProperty(stats, 'power', {
      get(){ return this.poder; },
      set(v){ this.poder = clampAttr(v); },
      enumerable: false,
      configurable: true
    });
  }
}

/**
 * Garante o formato novo: stats.poder, stats.diplomacia, stats.estrategia
 * Converte de campos antigos se necessário (taijutsu/ninjutsu/estrategia/diplomacia/power).
 */
function ensureCharStats3(p){
  p.stats = p.stats || {};

  // Se já veio do novo formato (poder/diplomacia/estrategia)
  const hasNew =
    typeof p.stats.poder       === 'number' &&
    typeof p.stats.diplomacia  === 'number' &&
    typeof p.stats.estrategia  === 'number';

  if (hasNew){
    p.stats.poder       = clampAttr(p.stats.poder);
    p.stats.diplomacia  = clampAttr(p.stats.diplomacia);
    p.stats.estrategia  = clampAttr(p.stats.estrategia);
    ensurePowerAlias(p.stats);
    return;
  }

  // Migração a partir do legado
  const T = p.stats.taijutsu   ?? 0;
  const N = p.stats.ninjutsu   ?? 0;
  const E = p.stats.estrategia ?? 0;
  const D = p.stats.diplomacia ?? 0;

  // Se existia 'power' legado, aproveita-o; senão deriva de Taijutsu/Ninjutsu
  const legacyPower = (typeof p.stats.power === 'number') ? p.stats.power : (T + N) / 2;

  p.stats.poder       = clampAttr(legacyPower);
  p.stats.diplomacia  = clampAttr(D);
  p.stats.estrategia  = clampAttr(E);

  // cria alias .power
  ensurePowerAlias(p.stats);

  // opcional: limpar campos antigos
  // delete p.stats.taijutsu;
  // delete p.stats.ninjutsu;
  // delete p.stats.power;
}

/** Aplica ensureCharStats3 a todos os personagens do estado. */
export function migrateAttributes(s){
  if(!s?.personagens) return;
  s.personagens.forEach(ensureCharStats3);
}

/* ===============================
   Pontuações globais por cada clã
   =============================== */
function baseStatsFor(clanKey){
  const k = String(clanKey || '').toLowerCase();
  const preset = CLAN_BASE_STATS[k];
  if (preset) return { ...preset };
  // fallback neutro (para clãs futuros)
  return { politica:10, militar:10, economia:20, reputacao:10 };
}

function ensureClanStats(s){
  if(!s.clanStats) s.clanStats = {};
  for(const c of CLANS){
    if(!s.clanStats[c.key]){
      s.clanStats[c.key] = baseStatsFor(c.key);
    }
  }
  const pk = s.playerClan?.key || CLANS[0].key;
  s.recursos = s.clanStats[pk];
}

/* ================
   Novo jogo
   ================ */
export function newGame(clanKey){
  const clan = CLANS.find(c => c.key === clanKey) || CLANS[0];

  state = {
    version: 7,                 // bump de versão
    turno: 1,
    playerClan: clan,

    clanStats: {},
    personagens: (CHARACTERS[clan.key] || []).map(c => ({ ...c })),

    tasks: [],
    log: [],
    worldLog: [],
    pendingEvent: null,
    sfxQueue: [],
    relEffects: [],
  };

  for(const c of CLANS){
    state.clanStats[c.key] = baseStatsFor(c.key);
  }
  state.recursos = state.clanStats[clan.key];

  // garante atributos no novo formato
  migrateAttributes(state);

  // relações
  initRelations(state);

  clampAllStats(state);
  saveState();
  return state;
}

/* ================
   Persistência
   ================ */
const LS_KEY = 'naruto_clans_sim_state_v1';

export function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    state = JSON.parse(raw);

    if (!state.version) state.version = 1;
    if (!Array.isArray(state.worldLog)) state.worldLog = [];
    if (!Array.isArray(state.relEffects)) state.relEffects = [];

    ensureClanStats(state);
    migrateAttributes(state);   // garante stats.poder + alias .power
    initRelations(state);

    clampAllStats(state);
    return state;
  }catch(err){
    console.warn('Falha ao carregar save:', err);
    return null;
  }
}

export function saveState(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch(err){ console.warn('Falha ao salvar:', err); }
}

export function resetState(){
  localStorage.removeItem(LS_KEY);
  state = null;
}

/* ==========================================
   Helpers para ler/alterar/gastar pontuações
   ========================================== */
export function getClanStats(key){ return state.clanStats[key]; }

export function changeClanStats(key, deltas = {}, reason=''){
  const s = state.clanStats[key]; if(!s) return;
  if(typeof deltas.politica  === 'number') s.politica  = Math.max(0, s.politica  + deltas.politica);
  if(typeof deltas.militar   === 'number') s.militar   = Math.max(0, s.militar   + deltas.militar);
  if(typeof deltas.economia  === 'number') s.economia  = Math.max(0, s.economia  + deltas.economia);
  if(typeof deltas.reputacao === 'number') s.reputacao = Math.max(0, s.reputacao + deltas.reputacao);

  if(reason && key === getPlayerKey()){
    const parts = [];
    for(const k of Object.keys(deltas)){
      if(!deltas[k]) continue;
      parts.push(`${deltas[k]>0?'+':''}${deltas[k]} ${labelOf(k)}`);
    }
    if(parts.length) state.log.push({ t: state.turno, kind:'delta', text:`${reason}: ${parts.join(' · ')}` });
  }
}

export function canSpend(costs, clanKey = getPlayerKey()){
  const cs = state.clanStats[clanKey];
  const want = (k)=> Math.max(0, costs?.[k] || 0);
  return cs.politica  >= want('politica')  &&
         cs.militar   >= want('militar')   &&
         cs.economia  >= want('economia')  &&
         cs.reputacao >= want('reputacao');
}

export function spend(costs, label = 'Ação', clanKey = getPlayerKey()){
  if(!costs) return true;
  if(!canSpend(costs, clanKey)) return false;
  const neg = {};
  for(const k of ['politica','militar','economia','reputacao']){
    if(costs[k]) neg[k] = -Math.abs(costs[k]);
  }
  changeClanStats(clanKey, neg);
  if(clanKey === getPlayerKey()){
    const parts = Object.entries(costs).filter(([,v])=>v).map(([k,v])=>`-${v} ${labelOf(k)}`);
    if(parts.length) state.log.push({ t: state.turno, kind:'spend', text:`${label}: ${parts.join(' · ')}` });
  }
  return true;
}

function labelOf(k){
  return k==='politica'?'Política':k==='militar'?'Militar':k==='economia'?'Economia':'Reputação';
}

function clampAllStats(s){
  const clampOne = (o)=>{
    o.politica  = Math.max(0, Math.round(o.politica));
    o.militar   = Math.max(0, Math.round(o.militar));
    o.economia  = Math.max(0, Math.round(o.economia));
    o.reputacao = Math.max(0, Math.round(o.reputacao));
  };
  for(const key of Object.keys(s.clanStats)){ clampOne(s.clanStats[key]); }
}

/* ========================
   Avanço de turno do jogo
   ======================== */
export function nextTurn(){
  if(!state) return;

  state.turno += 1;

  // progresso do jogador
  progressTasks(state);
  processEconomy(state);
  maybeRollEvent(state);

  // IA dos outros clãs
  aiNextTurn(state);

  // Relações (aplica deltas e manutenção)
  relationsNextTurn(state);

  clampAllStats(state);
  saveState();
}
