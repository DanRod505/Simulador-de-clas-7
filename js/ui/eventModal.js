// js/ui/eventModal.js
import { el, showModal } from './dom.js';
import { getState } from '../state.js';
import { play } from '../systems/sfx.js';

export function showEventIfAny(renderCb){
  const s = getState();
  if(!s?.pendingEvent) return;

  const ev = s.pendingEvent;
  play('event:open');

  const box = el('div',{});
  box.append(el('h3',{ textContent:ev.title }));
  box.append(el('p',{ textContent:ev.text }));

  const choices = el('div',{ className:'choices' });
  box.append(choices);

  const modal = showModal(box);
  document.documentElement.classList.add('has-modal');

  function hardClose(){
    document.documentElement.classList.remove('has-modal');
    if (modal && typeof modal.close === 'function') modal.close();
    else {
      const r = document.getElementById('overlay-root');
      if (r) r.innerHTML = '';
    }
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e){ if(e.key === 'Escape') hardClose(); }
  document.addEventListener('keydown', onKey);

  ev.choices.forEach((ch, i)=>{
    const btn = el('button',{ className:'btn primary', textContent:ch.label });
    btn.addEventListener('click', ()=>{
      // applyEventChoice é chamado dentro de showModal no seu fluxo atual (screens antigo).
      // Aqui assumimos que state.applyEventChoice é acionado no clique do botão do modal original.
      // Se for diferente no seu projeto, importe e chame aqui.
      s.applyEventChoice?.(s, i); // fallback opcional
      hardClose();
      renderCb?.();
    });
    choices.append(btn);
  });
}
