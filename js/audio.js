/* Sons synthétisés (aucun fichier audio nécessaire) : musique douce, pas, ambiance, effets */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var ctx = null, maitre, busMusique, busEffets, bruit, ambianceNoeud = null;
  var musiqueOn = true;
  try { musiqueOn = localStorage.getItem('av_musique') !== '0'; } catch (e) { }

  var themes = {
    hub:         { base: 65, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 80, onde: 'triangle', grelots: true },
    plage:       { base: 62, gamme: [0, 2, 4, 7, 9, 12, 14], tempo: 70, onde: 'sine' },
    foret_neige: { base: 64, gamme: [0, 2, 3, 7, 9, 12, 14, 15], tempo: 66, onde: 'triangle', grelots: true },
    ville_nuit:  { base: 57, gamme: [0, 3, 5, 7, 10, 12, 15], tempo: 88, onde: 'sine' },
    camargue:    { base: 62, gamme: [0, 2, 4, 5, 7, 9, 12, 14], tempo: 84, onde: 'triangle' },
    cinema:      { base: 58, gamme: [0, 4, 7, 9, 11, 14, 16], tempo: 62, onde: 'sine' },
    rooftop:     { base: 57, gamme: [0, 4, 7, 11, 14, 16, 19], tempo: 72, onde: 'sine' },
    trail:       { base: 64, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 150, onde: 'triangle' },
    peyrou:      { base: 62, gamme: [0, 2, 4, 7, 9, 11, 12, 14], tempo: 92, onde: 'triangle' },
    appart:      { base: 60, gamme: [0, 4, 7, 9, 11, 14, 16], tempo: 72, onde: 'sine', grelots: true },
    paddle:      { base: 62, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 100, onde: 'triangle' },
    hortus:      { base: 59, gamme: [0, 2, 4, 7, 9, 12, 14, 16, 19], tempo: 58, onde: 'sine', grelots: true },
    golf:        { base: 60, gamme: [0, 2, 4, 7, 9, 11, 12, 14, 16], tempo: 96, onde: 'triangle' },
    lac_nuit:    { base: 55, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 52, onde: 'sine', grelots: true },
    plage_soir:  { base: 57, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 70, onde: 'triangle', grelots: true },
    chalet:      { base: 60, gamme: [0, 2, 4, 5, 7, 9, 12, 14], tempo: 84, onde: 'triangle', grelots: true },
    parapente:   { base: 62, gamme: [0, 2, 4, 7, 9, 12, 14, 16, 19], tempo: 78, onde: 'sine', grelots: true },
    riviere:     { base: 62, gamme: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 70, onde: 'sine', grelots: true },
    bowling:     { base: 55, gamme: [0, 3, 5, 7, 10, 12, 15, 17], tempo: 122, onde: 'square' },
    chambre:     { base: 60, gamme: [0, 3, 5, 7, 10, 12, 15], tempo: 104, onde: 'triangle' },
    lagazuoi:    { base: 62, gamme: [0, 2, 4, 5, 7, 9, 12, 14, 16], tempo: 90, onde: 'triangle', grelots: true },
    comedie:     { base: 62, gamme: [0, 2, 4, 7, 9, 11, 12, 14, 16], tempo: 88, onde: 'triangle', grelots: true },
    lumieres:    { base: 57, gamme: [0, 4, 7, 11, 14, 16, 19, 21], tempo: 58, onde: 'sine', grelots: true },
    restinclieres: { base: 62, gamme: [0, 2, 4, 5, 7, 9, 11, 12, 14], tempo: 76, onde: 'triangle', grelots: true },
    anniv:       { base: 62, gamme: [0, 2, 4, 5, 7, 9, 12, 14, 16], tempo: 96, onde: 'triangle', grelots: true },
    defaut:     { base: 60, gamme: [0, 2, 4, 7, 9, 12], tempo: 76, onde: 'triangle' }
  };
  var theme = themes.hub, prochain = 0, pas = 0, degre = 3;

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maitre = ctx.createGain(); maitre.gain.value = 0.9; maitre.connect(ctx.destination);
    busMusique = ctx.createGain(); busMusique.gain.value = musiqueOn ? 0.22 : 0; busMusique.connect(maitre);
    busEffets = ctx.createGain(); busEffets.gain.value = 0.7; busEffets.connect(maitre);
    // petit écho pour la musique
    var delai = ctx.createDelay(); delai.delayTime.value = 0.32;
    var retour = ctx.createGain(); retour.gain.value = 0.28;
    busMusique.connect(delai); delai.connect(retour); retour.connect(delai); retour.connect(maitre);
    // tampon de bruit blanc
    bruit = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = bruit.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(planifier, 60);
  }

  function note(m, t, duree, vol, onde, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = onde; o.frequency.value = freq(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(dest || busEffets);
    o.start(t); o.stop(t + duree + 0.05);
  }

  function planifier() {
    if (!ctx || !musiqueOn) return;
    var dur = 60 / theme.tempo / 2;
    if (prochain < ctx.currentTime) prochain = ctx.currentTime + 0.05;
    while (prochain < ctx.currentTime + 0.25) {
      var t = prochain, g = theme.gamme;
      if (pas % 16 === 0) note(theme.base - 12 + g[[0, 3, 4, 2][(pas / 16) % 4] % g.length], t, dur * 14, 0.22, 'sine', busMusique);
      if (pas % 2 === 0 ? Math.random() < 0.8 : Math.random() < 0.25) {
        degre += Math.floor(Math.random() * 5) - 2;
        if (degre < 0) degre = 1; if (degre >= g.length) degre = g.length - 2;
        note(theme.base + g[degre], t, dur * 5, 0.16, theme.onde, busMusique);
      }
      if (theme.grelots && pas % 8 === 4 && Math.random() < 0.5) {
        note(theme.base + 24 + g[Math.floor(Math.random() * 3)], t, 0.6, 0.04, 'sine', busMusique);
      }
      pas++;
      prochain += dur;
    }
  }

  function bruitCourt(frequence, q, duree, vol, t) {
    var s = ctx.createBufferSource(); s.buffer = bruit;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = frequence; f.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    s.connect(f); f.connect(g); g.connect(busEffets);
    s.start(t, Math.random() * 1.5); s.stop(t + duree + 0.02);
  }

  var surfaces = {
    neige: [1600, 0.9, 0.12, 0.35], sable: [500, 0.7, 0.14, 0.3], pave: [2600, 2, 0.05, 0.25],
    herbe: [1200, 0.6, 0.09, 0.22], glace: [3200, 3, 0.05, 0.2], bois: [400, 2, 0.07, 0.4],
    moquette: [700, 0.5, 0.07, 0.14], eau: [900, 0.7, 0.16, 0.4], gravier: [2100, 0.8, 0.1, 0.32]
  };
  var sourdineOn = false, projo = null, droneSon = null, souffleSon = null;
  // petit matin : gazouillis d'oiseaux
  function oiseau() {
    var t = ctx.currentTime, dest = sortie(Math.random() * 1.6 - 0.8), f0 = 2600 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var d = t + i * (0.09 + Math.random() * 0.05), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0 * (1 + Math.random() * 0.2), d); o.frequency.exponentialRampToValueAtTime(f0 * (0.7 + Math.random() * 0.6), d + 0.07);
      g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.012, d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.08);
      o.connect(g); g.connect(dest); o.start(d); o.stop(d + 0.1);
    }
  }

  // nuit d'été : stridulations de grillons (un peu partout autour) et une grenouille de temps en temps
  function sortie(pan) {
    if (!ctx.createStereoPanner) return busEffets;
    var p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(busEffets);
    return p;
  }
  function grillon() {
    var t = ctx.currentTime, f = 4300 + Math.random() * 700, v = 0.008 + Math.random() * 0.016, dest = sortie(Math.random() * 2 - 1);
    for (var i = 0; i < 3; i++) {
      var d = t + i * 0.034, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(v, d + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.022);
      o.connect(g); g.connect(dest); o.start(d); o.stop(d + 0.03);
    }
  }
  function grenouille() {
    var t = ctx.currentTime, dest = sortie(Math.random() * 1.4 - 0.7);
    for (var i = 0; i < 2; i++) {
      var d = t + i * 0.22, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, d); o.frequency.linearRampToValueAtTime(140, d + 0.15);
      fl.type = 'bandpass'; fl.frequency.value = 650; fl.Q.value = 3;
      g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.05, d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.16);
      o.connect(fl); fl.connect(g); g.connect(dest); o.start(d); o.stop(d + 0.2);
    }
  }

  AV.audio = {
    init: init,
    themes: themes,
    musiqueActive: function () { return musiqueOn; },
    basculerMusique: function () {
      musiqueOn = !musiqueOn;
      try { localStorage.setItem('av_musique', musiqueOn ? '1' : '0'); } catch (e) { }
      if (ctx) busMusique.gain.setTargetAtTime(musiqueOn && !sourdineOn ? 0.22 : 0, ctx.currentTime, 0.2);
      return musiqueOn;
    },
    // coupe la musique (pendant un film par exemple)
    sourdine: function (on) {
      sourdineOn = !!on;
      if (ctx) busMusique.gain.setTargetAtTime(musiqueOn && !sourdineOn ? 0.22 : 0, ctx.currentTime, 0.4);
    },
    // miaulement : apeuré (« MRRAOUUU ! ») ou doux (« miaou ? », pour les indices)
    miaou: function (vol, doux) {
      if (!ctx) return;
      vol = vol == null ? 1 : vol;
      var t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      var k = doux ? 0.9 + Math.random() * 0.2 : 1, dur = doux ? 0.55 : 0.75;
      o.type = 'sawtooth';
      if (doux) {
        o.frequency.setValueAtTime(520 * k, t); o.frequency.linearRampToValueAtTime(780 * k, t + 0.16);
        o.frequency.linearRampToValueAtTime(640 * k, t + 0.32); o.frequency.exponentialRampToValueAtTime(430 * k, t + dur);
      } else {
        o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(900, t + 0.12);
        o.frequency.linearRampToValueAtTime(700, t + 0.35); o.frequency.exponentialRampToValueAtTime(380, t + dur);
      }
      f.type = 'bandpass'; f.Q.value = doux ? 4 : 3;
      f.frequency.setValueAtTime(doux ? 700 : 900, t); f.frequency.linearRampToValueAtTime(doux ? 1600 : 2200, t + 0.15); f.frequency.linearRampToValueAtTime(700, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((doux ? 0.28 : 0.35) * vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(busEffets); o.start(t); o.stop(t + dur + 0.05);
      if (!doux) bruitCourt(3000, 1, 0.4, 0.12, t + 0.05);
    },
    // son d'indice propre à l'animal (miaulement pour le chat, sinon petit carillon)
    indice: function (animal, vol) {
      if (animal === 'chat') AV.audio.miaou(0.35 + vol * 0.65, true);
      else if (animal === 'calopsite') AV.audio.sifflet(0.35 + vol * 0.65);
      else if (animal === 'loutre') AV.audio.couinement(0.35 + vol * 0.65);
      else if (animal === 'loulou') { AV.audio.miam(0.3 + vol * 0.7); setTimeout(function () { AV.audio.couinement(0.25 + vol * 0.5); }, 450); }
      else AV.audio.ping(vol);
    },
    // petits couinements de loutre : « hi-hi-hi ! »
    couinement: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      for (var i = 0; i < 3; i++) {
        var d = t + i * 0.11, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(1500 + i * 120, d); o.frequency.exponentialRampToValueAtTime(2300 + i * 150, d + 0.05); o.frequency.exponentialRampToValueAtTime(1300, d + 0.09);
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.12 * v, d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.09);
        o.connect(g); g.connect(busEffets); o.start(d); o.stop(d + 0.12);
      }
    },
    // ronronnement de chat (une respiration : ~1,2 s)
    ronron: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      for (var i = 0; i < 22; i++) bruitCourt(95 + (i % 2) * 20, 0.9, 0.05, (0.1 + 0.08 * Math.sin(i / 21 * Math.PI)) * v, t + i * 0.052);
    },
    // on croque dans un krapfen : « crounch… miam »
    miam: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      for (var i = 0; i < 3; i++) { bruitCourt(900 + Math.random() * 500, 1.2, 0.09, 0.22 * v, t + i * 0.13); bruitCourt(2600, 2, 0.04, 0.06 * v, t + i * 0.13 + 0.02); }
      note(76, t + 0.45, 0.18, 0.05 * v, 'sine'); note(79, t + 0.6, 0.25, 0.05 * v, 'sine');
    },
    // tintement de verres : « tchin ! »
    tchin: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      [[2637, 0.9], [3520, 0.7], [4186, 0.5], [2793, 0.6]].forEach(function (p, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), d = t + (i > 1 ? 0.07 : 0);
        o.type = 'sine'; o.frequency.value = p[0];
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.07 * p[1] * v, d + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, d + 1.1);
        o.connect(g); g.connect(busEffets); o.start(d); o.stop(d + 1.2);
      });
    },
    // vin qui coule dans un verre
    glouglou: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var k = 0; k < 9; k++) bruitCourt(500 + k * 60 + Math.random() * 80, 6, 0.09, 0.35, t + k * 0.09);
    },
    // sifflement de calopsite : « tuii-tuiit ! »
    sifflet: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime;
      [[0, 1700, 2500, 0.16], [0.22, 1900, 2900, 0.2]].forEach(function (s) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(s[1], t + s[0]); o.frequency.exponentialRampToValueAtTime(s[2], t + s[0] + s[3]);
        g.gain.setValueAtTime(0.0001, t + s[0]); g.gain.linearRampToValueAtTime(0.16 * (vol == null ? 1 : vol), t + s[0] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + s[0] + s[3]);
        o.connect(g); g.connect(busEffets); o.start(t + s[0]); o.stop(t + s[0] + s[3] + 0.05);
      });
    },
    // cacardements de flamants + battements d'ailes
    flamants: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      for (var i = 0; i < 7; i++) {
        var d = t + i * 0.13 + Math.random() * 0.08, f = 330 + Math.random() * 140;
        var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(f, d); o.frequency.linearRampToValueAtTime(f * 0.8, d + 0.12);
        fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = 2;
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.09 * v, d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.14);
        o.connect(fl); fl.connect(g); g.connect(busEffets); o.start(d); o.stop(d + 0.2);
      }
      for (var k = 0; k < 10; k++) bruitCourt(500 + Math.random() * 300, 0.8, 0.12, 0.25 * v, t + 0.3 + k * 0.11);
    },
    // ronronnement mécanique du projecteur (on / off)
    projecteur: function (on, duree) {
      if (!ctx) return;
      if (on && duree) { // s'arrête tout seul (fondu) au bout de `duree` s
        var self = this; this.projecteur(true);
        var moi = projo;
        setTimeout(function () { if (projo === moi) self.projecteur(false); }, duree * 1000);
        return;
      }
      if (projo) { var p = projo; projo = null; p.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); setTimeout(function () { try { p.s.stop(); p.lfo.stop(); } catch (e) { } }, 1200); }
      if (!on) return;
      var t = ctx.currentTime;
      note(40, t, 0.25, 0.25, 'square'); bruitCourt(300, 1, 0.3, 0.4, t);
      var s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      var g = ctx.createGain(); g.gain.value = 0;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.type = 'square'; lfo.frequency.value = 24; lg.gain.value = 0.025;
      lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(busEffets);
      g.gain.setTargetAtTime(0.04, t + 0.2, 0.3);
      s.start(); lfo.start();
      projo = { s: s, g: g, lfo: lfo };
    },
    theme: function (nom) { theme = themes[nom] || themes.defaut; degre = 3; },
    pas: function (surface) {
      if (!ctx) return;
      var s = surfaces[surface] || surfaces.herbe;
      bruitCourt(s[0] * (0.85 + Math.random() * 0.3), s[1], s[2], s[3], ctx.currentTime);
    },
    saut: function () {
      if (!ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(busEffets); o.start(t); o.stop(t + 0.25);
    },
    ping: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime;
      note(96, t, 0.5, 0.12 * vol, 'sine'); note(100, t + 0.09, 0.6, 0.1 * vol, 'sine');
    },
    clic: function () { if (ctx) note(84, ctx.currentTime, 0.12, 0.08, 'triangle'); },
    // bowling : la boule qui roule (grondement) et les quilles qui s'entrechoquent
    roule: function (duree, vol) {
      if (!ctx) return; var t = ctx.currentTime, v = vol == null ? 1 : vol;
      for (var i = 0; i < duree * 8; i++) bruitCourt(110 + Math.random() * 40, 1.2, 0.16, 0.16 * v * (0.7 + 0.3 * Math.sin(i)), t + i / 8);
    },
    quilles: function (n) {
      if (!ctx || !n) return; var t = ctx.currentTime;
      bruitCourt(900, 0.8, 0.12, 0.35, t);
      for (var i = 0; i < n * 2; i++) { bruitCourt(1600 + Math.random() * 2200, 3, 0.06, 0.12 + Math.random() * 0.12, t + Math.random() * 0.5); note(79 + Math.floor(Math.random() * 10), t + Math.random() * 0.4, 0.05, 0.025, 'triangle'); }
    },
    pinceau: function (vol) { if (ctx) bruitCourt(3800 + Math.random() * 1500, 1.2, 0.09, 0.05 * (vol == null ? 1 : vol), ctx.currentTime); },
    tampon: function () { if (ctx) { bruitCourt(600, 1.5, 0.06, 0.25, ctx.currentTime); note(72, ctx.currentTime, 0.08, 0.05, 'sine'); } },
    victoire: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [72, 76, 79, 84, 88, 91].forEach(function (m, i) { note(m, t + i * 0.09, 0.9, 0.14, 'triangle'); });
      [84, 88, 91, 96].forEach(function (m, i) { note(m, t + 0.6 + i * 0.05, 1.4, 0.06, 'sine'); });
    },
    erreur: function () { if (ctx) { note(55, ctx.currentTime, 0.3, 0.15, 'triangle'); } },
    portail: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 8; i++) note(70 + i * 3, t + i * 0.04, 0.5, 0.06, 'sine');
    },
    // le club frappe la balle : « tchok » sec + petit sifflement
    impact: function (force) {
      if (!ctx) return;
      var t = ctx.currentTime, f = force == null ? 1 : force;
      bruitCourt(3000, 1.2, 0.05, 0.5 * f, t);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      g.gain.setValueAtTime(0.25 * f, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g); g.connect(busEffets); o.start(t); o.stop(t + 0.18);
      bruitCourt(5200, 3, 0.35, 0.05 * f, t + 0.04);
    },
    // « coin coin » de canard (vol 0..1, aigu pour un caneton)
    coin: function (vol, aigu) {
      if (!ctx || vol <= 0.01) return;
      var t = ctx.currentTime, f0 = aigu ? 820 : 420;
      for (var i = 0; i < 2; i++) {
        var d = t + i * 0.17, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, d); o.frequency.linearRampToValueAtTime(f0 * 0.72, d + 0.12);
        fl.type = 'bandpass'; fl.frequency.value = aigu ? 1900 : 1200; fl.Q.value = 2.5;
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.12 * vol, d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.13);
        o.connect(fl); fl.connect(g); g.connect(busEffets); o.start(d); o.stop(d + 0.15);
      }
    },
    // page qu'on tourne
    page: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(2600, 0.6, 0.22, 0.07, t); bruitCourt(5200, 1.2, 0.12, 0.04, t + 0.12);
    },
    // petit bisou (« smack » doux)
    bisou: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(1800, 2.5, 0.06, 0.09, t); bruitCourt(3200, 3, 0.04, 0.05, t + 0.03);
      note(91, t + 0.05, 0.35, 0.04, 'sine');
    },
    // porte d'entrée (poignée + claquement sourd)
    porte: function (ferme) {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(3000, 4, 0.05, 0.05, t);
      if (ferme) { bruitCourt(160, 0.8, 0.3, 0.3, t + 0.08); bruitCourt(900, 1.5, 0.1, 0.08, t + 0.08); }
      else bruitCourt(2200, 3, 0.08, 0.04, t + 0.1);
    },
    // carillon de rêve
    reve: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [79, 83, 86, 91, 95, 98, 103].forEach(function (m, i) { note(m, t + i * 0.16, 1.6, 0.045, 'sine'); });
    },
    // grésillement de la poêle (vol 0..1)
    poele: function (vol) {
      if (!ctx || vol <= 0.01) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 4; i++) bruitCourt(4000 + Math.random() * 3000, 3, 0.05, 0.03 * vol, t + Math.random() * 0.3);
    },
    // coup de pagaie / éclaboussure (k = force)
    plouf: function (k) {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(700 + Math.random() * 300, 0.8, 0.18 + (k || 0) * 0.25, 0.12 + (k || 0) * 0.3, t);
      bruitCourt(2400, 1.5, 0.08, 0.05 + (k || 0) * 0.1, t + 0.03);
    },
    // déclencheur d'appareil photo
    obturateur: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(2600, 2, 0.04, 0.45, t);
      bruitCourt(1800, 2, 0.06, 0.35, t + 0.09);
    },
    // clochette de chèvre (vol 0..1)
    clochette: function (vol) {
      if (!ctx || vol <= 0.01) return;
      var t = ctx.currentTime, f = 1250 + Math.random() * 300;
      [1, 2.76, 5.4].forEach(function (k, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * k;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * vol / (i + 1), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45 - i * 0.1);
        o.connect(g); g.connect(busEffets); o.start(t); o.stop(t + 0.5);
      });
    },
    // bourdonnement du drone : drone(true) / drone(false), droneVitesse(0..1)
    drone: function (on) {
      if (!ctx) return;
      if (droneSon) { var a = droneSon; a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(function () { try { a.o1.stop(); a.o2.stop(); a.s.stop(); } catch (e) { } }, 800); droneSon = null; }
      if (!on) return;
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 150; o2.frequency.value = 223;
      f.type = 'lowpass'; f.frequency.value = 900;
      var s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      var fb = ctx.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = 700; fb.Q.value = 1.2;
      g.gain.value = 0; g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.4);
      o1.connect(f); o2.connect(f); f.connect(g); s.connect(fb); fb.connect(g); g.connect(busEffets);
      o1.start(); o2.start(); s.start();
      droneSon = { o1: o1, o2: o2, s: s, g: g, f: f };
    },
    droneVitesse: function (k) {
      if (!ctx || !droneSon) return;
      var t = ctx.currentTime;
      droneSon.o1.frequency.setTargetAtTime(150 + k * 70, t, 0.2);
      droneSon.o2.frequency.setTargetAtTime(223 + k * 105, t, 0.2);
      droneSon.f.frequency.setTargetAtTime(900 + k * 900, t, 0.2);
    },
    // une personne qui applaudit
    bravo: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 14; i++) bruitCourt(2100 + Math.random() * 600, 1.6, 0.04, 0.22, t + i * 0.13 + Math.random() * 0.03);
    },
    // trousseau de clés qui tinte
    cles: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 6; i++) {
        var d = t + i * 0.045 + Math.random() * 0.03, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 3200 + Math.random() * 2600;
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.05, d + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.25);
        o.connect(g); g.connect(busEffets); o.start(d); o.stop(d + 0.3);
      }
    },
    // la foule s'émerveille (« Ohhh ! » + applaudissements + sifflets)
    acclamations: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      var s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.9;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 1.2); g.gain.linearRampToValueAtTime(0.22, t + 4); g.gain.exponentialRampToValueAtTime(0.0001, t + 9);
      f.frequency.setValueAtTime(450, t); f.frequency.linearRampToValueAtTime(900, t + 1.5);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start(t); s.stop(t + 9.2);
      for (var i = 0; i < 70; i++) bruitCourt(1800 + Math.random() * 1500, 1.5, 0.05, 0.12 + Math.random() * 0.1, t + 1 + Math.random() * 6); // applaudissements
      [1.6, 2.8, 4.1].forEach(function (d) {
        var o = ctx.createOscillator(), gg = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1500, t + d); o.frequency.exponentialRampToValueAtTime(2900, t + d + 0.25); o.frequency.exponentialRampToValueAtTime(2200, t + d + 0.55);
        gg.gain.setValueAtTime(0.0001, t + d); gg.gain.linearRampToValueAtTime(0.06, t + d + 0.05); gg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.6);
        o.connect(gg); gg.connect(busEffets); o.start(t + d); o.stop(t + d + 0.65);
      });
    },
    // variomètre de parapente : un bip, d'autant plus aigu que ça monte (taux en m/s)
    vario: function (taux) {
      if (!ctx) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 700 + Math.min(5, taux) * 160;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.008); g.gain.setValueAtTime(0.035, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(busEffets); o.start(t); o.stop(t + 0.12);
    },
    // souffle du vent relatif en vol : souffle(true/false), souffleVitesse(0..1)
    souffle: function (on) {
      if (!ctx) return;
      if (souffleSon) { var a = souffleSon; a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(function () { try { a.s.stop(); } catch (e) { } }, 1500); souffleSon = null; }
      if (!on) return;
      var s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
      var g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.8);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start();
      souffleSon = { s: s, g: g, f: f };
    },
    souffleVitesse: function (k) {
      if (!ctx || !souffleSon) return;
      var t = ctx.currentTime;
      souffleSon.f.frequency.setTargetAtTime(300 + k * 900, t, 0.3);
      souffleSon.g.gain.setTargetAtTime(0.03 + k * 0.08, t, 0.3);
    },
    // « Aaaaah ! » (cri de vertige)
    cri: function () {
      if (!ctx) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain();
      var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.linearRampToValueAtTime(480, t + 0.25); o.frequency.linearRampToValueAtTime(400, t + 1.6);
      vib.frequency.value = 7; vg.gain.value = 14; vib.connect(vg); vg.connect(o.frequency);
      f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 5;
      f2.type = 'bandpass'; f2.frequency.value = 1250; f2.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.08); g.gain.setValueAtTime(0.2, t + 1.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(busEffets);
      o.start(t); vib.start(t); o.stop(t + 1.85); vib.stop(t + 1.85);
    },
    // mouette : « kiaaa-kiaa » rauque (pan -1..1)
    mouette: function (pan) {
      if (!ctx) return;
      var t = ctx.currentTime, dest = sortie(pan || 0), n = 2 + Math.floor(Math.random() * 2);
      for (var i = 0; i < n; i++) {
        var d = t + i * 0.24, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), f0 = 1250 + Math.random() * 250;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 0.75, d); o.frequency.linearRampToValueAtTime(f0, d + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, d + 0.2);
        f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 2.5;
        g.gain.setValueAtTime(0.0001, d); g.gain.linearRampToValueAtTime(0.09, d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, d + 0.21);
        o.connect(f); f.connect(g); g.connect(dest); o.start(d); o.stop(d + 0.23);
      }
    },
    // bzzz de moustique (vol 0..1, pan -1..1)
    bzz: function (vol, pan) {
      if (!ctx) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 560 + Math.random() * 120;
      vib.frequency.value = 9 + Math.random() * 6; vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
      f.type = 'highpass'; f.frequency.value = 900;
      var v = 0.03 * (vol == null ? 1 : vol);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.15); g.gain.setValueAtTime(v, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(f); f.connect(g); g.connect(sortie(pan || 0)); o.start(t); vib.start(t); o.stop(t + 0.85); vib.stop(t + 0.85);
    },
    // claquement de mains
    claque: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      bruitCourt(1500, 0.9, 0.09, 0.6, t);
      bruitCourt(2600, 1.5, 0.05, 0.3, t + 0.005);
    },
    // vœu exaucé : petite pluie de notes cristallines (étoile filante repérée)
    etoile: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [84, 88, 91, 96, 100, 103].forEach(function (m, i) { note(m, t + i * 0.055, 0.9, 0.07, 'sine'); });
      note(108, t + 0.38, 1.4, 0.035, 'sine');
    },
    // cloche du tram (« ding ding »)
    tram: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [0, 0.32].forEach(function (d) {
        [1, 2.4, 3.9].forEach(function (k, i) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = 880 * k;
          g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.06 / (i + 1), t + d + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.7);
          o.connect(g); g.connect(busEffets); o.start(t + d); o.stop(t + d + 0.75);
        });
      });
    },
    // souffle de lumière qui passe (comète, balayage)
    whoosh: function (vol) {
      if (!ctx) return;
      var t = ctx.currentTime, v = vol == null ? 1 : vol;
      var s = ctx.createBufferSource(); s.buffer = bruit;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.9); f.frequency.exponentialRampToValueAtTime(900, t + 1.6);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3 * v, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start(t, Math.random()); s.stop(t + 1.8);
    },
    // scintillement magique (arpège montant)
    scintille: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [72, 76, 79, 84, 88, 91, 96, 100].forEach(function (m, i) { note(m, t + i * 0.07, 1.1, 0.06, 'sine'); });
      note(103, t + 0.62, 1.8, 0.04, 'triangle');
    },
    // soupape de cocotte-minute : « pschhhh » (long = on lâche la pression)
    cocotte: function (long) {
      if (!ctx) return;
      var t = ctx.currentTime, d = long ? 2.2 : 0.35;
      var s = ctx.createBufferSource(); s.buffer = bruit;
      var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = long ? 2400 : 3600;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(long ? 0.34 : 0.07, t + 0.06);
      g.gain.setValueAtTime(long ? 0.3 : 0.06, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start(t, Math.random()); s.stop(t + d + 0.05);
    },
    // cuillère qui tinte sur la cocotte
    cuillere: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      [[1870, 0.07], [2950, 0.04], [4400, 0.025]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = p[0] * (0.97 + Math.random() * 0.06);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p[1], t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g); g.connect(busEffets); o.start(t); o.stop(t + 0.5);
      });
    },
    // roulement de tambour (suspense) pendant « duree » secondes
    roulement: function (duree) {
      if (!ctx) return;
      var t = ctx.currentTime, n = Math.floor((duree || 1.2) / 0.045);
      for (var i = 0; i < n; i++) bruitCourt(220 + (i % 2) * 40, 1.2, 0.05, 0.05 + 0.12 * i / n, t + i * 0.045);
      bruitCourt(180, 0.8, 0.3, 0.3, t + n * 0.045);
    },
    // ça brûle ! souffle de flammes
    flammes: function () {
      if (!ctx) return;
      var t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = bruit;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1600, t + 0.3); f.frequency.exponentialRampToValueAtTime(300, t + 1.1);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start(t, Math.random()); s.stop(t + 1.25);
    },
    // on boit d'un trait : « glou glou glou »
    gloups: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var k = 0; k < 6; k++) { bruitCourt(320 + (k % 2) * 90, 5, 0.12, 0.4, t + k * 0.2); note(52 + (k % 2) * 3, t + k * 0.2, 0.1, 0.05, 'sine'); }
    },
    // « Joyeux anniversaire » (mélodie traditionnelle) : renvoie sa durée en secondes ; la famille chante (voix douces + accords)
    joyeuxAnniversaire: function () {
      if (!ctx) return 0;
      var b = 0.42, t0 = ctx.currentTime + 0.15, t = t0;
      var M = [[67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
               [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
               [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2.5],
               [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3]];
      var ACC = [[60, 0], [55, 6], [60, 12], [65, 18], [60, 22], [55, 24], [60, 26]];
      M.forEach(function (n) {
        var d = n[1] * b;
        note(n[0], t, d * 1.05, 0.13, 'triangle'); note(n[0] - 12, t, d * 1.05, 0.05, 'sine'); note(n[0] + 0.12, t + 0.01, d, 0.04, 'sawtooth');
        t += d;
      });
      ACC.forEach(function (a) { note(a[0] - 12, t0 + a[1] * b, 6 * b, 0.07, 'sine'); note(a[0] - 5, t0 + a[1] * b, 6 * b, 0.04, 'sine'); });
      return t - t0 + 0.3;
    },
    // on souffle les bougies
    souffleBougies: function () {
      if (!ctx) return;
      var t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = bruit;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.6;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      s.connect(f); f.connect(g); g.connect(busEffets); s.start(t, Math.random()); s.stop(t + 0.95);
    },
    ambiance: function (type) {
      if (!ctx) return;
      if (ambianceNoeud) { try { if (ambianceNoeud.iv) clearInterval(ambianceNoeud.iv); ambianceNoeud.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); var a = ambianceNoeud; setTimeout(function () { a.s.stop(); a.lfo.stop(); }, 1500); } catch (e) { } ambianceNoeud = null; }
      if (!type) return;
      var s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass';
      var g = ctx.createGain(); g.gain.value = 0;
      var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      if (type === 'vagues') { f.frequency.value = 700; lfo.frequency.value = 0.12; lfoG.gain.value = 0.05; g.gain.setTargetAtTime(0.07, ctx.currentTime, 1); }
      else if (type === 'vent') { f.frequency.value = 380; lfo.frequency.value = 0.07; lfoG.gain.value = 0.03; g.gain.setTargetAtTime(0.05, ctx.currentTime, 1); }
      else if (type === 'foule') { f.type = 'bandpass'; f.frequency.value = 550; f.Q.value = 0.8; lfo.frequency.value = 0.3; lfoG.gain.value = 0.015; g.gain.setTargetAtTime(0.05, ctx.currentTime, 1); }
      else if (type === 'aube') { f.frequency.value = 330; lfo.frequency.value = 0.06; lfoG.gain.value = 0.02; g.gain.setTargetAtTime(0.035, ctx.currentTime, 1); }
      else if (type === 'cigales') { f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 5; lfo.frequency.value = 11; lfoG.gain.value = 0.02; g.gain.setTargetAtTime(0.025, ctx.currentTime, 1); }
      else if (type === 'riviere') { f.frequency.value = 1300; lfo.frequency.value = 0.25; lfoG.gain.value = 0.015; g.gain.setTargetAtTime(0.06, ctx.currentTime, 1); }
      else if (type === 'grillons') { f.frequency.value = 260; lfo.frequency.value = 0.05; lfoG.gain.value = 0.006; g.gain.setTargetAtTime(0.018, ctx.currentTime, 1); }
      else { f.frequency.value = 250; lfo.frequency.value = 0.05; lfoG.gain.value = 0.01; g.gain.setTargetAtTime(0.03, ctx.currentTime, 1); }
      lfo.connect(lfoG); lfoG.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(maitre);
      s.start(); lfo.start();
      ambianceNoeud = { s: s, g: g, lfo: lfo };
      if (type === 'aube') ambianceNoeud.iv = setInterval(function () { if (Math.random() < 0.09) oiseau(); }, 200);
      if (type === 'riviere') ambianceNoeud.iv = setInterval(function () { if (Math.random() < 0.35) bruitCourt(5200 + Math.random() * 600, 6, 0.08, 0.006, ctx.currentTime); if (Math.random() < 0.03) oiseau(); }, 90);
      if (type === 'grillons') ambianceNoeud.iv =setInterval(function () { if (Math.random() < 0.5) grillon(); if (Math.random() < 0.01) grenouille(); }, 170);
    }
  };
})(window.AV);
