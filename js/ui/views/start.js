// js/ui/views/start.js
import { el } from '../dom.js';
import { CLANS } from '../../data/clans.js';
import { newGame } from '../../state.js';
import { play } from '../../systems/sfx.js';

function pill(text){ return el('span',{ className:'badge', textContent:text }); }

export function renderStart(root, rerender){
  const wrap = el('div', { className:'card' });
  const h = el('div', { className:'header' });
  const title = el('div', { className:'title' });
  title.append(el('img',{ src:'./assets/img/clans/uzumaki.png', alt:'' }));
  title.append(el('h1',{ textContent:'Simulador de Clãs — Naruto' }));
  h.append(title);
  wrap.append(h);

  wrap.append(el('p', { className:'small', textContent:'Escolha um clã para começar. Todos os assets estão locais e o jogo roda offline abrindo o index.html.' }));

  const grid = el('div',{ className:'clans' });
  for(const c of CLANS){
    const card = el('div',{ className:'card clan-card' });
    const head = el('div',{ className:'flex' });
    head.append(el('img',{ src:c.icon, alt:c.name }));
    const meta = el('div',{ className:'grow' });
    meta.append(el('h3',{ textContent:c.name }));
    meta.append(el('div',{ className:'small', textContent:c.description }));
    head.append(meta);
    card.append(head);
    card.append(el('hr',{ className:'sep' }));
    const bonuses = el('div',{ className:'chips' });
    bonuses.append(pill(`Política +${c.bonuses.politica}`));
    bonuses.append(pill(`Militar +${c.bonuses.militar}`));
    bonuses.append(pill(`Economia +${c.bonuses.economia}`));
    bonuses.append(pill(`Reputação +${c.bonuses.reputacao}`));
    card.append(bonuses);
    const choose = el('div',{ className:'controls', style:'margin-top:12px' });
    const btn = el('button',{ className:'btn accent', textContent:'Escolher este clã' });
    btn.addEventListener('click', ()=>{
      play('ui:click'); newGame(c.key); rerender();
    });
    choose.append(btn);
    card.append(choose);
    grid.append(card);
  }
  wrap.append(grid);
  root.append(wrap);
}
