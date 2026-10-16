/* Famili'Quiz — musique et bruitages 100 % synthétisés (Web Audio API), aucun fichier externe.
 * Instruments doux : piano électrique (FM), marimba, clochettes, nappes, basse ronde,
 * percussions légères (claquements de doigts, shaker) et réverbération.
 */
const Sound = (() => {
  let ctx = null, master, musicBus, musicTone, leadBus, sfxBus, voiceBus, reverb, noiseBuf;
  let musicOn = true, sfxOn = true, musicVol = 0.55, sfxVol = 0.8;
  let duckLevel = 1, voiceDuckLevel = 1;
  const voiceOpts = { mode: 'natural', uri: '', rate: 1 };

  /* ---------- Graphe audio ---------- */
  // Réponse impulsionnelle synthétique : bruit stéréo qui s'éteint en ~2,4 s (salle chaleureuse).
  function makeImpulse(c, seconds = 2.4) {
    const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; // bruit adouci (moins de sifflement)
        d[i] = lp * Math.pow(1 - i / len, 3.2);
      }
    }
    return buf;
  }

  function buildGraph(c) {
    ctx = c;
    master = c.createGain(); master.gain.value = 0.85;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp); comp.connect(c.destination);

    reverb = c.createConvolver(); reverb.buffer = makeImpulse(c);
    const reverbOut = c.createGain(); reverbOut.gain.value = 0.32;
    reverb.connect(reverbOut); reverbOut.connect(master);

    // Musique : volume → filtre doux (coupe les aigus agressifs) → sortie + réverbération
    musicBus = c.createGain();
    musicTone = c.createBiquadFilter(); musicTone.type = 'lowpass'; musicTone.frequency.value = 7500; musicTone.Q.value = 0.5;
    musicBus.connect(musicTone); musicTone.connect(master);
    const musicSend = c.createGain(); musicSend.gain.value = 0.55;
    musicTone.connect(musicSend); musicSend.connect(reverb);

    // Mélodie : un écho discret (croche pointée) en plus
    leadBus = c.createGain(); leadBus.connect(musicBus);
    const delay = c.createDelay(2); delay.delayTime.value = 0.45;
    const fb = c.createGain(); fb.gain.value = 0.25;
    const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    const wet = c.createGain(); wet.gain.value = 0.22;
    leadBus.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(wet); wet.connect(musicBus);

    // Voix enregistrée : sortie directe, sans réverbération
    voiceBus = c.createGain(); voiceBus.gain.value = 1.15; voiceBus.connect(master);

    // Bruitages : sortie directe + un peu de réverbération
    sfxBus = c.createGain(); sfxBus.connect(master);
    const sfxSend = c.createGain(); sfxSend.gain.value = 0.18;
    sfxBus.connect(sfxSend); sfxSend.connect(reverb);

    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone / iPad : jouer le son même si le bouton « silencieux » est activé (Safari 16.4+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* non pris en charge */ }
    buildGraph(new AC());
    applyVolumes();
  }
  function applyVolumes() {
    if (!ctx || !musicBus) return;
    musicBus.gain.setTargetAtTime(musicOn ? musicVol * duckLevel * voiceDuckLevel : 0, ctx.currentTime, 0.12);
    sfxBus.gain.setTargetAtTime(sfxOn ? sfxVol : 0, ctx.currentTime, 0.02);
  }
  function configure(s) {
    musicOn = s.music; sfxOn = s.sfx; musicVol = s.musicVol; sfxVol = s.sfxVol;
    Object.assign(voiceOpts, { mode: s.voiceMode || 'natural', uri: s.voiceURI || '', rate: s.voiceRate || 1 });
    pickVoice();
    applyVolumes();
  }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Briques de synthèse ---------- */
  function out(dest, pan = 0) {
    const g = ctx.createGain(); g.gain.value = 0;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); }
    else g.connect(dest);
    return g;
  }
  function osc(type, freq, t, stop, dest, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(stop);
    return o;
  }
  function lowpass(freq, dest, q = 0.7) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    f.connect(dest);
    return f;
  }
  function noise({ t, dur, vol, type = 'bandpass', freq = 2000, q = 1, dest = sfxBus, sweepTo = null, attack = 0.002 }) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }

  // Piano électrique (synthèse FM, façon Rhodes) : attaque ronde, extinction lente.
  function epiano(m, t, dur, vel, dest) {
    const f = mtof(m), end = t + dur + 1.6;
    const g = out(dest, rnd(-0.25, 0.25));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.setTargetAtTime(vel * 0.45, t + 0.01, 0.35);
    g.gain.setTargetAtTime(0, t + dur, 0.22);
    const car = osc('sine', f, t, end, g);
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
    const idx = ctx.createGain();
    idx.gain.setValueAtTime(f * 1.4, t); idx.gain.setTargetAtTime(f * 0.18, t, 0.25);
    mod.connect(idx); idx.connect(car.frequency); mod.start(t); mod.stop(end);
    // petite « lame » métallique à l'attaque
    const tine = out(dest);
    tine.gain.setValueAtTime(vel * 0.12, t); tine.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc('sine', f * 3, t, t + 0.35, tine);
  }
  // Marimba : son boisé et rond.
  function marimba(m, t, vel, dest, len = 0.9) {
    const f = mtof(m);
    const g = out(dest, rnd(-0.3, 0.3));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc('sine', f, t, t + len + 0.05, g);
    const h = out(dest);
    h.gain.setValueAtTime(vel * 0.3, t); h.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc('sine', f * 4, t, t + 0.1, h);
  }
  // Clochette / glockenspiel : cristallin mais doux.
  function bell(m, t, vel, dest, len = 1.8) {
    const f = mtof(m);
    const g = out(dest, rnd(-0.35, 0.35));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc('sine', f, t, t + len + 0.05, g);
    [[2.76, 0.28, 0.55], [5.4, 0.08, 0.22], [2, 0.18, 1.0]].forEach(([r, a, d]) => {
      const p = out(dest);
      p.gain.setValueAtTime(vel * a, t); p.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc('sine', f * r, t, t + d + 0.05, p);
    });
  }
  // Corde pincée feutrée (arpèges de la musique de partie).
  function pluck(m, t, vel, dest) {
    const f = mtof(m), end = t + 0.55;
    const g = out(dest, rnd(-0.45, 0.45));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, end);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    lp.connect(g);
    osc('triangle', f, t, end + 0.05, lp);
    const saw = ctx.createGain(); saw.gain.value = 0.25; saw.connect(lp);
    osc('sawtooth', f, t, end + 0.05, saw, 5);
  }
  // Nappe de cordes : deux dents de scie désaccordées, très filtrées, attaque lente.
  function pad(notes, t, dur, vel, dest) {
    notes.forEach((m, i) => {
      const f = mtof(m), end = t + dur + 1.0;
      const g = out(dest, i % 2 ? 0.35 : -0.35);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + Math.min(0.6, dur * 0.4));
      g.gain.setValueAtTime(vel, t + dur);
      g.gain.linearRampToValueAtTime(0, end);
      const lp = lowpass(950, g, 0.4);
      osc('sawtooth', f, t, end, lp, -8);
      osc('sawtooth', f, t, end, lp, 8);
    });
  }
  // Basse ronde.
  function bass(m, t, dur, vel, dest) {
    const f = mtof(m), end = t + dur + 0.15;
    const g = out(dest);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.setTargetAtTime(vel * 0.7, t + 0.012, 0.18); g.gain.setTargetAtTime(0, t + dur, 0.04);
    osc('sine', f, t, end, g);
    const lp = lowpass(650, g);
    const tri = ctx.createGain(); tri.gain.value = 0.35; tri.connect(lp);
    osc('triangle', f, t, end, tri);
  }
  // Percussions légères
  function kick(t, vol, dest) {
    const g = out(dest);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const o = osc('sine', 110, t, t + 0.35, g);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  }
  function snap(t, vol, dest) { // claquement de doigts / petit clap
    [0, 0.011, 0.023].forEach((d, i) => noise({ t: t + d, dur: i === 2 ? 0.14 : 0.03, vol: vol * (i === 2 ? 1 : 0.6), freq: 1700, q: 1.3, dest }));
  }
  function shaker(t, vol, dest) {
    noise({ t, dur: 0.06, vol, type: 'highpass', freq: 6500, q: 0.5, dest, attack: 0.012 });
  }
  function wood(freq, t, vol, dest = sfxBus) { // bloc de bois
    const g = out(dest);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc('sine', freq, t, t + 0.09, g);
    noise({ t, dur: 0.02, vol: vol * 0.35, freq: freq * 2, q: 3, dest });
  }

  /* ---------- Musique ---------- */
  // Accords (positions au piano) et fondamentales de basse.
  const CH = {
    Fmaj7: [53, 57, 60, 64], Dm7: [50, 53, 57, 60], Gm7: [55, 58, 62, 65], C7: [52, 55, 58, 60],
    Bbmaj7: [53, 57, 58, 62], Am7: [52, 55, 57, 60],
    C: [55, 60, 62, 64], Am: [55, 57, 60, 64], F: [53, 57, 60, 64], G: [55, 59, 62, 67], Em7: [52, 55, 59, 62]
  };
  const ROOT = { Fmaj7: 41, Dm7: 38, Gm7: 43, C7: 36, Bbmaj7: 46, Am7: 45, C: 36, Am: 45, F: 41, G: 43, Em7: 40 };

  // Mélodie : [pas (double-croche 0-15), note MIDI, durée en pas]
  const SONGS = {
    // Accueil : ambiance douce et chaleureuse, légèrement swing (piano électrique, marimba, clochettes).
    menu: {
      bpm: 88, swing: 0.2, comp: 'epiano', padVol: 0.012,
      compHits: [[0, 5, 1], [6, 2, 0.65], [10, 4, 0.8]],
      bassPat: [[0, 0, 5], [7, 7, 2], [10, 0, 4]],
      drums: { kick: [0, 10], snap: [4, 12], shaker: [0, 2, 4, 6, 8, 10, 12, 14] },
      vol: { comp: 0.055, bass: 0.2, lead: 0.13, bellLead: 0.075, kick: 0.28, snap: 0.07, shaker: 0.018 },
      bars: [
        { c: 'Fmaj7', i: 'marimba', m: [[0, 69, 3], [4, 72, 2], [6, 74, 2], [8, 72, 6]] },
        { c: 'Dm7', i: 'marimba', m: [[0, 69, 2], [2, 65, 2], [4, 69, 4], [10, 67, 4]] },
        { c: 'Gm7', i: 'marimba', m: [[0, 70, 3], [4, 74, 2], [6, 77, 2], [8, 76, 4], [12, 74, 2]] },
        { c: 'C7', i: 'marimba', m: [[0, 72, 8], [10, 70, 2], [12, 67, 4]] },
        { c: 'Fmaj7', i: 'marimba', m: [[0, 69, 3], [4, 72, 2], [6, 77, 2], [8, 76, 6]] },
        { c: 'Dm7', i: 'marimba', m: [[0, 74, 4], [6, 72, 2], [8, 69, 6]] },
        { c: 'Bbmaj7', i: 'marimba', m: [[0, 74, 3], [4, 72, 2], [6, 70, 2], [8, 69, 4], [12, 67, 2]] },
        { c: 'C7', i: 'marimba', m: [[0, 67, 4], [4, 69, 2], [6, 70, 2], [8, 72, 8]] },
        { c: 'Bbmaj7', i: 'bell', m: [[0, 77, 6], [8, 74, 6]] },
        { c: 'Am7', i: 'bell', m: [[0, 76, 6], [8, 72, 6]] },
        { c: 'Gm7', i: 'bell', m: [[0, 74, 4], [4, 77, 4], [8, 74, 8]] },
        { c: 'C7', i: 'bell', m: [[0, 76, 4], [4, 79, 4], [8, 82, 4], [12, 79, 4]] },
        { c: 'Bbmaj7', i: 'bell', m: [[0, 77, 6], [8, 81, 6]] },
        { c: 'Am7', i: 'bell', m: [[0, 79, 4], [4, 76, 4], [8, 72, 6]] },
        { c: ['Gm7', 'C7'], i: 'bell', m: [[0, 70, 4], [4, 74, 4], [8, 76, 4], [12, 79, 4]] },
        { c: 'Fmaj7', i: 'bell', m: [[0, 77, 12]] }
      ]
    },
    // Partie : pop entraînante mais légère (arpèges pincés, nappe, basse groove, clochettes).
    game: {
      bpm: 108, swing: 0, comp: 'pluck', padVol: 0.01,
      arp: [0, 1, 2, 3, 2, 1, 2, 3],
      bassPat: [[0, 0, 3], [3, 0, 1], [6, 12, 2], [8, 0, 3], [11, 0, 1], [14, 7, 2]],
      drums: { kick: [0, 6, 8], snap: [4, 12], shaker: [0, 2, 4, 6, 8, 10, 12, 14] },
      vol: { comp: 0.045, bass: 0.2, lead: 0.07, bellLead: 0.07, kick: 0.3, snap: 0.075, shaker: 0.02 },
      bars: [
        { c: 'C', i: 'bell', m: [[0, 76, 2], [2, 79, 2], [4, 81, 4], [8, 79, 2], [10, 76, 4]] },
        { c: 'Am', i: 'bell', m: [[0, 72, 2], [2, 76, 2], [4, 74, 4], [8, 72, 6]] },
        { c: 'F', i: 'bell', m: [[0, 69, 2], [2, 72, 2], [4, 77, 4], [8, 76, 2], [10, 72, 4]] },
        { c: 'G', i: 'bell', m: [[0, 74, 6], [8, 71, 2], [10, 74, 2], [12, 79, 4]] },
        { c: 'C', i: 'bell', m: [[0, 76, 2], [2, 79, 2], [4, 81, 4], [8, 79, 2], [10, 76, 4]] },
        { c: 'Am', i: 'bell', m: [[0, 72, 2], [2, 76, 2], [4, 74, 4], [8, 72, 6]] },
        { c: 'F', i: 'bell', m: [[0, 69, 2], [2, 72, 2], [4, 77, 4], [8, 76, 2], [10, 72, 4]] },
        { c: 'G', i: 'bell', m: [[0, 71, 4], [4, 74, 4], [8, 67, 8]] },
        { c: 'F', m: [] }, { c: 'G', m: [] }, { c: 'Em7', m: [] }, { c: 'Am', m: [] },
        { c: 'F', m: [] }, { c: 'G', m: [] }, { c: 'C', m: [] }, { c: ['F', 'G'], m: [] }
      ]
    }
  };

  let song = null, songName = null, step = 0, nextTime = 0, timer = null;

  function scheduleStep(s, t0) {
    const S = song, V = S.vol;
    const bar = S.bars[Math.floor(s / 16) % S.bars.length];
    const st = s % 16;
    const stepDur = 60 / S.bpm / 4;
    const t = t0 + (st % 4 === 2 ? S.swing * stepDur * 2 : 0); // swing sur les croches du temps faible
    const half = st < 8 ? 0 : 1;
    const chordName = Array.isArray(bar.c) ? bar.c[half] : bar.c;
    const chord = CH[chordName], root = ROOT[chordName];

    // Nappe : au début de la mesure (ou de chaque demi-mesure si deux accords)
    if (st === 0 || (st === 8 && Array.isArray(bar.c))) {
      pad(chord, t, stepDur * (Array.isArray(bar.c) ? 8 : 16), S.padVol, musicBus);
    }
    // Accompagnement
    if (S.comp === 'epiano') {
      S.compHits.forEach(([hs, len, v]) => {
        if (hs === st) chord.forEach(m => epiano(m + 12, t, stepDur * len, V.comp * v, musicBus));
      });
    } else if (st % 2 === 0) {
      pluck(chord[S.arp[st / 2]] + 12, t, V.comp * (st % 4 === 0 ? 1 : 0.75), musicBus);
    }
    // Basse
    S.bassPat.forEach(([bs, iv, len]) => { if (bs === st) bass(root + iv, t, stepDur * len, V.bass, musicBus); });
    // Percussions
    if (S.drums.kick.includes(st)) kick(t, V.kick, musicBus);
    if (S.drums.snap.includes(st)) snap(t, V.snap, musicBus);
    if (S.drums.shaker.includes(st)) shaker(t, V.shaker * (st % 4 === 2 ? 1.4 : 0.8), musicBus);
    // Mélodie
    bar.m.forEach(([ms, midi, len]) => {
      if (ms !== st) return;
      if (bar.i === 'marimba') marimba(midi, t, V.lead, leadBus, Math.max(0.6, stepDur * len * 1.2));
      else bell(midi, t, V.bellLead, leadBus, Math.max(1.0, stepDur * len * 1.5));
    });
  }
  function pump() {
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.2) {
      scheduleStep(step, nextTime);
      nextTime += stepDur; step++;
    }
  }
  function playMusic(name) {
    init();
    if (!ctx || songName === name || !SONGS[name]) return;
    stopMusic();
    song = SONGS[name]; songName = name; step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(pump, 40);
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
    click() { wood(1700, ctx.currentTime, 0.05); },
    pop() { marimba(84, ctx.currentTime, 0.12, sfxBus, 0.4); },
    tick() { wood(1050, ctx.currentTime, 0.4); },
    tickUrgent() {
      // « TOC-toc » de bois + battement de cœur grave pour les 3 dernières secondes
      const t = ctx.currentTime;
      wood(1350, t, 0.45); wood(950, t + 0.13, 0.32);
      kick(t, 0.32, sfxBus); kick(t + 0.17, 0.22, sfxBus);
    },
    correct() {
      // carillon montant lumineux « ding-ding-ding-DIIING »
      const t = ctx.currentTime;
      [84, 88, 91, 96].forEach((m, i) => bell(m, t + i * 0.075, i === 3 ? 0.24 : 0.17, sfxBus, i === 3 ? 1.4 : 0.6));
      marimba(72, t, 0.14, sfxBus, 0.5);
      [103, 108, 100].forEach((m, i) => bell(m, t + 0.32 + i * 0.05, 0.03, sfxBus, 0.4));
    },
    wrong() {
      // « oh-oh » descendant, doux et grave (bien différent du carillon de bonne réponse)
      const t = ctx.currentTime;
      [[64, 0, 0.2, 63], [60, 0.24, 0.55, 55]].forEach(([m, d, len, to]) => {
        const g = out(sfxBus);
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.13, t + d + 0.02);
        g.gain.setTargetAtTime(0, t + d + len * 0.6, 0.08);
        const lp = lowpass(900, g, 1.5);
        const o = osc('triangle', mtof(m), t + d, t + d + len + 0.3, lp);
        o.frequency.exponentialRampToValueAtTime(mtof(to), t + d + len);
        osc('sine', mtof(m - 12), t + d, t + d + len + 0.3, g);
      });
    },
    timeout() {
      // « bonk » sourd + petit gong grave
      const t = ctx.currentTime;
      wood(420, t, 0.25);
      const g = out(sfxBus);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      const lp = lowpass(800, g);
      osc('triangle', 196, t, t + 0.95, lp); osc('triangle', 207, t, t + 0.95, lp);
    },
    streak() {
      const t = ctx.currentTime;
      noise({ t, dur: 0.4, vol: 0.06, freq: 500, sweepTo: 5000, q: 1.5, attack: 0.15 });
      [96, 100, 103].forEach((m, i) => bell(m, t + 0.22 + i * 0.06, 0.06, sfxBus, 0.7));
    },
    joker() {
      const t = ctx.currentTime;
      [79, 84, 88, 91, 96, 100].forEach((m, i) => bell(m, t + i * 0.045, 0.05, sfxBus, 0.6));
    },
    whoosh() {
      noise({ t: ctx.currentTime, dur: 0.4, vol: 0.1, freq: 300, sweepTo: 3500, q: 1.2, attack: 0.15 });
    },
    turn() {
      // accord d'annonce au piano électrique + clochette
      const t = ctx.currentTime;
      [60, 64, 67, 72].forEach(m => epiano(m, t, 0.6, 0.08, sfxBus));
      bell(84, t + 0.12, 0.08, sfxBus, 1.2);
    },
    slot() { wood(1500 + Math.random() * 300, ctx.currentTime, 0.05); },
    reveal() {
      const t = ctx.currentTime;
      [60, 64, 67, 71].forEach(m => epiano(m, t, 0.9, 0.08, sfxBus));
      bell(79, t, 0.08, sfxBus, 1.4); bell(84, t + 0.08, 0.06, sfxBus, 1.4);
      kick(t, 0.3, sfxBus);
      noise({ t, dur: 0.8, vol: 0.03, type: 'highpass', freq: 7000, attack: 0.05 });
    },
    drumroll(dur = 1.6) {
      // roulement aux balais, crescendo
      const t = ctx.currentTime, n = Math.floor(dur / 0.05);
      for (let i = 0; i < n; i++) noise({ t: t + i * 0.05, dur: 0.07, vol: 0.015 + 0.07 * (i / n), freq: 2600, q: 0.8 });
    },
    fanfare() {
      // cuivres feutrés (dents de scie filtrées dont le filtre s'ouvre), puis accord final
      const t = ctx.currentTime;
      const brass = (m, d, len, vol) => {
        const g = out(sfxBus, rnd(-0.2, 0.2));
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(vol, t + d + 0.04);
        g.gain.setValueAtTime(vol, t + d + len - 0.05); g.gain.linearRampToValueAtTime(0, t + d + len + 0.15);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1;
        lp.frequency.setValueAtTime(500, t + d); lp.frequency.linearRampToValueAtTime(2000, t + d + 0.08);
        lp.frequency.setTargetAtTime(1200, t + d + 0.1, 0.2); lp.connect(g);
        osc('sawtooth', mtof(m), t + d, t + d + len + 0.2, lp, -5); osc('sawtooth', mtof(m), t + d, t + d + len + 0.2, lp, 5);
      };
      [[67, 0, 0.14], [67, 0.16, 0.14], [67, 0.32, 0.14], [72, 0.5, 0.7]].forEach(([m, d, len]) => brass(m, d, len, 0.07));
      [60, 64, 67, 72].forEach(m => brass(m, 1.25, 1.3, 0.045));
      bell(84, t + 1.25, 0.09, sfxBus, 2); bell(91, t + 1.3, 0.06, sfxBus, 2);
      kick(t + 0.5, 0.35, sfxBus); kick(t + 1.25, 0.4, sfxBus);
    },
    applause(dur = 2.5) {
      const t = ctx.currentTime;
      for (let i = 0; i < dur * 40; i++) {
        noise({ t: t + Math.random() * dur, dur: 0.03, vol: 0.03 + Math.random() * 0.05, freq: 1500 + Math.random() * 2500, q: 1.2 });
      }
    },
    badge() {
      const t = ctx.currentTime;
      [84, 88, 91, 96, 100].forEach((m, i) => bell(m, t + i * 0.09, 0.09, sfxBus, 1.2));
    }
  };

  function play(name, ...args) {
    init();
    if (!ctx || !sfxOn || !fx[name]) return;
    try { fx[name](...args); } catch (e) { console.warn(e); }
  }

  /* ---------- Contrôle qualité : rendu hors ligne (niveaux, absence d'erreurs) ---------- */
  // Sound.renderTest('menu', 12) → { peak, rms } sans rien jouer à voix haute.
  async function renderTest(name, seconds = 10) {
    stopMusic(); // le graphe est temporairement remplacé : rien ne doit jouer pendant le rendu
    const saved = { ctx, master, musicBus, musicTone, leadBus, sfxBus, voiceBus, reverb, noiseBuf, song };
    const off = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
    buildGraph(off);
    musicBus.gain.value = 0.55; sfxBus.gain.value = 0.8;
    if (SONGS[name]) {
      song = SONGS[name];
      const stepDur = 60 / song.bpm / 4;
      for (let s = 0, t = 0.05; t < seconds - 0.2; s++, t += stepDur) scheduleStep(s, t);
    } else if (fx[name]) {
      fx[name]();
    }
    const buf = await off.startRendering();
    ({ ctx, master, musicBus, musicTone, leadBus, sfxBus, voiceBus, reverb, noiseBuf, song } = saved);
    let peak = 0, sum = 0, n = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; }
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) };
  }

  /* ---------- Lecture vocale ---------- */
  // 1) Voix enregistrée intégrée (Piper « siwis ») : fichiers audio/voix/<empreinte>.mp3, listés dans data/voice.js.
  // 2) Sinon, voix de synthèse de l'appareil (au choix dans les Réglages).
  const VOICE = window.QUIZ_VOICE || null;
  const clips = new Set(VOICE && VOICE.has ? VOICE.has.split(' ') : []);
  const LETTERS = ['A', 'B', 'C', 'D'];
  function vhash(s) { // identique à tools/make-voice.js et js/engine.js
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const hasClip = text => clips.has(vhash(text));
  const clipCache = new Map();
  function loadClip(text) {
    const h = vhash(text);
    if (!clipCache.has(h)) {
      clipCache.set(h, fetch('audio/voix/' + h + '.mp3')
        .then(r => (r.ok ? r.arrayBuffer() : null))
        .then(ab => ab && new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .catch(() => null)
        .then(b => { if (!b) clipCache.delete(h); return b; }));
    }
    return clipCache.get(h);
  }

  let voiceSources = [], voiceToken = 0, voiceTimer = null;
  function voiceDuck(on) { voiceDuckLevel = on ? 0.5 : 1; applyVolumes(); }
  function stopClips() {
    voiceToken++;
    clearTimeout(voiceTimer);
    voiceSources.forEach(s => { try { s.stop(); } catch (e) { /* déjà arrêtée */ } });
    voiceSources = [];
    if (voiceDuckLevel !== 1) voiceDuck(false);
  }
  // Joue une suite de textes enregistrés avec des pauses ; false si un enregistrement manque.
  function playClips(parts, onEnd, fallbackText) {
    init();
    if (!ctx || !parts.every(p => hasClip(p.text))) return false;
    stopClips(); stopDevice();
    const tok = voiceToken;
    Promise.all(parts.map(p => loadClip(p.text))).then(bufs => {
      if (tok !== voiceToken) return;
      if (bufs.some(b => !b)) { speakDevice(fallbackText, onEnd); return; } // fichier introuvable : relais
      const rate = voiceOpts.rate;
      let t = ctx.currentTime + 0.05;
      voiceDuck(true);
      bufs.forEach((b, i) => {
        const s = ctx.createBufferSource();
        s.buffer = b; s.playbackRate.value = rate;
        s.connect(voiceBus); s.start(t);
        voiceSources.push(s);
        t += b.duration / rate + (parts[i].gap || 0) / rate;
      });
      voiceTimer = setTimeout(() => {
        if (tok !== voiceToken) return;
        voiceSources = []; voiceDuck(false);
        onEnd && onEnd();
      }, (t - ctx.currentTime) * 1000);
    });
    return true;
  }

  // Voix de l'appareil
  let voice = null;
  const HAS_SYNTH = 'speechSynthesis' in window;
  const rankVoice = v => (/premium|enhanced|améliorée|natural|neural|online/i.test(v.name) ? 4 : 0)
    + (/google/i.test(v.name) ? 2 : 0) + (/^fr[-_]FR/i.test(v.lang) ? 1 : 0);
  function listVoices() {
    if (!HAS_SYNTH) return [];
    return speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang))
      .sort((a, b) => rankVoice(b) - rankVoice(a) || a.name.localeCompare(b.name))
      .map(v => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));
  }
  function pickVoice() {
    if (!HAS_SYNTH) return;
    const all = speechSynthesis.getVoices();
    const fr = all.filter(v => /^fr/i.test(v.lang)).sort((a, b) => rankVoice(b) - rankVoice(a));
    voice = all.find(v => v.voiceURI === voiceOpts.uri) || fr[0] || null;
  }
  let voicesListener = null;
  if (HAS_SYNTH) {
    pickVoice();
    speechSynthesis.onvoiceschanged = () => { pickVoice(); if (voicesListener) voicesListener(); };
  }
  // Une relecture (bouton 🔊) reprend le rappel en attente : le chrono attend la fin de la dernière lecture.
  let current = null, pending = null;
  function speakDevice(text, onEnd) {
    if (!HAS_SYNTH) { onEnd && onEnd(); return; }
    if (onEnd) pending = onEnd;
    current = null;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (voice) u.voice = voice; u.rate = voiceOpts.rate; u.pitch = 1;
    current = u;
    const finish = () => {
      if (u !== current) return; // lecture remplacée ou arrêtée
      current = null;
      const cb = pending; pending = null;
      cb && cb();
    };
    u.onend = finish; u.onerror = finish;
    setTimeout(finish, (1500 + text.length * 75) / voiceOpts.rate); // garde-fou si l'événement ne vient jamais
    speechSynthesis.speak(u);
  }
  function stopDevice() {
    current = null; pending = null;
    if (HAS_SYNTH) speechSynthesis.cancel();
  }

  // Lit une question puis ses réponses dans l'ordre affiché (« A : … ; B : … »).
  function speakQuestion(question, answers, onEnd) {
    const text = question + ' … ' + answers.map((a, i) => LETTERS[i] + ' : ' + a).join(' ; ');
    if (voiceOpts.mode === 'natural') {
      const parts = [{ text: question, gap: 0.55 }];
      answers.forEach((a, i) => parts.push({ text: LETTERS[i], gap: 0.12 }, { text: a, gap: 0.42 }));
      if (playClips(parts, onEnd, text)) return;
    }
    stopClips();
    speakDevice(text, onEnd);
  }
  // Lit un texte seul (bouton 🔊, test des Réglages).
  function speak(text, onEnd) {
    if (voiceOpts.mode === 'natural' && playClips([{ text }], onEnd, text)) return;
    stopClips();
    speakDevice(text, onEnd);
  }
  const stopSpeech = () => { stopClips(); stopDevice(); };
  const canSpeak = () => clips.size > 0 || HAS_SYNTH;

  return {
    init, configure, playMusic, stopMusic, duck, play, renderTest, current: () => songName,
    speak, speakQuestion, stopSpeech, canSpeak, listVoices, hasClip,
    onVoicesChanged: fn => { voicesListener = fn; },
    voiceInfo: () => ({ natural: clips.size, credit: VOICE ? VOICE.credit : '', sample: VOICE ? VOICE.sample : '' })
  };
})();
