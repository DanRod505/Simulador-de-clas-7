// js/main.js
import { loadState } from './state.js';
import { render } from './ui/screens.js';
import { loadBeatmap, warmupAudio } from './systems/sfx.js';
import { BEATMAP } from './data/beatmap.js';

import { initBGM, startBGM, setPlaylist } from './systems/bgm.js';
import { MUSIC_FILES } from './data/music.js';

// Boot
loadState();
loadBeatmap(BEATMAP);

// BGM: inicializa e define a playlist
initBGM(MUSIC_FILES);
setPlaylist(MUSIC_FILES);

// No 1º gesto do usuário (mobile/iOS): liberar SFX e começar BGM
window.addEventListener('pointerdown', () => {
  warmupAudio();   // SFX (Web Audio)
  startBGM();      // BGM (HTMLAudio)
}, { once: true });

// Render inicial
render();

window.addEventListener('ui:refresh', () => {
  // chame aqui a função que redesenha a tela atual
  // ex.: renderCurrentScreen();
});
