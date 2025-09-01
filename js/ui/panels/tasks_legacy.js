// js/ui/panels/tasks_legacy.js
// Painel "antigo" de tarefas, atualizado para o novo sistema (ranks, alvo, custos, classe, etc.)

import { el } from '../dom.js';
import { TASKS, assignTask, cancelTask, canCharacterDoTask } from '../../systems/tasks.js';
import { listRelations } from '../../systems/relations.js';
import { getClassOf, classScoreBonus } from '../../data/classes.js';
import { play } from '../../systems/sfx.js';

const ICONS = { economia:'💼', militar:'🛡️', politica:'🗳️', reputacao:'⭐' };
const MINUS = '−';

function fmtCost(cost){
  if(!cost) return '';
  const order = ['politica','economia','militar','reputacao'];
  const parts = [];
  for(const k of order){
    const v = cost[k]|0; if(v>0) parts.push(`${ICONS[k]} ${MINUS}${v}`);
  }
  return parts.join(', ');
}
function hintForTask(key){
  switch(key){
    case 'comercio':        return { cost:{economia:1}, gain:`${ICONS.economia} +4 ao concluir` };
    case 'patrulha':        return { gain:`${ICONS.militar} +2 ao concluir` };
    case 'treino_taijutsu': return { gain:'Sem custo; evolui personagem (RP)' };
    case 'treino_ninjutsu': return { gain:'Sem custo; evolui personagem (RP)' };
    case 'diplomacia':      return { cost:{politica:2, economia:1}, gain:'Relação: sucesso +6..+10, falha −3..+2' };
    case 'espionagem':      return { cost:{economia:2}, gain:'Relação: sucesso −5..−8, falha −8..−12' };
    default: return {};
  }
}
function buildCostGainText(cost, gain){
  const c = fmtCost(cost);
  if(c && gain) return `Custo: ${c} · ${gain}`;
  if(c) return `Custo: ${c}`;
  return gain || '—';
}

function isBusy(state, charId){
  return state.tasks?.some(t => t.characterId === charId);
}
function activeTasks(state){
  return [...(state.tasks || [])];
}
function charById(state, id){
  return state.personagens.find(p=>p.id===id);
}
function resOf(state, key){
  // mapeia pontuações no topo do HUD
  switch(key){
    case 'politica':   return state.politica|0;
    case 'economia':   return state.economia|0;
    case 'militar':    return state.militar|0;
    case 'reputacao':  return state.reputacao|0;
    default: return 0;
  }
}
function hasResources(state, cost){
  if(!cost) return true;
  for(const [k,v] of Object.entries(cost)){
    if((resOf(state,k)|0) < (v|0)) return false;
  }
  return true;
}
function safeRerender(rerender){
  if (typeof rerender === 'function') rerender();
  else window.dispatchEvent(new CustomEvent('ui:refresh'));
}

export function tasksLegacyPanel(state, rerender){
  const card = el('div', { className:'card' });
  card.append(el('div', { className:'section-title', innerHTML:'<h3 style="margin:0">Tarefas</h3>' }));

  /* ================= LINHA DE ATRIBUIÇÃO ================ */
  const form = el('div', { className:'form tasks-legacy-row' });

  // 1) Personagem (só livres; mostra ocupado em cinza)
  const selChar = el('select', { className:'ui-select' });
  const chars = state.personagens.map(p=>{
    const busy = isBusy(state, p.id);
    const name = `${p.name} (${p.rank})${busy ? ' — OCUPADO' : ''}`;
    const opt  = el('option', { value:p.id, textContent:name });
    if (busy) { opt.disabled = true; opt.style.opacity = '.6'; }
    return opt;
  });
  // seleciona o primeiro livre
  const firstFree = chars.find(o=>!o.disabled) || chars[0];
  if (firstFree) firstFree.selected = true;
  chars.forEach(o=>selChar.append(o));

  // 2) Tarefa (filtra por rank via canCharacterDoTask)
  const selTask = el('select', { className:'ui-select' });

  // 3) Alvo (quando aplicável — relações)
  const selTarget = el('select', { className:'ui-select', style:'display:none' });

  const preview = el('div', { className:'small hint', textContent:'Selecione um personagem e uma tarefa.' });

  const btnAssign = el('button', { className:'btn success', textContent:'Atribuir', disabled:true });

  function currentChar(){
    const id = selChar.value;
    return charById(state, id);
  }

  function rebuildTaskOptions(){
    selTask.replaceChildren();
    const c = currentChar();
    if(!c){
      btnAssign.disabled = true;
      return;
    }
    for (const t of TASKS){
      const chk = canCharacterDoTask(state, c, t.key);
      if (chk.ok){
        selTask.append(el('option', { value:t.key, textContent:t.name }));
      }else{
        const opt = el('option', { value:`_${t.key}`, textContent:`${t.name} — ${chk.reason}` });
        opt.disabled = true; opt.style.opacity = '.6';
        selTask.append(opt);
      }
    }
    const firstEnabled = Array.from(selTask.options).find(o=>!o.disabled);
    if (firstEnabled) selTask.value = firstEnabled.value;
  }

  function refreshTargets(){
    const tdef = TASKS.find(x => x.key === selTask.value);
    const needsTarget = tdef && (tdef.kind === 'rel_up' || tdef.kind === 'rel_down');
    if (!needsTarget){
      selTarget.style.display = 'none';
      selTarget.replaceChildren();
    } else {
      selTarget.style.display = '';
      selTarget.replaceChildren();
      const rels = listRelations(state);
      if (rels.length === 0){
        selTarget.append(el('option', { value:'', textContent:'(sem clãs disponíveis)' }));
      } else {
        selTarget.append(el('option', { value:'', textContent:'— Escolha o clã-alvo —' }));
        for (const r of rels){
          const label = `${r.name} · ${r.stance.toUpperCase()} ${r.score>=0?'+':''}${r.score}`;
          selTarget.append(el('option', { value:r.key, textContent:label }));
        }
      }
    }
  }

  function refreshPreviewAndButton(){
    const c = currentChar();
    const key = selTask.value;
    const tdef = TASKS.find(x => x.key === key);
    const info = hintForTask(key);
    const cls = c ? getClassOf(c) : null;
    const bonus = (cls && tdef) ? classScoreBonus(cls, tdef) : 0;

    const text = buildCostGainText(info.cost, info.gain);
    const extra = (bonus>0) ? ` • Afinidade: ${cls.emoji} ${cls.name} (+${bonus})` : '';
    preview.textContent = text ? `${text}${extra}` : `—${extra ? extra : ''}`;

    // valida recursos e requisitos de alvo
    const hasCost = hasResources(state, info.cost);
    const needsTarget = tdef && (tdef.kind === 'rel_up' || tdef.kind === 'rel_down');
    const targetOk = !needsTarget || !!selTarget.value;
    const taskEnabled = key && !key.startsWith('_');
    btnAssign.disabled = !(c && taskEnabled && hasCost && targetOk);
  }

  selChar.addEventListener('change', ()=>{ rebuildTaskOptions(); refreshTargets(); refreshPreviewAndButton(); });
  selTask.addEventListener('change', ()=>{ refreshTargets(); refreshPreviewAndButton(); });
  selTarget.addEventListener('change', ()=>{ refreshPreviewAndButton(); });

  rebuildTaskOptions(); refreshTargets(); refreshPreviewAndButton();

  form.append(
    labelWrap('Personagem', selChar),
    labelWrap('Tarefa', selTask),
    labelWrap('Alvo (quando aplicável)', selTarget),
    fullRow(preview),
    alignEnd(btnAssign)
  );

  btnAssign.addEventListener('click', ()=>{
    const charId = selChar.value;
    const key = selTask.value;
    if (!charId || !key || key.startsWith('_')) return;

    const tdef = TASKS.find(x => x.key === key);
    const payload = { characterId: charId, taskKey: key };
    if (tdef && (tdef.kind === 'rel_up' || tdef.kind === 'rel_down')){
      const tgt = selTarget.value;
      if (!tgt){ alert('Escolha o clã-alvo para esta tarefa.'); return; }
      payload.relTarget = tgt;
    }
    try{
      play('task:assign');
      assignTask(state, payload);
    }catch(err){
      alert(err.message);
      return;
    }
    // ok
    safeRerender(rerender);
  });

  card.append(form);

  /* ================= LISTA DE TAREFAS ATIVAS ================ */
  const listBox = el('div', { className:'active-tasks box' });
  listBox.append(el('div', { className:'title smallcaps', textContent:'Tarefas ativas' }));

  function renderActive(){
    listBox.querySelector('.items')?.remove();
    const wrap = el('div', { className:'items' });
    const items = activeTasks(state);
    if(items.length === 0){
      wrap.append(el('div', { className:'small', textContent:'Nenhuma tarefa em andamento.' }));
    }else{
      for (const t of items){
        const c = charById(state, t.characterId);
        const def = TASKS.find(x => x.key === t.taskKey);
        const row = el('div', { className:'task-row' });
        row.append(
          el('div', { className:'tr-col name', innerHTML: `<strong>${c?.name || t.characterId}</strong> · ${def?.name || t.taskKey}` }),
          el('div', { className:'tr-col small', textContent: `Restam ${t.remaining} turno(s)` }),
        );
        const btn = el('button', { className:'btn warn sm', textContent:'Cancelar' });
        btn.addEventListener('click', ()=>{
          try{
            cancelTask(state, t.id);
          }catch(err){
            alert(err.message);
            return;
          }
          safeRerender(rerender);
        });
        row.append(btn);
        wrap.append(row);
      }
    }
    listBox.append(wrap);
  }
  renderActive();
  card.append(listBox);

  return card;
}

/* ===== helpers visuais ===== */
function labelWrap(label, node){
  const w = el('label', { className:'field' });
  w.append(el('div', { className:'lbl smallcaps', textContent:label }));
  w.append(node);
  return w;
}
function fullRow(node){
  const w = el('div', { className:'fullrow' });
  w.append(node);
  return w;
}
function alignEnd(node){
  const w = el('div', { className:'actions end' });
  w.append(node);
  return w;
}
