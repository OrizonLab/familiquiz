/* Famili'Quiz — musique et bruitages 100 % synthétisés (Web Audio API), aucun fichier externe. */
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let musicOn = true, sfxOn = true, musicVol = 0.55, sfxVol = 0.8;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone / iPad : jouer le son même si le bouton « silencieux » est activé (Safari 16.4+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* non pris en charge */ }
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    applyVolumes();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function applyVolumes() {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(musicOn ? musicVol * duckLevel : 0, ctx.currentTime, 0.08);
    sfxBus.gain.setTargetAtTime(sfxOn ? sfxVol : 0, ctx.currentTime, 0.02);
  }
  function configure(s) {
    musicOn = s.music; sfxOn = s.sfx; musicVol = s.musicVol; sfxVol = s.sfxVol;
    applyVolumes();
  }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- Briques de synthèse ---------- */
  function tone({ freq, type = 'square', t = ctx.currentTime, dur = 0.2, vol = 0.2, attack = 0.005, release = 0.08, bus = sfxBus, slideTo = null, cutoff = null, detune = 0 }) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (cutoff) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
      g.connect(f); out = f;
    }
    o.connect(g); out.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise({ t = ctx.currentTime, dur = 0.1, vol = 0.2, type = 'highpass', freq = 5000, q = 0.7, bus = sfxBus, sweepTo = null }) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, bus, vol = 0.9) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
  }
  function snare(t, bus, vol = 0.35) {
    noise({ t, dur: 0.16, vol, type: 'highpass', freq: 1400, bus });
    tone({ freq: 190, type: 'triangle', t, dur: 0.09, vol: vol * 0.6, bus });
  }
  function hat(t, bus, vol = 0.08, open = false) {
    noise({ t, dur: open ? 0.18 : 0.04, vol, type: 'highpass', freq: 7500, bus });
  }

  /* ---------- Musique : séquenceur à pas de double-croche ---------- */
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parseNote(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  // Mélodie : 8 croches par mesure — "E5" note, "-" tenue, "." silence.
  function parseMelody(bars) {
    return bars.map(bar => {
      const tok = bar.trim().split(/\s+/);
      const notes = [];
      tok.forEach((tk, i) => {
        if (tk === '-' && notes.length) notes[notes.length - 1].len += 2;
        else if (tk !== '.' && tk !== '-') notes.push({ step: i * 2, midi: parseNote(tk), len: 2 });
      });
      return notes;
    });
  }

  const SONGS = {
    menu: {
      bpm: 116, swing: 0,
      chords: [[60, 64, 67, 72], [59, 62, 67, 71], [60, 64, 69, 72], [60, 65, 69, 72], [60, 64, 67, 72], [59, 62, 67, 71], [60, 64, 69, 72], [60, 65, 69, 74]],
      bass: [36, 31, 33, 29, 36, 31, 33, 31],
      melody: parseMelody([
        'C5 E5 G5 E5 C6 - G5 -',
        'B4 D5 G5 D5 B5 - G5 -',
        'A4 C5 E5 C5 A5 - E5 -',
        'F5 E5 D5 C5 D5 - . .',
        'E5 E5 G5 - E5 C5 D5 E5',
        'D5 D5 B4 - G4 - . G4',
        'A4 C5 E5 A5 G5 E5 C5 E5',
        'F5 - A5 - G5 - . .'
      ]),
      drums: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      leadVol: 0.07, arpVol: 0.025, bassVol: 0.13
    },
    game: {
      bpm: 132,
      chords: [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]],
      bass: [33, 29, 36, 31, 33, 29, 36, 31],
      melody: parseMelody([
        'A5 . A5 G5 A5 . C6 .',
        'A5 . G5 F5 E5 . C5 .',
        'G5 . G5 E5 G5 . C6 .',
        'B5 . A5 G5 D5 . . .',
        'E5 A5 C6 A5 E5 A5 C6 A5',
        'F5 A5 C6 A5 F5 A5 C6 A5',
        'G5 C6 E6 C6 G5 C6 E6 C6',
        'B5 - D6 - B5 - G5 -'
      ]),
      drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], openHat: [14] },
      leadVol: 0.05, arpVol: 0.03, bassVol: 0.14
    }
  };

  let song = null, songName = null, step = 0, nextTime = 0, timer = null, duckLevel = 1;

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16) % song.chords.length;
    const st = s % 16;
    const stepDur = 60 / song.bpm / 4;
    const bus = musicBus;
    // Batterie
    if (song.drums.kick.includes(st)) kick(t, bus, 0.55);
    if (song.drums.snare.includes(st)) snare(t, bus, 0.2);
    if (song.drums.hat.includes(st)) hat(t, bus, 0.05, (song.drums.openHat || []).includes(st));
    // Basse « rebondissante » en croches (fondamentale / octave)
    if (st % 2 === 0) {
      const root = song.bass[bar] + (st % 4 === 2 ? 12 : 0);
      tone({ freq: mtof(root), type: 'triangle', t, dur: stepDur * 1.8, vol: song.bassVol, bus, release: 0.05 });
      tone({ freq: mtof(root), type: 'square', t, dur: stepDur * 1.2, vol: song.bassVol * 0.25, bus, cutoff: 600 });
    }
    // Arpège en doubles-croches
    const ch = song.chords[bar];
    tone({ freq: mtof(ch[st % ch.length] + 12), type: 'square', t, dur: stepDur * 0.9, vol: song.arpVol, bus, cutoff: 2600, release: 0.04 });
    // Mélodie
    song.melody[bar].forEach(n => {
      if (n.step === st) {
        const dur = stepDur * n.len * 0.95;
        tone({ freq: mtof(n.midi), type: 'square', t, dur, vol: song.leadVol, bus, cutoff: 3200, release: 0.06 });
        tone({ freq: mtof(n.midi), type: 'triangle', t, dur, vol: song.leadVol * 0.8, bus, detune: 6 });
      }
    });
  }
  function pump() {
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += stepDur; step++;
    }
  }
  function playMusic(name) {
    init();
    if (!ctx || songName === name) return;
    stopMusic();
    song = SONGS[name]; songName = name; step = 0;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(pump, 30);
  }
  function stopMusic() {
    clearInterval(timer); timer = null; songName = null;
  }
  function duck(on) {
    duckLevel = on ? 0.45 : 1;
    applyVolumes();
  }

  /* ---------- Bruitages ---------- */
  const fx = {
    click() {
      tone({ freq: 880, type: 'sine', dur: 0.06, vol: 0.18, slideTo: 1320 });
    },
    pop() {
      tone({ freq: 520, type: 'sine', dur: 0.09, vol: 0.2, slideTo: 1040 });
    },
    tick() {
      // « tic » boisé
      tone({ freq: 1250, type: 'sine', dur: 0.05, vol: 0.22 });
      noise({ dur: 0.02, vol: 0.08, type: 'bandpass', freq: 3000, q: 4 });
    },
    tickUrgent() {
      // « TOC-toc » plus aigu + battement de cœur grave pour les 3 dernières secondes
      const t = ctx.currentTime;
      tone({ freq: 1760, type: 'square', t, dur: 0.07, vol: 0.14, cutoff: 4000 });
      tone({ freq: 1320, type: 'square', t: t + 0.12, dur: 0.06, vol: 0.1, cutoff: 4000 });
      kick(t, sfxBus, 0.5); kick(t + 0.16, sfxBus, 0.35);
    },
    correct() {
      // arpège majeur ascendant brillant « ding-ding-ding-DING » + scintillement
      const t = ctx.currentTime;
      [72, 76, 79, 84].forEach((m, i) => {
        tone({ freq: mtof(m), type: 'square', t: t + i * 0.075, dur: i === 3 ? 0.45 : 0.12, vol: 0.12, cutoff: 5000 });
        tone({ freq: mtof(m + 12), type: 'sine', t: t + i * 0.075, dur: i === 3 ? 0.5 : 0.12, vol: 0.1 });
      });
      for (let i = 0; i < 6; i++) tone({ freq: 2400 + Math.random() * 2400, type: 'sine', t: t + 0.3 + i * 0.04, dur: 0.08, vol: 0.05 });
    },
    wrong() {
      // « bouh-bouuuh » descendant, grave et nasillard
      const t = ctx.currentTime;
      tone({ freq: 220, slideTo: 196, type: 'sawtooth', t, dur: 0.25, vol: 0.18, cutoff: 900 });
      tone({ freq: 185, slideTo: 110, type: 'sawtooth', t: t + 0.27, dur: 0.5, vol: 0.2, cutoff: 800 });
      tone({ freq: 92, slideTo: 55, type: 'square', t: t + 0.27, dur: 0.5, vol: 0.08, cutoff: 400 });
    },
    timeout() {
      // buzzer de fin de temps
      const t = ctx.currentTime;
      tone({ freq: 110, type: 'square', t, dur: 0.7, vol: 0.16, cutoff: 1200 });
      tone({ freq: 116.5, type: 'sawtooth', t, dur: 0.7, vol: 0.12, cutoff: 1200 });
    },
    streak() {
      const t = ctx.currentTime;
      noise({ t, dur: 0.35, vol: 0.12, type: 'bandpass', freq: 600, sweepTo: 6000, q: 2 });
      [84, 88, 91, 96].forEach((m, i) => tone({ freq: mtof(m), type: 'triangle', t: t + 0.2 + i * 0.05, dur: 0.18, vol: 0.09 }));
    },
    joker() {
      const t = ctx.currentTime;
      for (let i = 0; i < 10; i++) tone({ freq: mtof(79 + (i % 5) * 3), type: 'sine', t: t + i * 0.035, dur: 0.12, vol: 0.08 });
      noise({ t, dur: 0.4, vol: 0.06, type: 'highpass', freq: 6000 });
    },
    whoosh() {
      noise({ dur: 0.35, vol: 0.18, type: 'bandpass', freq: 300, sweepTo: 4000, q: 1.5 });
    },
    turn() {
      // « ta-da ! » d'annonce du joueur
      const t = ctx.currentTime;
      tone({ freq: mtof(67), type: 'square', t, dur: 0.12, vol: 0.12, cutoff: 3000 });
      [72, 76, 79].forEach(m => tone({ freq: mtof(m), type: 'square', t: t + 0.14, dur: 0.5, vol: 0.08, cutoff: 3000 }));
      snare(t + 0.14, sfxBus, 0.2);
    },
    slot() {
      tone({ freq: 1500 + Math.random() * 300, type: 'square', dur: 0.03, vol: 0.06, cutoff: 3500 });
    },
    reveal() {
      const t = ctx.currentTime;
      noise({ t, dur: 0.9, vol: 0.12, type: 'highpass', freq: 5000 });
      [60, 67, 72, 76].forEach(m => tone({ freq: mtof(m), type: 'square', t, dur: 0.7, vol: 0.06, cutoff: 2500 }));
      kick(t, sfxBus, 0.6);
    },
    drumroll(dur = 1.6) {
      const t = ctx.currentTime;
      const n = Math.floor(dur / 0.045);
      for (let i = 0; i < n; i++) snare(t + i * 0.045, sfxBus, 0.04 + 0.12 * (i / n));
    },
    fanfare() {
      const t = ctx.currentTime;
      const seq = [[67, 0, 0.14], [67, 0.16, 0.14], [67, 0.32, 0.14], [72, 0.5, 0.7]];
      seq.forEach(([m, d, len]) => {
        tone({ freq: mtof(m), type: 'sawtooth', t: t + d, dur: len, vol: 0.12, cutoff: 2200 });
        tone({ freq: mtof(m - 12), type: 'square', t: t + d, dur: len, vol: 0.06, cutoff: 1200 });
      });
      [72, 76, 79, 84].forEach(m => tone({ freq: mtof(m), type: 'sawtooth', t: t + 1.25, dur: 1.4, vol: 0.06, cutoff: 2400 }));
      kick(t + 0.5, sfxBus, 0.7); kick(t + 1.25, sfxBus, 0.8);
      noise({ t: t + 1.25, dur: 1.4, vol: 0.1, type: 'highpass', freq: 6000 });
    },
    badge() {
      // carillon scintillant de récompense
      const t = ctx.currentTime;
      [84, 88, 91, 96, 100].forEach((m, i) => {
        tone({ freq: mtof(m), type: 'triangle', t: t + i * 0.09, dur: 0.6, vol: 0.09 });
        tone({ freq: mtof(m + 12), type: 'sine', t: t + i * 0.09, dur: 0.4, vol: 0.05 });
      });
      noise({ t: t + 0.4, dur: 0.6, vol: 0.05, type: 'highpass', freq: 7000 });
    },
    applause(dur = 2.5) {
      const t = ctx.currentTime;
      for (let i = 0; i < dur * 40; i++) {
        noise({ t: t + Math.random() * dur, dur: 0.03, vol: 0.05 + Math.random() * 0.07, type: 'bandpass', freq: 1500 + Math.random() * 2500, q: 1.2 });
      }
    }
  };

  function play(name, ...args) {
    init();
    if (!ctx || !sfxOn || !fx[name]) return;
    try { fx[name](...args); } catch (e) { console.warn(e); }
  }

  /* ---------- Lecture vocale des questions ---------- */
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang));
    voice = vs.find(v => /google|natural|online/i.test(v.name)) || vs[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // Une relecture (bouton 🔊) reprend le rappel en attente : le chrono attend la fin de la dernière lecture.
  let current = null, pending = null;
  function speak(text, onEnd) {
    if (!('speechSynthesis' in window)) { onEnd && onEnd(); return; }
    if (onEnd) pending = onEnd;
    current = null;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (voice) u.voice = voice; u.rate = 1.0; u.pitch = 1.05;
    current = u;
    const finish = () => {
      if (u !== current) return; // lecture remplacée ou arrêtée
      current = null;
      const cb = pending; pending = null;
      cb && cb();
    };
    u.onend = finish; u.onerror = finish;
    setTimeout(finish, 1500 + text.length * 75); // garde-fou si l'événement ne vient jamais
    speechSynthesis.speak(u);
  }
  const stopSpeech = () => {
    current = null; pending = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  };

  return { init, configure, playMusic, stopMusic, duck, play, speak, stopSpeech };
})();
