// js/data/characters.js
// Naruto Clássico (Parte I) — gap ampliado por rank (0–20).

export const CHARACTERS = {
  // UCHIHA — massacre já ocorreu; Itachi (ANBU nukenin), Sasuke (genin)
  uchiha: [
    { id:'uchiha_sasuke', name:'Uchiha Sasuke', rank:'genin', focus:'ataque', classe:'assassino',
      stats:{ poder:12, diplomacia:7,  estrategia:11 } },
    { id:'uchiha_itachi', name:'Uchiha Itachi', rank:'anbu',  focus:'espionagem', classe:'assassino',
      stats:{ poder:20, diplomacia:13, estrategia:19 } },
  ],

  // HYUGA
  hyuga: [
    { id:'hyuga_hiashi', name:'Hyuga Hiashi', rank:'lider',  focus:'lideranca', classe:'lider',
      stats:{ poder:16, diplomacia:14, estrategia:16 } },
    { id:'hyuga_neji',   name:'Hyuga Neji',   rank:'genin',  focus:'defesa',    classe:'defensor',
      stats:{ poder:14, diplomacia:10, estrategia:14 } },
    { id:'hyuga_hinata', name:'Hyuga Hinata', rank:'genin',  focus:'defesa',    classe:'defensor',
      stats:{ poder:8,  diplomacia:14, estrategia:10 } },
  ],

  // NARA
  nara: [
    { id:'nara_shikaku',   name:'Nara Shikaku',   rank:'jounin', focus:'tatico', classe:'lider',
      stats:{ poder:9,  diplomacia:14, estrategia:19 } },
    { id:'nara_shikamaru', name:'Nara Shikamaru', rank:'genin',  focus:'tatico', classe:'estrategista',
      stats:{ poder:7,  diplomacia:11, estrategia:18 } },
  ],

  // INUZUKA
  inuzuka: [
    { id:'inuzuka_tsume', name:'Inuzuka Tsume', rank:'jounin', focus:'lideranca',   classe:'lider',
      stats:{ poder:14, diplomacia:10, estrategia:13 } },
    { id:'inuzuka_hana',  name:'Inuzuka Hana',  rank:'chunin', focus:'cura',        classe:'medico',
      stats:{ poder:9,  diplomacia:12, estrategia:12 } },
    { id:'inuzuka_kiba',  name:'Inuzuka Kiba',  rank:'genin',  focus:'rastreamento',classe:'rastreador',
      stats:{ poder:11, diplomacia:8,  estrategia:11 } },
  ],

  // YAMANAKA
  yamanaka: [
    { id:'yamanaka_inoichi', name:'Yamanaka Inoichi', rank:'jounin', focus:'diplomacia', classe:'lider',
      stats:{ poder:9,  diplomacia:17, estrategia:13 } },
    { id:'yamanaka_ino',     name:'Yamanaka Ino',     rank:'genin',  focus:'diplomacia', classe:'negociador',
      stats:{ poder:8,  diplomacia:15, estrategia:10 } },
  ],

  // ABURAME
  aburame: [
    { id:'aburame_shibi', name:'Aburame Shibi', rank:'jounin', focus:'tatico',    classe:'estrategista',
      stats:{ poder:9,  diplomacia:10, estrategia:17 } },
    { id:'aburame_shino', name:'Aburame Shino', rank:'genin',  focus:'sabotagem', classe:'saboteador',
      stats:{ poder:8,  diplomacia:10, estrategia:16 } },
  ],

  // UZUMAKI (no Clássico, ativo em Konoha: Naruto)
  uzumaki: [
    { id:'uzumaki_naruto', name:'Uzumaki Naruto', rank:'genin', focus:'ataque', classe:'guerreiro',
      stats:{ poder:16, diplomacia:10, estrategia:10 } },
  ],

  // AKIMICHI
  akimichi: [
    { id:'akimichi_choza', name:'Akimichi Choza', rank:'jounin', focus:'lideranca', classe:'lider',
      stats:{ poder:17, diplomacia:12, estrategia:10 } },
    { id:'akimichi_choji', name:'Akimichi Choji', rank:'genin',  focus:'ataque',    classe:'guerreiro',
      stats:{ poder:12, diplomacia:10, estrategia:9 } },
  ],
};
