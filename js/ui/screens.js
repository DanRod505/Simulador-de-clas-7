// js/ui/screens.js
import { qs, clear } from './dom.js';
import { getState } from '../state.js';
import { renderStart } from './views/start.js';
import { renderDashboard } from './views/dashboard.js';

const UI_VIEW_KEY = 'nc_ui_view_v1';

// registra uma única vez ouvintes globais para refresh
(function ensureGlobalListeners(){
  if (typeof window === 'undefined') return;
  if (window.__nc_ui_listeners__) return;
  window.__nc_ui_listeners__ = true;

  const handler = () => render();
  window.addEventListener('ui:refresh', handler);
  window.addEventListener('state:changed', handler);
})();

export function render(){
  const root = qs('#app'); clear(root);
  const s = getState();
  if(!s){ renderStart(root, rerender); }
  else  { renderDashboard(root, s, { rerender, viewKey:UI_VIEW_KEY }); }
}

function rerender(){ render(); }
