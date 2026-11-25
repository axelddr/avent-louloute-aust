/* Biome « bowling » : soirée bowling, Océane contre Axel (5 frames).
   On joue Océane : se placer sur la piste, ✋ Lancer quand la flèche est droite (elle fait des spares).
   Axel est (très) nul au début : 0, 3, 4, 0… puis il se réveille : 3 strikes d'affilée (TURKEY 🦃) → surprise.
   Physique 2D simplifiée boule/quilles sur le pin deck ; les lancers d'Axel sont cherchés par simulation pour tomber pile. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#141028', bas: '#241a3a', brouillard: '#120e22', hemi: ['#b8a8ff', '#3a2a4a', 0.55], soleil: ['#ffe8f0', 0.45, [0.3, 1, 0.4]] };
  var LDEMI = 0.525, GOUT = 0.765, ECART = 1.8, HP = -18.3, BR = 0.109, PR = 0.06, FOSSE = -19.55;
  var QUILLES = [];   // positions des 10 quilles
  for (var rg = 0; rg < 4; rg++) for (var iq = 0; iq <= rg; iq++) QUILLES.push({ x: (iq - rg / 2) * 0.305, z: HP - rg * 0.264 });
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function H() { return 0; }
  function autorise(x, z) { return x > -6.2 && x < 8.0 && z > -0.05 && z < 13.2; }

  // ---------- Physique 2D (x, z) : la boule et les quilles ----------
  function Sim(debout, x0, angle) {
    this.b = { x: x0, z: -0.4, vx: Math.sin(angle) * 8, vz: -Math.cos(angle) * 8, r: BR, m: 7, gout: false, fini: false };
    this.q = [];
    for (var i = 0; i < 10; i++) this.q.push({ i: i, x: debout[i].x, z: debout[i].z, vx: 0, vz: 0, r: PR, m: 1.5, actif: debout[i].debout, tombe: false, t: 0, dx: 0, dz: -1 });
    this.temps = 0; this.contact = false;
  }
  Sim.prototype.choc = function (a, c, e) {
    var dx = c.x - a.x, dz = c.z - a.z, d = Math.sqrt(dx * dx + dz * dz), mn = a.r + c.r;
    if (d >= mn || d < 1e-6) return false;
    var nx = dx / d, nz = dz / d, rv = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
    var ia = 1 / a.m, ic = 1 / c.m, rec = (mn - d) / (ia + ic);
    a.x -= nx * rec * ia; a.z -= nz * rec * ia; c.x += nx * rec * ic; c.z += nz * rec * ic;
    if (rv < 0) { var j = -(1 + e) * rv / (ia + ic); a.vx -= j * nx * ia; a.vz -= j * nz * ia; c.vx += j * nx * ic; c.vz += j * nz * ic; }
    return true;
  };
  Sim.prototype.pas = function (dt) {
    var b = this.b, q = this.q, i, k;
    this.temps += dt;
    if (!b.fini) {
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (!b.gout && Math.abs(b.x) > LDEMI) { b.gout = true; b.x = (b.x > 0 ? 1 : -1) * 0.645; b.vx = 0; }
      if (b.z < FOSSE - 0.4) b.fini = true;
    }
    for (i = 0; i < 10; i++) {
      var p = q[i]; if (!p.actif) continue;
      p.x += p.vx * dt; p.z += p.vz * dt;
      var f = Math.max(0, 1 - 2.2 * dt); p.vx *= f; p.vz *= f;
      if (Math.abs(p.x) > GOUT - p.r) { p.x = (p.x > 0 ? 1 : -1) * (GOUT - p.r); p.vx *= -0.5; p.tombe = true; }
      if (p.z < FOSSE) { p.tombe = true; p.actif = false; p.fosse = true; }
      var v = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
      if (v > 0.45 && !p.tombe) { p.tombe = true; p.dx = p.vx / v; p.dz = p.vz / v; }
      if (p.tombe) p.r = 0.13;
    }
    if (!b.gout && !b.fini) for (i = 0; i < 10; i++) if (q[i].actif && this.choc(b, q[i], 0.5)) this.contact = true;
    for (i = 0; i < 10; i++) for (k = i + 1; k < 10; k++) if (q[i].actif && q[k].actif) this.choc(q[i], q[k], 0.65);
  };
  Sim.prototype.calme = function () {
    if (!this.b.fini) return false;
    for (var i = 0; i < 10; i++) { var p = this.q[i]; if (p.actif && p.vx * p.vx + p.vz * p.vz > 0.01) return false; }
    return true;
  };
  Sim.prototype.compte = function () { var n = 0; for (var i = 0; i < 10; i++) if (this.q[i].tombe) n++; return n; };
  // simulation complète, d'un coup (pour chercher le lancer d'Axel)
  function simuler(debout, x0, angle) { var s = new Sim(debout, x0, angle); for (var n = 0; n < 900 && !(s.b.fini && s.temps > 4); n++) s.pas(1 / 120); return s.compte(); }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(F, l, h, p, col, x, y, z, ry) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function neon(l, h, p, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); return m; }

  // la quille (profil tourné), blanche avec deux bandes rouges au cou
  var PROFIL = [[0, 0], [0.026, 0], [0.04, 0.03], [0.058, 0.1], [0.06, 0.13], [0.052, 0.18], [0.034, 0.235], [0.024, 0.27], [0.027, 0.3], [0.032, 0.33], [0.028, 0.36], [0.015, 0.378], [0, 0.381]];
  var geoQuille = new THREE.LatheGeometry(PROFIL.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 10);
  function quilleFixe(F, x, z) {
    var o = new THREE.Mesh(geoQuille.clone(), matT); matT.color.set('#f4f2ee'); o.position.set(x, 0, z); F.ajouter(o); o.geometry.dispose();
    forme(F, new THREE.CylinderGeometry(0.026, 0.025, 0.012, 8), '#d63030', x, 0.245, z, 0, 1, 1, 1);
  }
  function quille() {
    var g = new THREE.Group(), m = new THREE.Mesh(geoQuille, new THREE.MeshPhongMaterial({ color: '#f6f4f0', shininess: 70 }));
    m.castShadow = true; g.add(m);
    [0.24, 0.258].forEach(function (y) { var b = AV.maille(new THREE.CylinderGeometry(0.027, 0.026, 0.008, 8), '#d63030', false); b.position.y = y; g.add(b); });
    return g;
  }
  function boule(c1, c2) {
    var g = new THREE.Group(), m = new THREE.Mesh(new THREE.IcosahedronGeometry(BR, 2), new THREE.MeshPhongMaterial({ color: c1, shininess: 120, specular: '#ffffff' }));
    m.castShadow = true; g.add(m);
    [[0, 0.07, 0.08], [0.03, 0.09, 0.05], [-0.03, 0.09, 0.05]].forEach(function (t) { var tr = AV.maille(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), '#111', false); tr.position.set(t[0], t[1], t[2]); tr.lookAt(t[0] * 3, t[1] * 3, t[2] * 3); tr.rotateX(Math.PI / 2); g.add(tr); });
    var sw = AV.maille(new THREE.TorusGeometry(BR * 0.98, 0.012, 4, 16), c2, false); sw.rotation.set(0.6, 0.3, 0); g.add(sw);
    return g;
  }

  // ---------- Personnages ----------
  function personne(o) {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var peau = o.peau || '#eec29a', jambes = [], bras = [];
    var mBas = new THREE.MeshLambertMaterial({ color: o.bas }), mHaut = new THREE.MeshLambertMaterial({ color: o.haut }), mPeau = new THREE.MeshLambertMaterial({ color: peau });
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      var jb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.76, 0.17), mBas); jb.position.y = -0.4; j.add(jb);
      j.add(bm(0.16, 0.09, 0.28, c < 0 ? o.pieds : o.pieds2 || o.pieds, 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = new THREE.Mesh(AV.facettes(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8)), mHaut); t.position.y = 1.11; t.castShadow = true; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(new THREE.Mesh(AV.facettes(new THREE.IcosahedronGeometry(0.17, 1)), mPeau));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), o.cheveux); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    if (o.longs) { var cl = AV.maille(new THREE.BoxGeometry(0.34, 0.5, 0.1), o.cheveux); cl.position.set(0, -0.14, -0.13); tete.add(cl); }
    [-1, 1].forEach(function (c) { var oe = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); oe.position.set(c * 0.06, 0.0, 0.152); tete.add(oe); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#b0505a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux });
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 6), o.manches ? new THREE.MeshLambertMaterial({ color: o.manches }) : mHaut); m.position.y = -0.13; b.add(m);
      var av = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 6), mPeau); av.position.y = -0.4; b.add(av);
      var mn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), mPeau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes };
  }

  AV.biomes = AV.biomes || {};
  AV.biomes.bowling = function (cfg) {
    var rng = AV.rng(1919 + cfg.jour);
    var nomLui = cfg.copain || 'Axel', nomElle = cfg.copine || 'Océane';
    var mo = new AV.Monde({
      rayon: 30, hauteur: H, surface: 'bois', ciel: CIEL, brouillard: [40, 120],
      depart: { x: 0.6, z: 6.4, angle: Math.PI }, theme: 'bowling', ambiance: 'foule', autorise: autorise
    });
    mo.loin = 200;
    mo.sansAnimal = true;
    var G = mo.groupe, col = mo.colliders;

    // ---------- Textures canvas (moquette néon, déco au-dessus des quilles) ----------
    function canvasTex(w, h, dessin) { var c = document.createElement('canvas'); c.width = w; c.height = h; dessin(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); return t; }
    var texMoq = canvasTex(256, 256, function (x, w, h) {
      x.fillStyle = '#1b1530'; x.fillRect(0, 0, w, h);
      var cs = ['#ff4fa3', '#3ee8ff', '#ffe04a', '#8a5cff'];
      for (var i = 0; i < 40; i++) { x.strokeStyle = cs[i % 4]; x.lineWidth = 3; x.beginPath(); var a = Math.random() * w, b = Math.random() * h; x.moveTo(a, b); x.bezierCurveTo(a + 30, b - 30, a + 40, b + 30, a + 70, b); x.stroke(); }
      for (var j = 0; j < 30; j++) { x.fillStyle = cs[j % 4]; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 0, 7); x.fill(); }
    });
    texMoq.wrapS = texMoq.wrapT = THREE.RepeatWrapping; texMoq.repeat.set(6, 4);
    var moquette = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 9), new THREE.MeshLambertMaterial({ map: texMoq, emissive: '#ffffff', emissiveMap: texMoq, emissiveIntensity: 0.35 }));
    moquette.rotation.x = -Math.PI / 2; moquette.position.set(0.9, 0.001, 9.2); moquette.receiveShadow = true; G.add(moquette);
    var texDeco = canvasTex(1024, 256, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#120b2e'); g.addColorStop(1, '#2a0f3e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 120; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      [['#ff4fa3', 120, 120, 50], ['#3ee8ff', 880, 90, 38], ['#ffe04a', 520, 200, 24]].forEach(function (p) { x.strokeStyle = p[0]; x.lineWidth = 6; x.beginPath(); x.arc(p[1], p[2], p[3], 0, 7); x.stroke(); x.beginPath(); x.ellipse(p[1], p[2], p[3] * 1.7, p[3] * 0.4, -0.3, 0, 7); x.stroke(); });
      x.font = '900 92px Nunito, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ff4fa3'; x.shadowColor = '#ff4fa3'; x.shadowBlur = 25; x.fillText('★ STRIKE ZONE ★', w / 2, 140);
    });
    var deco = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.6), new THREE.MeshBasicMaterial({ map: texDeco })); deco.position.set(0.9, 2.3, -17.6); G.add(deco);

    // ---------- Les pistes, la salle (fusionné) ----------
    var F = new AV.Fusion(), FB = new AV.Fusion();
    var PISTES = [-3, -2, -1, 0, 1, 2, 3, 4];
    PISTES.forEach(function (i) {
      var cx = i * ECART;
      boite(F, LDEMI * 2, 0.04, 19.6, i % 2 ? '#dcb57c' : '#d6ae74', cx, -0.02, -9.8);                  // la piste en bois
      for (var l = 0; l < 10; l++) boite(F, 0.004, 0.002, 19.6, '#c49a62', cx - LDEMI + 0.1 + l * 0.1, 0.001, -9.8); // lattes
      [-1, 1].forEach(function (s) { boite(F, 0.24, 0.03, 19.6, '#7d838e', cx + s * 0.645, -0.07, -9.8); }); // gouttières
      boite(F, ECART - 2 * GOUT, 0.08, 21.5, '#2a2638', cx + ECART / 2, 0.02, -10.5);                    // séparation
      for (var a = -3; a <= 3; a++) forme(F, new THREE.ConeGeometry(0.035, 0.12, 3), '#3a2a1a', cx + a * 0.125, 0.002, -4.6 - Math.abs(a) * 0.3, 0, 1, 0.05, 1, -Math.PI / 2);
      for (var d = -2; d <= 2; d++) forme(F, new THREE.CylinderGeometry(0.012, 0.012, 0.003, 6), '#3a2a1a', cx + d * 0.2, 0.002, -2.1, 0, 1, 1, 1);
      boite(F, LDEMI * 2 + 0.5, 0.004, 0.025, '#e33', cx, 0.003, 0);                                     // ligne de faute
      boite(F, LDEMI * 2 + 0.6, 0.6, 1.0, '#08060c', cx, -0.3, FOSSE - 0.55);                              // la fosse
      if (i !== 0) QUILLES.forEach(function (q, k) { if (i === 2 && (k === 6 || k === 9)) return; if (i === -2 && k > 5) return; quilleFixe(FB, cx + q.x, q.z); });
    });
    boite(F, 15.2, 0.04, 4.7, '#e0bd86', 0.9, -0.02, 2.35);                                           // les approches
    boite(F, 15.2, 1.5, 0.3, '#050408', 0.9, 0.75, -20.9);                                            // rideau du fond
    boite(F, 15.2, 2.0, 2.6, '#1a1428', 0.9, 4.2, -18.6);                                             // caisson au-dessus des quilles
    // murs et plafond
    boite(F, 0.3, 4.4, 35, '#241c38', -6.6, 2.2, -3.5); boite(F, 0.3, 4.4, 35, '#241c38', 8.4, 2.2, -3.5);
    boite(F, 15.2, 4.4, 0.3, '#241c38', 0.9, 2.2, 13.9); boite(F, 15.2, 0.2, 35, '#120e1e', 0.9, 4.4, -3.5);
    // bancs, consoles, retours de boules (un par paire de pistes)
    [-4.5, -0.9, 2.7, 6.3].forEach(function (x) {
      boite(F, 3.0, 0.45, 0.9, '#c8245e', x, 0.22, 7.4); boite(F, 3.0, 0.7, 0.25, '#a81d4f', x, 0.7, 7.95);
      boite(F, 0.8, 0.75, 0.6, '#2b2b3a', x, 0.38, 5.6); boite(F, 0.5, 0.3, 0.05, '#3ee8ff', x, 0.95, 5.35);
      col.push({ rect: true, x: x, z: 7.6, hx: 1.5, hz: 0.6, a: 0 }, { rect: true, x: x, z: 5.6, hx: 0.4, hz: 0.3, a: 0 });
    });
    [-2.7, 0.9, 4.5].forEach(function (x) {
      boite(F, 0.5, 0.75, 1.0, '#3a3550', x, 0.38, 3.9); forme(F, new THREE.SphereGeometry(0.33, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#4a4466', x, 0.75, 3.9, 0, 1, 1, 1);
      boite(F, 0.3, 0.06, 1.4, '#55506e', x, 0.62, 4.9);
      for (var b = 0; b < 4; b++) forme(F, new THREE.IcosahedronGeometry(BR, 1), AV.choisir(rng, ['#2a5fd0', '#e85a9a', '#36c47a', '#f2a020', '#8a4fd8']), x, 0.72, 4.4 + b * 0.24, 0, 1, 1, 1);
      col.push({ rect: true, x: x, z: 4.3, hx: 0.3, hz: 0.75, a: 0 });
    });
    // le bar du fond, et les étagères de boules
    boite(F, 6, 1.1, 0.7, '#3a1f3e', -2.5, 0.55, 11.6); boite(F, 6.2, 0.06, 0.85, '#d9c9e8', -2.5, 1.12, 11.6);
    for (var ts = 0; ts < 5; ts++) { forme(F, new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10), '#ff4fa3', -4.7 + ts * 1.1, 0.75, 10.8, 0, 1, 1, 1); forme(F, new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), '#888', -4.7 + ts * 1.1, 0.36, 10.8, 0, 1, 1, 1); }
    for (var dr = 0; dr < 7; dr++) forme(F, new THREE.CylinderGeometry(0.04, 0.035, 0.14, 7), AV.choisir(rng, ['#ffd24a', '#ff7a3a', '#a0e8ff', '#ff4fa3']), -4.9 + dr * 0.75, 1.22, 11.55, 0, 1, 1, 1);
    col.push({ rect: true, x: -2.5, z: 11.6, hx: 3.1, hz: 0.45, a: 0 });
    for (var et = 0; et < 3; et++) { boite(F, 3.2, 0.05, 0.4, '#4a4466', 5.6, 0.5 + et * 0.45, 13.5); for (var eb = 0; eb < 10; eb++) forme(F, new THREE.IcosahedronGeometry(BR, 1), AV.choisir(rng, ['#2a5fd0', '#e85a9a', '#36c47a', '#f2a020', '#8a4fd8', '#222']), 4.2 + eb * 0.31, 0.64 + et * 0.45, 13.5, 0, 1, 1, 1); }
    col.push({ rect: true, x: 5.6, z: 13.5, hx: 1.7, hz: 0.3, a: 0 });
    var salle = F.maille(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 40, specular: '#333333' })); salle.receiveShadow = true; G.add(salle);
    G.add(FB.maille());

    // ---------- Néons ----------
    PISTES.forEach(function (i) { G.add(neon(0.05, 0.05, 19, i % 2 ? '#3ee8ff' : '#ff4fa3', i * ECART + ECART / 2, 4.25, -8.5)); });
    G.add(neon(0.06, 0.06, 34, '#8a5cff', -6.42, 3.6, -3.5), neon(0.06, 0.06, 34, '#ff4fa3', 8.22, 3.6, -3.5), neon(15, 0.06, 0.06, '#3ee8ff', 0.9, 1.6, -17.3));
    var texBar = canvasTex(512, 128, function (x, w, h) { x.font = '900 96px Nunito, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#3ee8ff'; x.shadowColor = '#3ee8ff'; x.shadowBlur = 20; x.fillText('BOWLING', w / 2, 98); });
    var enseigne = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: texBar, transparent: true })); enseigne.position.set(-2.5, 2.9, 13.74); enseigne.rotation.y = Math.PI; G.add(enseigne);
    // lumières : la piste (blanche), la salle (rose/violet)
    [[0, 3.8, -3, '#fff4e8', 0.8, 12], [0, 3.6, -12, '#fff4e8', 0.6, 12], [0, 3.2, -17.2, '#ffffff', 1.0, 6], [0.9, 3.5, 6, '#ff8ad0', 0.7, 14], [-2.5, 3, 11, '#8a5cff', 0.6, 10]].forEach(function (l) { var p = new THREE.PointLight(l[3], l[4], l[5], 2); p.position.set(l[0], l[1], l[2]); G.add(p); });

    // ---------- Les écrans de score (le nôtre est dynamique) ----------
    [-3.6, 3.6, 6.6].forEach(function (k) {
      var t = canvasTex(512, 220, function (x, w, h) { x.fillStyle = '#0a1a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#3ee8ff'; x.font = '700 30px Nunito, sans-serif'; ['JULIE', 'MARCO', 'SAM'].forEach(function (n, r) { x.fillText(n + '   ' + (40 + Math.floor(Math.random() * 60)), 20, 50 + r * 60); }); });
      var e = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), new THREE.MeshBasicMaterial({ map: t })); e.position.set(k, 3.1, -0.9); G.add(e);
    });
    var cvS = document.createElement('canvas'); cvS.width = 1024; cvS.height = 440; var xS = cvS.getContext('2d');
    var texS = new THREE.CanvasTexture(cvS);
    var ecran = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.25), new THREE.MeshBasicMaterial({ map: texS })); ecran.position.set(0, 3.05, -0.9); G.add(ecran);
    G.add(bm(3.0, 1.35, 0.08, '#111', 0, 3.05, -0.95));

    // ---------- Les autres joueurs (ambiance) ----------
    var figurants = [];
    [[-3.6, 6.9, 0, '#f2a020', '#333', '#2a1a10', true], [-3.0, 2.2, Math.PI, '#36c47a', '#3a4a6a', '#a0703a', false], [3.6, 6.9, 0, '#8a5cff', '#222', '#d6b07a', true], [4.1, 7.0, 0, '#e8e8e8', '#4a5a7a', '#3a2a1a', false], [-2.4, 11.0, Math.PI, '#ff4fa3', '#222', '#111', true]].forEach(function (f) {
      var p = personne({ haut: f[3], bas: f[4], cheveux: f[5], longs: f[6], pieds: '#c0392b', pieds2: '#2a6fd0' });
      p.groupe.position.set(f[0], f[1] > 6 ? -0.3 : 0, f[1]); p.groupe.rotation.y = f[2]; G.add(p.groupe);
      if (f[1] > 6 && f[1] < 8) p.jambes.forEach(function (j) { j.rotation.x = -1.4; });
      figurants.push(p); col.push({ x: f[0], z: f[1], r: 0.35 });
    });

    // ---------- Nos quilles (piste 0) et les deux boules ----------
    var etatQ = QUILLES.map(function (q) { return { x: q.x, z: q.z, debout: true }; });
    var mQ = QUILLES.map(function (q) { var g = quille(); g.position.set(q.x, 0, q.z); G.add(g); return g; });
    function replacerQuilles(toutes) {
      etatQ.forEach(function (e, i) {
        if (toutes) { e.x = QUILLES[i].x; e.z = QUILLES[i].z; e.debout = true; }
        mQ[i].visible = e.debout; mQ[i].position.set(e.x, 0, e.z); mQ[i].quaternion.set(0, 0, 0, 1);
      });
    }
    var bouleO = boule('#e85a9a', '#ffd0ea'), bouleA = boule('#2a5fd0', '#9fd0ff');
    bouleO.position.set(0.9, 0.72, 4.3); bouleA.position.set(0.9, 0.72, 4.55); G.add(bouleO, bouleA);
    var axe = new THREE.Vector3();
    function majVisuels(sim, bm3, dt) {
      var b = sim.b;
      if (!b.fini) { bm3.position.set(b.x, b.gout ? 0.03 : BR, b.z); bm3.rotation.x -= 8 * dt / BR; }
      else bm3.visible = false;
      sim.q.forEach(function (p, i) {
        if (!etatQ[i].debout) return;
        var g = mQ[i];
        if (p.fosse) { g.position.y -= dt * 3; if (g.position.y < -0.6) g.visible = false; return; }
        g.position.x = p.x; g.position.z = p.z;
        if (p.tombe) {
          p.t += dt; var ang = Math.min(Math.PI / 2, p.t * 5);
          axe.set(p.dz, 0, -p.dx).normalize(); g.quaternion.setFromAxisAngle(axe, ang); g.position.y = 0.055 * Math.sin(ang);
        }
      });
    }

    // ---------- Le tableau des scores ----------
    var NOMS = { oce: nomElle, axel: nomLui }, cadres = { oce: [], axel: [] };
    function totaux(fr) {
      var r = [], plat = [], cumul = 0, out = [];
      fr.forEach(function (f) { f.forEach(function (v) { plat.push(v); }); });
      var k = 0;
      for (var i = 0; i < fr.length; i++) {
        var f = fr[i]; if (!f.length) break;
        var s = f[0] + (f[1] || 0);
        if (i < 4) { if (f[0] === 10) s = 10 + (plat[k + 1] || 0) + (plat[k + 2] || 0); else if (f.length > 1 && s === 10) s = 10 + (plat[k + 2] || 0); }
        k += f.length; cumul += s; out.push(cumul);
      }
      return out;
    }
    function symb(f, j) { var v = f[j]; if (v === undefined) return ''; if (j === 0 && v === 10) return 'X'; if (j === 1 && f[0] + v === 10) return '/'; return v === 0 ? '–' : String(v); }
    var qui = 'oce', frame = 1;
    function dessinerScore() {
      var x = xS, w = 1024, h = 440;
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1640'); g.addColorStop(1, '#1d0b38'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.textAlign = 'center'; x.fillStyle = '#ffe04a'; x.font = '900 44px Nunito, sans-serif'; x.fillText('🎳 SOIRÉE BOWLING · Frame ' + Math.min(frame, 5) + ' / 5', w / 2, 56);
      ['oce', 'axel'].forEach(function (p, r) {
        var y0 = 90 + r * 170, coul = p === 'oce' ? '#ff4fa3' : '#3ee8ff', tot = totaux(cadres[p]);
        x.strokeStyle = coul; x.lineWidth = qui === p ? 6 : 2; x.strokeRect(10, y0, w - 20, 150);
        x.fillStyle = coul; x.font = '900 40px Nunito, sans-serif'; x.textAlign = 'left'; x.fillText(NOMS[p], 26, y0 + 88);
        for (var f = 0; f < 5; f++) {
          var cx = 230 + f * 132, fr = cadres[p][f];
          x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2; x.strokeRect(cx, y0 + 12, 124, 126); x.strokeRect(cx + 62, y0 + 12, 62, 50);
          x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '800 36px Nunito, sans-serif';
          if (fr) { x.fillText(symb(fr, 0), cx + 31, y0 + 52); x.fillText(symb(fr, 1), cx + 93, y0 + 52); }
          if (fr && tot[f] !== undefined) { x.font = '900 44px Nunito, sans-serif'; x.fillText(tot[f], cx + 62, y0 + 118); }
        }
        x.fillStyle = coul; x.font = '900 60px Nunito, sans-serif'; x.fillText(tot.length ? tot[tot.length - 1] : 0, 940, y0 + 98);
      });
      texS.needsUpdate = true;
    }
    function total(p) { var t = totaux(cadres[p]); return t.length ? t[t.length - 1] : 0; }
    dessinerScore();

    // ---------- Axel (PNJ) ----------
    var axel = personne({ qui: 'axel', haut: '#2f3a4f', bas: '#3a4258', cheveux: '#5a3a24', peau: '#e8b88f', pieds: '#c0392b', pieds2: '#2a6fd0' });
    axel.groupe.scale.setScalar(1.06); G.add(axel.groupe);
    var BANC = { x: -0.6, z: 7.25 };
    var aP = new THREE.Vector3(BANC.x, 0, BANC.z), aAng = Math.PI, aMode = 'assis', aBut = null, aT = 0, aPh = 0;
    function axelVa(x, z, apres) { aMode = 'marche'; aBut = { x: x, z: z, apres: apres }; }
    function majAxel(dt, t) {
      aT += dt; var g = axel.groupe, v = 0;
      if (aMode === 'marche') {
        var ex = aBut.x - aP.x, ez = aBut.z - aP.z, el = Math.sqrt(ex * ex + ez * ez);
        if (el > 0.06) { v = Math.min(2.6, el / dt); aP.x += ex / el * v * dt; aP.z += ez / el * v * dt; aAng = AV.angleLerp(aAng, Math.atan2(ex, ez), Math.min(1, dt * 8)); }
        else { aMode = 'debout'; aT = 0; var ap = aBut.apres; aBut = null; if (ap) ap(); }
      }
      if (aMode === 'elan') { v = 3; aP.z -= dt * 1.8; aAng = Math.PI; }
      if (aMode === 'assis') { g.position.set(BANC.x, -0.3, BANC.z); g.rotation.set(0, Math.PI, 0); axel.jambes.forEach(function (j) { j.rotation.set(-1.4, 0, 0); }); axel.bras[0].rotation.set(-0.4, 0, 0.2); axel.bras[1].rotation.set(-0.4, 0, -0.2); axel.corps.position.y = 0; return; }
      aPh += dt * (4 + v * 1.8); var s = Math.sin(aPh), k = Math.min(1, v / 2.6);
      g.position.set(aP.x, Math.abs(Math.cos(aPh)) * 0.05 * k, aP.z); g.rotation.set(0, aAng, 0);
      axel.jambes[0].rotation.set(s * 0.8 * k, 0, 0); axel.jambes[1].rotation.set(-s * 0.8 * k, 0, 0);
      axel.bras[0].rotation.set(-s * 0.6 * k, 0, -0.1); axel.bras[1].rotation.set(aTient ? -0.3 : s * 0.6 * k, 0, 0.1);
      axel.corps.position.y = 0; axel.corps.rotation.x = 0;
      if (aMode === 'elan') { var e = Math.min(1, aT / 0.9); axel.bras[1].rotation.set(e < 0.6 ? 1.2 * e / 0.6 : 1.2 - 2.6 * (e - 0.6) / 0.4, 0, 0.1); axel.corps.rotation.x = 0.25 * e; if (e > 0.8) axel.jambes[1].rotation.x = -0.9; }
      if (aMode === 'joie') { g.position.y = Math.abs(Math.sin(t * 9)) * 0.35; axel.bras[0].rotation.set(-2.9, 0, -0.3); axel.bras[1].rotation.set(-2.9, 0, 0.3); }
      if (aMode === 'honte') { axel.bras[0].rotation.set(-2.6, 0, 0.9); axel.bras[1].rotation.set(-2.6, 0, -0.9); axel.tete.rotation.x = 0.35; } else axel.tete.rotation.x = 0;
    }
    var aTient = false;

    // ---------- Océane (le joueur) ----------
    var J = null, elle = null, cache = [], eElan = -1;
    function habiller() {
      J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (!J || elle) return;
      J.groupe.children.forEach(function (c) { cache.push({ o: c, v: c.visible }); c.visible = false; });
      elle = personne({ qui: 'oceane', haut: '#c45a8a', bas: '#3a4a6a', cheveux: '#d6b07a', longs: true, pieds: '#c0392b', pieds2: '#2a6fd0' });
      J.groupe.add(elle.groupe);
    }
    function deshabiller() {
      if (!J || !elle) return;
      J.groupe.remove(elle.groupe); AV.detruire(elle.groupe); elle = null;
      cache.forEach(function (c) { c.o.visible = c.v; }); cache = [];
    }
    function animerElle(dt, t) {
      if (!elle) return;
      var p = J.parts;
      elle.jambes[0].rotation.set(p.jambeG.rotation.x, 0, 0); elle.jambes[1].rotation.set(p.jambeD.rotation.x, 0, 0);
      elle.corps.position.y = p.corps.position.y; elle.corps.rotation.x = p.corps.rotation.x;
      elle.bras[0].rotation.set(p.brasG.rotation.x, 0, -0.1);
      elle.bras[1].rotation.set(bouleO.parent === elle.bras[1] ? -0.25 : p.brasD.rotation.x, 0, 0.1);
      if (eElan >= 0) { var e = Math.min(1, eElan / 0.6); elle.bras[1].rotation.set(e < 0.55 ? 1.2 * e / 0.55 : 1.2 - 2.6 * (e - 0.55) / 0.45, 0, 0.1); elle.corps.rotation.x = 0.25 * e; elle.jambes[1].rotation.x = -0.8 * e; elle.bras[0].rotation.set(-0.6 * e, 0, -0.7 * e); }
      if (fete > 0) { elle.bras[0].rotation.set(-2.9, 0, -0.3); elle.bras[1].rotation.set(-2.9, 0, 0.3); }
    }
    var fete = 0;
    function tenir(bmesh, perso) { perso.bras[1].add(bmesh); bmesh.position.set(0, -0.68, 0.06); bmesh.rotation.set(0, 0, 0); bmesh.visible = true; }

    // ---------- La flèche de visée (+ ligne pointillée jusqu'aux quilles) ----------
    var fleche = new THREE.Group(); G.add(fleche);
    var sh = new THREE.Shape(); sh.moveTo(0, 0.32); sh.lineTo(0.13, 0); sh.lineTo(0.045, 0); sh.lineTo(0.045, -0.25); sh.lineTo(-0.045, -0.25); sh.lineTo(-0.045, 0); sh.lineTo(-0.13, 0); sh.lineTo(0, 0.32);
    var fm = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#ffe04a', transparent: true, opacity: 0.9, depthWrite: false })); fm.rotation.x = -Math.PI / 2; fm.position.set(0, 0.012, -0.8); fleche.add(fm);
    for (var pt = 0; pt < 24; pt++) { var dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 6), new THREE.MeshBasicMaterial({ color: '#ffe04a', transparent: true, opacity: 0.55, depthWrite: false })); dot.rotation.x = -Math.PI / 2; dot.position.set(0, 0.011, -1.6 - pt * 0.7); fleche.add(dot); }
    fleche.visible = false;

    // ---------- Déroulé de la partie ----------
    var SCRIPT = [[0, 3], [4, 0], [10], [10], [10]];
    var api = null, etat = 'debut', sim = null, simAcc = 0, tE = 0, tAim = 0, vite = 1, auto = false, lance = null, bouleC = null, camSuit = false, camInit = false, banniere = null, parole = null, aOsc = 0, sonFait = false, finFaite = false;
    var camP = new THREE.Vector3(), camL = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 3.2 }; }
    function axelDit(t, d) { dire('<b>' + nomLui + ' :</b> ' + t, d || 3.4); }
    function sousTitre() { if (api) api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '🎳 ' + nomElle + ' ' + total('oce') + ' – ' + total('axel') + ' ' + nomLui + ' · frame ' + Math.min(frame, 5) + '/5'); }
    function cadre() { var c = cadres[qui]; if (!c[frame - 1]) c[frame - 1] = []; return c[frame - 1]; }
    function tourOce() {
      qui = 'oce'; etat = 'oceVise'; tAim = 0; if (elle) tenir(bouleO, elle); dessinerScore(); sousTitre();
    }
    var itLancer = { x: 0, z: 0, rayon: 3, texte: '🎳 ✋ Lancer !', fn: function () { lancerOce(aOsc); } };
    function lancerOce(rawA) {
      if (etat !== 'oceVise' || !J) return;
      var x0 = Math.max(-0.42, Math.min(0.42, J.position.x)), a, force = 0, deb = etatQ.filter(function (e) { return e.debout; });
      if (cadre().length === 0) {
        var aP = Math.atan((0.07 - x0) / (-0.4 - HP)); a = rawA * 0.75 + aP * 0.25;
        // un strike, d'accord… mais Océane, c'est la reine du spare : ensuite la 1re boule laisse quelques quilles
        var nbX = cadres.oce.filter(function (f) { return f[0] === 10; }).length;
        if (nbX >= 1 && simuler(etatQ, x0, a) === 10) for (var k = 1; k <= 8; k++) { var a2 = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.004, n2 = simuler(etatQ, x0, a2); if (n2 >= 6 && n2 <= 9) { a = a2; break; } }
      }
      else {
        var cx = 0, cz = 0; deb.forEach(function (e) { cx += e.x; cz += e.z; }); cx /= deb.length || 1; cz /= deb.length || 1;
        var aT = Math.atan((cx - x0) / (-0.4 - cz)); a = rawA * 0.3 + aT * 0.7; if (Math.abs(rawA) < 0.033) force = 99; // Océane fait ses spares 😎
      }
      lance = { x0: x0, a: a, force: force }; eElan = 0; etat = 'elanO'; mo.interactifs = []; fleche.visible = false;
    }
    function chercher(cible) {
      var deb = etatQ.filter(function (e) { return e.debout; }).length;
      if (cible === 0) { var s = Math.random() < 0.5 ? -1 : 1; return { x0: 0.3 * s, a: 0.042 * s, force: 0 }; }
      var best = null, bestN = -1, exact = null;
      for (var xi = -5; xi <= 5; xi++) for (var ai = -5; ai <= 5; ai++) {
        var x0 = xi * 0.085, a = ai * 0.0065, n = simuler(etatQ, x0, a);
        if (n === cible && (!exact || Math.abs(x0) + Math.abs(a) * 10 < Math.abs(exact.x0) + Math.abs(exact.a) * 10)) exact = { x0: x0, a: a, force: 0 };
        if (n < cible && n > bestN) { bestN = n; best = { x0: x0, a: a, force: cible - n }; }
      }
      if (exact) return exact;
      if (best) return best;
      return { x0: 0.05, a: 0, force: 99 };
    }
    function tourAxel() {
      qui = 'axel'; etat = 'axelVa'; dessinerScore(); sousTitre();
      var c = cadre(), cible = SCRIPT[frame - 1][c.length];
      lance = chercher(cible); lance.cible = cible;
      aTient = true; tenir(bouleA, axel);
      if (frame === 3 && c.length === 0) { dire('<b>' + nomElle + ' :</b> Allez mon cœur, réveille-toi ! 😘', 3); setTimeout(function () { axelDit('Bon. Mode sérieux activé 😤'); }, 2600 / vite); }
      axelVa(lance.x0, 1.9, function () { aAng = Math.PI; aMode = 'elan'; aT = 0; etat = 'elanA'; });
    }
    function demarrerRoule(bmesh) {
      G.add(bmesh); bmesh.position.set(lance.x0, BR, -0.4); bmesh.visible = true; bouleC = bmesh;
      sim = new Sim(etatQ, lance.x0, lance.a); simAcc = 0; tE = 0; etat = 'roule'; camSuit = true; camInit = false; sonFait = false;
      AV.audio.roule && AV.audio.roule(2.4, 0.9);
    }
    function forcer() {
      var b = sim.b, l = sim.q.filter(function (p) { return p.actif && !p.tombe; });
      l.sort(function (u, v) { return Math.abs(u.x - b.x) - Math.abs(v.x - b.x); });
      l.slice(0, lance.force).forEach(function (p) { var s = p.x - b.x >= 0 ? 1 : -1; p.vx = s * (0.8 + Math.random() * 0.8); p.vz = -1.4 - Math.random() * 1.2; });
    }
    function finRoule() {
      var n = 0;
      sim.q.forEach(function (p, i) { if (!etatQ[i].debout) return; if (p.tombe) { n++; etatQ[i].debout = false; } else { etatQ[i].x = p.x; etatQ[i].z = p.z; } });
      var c = cadre(); c.push(n); dessinerScore(); sousTitre();
      var strike = c.length === 1 && n === 10, spare = c.length === 2 && c[0] + n === 10;
      var txt = strike ? 'STRIKE ! ✖️' : spare ? 'SPARE ! ◢' : n === 0 ? (sim.b.gout ? 'Gouttière… 😬' : 'Zéro… 😬') : n + (n > 1 ? ' quilles' : ' quille');
      banniere = AV.texteSprite(txt, { largeur: 1.5 }); banniere.position.set(0, 0.85, HP + 1.4); G.add(banniere);
      if (strike || spare) AV.audio.bravo && AV.audio.bravo();
      if (qui === 'oce') {
        if (strike) { fete = 2; axelDit('UN STRIKE ?! Je suis amoureux d\'une championne 😍', 3.4); }
        else if (spare) { fete = 1.5; axelDit(auHasard(['Spare… comment tu fais ça ?! 😳', 'Encore un spare… t\'es une pro en fait 🤨', 'Spare ! Je vais finir par avoir honte 🙈']), 3.2); }
        else if (n === 0) axelDit('Ahah, bienvenue au club 😂', 2.8);
        else if (c.length === 1) axelDit(auHasard(['Pas mal ! 👏', 'Joli ! Allez, le spare 😏']), 2.4);
      } else {
        var L = { '1-1': 'Euh… la piste est penchée, non ? 😅', '1-2': 'Trois quilles ! C\'est… un échauffement 😬', '2-1': 'Quatre ! Je progresse 💪', '2-2': 'Mais c\'est pas possible !! 😩 Elle est truquée cette boule', '3-1': 'STRIIIKE !! 😎 Le réveil du champion', '4-1': 'DOUBLE !! 🔥🔥 Tu l\'as vu celui-là ?', '5-1': 'TURKEY !!! 🦃🦃🦃 Trois strikes d\'affilée !!' };
        axelDit(L[frame + '-' + c.length] || (n + ' !'), 3.4);
        aMode = strike ? 'joie' : n === 0 ? 'honte' : 'debout'; aT = 0;
      }
      etat = 'resultat'; tE = 0;
    }
    function apresResultat() {
      camSuit = false; if (banniere) { G.remove(banniere); AV.detruire(banniere); banniere = null; }
      bouleC.visible = true; G.add(bouleC); bouleC.position.set(0.9, 0.72, qui === 'oce' ? 4.3 : 4.55);
      var c = cadre(), finie = c[0] === 10 || c.length === 2;
      if (!finie) { replacerQuilles(false); if (qui === 'oce') tourOce(); else tourAxel(); return; }
      replacerQuilles(true);
      if (qui === 'oce') { tourAxel(); return; }
      frame++;
      if (frame > 5) { finale(); return; }
      axelVa(BANC.x, BANC.z, function () { aMode = 'assis'; }); aTient = false;
      tourOce();
    }
    function finale() {
      etat = 'fin'; tE = 0; frame = 5; dessinerScore(); aMode = 'joie'; aT = 0; aTient = false;
      if (AV.confettis) AV.confettis(160);
      for (var i = 0; i < 6; i++) { var d = AV.texteSprite(auHasard(['🦃', '🔥', '🎳', '✨']), { largeur: 0.6 }); d.position.set(aP.x + (Math.random() - 0.5) * 1.5, 2.2 + Math.random(), aP.z + (Math.random() - 0.5)); G.add(d); emojis.push({ s: d, t: 0 }); }
    }
    var emojis = [];

    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'oceVise') return p.z > 2.8 || Math.abs(p.x) > 0.9 ? '🎳 À toi ! Va sur ta piste (la n°1, devant la ligne rouge)' : '🎯 Décale-toi à gauche/droite, puis ✋ Lancer quand la flèche est bien droite';
      if (etat === 'axelVa' || etat === 'elanA') return '👀 Au tour de ' + nomLui + '…';
      return null;
    };

    // ---------- Chaque image ----------
    mo.anime(function (dt0, t, jp) {
      var dt = dt0 * vite;
      if (!elle) { habiller(); if (elle && etat === 'oceVise') tenir(bouleO, elle); }
      if (parole) parole.t -= dt;
      if (fete > 0) fete -= dt;
      tE += dt;
      // visée d'Océane
      var surPiste = J && jp.z < 2.8 && Math.abs(jp.x) < 0.9, ici = mo.interactifs.indexOf(itLancer) >= 0;
      if (etat === 'oceVise') {
        tAim += dt; aOsc = 0.045 * Math.sin(tAim * 2.2);
        fleche.visible = surPiste; fleche.position.set(Math.max(-0.42, Math.min(0.42, jp.x)), 0, 0); fleche.rotation.y = -aOsc;
        fm.material.color.set(Math.abs(aOsc) < 0.012 ? '#5aff7a' : '#ffe04a');
        itLancer.x = jp.x; itLancer.z = jp.z;
        if (surPiste && !ici) mo.interactifs.push(itLancer); else if (!surPiste && ici) mo.interactifs.splice(mo.interactifs.indexOf(itLancer), 1);
        if (auto && !surPiste && J) { J.position.set(0.05, 0, 1.0); }
        if (auto && surPiste && Math.abs(aOsc) < 0.004) lancerOce(aOsc);
      }
      if (etat === 'elanO') {
        eElan += dt; J.position.x = lance.x0; J.vitesse.set(0, 0, 0); J.angle = Math.PI; J.groupe.rotation.y = Math.PI;
        if (eElan >= 0.6) { eElan = -1; demarrerRoule(bouleO); }
      }
      if (etat === 'elanA' && aT >= 0.9) { aTient = false; aMode = 'debout'; aT = 0; demarrerRoule(bouleA); }
      if (etat === 'roule') {
        simAcc += dt; while (simAcc >= 1 / 120) { sim.pas(1 / 120); simAcc -= 1 / 120; if (lance.force && !sim.forceFait && !sim.b.gout && sim.b.z < HP + 0.12) { sim.forceFait = true; forcer(); } }
        if (sim.contact && !sonFait) { sonFait = true; AV.audio.quilles && AV.audio.quilles(lance.force ? 9 : 6); }
        majVisuels(sim, bouleC, dt);
        if ((sim.calme() && tE > 3.0) || tE > 7) finRoule();
      } else if (etat === 'resultat') {
        if (banniere) banniere.position.y = 0.85 + Math.sin(tE * 6) * 0.04;
        if (tE > 2.2) apresResultat();
      } else if (etat === 'fin') {
        if (tE > 3.2 && !finFaite) {
          finFaite = true; var o = total('oce'), x = total('axel');
          axelDit(o > x ? 'Bon… t\'as gagné ' + o + ' à ' + x + ' 😅 Mais t\'as vu mon turkey ?! 🦃' : x > o ? x + ' à ' + o + '… le réveil du champion 😎 C\'est toi qui m\'as porté chance ❤' : 'Égalité parfaite ! On est faits l\'un pour l\'autre ❤', 5);
        }
        if (tE > 8.5 && finFaite !== 2) { finFaite = 2; if (api) api.trouver(); }
      }
      if (etat !== 'oceVise') { fleche.visible = false; if (ici && etat !== 'oceVise') mo.interactifs.splice(mo.interactifs.indexOf(itLancer), 1); }
      majAxel(dt, t); animerElle(dt, t);
      figurants.forEach(function (f, i) { f.tete.rotation.y = Math.sin(t * 0.5 + i) * 0.4; });
      for (var e = emojis.length - 1; e >= 0; e--) { var em = emojis[e]; em.t += dt; em.s.position.y += dt * 0.6; em.s.material.opacity = Math.max(0, 1 - em.t / 3); if (em.t > 3) { G.remove(em.s); AV.detruire(em.s); emojis.splice(e, 1); } }
    });
    // la caméra suit la boule jusqu'aux quilles
    mo.surCamera = function (camera, dt) {
      if (!camSuit || !sim) return;
      if (!camInit) { camInit = true; camP.copy(camera.position); camL.set(0, 0.3, -6); }
      var b = sim.b, pos, look, k = 1 - Math.exp(-(dt || 0.016) * 5);
      if (b.z > HP + 5 && !b.fini) { pos = new THREE.Vector3(b.x * 0.6, 1.0, b.z + 2.6); look = new THREE.Vector3(b.x * 0.5, 0.15, b.z - 3); }
      else { pos = new THREE.Vector3(0, 1.3, HP + 3.6); look = new THREE.Vector3(0, 0.12, HP - 0.4); }
      camP.lerp(pos, k); camL.lerp(look, k); camera.position.copy(camP); camera.lookAt(camL);
    };
    mo.debut = function (a) {
      api = a; habiller(); if (AV.jeu) AV.jeu.camera(0, 0.35, 5.5);
      tourOce(); axelDit('Prépare-toi à perdre, mon cœur 😎🎳', 3.4);
    };
    mo.nettoyer = function () { deshabiller(); etat = 'parti'; };
    mo.debug = {
      etat: function () { return { etat: etat, qui: qui, frame: frame, oce: JSON.stringify(cadres.oce), axel: JSON.stringify(cadres.axel), totO: total('oce'), totA: total('axel') }; },
      vite: function (v) { vite = v; }, auto: function (v) { auto = v !== false; },
      lancer: function (a) { if (J) { J.position.set(0.05, 0, 1.0); } lancerOce(a || 0); }
    };
    return mo;
  };
})(window.AV);
