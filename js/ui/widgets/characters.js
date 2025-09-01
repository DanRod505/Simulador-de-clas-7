// js/ui/widgets/characters.js
// Cards 1:1; clique abre modal com Detalhes (atributos, classe, bônus) + atribuição de tarefa.

import { el } from '../dom.js';
import { TASKS, assignTask, cancelTask, canCharacterDoTask } from '../../systems/tasks.js';
import { listRelations } from '../../systems/relations.js';
import { getClassOf, classScoreBonus } from '../../data/classes.js';
import { play } from '../../systems/sfx.js';

// ---------------- icons/custos preview
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
    case 'comercio':        return { cost:{economia:1}, gain:`${ICONS.economia} +4 ao concluir` };
    case 'patrulha':        return { gain:`${ICONS.militar} +2 ao concluir` };
    case 'treino_taijutsu': return { gain:'Sem custo; evolui personagem (RP)' };
    case 'treino_ninjutsu': return { gain:'Sem custo; evolui personagem (RP)' };
    case 'diplomacia':      return { cost:{politica:2, economia:1}, gain:'Relação: sucesso +6..+10, falha −3..+2 (aplicado no próximo turno)' };
    case 'espionagem':      return { cost:{economia:2}, gain:'Relação: sucesso −5..−8, falha −8..−12 (aplicado no próximo turno)' };
    default: return {};
  }
}
function buildCostGainText(cost, gain){
  const c = fmtCost(cost);
  if(c && gain) return `Custo: ${c} · ${gain}`;
  if(c) return `Custo: ${c}`;
  return gain || '—';
}

// ---------------- util
function activeTaskOf(state, charId){ return state.tasks.find(t => t.characterId === charId) || null; }
function charImg(char){ return char.img || `./assets/img/chars/${char.id}.png`; }
function safeRerender(rerender){ if (typeof rerender === 'function') rerender(); else window.dispatchEvent(new CustomEvent('ui:refresh')); }
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------- componente (grade de cards)
export function charactersCard(s, rerender){
  const card = el('div',{ className:'card' });
  card.append(el('div',{ className:'section-title', innerHTML:'<h3 style="margin:0">Personagens</h3>' }));

  const grid = el('div',{ className:'char-grid' });

  for(const c of s.personagens){
    const busyTask = activeTaskOf(s, c.id);
    const cls = getClassOf(c);
    const P  = (c.stats && (c.stats.poder ?? c.stats.power)) ?? 0;
    const Dp = (c.stats && c.stats.diplomacia) ?? 0;
    const E  = (c.stats && c.stats.estrategia) ?? 0;

    const cardEl = el('button', { className:`char-card ${busyTask?'busy':''}`, type:'button' });

    const thumb = el('div', { className:'thumb' });
    thumb.append(el('img', { src: charImg(c), alt: c.name, loading:'lazy' }));
    if (busyTask) thumb.append(el('div', { className:'ribbon', textContent:'OCUPADO' }));
    cardEl.append(thumb);

    const meta = el('div', { className:'meta' });
    meta.append(el('div', { className:'line1', innerHTML:
      `<strong class="name">${c.name}</strong><span class="rank"> (${c.rank})</span>`
    }));
    meta.append(el('div', { className:'line2 small', textContent:
      `Classe: ${cls.emoji} ${cls.name} • Foco: ${c.focus || '—'}`
    }));
    meta.append(el('div', { className:'line3 small mono', textContent:
      `P:${P}  Dp:${Dp}  E:${E}`
    }));
    cardEl.append(meta);

    cardEl.addEventListener('click', ()=>{
      play('ui:click');
      openAssignModal(s, c, busyTask, rerender);
    });

    grid.append(cardEl);
  }

  card.append(grid);
  return card;
}

// ---------------- modal (detalhes + atribuição)
function openAssignModal(state, char, busyTask, rerender){
  const cls = getClassOf(char);
  const Pbase  = (char.stats && (char.stats.poder ?? char.stats.power)) ?? 0;
  const Dbase  = (char.stats && char.stats.diplomacia) ?? 0;
  const Ebase  = (char.stats && char.stats.estrategia) ?? 0;

  const mods = cls?.attrMods || {};
  const Peff = clamp(Pbase + (mods.poder||0), 0, 24);
  const Deff = clamp(Dbase + (mods.diplomacia||0), 0, 24);
  const Eeff = clamp(Ebase + (mods.estrategia||0), 0, 24);

  const ov = document.createElement('div'); ov.className = 'overlay is-open'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  const panel = document.createElement('div'); panel.className = 'modal-panel'; ov.appendChild(panel);

  // ===== Header com mini-card
  const header = el('div', { className:'assign-header' });
  const mini = el('div', { className:'mini-card' });
  const t = el('div', { className:'thumb' }); t.append(el('img', { src: charImg(char), alt: char.name })); mini.append(t);
  const m = el('div', { className:'meta' });
  m.append(el('div', { innerHTML: `<strong>${char.name}</strong> <span class="small">(${char.rank})</span>` }));
  m.append(el('div', { className:'small', textContent: `Classe: ${cls.emoji} ${cls.name} • Foco: ${char.focus || '—'}` }));
  header.append(mini, el('div',{className:'grow'}));
  panel.append(header);

  // ===== Detalhes do personagem
  panel.append(el('div',{ className:'title smallcaps', textContent:'Detalhes do Personagem' }));

  const details = el('div', { className:'details-grid' });

  // Coluna A: atributos com barras + base/mod/efetivo
  const boxStats = el('div', { className:'box' });
  boxStats.append(el('div', { className:'subtitle', textContent:'Atributos' }));
  boxStats.append(statRow('Poder', Peff, Pbase, mods.poder||0));
  boxStats.append(statRow('Diplomacia', Deff, Dbase, mods.diplomacia||0));
  boxStats.append(statRow('Estratégia', Eeff, Ebase, mods.estrategia||0));
  details.append(boxStats);

  // Coluna B: classe — afinidades/treinos/especiais
  const boxClass = el('div', { className:'box' });
  boxClass.append(el('div', { className:'subtitle', textContent:`Classe: ${cls.emoji} ${cls.name}` }));

  const chips = el('div',{ className:'chips' });
  chips.append(chip(`Rank: ${char.rank}`,'pri'));
  if (char.focus) chips.append(chip(`Foco: ${char.focus}`));
  chips.append(chip(`Afinidade: +${classScoreBonus(cls, {key:'patrulha', kind:'mission'})} missões`,'muted'));
  details.appendChild(boxClass);
  boxClass.append(chips);

  const modsList = el('ul',{ className:'list compact' });
  if (mods.poder)       modsList.append(li(`Bônus de Poder: ${mods.poder>0?'+':''}${mods.poder}`));
  if (mods.diplomacia)  modsList.append(li(`Bônus de Diplomacia: ${mods.diplomacia>0?'+':''}${mods.diplomacia}`));
  if (mods.estrategia)  modsList.append(li(`Bônus de Estratégia: ${mods.estrategia>0?'+':''}${mods.estrategia}`));
  const tb = cls?.trainBonus || {};
  if (tb.taijutsu)  modsList.append(li(`Treino Taijutsu: +${tb.taijutsu} ganho`));
  if (tb.ninjutsu)  modsList.append(li(`Treino Ninjutsu: +${tb.ninjutsu} ganho`));
  const sp = cls?.special || {};
  for (const [k,v] of Object.entries(sp)){
    if (v) modsList.append(li(`${k === 'softenMissionFail' ? 'Falha em Missão suavizada' : k}`));
  }
  if (!modsList.childElementCount) modsList.append(li('—'));
  boxClass.append(modsList);

  panel.append(details);

  // ===== Tarefa ativa (se houver)
  if (busyTask){
    const activeBox = el('div', { className:'box' });
    const tdef = TASKS.find(x => x.key === busyTask.taskKey);
    activeBox.append(el('div', { className:'title smallcaps', textContent:'Tarefa em andamento' }));
    activeBox.append(el('p', { innerHTML:
      `<strong>${tdef?.name || busyTask.taskKey}</strong> · Restam <b>${busyTask.remaining}</b> turno(s)`
    }));
    const btnCancel = el('button', { className:'btn warn', textContent:'Cancelar tarefa' });
    btnCancel.addEventListener('click', ()=>{
      play('ui:click');
      try{ cancelTask(state, busyTask.id); }catch(err){ alert(err.message); return; }
      close(); safeRerender(rerender);
    });
    activeBox.append(btnCancel);
    panel.append(activeBox);
  }

  // ===== Atribuir nova tarefa
  panel.append(el('div', { className:'title smallcaps', textContent:'Atribuir tarefa' }));
  const form = el('div', { className:'form grid2' });
  const selTask = el('select', { className:'ui-select' });
  const selTarget = el('select', { className:'ui-select', style:'display:none' });
  const preview = el('div', { className:'small hint', textContent:'Selecione uma tarefa para ver custos/efeitos.' });

  function rebuildTaskOptions(){
    selTask.replaceChildren();
    for (const t of TASKS){
      const chk = canCharacterDoTask(state, char, t.key);
      if (chk.ok) selTask.append(el('option',{ value:t.key, textContent:t.name }));
      else {
        const opt = el('option',{ value:`_${t.key}`, textContent:`${t.name} — ${chk.reason}` });
        opt.disabled = true; opt.style.opacity = '0.7';
        selTask.append(opt);
      }
    }
    const firstEnabled = Array.from(selTask.options).find(o => !o.disabled);
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
      if (rels.length === 0) selTarget.append(el('option',{ value:'', textContent:'(sem clãs disponíveis)' }));
      else {
        selTarget.append(el('option',{ value:'', textContent:'— Escolha o clã-alvo —' }));
        for (const r of rels){
          selTarget.append(el('option',{ value:r.key, textContent:`${r.name} · ${r.stance.toUpperCase()} ${r.score>=0?'+':''}${r.score}` }));
        }
      }
    }
  }
  function refreshPreview(){
    const info = hintForTask(selTask.value);
    const tdef = TASKS.find(x => x.key === selTask.value);
    const bonus = tdef ? classScoreBonus(cls, tdef) : 0;
    const base = buildCostGainText(info.cost, info.gain) || '—';
    const extra = (bonus>0) ? ` • Afinidade: ${cls.emoji} ${cls.name} (+${bonus})` : '';
    preview.textContent = `${base}${extra}`;
  }

  rebuildTaskOptions(); refreshTargets(); refreshPreview();
  selTask.addEventListener('change', ()=>{ refreshTargets(); refreshPreview(); });

  form.append(label('Tarefa', selTask), label('Alvo (quando aplicável)', selTarget), full(preview));
  panel.append(form);

  // ===== Ações
  const actions = el('div', { className:'actions' });
  const btnAssign = el('button', { className:'btn success', textContent:'Atribuir' });
  btnAssign.addEventListener('click', ()=>{
    const key = selTask.value;
    if (!key || key.startsWith('_')){ alert('Esta tarefa está bloqueada para o rank selecionado.'); return; }
    const tdef = TASKS.find(x => x.key === key);
    const payload = { characterId: char.id, taskKey: key };
    if (tdef && (tdef.kind === 'rel_up' || tdef.kind === 'rel_down')){
      const tgt = selTarget.value;
      if (!tgt){ alert('Escolha o clã-alvo para esta tarefa.'); return; }
      payload.relTarget = tgt;
    }
    try{ play('task:assign'); assignTask(state, payload); }
    catch(err){ alert(err.message); return; }
    close(); safeRerender(rerender);
  });
  const btnClose = el('button', { className:'btn', textContent:'Fechar' });
  btnClose.addEventListener('click', close);
  actions.append(btnAssign, btnClose);
  panel.append(actions);

  // monta overlay
  document.body.appendChild(ov);
  document.documentElement.classList.add('has-modal');
  function onKey(e){ if(e.key === 'Escape') close(); } document.addEventListener('keydown', onKey);
  function onClickOutside(e){ if(e.target === ov) close(); } ov.addEventListener('click', onClickOutside);
  function close(){ document.removeEventListener('keydown', onKey); ov.removeEventListener('click', onClickOutside); ov.remove(); document.documentElement.classList.remove('has-modal'); }
}

// --------------- helpers UI
function label(txt,node){ const w = el('label',{className:'field'}); w.append(el('div',{className:'lbl smallcaps',textContent:txt}),node); return w; }
function full(node){ const w = el('div',{className:'fullrow'}); w.append(node); return w; }
function chip(text, cls=''){ return el('span',{ className:`chip ${cls}`, textContent:text }); }
function li(text){ return el('li',{ textContent:text }); }

// barra/linha de atributo (efetivo com base/mod)
function statRow(label, eff, base, mod){
  const row = el('div', { className:'stat-row' });
  row.append(el('div', { className:'s-lbl', textContent:label }));
  const bar = el('div', { className:'bar' });
  bar.append(el('div', { className:'fill', style:`width:${Math.round((eff/24)*100)}%` }));
  row.append(bar);
  const legend = el('div', { className:'s-legend mono' });
  const delta = mod||0;
  const sign = delta>0?'+':''; 
  legend.textContent = `Base ${base}  ${delta?`(${sign}${delta})`:' '}  ⇒  ${eff}`;
  row.append(legend);
  return row;
}
