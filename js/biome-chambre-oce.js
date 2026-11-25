/* Biome « chambre_oce » : la chambre d'Océ, dans la coloc au R+1 (entrée par le couloir au nord, salon à l'est, terrasse au sud).
   D'après media/J17 (plan) : bureau (niche nord-ouest), lit, douche + lavabo (sud-ouest), grande armoire (mur est), télé face au lit.
   Cette fois on joue LUI. Océ est assise sur son lit. Charlie, chat très joueur (et un peu coquin), est caché sous le lit :
   il attaque les chevilles quand on passe trop près (⤒ pour esquiver), et vole une chaussette…
   La canne à plume est dans l'armoire ; on l'agite près du lit, Charlie sort et la suit. Lui faire faire 3 bêtises :
   sauter sur le bureau, dans la douche, puis sur le lit. Il allume la télé avec la télécommande, se met sur le dos… piège du ventre,
   ronrons, et la surprise de jours.js s'ouvre. Échelle ×1,5 (comme l'appart). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var K = 0.0227;                                         // 1 px du plan = 2,27 cm (×1,5)
  function P(px, py) { return { x: (px - 240) * K, z: (py - 360) * K }; }
  var CIEL = { haut: '#1c2a58', bas: '#e8a07a', brouillard: '#3a3d66', hemi: ['#fff0dc', '#6b5a4a', 1.0], soleil: ['#ffe2c0', 0.45, [0.15, 1, 0.12]] };
  var HM = 3.3, EP = 0.12;                                // hauteur et épaisseur des murs
  // la chambre (intérieur) et le couloir
  var CH = { x0: P(140, 0).x, x1: P(343, 0).x, z0: P(0, 145).z, z1: P(0, 572).z };
  var CO = { x0: P(135, 0).x, x1: P(355, 0).x, z0: -8.2, z1: CH.z0 };
  var PORTE = { x0: 0.9, x1: 2.1 };                       // ouverture dans le mur nord
  var BUREAU = { x0: CH.x0, x1: CH.x0 + 0.8, z0: P(0, 162).z, z1: P(0, 252).z };
  var LIT = { x0: P(152, 0).x, x1: P(232, 0).x, z0: P(0, 288).z, z1: P(0, 422).z }, HLIT = 1.05;
  var ARM = { x0: P(292, 0).x, x1: CH.x1, z0: P(0, 255).z, z1: P(0, 495).z }, HARM = 3.2;
  var DOUCHE = { x0: P(148, 0).x, x1: P(205, 0).x, z0: P(0, 470).z, z1: CH.z1 };
  var VASQUE = { x0: P(205, 0).x, x1: P(245, 0).x, z0: P(0, 470).z, z1: P(0, 470).z + 0.55 };
  var CL1 = P(0, 258).z, CL2 = P(0, 465).z, CL1x = P(235, 0).x, CL2x = P(245, 0).x;
  var TV = { x: P(192, 0).x, z: CL2 - 0.1 };                        // télé fixée sur la cloison de la douche, face au pied du lit
  var BAIE = { x0: P(270, 0).x - 0.1, x1: P(315, 0).x + 0.1 };      // porte-fenêtre vers la terrasse (mur sud)
  var CHAISE = { x: CH.x0 + 1.35, z: (BUREAU.z0 + BUREAU.z1) / 2 };
  var SOUS_LIT = { x: (LIT.x0 + LIT.x1) / 2, z: (LIT.z0 + LIT.z1) / 2 + 0.2 };

  function dansRect(x, z, r, m) { m = m || 0; return x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m; }
  function distRect(x, z, r) { var dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); return Math.sqrt(dx * dx + dz * dz); }
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function H(x, z) { return (x > -2.7 && x < 9.4 && z > -8.6 && z < 8.8) ? 0 : -6; }
  function autorise(x, z) { return dansRect(x, z, { x0: CH.x0 + 0.05, x1: CH.x1 - 0.05, z0: CH.z0 - 0.3, z1: CH.z1 - 0.05 }) || dansRect(x, z, { x0: CO.x0 + 0.1, x1: CO.x1 - 0.1, z0: CO.z0 + 0.1, z1: CO.z1 + 0.3 }); }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(F, l, h, p, col, x, y, z, ry, rx) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1, rx || 0); }
  function boiteR(F, r, y0, y1, col) { boite(F, r.x1 - r.x0, y1 - y0, r.z1 - r.z0, col, (r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function toile(dessin, w, h, cw, ch) {
    var c = document.createElement('canvas'); c.width = cw || 512; c.height = ch || Math.round((cw || 512) * h / w);
    dessin(c.getContext('2d'), c.width, c.height);
    var tex = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.userData.canvas = c; m.userData.tex = tex;
    return m;
  }

  // ---------- Personnages ----------
  function personne(o) {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var peau = o.peau || '#eec29a', jambes = [], bras = [], pieds = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.15, 0.8, 0.17, o.bas || '#5a5f6b', 0, -0.4, 0));
      var pied = bm(0.16, 0.1, 0.27, o.chaussettes || '#f2f2f2', 0, -0.79, 0.05); j.add(pied); pieds.push(pied);
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), o.haut || '#24324a'); t.position.y = 1.11; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), peau));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), o.cheveux || '#5a3a24'); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    if (o.longs) { var cl = AV.maille(new THREE.BoxGeometry(0.34, 0.5, 0.1), o.cheveux); cl.position.set(0, -0.14, -0.13); tete.add(cl); }
    [-1, 1].forEach(function (c) { var oe = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); oe.position.set(c * 0.06, 0.0, 0.152); tete.add(oe); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux || '#5a3a24' });
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.075, 0.07, 0.55, 6), o.manches || o.haut || '#24324a'); m.position.y = -0.28; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), peau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes, pieds: pieds };
  }

  AV.biomes = AV.biomes || {};
  AV.biomes.chambre_oce = function (cfg) {
    var rng = AV.rng(1717 + cfg.jour);
    var nomElle = cfg.copine || 'Océ', nom = cfg.nom || 'Charlie';
    var mo = new AV.Monde({
      rayon: 9.5, hauteur: H, surface: 'bois', ciel: CIEL, brouillard: [30, 160],
      depart: { x: 1.5, z: -7.2, angle: 0 }, theme: 'chambre', ambiance: null, autorise: autorise
    });
    mo.loin = 400;
    mo.sansAnimal = true;
    mo.surfaceA = function (x, z) { return z < CH.z0 ? 'pave' : dansRect(x, z, DOUCHE) ? 'pave' : 'bois'; };
    var G = mo.groupe, col = mo.colliders;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    G.add(AV.etoiles(200, 380));

    // ---------- Sols : parquet (chambre), carrelage (couloir, douche), salon, terrasse ; l'immeuble et la ville dessous ----------
    var S = new AV.Fusion();
    for (var px = CH.x0; px < CH.x1; px += 0.22) boite(S, 0.21, 0.05, CH.z1 - CH.z0, ((px * 7) | 0) % 2 ? '#b98a5e' : '#ad7f55', px + 0.11, -0.025, (CH.z0 + CH.z1) / 2);
    for (var cx = CO.x0; cx < CO.x1; cx += 0.6) for (var cz = CO.z0; cz < CO.z1; cz += 0.6) boite(S, 0.58, 0.05, 0.58, ((cx + cz) * 1.7 | 0) % 2 ? '#d8d3ca' : '#cfc9bf', cx + 0.3, -0.024, cz + 0.3);
    boite(S, 6.8, 0.05, 13, '#a98458', 5.9, -0.026, -1.8);                         // salon
    boite(S, 12, 0.08, 3.8, '#bfb2a0', 3.4, -0.04, 6.85);                          // terrasse
    boite(S, 12.4, 6, 17.6, '#d9c7a8', 3.4, -3.08, 0.1);                           // l'immeuble
    for (var fy = 0; fy < 2; fy++) for (var fx2 = -1.5; fx2 < 9; fx2 += 2.2) boite(S, 1.1, 1.5, 0.05, '#3c4a66', fx2, -4.6 + fy * 0.1, 8.92);
    boite(S, 80, 0.1, 80, '#4a4f58', 3, -6.05, 10);                                // la rue
    var r2 = AV.rng(7);
    for (var ib = 0; ib < 18; ib++) { var ba = r2() * Math.PI * 2, bd = 22 + r2() * 30, bh = 8 + r2() * 14, bw = 6 + r2() * 6; boite(S, bw, bh, bw, AV.choisir(r2, ['#c9b79a', '#d8c4a6', '#b9a68a', '#e0d2bd']), 3 + Math.cos(ba) * bd, -6 + bh / 2, Math.sin(ba) * bd, ba); }
    var sols = S.maille(); sols.receiveShadow = true; G.add(sols);
    // fenêtres allumées de la ville
    var lum = new AV.Fusion();
    for (var il = 0; il < 140; il++) { var la = r2() * Math.PI * 2, ld = 20 + r2() * 30; boite(lum, 0.8, 1, 0.8, r2() < 0.7 ? '#ffd98a' : '#9fd0ff', 3 + Math.cos(la) * ld, -4 + r2() * 14, Math.sin(la) * ld); }
    G.add(lum.maille(new THREE.MeshBasicMaterial({ vertexColors: true })));

    // ---------- Murs (chacun s'efface quand la caméra passe derrière) ----------
    var murs = [];
    function mur(construire, test, couleur) {
      var F = new AV.Fusion(); construire(F, couleur || '#efe6da');
      var m = F.maille(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 }));
      m.castShadow = true; m.receiveShadow = true; G.add(m); murs.push({ m: m, test: test, o: 1 });
      return m;
    }
    function murX(F, c, x, z0, z1, y0, y1) { boite(F, EP, (y1 || HM) - (y0 || 0), z1 - z0, c, x, ((y1 || HM) + (y0 || 0)) / 2, (z0 + z1) / 2); }
    function murZ(F, c, z, x0, x1, y0, y1) { boite(F, x1 - x0, (y1 || HM) - (y0 || 0), EP, c, (x0 + x1) / 2, ((y1 || HM) + (y0 || 0)) / 2, z); }
    var FEN = { z0: -4.25, z1: -2.85, y0: 1.3, y1: 2.7 };
    mur(function (F, c) { // ouest : chambre (avec la fenêtre du bureau) + couloir
      var x = CH.x0 - EP / 2; murX(F, c, x, CH.z0, FEN.z0); murX(F, c, x, FEN.z1, CH.z1 + EP); murX(F, c, x, FEN.z0, FEN.z1, 0, FEN.y0); murX(F, c, x, FEN.z0, FEN.z1, FEN.y1, HM);
      murX(F, c, CO.x0 - EP / 2, CO.z0, CO.z1);
      boite(F, 0.16, 0.08, FEN.z1 - FEN.z0 + 0.2, '#ffffff', x + 0.06, FEN.y0, (FEN.z0 + FEN.z1) / 2);
      for (var ph = 0; ph < 6; ph++) boite(F, 0.02, 0.26, 0.2, ['#ffffff', '#ffe3ec', '#e3f0ff'][ph % 3], CH.x0 + 0.04, 2.3 - Math.sin(ph / 5 * Math.PI) * 0.15, LIT.z0 + 0.45 + ph * 0.42); // guirlande de photos
      boite(F, 0.03, 1.0, 0.75, '#f7d6c4', CH.x0 + 0.04, 2.2, 1.9); // poster
    }, function (cam, j) { return cam.x < CH.x0 - 0.1; });
    mur(function (F, c) { var x = CH.x1 + EP / 2; murX(F, c, x, CH.z0, CH.z1 + EP); murX(F, c, CO.x1 + EP / 2, CO.z0, CO.z1); }, function (cam) { return cam.x > CH.x1 + 0.1; });
    mur(function (F, c) { // sud : porte-fenêtre vers la terrasse
      var z = CH.z1 + EP / 2; murZ(F, c, z, CH.x0 - EP, BAIE.x0); murZ(F, c, z, BAIE.x1, CH.x1 + EP); murZ(F, c, z, BAIE.x0, BAIE.x1, 2.3, HM);
      [BAIE.x0, (BAIE.x0 + BAIE.x1) / 2, BAIE.x1].forEach(function (x) { boite(F, 0.07, 2.3, EP + 0.04, '#ffffff', x, 1.15, z); });
      boite(F, BAIE.x1 - BAIE.x0, 0.07, EP + 0.04, '#ffffff', (BAIE.x0 + BAIE.x1) / 2, 2.27, z); boite(F, 0.04, 0.18, 0.06, '#c0c4c8', (BAIE.x0 + BAIE.x1) / 2 - 0.08, 1.05, z - 0.08);
    }, function (cam) { return cam.z > CH.z1 + 0.1; });
    var verre = new THREE.Mesh(new THREE.BoxGeometry(BAIE.x1 - BAIE.x0, 2.25, 0.02), new THREE.MeshLambertMaterial({ color: '#bfe0f0', transparent: true, opacity: 0.3, depthWrite: false }));
    verre.position.set((BAIE.x0 + BAIE.x1) / 2, 1.13, CH.z1 + EP / 2); G.add(verre);
    mur(function (F, c) { // nord : porte de la chambre (avec linteau)
      var z = CH.z0 - EP / 2; murZ(F, c, z, CH.x0 - EP, PORTE.x0); murZ(F, c, z, PORTE.x1, CH.x1 + EP); murZ(F, c, z, PORTE.x0, PORTE.x1, 2.9, HM);
      [PORTE.x0, PORTE.x1].forEach(function (x) { boite(F, 0.1, 2.9, EP + 0.06, '#ffffff', x, 1.45, z); });
    }, function (cam, j) { return (cam.z < CH.z0) !== (j.z < CH.z0); });
    mur(function (F, c) { murZ(F, c, CO.z0 - EP / 2, CO.x0 - EP, CO.x1 + EP); boite(F, 1.3, 2.9, 0.08, '#7a5a3e', 0.2, 1.45, CO.z0 + 0.01); boite(F, 0.1, 0.1, 0.12, '#d8c070', 0.7, 1.4, CO.z0 + 0.08); }, function (cam) { return cam.z < CO.z0; });
    mur(function (F, c) { murZ(F, c, CL1, CH.x0, CL1x); }, function (cam, j) { return (cam.z < CL1) !== (j.z < CL1) && Math.min(cam.x, j.x) < CL1x; });
    mur(function (F, c) { murZ(F, c, CL2, CH.x0, CL2x); }, function (cam, j) { return (cam.z < CL2) !== (j.z < CL2) && Math.min(cam.x, j.x) < CL2x; });
    col.push({ rect: true, x: CH.x0 - 0.06, z: 0, hx: 0.08, hz: 4.9, a: 0 }, { rect: true, x: CH.x1 + 0.06, z: 0, hx: 0.08, hz: 4.9, a: 0 });
    col.push({ rect: true, x: 0, z: CH.z1 + 0.06, hx: 2.4, hz: 0.08, a: 0 });
    col.push({ rect: true, x: (CH.x0 + PORTE.x0) / 2, z: CH.z0 - 0.06, hx: (PORTE.x0 - CH.x0) / 2, hz: 0.08, a: 0 }, { rect: true, x: (PORTE.x1 + CO.x1) / 2, z: CH.z0 - 0.06, hx: (CO.x1 - PORTE.x1) / 2 + 0.1, hz: 0.08, a: 0 });
    col.push({ rect: true, x: (CH.x0 + CL1x) / 2, z: CL1, hx: (CL1x - CH.x0) / 2, hz: 0.07, a: 0 }, { rect: true, x: (CH.x0 + CL2x) / 2, z: CL2, hx: (CL2x - CH.x0) / 2, hz: 0.07, a: 0 });

    // ---------- Les meubles ----------
    var M = new AV.Fusion();
    // bureau (rouge sur le plan) : plateau blanc, ordi, lampe, mug, pot à crayons, plante, tableau en liège
    boiteR(M, { x0: BUREAU.x0, x1: BUREAU.x1, z0: BUREAU.z0, z1: BUREAU.z1 }, 1.05, 1.11, '#f4f1ec');
    [[BUREAU.x0 + 0.1, BUREAU.z0 + 0.1], [BUREAU.x1 - 0.1, BUREAU.z0 + 0.1], [BUREAU.x0 + 0.1, BUREAU.z1 - 0.1], [BUREAU.x1 - 0.1, BUREAU.z1 - 0.1]].forEach(function (p) { boite(M, 0.07, 1.05, 0.07, '#c9c4bc', p[0], 0.525, p[1]); });
    boite(M, 0.04, 0.45, 0.7, '#2b2d33', BUREAU.x0 + 0.25, 1.4, -3.5, 0, 0); boite(M, 0.4, 0.03, 0.55, '#3a3d44', BUREAU.x0 + 0.5, 1.13, -3.5);
    forme(M, new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6), '#e8b23a', BUREAU.x0 + 0.2, 1.35, BUREAU.z0 + 0.3, 0, 1, 1, 1);
    forme(M, new THREE.ConeGeometry(0.15, 0.18, 8), '#e8b23a', BUREAU.x0 + 0.25, 1.62, BUREAU.z0 + 0.3, 0, 1, 1, 1);
    forme(M, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), '#7aa0d6', BUREAU.x0 + 0.3, 1.19, BUREAU.z1 - 0.3, 0, 1, 1, 1);
    forme(M, new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8), '#c96a4a', BUREAU.x0 + 0.25, 1.21, BUREAU.z1 - 0.12, 0, 1, 1, 1);
    forme(M, new THREE.IcosahedronGeometry(0.2, 0), '#4d8a4a', BUREAU.x0 + 0.25, 1.45, BUREAU.z1 - 0.12, 0, 1, 1, 1);
    boite(M, 0.04, 0.9, 1.3, '#c49a6c', CH.x0 + 0.03, 2.05, -2.7 - 0.05);
    ['#ff8fa3', '#7fb2ff', '#ffd166', '#a0e0a0'].forEach(function (c, i) { boite(M, 0.02, 0.22, 0.18, c, CH.x0 + 0.06, 1.85 + (i % 2) * 0.35, -3.1 + i * 0.25); });
    // la chaise du bureau
    boite(M, 0.55, 0.08, 0.55, '#3a3d44', CHAISE.x, 0.7, CHAISE.z); boite(M, 0.08, 0.6, 0.5, '#3a3d44', CHAISE.x + 0.26, 1.05, CHAISE.z);
    forme(M, new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), '#888', CHAISE.x, 0.35, CHAISE.z, 0, 1, 1, 1); forme(M, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 5), '#555', CHAISE.x, 0.05, CHAISE.z, 0, 1, 1, 1);
    // le lit (jaune sur le plan) : cadre en bois sur pieds (Charlie dort dessous), matelas, couette, coussins, tête de lit
    var lc = { x: (LIT.x0 + LIT.x1) / 2 };
    boiteR(M, LIT, 0.5, 0.62, '#c8a273');
    [[LIT.x0 + 0.08, LIT.z0 + 0.08], [LIT.x1 - 0.08, LIT.z0 + 0.08], [LIT.x0 + 0.08, LIT.z1 - 0.08], [LIT.x1 - 0.08, LIT.z1 - 0.08]].forEach(function (p) { boite(M, 0.09, 0.5, 0.09, '#a8845a', p[0], 0.25, p[1]); });
    boiteR(M, { x0: LIT.x0 + 0.04, x1: LIT.x1 - 0.04, z0: LIT.z0 + 0.04, z1: LIT.z1 - 0.04 }, 0.62, 0.9, '#f6f3ee');
    boiteR(M, { x0: LIT.x0 - 0.02, x1: LIT.x1 + 0.03, z0: LIT.z0 + 0.75, z1: LIT.z1 + 0.03 }, 0.88, HLIT, '#f2c66b');
    boite(M, LIT.x1 - LIT.x0 + 0.05, 0.42, 0.06, '#f2c66b', lc.x, 0.68, LIT.z1 + 0.04); boite(M, 0.05, 0.38, LIT.z1 - LIT.z0 - 0.75, '#f2c66b', LIT.x1 + 0.04, 0.7, (LIT.z0 + 0.75 + LIT.z1) / 2);
    [-0.45, 0.45].forEach(function (o) { boite(M, 0.7, 0.22, 0.45, '#ffffff', lc.x + o, 1.0, LIT.z0 + 0.35); });
    boite(M, 0.5, 0.32, 0.18, '#e9a0b4', lc.x + 0.3, 1.12, LIT.z0 + 0.62, 0, -0.3);
    boite(M, LIT.x1 - LIT.x0 + 0.1, 1.5, 0.12, '#c8a273', lc.x, 0.95, LIT.z0 - 0.06);
    // table de nuit + lampe (côté passage)
    boite(M, 0.5, 0.6, 0.45, '#c8a273', LIT.x1 + 0.3, 0.3, LIT.z0 + 0.15);
    forme(M, new THREE.CylinderGeometry(0.03, 0.05, 0.3, 6), '#ddd', LIT.x1 + 0.3, 0.75, LIT.z0 + 0.15, 0, 1, 1, 1); forme(M, new THREE.CylinderGeometry(0.1, 0.16, 0.2, 8), '#fff4dc', LIT.x1 + 0.3, 0.98, LIT.z0 + 0.15, 0, 1, 1, 1);
    // tapis au pied du lit
    boite(M, 1.6, 0.02, 1.0, '#d9c3e6', lc.x + 0.3, 0.012, LIT.z1 + 0.6);
    // douche (rose) : receveur, paroi vitrée (à part), pommeau ; lavabo (violet) : meuble vasque + miroir
    boiteR(M, DOUCHE, 0, 0.1, '#f4f4f4');
    for (var tz = DOUCHE.z0; tz < DOUCHE.z1; tz += 0.3) boite(M, 0.02, 2.4, 0.28, '#e6eef2', CH.x0 + 0.02, 1.2, tz + 0.15);
    forme(M, new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), '#c0c4c8', DOUCHE.x0 + 0.12, 2.2, DOUCHE.z1 - 0.3, 0, 1, 1, 1);
    forme(M, new THREE.CylinderGeometry(0.12, 0.08, 0.05, 10), '#c0c4c8', DOUCHE.x0 + 0.25, 2.75, DOUCHE.z1 - 0.3, 0, 1, 1, 1, 0, 0.5);
    boiteR(M, VASQUE, 0, 0.95, '#8a6bb0'); boiteR(M, { x0: VASQUE.x0 - 0.02, x1: VASQUE.x1 + 0.02, z0: VASQUE.z0, z1: VASQUE.z1 + 0.03 }, 0.95, 1.0, '#ffffff');
    forme(M, new THREE.CylinderGeometry(0.22, 0.16, 0.12, 12), '#ffffff', (VASQUE.x0 + VASQUE.x1) / 2, 1.05, VASQUE.z0 + 0.3, 0, 1, 1, 1);
    boite(M, 0.7, 0.9, 0.03, '#cfe4f0', (VASQUE.x0 + VASQUE.x1) / 2, 1.75, CL2 + 0.08);
    // télé murale sur la cloison, face au pied du lit (l'écran est à part) + petite étagère dessous
    boite(M, 1.5, 0.9, 0.06, '#16181c', TV.x, 1.6, TV.z); boite(M, 0.4, 0.3, 0.06, '#2b2d33', TV.x, 1.6, TV.z + 0.05);
    boite(M, 1.2, 0.04, 0.25, '#f0ebe3', TV.x, 0.95, CL2 - 0.18); boite(M, 0.3, 0.06, 0.15, '#3a3d44', TV.x - 0.3, 1.0, CL2 - 0.18);
    // guirlande de photos au-dessus du lit, posters
    var meubles = M.maille(); meubles.castShadow = true; meubles.receiveShadow = true; G.add(meubles);
    col.push({ rect: true, x: (BUREAU.x0 + BUREAU.x1) / 2, z: (BUREAU.z0 + BUREAU.z1) / 2, hx: 0.42, hz: (BUREAU.z1 - BUREAU.z0) / 2, a: 0 }, { x: CHAISE.x, z: CHAISE.z, r: 0.3 });
    col.push({ rect: true, x: lc.x, z: (LIT.z0 + LIT.z1) / 2, hx: (LIT.x1 - LIT.x0) / 2 + 0.03, hz: (LIT.z1 - LIT.z0) / 2 + 0.03, a: 0 }, { x: LIT.x1 + 0.3, z: LIT.z0 + 0.15, r: 0.28 });
    col.push({ rect: true, x: (DOUCHE.x0 + DOUCHE.x1) / 2, z: (DOUCHE.z0 + 3.2) / 2, hx: (DOUCHE.x1 - DOUCHE.x0) / 2, hz: (3.2 - DOUCHE.z0) / 2, a: 0 });
    col.push({ rect: true, x: (VASQUE.x0 + VASQUE.x1) / 2, z: (VASQUE.z0 + VASQUE.z1) / 2, hx: (VASQUE.x1 - VASQUE.x0) / 2, hz: (VASQUE.z1 - VASQUE.z0) / 2, a: 0 });
    // paroi de douche vitrée
    var vitre = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.3, 3.2 - DOUCHE.z0), new THREE.MeshLambertMaterial({ color: '#cfe8f2', transparent: true, opacity: 0.35, depthWrite: false }));
    vitre.position.set(DOUCHE.x1, 1.15, (DOUCHE.z0 + 3.2) / 2); G.add(vitre);
    // l'écran de la télé (canvas : noir, puis allumé par Charlie)
    var ecran = toile(function (x, w, h) { x.fillStyle = '#0b0c10'; x.fillRect(0, 0, w, h); }, 1.38, 0.78, 512, 290);
    ecran.position.set(TV.x, 1.6, TV.z - 0.035); ecran.rotation.y = Math.PI; G.add(ecran);
    // la télécommande sur le lit
    var telec = bm(0.07, 0.04, 0.22, '#222', lc.x + 0.35, HLIT + 0.02, LIT.z1 - 0.5); G.add(telec);

    // ---------- L'armoire (verte) : se fond quand elle cache la vue ; une porte s'ouvre ----------
    var A = new AV.Fusion();
    boiteR(A, { x0: ARM.x0 + 0.03, x1: ARM.x1, z0: ARM.z0, z1: ARM.z1 }, 0, HARM, '#f1ede6');
    var nbP = 4, lp = (ARM.z1 - ARM.z0) / nbP;
    for (var ip = 0; ip < nbP; ip++) { if (ip === 1) continue; boite(A, 0.04, HARM - 0.1, lp - 0.04, '#e9e3d8', ARM.x0, HARM / 2, ARM.z0 + lp * (ip + 0.5)); boite(A, 0.05, 0.5, 0.04, '#9a9a9a', ARM.x0 - 0.03, 1.6, ARM.z0 + lp * (ip + 0.5) + (ip % 2 ? -1 : 1) * (lp / 2 - 0.12)); }
    // l'intérieur de la porte n°2 : étagères, vêtements… et la canne à plume
    var zP = ARM.z0 + lp * 1.5;
    boite(A, 0.9, 0.04, lp - 0.1, '#d8d0c2', ARM.x0 + 0.5, 1.9, zP); boite(A, 0.9, 0.04, lp - 0.1, '#d8d0c2', ARM.x0 + 0.5, 0.9, zP);
    for (var v = 0; v < 6; v++) boite(A, 0.6, 0.12, 0.25, AV.choisir(rng, ['#e9a0b4', '#7aa0d6', '#f2f2f2', '#2b2d33', '#d9c3e6']), ARM.x0 + 0.45, 1.98 + (v % 3) * 0.13, zP - 0.35 + Math.floor(v / 3) * 0.45);
    var armoire = A.maille(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 })); armoire.castShadow = true; G.add(armoire);
    murs.push({ m: armoire, test: function (cam, j) { return cam.x > ARM.x0 + 0.2 && j.x < ARM.x0 + 0.2; }, o: 1 });
    var porteA = new THREE.Group(); porteA.position.set(ARM.x0, 0, ARM.z0 + lp); G.add(porteA);
    var pm = bm(0.04, HARM - 0.1, lp - 0.04, '#e9e3d8', 0, HARM / 2, lp / 2); porteA.add(pm); porteA.add(bm(0.05, 0.5, 0.04, '#9a9a9a', -0.03, 1.6, lp - 0.12));
    murs.push({ m: pm, test: function (cam, j) { return cam.x > ARM.x0 + 0.2 && j.x < ARM.x0 + 0.2 && Math.abs(porteA.rotation.y) < 0.3; }, o: 1 }); pm.material = pm.material.clone(); pm.material.transparent = true;
    var canne = new THREE.Group();
    canne.add(bm(0.025, 0.025, 1.0, '#c49a6c', 0, 0, 0.5));
    var fil = bm(0.008, 0.45, 0.008, '#ddd', 0, -0.22, 1.0); canne.add(fil);
    var plume = new THREE.Group(); plume.position.set(0, -0.47, 1.0); canne.add(plume);
    ['#ff5a8a', '#ffd166', '#7fd4ff'].forEach(function (c, i) { var f = AV.maille(new THREE.ConeGeometry(0.045, 0.28, 5), c); f.position.set((i - 1) * 0.04, -0.12, 0); f.rotation.z = (i - 1) * 0.35 + Math.PI; plume.add(f); });
    canne.position.set(ARM.x0 + 0.45, 1.45, zP - 0.2); canne.rotation.set(0, -Math.PI / 2, 0); G.add(canne);
    col.push({ rect: true, x: (ARM.x0 + ARM.x1) / 2, z: (ARM.z0 + ARM.z1) / 2, hx: (ARM.x1 - ARM.x0) / 2, hz: (ARM.z1 - ARM.z0) / 2, a: 0 });

    // ---------- Le salon (à l'est) et la terrasse (au sud) ----------
    var Sa = new AV.Fusion();
    boite(Sa, 1.0, 0.5, 2.6, '#6c7a8c', 7.8, 0.25, -1.5); boite(Sa, 0.25, 0.6, 2.6, '#6c7a8c', 8.25, 0.8, -1.5); boite(Sa, 1.0, 0.35, 0.2, '#6c7a8c', 7.8, 0.65, -2.85); boite(Sa, 1.0, 0.35, 0.2, '#6c7a8c', 7.8, 0.65, -0.15);
    boite(Sa, 1.2, 0.45, 0.8, '#c8a273', 5.9, 0.22, -1.5); boite(Sa, 2.4, 0.02, 2.0, '#d8c0a0', 6.4, 0.01, -1.5);
    forme(Sa, new THREE.CylinderGeometry(0.25, 0.2, 0.5, 8), '#c96a4a', 4.0, 0.25, -5.2, 0, 1, 1, 1); forme(Sa, new THREE.IcosahedronGeometry(0.55, 0), '#4d8a4a', 4.0, 0.9, -5.2, 0, 1, 1, 1);
    for (var gr = -2.3; gr < 9.4; gr += 0.25) boite(Sa, 0.04, 1.1, 0.04, '#2b2d33', gr, 0.55, 8.7);
    boite(Sa, 11.8, 0.05, 0.06, '#2b2d33', 3.5, 1.1, 8.7);
    boite(Sa, 0.9, 0.05, 0.9, '#e9e3d8', 5.5, 0.75, 6.8); forme(Sa, new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), '#ddd', 5.5, 0.37, 6.8, 0, 1, 1, 1);
    [[4.7, 6.8], [6.3, 6.8]].forEach(function (c) { boite(Sa, 0.45, 0.05, 0.45, '#2f6fb3', c[0], 0.45, c[1]); });
    [[1, 8.2], [8.6, 5.6], [-1.8, 8.2]].forEach(function (p) { forme(Sa, new THREE.CylinderGeometry(0.3, 0.24, 0.55, 8), '#c96a4a', p[0], 0.28, p[1], 0, 1, 1, 1); forme(Sa, new THREE.IcosahedronGeometry(0.45, 0), '#4d8a4a', p[0], 0.85, p[1], 0, 1, 1, 1); });
    G.add(Sa.maille());
    var gl = AV.outils.guirlande(AV.outils.guirlandeEntre([-2.2, 2.6, 5.2], [9.2, 2.6, 5.2], 30, 0.4), ['#ffd98a', '#ffb070', '#fff0c0']); gl.material.size = 0.18; G.add(gl);

    // ---------- Lumières : lampe de chevet, lampe du bureau, lueur de la télé ----------
    var lChevet = new THREE.PointLight('#ffcf8a', 0.9, 7, 2); lChevet.position.set(LIT.x1 + 0.3, 1.3, LIT.z0 + 0.15); G.add(lChevet);
    var lBureau = new THREE.PointLight('#ffe2a8', 0.6, 5, 2); lBureau.position.set(BUREAU.x0 + 0.4, 1.7, BUREAU.z0 + 0.4); G.add(lBureau);
    var lTV = new THREE.PointLight('#7fb2ff', 0, 6, 2); lTV.position.set(TV.x, 1.4, TV.z - 0.9); G.add(lTV);

    // ---------- Océ, assise sur son lit ----------
    var oce = personne({ qui: 'oceane', haut: '#f0a6c0', bas: '#8a8f9a', cheveux: '#d6b07a', longs: true, chaussettes: '#ffffff' });
    oce.groupe.position.set(lc.x - 0.1, HLIT - 0.72, LIT.z0 + 0.62); G.add(oce.groupe);
    oce.jambes.forEach(function (j, i) { j.rotation.set(-1.5, 0, (i ? -1 : 1) * 0.05); });
    oce.corps.rotation.x = -0.12; oce.bras[0].rotation.set(-0.5, 0, 0.3); oce.bras[1].rotation.set(-0.5, 0, -0.3);
    var rire = 0;

    // ---------- Lui (le joueur) : on habille le personnage ----------
    var J = null, luiJ = null, cache = [], forceBras = 0;
    function habiller() {
      J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (!J || luiJ) return;
      J.groupe.children.forEach(function (c) { cache.push({ o: c, v: c.visible }); c.visible = false; });
      luiJ = personne({ qui: 'axel', haut: '#24324a', bas: '#5a5f6b', cheveux: '#5a3a24', chaussettes: '#f2f2f2' });
      luiJ.groupe.scale.setScalar(1.05); J.groupe.add(luiJ.groupe);
    }
    function deshabiller() {
      if (!J || !luiJ) return;
      J.groupe.remove(luiJ.groupe); AV.detruire(luiJ.groupe); luiJ = null;
      cache.forEach(function (c) { c.o.visible = c.v; }); cache = [];
    }
    function animerLui(dt) {
      if (!luiJ) return;
      var p = J.parts;
      luiJ.jambes[0].rotation.x = p.jambeG.rotation.x; luiJ.jambes[1].rotation.x = p.jambeD.rotation.x;
      luiJ.corps.position.y = p.corps.position.y; luiJ.corps.rotation.x = p.corps.rotation.x;
      if (forceBras > 0) { forceBras -= dt; luiJ.bras[1].rotation.set(-1.5, 0, 0.1); luiJ.bras[0].rotation.set(p.brasG.rotation.x, 0, -0.1); }
      else if (aCanne) { luiJ.bras[1].rotation.set(-0.7 + Math.sin(tt * 9) * 0.25 * (phase === 'jeu' ? 1 : 0.3), 0, 0.1); luiJ.bras[0].rotation.set(p.brasG.rotation.x, 0, -0.1); }
      else { luiJ.bras[0].rotation.set(p.brasG.rotation.x, 0, -0.1); luiJ.bras[1].rotation.set(p.brasD.rotation.x, 0, 0.1); }
    }

    // ---------- Charlie ----------
    var chat = new AV.Animal('chat'), cm = chat.m, cg = chat.groupe;
    cg.scale.setScalar(0.75); G.add(cg);
    var yeux = [];
    [-1, 1].forEach(function (c) { var y = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#f5e050' })); y.position.set(c * 0.1, 0.06, 0.24); y.visible = false; cm.tete.add(y); yeux.push(y); });
    var chaussette = bm(0.12, 0.06, 0.24, '#f2f2f2', 0, -0.12, 0.3); chaussette.visible = false; cm.tete.add(chaussette);
    var etatC = 'cache', tC = 0, cool = 3, bord = { x: 0, z: 0 }, saut = null, ennui = 0, vC = 0, attaques = 0, esquives = 0;
    var cPos = new THREE.Vector3(SOUS_LIT.x, 0, SOUS_LIT.z), cAng = Math.PI / 2;
    function dirC(x, z, dt, k) { cAng = AV.angleLerp(cAng, Math.atan2(x - cPos.x, z - cPos.z), Math.min(1, dt * (k || 10))); }
    function allerVers(x, z, vmax, dt) {
      var dx = x - cPos.x, dz = z - cPos.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d < 0.05) { vC = 0; return true; }
      vC = Math.min(vmax, d * 4); var pas = Math.min(d, vC * dt);
      cPos.x += dx / d * pas; cPos.z += dz / d * pas; dirC(x, z, dt);
      return d < 0.08;
    }
    function bondVers(x, y, z, duree, apres) { saut = { x0: cPos.x, y0: cPos.y, z0: cPos.z, x: x, y: y, z: z, d: duree, t: 0, apres: apres }; etatC = 'saut'; }
    function majSaut(dt) {
      saut.t += dt; var k = Math.min(1, saut.t / saut.d);
      cPos.set(AV.lerp(saut.x0, saut.x, k), AV.lerp(saut.y0, saut.y, k) + Math.sin(k * Math.PI) * 0.7, AV.lerp(saut.z0, saut.z, k));
      dirC(saut.x, saut.z, dt, 20); vC = 3;
      if (k >= 1) { var f = saut.apres; saut = null; etatC = 'pose'; vC = 0; f(); }
    }
    function poseChat(dt, t) {
      cg.position.copy(cPos); cg.rotation.y = cAng;
      cm.corps.scale.y = 1 + Math.sin(t * 2.4) * 0.025;
      var acc = etatC === 'guette' || etatC === 'joue' || etatC === 'accroche';
      cm.queue.rotation.y = Math.sin(t * (acc ? 11 : 3)) * (acc ? 0.7 : 0.4);
      var k = Math.min(1, vC / 2);
      cm.pattes.forEach(function (p, i) { p.rotation.x = Math.sin(t * 16 + i * 1.7) * 0.7 * k; });
      var accroupi = etatC === 'cache' || etatC === 'guette';
      cm.corps.position.y = AV.lerp(cm.corps.position.y, accroupi ? -0.14 : 0, Math.min(1, dt * 8));
      cm.corps.rotation.z = etatC === 'guette' ? Math.sin(t * 22) * 0.12 : etatC === 'dos' || etatC === 'piege' ? Math.PI * 0.85 : etatC === 'rate' ? tC * 9 : 0;
      cm.corps.rotation.x = etatC === 'accroche' ? -1.1 : etatC === 'piege' ? Math.sin(t * 18) * 0.3 : 0;
      yeux.forEach(function (y) { y.visible = etatC === 'guette' || (etatC === 'cache' && Math.sin(t * 1.3) > 0.6); y.scale.setScalar(etatC === 'guette' ? 1.3 : 0.8); });
    }

    // ---------- État du jeu, dialogues ----------
    var api = null, phase = 'entree', aCanne = false, tt = 0, parole = null, faits = {}, nbFaits = 0, coeurs = [], fini = false, tFin = 0, tPhase = 0;
    var mug = bm(0.11, 0.15, 0.11, '#e86a8a', BUREAU.x1 - 0.12, 1.185, -3.0); G.add(mug); var mugV = null;
    var eau = null;
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function elleDit(t, d) { dire('<b>' + nomElle + ' :</b> ' + t, d || 3.2); }
    function sousTitre() {
      if (!api) return;
      var s = cfg.sousTitre || 'Charlie est sous le lit… 🐾';
      if (phase !== 'entree') s = '🐾 Attaques : ' + attaques + ' · esquives : ' + esquives;
      if (aCanne) s = '🪶 Bêtises de ' + nom + ' : ' + nbFaits + ' / 3' + (nbFaits < 2 ? ' (bureau 💻, douche 🚿)' : ' · maintenant le lit 🛏️');
      if (phase === 'final') s = '😼 ' + nom + ' a gagné… et il t\'adore ❤';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }
    var CIBLES = {
      bureau: { x: CHAISE.x, z: CHAISE.z, icone: '💻' },
      douche: { x: (DOUCHE.x0 + DOUCHE.x1) / 2, z: 3.7, icone: '🚿' },
      lit: { x: lc.x + 0.3, z: LIT.z1 - 0.45, icone: '🛏️' }
    };
    Object.keys(CIBLES).forEach(function (k) {
      var c = CIBLES[k], s = AV.texteSprite(c.icone + '✨', { largeur: 0.9 }); s.position.set(c.x, k === 'lit' ? 1.9 : 1.6, c.z); s.visible = false; G.add(s); c.s = s;
    });

    // ---------- Interactions ----------
    var itArmoire = { x: ARM.x0 - 0.45, z: ARM.z0 + lp * 1.5, rayon: 1.1, texte: '🚪 ✋ Ouvrir l\'armoire', fn: function () {
      ouvrirArmoire = 0.001; mo.interactifs = mo.interactifs.filter(function (i) { return i !== itArmoire; }); AV.audio.porte(false);
    } };
    var ouvrirArmoire = 0;
    var itPlume = { x: LIT.x1 + 0.45, z: (LIT.z0 + LIT.z1) / 2, rayon: 1.9, texte: '🪶 ✋ Agiter la plume devant le lit', fn: function () {
      if (etatC !== 'cache') return;
      phase = 'jeu'; etatC = 'sort'; tC = 0; ennui = 0; mo.interactifs = []; AV.audio.miaou(0.6, true); sousTitre();
      elleDit(auHasard(['Regarde-le, il est complètement fou 😂', 'Ça y est, il est sorti ! 🐾']), 2.6);
    } };
    var itVentre = { x: lc.x + 0.3, z: LIT.z1 + 0.4, rayon: 1.6, texte: '🐾 ✋ Caresser le ventre de ' + nom, fn: function () {
      mo.interactifs = []; etatC = 'piege'; tC = 0; forceBras = 2.2; AV.audio.miaou(0.9, false); AV.audio.claque && AV.audio.claque();
      dire('😼 Le piège du ventre ! ' + nom + ' t\'attrape la main avec ses quatre pattes…', 2.6);
    } };
    mo.interactifs.push(itArmoire);
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (phase === 'entree') return '🚪 Entre dans la chambre d\'' + nomElle;
      if (phase === 'embuscade' && attaques + esquives > 0) return '🪶 Sa canne à plume est dans l\'armoire… (⤒ quand ses yeux brillent 👀)';
      if (phase === 'embuscade') return '👀 Attention en passant près du lit…';
      if (phase === 'plume') return '🪶 Agite la plume près du lit pour faire sortir ' + nom;
      if (phase === 'jeu') return ennui > 0.6 ? '🐢 Doucement ! ' + nom + ' n\'arrive plus à suivre la plume…' : '🪶 Emmène ' + nom + ' vers ' + (nbFaits < 2 ? 'le bureau 💻 et la douche 🚿' : 'le lit 🛏️') + ' (marche doucement)';
      return null;
    };

    // ---------- Embuscade ----------
    function attaqueFinie(touche) {
      if (touche) {
        attaques++;
        if (attaques === 1) { chaussette.visible = true; if (luiJ) luiJ.pieds[0].material = AV.mat('#eec29a'); elleDit('Hahaha ! Il t\'a piqué ta chaussette 😂🧦', 3.4); }
        else elleDit(auHasard(['Il t\'adore, c\'est sa façon de dire bonjour 😂', 'Saute ⤒ quand tu vois ses yeux briller 👀', 'Sa canne à plume est dans l\'armoire, il ne résiste jamais 🪶', 'Mon pauvre chéri 😂']), 3);
        rire = 1.6;
      } else { esquives++; dire('😎 Esquivé ! ' + nom + ' fait une roulade…', 2.2); }
      sousTitre();
    }
    function majChat(dt, t) {
      tC += dt;
      var jx = J ? J.position.x : 0, jz = J ? J.position.z : -7;
      if (etatC === 'cache') {
        cPos.y = 0; allerVers(SOUS_LIT.x, SOUS_LIT.z, 3, dt); vC *= 0.3;
        cool -= dt;
        var dl = distRect(jx, jz, LIT);
        if ((phase === 'embuscade' || phase === 'plume') && cool <= 0 && dl < 0.9 && jz > CH.z0) {
          bord.x = Math.max(LIT.x0 + 0.15, Math.min(LIT.x1 - 0.15, jx)); bord.z = Math.max(LIT.z0 + 0.15, Math.min(LIT.z1 - 0.15, jz));
          etatC = 'guette'; tC = 0; AV.audio.miaou(0.25, true);
        }
      } else if (etatC === 'guette') {
        allerVers(bord.x, bord.z, 6, dt); dirC(jx, jz, dt, 12);
        if (tC > 0.75) { var ox = jx - cPos.x, oz = jz - cPos.z, ol = Math.sqrt(ox * ox + oz * oz) || 1; bondVers(jx - ox / ol * 0.35, 0, jz - oz / ol * 0.35, 0.32, function () {
          if (J && !J.auSol) { etatC = 'rate'; tC = 0; AV.audio.saut(); attaqueFinie(false); }
          else { etatC = 'accroche'; tC = 0; AV.audio.miaou(1, false); AV.audio.impact(0.3); if (J && J.auSol) { J.vy = 4.2; J.auSol = false; } dire('😱 Aïe ! ' + nom + ' t\'attaque les chevilles !', 2); }
        }); }
      } else if (etatC === 'saut') majSaut(dt);
      else if (etatC === 'accroche') {
        var a = J ? J.angle : 0;
        cPos.set(jx + Math.cos(a) * 0.28, 0.3 + Math.abs(Math.sin(t * 20)) * 0.06, jz - Math.sin(a) * 0.28);
        dirC(jx, jz, dt, 20);
        if (tC > 1.3) { attaqueFinie(true); etatC = 'retour'; tC = 0; cPos.y = 0; }
      } else if (etatC === 'rate') { if (tC > 0.7) { etatC = 'retour'; tC = 0; } }
      else if (etatC === 'retour') { cPos.y = 0; if (allerVers(SOUS_LIT.x, SOUS_LIT.z, 6, dt) || tC > 3) { etatC = 'cache'; cool = 2.2; } }
      else if (etatC === 'sort') { cPos.y = 0; if (allerVers(LIT.x1 + 0.5, (LIT.z0 + LIT.z1) / 2, 6, dt) || tC > 1) { etatC = 'joue'; tC = 0; } }
      else if (etatC === 'joue') majJeu(dt, t, jx, jz);
      else if (etatC === 'betise') majBetise(dt, t);
      else if (etatC === 'final') majFinal(dt, t);
      else if (etatC === 'piege' || etatC === 'ronron') majFinal(dt, t);
    }

    // ---------- Le jeu de la plume ----------
    var plumeW = new THREE.Vector3();
    function majJeu(dt, t, jx, jz) {
      plume.getWorldPosition(plumeW);
      var fx = Math.max(CH.x0 + 0.3, Math.min(CH.x1 - 0.3, plumeW.x)), fz = Math.max(CH.z0 + 0.3, Math.min(CH.z1 - 0.3, plumeW.z));
      cPos.y = 0;
      var dx = fx - cPos.x, dz = fz - cPos.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.35) allerVers(fx, fz, 7, dt); else { vC = 0; dirC(fx, fz, dt, 6); if (Math.random() < dt * 1.5) cPos.y = 0; }
      ennui = d > 4.2 ? ennui + dt : Math.max(0, ennui - dt * 2);
      if (ennui > 1.8) { etatC = 'retour'; tC = 0; phase = 'plume'; ennui = 0; mo.interactifs = [itPlume]; elleDit('Trop vite ! Il s\'est lassé… réessaie près du lit 😅', 3); sousTitre(); return; }
      ['bureau', 'douche', 'lit'].forEach(function (k) {
        if (faits[k] || etatC !== 'joue' || (k === 'lit' && nbFaits < 2)) return;
        var c = CIBLES[k], ex = c.x - cPos.x, ez = c.z - cPos.z;
        if (ex * ex + ez * ez < 1.1 * 1.1) lancerBetise(k);
      });
    }
    var betise = null;
    function lancerBetise(k) {
      faits[k] = true; nbFaits++; CIBLES[k].s.visible = false; betise = { k: k, t: 0 };
      if (k === 'bureau') bondVers(CHAISE.x, 0.74, CHAISE.z, 0.45, function () { bondVers(BUREAU.x1 - 0.3, 1.11, -3.0, 0.4, function () { etatC = 'betise'; betise.t = 0; }); });
      else if (k === 'douche') bondVers(CIBLES.douche.x, 0.1, CIBLES.douche.z, 0.5, function () { etatC = 'betise'; betise.t = 0; });
      else { phase = 'final'; mo.interactifs = []; bondVers(CIBLES.lit.x, HLIT, CIBLES.lit.z, 0.55, function () { etatC = 'final'; tC = 0; tFin = 0; }); }
      sousTitre();
    }
    function majBetise(dt, t) {
      betise.t += dt; var T = betise.t;
      if (betise.k === 'bureau') {
        if (T < 0.6) dirC(mug.position.x, mug.position.z, dt, 8);
        if (T > 0.6 && !mugV) { mugV = { vx: 1.4, vy: 1.5, rz: 0 }; AV.audio.miaou(0.5, true); }
        if (T > 1.6 && !betise.dit) { betise.dit = true; AV.audio.impact(0.4); elleDit('NOOON mon mug ! 😱 …bon, il est en plastique 😂', 3); }
        if (T > 2.6) { bondVers(CHAISE.x + 0.6, 0, CHAISE.z + 0.4, 0.5, function () { etatC = 'joue'; tC = 0; }); }
      } else {
        if (T > 0.3 && !eau) { eau = creerEau(); AV.audio.plouf(0.6); }
        if (T > 0.3 && T < 1.8 && Math.random() < dt * 6) AV.audio.plouf(0.2);
        cPos.x = CIBLES.douche.x + Math.sin(T * 40) * 0.03;
        if (T > 0.9 && !betise.dit) { betise.dit = true; AV.audio.miaou(1, false); elleDit('Hahaha il a allumé la douche tout seul ! 🚿😂', 3); }
        if (T > 1.9) { if (eau) { G.remove(eau); AV.detruire(eau); eau = null; } bondVers(DOUCHE.x1 + 0.7, 0, 3.9, 0.45, function () { etatC = 'joue'; tC = 0; sousTitre(); }); }
      }
    }
    function creerEau() {
      var n = 120, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { pos[i * 3] = DOUCHE.x0 + 0.25 + (Math.random() - 0.5) * 0.4; pos[i * 3 + 1] = Math.random() * 2.7; pos[i * 3 + 2] = DOUCHE.z1 - 0.3 + (Math.random() - 0.5) * 0.4; }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#bfe6ff', size: 0.05, transparent: true, opacity: 0.8 })); G.add(p); return p;
    }

    // ---------- Final : la télécommande, le ventre, les ronrons ----------
    function allumerTV() {
      var c = ecran.userData.canvas, x = c.getContext('2d'), w = c.width, h = c.height;
      var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a2f7a'); g.addColorStop(1, '#c0517a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '900 58px Nunito, sans-serif'; x.fillText('Charlie TV 🐱', w / 2, 120);
      x.font = '700 40px Nunito, sans-serif'; x.fillText('❤ ' + nomElle + ' + toi ❤', w / 2, 200);
      ecran.userData.tex.needsUpdate = true; lTV.intensity = 0.9; AV.audio.ping(1);
    }
    function majFinal(dt, t) {
      tFin += dt; var T = tFin;
      if (etatC === 'final') {
        if (T < 0.8) { cPos.y = HLIT; allerVers(telec.position.x, telec.position.z + 0.1, 1.5, dt); cPos.y = HLIT; }
        if (T > 0.8 && !fini) { fini = true; allumerTV(); elleDit('Il a allumé la télé 😂 Il veut regarder un film avec nous !', 3.4); }
        if (T > 3.2) { etatC = 'dos'; cPos.set(CIBLES.lit.x, HLIT + 0.2, CIBLES.lit.z); mo.interactifs = [itVentre]; dire('😺 ' + nom + ' se met sur le dos… il te tend son ventre (piège ? 😏)', 3.5); }
      } else if (etatC === 'piege') {
        tC += 0;
        if (Math.random() < dt * 5) AV.audio.miaou(0.3, true);
        if (tFin > 0 && !finPiege) finPiege = t + 2.2;
        if (t > finPiege) { etatC = 'ronron'; tC = 0; rire = 1.5; elleDit('Hahaha le piège du ventre ! 😂 …écoute, il ronronne ❤', 3.4); }
      } else if (etatC === 'ronron') {
        if (Math.random() < dt * 0.9) AV.audio.ronron(0.8);
        if (Math.random() < dt * 3) coeur(cPos.x, cPos.y + 0.6, cPos.z);
        if (tC > 4 && !trouveFait) { trouveFait = true; sousTitre(); if (api) api.trouver(); }
      }
    }
    var finPiege = 0, trouveFait = false;
    function coeur(x, y, z) {
      var s = AV.texteSprite(auHasard(['❤️', '💕', '💗', '😻']), { largeur: 0.5 });
      s.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4); G.add(s); coeurs.push({ s: s, t: 0 });
    }

    // ---------- Chaque image ----------
    mo.anime(function (dt, t, jp) {
      tt = t; tPhase += dt;
      if (!luiJ) habiller();
      if (parole) parole.t -= dt;
      if (phase === 'entree' && jp.z > CH.z0 + 0.4) { phase = 'embuscade'; cool = 1.2; elleDit('Coucou mon cœur ! 😘 Attention en passant près du lit… ' + nom + ' est en mode chasseur 😏', 4); sousTitre(); }
      // armoire qui s'ouvre, la canne qui saute dans la main
      if (ouvrirArmoire > 0) {
        ouvrirArmoire += dt; porteA.rotation.y = -1.7 * lisse(0, 0.6, ouvrirArmoire);
        if (ouvrirArmoire > 0.8 && !aCanne && luiJ) {
          aCanne = true; G.remove(canne); luiJ.bras[1].add(canne); canne.position.set(0, -0.6, 0); canne.rotation.set(0.9, 0, 0); canne.scale.setScalar(0.95);
          phase = 'plume'; mo.interactifs = [itPlume]; AV.audio.ping(1); CIBLES.bureau.s.visible = CIBLES.douche.s.visible = true;
          elleDit('Sa canne à plume ! Agite-la près du lit, il va devenir fou 😂', 3.4); sousTitre();
        }
      }
      if (nbFaits >= 2 && !faits.lit) CIBLES.lit.s.visible = true;
      Object.keys(CIBLES).forEach(function (k) { var s = CIBLES[k].s; if (s.visible) s.position.y = (k === 'lit' ? 1.9 : 1.6) + Math.sin(t * 3) * 0.08; });
      plume.rotation.z = Math.sin(t * 7) * 0.4;
      majChat(dt, t); poseChat(dt, t);
      animerLui(dt);
      // le mug qui tombe du bureau
      if (mugV) { mugV.vy -= 9.8 * dt; mug.position.x += mugV.vx * dt; mug.position.y += mugV.vy * dt; mug.rotation.z -= dt * 6; if (mug.position.y < 0.06) { mug.position.y = 0.06; mugV.vx = 0; mugV.vy = 0; mug.rotation.z = Math.PI / 2; } }
      if (eau) { var pa = eau.geometry.attributes.position; for (var i = 0; i < pa.count; i++) { var y = pa.getY(i) - dt * 4; pa.setY(i, y < 0.1 ? 2.7 : y); } pa.needsUpdate = true; }
      // Océ : regarde le chat ou lui, rit, caresse Charlie à la fin
      var cible = (etatC === 'joue' || etatC === 'final' || etatC === 'dos' || etatC === 'piege' || etatC === 'ronron') ? cPos : jp;
      oce.tete.rotation.y = AV.lerp(oce.tete.rotation.y, Math.max(-1.2, Math.min(1.2, Math.atan2(cible.x - oce.groupe.position.x, cible.z - oce.groupe.position.z))), dt * 3);
      if (rire > 0) { rire -= dt; oce.corps.rotation.z = Math.sin(t * 28) * 0.05; oce.bras[1].rotation.x = -1.6; } else { oce.corps.rotation.z *= 0.9; oce.bras[1].rotation.x = AV.lerp(oce.bras[1].rotation.x, etatC === 'ronron' ? -1.0 : -0.5, dt * 3); }
      for (var c = coeurs.length - 1; c >= 0; c--) { var h = coeurs[c]; h.t += dt; h.s.position.y += dt * 0.5; h.s.material.opacity = Math.max(0, 1 - h.t / 2); if (h.t > 2) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(c, 1); } }
    });
    // les murs qui gênent la vue s'effacent
    mo.surCamera = function (camera, dt) {
      cielM.position.copy(camera.position);
      var j = J ? J.position : { x: 0, z: 0 };
      murs.forEach(function (w) {
        var cible = w.test(camera.position, j) ? 0.12 : 1;
        w.o = AV.lerp(w.o, cible, Math.min(1, (dt || 0.016) * 8));
        w.m.material.opacity = w.o; w.m.material.depthWrite = w.o > 0.95; w.m.castShadow = w.o > 0.5;
      });
    };
    mo.debut = function (a) { api = a; habiller(); if (AV.jeu) AV.jeu.camera(Math.PI, 0.55, 6.5); sousTitre(); dire('🔑 Tu arrives dans la coloc… la chambre d\'' + nomElle + ' est au bout du couloir', 3.5); };
    mo.nettoyer = function () { deshabiller(); phase = 'parti'; };
    mo.debug = {
      etat: function () { return { phase: phase, chat: etatC, attaques: attaques, esquives: esquives, canne: aCanne, faits: nbFaits }; },
      armoire: function () { itArmoire.fn(); }, plume: function () { itPlume.fn(); },
      betise: function (k) { lancerBetise(k); }, ventre: function () { itVentre.fn(); },
      allerA: function (x, z) { if (J) J.placer(x, z, J.angle, mo); }
    };
    return mo;
  };
})(window.AV);

