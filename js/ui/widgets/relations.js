// js/ui/widgets/relations.js
import { el } from '../dom.js';
import { CLANS } from '../../data/clans.js';
import { listRelations, tryImprove, trySabotage, toggleTradeDeal } from '../../systems/relations.js';

function hasLeaderIdle(s){
  const busy = new Set(s.tasks.map(t=>t.characterId));
  return s.personagens.some(p=>{
    const r = (p.rank || '').toString().toLowerCase();
    const isLeader = r.includes('lider') || r.includes('líder') || r.includes('kage');
    return isLeader && !busy.has(p.id);
  });
}

export function relationsCard(s, rerender){
  const card = el('div', { className:'card rel-card' });
  card.append(el('div',{ className:'section-title', innerHTML:'<h3 style="margin:0">Relações</h3>' }));

  card.append(el('div',{ className:'section-title', innerHTML:'<h3 style="margin:0">Comparativo de Pontuações</h3>' }));
  card.append(buildStatsTable(s));

  card.append(el('div',{ className:'section-title', innerHTML:'<h3 style="margin:0">Rankings</h3>' }));
  card.append(buildRankingsGrid(s));

  const st = el('div',{ className:'section-title', style:'margin-top:6px' });
  st.append(el('h3',{ textContent:'Diplomacia e Ações' }));
  card.append(st);

  const leaderFree = hasLeaderIdle(s);

  const lst = el('div',{ className:'list' });
  for (const r of listRelations(s)){
    const row = el('div',{ className:'item rel-row' });

    const left = el('div',{ className:'grow' });
    left.append(el('div',{ innerHTML: `<strong>${r.name}</strong> <span class="stance ${r.stance}">${r.stance.toUpperCase()} ${r.score>=0?'+':''}${r.score}</span>` }));

    const meter = el('div',{ className:'meter' });
    const fill  = el('i');
    const pct = Math.round((r.score + 100) / 2);
    fill.style.width = pct + '%';
    meter.append(fill);
    left.append(meter);
    row.append(left);

    const btnPlus = el('button',{ className:'btn small', textContent:'Melhorar' });
    btnPlus.title = `Custo: 🗳️ −2, 💼 −1 · Efeito: +3..+6 relação`;
    btnPlus.addEventListener('click', ()=>{ try{ tryImprove(s, r.key); rerender(); }catch(e){ alert(e.message); } });

    const btnMinus = el('button',{ className:'btn small', textContent:'Provocar' });
    btnMinus.title = `Custo: 💼 −2 · Efeito: −2..−5 relação`;
    btnMinus.addEventListener('click', ()=>{ try{ trySabotage(s, r.key); rerender(); }catch(e){ alert(e.message); } });

    const trade = el('button',{
      className:'btn small',
      textContent: r.deal ? 'Encerrar acordo' : 'Acordo comercial',
      disabled: !leaderFree && !r.deal,
      title: r.deal
        ? 'Bônus em vigor: 💼 +2/turno para ambos. Clique para encerrar.'
        : leaderFree
          ? 'Custo: 🗳️ −1, 💼 −2 · Benefício: 💼 +2/turno para ambos (requer líder livre).'
          : 'Requer um LÍDER/Kage livre (sem tarefa) para iniciar.',
    });
    trade.addEventListener('click', ()=>{
      try{
        if (!r.deal && !hasLeaderIdle(s)) { alert('É necessário um líder do clã (ou Kage) livre para firmar acordos.'); return; }
        toggleTradeDeal(s, r.key); rerender();
      }catch(e){ alert(e.message); }
    });

    const hint = el('div',{ className:'small', style:'opacity:.85' });
    hint.textContent = r.deal
      ? `Melhorar: 🗳️ −2, 💼 −1 / +3..+6 • Provocar: 💼 −2 / −2..−5 • Acordo: 💼 +2/turno (ativo)`
      : `Melhorar: 🗳️ −2, 💼 −1 / +3..+6 • Provocar: 💼 −2 / −2..−5 • Acordo: iniciar 🗳️ −1, 💼 −2 → 💼 +2/turno`;

    row.append(btnPlus, btnMinus, trade);
    left.append(hint);
    lst.append(row);
  }
  if (lst.children.length === 0){
    lst.append(el('div',{ className:'small', textContent:'Nenhum clã disponível.' }));
  }
  card.append(lst);
  return card;
}

/* -------- Tabela comparativa -------- */
function buildStatsTable(s){
  const myKey = s.playerClan.key;
  const stats = CLANS.map(c=>{
    const cs = s.clanStats[c.key] || {politica:0, militar:0, economia:0, reputacao:0};
    const total = (cs.politica|0)+(cs.militar|0)+(cs.economia|0)+(cs.reputacao|0);
    return { key:c.key, name:c.name, icon:c.icon, ...cs, total, me:c.key===myKey };
  });

  const container = el('div', { className:'list' });

  const gridStyle = 'display:grid;grid-template-columns:2.4fr repeat(5,1fr);gap:8px;align-items:center;';
  const head = el('div', { className:'item', style:gridStyle });
  ['Clã','Política','Militar','Economia','Reputação','Total'].forEach((t,i)=>{
    head.append(el('div',{ className:'small', style:`${i? 'text-align:right;':''} opacity:.9`, textContent:t }));
  });
  container.append(head);

  for(const r of stats){
    const row = el('div', { className:'item', style:`${gridStyle} ${r.me?'background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.18);':''}` });

    const nameCell = el('div', { style:'display:flex;align-items:center;gap:8px;min-width:0' });
    nameCell.append(el('img', { src: r.icon, alt: r.name, style: 'width:18px;height:18px;border-radius:6px;object-fit:contain;opacity:.95;flex:0 0 18px;' }));
    const nameWrap = el('div', { style:'display:flex;align-items:center;gap:8px;min-width:0' });
    nameWrap.append(el('strong', { textContent: r.name }));
    if(r.me) nameWrap.append(el('span',{ className:'badge', textContent:'Você' }));
    nameCell.append(nameWrap);

    const pol = el('div', { style:'text-align:right', textContent:String(r.politica) });
    const mil = el('div', { style:'text-align:right', textContent:String(r.militar) });
    const eco = el('div', { style:'text-align:right', textContent:String(r.economia) });
    const rep = el('div', { style:'text-align:right', textContent:String(r.reputacao) });
    const tot = el('div', { style:'text-align:right;font-weight:700', textContent:String(r.total) });

    row.append(nameCell, pol, mil, eco, rep, tot);
    container.append(row);
  }
  return container;
}

/* -------- Rankings -------- */
function buildRankingsGrid(s){
  const myKey = s.playerClan.key;
  const base = CLANS.map(c=>{
    const cs = s.clanStats[c.key] || {politica:0, militar:0, economia:0, reputacao:0};
    const total = (cs.politica|0)+(cs.militar|0)+(cs.economia|0)+(cs.reputacao|0);
    return { key:c.key, name:c.name, icon:c.icon, ...cs, total };
  });

  const rankBy = (k)=> [...base].sort((a,b)=> (b[k]|0)-(a[k]|0) || a.name.localeCompare(b.name));
  const cols = [
    { key:'politica',  label:'Política'  },
    { key:'militar',   label:'Militar'   },
    { key:'economia',  label:'Economia'  },
    { key:'reputacao', label:'Reputação' },
    { key:'total',     label:'Geral'     },
  ];

  const grid = el('div',{ style:'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;' });

  for(const col of cols){
    const wrap = el('div',{ className:'item', style:'display:flex;flex-direction:column;gap:8px;' });
    wrap.append(el('div',{ className:'small', textContent:col.label }));

    const list = el('div',{ className:'list' });
    const arr = rankBy(col.key);
    arr.forEach((r,i)=>{
      const row = el('div',{ className:'item', style:`display:flex;gap:8px;align-items:center;${r.key===myKey?'background:rgba(255,255,255,.04);':''}` });
      row.append(el('span',{ className:'badge', textContent:'#'+(i+1) }));

      const name = el('div',{ className:'grow', style:'display:flex;align-items:center;gap:8px;min-width:0' });
      name.append(el('img', { src:r.icon, alt:r.name, style:'width:18px;height:18px;border-radius:6px;object-fit:contain;opacity:.95;flex:0 0 18px;' }));
      name.append(el('strong',{ textContent:r.name }));
      row.append(name);

      row.append(el('div',{ style:'text-align:right;font-variant-numeric:tabular-nums', textContent:String(r[col.key]) }));
      list.append(row);
    });
    wrap.append(list);
    grid.append(wrap);
  }
  return grid;
}
