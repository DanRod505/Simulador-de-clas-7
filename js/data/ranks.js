// js/data/ranks.js
// Ordem hierárquica dos ranks (do mais baixo ao mais alto)
export const RANKS = ['genin', 'chunin', 'jounin', 'anbu', 'lider', 'kage'];

// Normaliza string para comparação (lowercase, sem acentos)
export function normRank(s) {
  if (!s) return '';
  return s.toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

// true se rankA >= rankB (na hierarquia)
export function rankGte(rankA, rankB) {
  const a = RANKS.indexOf(normRank(rankA));
  const b = RANKS.indexOf(normRank(rankB));
  if (a < 0 || b < 0) return false;
  return a >= b;
}
