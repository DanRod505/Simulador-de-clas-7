
// Economia simples por turno.
// Ganho base depende de 'economia' + 'politica'; custos escalam com 'militar'.
export function processEconomy(state){
  const b = state.playerClan.bonuses;
  const income = 8 + b.economia*2 + b.politica;
  const upkeep = Math.max(0, 3 + (b.militar-1)*2 + Math.floor(state.tasks.length*0.5));
  state.recursos.economia += income - upkeep;
  // reputação flutua levemente
  state.recursos.reputacao += Math.max(-1, Math.min(1, Math.round((b.reputacao-2) + (Math.random()*2-1))));
  // política melhora devagar conforme passa o tempo
  state.recursos.politica += 1 + Math.floor(b.politica/2);
  // militar sobe com patrulhas ativas (contado em tasks.js), aqui só estabiliza
  state.recursos.militar = Math.max(0, state.recursos.militar);
  clampResources(state);
}

export function clampResources(state){
  const r = state.recursos;
  for(const k of Object.keys(r)){
    if(k === 'economia'){
      r[k] = Math.max(0, Math.round(r[k]));
    }else{
      r[k] = Math.max(0, Math.min(999, Math.round(r[k])));
    }
  }
}
