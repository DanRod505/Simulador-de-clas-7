// js/systems/tasks.js
// Tarefas, validação, alocação e resolução com base em atributos + CLASSES.

import { normRank, rankGte } from '../data/ranks.js';
import { CLASSES, getClassOf, classScoreBonus } from '../data/classes.js';

// ---- emissor de eventos de UI (seguro no browser) ----
function emit(ev){
  if (typeof window !== 'undefined' && window?.dispatchEvent){
    window.dispatchEvent(new CustomEvent(ev));
  }
}

// ===================== Definições das tarefas =====================
export const TASKS = [
  { key:'treino_taijutsu', name:'Treino: Taijutsu',        duration:1, kind:'train',    minRank:'genin'  },
  { key:'treino_ninjutsu', name:'Treino: Ninjutsu',        duration:1, kind:'train',    minRank:'genin'  },
  { key:'patrulha',        name:'Patrulha',                duration:1, kind:'mission',  minRank:'genin'  },
  { key:'comercio',        name:'Comércio Local',          duration:1, kind:'economy',  minRank:'chunin' },
  { key:'diplomacia',      name:'Diplomacia',              duration:1, kind:'rel_up',   minRank:'chunin', requiresTarget:true },
  { key:'espionagem',      name:'Espionagem',              duration:1, kind:'rel_down', minRank:'anbu',   requiresTarget:true },
];

export function getTaskDef(taskKey) {
  return TASKS.find(t => t.key === taskKey);
}

export function listIdleCharacters(state) {
  const busyIds = new Set(state.tasks.map(t => t.characterId));
  return state.personagens.filter(p => !busyIds.has(p.id));
}

export function canCharacterDoTask(state, character, taskKey) {
  const def = getTaskDef(taskKey);
  if (!def) return { ok:false, reason:'Tarefa inválida.' };
  const rankOk = rankGte(character.rank, def.minRank);
  if (!rankOk) return { ok:false, reason:`Requer rank mínimo: ${def.minRank.toUpperCase()}.` };
  return { ok:true };
}

export function assignTask(state, { characterId, taskKey, relTarget }) {
  const def = getTaskDef(taskKey);
  if (!def) throw new Error('Tarefa inválida.');

  const char = state.personagens.find(p => p.id === characterId);
  if (!char) throw new Error('Personagem não encontrado.');

  if (state.tasks.some(t => t.characterId === characterId)) {
    throw new Error('Este personagem já está em uma tarefa.');
  }

  const check = canCharacterDoTask(state, char, taskKey);
  if (!check.ok) throw new Error(check.reason);

  if (def.requiresTarget && !relTarget) {
    throw new Error('Selecione um clã-alvo para esta tarefa.');
  }

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  state.tasks.push({
    id,
    characterId,
    taskKey,
    remaining: Math.max(1, def.duration|0),
    payload: def.requiresTarget ? { relTarget } : undefined
  });

  // 🔔 atualiza UI imediatamente
  emit('state:changed'); 
  emit('ui:refresh');
}

export function cancelTask(state, taskId) {
  const i = state.tasks.findIndex(t => t.id === taskId);
  if (i >= 0) {
    state.tasks.splice(i, 1);
    // 🔔 atualiza UI imediatamente
    emit('state:changed');
    emit('ui:refresh');
  }
}

export function isRelUpTask(taskKey){ return getTaskDef(taskKey)?.kind === 'rel_up'; }
export function isRelDownTask(taskKey){ return getTaskDef(taskKey)?.kind === 'rel_down'; }

// ===================== Resolução com atributos + CLASSES =====================
const RNG = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

function rankBonus(rank){
  const ladder = ['genin','chunin','jounin','anbu','lider','kage'];
  const i = ladder.indexOf(normRank(rank));
  return Math.max(0, i) * 4; // cada degrau ajuda um pouco
}

function effAttr(char){
  // atributos salvos
  const st = char?.stats || {};
  // classe
  const cls = getClassOf(char);
  const m = cls?.attrMods || {};
  // aplica mods virtuais (não altera o save)
  const P  = clamp((st.poder ?? st.power ?? 0)       + (m.poder||0), 0, 24);
  const Dp = clamp((st.diplomacia ?? 0)              + (m.diplomacia||0), 0, 24);
  const E  = clamp((st.estrategia ?? 0)              + (m.estrategia||0), 0, 24);
  return { P, Dp, E, cls };
}

function resolveScore({ baseAttr, diff, rank, cls, taskDef }){
  const base = baseAttr * 5;                   // 0..120 se attr 0..24
  const rb   = rankBonus(rank);                // +0..20
  const luck = RNG(-15, 15);                   // sorte
  const cb   = classScoreBonus(cls, taskDef);  // afinidade da classe
  return base + rb + cb + luck - diff;
}

// Aplica recursos ao clã do jogador
function addRes(state, deltas, clanKey = state.playerClan.key){
  const cs = state.clanStats[clanKey];
  if(!cs) return;
  if(deltas.politica)  cs.politica  = Math.max(0, cs.politica  + deltas.politica);
  if(deltas.militar)   cs.militar   = Math.max(0, cs.militar   + deltas.militar);
  if(deltas.economia)  cs.economia  = Math.max(0, cs.economia  + deltas.economia);
  if(deltas.reputacao) cs.reputacao = Math.max(0, cs.reputacao + deltas.reputacao);
}

// Enfileira ajuste de relação para o próximo turno (relations aplica)
function queueRelEffect(state, targetKey, delta){
  if(!state.relEffects) state.relEffects = [];
  state.relEffects.push({ from: state.playerClan.key, to: targetKey, delta });
}

// ===================== Avanço por turno =====================
export function progressTasks(state){
  if(!state?.tasks || state.tasks.length === 0) return;

  const completed = [];
  for(const t of state.tasks){
    t.remaining = Math.max(0, (t.remaining|0) - 1);
    if(t.remaining === 0) completed.push(t);
  }
  if(completed.length === 0) return;

  for(const t of completed){
    const def = getTaskDef(t.taskKey) || { name:t.taskKey, kind:'misc', key:t.taskKey };
    const ch  = state.personagens.find(p => p.id === t.characterId);
    const who = ch ? ch.name : '???';

    const { P, Dp, E, cls } = effAttr(ch);
    const clsTag = cls ? ` (${cls.emoji} ${cls.name})` : '';

    switch(def.kind){
      case 'economy': {
        const diff = 50;
        const score = resolveScore({ baseAttr: Math.round(E*0.7 + Dp*0.3), diff, rank:ch?.rank, cls, taskDef:def });
        let gain = 0;
        if (score >= 20) gain = 6;
        else if (score >= 0) gain = 4;
        else gain = RNG(-1, 1) >= 0 ? 1 : 0;
        addRes(state, { economia: gain });
        state.log.push({ t:state.turno, kind:'task', text:`${def.name} por ${who}${clsTag}. Resultado: ${score>=20?'excelente':score>=0?'bom':'fraco'} · 💼 +${gain}` });
        break;
      }
      case 'mission': {
        const diff = 48;
        const score = resolveScore({ baseAttr: P, diff, rank:ch?.rank, cls, taskDef:def });
        let gain = 0;
        if (score >= 20) gain = 3;
        else if (score >= 0) gain = 2;
        else gain = (cls?.special?.softenMissionFail ? 1 : 0);
        addRes(state, { militar: gain });
        state.log.push({ t:state.turno, kind:'task', text:`${def.name} por ${who}${clsTag}. Resultado: ${score>=20?'excelente':score>=0?'bom':'fraco'} · 🛡️ +${gain}` });
        break;
      }
      case 'train': {
        if (t.taskKey === 'treino_taijutsu'){
          const bonus = (cls?.trainBonus?.taijutsu || 0);
          ch.stats.poder = clamp((ch.stats.poder ?? ch.stats.power ?? 0) + 1 + bonus, 0, 20);
          state.log.push({ t:state.turno, kind:'task', text:`${def.name} por ${who}${clsTag}. Poder +${1+bonus}` });
        } else {
          const bonus = (cls?.trainBonus?.ninjutsu || 0);
          ch.stats.estrategia = clamp((ch.stats.estrategia || 0) + 1 + bonus, 0, 20);
          state.log.push({ t:state.turno, kind:'task', text:`${def.name} por ${who}${clsTag}. Estratégia +${1+bonus}` });
        }
        break;
      }
      case 'rel_up': {
        const alvo = t?.payload?.relTarget || 'clã-alvo';
        const diff = 55;
        const score = resolveScore({ baseAttr: Math.round(Dp*0.75 + E*0.25), diff, rank:ch?.rank, cls, taskDef:def });
        let delta = 0;
        if (score >= 20) delta = RNG(8, 12);
        else if (score >= 0) delta = RNG(4, 7);
        else delta = RNG(-5, -2);
        queueRelEffect(state, alvo, delta);
        if (score >= 0 && getClassOf(ch).key === 'negociador') {
          ch.stats.diplomacia = clamp((ch.stats.diplomacia||0) + (score>=20? 2 : 1), 0, 20);
        }
        state.log.push({ t:state.turno, kind:'task', text:`Diplomacia por ${who}${clsTag} (alvo: ${alvo}). Δ relação ${delta>=0?'+':''}${delta} no próximo turno.` });
        state.worldLog.push({ t:state.turno, text:`Mensageiros enviados a ${alvo}.` });
        break;
      }
      case 'rel_down': {
        const alvo = t?.payload?.relTarget || 'clã-alvo';
        const diff = 60;
        const score = resolveScore({ baseAttr: E, diff, rank:ch?.rank, cls, taskDef:def });
        let delta = 0;
        if (score >= 20) delta = RNG(-12, -8);
        else if (score >= 0) delta = RNG(-9, -6);
        else delta = RNG(-4, -2);
        queueRelEffect(state, alvo, delta);
        if (score >= 0 && getClassOf(ch).key === 'estrategista') {
          ch.stats.estrategia = clamp((ch.stats.estrategia||0) + (score>=20? 2 : 1), 0, 20);
        }
        state.log.push({ t:state.turno, kind:'task', text:`Espionagem por ${who}${clsTag} (alvo: ${alvo}). Δ relação ${delta} no próximo turno.` });
        state.worldLog.push({ t:state.turno, text:`Atividade suspeita contra ${alvo}.` });
        break;
      }
      default: {
        state.log.push({ t:state.turno, kind:'task', text:`${def.name} concluída por ${who}${clsTag}.` });
      }
    }
  }

  // remove concluidas
  state.tasks = state.tasks.filter(t => t.remaining > 0);

  // 🔔 atualiza UI após resolver
  emit('state:changed');
  emit('ui:refresh');
}

// também exportamos normRank/rankGte (útil na UI)
export { normRank, rankGte };
