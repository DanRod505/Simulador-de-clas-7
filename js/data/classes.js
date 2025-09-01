// js/data/classes.js
// 10 classes com modificadores, afinidades e efeitos opcionais.

export const CLASSES = {
  rastreador: {
    key: 'rastreador', name: 'Rastreador', emoji: '🐾',
    attrMods: { poder: 0, diplomacia: 0, estrategia: 1 },
    affinity: { mission: 8, rel_down: 10 },
    trainBonus: { taijutsu: 0, ninjutsu: 1 },
  },
  negociador: {
    key: 'negociador', name: 'Negociador', emoji: '🤝',
    attrMods: { poder: 0, diplomacia: 2, estrategia: 0 },
    affinity: { rel_up: 14, economy: 8 },
    trainBonus: { taijutsu: 0, ninjutsu: 0 },
  },
  estrategista: {
    key: 'estrategista', name: 'Estrategista', emoji: '♟️',
    attrMods: { poder: 0, diplomacia: 0, estrategia: 2 },
    affinity: { rel_down: 14, economy: 10 },
    trainBonus: { taijutsu: 0, ninjutsu: 1 },
  },
  guerreiro: {
    key: 'guerreiro', name: 'Guerreiro', emoji: '⚔️',
    attrMods: { poder: 2, diplomacia: 0, estrategia: 0 },
    affinity: { mission: 14 },
    trainBonus: { taijutsu: 1, ninjutsu: 0 },
  },
  medico: {
    key: 'medico', name: 'Médico', emoji: '🩺',
    attrMods: { poder: 0, diplomacia: 1, estrategia: 1 },
    affinity: { mission: 6 },
    trainBonus: { taijutsu: 0, ninjutsu: 0 },
    special: { softenMissionFail: true }, // falha em missão → +1 militar
  },
  assassino: {
    key: 'assassino', name: 'Assassino', emoji: '🗡️',
    attrMods: { poder: 1, diplomacia: 0, estrategia: 1 },
    affinity: { rel_down: 16, mission: 8 },
    trainBonus: { taijutsu: 1, ninjutsu: 0 },
  },
  defensor: {
    key: 'defensor', name: 'Defensor', emoji: '🛡️',
    attrMods: { poder: 1, diplomacia: 0, estrategia: 0 },
    affinity: { mission: 10 },
    trainBonus: { taijutsu: 1, ninjutsu: 0 },
  },
  selador: {
    key: 'selador', name: 'Selador', emoji: '🔗',
    attrMods: { poder: 0, diplomacia: 0, estrategia: 2 },
    affinity: { rel_up: 8, rel_down: 8 },
    trainBonus: { taijutsu: 0, ninjutsu: 1 },
  },
  saboteador: {
    key: 'saboteador', name: 'Saboteador', emoji: '🧪',
    attrMods: { poder: 0, diplomacia: 0, estrategia: 2 },
    affinity: { rel_down: 12, economy: 6 },
    trainBonus: { taijutsu: 0, ninjutsu: 1 },
  },
  lider: {
    key: 'lider', name: 'Líder', emoji: '👑',
    attrMods: { poder: 0, diplomacia: 2, estrategia: 0 },
    affinity: { rel_up: 10, economy: 4 },
    trainBonus: { taijutsu: 0, ninjutsu: 0 },
  },
};

// Mapeia "focus" → classe (fallbacks)
const FOCUS_TO_CLASS = {
  ataque: 'guerreiro',
  defesa: 'defensor',
  suporte: 'medico',
  diplomacia: 'negociador',
  espionagem: 'assassino',
  tatico: 'estrategista',
  rastreamento: 'rastreador',
  cura: 'medico',
  lideranca: 'lider',
  selamento: 'selador',
  sabotagem: 'saboteador',
};

// Normalizador
function norm(s){ return (s||'').toString().trim().toLowerCase(); }

// Obtém a classe do personagem (p.classe/p.class/focus) com fallback
export function getClassOf(p){
  const byProp = CLASSES[norm(p?.classe)] || CLASSES[norm(p?.class)];
  if (byProp) return byProp;
  const byFocus = CLASSES[FOCUS_TO_CLASS[norm(p?.focus)]];
  return byFocus || CLASSES.guerreiro;
}

// Bônus direto no score por afinidade (considera tipo de tarefa)
export function classScoreBonus(cls, { kind }){
  if(!cls) return 0;
  let b = 0;
  if (cls.affinity && typeof cls.affinity[kind] === 'number') b += cls.affinity[kind];
  return b;
}
