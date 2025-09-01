// js/ui/widgets/world.js
import { el } from '../dom.js';

export function worldCard(s){
  const wCard = el('div',{ className:'card' });
  wCard.append(el('div',{ className:'section-title', innerHTML:'<h3 style="margin:0">Diário do Mundo</h3>' }));
  const wlog = el('div',{ className:'log' });
  const entries = (s.worldLog || []).slice(-24);
  if(entries.length === 0){
    wlog.append(el('div',{ className:'small', textContent:'Sem registros do mundo por enquanto.' }));
  }else{
    for(const e of entries){
      wlog.append(el('p',{ className:'small', textContent:`[T${e.t}] ${e.text}` }));
    }
  }
  wCard.append(wlog);
  return wCard;
}
