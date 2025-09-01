
// Eventos aleatórios por turno com escolhas rápidas.
const EVENTS = [
  {
    id:'boato_roubo',
    title:'Boatos de furto na vila',
    text:'Circulam boatos de pequenos furtos atribuídos a jovens genins. Como seu clã reage?',
    choices:[
      { label:'Apoiar patrulhas extras (custo econômico)', effects:{ economia:-5, militar:+4, reputacao:+1 } },
      { label:'Fazer campanha educativa (ganha reputação, baixo impacto)', effects:{ reputacao:+3 } },
      { label:'Ignorar (pode piorar no futuro)', effects:{ } },
    ]
  },
  {
    id:'pedido_alianca',
    title:'Pedido de Aliança',
    text:'Um clã menor propõe uma aliança simbólica em troca de apoio político.',
    choices:[
      { label:'Aceitar e ceder apoio', effects:{ politica:+5, economia:-3 } },
      { label:'Negociar termos duros', effects:{ politica:+3, reputacao:-1 } },
      { label:'Recusar educadamente', effects:{ reputacao:+1 } },
    ]
  },
  {
    id:'contrabando',
    title:'Rota de Contrabando',
    text:'Descoberta suspeita de rotas de contrabando atravessando regiões próximas.',
    choices:[
      { label:'Reprimir com força', effects:{ militar:+5, politica:+1, economia:-4 } },
      { label:'Cobrar impostos e permitir', effects:{ economia:+8, reputacao:-2 } },
      { label:'Reportar à administração central', effects:{ politica:+4, reputacao:+1 } },
    ]
  }
];

export function maybeRollEvent(state){
  // 45% chance por turno
  if(Math.random() < 0.45){
    const ev = EVENTS[Math.floor(Math.random()*EVENTS.length)];
    state.pendingEvent = ev;
  }else{
    state.pendingEvent = null;
  }
}

export function applyEventChoice(state, choiceIndex){
  const ev = state.pendingEvent;
  if(!ev) return;
  const choice = ev.choices[choiceIndex];
  if(choice && choice.effects){
    for(const k in choice.effects){
      state.recursos[k] += choice.effects[k];
    }
  }
  state.log.unshift({ t: state.turno, kind:'event', text:`Evento: ${ev.title} — escolha: ${choice?.label || 'N/A'}.` });
  state.pendingEvent = null;
}
