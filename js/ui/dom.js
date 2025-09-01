
// Small DOM helpers
export const qs = (sel, el=document) => el.querySelector(sel);
export const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));
export const el = (tag, props={}) => Object.assign(document.createElement(tag), props);
export const clear = (node) => { while(node.firstChild) node.removeChild(node.firstChild); };
export const on = (node, ev, fn) => node.addEventListener(ev, fn);

// Number formatting
export const nfmt = (n) => Math.round(n).toLocaleString('pt-BR');

// Overlay
export function showModal(inner){
  const root = qs('#overlay-root');
  const wrap = el('div',{ className:'modal', role:'dialog', 'aria-modal':'true' });
  const dialog = el('div',{ className:'dialog' });
  dialog.append(inner);
  wrap.append(dialog);
  root.append(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', (e)=>{ if(e.target === wrap) close(); });
  return { close, root: wrap, dialog };
}
