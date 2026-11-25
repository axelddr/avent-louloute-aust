/* Biome « lac_nuit » : nuit d'été au bord du lac du Crès, en vue à la PREMIÈRE PERSONNE.
   On est allongée sur une serviette, lui juste à côté. Le ciel est celui d'une nuit de mi-août
   vers 23 h vue depuis Le Crès (positions réelles des étoiles) : Grande Ourse au-dessus du lac,
   Cassiopée au nord-est, le Cygne au zénith, la Lyre (Véga), l'Aigle, Pégase, Persée, la Voie lactée.
   C'est la nuit des Perséides : il faut repérer N étoiles filantes (appuyer sur ✋ quand on en voit
   une passer). Elles sont rapides et passent n'importe où, pas forcément là où l'on regarde.
   Pièges : avions et satellites. Ensuite, il offre un cadeau. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var LAT = 43.65 * Math.PI / 180;  // Le Crès
  var LST = 20.6;                   // temps sidéral local (h) : mi-août vers 23 h
  var R = 330;                      // rayon de la sphère des étoiles
  var EAU = -1.6;                   // niveau du lac (la serviette est à 0, sur la berge)
  var LAC = { x: 0, z: -70, rx: 80, rz: 55 };
  var OEIL = new THREE.Vector3(0, 0.26, 0);
  var CIEL = { haut: '#02040f', bas: '#151c42', brouillard: '#070b1c', hemi: ['#6f82cc', '#0a0c16', 0.55], soleil: ['#9fb4ff', 0.22, [-20, 50, 30]] };
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function rad(d) { return d * Math.PI / 180; }
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function alea(a, b) { return a + Math.random() * (b - a); }
  function au_hasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Astronomie ----------
  // RA (heures), Dec (degrés) → direction dans la scène (est = +x, zénith = +y, nord = -z)
  function dirEq(ra, dec) {
    var H = rad((LST - ra) * 15), d = rad(dec);
    var est = -Math.cos(d) * Math.sin(H);
    var nord = Math.sin(d) * Math.cos(LAT) - Math.cos(d) * Math.cos(H) * Math.sin(LAT);
    var haut = Math.sin(d) * Math.sin(LAT) + Math.cos(d) * Math.cos(H) * Math.cos(LAT);
    return new THREE.Vector3(est, haut, -nord);
  }
  function vecEq(raH, dec) { var a = rad(raH * 15), d = rad(dec); return new THREE.Vector3(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)); }
  function eqVersScene(v) { return dirEq(Math.atan2(v.y, v.x) * 12 / Math.PI, Math.asin(Math.max(-1, Math.min(1, v.z))) * 180 / Math.PI); }

  // [RA h, Dec °, magnitude, couleur?]
  var CONSTELLATIONS = [
    { nom: 'La Grande Ourse', etoiles: [[11.062, 61.75, 1.8], [11.031, 56.38, 2.4], [11.897, 53.69, 2.4], [12.257, 57.03, 3.3], [12.900, 55.96, 1.8], [13.399, 54.93, 2.2], [13.792, 49.31, 1.9]],
      traits: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
    { nom: 'La Petite Ourse · l\'étoile polaire', etoiles: [[2.53, 89.26, 2.0, '#fff4d8'], [17.537, 86.59, 4.3], [16.766, 82.04, 4.2], [15.734, 77.79, 4.3], [14.845, 74.16, 2.1, '#ffd9a8'], [15.345, 71.83, 3.0], [16.292, 75.76, 4.9]],
      traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { nom: 'Cassiopée', etoiles: [[0.153, 59.15, 2.3], [0.675, 56.54, 2.2, '#ffe2b8'], [0.945, 60.72, 2.2], [1.430, 60.24, 2.7], [1.907, 63.67, 3.4]],
      traits: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { nom: 'Le Cygne', etoiles: [[20.690, 45.28, 1.25], [20.370, 40.26, 2.2], [19.938, 35.08, 3.9], [19.512, 27.96, 3.1, '#ffd49a'], [20.770, 33.97, 2.5], [21.216, 30.23, 3.2], [19.750, 45.13, 2.9], [19.285, 53.37, 3.8]],
      traits: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [1, 6], [6, 7]] },
    { nom: 'La Lyre · Véga', etoiles: [[18.616, 38.78, 0.03, '#d6e4ff'], [18.746, 37.60, 4.3], [18.835, 33.36, 3.5], [18.982, 32.69, 3.3], [18.908, 36.90, 4.3]],
      traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]] },
    { nom: 'L\'Aigle · Altaïr', etoiles: [[19.846, 8.87, 0.77], [19.771, 10.61, 2.7, '#ffd49a'], [19.922, 6.41, 3.7], [19.090, 13.86, 3.0], [20.188, -0.82, 3.2], [19.425, 3.11, 3.4]],
      traits: [[1, 0], [0, 2], [1, 3], [2, 4], [0, 5]] },
    { nom: 'Pégase', etoiles: [[23.079, 15.21, 2.5], [23.063, 28.08, 2.4, '#ffcf9a'], [0.220, 15.18, 2.8], [0.140, 29.09, 2.1], [21.736, 9.88, 2.4, '#ffcf9a']],
      traits: [[0, 1], [1, 3], [3, 2], [2, 0], [0, 4]] },
    { nom: 'Persée · les Perséides', etoiles: [[3.405, 49.86, 1.8, '#fff4d8'], [3.136, 40.96, 2.1], [3.080, 53.51, 2.9], [3.715, 47.79, 3.0], [3.964, 40.01, 2.9]],
      traits: [[2, 0], [0, 3], [3, 4], [0, 1]] }
  ];
  var ISOLEES = [[14.261, 19.18, -0.05, '#ffc58a'], [5.278, 45.99, 0.1, '#fff0c0'], [16.49, -26.43, 1.0, '#ff9a70'], [22.137, -46.96, 1.7]];

  // ---------- Étoiles : points scintillants (taille et couleur par étoile) ----------
  var VS = 'attribute float taille; attribute float phase; attribute vec3 couleur; uniform float temps; uniform float dpr; varying vec3 vC;' +
    'void main(){ float sc = 0.8 + 0.2 * sin(temps * (1.3 + phase * 1.7) + phase * 6.283);' +
    'vC = couleur * sc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = taille * dpr; }';
  var FS = 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * a * 2.0, 1.0); }';
  function nuageEtoiles(liste) {
    var n = liste.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tai = new Float32Array(n), ph = new Float32Array(n);
    liste.forEach(function (e, i) {
      pos[i * 3] = e.d.x * R; pos[i * 3 + 1] = e.d.y * R; pos[i * 3 + 2] = e.d.z * R;
      col[i * 3] = e.c.r; col[i * 3 + 1] = e.c.g; col[i * 3 + 2] = e.c.b;
      tai[i] = e.taille; ph[i] = e.phase;
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('couleur', new THREE.BufferAttribute(col, 3));
    g.setAttribute('taille', new THREE.BufferAttribute(tai, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    var m = new THREE.ShaderMaterial({ uniforms: { temps: { value: 0 }, dpr: { value: DPR } }, vertexShader: VS, fragmentShader: FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    var p = new THREE.Points(g, m); p.frustumCulled = false;
    return p;
  }
  function etoile(d, mag, couleur, rng) {
    var c = new THREE.Color(couleur || AV.choisir(rng, ['#ffffff', '#fff4e0', '#dfe8ff', '#cfdcff', '#ffe9c8', '#ffffff']));
    c.multiplyScalar(Math.max(0.22, Math.min(1.5, 1.5 - mag * 0.22)));
    return { d: d, taille: Math.max(1.7, Math.min(10, 9 - mag * 1.7)), c: c, phase: rng() };
  }

  function etiquette(texte, hauteur) {
    var c = document.createElement('canvas'), x = c.getContext('2d'), f = '700 40px Nunito, sans-serif';
    x.font = f; var w = Math.ceil(x.measureText(texte).width) + 40;
    c.width = w; c.height = 64;
    x.font = f; x.fillStyle = 'rgba(190,210,255,.95)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,20,.9)'; x.shadowBlur = 8; x.fillText(texte, w / 2, 34);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    s.scale.set(hauteur * w / 64, hauteur, 1);
    return s;
  }

  // ---------- Terrain : berge en pente douce vers le lac, collines de garrigue autour ----------
  function ellipse(x, z) { var ex = (x - LAC.x) / LAC.rx, ez = (z - LAC.z) / LAC.rz; return Math.sqrt(ex * ex + ez * ez); }
  function hauteur(x, z) {
    var e = ellipse(x, z), r = Math.sqrt(x * x + z * z);
    var y = e < 1 ? EAU - 0.4 - (1 - e) * 3 : EAU + lisse(1, 1.2, e) * -EAU;
    var bosses = Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) + 0.5 * Math.sin(x * 0.047 + z * 0.039) + 0.3 * Math.cos(x * 0.09 - z * 0.07);
    y += lisse(18, 70, r) * lisse(1.12, 1.45, e) * (1.6 + bosses * 1.2);
    y += lisse(140, 260, r) * (14 + bosses * 9);
    return y;
  }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col);
    o.position.set(x, y, z); o.rotation.set(0, ry || 0, 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function textureServiette() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var x = c.getContext('2d'), cols = ['#2f6fb5', '#f4efe4', '#e2574c', '#f4efe4', '#f3c34b', '#f4efe4'];
    for (var i = 0; i < 16; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * 16, 128, 16); }
    for (var k = 0; k < 900; k++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.06) + ')'; x.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
    return new THREE.CanvasTexture(c);
  }

  // Personne allongée sur le dos : tête vers +z, pieds vers -z, visage vers le ciel
  function personneAllongee(o) {
    var g = new THREE.Group(), r = { groupe: g, bras: [] };
    r.torse = boite(0.4, 0.2, 0.58, o.haut, 0, 0.11, -0.45); g.add(r.torse);
    g.add(boite(0.36, 0.18, 0.2, o.bas, 0, 0.1, -0.82));
    [-1, 1].forEach(function (c) {
      g.add(boite(0.15, 0.15, 0.85, o.bas, c * 0.1, 0.08, -1.32));
      var pied = boite(0.1, 0.17, 0.09, o.peau, c * 0.11, 0.13, -1.79); pied.rotation.z = c * 0.3; g.add(pied);
      var pv = new THREE.Group(); pv.position.set(c * 0.27, 0.1, -0.2); g.add(pv);
      pv.add(boite(0.1, 0.1, 0.5, o.haut, 0, 0, -0.25));
      var main = AV.maille(new THREE.IcosahedronGeometry(0.055, 0), o.peau); main.position.set(0, 0, -0.53); pv.add(main);
      r.bras.push(pv);
    });
    if (!o.sansTete) {
      g.add(boite(0.1, 0.09, 0.12, o.peau, 0, 0.1, -0.12));
      var tete = new THREE.Group(); tete.position.set(0, 0.12, 0.03); g.add(tete);
      tete.add(AV.maille(new THREE.IcosahedronGeometry(0.12, 1), o.peau));
      var ch = AV.maille(new THREE.IcosahedronGeometry(0.13, 1), o.cheveux); ch.position.set(0, -0.03, 0.035); ch.scale.set(1.03, 0.9, 1.03); tete.add(ch);
      [-1, 1].forEach(function (c) {
        var oe = AV.maille(new THREE.SphereGeometry(0.018, 6, 4), '#2b2340', false); oe.position.set(c * 0.042, 0.112, -0.035); tete.add(oe);
      });
      var nez = AV.maille(new THREE.ConeGeometry(0.02, 0.04, 4), o.peau); nez.position.set(0, 0.128, -0.07); tete.add(nez);
      var bouche = boite(0.045, 0.01, 0.012, '#a8485a', 0, 0.1, -0.098); bouche.castShadow = false; tete.add(bouche);
      r.tete = tete;
    }
    return r;
  }

  // ---------- Étoile filante : ruban effilé + tête lumineuse ----------
  var NSEG = 12;
  function Filante(groupe, mat) {
    var n = (NSEG + 1) * 2, idx = [];
    for (var i = 0; i < NSEG; i++) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setIndex(idx);
    this.maille = new THREE.Mesh(this.geo, mat); this.maille.frustumCulled = false; this.maille.visible = false;
    this.tete = AV.halo('#e8f0ff', 4); this.tete.material.fog = false; this.tete.visible = false;
    groupe.add(this.maille); groupe.add(this.tete);
    this.A = new THREE.Vector3(); this.B = new THREE.Vector3(); this.H = new THREE.Vector3();
    this.actif = false;
  }
  var cTete = new THREE.Color(), cQueue = new THREE.Color(), cTmp = new THREE.Color();
  var vP = new THREE.Vector3(), vT = new THREE.Vector3(), vN = new THREE.Vector3();
  Filante.prototype.maj = function (dt) {
    this.t += dt;
    var k = this.t / this.dur, th = this.arc * Math.min(1, k), tq = Math.max(0, th - this.trace * Math.min(1, k * 2.5));
    var I = this.lum * lisse(0, 0.12, k) * (1 - lisse(0.62, 1, k));
    this.H.copy(this.A).multiplyScalar(Math.cos(th)).addScaledVector(this.B, Math.sin(th));
    if (k >= 1 || this.H.y < 0.05) { this.actif = false; this.maille.visible = this.tete.visible = false; return false; }
    var pos = this.geo.attributes.position.array, col = this.geo.attributes.color.array;
    cTete.set(this.bolide ? '#c8ffd8' : '#eef4ff'); cQueue.set(this.bolide ? '#7affb0' : '#ffc98a');
    for (var i = 0; i <= NSEG; i++) {
      var s = i / NSEG, a = tq + (th - tq) * s;
      vP.copy(this.A).multiplyScalar(Math.cos(a)).addScaledVector(this.B, Math.sin(a));
      vT.copy(this.A).multiplyScalar(-Math.sin(a)).addScaledVector(this.B, Math.cos(a));
      vN.crossVectors(vT, vP);
      var w = this.large * (0.08 + 0.92 * s), j = i * 6;
      pos[j] = vP.x * R + vN.x * w; pos[j + 1] = vP.y * R + vN.y * w; pos[j + 2] = vP.z * R + vN.z * w;
      pos[j + 3] = vP.x * R - vN.x * w; pos[j + 4] = vP.y * R - vN.y * w; pos[j + 5] = vP.z * R - vN.z * w;
      cTmp.copy(cQueue).lerp(cTete, s).multiplyScalar(I * Math.pow(s, 1.5));
      col[j] = col[j + 3] = cTmp.r; col[j + 1] = col[j + 4] = cTmp.g; col[j + 2] = col[j + 5] = cTmp.b;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.tete.position.copy(this.H).multiplyScalar(R);
    var e = (this.bolide ? 9 : 4) * (0.6 + 0.6 * I);
    this.tete.scale.set(e, e, 1);
    this.tete.material.opacity = Math.min(1, I) * 0.9;
    return true;
  };

  // Point lumineux qui glisse lentement (avion, satellite)
  function Glisseur(groupe, couleurs) {
    this.feux = couleurs.map(function (c) { var s = AV.halo(c[0], c[1]); s.material.fog = false; s.visible = false; groupe.add(s); return s; });
    this.A = new THREE.Vector3(); this.B = new THREE.Vector3(); this.H = new THREE.Vector3();
    this.actif = false;
  }

  // =====================================================================
  AV.biomes.lac_nuit = function (cfg) {
    var rng = AV.rng(4004 + cfg.jour);
    var OBJ = cfg.objectif || 5;
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 2, hauteur: hauteur, surface: 'herbe', ciel: CIEL, brouillard: [60, 520],
      depart: { x: 0, z: 0, angle: 0 }, theme: 'lac_nuit', ambiance: 'grillons'
    });
    mo.cielEtLumieres(CIEL);
    mo.sansAnimal = true;
    mo.premierePersonne = { pos: OEIL.clone(), lacet: 0.3, tangage: 0.32, tangMin: -0.75, tangMax: 1.52, champ: 62 };
    var G = mo.groupe;

    // ---------- Le ciel étoilé ----------
    var liste = [], i;
    while (liste.length < 2600) {
      var d = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1), l2 = d.lengthSq();
      if (l2 > 1 || l2 < 0.01) continue;
      d.normalize(); if (d.y < -0.03) d.y = -d.y;
      liste.push(etoile(d, 2.9 + 3 * Math.pow(rng(), 0.45), null, rng));
    }
    var constel = CONSTELLATIONS.map(function (c) {
      var dirs = c.etoiles.map(function (e) { var dd = dirEq(e[0], e[1]); liste.push(etoile(dd, e[2], e[3], rng)); return dd; });
      var pts = [];
      c.traits.forEach(function (t) { [dirs[t[0]], dirs[t[1]]].forEach(function (v) { pts.push(v.x * R * 0.998, v.y * R * 0.998, v.z * R * 0.998); }); });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      var lignes = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#8fa8ff', transparent: true, opacity: 0, depthWrite: false, fog: false }));
      lignes.frustumCulled = false; G.add(lignes);
      var centre = new THREE.Vector3(); dirs.forEach(function (v) { centre.add(v); }); centre.normalize();
      var bas = Infinity; dirs.forEach(function (v) { bas = Math.min(bas, v.dot(centre)); });
      var et = etiquette(c.nom, 8); et.position.copy(centre).multiplyScalar(R * 0.96); et.position.y -= 14; G.add(et);
      return { nom: c.nom, lignes: lignes, etiquette: et, centre: centre, op: 0 };
    });
    ISOLEES.forEach(function (e) { liste.push(etoile(dirEq(e[0], e[1]), e[2], e[3], rng)); });
    var cielEtoiles = nuageEtoiles(liste); G.add(cielEtoiles);

    // La Voie lactée : des milliers de points très pâles le long du plan galactique (plus dense vers le Cygne et le Sagittaire)
    (function () {
      var N = vecEq(12.857, 27.13), C0 = vecEq(17.761, -28.94);
      var Cg = C0.clone().addScaledVector(N, -C0.dot(N)).normalize(), Y = new THREE.Vector3().crossVectors(N, Cg);
      var cygne = eqVersScene(vecEq(20.5, 42)), lv = [], v = new THREE.Vector3();
      for (var k = 0; k < 9000; k++) {
        var L = rng() * Math.PI * 2, bb = Math.sqrt(-2 * Math.log(rng() + 1e-6)) * Math.cos(rng() * Math.PI * 2);
        var b = rad(bb * 6.5 * (1 + 0.8 * Math.max(0, Math.cos(L))));
        if (Math.cos(L) > 0.2 && Math.abs(b - rad(1.5)) < rad(1.8) && rng() < 0.6) continue; // la « Grande Faille » sombre
        v.copy(Cg).multiplyScalar(Math.cos(b) * Math.cos(L)).addScaledVector(Y, Math.cos(b) * Math.sin(L)).addScaledVector(N, Math.sin(b));
        var dd = eqVersScene(v);
        if (dd.y < -0.02) continue;
        var boost = 1 + 0.9 * Math.max(0, dd.dot(cygne)) * Math.max(0, dd.dot(cygne)) + 0.6 * Math.max(0, Math.cos(L));
        var c = new THREE.Color(AV.choisir(rng, ['#aab8e8', '#c4cff0', '#e8dcc8', '#b0bce0'])).multiplyScalar(AV.entre(rng, 0.05, 0.11) * boost);
        lv.push({ d: dd, taille: AV.entre(rng, 2.2, 4.8), c: c, phase: rng() });
        if (k % 45 === 0) {
          var h = AV.halo('#9fb0e0', AV.entre(rng, 60, 120)); h.material.fog = false; h.material.opacity = 0.018 * boost;
          h.position.copy(dd).multiplyScalar(R * 1.02); G.add(h);
        }
      }
      var p = nuageEtoiles(lv); G.add(p);
      mo.anime(function (dt, t) { p.material.uniforms.temps.value = t * 0.3; });
    })();
    // halo orangé de Montpellier au sud-ouest, plus discret de Nîmes à l'est
    [[235, '#ff9a5a', 440, 0.2], [100, '#ffb070', 200, 0.06]].forEach(function (h) {
      var a = rad(h[0]), s = AV.halo(h[1], h[2]); s.material.fog = false; s.material.opacity = h[3];
      s.position.set(Math.sin(a) * 360, 6, -Math.cos(a) * 360); G.add(s);
    });

    // ---------- Le paysage ----------
    G.add(AV.terrain(640, 128, hauteur, function (x, z, y) {
      if (y < EAU + 0.35) return AV.outils.varier('#3a3830', x, z, 0.15);
      if (y > 9) return AV.outils.varier('#161f1a', x, z, 0.2);
      return AV.outils.varier(Math.sin(x * 0.3) * Math.cos(z * 0.27) > 0.3 ? '#22301f' : '#1d2a22', x, z, 0.14);
    }));
    var eau = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhongMaterial({ color: '#0a1430', specular: '#4a5a90', shininess: 70, emissive: '#02040c' }));
    eau.rotation.x = -Math.PI / 2; eau.scale.set(LAC.rx * 1.02, LAC.rz * 1.02, 1); eau.position.set(LAC.x, EAU, LAC.z); G.add(eau);

    // pins parasols, cyprès et buissons de garrigue
    var A = new AV.Fusion(), nArbres = 0;
    for (var ta = 0; ta < 900 && nArbres < 260; ta++) {
      var ra = 9 + Math.pow(rng(), 0.8) * 230, aa = rng() * Math.PI * 2, x = Math.sin(aa) * ra, z = Math.cos(aa) * ra;
      var e = ellipse(x, z);
      if (e < 1.14) continue;
      if (e > 1.7 && ra < 60 && rng() < 0.6) continue;
      var y = hauteur(x, z), sorte = rng();
      if (sorte < 0.5) { // pin parasol
        var h = AV.entre(rng, 6, 10);
        forme(A, new THREE.CylinderGeometry(0.18, 0.3, h, 5), '#1a1512', x, y + h / 2, z, 0, 1, 1, 1);
        forme(A, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#14201a', '#111c17', '#172419']), x + (rng() - 0.5), y + h + 0.6, z, rng() * 3, AV.entre(rng, 3.2, 5), AV.entre(rng, 1.1, 1.7), AV.entre(rng, 3.2, 5));
      } else if (sorte < 0.68) { // cyprès
        var hc = AV.entre(rng, 6, 11);
        forme(A, new THREE.ConeGeometry(0.9, hc, 6), '#0f1a15', x, y + hc / 2, z, rng() * 3, 1, 1, 1);
      } else { // chêne vert / buisson
        forme(A, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#16211a', '#1a261d']), x, y + 0.8, z, rng() * 3, AV.entre(rng, 1.2, 2.6), AV.entre(rng, 0.9, 1.8), AV.entre(rng, 1.2, 2.6));
      }
      nArbres++;
    }
    // touffes d'herbe et petits cailloux autour de la serviette
    for (var tt = 0; tt < 90; tt++) {
      var rt = AV.entre(rng, 1.3, 7), at = rng() * Math.PI * 2, xt = Math.sin(at) * rt + 0.3, zt = Math.cos(at) * rt - 0.8;
      if (rng() < 0.85) forme(A, new THREE.ConeGeometry(0.06, AV.entre(rng, 0.18, 0.38), 3), AV.choisir(rng, ['#2c3f2a', '#34472e', '#263a26']), xt, hauteur(xt, zt) + 0.12, zt, rng() * 3, 1, 1, 1);
      else forme(A, new THREE.IcosahedronGeometry(0.08, 0), '#4a4a48', xt, hauteur(xt, zt) + 0.03, zt, rng() * 3, 1, 0.6, 1.2);
    }
    var arbres = A.maille(); arbres.castShadow = false; G.add(arbres);

    // lumières des villages sur les collines (Le Crès, Castries, Jacou…) et leurs reflets dans le lac
    var lum = [], reflets = [];
    [[-20, -210, 26], [70, -190, 18], [-110, -175, 14], [180, -60, 22], [-190, 40, 16], [150, 160, 12], [-60, 230, 20]].forEach(function (v) {
      for (var k = 0; k < v[2]; k++) {
        var lx = v[0] + (rng() - 0.5) * 50, lz = v[1] + (rng() - 0.5) * 30;
        if (ellipse(lx, lz) < 1.15) continue;
        lum.push(lx, hauteur(lx, lz) + 0.8 + rng() * 2, lz);
        if (Math.abs(lx) < 55 && lz < -150 && reflets.length < 10) {
          var rf = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 20), new THREE.MeshBasicMaterial({ map: AV.textureRonde(), color: '#ffbf70', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
          rf.rotation.x = -Math.PI / 2; rf.position.set(lx, EAU + 0.03, LAC.z - LAC.rz + 10); G.add(rf); reflets.push(rf);
        }
      }
    });
    var gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lum, 3));
    var lumVillages = new THREE.Points(gl, new THREE.PointsMaterial({ color: '#ffd49a', size: 2.4 * DPR, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false }));
    G.add(lumVillages);

    // ---------- La serviette, elle (vue de ses yeux) et lui ----------
    var serviette = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.25), new THREE.MeshLambertMaterial({ map: textureServiette() }));
    serviette.rotation.x = -Math.PI / 2; serviette.position.set(0.31, 0.012, -0.78); serviette.receiveShadow = true; G.add(serviette);
    var elle = personneAllongee({ peau: '#f2c9a0', haut: '#e07a9a', bas: '#3b3550', sansTete: true });
    G.add(elle.groupe);
    var lui = personneAllongee({ peau: '#eec29a', cheveux: '#2b1d14', haut: '#4a7bd1', bas: '#2f3b52' });
    lui.groupe.position.set(0.62, 0, 0); G.add(lui.groupe);
    var tongs = new THREE.Group();
    [[-0.55, -2.05, 0.3, '#e2574c'], [-0.38, -2.15, -0.2, '#e2574c'], [1.05, -2.1, 0.1, '#2f6fb5'], [1.22, -1.98, 0.5, '#2f6fb5']].forEach(function (t) {
      var b = boite(0.11, 0.025, 0.26, t[3], t[0], 0.013, t[1]); b.rotation.y = t[2]; tongs.add(b);
    });
    G.add(tongs);
    // un photophore posé dans l'herbe : juste assez de lumière pour leurs visages
    var photo = new THREE.Group();
    photo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 10), new THREE.MeshPhongMaterial({ color: '#ffe6b0', transparent: true, opacity: 0.45, shininess: 90, depthWrite: false })));
    photo.children[0].position.y = 0.07;
    var flamme = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); flamme.position.y = 0.06; flamme.scale.y = 1.6; photo.add(flamme);
    var haloP = AV.halo('#ffb050', 0.5); haloP.position.y = 0.07; photo.add(haloP);
    photo.position.set(-0.72, 0, 0.42); G.add(photo);
    var lumP = mo.lumiere('#ffb46a', 0.9, 4, -0.72, 0.3, 0.42, true);
    // le cadeau qu'il cache à côté de lui
    var cadeau = new THREE.Group();
    cadeau.add(boite(0.22, 0.18, 0.22, '#e23a5a', 0, 0, 0));
    cadeau.add(boite(0.23, 0.185, 0.045, '#ffd24a', 0, 0, 0));
    cadeau.add(boite(0.045, 0.185, 0.23, '#ffd24a', 0, 0, 0));
    var noeud = boite(0.09, 0.06, 0.09, '#ffd24a', 0, 0.12, 0); noeud.rotation.y = 0.7; cadeau.add(noeud);
    cadeau.position.set(0, 0.12, -0.6); cadeau.scale.setScalar(0.01); cadeau.visible = false;
    lui.bras[0].add(cadeau);
    lui.groupe.updateMatrixWorld(true);
    var teteLui = lui.tete.getWorldPosition(new THREE.Vector3());
    var dirLui = teteLui.clone().sub(OEIL).normalize(), regardLui = 0, prochainClin = 0;

    // ---------- Étoiles filantes, avions, satellites ----------
    var matFilante = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    var filantes = [0, 1, 2, 3].map(function () { return new Filante(G, matFilante); });
    var avion = new Glisseur(G, [['#ff5050', 3.2], ['#ffffff', 4], ['#60ff80', 2.6]]);
    var satellite = new Glisseur(G, [['#e8eeff', 2.6]]);
    avion.prochain = alea(30, 55); satellite.prochain = alea(50, 90);
    var RADIANT = dirEq(3.2, 58); // radiant des Perséides, entre Persée et Cassiopée
    var eclats = [];

    var api = null, horloge = 0, compte = 0, dernierSucces = 0, prochaine = 3.5, verrou = 0, finale = null, forcer = false;
    var modeAide = 0, prochainBavardage = 14, parole = null, regardeElle = 0;
    var cam = null, fwd = new THREE.Vector3(), vTmp = new THREE.Vector3(), qInv = new THREE.Quaternion();

    function aLEcran(dir) {
      if (!cam || dir.dot(fwd) < 0.15) return false;
      vTmp.copy(dir).multiplyScalar(R).project(cam);
      return vTmp.z < 1 && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1;
    }
    function dirTexte(dir) {
      qInv.copy(cam.quaternion).invert();
      var v = vTmp.copy(dir).applyQuaternion(qInv);
      if (v.z > 0.3) return 'derrière toi';
      if (Math.abs(v.x) > Math.abs(v.y)) return v.x < 0 ? 'sur ta gauche' : 'sur ta droite';
      return v.y > 0 ? 'plus haut' : 'plus bas';
    }
    function dire(txt, duree) {
      parole = { texte: '💬 <b>' + nomLui.replace(/</g, '&lt;') + '</b> : ' + txt, t: duree || 3.4 };
      regardeElle = Math.max(regardeElle, Math.min(duree || 3.4, 2.5));
    }
    function sousTitre() {
      if (!api) return;
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, compte >= OBJ ? '🌠 ' + OBJ + ' / ' + OBJ + ' vœux · ' + nomLui + ' a quelque chose pour toi…'
        : '🌠 ' + compte + ' / ' + OBJ + ' étoiles filantes · appuie sur ✋ dès que tu en vois une');
    }
    function tangente(A) { return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).cross(A).normalize(); }

    function lancer(dansVue) {
      var f = null;
      for (var k = 0; k < filantes.length; k++) if (!filantes[k].actif) { f = filantes[k]; break; }
      if (!f) return;
      var perseide = Math.random() < 0.75, A = f.A, B = f.B;
      for (var essai = 0; essai < 30; essai++) {
        if (dansVue && cam) {
          var tv = Math.tan(rad(cam.fov / 2)), th = tv * cam.aspect;
          A.set(alea(-0.75, 0.75) * th, alea(-0.55, 0.7) * tv, -1).applyQuaternion(cam.quaternion).normalize();
        } else if (perseide) {
          var dd = rad(alea(12, 85)), P = tangente(RADIANT);
          A.copy(RADIANT).multiplyScalar(Math.cos(dd)).addScaledVector(P, Math.sin(dd));
        } else {
          A.set(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1);
          if (A.lengthSq() < 0.01) continue;
          A.normalize();
        }
        if (A.y > Math.sin(rad(dansVue ? 12 : 16)) && A.y < Math.sin(rad(84))) break;
      }
      if (A.y < 0.2) { A.y = 0.35; A.normalize(); }
      B.copy(A).multiplyScalar(A.dot(RADIANT)).sub(RADIANT);
      if (!perseide || B.lengthSq() < 1e-4) { B.copy(tangente(A)); if (B.y > 0.3) B.negate(); }
      B.normalize();
      var sorte = Math.random();
      f.bolide = sorte < 0.1; f.faible = !f.bolide && sorte < 0.35;
      f.dur = f.bolide ? alea(1.2, 1.6) : alea(0.45, 0.9);
      f.arc = rad(f.bolide ? alea(28, 40) : alea(12, 28));
      f.trace = rad(f.bolide ? 12 : alea(5, 9));
      f.lum = f.bolide ? 1.6 : f.faible ? 0.55 : 1;
      f.large = f.bolide ? 0.95 : f.faible ? 0.3 : 0.48;
      f.t = 0; f.vu = -1; f.compte = false; f.actif = true; f.fin = -1;
      f.maille.visible = f.tete.visible = true;
    }

    function lancerGlisseur(o, avionOui) {
      var az = Math.random() * Math.PI * 2, alt = rad(avionOui ? 6 : 18);
      o.A.set(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));
      var up = new THREE.Vector3(0, 1, 0).addScaledVector(o.A, -o.A.y).normalize(), cote = new THREE.Vector3().crossVectors(o.A, up);
      var dev = alea(-1, 1);
      o.B.copy(up).multiplyScalar(Math.cos(dev)).addScaledVector(cote, Math.sin(dev)).normalize();
      o.w = rad(avionOui ? alea(1.6, 2.4) : alea(0.9, 1.3));
      o.th = 0; o.actif = true;
      o.feux.forEach(function (s) { s.visible = true; });
    }
    function majGlisseur(o, dt, t, avionOui) {
      if (!o.actif) {
        o.prochain -= dt;
        if (o.prochain <= 0 && !finale) lancerGlisseur(o, avionOui);
        return;
      }
      o.th += o.w * dt;
      o.H.copy(o.A).multiplyScalar(Math.cos(o.th)).addScaledVector(o.B, Math.sin(o.th));
      if (o.H.y < 0.02 && o.th > 0.3) {
        o.actif = false; o.prochain = avionOui ? alea(45, 80) : alea(70, 120);
        o.feux.forEach(function (s) { s.visible = false; });
        return;
      }
      var fondu = lisse(0, 0.15, o.th) * lisse(0.0, 0.08, o.H.y);
      o.feux.forEach(function (s, k) {
        s.position.copy(o.H).multiplyScalar(R * 0.99);
        if (avionOui) { s.position.x += (k - 1) * 0.5; s.material.opacity = fondu * (k === 1 ? ((t % 1.4) < 0.07 ? 1 : 0.05) : ((t * 1.1 + k * 0.5) % 1 < 0.5 ? 0.9 : 0.2)); }
        else s.material.opacity = fondu * (0.45 + 0.1 * Math.sin(t * 2));
      });
    }

    function eclat(dir) {
      var s = AV.halo('#fff6d8', 4); s.material.fog = false; s.position.copy(dir).multiplyScalar(R * 0.99);
      s.userData.vie = 0; G.add(s); eclats.push(s);
      var s2 = AV.texteSprite('✨', { largeur: 16 }); s2.position.copy(s.position); s2.userData.vie = 0; s2.userData.monte = true; G.add(s2); eclats.push(s2);
    }

    var phrasesSucces = ['Waouh, bien vu ! Fais un vœu ✨', 'Encore une ! Tu as fait un vœu ? 🤞', 'Celle-là était magnifique… ✨', 'Plus qu\'une ! 🌠'];
    var bavardages = [
      'Regarde, la Grande Ourse, juste au-dessus du lac 🐻',
      'Pile au-dessus de nous, la grande croix : c\'est le Cygne 🦢',
      'Et là-bas, le grand W… c\'est Cassiopée ✨',
      'Tu vois l\'étoile polaire ? C\'est la seule qui ne bouge jamais.',
      'La Voie lactée traverse tout le ciel ce soir 🌌',
      'C\'est la nuit des Perséides, elles viennent de Persée, vers le nord-est !',
      'Tu entends les grillons ? 🦗',
      'On est bien, là… ❤',
      'L\'étoile toute blanche au-dessus de nous, c\'est Véga.',
      'Je crois que je pourrais rester là toute la nuit…',
      'Attention, les avions ça compte pas 😄'
    ];

    mo.debut = function (a) { api = a; };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (horloge < 10 && !compte && !finale) return '🌠 Regarde le ciel tout autour… et appuie sur ✋ dès que tu vois passer une étoile filante !';
      return null;
    };

    mo.surAction = function () {
      if (horloge < verrou) return;
      var ok = null;
      for (var k = 0; k < filantes.length; k++) {
        var f = filantes[k];
        if (f.compte || f.vu < 0) continue;
        if (f.actif || horloge - f.fin < 0.7) { ok = f; break; }
      }
      if (finale) { if (ok) { ok.compte = true; eclat(ok.H); AV.audio.etoile(); } return; }
      if (ok) {
        ok.compte = true; compte++; dernierSucces = horloge; modeAide = 0;
        eclat(ok.H); AV.audio.etoile();
        sousTitre();
        if (compte >= OBJ) { finale = { t: 0, etape: 0 }; return; }
        dire(compte === OBJ - 1 ? phrasesSucces[3] : phrasesSucces[Math.min(compte - 1, 2)], 2.8);
        return;
      }
      verrou = horloge + 1.6;
      AV.audio.erreur();
      if (avion.actif && aLEcran(avion.H)) dire('Raté… ça, c\'est un avion ✈️ 😄', 2.8);
      else if (satellite.actif && aLEcran(satellite.H)) dire('Presque ! Mais ça, c\'est un satellite 🛰️', 2.8);
      else dire(au_hasard(['Hmm… moi je n\'ai rien vu passer 🤔', 'Patience… ouvre grand les yeux 👀', 'Trop tôt ! Attends d\'en voir une 😉']), 2.4);
    };

    // tout ce qui dépend de la caméra (appelé par le moteur après la mise à jour de la vue)
    mo.surCamera = function (camera, dt, t) {
      cam = camera; camera.getWorldDirection(fwd);
      horloge += dt;
      cielEtoiles.material.uniforms.temps.value = t;

      // constellations : traits et nom apparaissent quand on les regarde
      constel.forEach(function (c) {
        var cible = lisse(Math.cos(rad(24)), Math.cos(rad(10)), fwd.dot(c.centre)) * (c.centre.y > 0.05 ? 1 : 0);
        c.op = AV.lerp(c.op, cible, Math.min(1, dt * 2));
        c.lignes.material.opacity = c.op * 0.32; c.lignes.visible = c.op > 0.01;
        c.etiquette.material.opacity = c.op * 0.85; c.etiquette.visible = c.op > 0.01;
      });

      // difficulté adaptative : après un long moment sans succès, les étoiles passent plus souvent devant ses yeux
      var C = window.CONFIG || {}, acc = api && api.test ? 4 : 1, attente = (horloge - dernierSucces) * acc;
      var aide = finale ? 0 : attente > (C.indiceChaudFroid || 240) ? 2 : attente > (C.indiceApres || 120) ? 1 : 0;
      if (aide > modeAide) {
        modeAide = aide;
        dire(aide === 1 ? 'Psst… arrête de tourner la tête : fixe un coin du ciel et attends 😉' : 'Regarde bien là où tu regardes… ça va passer par là ✨', 4.5);
      }

      // nouvelles étoiles filantes
      prochaine -= dt;
      if (forcer || prochaine <= 0) {
        var vue = forcer || Math.random() < [0, 0.45, 0.75][modeAide];
        lancer(vue);
        forcer = false;
        prochaine = finale ? alea(2, 5) : alea(3.5, 9);
      }
      filantes.forEach(function (f) {
        if (!f.actif) {
          if (f.fin >= 0 && !f.commente && horloge - f.fin > 0.8) {
            f.commente = true;
            if (!f.compte && !finale && !(parole && parole.t > 0)) {
              if (f.vu < 0 && Math.random() < 0.4) dire(au_hasard(['Oh ! T\'as vu celle-là ?! … non ? Elle était ', 'Waouh, une énorme ', 'Trop tard, elle est passée ']) + dirTexte(f.H) + ' ! 😮', 3);
              else if (f.vu >= 0 && Math.random() < 0.6) dire('Celle-là, tu l\'as vue ! Il fallait appuyer plus vite 😄', 2.8);
            }
          }
          return;
        }
        if (!f.maj(dt)) { f.fin = horloge; f.commente = false; return; }
        if (f.vu < 0 && aLEcran(f.H)) f.vu = horloge;
      });
      majGlisseur(avion, dt, t, true);
      majGlisseur(satellite, dt, t, false);

      for (var e = eclats.length - 1; e >= 0; e--) {
        var s = eclats[e]; s.userData.vie += dt;
        var v = s.userData.vie;
        if (s.userData.monte) { s.position.y += dt * 6; s.material.opacity = Math.max(0, 1 - v / 1.4); }
        else { var sc = 4 + v * 60; s.scale.set(sc, sc, 1); s.material.opacity = Math.max(0, 0.9 - v * 1.1); }
        if (v > 1.4) { G.remove(s); s.material.dispose(); if (s.userData.monte) s.material.map.dispose(); eclats.splice(e, 1); }
      }

      // lui : respire, regarde le ciel, se tourne vers elle quand il parle
      if (parole) parole.t -= dt;
      regardeElle -= dt;
      // si elle le regarde au lieu du ciel, il se tourne vers elle (et le lui fait remarquer de temps en temps)
      if (fwd.dot(dirLui) > 0.9 && !finale) {
        regardeElle = Math.max(regardeElle, 0.6);
        regardLui += dt;
        if (regardLui > 1.2 && horloge > prochainClin && !(parole && parole.t > 0)) {
          prochainClin = horloge + 40;
          dire(au_hasard(['Quoi ? 😊 C\'est le ciel qu\'il faut regarder !', 'Tu vas les rater à me regarder comme ça 😄', '❤ … allez, les étoiles !']), 3);
        }
      } else regardLui = 0;
      lui.torse.scale.y = 1 + Math.sin(t * 1.4) * 0.04;
      var rot = finale || regardeElle > 0 ? 0.95 : Math.sin(t * 0.23) * 0.25;
      lui.tete.rotation.z = AV.lerp(lui.tete.rotation.z, rot, Math.min(1, dt * 3));
      lui.tete.rotation.x = AV.lerp(lui.tete.rotation.x, regardeElle > 0 && !finale ? Math.sin(t * 8) * 0.04 : 0, Math.min(1, dt * 6));
      reflets.forEach(function (rf, k) { rf.material.opacity = 0.16 + Math.sin(t * 1.7 + k * 1.3) * 0.06; });

      // bavardage
      if (!finale) {
        prochainBavardage -= dt;
        if (prochainBavardage <= 0) {
          prochainBavardage = alea(16, 26);
          if (!(parole && parole.t > 0)) dire(au_hasard(bavardages), 3.6);
        }
      }

      // le final : il se tourne vers elle et lui tend un cadeau
      if (finale) {
        finale.t += dt;
        var T = finale.t, fp = mo.premierePersonne;
        if (finale.etape === 0) {
          finale.etape = 1;
          var cible = new THREE.Vector3(0.55, 0.38, -0.3).sub(OEIL).normalize();
          fp.viser = { lacet: Math.atan2(-cible.x, -cible.z), tangage: Math.asin(cible.y) };
          dire(OBJ + ' étoiles filantes… ' + OBJ + ' vœux ! ✨', 2.8);
        }
        if (finale.etape === 1 && T > 2.8) {
          finale.etape = 2; cadeau.visible = true;
          dire('Moi, je n\'en avais qu\'un seul… et il est pour toi 🎁', 3.4);
        }
        if (finale.etape >= 2) {
          var k2 = Math.min(1, (T - 2.8) / 0.8);
          // il lève le cadeau au-dessus de sa poitrine (le bras ne passe pas devant ses yeux à elle)
          lui.bras[0].rotation.x = AV.lerp(lui.bras[0].rotation.x, 0.75, Math.min(1, dt * 3));
          lui.bras[0].rotation.y = AV.lerp(lui.bras[0].rotation.y, -0.2, Math.min(1, dt * 3));
          cadeau.scale.setScalar(Math.max(0.01, k2) * 0.75 * (1 + Math.sin(T * 6) * 0.04));
        }
        if (finale.etape === 2 && T > 5.6) { finale.etape = 3; if (api) api.trouver(); }
        if (finale.etape === 3 && T > 7.5) { finale.etape = 4; fp.viser = null; }
      }
    };

    mo.nettoyer = function () { matFilante.dispose(); };
    mo.debug = {
      filante: function () { forcer = true; },
      gagner: function () { compte = OBJ - 1; forcer = true; },
      etat: function () { return { compte: compte, horloge: horloge, aide: modeAide, actives: filantes.filter(function (f) { return f.actif; }).length }; },
      teteLui: teteLui
    };
    return mo;
  };
})(window.AV);
