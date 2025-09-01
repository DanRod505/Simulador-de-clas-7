// js/systems/ai.js
// IA de clãs: agora considera relações GLOBAIS (NPC↔NPC e NPC↔Jogador)

import { CLANS } from '../data/clans.js';
import { changePair, getPairScore, dealOf, setDeal } from './relations.js';
import { changeClanStats, getPlayerKey } from '../state.js';

const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

function logWorld(state, text){
  state.worldLog ||= [];
  state.worldLog.push({ t: state.turno, text });
}

/** retorna melhor aliado (maior score) e pior inimigo (menor score) de A */
function topAllyEnemy(state, aKey){
  const others = CLANS.map(c=>c.key).filter(k=>k!==aKey);
  let best = null, worst = null;
  for(const bKey of others){
    const s = getPairScore(state, aKey, bKey);
    if(best === null || s > best.score) best = { key:bKey, score:s };
    if(worst === null || s < worst.score) worst = { key:bKey, score:s };
  }
  return { ally: best, enemy: worst };
}

export function aiNextTurn(state){
  if(!state) return;
  const player = getPlayerKey();

  for(const actor of CLANS){
    const A = actor.key;
    if(!A) continue;

    // Pequena chance de "ficar interno" e não agir
    if(Math.random() < 0.10){
      changeClanStats(A, { economia:+1, politica:+1 });
      logWorld(state, `${actor.name} focou em assuntos internos.`);
      continue;
    }

    const { ally, enemy } = topAllyEnemy(state, A);

    // Decide alvo e tipo pela atitude
    const roll = Math.random();
    if(enemy && enemy.score <= -30 && roll < 0.55){
      // Hostilidade contra inimigo
      const target = enemy.key;
      const action = Math.random();

      if(action < 0.45){
        // Espionagem/Incursão
        const d = -rand(4,8);
        changePair(state, A, target, d, 'ato hostil (IA)');
        changeClanStats(A, { economia:-1 });
        changeClanStats(target, { reputacao:-1 });
        logWorld(state, `${actor.name} realizou operação encoberta contra ${nameOf(target)}. Relações ${d}.`);
      }else if(action < 0.80){
        // Escaramuça
        const loss = rand(1,3);
        changeClanStats(A, { militar:-1 });
        changeClanStats(target, { militar:-loss });
        changePair(state, A, target, -rand(1,3), 'escaramuça (IA)');
        logWorld(state, `Escaramuça entre ${actor.name} e ${nameOf(target)}. ${nameOf(target)} -${loss} Militar.`);
      }else{
        // Propaganda hostil
        const d = -rand(1,3);
        changePair(state, A, target, d, 'propaganda hostil (IA)');
        changeClanStats(A, { politica:+1 });
        logWorld(state, `${actor.name} intensificou propaganda contra ${nameOf(target)}. Relações ${d}.`);
      }

    }else if(ally && ally.score >= 30 && roll < 0.80){
      // Cooperação com aliado
      const target = ally.key;
      const action = Math.random();

      if(action < 0.45){
        // Suprimentos
        const econ = rand(2,5);
        changeClanStats(target, { economia:+econ }, `Suprimentos de ${actor.name}`);
        changeClanStats(A, { economia:-1 });
        changePair(state, A, target, +rand(1,3), 'gesto aliado (IA)');
        logWorld(state, `${actor.name} enviou suprimentos a ${nameOf(target)}. +${econ} Economia.`);
      }else if(action < 0.70){
        // Treino conjunto
        const mil = rand(1,3);
        changeClanStats(A, { militar:+1 });
        changeClanStats(target, { militar:+mil }, `Treino com ${actor.name}`);
        logWorld(state, `${actor.name} treinou com ${nameOf(target)}. ${nameOf(target)} +${mil} Militar.`);
      }else{
        // Acordo comercial
        if(!dealOf(state, A, target)){
          setDeal(state, A, target, true);
          logWorld(state, `${actor.name} firmou acordo comercial com ${nameOf(target)}.`);
        }else{
          logWorld(state, `${actor.name} manteve seu acordo com ${nameOf(target)}.`);
        }
      }

    }else{
      // Neutro: pequenas oscilações ou aproximação/afastamento leve
      const candidates = CLANS.map(c=>c.key).filter(k=>k!==A);
      const target = candidates[Math.floor(Math.random()*candidates.length)];
      if(!target) continue;

      if(Math.random() < 0.5){
        const d = rand(1,3);
        changePair(state, A, target, d, 'gesto diplomático leve (IA)');
        logWorld(state, `${actor.name} enviou mensageiros a ${nameOf(target)}. Relações +${d}.`);
      }else{
        const d = -rand(1,3);
        changePair(state, A, target, d, 'incidente menor (IA)');
        logWorld(state, `Incidente menor entre ${actor.name} e ${nameOf(target)}. Relações ${d}.`);
      }
    }
  }
}

function nameOf(key){
  return CLANS.find(x=>x.key===key)?.name || key;
}
