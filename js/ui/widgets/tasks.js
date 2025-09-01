// js/ui/widgets/tasks.js
import { el } from '../dom.js';
import { TASKS, listIdleCharacters, assignTask, cancelTask, canCharacterDoTask } from '../../systems/tasks.js';
import { listRelations } from '../../systems/relations.js';
import { play } from '../../systems/sfx.js';
import { getClassOf, classScoreBonus } from '../../data/classes.js';

const ICONS  = { economia:'💼', militar:'🛡️', politica:'🗳️', reputacao:'⭐' };
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
function hintForTask(tkey){
  switch(tkey){
    case 'comercio':        return { cost: {economia:1}, gain: `${ICONS.economia} +4 ao concluir` };
    case 'patrulha':        return { gain: `${ICONS.militar} +2 ao concluir` };
    case 'treino_taijutsu': return { gain: 'Sem custo; evolui personagem (RP)' };
    case 'treino_ninjutsu': return { gain: 'Sem custo; evolui personagem (RP)' };
    case 'diplomacia':      return { cost: {politica:2, economia:1}, gain: 'Relação alvo: sucesso +6..+10, falha −3..+2 (aplicado no próximo turno)' };
    case 'espionagem':      return { cost: {economia:2}, gain: 'Relação alvo: sucesso −5..−8, falha −8..−12 (aplicado no próximo turno)' };
    default: return {};
  }
}
function buildCostGainText(cost, gain){
  const c = fmtCost(cost);
  if(c && gain) return `Custo: ${c} · ${gain}`;
  if(c) return `Custo: ${c}`;
  return gain || '';
}

export function tasksCard(s, rerender){
  const card = el('div',{ className:'card' });
  const st = el('div',{ className:'section-title' });
  st.append(el('h3',{ textContent:'Tarefas' }));
  card.append(st);

  const form = el('div',{ className:'flex task-form', style:'margin-bottom:8px' });
  const idle = listIdleCharacters(s);

  const selChar = el('select',{});
  for(const c of idle){ selChar.append(el('option',{ value:c.id, textContent:c.name })); }

  const selTask = el('select',{});
  const selTarget = el('select',{ style:'display:none' });
  const pre = el('div',{ className:'small', style:'width:100%; opacity:.9' });

  function rebuildTaskOptions(){
    selTask.replaceChildren();
    const cid = selChar.value;
    const char = s.personagens.find(p => p.id === cid);
    for(const t of TASKS){
      const chk = char ? canCharacterDoTask(s, char, t.key) : { ok:true };
      if (chk.ok){
        selTask.append(el('option',{ value:t.key, textContent:t.name }));
      }else{
        const opt = el('option',{ value:`_${t.key}`, textContent:`${t.name} — ${chk.reason}` });
        opt.disabled = true;
        opt.style.opacity = '0.7';
        selTask.append(opt);
      }
    }
    const firstEnabled = Array.from(selTask.options).find(o => !o.disabled);
    if(firstEnabled) selTask.value = firstEnabled.value;
  }

  function refreshTargets(){
    const tpl = TASKS.find(x => x.key === selTask.value);
    const needsTarget = tpl && (tpl.kind === 'rel_up' || tpl.kind === 'rel_down');
    if (!needsTarget){
      selTarget.style.display = 'none';
      selTarget.replaceChildren();
    }else{
      selTarget.style.display = '';
      selTarget.replaceChildren();
      const rels = listRelations(s);
      if (rels.length === 0){
        selTarget.append(el('option', { value:'', textContent:'(sem clãs disponíveis)' }));
      }else{
        selTarget.append(el('option', { value:'', textContent:'— Escolha o clã-alvo —' }));
        for (const r of rels){
          const label = `${r.name} · ${r.stance.toUpperCase()} ${r.score>=0?'+':''}${r.score}`;
          selTarget.append(el('option', { value:r.key, textContent:label }));
        }
        selTarget.selectedIndex = 0;
      }
    }
  }

  function refreshPreview(){
    const info = hintForTask(selTask.value);
    const cid = selChar.value;
    const char = s.personagens.find(p => p.id === cid);
    const cls = char ? getClassOf(char) : null;
    const tdef = TASKS.find(x => x.key === selTask.value);
    const bonus = (cls && tdef) ? classScoreBonus(cls, tdef) : 0;

    const base = buildCostGainText(info.cost, info.gain) || 'Selecione uma tarefa para ver custos/efeitos.';
    const extra = (bonus>0 && cls) ? ` • Afinidade de classe: ${cls.emoji} ${cls.name} (+${bonus} no resultado)` : '';
    pre.textContent = base + extra;
  }

  selChar.addEventListener('change', ()=>{ rebuildTaskOptions(); refreshTargets(); refreshPreview(); });
  selTask.addEventListener('change', ()=>{ refreshTargets(); refreshPreview(); });

  rebuildTaskOptions();
  refreshTargets();
  refreshPreview();

  const btnAdd = el('button',{ className:'btn success', textContent:'Atribuir' });
  btnAdd.addEventListener('click', ()=>{
    play('ui:click');
    const cid = selChar.value;
    const tkey = selTask.value;
    if (!tkey || tkey.startsWith('_')) { alert('Esta tarefa está bloqueada para o rank selecionado.'); return; }

    const tpl = TASKS.find(x => x.key === tkey);
    const payload = { characterId: cid, taskKey: tkey };
    if (tpl && (tpl.kind === 'rel_up' || tpl.kind === 'rel_down')){
      const tgt = selTarget.value;
      if (!tgt){ alert('Escolha o clã-alvo para esta tarefa.'); return; }
      payload.relTarget = tgt;
    }
    try{ assignTask(s, payload); play('task:assign'); rerender(); }
    catch(err){ alert(err.message); }
  });

  form.append(selChar, selTask, selTarget, btnAdd, pre);
  if(idle.length === 0){ form.append(el('span',{ className:'small', textContent:'Todos os personagens estão ocupados.' })); }
  card.append(form);

  const tlist = el('div',{ className:'list' });
  if(s.tasks.length === 0){
    tlist.append(el('div',{ className:'small', textContent:'Nenhuma tarefa em andamento.' }));
  }else{
    for(const t of s.tasks){
      const row = el('div',{ className:'item' });
      const tpl = TASKS.find(x => x.key === t.taskKey);
      const char = s.personagens.find(c => c.id === t.characterId);
      row.append(el('div',{ className:'grow', innerHTML:
        `<strong>${tpl?.name || t.taskKey}</strong> <span class="small">por ${char?.name || '???'}</span>
         <div class="small">Restam ${t.remaining} turno(s)</div>`
      }));
      const cancel = el('button',{ className:'btn warn', textContent:'Cancelar' });
      cancel.addEventListener('click', ()=>{ play('ui:click'); cancelTask(s, t.id); play('task:cancel'); rerender(); });
      row.append(cancel);
      tlist.append(row);
    }
  }
  card.append(tlist);
  return card;
}
