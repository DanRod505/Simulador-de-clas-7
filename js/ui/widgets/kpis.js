// js/ui/widgets/kpis.js
import { el, nfmt } from '../dom.js';

export function kpis(s){
  const ICONS  = { economia:'💼', militar:'🛡️', politica:'🗳️', reputacao:'⭐' };
  const container = el('div');
  const kpis = el('div',{ className:'kpis wide' });

  const makeKpi = (label, value, icon) => {
    const box = el('div',{ className:'kpi' });
    const labelEl = el('div',{ className:'label' });
    labelEl.append(el('span',{ textContent:`${icon} ${label}` }));
    box.append(labelEl);
    box.append(el('div',{ className:'value', textContent:nfmt(value) }));
    return box;
  };

  kpis.append(
    makeKpi('Política', s.recursos.politica,   ICONS.politica),
    makeKpi('Militar',  s.recursos.militar,    ICONS.militar),
    makeKpi('Economia (fundos)', s.recursos.economia, ICONS.economia),
    makeKpi('Reputação', s.recursos.reputacao, ICONS.reputacao),
  );

  const legend = el('div',{ className:'small', style:'opacity:.85;margin-top:6px' });
  legend.textContent = `${ICONS.politica} Política  •  ${ICONS.militar} Militar  •  ${ICONS.economia} Economia  •  ${ICONS.reputacao} Reputação`;

  container.append(kpis, legend);
  return container;
}
