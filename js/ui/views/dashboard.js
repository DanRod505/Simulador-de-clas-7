// js/ui/views/dashboard.js
import { el } from '../dom.js';
import { saveState, resetState } from '../../state.js';
import { nextTurn } from '../../state.js';
import { isMuted, setMuted, getVolume, setVolume, play } from '../../systems/sfx.js';
import { isBGMPlaying, toggleBGM, nextBGM, getBGMVolume, setBGMVolume, setBGMMuted } from '../../systems/bgm.js';
import { kpis } from '../widgets/kpis.js';
import { charactersCard } from '../widgets/characters.js';
import { tasksCard } from '../widgets/tasks.js';
import { relationsCard } from '../widgets/relations.js';
import { worldCard } from '../widgets/world.js';
import { showEventIfAny } from '../eventModal.js';

export function renderDashboard(root, s, { rerender, viewKey }){
  // Header
  const head = el('div',{ className:'header page-top' });
  const title = el('div',{ className:'title' });
  title.append(el('img',{ src:s.playerClan.icon }));
  title.append(el('div',{ innerHTML:`<h2 style="margin:0">${s.playerClan.name}</h2><div class="small">Turno ${s.turno}</div>` }));
  head.append(title);

  // Música + SFX + Botões
  const right = el('div',{ className:'controls top-tools' });

  const musicWrap = el('div', { className:'musicwrap' });
  const btnPlay = el('button', { className:'btn', textContent: isBGMPlaying() ? '⏸' : '▶', title: isBGMPlaying() ? 'Pausar música' : 'Tocar música' });
  btnPlay.addEventListener('click', ()=>{ toggleBGM(); btnPlay.textContent = isBGMPlaying() ? '⏸' : '▶'; btnPlay.title = isBGMPlaying() ? 'Pausar música' : 'Tocar música'; });
  const btnNextTrack = el('button', { className:'btn', textContent:'⏭', title:'Próxima faixa' });
  btnNextTrack.addEventListener('click', ()=> nextBGM());
  const musicVol = el('input', { type:'range', min:'0', max:'100', value:String(Math.round(getBGMVolume()*100)), className:'slider' });
  musicVol.addEventListener('input', ()=>{ const v = parseInt(musicVol.value,10)/100; setBGMMuted(false); setBGMVolume(v); });
  musicWrap.append(btnPlay, btnNextTrack, musicVol);
  right.append(musicWrap);

  const volWrap = el('div',{ className:'volwrap' });
  const muteBtn = el('button',{ className:'btn', textContent: isMuted() ? '🔇' : '🔊', title: isMuted() ? 'Desmutar SFX' : 'Mutar SFX' });
  muteBtn.addEventListener('click', ()=>{ setMuted(!isMuted()); if(!isMuted()) play('ui:click'); muteBtn.textContent = isMuted() ? '🔇' : '🔊'; muteBtn.title = isMuted() ? 'Desmutar SFX' : 'Mutar SFX'; });
  const vol = el('input',{ type:'range', min:'0', max:'100', value:String(Math.round(getVolume()*100)), className:'slider' });
  vol.addEventListener('input', ()=>{ const v = parseInt(vol.value,10)/100; setMuted(false); setVolume(v); muteBtn.textContent = isMuted() ? '🔇' : '🔊'; });
  volWrap.append(muteBtn, vol);
  right.append(volWrap);

  const btnNext = el('button',{ className:'btn accent', textContent:'Próximo turno' });
  btnNext.addEventListener('click', ()=>{
    play('ui:click');
    nextTurn();
    rerender();
    showEventIfAny(rerender);
    play('turn:next');
  });
  const btnSave = el('button',{ className:'btn primary', textContent:'Salvar' });
  btnSave.addEventListener('click', ()=>{ play('ui:click'); saveState(); alert('Jogo salvo no navegador.'); });
  const btnNew = el('button',{ className:'btn danger', textContent:'Novo Jogo' });
  btnNew.addEventListener('click', ()=>{ play('ui:click'); if(confirm('Tem certeza que deseja iniciar um novo jogo?')){ resetState(); rerender(); } });
  right.append(btnNext, btnSave, btnNew);
  head.append(right);
  root.append(head);

  // KPIs
  root.append(kpis(s));

  // Abas
  const current = localStorage.getItem(viewKey) || 'geral';
  root.append(segmented(current, (v)=>{ localStorage.setItem(viewKey, v); rerender(); }));

  // Conteúdo
  const grid = el('div',{ className:'grid-12' });
  const add = (node, span)=>{ node.classList.add(`span-${span}`); grid.append(node); };

  if(current === 'geral'){
    add(charactersCard(s), 6);
    add(tasksCard(s, rerender), 6);
    add(relationsCard(s, rerender), 12);
    add(worldCard(s), 12);
  }
  else if(current === 'pessoas'){
    add(charactersCard(s), 6);
    add(tasksCard(s, rerender), 6);
  }
  else if(current === 'relacoes'){
    add(relationsCard(s, rerender), 12);
  }
  else if(current === 'mundo'){
    add(worldCard(s), 12);
  }

  root.append(grid);
  // caso tenha evento pendente disparado externamente
  showEventIfAny(rerender);
}

function segmented(current, onChange){
  const wrap = el('div', { className:'seg' });
  const make = (key, label) => {
    const b = el('button', { className:`seg-btn ${current===key?'active':''}`, textContent:label });
    b.addEventListener('click', ()=> onChange(key));
    return b;
  };
  wrap.append(
    make('geral','Geral'),
    make('pessoas','Personagens & Tarefas'),
    make('relacoes','Relações'),
    make('mundo','Mundo')
  );
  return wrap;
}
