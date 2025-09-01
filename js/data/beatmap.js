// js/data/beatmap.js
// Beatmap: TAGs -> parâmetros Web Audio (sintetizados)
export const BEATMAP = {
  'ui:click':            { synth:{ wave:'square',  freq:1400, dur:0.04, attack:0.003, release:0.05, gain:0.25 } },
  'turn:next':           { synth:{ wave:'triangle',freq:520,  dur:0.06, attack:0.005, release:0.16, gain:0.40, glideTo:260, glideTime:0.12 } },
  'task:assign':         { synth:{ wave:'sine',    freq:620,  dur:0.08, attack:0.005, release:0.10, gain:0.35 } },
  'task:cancel':         { synth:{ kind:'noise',   dur:0.06,  attack:0.004, release:0.12, gain:0.30 } },
  'event:open':          { synth:{ wave:'triangle',freq:880,  dur:0.10, attack:0.008, release:0.18, gain:0.32 } },
  'task:result:success': { synth:{ wave:'sine',    freq:660,  dur:0.08, attack:0.005, release:0.14, gain:0.38, glideTo:990, glideTime:0.10 } },
  'task:result:partial': { synth:{ wave:'sine',    freq:520,  dur:0.06, attack:0.005, release:0.11, gain:0.34 } },
  'task:result:fail':    { synth:{ kind:'tone+noise', wave:'triangle', freq:380, dur:0.05, attack:0.005, release:0.16, gain:0.32, glideTo:220, glideTime:0.10 } }
};
