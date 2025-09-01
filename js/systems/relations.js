// js/systems/relations.js
// Relações globais entre clãs (matriz por pares), ações do jogador e efeitos por turno.

import { CLANS } from '../data/clans.js';
import { getPlayerKey, spend, changeClanStats } from '../state.js';

const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
const nameOf = (key)=> CLANS.find(x=>x.key===key)?.name || key;
const pkey = (a,b)=> [a,b].sort().join('|');

/* ============================================================
   BASE CANÔNICA DE RELAÇÕES (ajuste livre se quiser)
   Valores aproximados para o "clima" Naruto:
   +50 aliados firmes, +25/+15 afinidade, 0 neutro, negativos = atrito.
   Chave é o par ordenado: "a|b".
   ============================================================ */
const REL_BASE = (() => {
  const m = new Map();

  // Trio Ino–Shika–Chō
  set('+50', 'nara', 'yamanaka');
  set('+50', 'nara', 'akimichi');
  set('+50', 'yamanaka', 'akimichi');

  // Afinidades
  set('+25', 'aburame', 'inuzuka');
  set('+15', 'aburame', 'hyuga');
  set('+10', 'inuzuka', 'hyuga');

  // Uzumaki bem quisto
  set('+15', 'uzumaki', 'hyuga');
  set('+15', 'uzumaki', 'nara');
  set('+10', 'uzumaki', 'yamanaka');
  set('+10', 'uzumaki', 'akimichi');
  set('+10', 'uzumaki', 'aburame');
  set('+10', 'uzumaki', 'inuzuka');

  // Uchiha com leve atrito
  set('-10', 'uchiha', 'hyuga');
  set('-5',  'uchiha', 'nara');
  set('-5',  'uchiha', 'yamanaka');
  set('-5',  'uchiha', 'akimichi');
  set('-5',  'uchiha', 'aburame');
  set('-5',  'uchiha', 'inuzuka');
  set('-3',  'uchiha', 'uzumaki');

  // Laços gerais entre clãs de Konoha
  ['hyuga','nara','yamanaka','akimichi','aburame','inuzuka'].forEach((a,i,arr)=>{
    for(let j=i+1;j<arr.length;j++){
      const b = arr[j];
      if(!m.has(pkey(a,b))) set('+5', a, b);
    }
  });

  function set(v, a, b){ m.set(pkey(a,b), parseInt(v,10)); }
  return m;
})();

export function stanceLabel(score){
  if(score >= 30) return 'aliado';
  if(score <= -30) return 'inimigo';
  return 'neutro';
}

/* =======================
   Inicialização / Migração
   ======================= */
export function initRelations(state){
  // Estrutura nova baseada em pares
  if(!state.relations) state.relations = {};
  const R = state.relations;

  // Migração de saves antigos (scores/deals por "você ↔ eles")
  const me = state.playerClan?.key || getPlayerKey();
  if (R.scores && typeof R.scores === 'object'){
    R.pairs ||= {};
    for(const other of Object.keys(R.scores)){
      if(other === me) continue;
      R.pairs[pkey(me, other)] = clamp(parseInt(R.scores[other] ?? 0, 10), -100, 100);
    }
    delete R.scores;
  }
  if (R.deals && typeof R.deals === 'object'){
    R.dealsPairs ||= {};
    for(const other of Object.keys(R.deals)){
      if(other === me) continue;
      R.dealsPairs[pkey(me, other)] = !!R.deals[other];
    }
    delete R.deals;
  }
  if (Array.isArray(R.pending)){
    R.pendingPairs ||= [];
    for(const old of R.pending){
      if(typeof old?.clanKey === 'string'){
        R.pendingPairs.push({ from: me, to: old.clanKey, delta: old.delta|0, reason: old.reason||'efeito pendente' });
      }
    }
    delete R.pending;
  }

  // Garante campos novos
  R.pairs ||= {};
  R.dealsPairs ||= {};
  R.pendingPairs ||= [];

  // Preenche pares que não existirem com base canônica
  const keys = CLANS.map(c=>c.key);
  for(let i=0;i<keys.length;i++){
    for(let j=i+1;j<keys.length;j++){
      const pk = pkey(keys[i], keys[j]);
      if(typeof R.pairs[pk] !== 'number'){
        R.pairs[pk] = REL_BASE.get(pk) ?? 0;
      }
      if(typeof R.dealsPairs[pk] !== 'boolean'){
        R.dealsPairs[pk] = false;
      }
    }
  }
}

/* ================
   Leitura / Listas
   ================ */
export function getPairScore(state, a, b){
  return (state.relations?.pairs?.[pkey(a,b)] ?? 0)|0;
}
export function setPairScore(state, a, b, value){
  state.relations.pairs[pkey(a,b)] = clamp(value|0, -100, 100);
}
export function dealOf(state, a, b){
  return !!state.relations?.dealsPairs?.[pkey(a,b)];
}
export function setDeal(state, a, b, on){
  state.relations.dealsPairs[pkey(a,b)] = !!on;
}

/** Lista de relações do PONTO DE VISTA do jogador (para UI) */
export function listRelations(state){
  const me = state.playerClan?.key || getPlayerKey();
  const arr = [];
  for(const c of CLANS){
    if(c.key === me) continue;
    const score = getPairScore(state, me, c.key);
    arr.push({
      key: c.key,
      name: c.name,
      score,
      stance: stanceLabel(score),
      deal: dealOf(state, me, c.key),
    });
  }
  arr.sort((a,b)=> a.score - b.score || a.name.localeCompare(b.name));
  return arr;
}

/* =======================
   Mudanças de Relação
   ======================= */
export function changePair(state, a, b, delta, reason=''){
  const pk = pkey(a,b);
  const cur = state.relations.pairs[pk] ?? 0;
  const next = clamp(cur + (delta|0), -100, 100);
  state.relations.pairs[pk] = next;

  if(reason){
    state.worldLog ||= [];
    state.worldLog.push({ t: state.turno, text:`Relações ${nameOf(a)} ⇄ ${nameOf(b)} ${delta>=0?'+':''}${delta} — ${reason}.` });
  }
}

/** Compat: alterar relação "você → outro" (usado pelo restante do jogo/UI) */
export function changeRelation(state, clanKey, delta, reason=''){
  const me = state.playerClan?.key || getPlayerKey();
  return changePair(state, me, clanKey, delta, reason);
}

/* Pendências aplicadas no próximo turno (aceita payload novo ou antigo) */
export function planEffect(state, payload){
  // Novo: { from, to, delta, reason }
  // Antigo: { clanKey, delta, reason }  -> assume from = player
  let from = payload.from, to = payload.to;
  if(!from && payload.clanKey){ from = getPlayerKey(); to = payload.clanKey; }
  if(!from || !to) return;

  state.relations.pendingPairs.push({
    from, to,
    delta: payload.delta|0,
    reason: payload.reason || 'efeito pendente'
  });
}

/* =======================
   Efeitos ao avançar turno
   ======================= */
export function nextTurnHook(state){
  // 1) aplica pendentes
  const pend = state.relations.pendingPairs || [];
  if(pend.length){
    for(const p of pend){ changePair(state, p.from, p.to, p.delta, p.reason); }
    state.relations.pendingPairs = [];
  }

  // 2) acordos comerciais rendem economia para ambos os lados
  for(const pk of Object.keys(state.relations.dealsPairs)){
    if(state.relations.dealsPairs[pk]){
      const [a,b] = pk.split('|');
      changeClanStats(a, { economia:+2 }, 'Acordo Comercial');
      changeClanStats(b, { economia:+2 });
    }
  }

  // 3) leve "decay" para neutro
  for(const pk of Object.keys(state.relations.pairs)){
    const sc = state.relations.pairs[pk];
    if(sc > 0) state.relations.pairs[pk] = Math.max(0, sc - 1);
    else if(sc < 0) state.relations.pairs[pk] = Math.min(0, sc + 1);
  }
}

/* =======================
   AÇÕES DO JOGADOR (com custo)
   ======================= */
export function tryImprove(state, clanKey){
  const me = state.playerClan?.key || getPlayerKey();
  const cost = { politica: 2, economia: 1 };
  if(!spend(cost, `Investimento diplomático (${nameOf(clanKey)})`))
    throw new Error('Recursos insuficientes para melhorar relações.');

  const delta = 3 + Math.floor(Math.random()*4); // +3..+6
  changePair(state, me, clanKey, delta, 'investimento diplomático');
  return delta;
}

export function trySabotage(state, clanKey){
  const me = state.playerClan?.key || getPlayerKey();
  const cost = { economia: 2 };
  if(!spend(cost, `Operação de provocação (${nameOf(clanKey)})`))
    throw new Error('Recursos insuficientes para provocar.');

  const delta = -(2 + Math.floor(Math.random()*4)); // -2..-5
  changePair(state, me, clanKey, delta, 'provocação');
  return delta;
}

export function toggleTradeDeal(state, clanKey){
  const me = state.playerClan?.key || getPlayerKey();
  const pk = pkey(me, clanKey);
  const cur = !!state.relations.dealsPairs[pk];
  if(!cur){
    if(!spend({ politica:1, economia:2 }, `Acordo comercial com ${nameOf(clanKey)}`))
      throw new Error('Recursos insuficientes para firmar acordo.');
    state.relations.dealsPairs[pk] = true;
  }else{
    state.relations.dealsPairs[pk] = false;
  }
}
