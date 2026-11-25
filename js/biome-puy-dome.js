/* Biome « puy_dome » : parapente depuis le sommet du Puy de Dôme (1465 m), un après-midi d'été.
   La surprise : lui, qui a le vertige, a réservé un vol en biplace… et c'est elle qui pilote !
   1. Intro : le sommet (antenne, temple de Mercure, gare du Panoramique), la chaîne des Puys tout autour.
   2. Gonflage : ✋ lève la voile, ← → pour la garder bien droite au-dessus de vous.
   3. Course d'élan : taper ✋ (ou ⤒) très vite ; à mi-pente il prend peur… il faut l'entraîner !
   4. Vol : ← → tourner · ↑ accélérer · ↓ freiner · ⬇ maintenu (C / Espace) = les oreilles, pour descendre plus vite ·
      🪂 ✋ (E) = l'arrondi, tout près du sol. Des thermiques (repérés par les milans 🦅 et les autres voiles) font monter.
      Objectif : se poser dans le cercle 🎯 au pied du Puy (il s'agrandit après chaque essai raté).
   5. Fin : il embrasse la terre ferme, puis un gros câlin… et la surprise de jours.js s'ouvre. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#3a7fd4', bas: '#d3e5f3', brouillard: '#c8dbea', hemi: ['#ffffff', '#6a7a52', 0.78], soleil: ['#fff4dc', 0.95, [-0.45, 0.8, 0.4]] };
  var PLAINE = -260, R0 = 34, RB = 470;       // sommet à y = 0, plateau de rayon R0, pied du dôme à RB
  var L = { x: -820, z: 230 };                // centre de la cible d'atterrissage (au sud-ouest, vers Ceyssat)
  var S = { x: -37, z: 2 };                   // haut de l'aire de décollage (on court vers l'ouest)
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function borne(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- Le relief ----------
  function ondul(x, z) { return 5 * Math.sin(x * 0.006 + 0.7) * Math.cos(z * 0.005 - 0.3) + 2.5 * Math.sin(x * 0.017 + z * 0.013) + 1.2 * Math.sin(x * 0.05 - z * 0.037); }
  // le plateau des Dômes, puis la faille de la Limagne à l'est (Clermont-Ferrand 470 m plus bas)
  function plaine(x, z) { return PLAINE + ondul(x, z) - lisse(1400, 3100, x + 0.15 * z) * 470; }
  function dome(x, z) {
    var r = Math.sqrt(x * x + z * z);
    if (r <= R0) return 0;
    if (r >= RB) return PLAINE - (r - RB) * 0.4;
    var t = (r - R0) / (RB - R0), f = 0.5 * t + 0.5 * t * t * (3 - 2 * t);
    return PLAINE * f + 4 * Math.sin(Math.atan2(z, x) * 5 + r * 0.02) * t * (1 - t) * 4;
  }
  // la chaîne des Puys : x, z, hauteur, rayon, cratère (rayon, profondeur), boisé
  var CONES = [
    { x: -80, z: -560, h: 95, r: 230, cr: 55, cd: 30 },              // Petit Puy de Dôme (Nid de la Poule)
    { x: 220, z: -1650, h: 160, r: 360, cr: 110, cd: 70 },           // Puy Pariou
    { x: -900, z: -1250, h: 210, r: 430, cr: 90, cd: 45, f: 1 },     // Puy de Côme
    { x: 300, z: -2600, h: 170, r: 380, f: 1 },                      // Grand Sarcoui
    { x: -700, z: 1600, h: 170, r: 420, f: 1 },                      // Puy de Laschamp
    { x: 100, z: 1900, h: 140, r: 330, cr: 100, cd: 60 },            // Puys de Lassolas et de la Vache
    { x: 1100, z: 900, h: 120, r: 330, f: 1 },                       // Puy de Mercœur
    { x: -1300, z: -2500, h: 190, r: 420, cr: 100, cd: 50, f: 1 },   // Puy de Louchadière
    { x: -1800, z: -800, h: 120, r: 300, f: 1 },                     // Puy de Jumes
    { x: -1600, z: 500, h: 110, r: 280, cr: 60, cd: 25 },            // Puy de la Coquille
    { x: -2600, z: 2400, h: 150, r: 450, f: 1 }, { x: -200, z: 3300, h: 180, r: 500, cr: 120, cd: 50 },
    { x: 600, z: -3800, h: 160, r: 420, cr: 90, cd: 40 }, { x: -2900, z: -2200, h: 140, r: 420, f: 1 }
  ];
  function cone(c, x, z) {
    var dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) > c.r || Math.abs(dz) > c.r) return -1e9;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d >= c.r) return -1e9;
    var p = d / c.r, h = PLAINE + c.h * (0.45 * (1 - p) + 0.55 * (1 - p * p * (3 - 2 * p)));
    if (c.cr && d < c.cr) { var q = d / c.cr; h -= c.cd * (1 - q * q); }
    return h;
  }
  // les monts Dore (le Sancy), loin au sud
  function dore(x, z) {
    var dx = (x + 1500) / 2600, dz = (z - 7600) / 1800, d2 = dx * dx + dz * dz;
    if (d2 > 4) return -1e9;
    return PLAINE + 700 * Math.exp(-d2 * 1.3) * (0.8 + 0.2 * Math.sin(x * 0.004) * Math.cos(z * 0.005)) + 40 * Math.sin(x * 0.011 + z * 0.007) * Math.exp(-d2);
  }
  function H0(x, z) {
    var h = plaine(x, z), d = dome(x, z);
    if (d > h) h = d;
    for (var i = 0; i < CONES.length; i++) { var c = cone(CONES[i], x, z); if (c > h) h = c; }
    var m = dore(x, z); if (m > h) h = m;
    return h;
  }
  var YL = plaine(L.x, L.z);
  function H(x, z) { // la prairie d'atterrissage est bien plate
    var h = H0(x, z), dx = x - L.x, dz = z - L.z, dl = Math.sqrt(dx * dx + dz * dz);
    return dl < 170 ? AV.lerp(YL, h, lisse(70, 170, dl)) : h;
  }
  function foret(x, z) {
    var dlx = x - L.x, dlz = z - L.z;
    if (dlx * dlx + dlz * dlz < 230 * 230 || x > 1450) return false;
    var r = Math.sqrt(x * x + z * z);
    if (r < 330) return false; // le haut du dôme : prairies et bruyère
    var n = Math.sin(x * 0.0043 + 1.3) * Math.cos(z * 0.0051 - 0.4) + 0.5 * Math.sin(x * 0.011 - z * 0.009 + 2) + 0.5 * (hash(Math.floor(x / 40), Math.floor(z / 40)) - 0.5);
    if (r < 560 && z < 120) n += 0.6; // pied du dôme boisé côté nord
    for (var i = 0; i < CONES.length; i++) {
      var c = CONES[i]; if (!c.f) continue;
      var ex = x - c.x, ez = z - c.z, d2 = ex * ex + ez * ez;
      if (d2 < c.r * c.r * 0.85) { n += 0.9; break; }
    }
    return n > 0.55;
  }
  function couleurSol(x, y, z, ny) {
    var dlx = x - L.x, dlz = z - L.z, dl = Math.sqrt(dlx * dlx + dlz * dlz);
    if (dl < 80) return varier(hash(Math.floor(x / 6), Math.floor(z / 6)) > 0.5 ? '#92c25c' : '#88b955', x, z, 0.05);
    var r = Math.sqrt(x * x + z * z);
    if (r < R0 + 2) return varier(hash(Math.floor(x / 5), Math.floor(z / 5)) > 0.55 ? '#c2baa6' : '#8fb05a', x, z, 0.08);
    if (foret(x, z)) return varier('#3f5f35', x, z, 0.15);
    if (y > PLAINE + 330) return ny < 0.8 ? varier('#8f8b7e', x, z, 0.1) : varier('#7f9a5a', x, z, 0.12); // monts Dore
    if (y < PLAINE - 120) { // la Limagne : champs, et Clermont
      if (x > 3200 && x < 6000 && Math.abs(z) < 2000) return varier('#a29d92', x, z, 0.12);
      var c = hash(Math.floor(x / 160), Math.floor(z / 130));
      return varier(c < 0.3 ? '#c8b66a' : c < 0.6 ? '#9fb35e' : c < 0.8 ? '#b7a75c' : '#86a650', x, z, 0.06);
    }
    if (r < RB) { // le dôme : herbe rase, bruyère, trachyte
      if (ny < 0.72) return varier('#9a9284', x, z, 0.1);
      var k = hash(Math.floor(x / 12), Math.floor(z / 12));
      return varier(k > 0.84 ? '#8a7356' : k > 0.5 ? '#88aa52' : '#7ea14b', x, z, 0.1);
    }
    var ch = hash(Math.floor((x + 9000) / 70), Math.floor((z + 9000) / 55)); // prés et pâtures
    return varier(ch < 0.35 ? '#7da84e' : ch < 0.6 ? '#8bb357' : ch < 0.8 ? '#6f9a45' : '#a5b862', x, z, 0.07);
  }
  function terrainZone(cx, cz, taille, segs, puits) {
    var geo = new THREE.PlaneGeometry(taille, taille, segs, segs); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i) + cx, z = p.getZ(i) + cz;
      p.setX(i, x); p.setZ(i, z); p.setY(i, H(x, z) - (puits ? puits(x, z) : 0));
    }
    var g = geo.toNonIndexed(); g.computeVertexNormals();
    var pa = g.attributes.position, no = g.attributes.normal, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var mx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, mz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.copy(couleurSol(mx, my, mz, no.getY(f)));
      for (var k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    return m;
  }
  function puitsDans(x0, x1, z0, z1, marge, prof) {
    return function (x, z) { var d = Math.min(x - x0, x1 - x, z - z0, z1 - z); return d <= 0 ? 0 : lisse(0, marge, d) * prof; };
  }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }

  // ---------- Lui (casque, coupe-vent) ----------
  function fabriquerLui() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.15, 0.8, 0.17, '#3a4a66', 0, -0.4, 0));
      j.add(bm(0.17, 0.1, 0.27, '#5a4a3a', 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), '#2f7c6e'); t.position.y = 1.11; corps.add(t);
    corps.add(bm(0.36, 0.42, 0.14, '#33363d', 0, 1.05, -0.24)); // la sellette
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var casque = AV.maille(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), '#f4f2ec'); casque.position.y = 0.03; tete.add(casque);
    var bande = AV.maille(new THREE.TorusGeometry(0.19, 0.02, 4, 14), '#e0452e', false); bande.rotation.x = Math.PI / 2; bande.position.y = 0.06; tete.add(bande);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.0, 0.152); tete.add(o); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    AV.avatars.coiffer(tete, 'axel', { chapeau: true });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 6), '#2f7c6e'); m.position.y = -0.28; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes, bouche: bouche };
  }

  // ---------- Une voile de parapente (origine = les élévateurs) ----------
  function fabriquerVoile(o) {
    var g = new THREE.Group(), voile = new THREE.Group(); g.add(voile);
    var F = new AV.Fusion(), A = 0.95, N = o.n, Lg = o.L, pts = [];
    for (var i = 0; i < N; i++) {
      var th = -A + (i + 0.5) * 2 * A / N, ab = Math.abs(th) / A;
      var w = 2 * A * Lg / N * 1.04, c = o.corde * (1 - 0.38 * ab * ab), ep = 0.42 * (1 - 0.5 * ab) * o.corde / 3;
      var px = Math.sin(th) * Lg, py = Math.cos(th) * Lg;
      forme(F, new THREE.BoxGeometry(w, ep, c), o.couleurs[i % o.couleurs.length], px, py, 0, 0, 1, 1, 1, 0, -th);
      forme(F, new THREE.BoxGeometry(w * 0.92, ep * 0.8, 0.12), '#2a2a35', px, py, -c / 2 - 0.02, 0, 1, 1, 1, 0, -th); // bord d'attaque
      var rb = Lg - ep / 2;
      pts.push(Math.sin(th) * rb, Math.cos(th) * rb, -c * 0.3, Math.sin(th) * rb, Math.cos(th) * rb, c * 0.25);
    }
    var mesh = F.maille(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.castShadow = true; voile.add(mesh);
    var lg = [];
    for (var k = 0; k < pts.length; k += 3) lg.push(pts[k] > 0 ? 0.28 : -0.28, 0, 0, pts[k], pts[k + 1], pts[k + 2]);
    var lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lg, 3));
    voile.add(new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: '#f3efe6', transparent: true, opacity: 0.55 })));
    if (o.pilote) { // un petit pilote assis (les autres parapentistes)
      g.add(bm(0.4, 0.5, 0.5, o.pilote, 0, -0.75, 0.05));
      g.add(bm(0.3, 0.2, 0.7, '#33363d', 0, -1.05, -0.15));
      var tt = AV.maille(new THREE.SphereGeometry(0.17, 8, 6), '#f4f2ec'); tt.position.set(0, -0.35, 0.05); g.add(tt);
    }
    g.rotation.order = 'YXZ';
    return { groupe: g, voile: voile, L: Lg };
  }

  // ---------- Un milan (ailes en V, queue fourchue) ----------
  function fabriquerMilan() {
    var g = new THREE.Group();
    g.add(bm(0.18, 0.14, 0.7, '#6b4630', 0, 0, 0));
    var ailes = [];
    [-1, 1].forEach(function (s) {
      var a = new THREE.Group(); a.position.set(s * 0.08, 0.02, 0); g.add(a);
      a.add(bm(0.8, 0.03, 0.32, '#7a5236', s * 0.4, 0, 0)); a.add(bm(0.32, 0.03, 0.22, '#2d2420', s * 0.92, 0, 0.02));
      ailes.push(a);
    });
    [-1, 1].forEach(function (s) { var q = bm(0.08, 0.02, 0.36, '#a0603a', s * 0.06, 0, 0.45); q.rotation.y = s * 0.25; g.add(q); });
    g.scale.setScalar(1.7);
    return { groupe: g, ailes: ailes };
  }

  // ---------- Un promeneur ----------
  function pieton(haut, bas, peau) {
    var g = new THREE.Group();
    g.add(bm(0.32, 0.8, 0.22, bas, 0, 0.4, 0));
    g.add(bm(0.42, 0.62, 0.26, haut, 0, 1.1, 0));
    var t = AV.maille(new THREE.IcosahedronGeometry(0.16, 0), peau || '#eec29a'); t.position.y = 1.58; g.add(t);
    var bras = [];
    [-1, 1].forEach(function (c) { var b = new THREE.Group(); b.position.set(c * 0.27, 1.36, 0); b.add(bm(0.1, 0.55, 0.1, haut, 0, -0.27, 0)); g.add(b); bras.push(b); });
    g.userData.bras = bras;
    return g;
  }
  function vache(F, x, z, ry) { // une Salers : robe acajou, cornes en lyre
    var y = H(x, z), c = '#8a3a20', o = new THREE.Group();
    o.add(bm(0.8, 0.75, 1.6, c, 0, 0.95, 0));
    [[-0.28, 0.6], [0.28, 0.6], [-0.28, -0.6], [0.28, -0.6]].forEach(function (p) { o.add(bm(0.14, 0.6, 0.14, c, p[0], 0.3, p[1])); });
    o.add(bm(0.42, 0.42, 0.5, c, 0, 1.05, 1.0));
    o.add(bm(0.3, 0.2, 0.18, '#c9a08a', 0, 0.95, 1.28));
    [-1, 1].forEach(function (s) { var k = AV.maille(new THREE.ConeGeometry(0.05, 0.42, 5), '#e8dcc0'); k.position.set(s * 0.26, 1.38, 1.0); k.rotation.z = -s * 0.6; o.add(k); });
    o.position.set(x, y, z); o.rotation.y = ry; o.updateMatrixWorld(true);
    F.ajouter(o);
  }

  // =====================================================================
  AV.biomes.puy_dome = function (cfg) {
    var rng = AV.rng(1212 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 99999, hauteur: H, surface: 'herbe', ciel: CIEL, brouillard: [700, 11000],
      depart: { x: S.x, z: S.z, angle: -Math.PI / 2 }, theme: 'parapente', ambiance: 'vent'
    });
    mo.loin = 14000;
    mo.sansAnimal = true;
    var G = mo.groupe;

    // ---------- Ciel, soleil, nuages ----------
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    var dirS = new THREE.Vector3(CIEL.soleil[2][0], CIEL.soleil[2][1], CIEL.soleil[2][2]).normalize();
    var soleilH = AV.halo('#fff3c8', 700); soleilH.material.fog = false; soleilH.material.opacity = 0.7; G.add(soleilH);
    var Nu = new AV.Fusion();
    function cumulus(x, y, z, t) {
      for (var i = 0; i < 9; i++) {
        var a = rng() * Math.PI * 2, d = rng() * t * 0.9;
        forme(Nu, new THREE.IcosahedronGeometry(1, 1), '#ffffff', x + Math.cos(a) * d * 1.4, y + rng() * t * 0.35, z + Math.sin(a) * d, rng() * 3, t * AV.entre(rng, 0.45, 0.8), t * AV.entre(rng, 0.35, 0.55), t * AV.entre(rng, 0.45, 0.8));
      }
    }

    // ---------- Terrain : trois niveaux de détail ----------
    G.add(terrainZone(0, 0, 240, 96, null));                                                       // le sommet
    G.add(terrainZone(-300, 50, 1900, 180, puitsDans(-120, 120, -120, 120, 12, 8)));               // le dôme, la prairie d'atterrissage
    G.add(terrainZone(1500, 1500, 20000, 160, puitsDans(-1250, 650, -900, 1000, 80, 60)));         // la chaîne des Puys, la Limagne, le Sancy

    // ---------- Les forêts ----------
    var V = new AV.Fusion(), nArbres = 0;
    for (var t = 0; t < 9000 && nArbres < 2600; t++) {
      var x = AV.entre(rng, -2300, 1400), z = AV.entre(rng, -2900, 2500);
      if (!foret(x, z)) continue;
      var y = H(x, z); nArbres++;
      if (rng() < 0.55) { var hp = AV.entre(rng, 9, 15); forme(V, new THREE.ConeGeometry(1, 1, 5), AV.choisir(rng, ['#2f4d2e', '#34552f', '#2a462b']), x, y + hp * 0.5 - 0.5, z, rng() * 3, hp * 0.28, hp, hp * 0.28); }
      else { var hh = AV.entre(rng, 4, 6); forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4c7a3a', '#557f3e', '#466f36']), x, y + hh * 0.9, z, rng() * 3, hh, hh * 0.9, hh); }
    }
    // quelques arbres isolés et haies sur le plateau
    for (var hI = 0; hI < 500; hI++) {
      var ax = AV.entre(rng, -1600, 1200), az = AV.entre(rng, -1500, 1600), ar = Math.sqrt(ax * ax + az * az);
      if (ar < 480 || (ax - L.x) * (ax - L.x) + (az - L.z) * (az - L.z) < 160 * 160 || foret(ax, az)) continue;
      var ay = H(ax, az), as = AV.entre(rng, 2.5, 4.5);
      forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#557f3e', '#5f8a45']), ax, ay + as * 0.9, az, rng() * 3, as, as * 0.85, as);
    }
    var vegM = V.maille(); vegM.castShadow = true; G.add(vegM);

    // ---------- Le sommet : antenne, temple de Mercure, gare du Panoramique, observatoire ----------
    var C = new AV.Fusion(), pierre = ['#9b948a', '#a8a094', '#8f887e'];
    forme(C, new THREE.BoxGeometry(14, 8, 10), '#d8d6d0', 10, 4, -8, 0.2, 1, 1, 1);
    forme(C, new THREE.CylinderGeometry(2.4, 2.8, 38, 10), '#ebe9e3', 10, 8 + 19, -8, 0, 1, 1, 1);
    forme(C, new THREE.CylinderGeometry(3.4, 3.4, 3, 10), '#d0cec8', 10, 36, -8, 0, 1, 1, 1);
    for (var sg = 0; sg < 7; sg++) forme(C, new THREE.CylinderGeometry(0.9 - sg * 0.08, 0.95 - sg * 0.08, 4, 6), sg % 2 ? '#f2f2f2' : '#d9452e', 10, 46 + sg * 4 + 2, -8, 0, 1, 1, 1);
    [[0, 1], [2, 0.6], [4, -0.4]].forEach(function (p) { forme(C, new THREE.CylinderGeometry(1.4, 1.4, 0.4, 10), '#e8e8e8', 10 + Math.cos(p[1] * 3) * 2.8, 30 + p[0], -8 + Math.sin(p[1] * 3) * 2.8, p[1] * 3, 1, 1, 1, Math.PI / 2, 0); });
    // le temple de Mercure (terrasses en pierre de trachyte)
    [[20, 1.4, 15], [15, 1.2, 11], [10, 1, 6]].forEach(function (s, i) { forme(C, new THREE.BoxGeometry(s[0], s[1], s[2]), pierre[i % 3], -4, 0.7 + i * 1.3 - 0.2, 19, 0.15, 1, 1, 1); });
    for (var co = 0; co < 10; co++) { var cx2 = -4 + AV.entre(rng, -4, 4), cz2 = 19 + AV.entre(rng, -2.5, 2.5); forme(C, new THREE.BoxGeometry(0.8, AV.entre(rng, 0.6, 1.8), 0.8), AV.choisir(rng, pierre), cx2, 3.6, cz2, rng(), 1, 1, 1); }
    // la gare du Panoramique des Dômes
    forme(C, new THREE.BoxGeometry(16, 5, 8), '#a8cfe0', 20, 2.5, 10, -0.3, 1, 1, 1);
    forme(C, new THREE.BoxGeometry(17, 0.6, 9), '#5d6066', 20, 5.3, 10, -0.3, 1, 1, 1);
    // l'observatoire
    forme(C, new THREE.BoxGeometry(6, 4, 6), '#f0eee8', -14, 2, -16, 0, 1, 1, 1);
    forme(C, new THREE.SphereGeometry(2.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#e2e4e8', -14, 4, -16, 0, 1, 1, 1);
    // chemins de gravier, bancs, table d'orientation
    forme(C, new THREE.CylinderGeometry(1.2, 1.4, 1.1, 8), '#9b948a', -22, 0.55, 4, 0, 1, 1, 1);
    forme(C, new THREE.CylinderGeometry(1.5, 1.5, 0.12, 12), '#c9b58a', -22, 1.16, 4, 0, 1, 1, 1);
    // la manche à air du décollage (vent d'ouest : elle pointe vers l'est)
    var mx0 = -33, mz0 = -10, my0 = H(mx0, mz0);
    forme(C, new THREE.CylinderGeometry(0.07, 0.09, 5, 5), '#d8d8d8', mx0, my0 + 2.5, mz0, 0, 1, 1, 1);
    for (var mc = 0; mc < 4; mc++) forme(C, new THREE.CylinderGeometry(0.34 - mc * 0.05, 0.39 - mc * 0.05, 0.6, 8), mc % 2 ? '#ffffff' : '#ff7a1a', mx0 + 0.4 + mc * 0.6, my0 + 4.8 - mc * 0.06, mz0, 0, 1, 1, 1, 0, Math.PI / 2 + 0.08);
    // le Panoramique : la voie qui monte en spirale autour du dôme
    var voie = [];
    for (var sv = 0; sv <= 1.0001; sv += 0.004) {
      var av = sv * Math.PI * 2 + 0.25, rv = RB - (RB - 30) * Math.pow(sv, 0.85), vx = Math.cos(av) * rv, vz = Math.sin(av) * rv;
      voie.push(new THREE.Vector3(vx, H(vx, vz) + 0.35, vz));
    }
    for (var vi = 0; vi < voie.length - 1; vi++) {
      var a0 = voie[vi], a1 = voie[vi + 1], seg = new THREE.Mesh(AV.facettes(new THREE.BoxGeometry(3, 0.5, a0.distanceTo(a1) + 0.3)), matT);
      matT.color.set('#6b625a'); seg.position.copy(a0).add(a1).multiplyScalar(0.5); seg.lookAt(a1); C.ajouter(seg); seg.geometry.dispose();
    }
    // les autres parapentistes qui attendent sur le plateau, et quelques promeneurs
    var pietonsSommet = [[-26, 24, '#e63946', '#2b2d42'], [-27, -22, '#3a86ff', '#3a3a3a'], [-12, 25, '#ffb703', '#4a5a70'], [4, -24, '#8ecae6', '#2b2d42'],
      [-18, -6, '#f4a261', '#3a4a66'], [14, 22, '#90be6d', '#444'], [-8, 8, '#b5838d', '#2b2d42'], [26, -2, '#ffffff', '#3a4a66']];
    pietonsSommet.forEach(function (p) { var o = pieton(p[2], p[3]); o.position.set(p[0], H(p[0], p[1]), p[1]); o.rotation.y = rng() * 6; o.updateMatrixWorld(true); C.ajouter(o); });
    var sommetM = C.maille(); sommetM.castShadow = true; sommetM.receiveShadow = true; G.add(sommetM);
    // voiles étalées sur le plateau, prêtes à partir
    [[-27, 20, ['#e63946', '#ffffff']], [-28, -18, ['#3a86ff', '#ffd166']]].forEach(function (p) {
      var w = fabriquerVoile({ n: 9, L: 5.2, corde: 2.2, couleurs: p[2] });
      w.groupe.position.set(p[0], H(p[0], p[1]) + 1.2, p[1]); w.groupe.rotation.y = Math.PI / 2;
      w.voile.rotation.x = Math.acos(borne(-1.0 / 5.2, -1, 1)); w.voile.scale.z = 0.15; G.add(w.groupe);
    });
    // le petit train
    var train = new THREE.Group();
    [0, 1].forEach(function (i) { var w = bm(2.8, 3.2, 10, '#c8102e', 0, 1.9, -i * 10.6); train.add(w); train.add(bm(2.85, 0.9, 9.6, '#f4f4f4', 0, 2.6, -i * 10.6)); });
    G.add(train);
    function pointVoie(s) { var f = borne(s, 0, 1) * (voie.length - 1), i = Math.min(voie.length - 2, Math.floor(f)); return voie[i].clone().lerp(voie[i + 1], f - i); }

    // ---------- La prairie d'atterrissage ----------
    var A = new AV.Fusion();
    // clôture autour du champ
    for (var fx = -150; fx <= 150; fx += 6) [-130, 130].forEach(function (fz) { if (Math.abs(fx) < 12 && fz > 0) return; forme(A, new THREE.BoxGeometry(0.2, 1.3, 0.2), '#7a5a3a', L.x + fx, YL + 0.6, L.z + fz, 0, 1, 1, 1); });
    for (var fz2 = -130; fz2 <= 130; fz2 += 6) [-150, 150].forEach(function (fxx) { forme(A, new THREE.BoxGeometry(0.2, 1.3, 0.2), '#7a5a3a', L.x + fxx, H(L.x + fxx, L.z + fz2) + 0.6, L.z + fz2, 0, 1, 1, 1); });
    // la manche à air, la navette, le parking
    var wx = L.x + 26, wz = L.z - 22;
    forme(A, new THREE.CylinderGeometry(0.08, 0.1, 6, 5), '#d8d8d8', wx, YL + 3, wz, 0, 1, 1, 1);
    for (var wc = 0; wc < 4; wc++) forme(A, new THREE.CylinderGeometry(0.4 - wc * 0.06, 0.46 - wc * 0.06, 0.7, 8), wc % 2 ? '#ffffff' : '#ff7a1a', wx + 0.45 + wc * 0.7, YL + 5.8, wz, 0, 1, 1, 1, 0, Math.PI / 2 + 0.08);
    forme(A, new THREE.BoxGeometry(46, 0.1, 22), '#b9b2a2', L.x + 70, YL + 0.05, L.z + 60, 0, 1, 1, 1);
    [[64, 56, '#f4f4f4'], [74, 64, '#2f7c6e'], [82, 54, '#d8d8d8']].forEach(function (v) {
      forme(A, new THREE.BoxGeometry(2.1, 2.3, 5.2), v[2], L.x + v[0], YL + 1.35, L.z + v[1], 0.1, 1, 1, 1);
      forme(A, new THREE.BoxGeometry(2.12, 0.7, 2.6), '#2b3440', L.x + v[0], YL + 1.9, L.z + v[1] + 0.9, 0.1, 1, 1, 1);
    });
    // une ferme en pierre de lave, et les Salers
    forme(A, new THREE.BoxGeometry(18, 6, 10), '#4f4b48', L.x + 170, H(L.x + 170, L.z - 150) + 3, L.z - 150, 0.3, 1, 1, 1);
    forme(A, new THREE.ConeGeometry(1, 1, 4), '#7a3b2a', L.x + 170, H(L.x + 170, L.z - 150) + 7.6, L.z - 150, 0.3 + Math.PI / 4, 13, 3.4, 8);
    for (var vc = 0; vc < 8; vc++) vache(A, L.x - 190 + AV.entre(rng, -40, 40), L.z - 80 + AV.entre(rng, -50, 50), rng() * 6);
    // tables de pique-nique
    [[-30, 40], [-36, 48]].forEach(function (p) { forme(A, new THREE.BoxGeometry(2, 0.12, 0.9), '#8a6a4a', L.x + p[0], YL + 0.8, L.z + p[1], 0.3, 1, 1, 1); forme(A, new THREE.BoxGeometry(2, 0.1, 0.35), '#8a6a4a', L.x + p[0] + 0.25, YL + 0.45, L.z + p[1] + 0.7, 0.3, 1, 1, 1); });
    var champM = A.maille(); champM.castShadow = true; G.add(champM);
    // les gens qui attendent à l'atterrissage (ils font coucou)
    var spectateurs = [];
    [[34, 26, '#ffb703', '#3a3a3a'], [37, 29, '#e76f51', '#2b2d42'], [31, 31, '#ffffff', '#4a5a70'], [-28, 34, '#8338ec', '#333']].forEach(function (p, i) {
      var o = pieton(p[2], p[3]); o.position.set(L.x + p[0], YL, L.z + p[1]); o.rotation.y = Math.atan2(-p[0], -p[1]); G.add(o); spectateurs.push({ o: o, ph: i * 1.7 });
    });

    // ---------- La cible ----------
    var cible = new THREE.Group(); cible.position.set(L.x, YL + 0.08, L.z); G.add(cible);
    var R = 12;
    function construireCible() {
      while (cible.children.length) { var c0 = cible.children[0]; cible.remove(c0); AV.detruire(c0); }
      var k = R / 12;
      [[9 * k, 12 * k, '#ffffff'], [6 * k, 9 * k, '#e63946'], [3, 6 * k, '#ffffff'], [0, 3, '#e63946']].forEach(function (a, i) {
        var m = new THREE.Mesh(new THREE.RingGeometry(a[0], a[1], 48), new THREE.MeshLambertMaterial({ color: a[2], polygonOffset: true, polygonOffsetFactor: -2 - i, polygonOffsetUnits: -2 - i }));
        m.rotation.x = -Math.PI / 2; m.position.y = i * 0.01; m.receiveShadow = true; cible.add(m);
      });
    }
    construireCible();
    var faisceau = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 160, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    faisceau.position.set(L.x, YL + 80, L.z); G.add(faisceau);

    // ---------- Clermont-Ferrand et sa cathédrale noire, tout en bas dans la Limagne ----------
    var Vi = new AV.Fusion();
    for (var b = 0; b < 2200; b++) {
      var bx = AV.entre(rng, 3300, 5900), bz = AV.entre(rng, -1900, 1900);
      if (rng() > Math.exp(-((bx - 4300) * (bx - 4300) / 1.3e6 + bz * bz / 1.6e6))) continue;
      var bh = AV.entre(rng, 8, 28), bw = AV.entre(rng, 14, 34);
      forme(Vi, new THREE.BoxGeometry(bw, bh, AV.entre(rng, 14, 34)), AV.choisir(rng, ['#e2ddd2', '#d2ccc0', '#bfb9ae', '#e8e2d6']), bx, H(bx, bz) + bh / 2, bz, rng() * 0.4, 1, 1, 1);
    }
    var cy = H(4250, -100);
    forme(Vi, new THREE.BoxGeometry(110, 40, 28), '#2a2a2e', 4250, cy + 20, -100, 0, 1, 1, 1);
    [-9, 9].forEach(function (o) { forme(Vi, new THREE.BoxGeometry(12, 62, 12), '#2a2a2e', 4190, cy + 31, -100 + o, 0, 1, 1, 1); forme(Vi, new THREE.ConeGeometry(6.5, 34, 6), '#2a2a2e', 4190, cy + 79, -100 + o, 0, 1, 1, 1); });
    G.add(Vi.maille());

    // ---------- Thermiques : milans, autres voiles, cumulus au-dessus ----------
    var THERMIQUES = [
      { x: -380, z: -130, r: 42, f: 3.0, top: 45 },
      { x: -640, z: 430, r: 36, f: 2.6, top: -30 },
      { x: 330, z: 170, r: 40, f: 3.0, top: 55 }
    ];
    THERMIQUES.forEach(function (T) { T.y0 = H(T.x, T.z); cumulus(T.x, T.top + 160, T.z, 55); });
    for (var cn = 0; cn < 16; cn++) { var ca = rng() * Math.PI * 2, cd = AV.entre(rng, 1500, 6000); cumulus(Math.cos(ca) * cd, AV.entre(rng, 220, 420), Math.sin(ca) * cd, AV.entre(rng, 60, 130)); }
    var nuagesM = Nu.maille(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#8f99a6' })); G.add(nuagesM);
    var milans = [], autres = [];
    THERMIQUES.forEach(function (T, i) {
      for (var k = 0; k < 2; k++) { var m = fabriquerMilan(); G.add(m.groupe); milans.push({ m: m, T: T, a: rng() * 6, r: AV.entre(rng, 14, 26), y: AV.entre(rng, 0.25, 0.85), v: 0.32 + rng() * 0.1 }); }
      var w = fabriquerVoile({ n: 9, L: 5.2, corde: 2.2, couleurs: [['#ffd166', '#e63946'], ['#ffffff', '#3a86ff'], ['#ff006e', '#8338ec']][i], pilote: ['#33363d', '#2f5d7c', '#4a4a4a'][i] });
      w.voile.rotation.x = -0.05; G.add(w.groupe);
      autres.push({ w: w, T: T, a: rng() * 6, r: AV.entre(rng, 22, 30), ph: rng() * 6 });
    });
    var vTmp = new THREE.Vector3(), vTmp2 = new THREE.Vector3();
    mo.anime(function (dt, t) {
      milans.forEach(function (b) {
        b.a += dt * b.v;
        var yb = AV.lerp(b.T.y0 + 30, b.T.top, b.y) + Math.sin(t * 0.3 + b.a) * 6;
        b.m.groupe.position.set(b.T.x + Math.cos(b.a) * b.r, yb, b.T.z + Math.sin(b.a) * b.r);
        b.m.groupe.rotation.set(0, Math.PI - b.a, -0.35); // ils tournent, inclinés
        b.m.ailes[0].rotation.z = 0.15 + Math.sin(t * 2 + b.a) * 0.05; b.m.ailes[1].rotation.z = -0.15 - Math.sin(t * 2 + b.a) * 0.05;
      });
      autres.forEach(function (o) {
        o.a += dt * 11 / o.r * 0.6;
        var yy = AV.lerp(o.T.y0 + 60, o.T.top - 5, 0.5 + 0.5 * Math.sin(t * 0.05 + o.ph));
        o.w.groupe.position.set(o.T.x + Math.cos(o.a) * o.r, yy, o.T.z + Math.sin(o.a) * o.r);
        o.w.groupe.rotation.set(0, -o.a + Math.PI, -0.32); // tangente au cercle, penchée dans le virage
      });
      var st = 0.5 + 0.5 * Math.sin(t * 0.012);
      var p0 = pointVoie(st), p1 = pointVoie(st + 0.002);
      train.position.copy(p0); train.lookAt(p1.x, p1.y, p1.z);
      spectateurs.forEach(function (s) { var k = etat === 'vol' ? 1 : 0.2; s.o.userData.bras[0].rotation.z = -0.3 - k * (1.9 + Math.sin(t * 6 + s.ph) * 0.4); s.o.userData.bras[1].rotation.z = 0.3 + k * (1.9 + Math.sin(t * 6 + s.ph + 1) * 0.4); });
    });

    // ---------- Notre biplace ----------
    var planeur = fabriquerVoile({ n: 15, L: 7.2, corde: 3, couleurs: ['#ff7a1a', '#ffffff', '#1fb5ad', '#ffffff'] });
    G.add(planeur.groupe);
    planeur.groupe.add(bm(1.0, 0.06, 0.06, '#33363d', 0, -0.05, 0)); // l'écarteur
    var voile = planeur.voile;
    var lui = fabriquerLui(); planeur.groupe.add(lui.groupe);
    var ombreV = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    ombreV.scale.set(5.8, 1.6, 1); G.add(ombreV);

    // ---------- État ----------
    var etat = 'intro', tEtat = 0, tTotal = 0, api = null, parole = null, J = null;
    var pos = new THREE.Vector3(), h = Math.PI / 2, v = 0, sink = 0, omega = 0, roulis = 0, vy = 0, agl = 0;
    var flareT = 0, tFlare = 99, oreilles = false, tVol = 0, assis = 0, phase = 0, vCourse = 0, geleT = 0, gele = false;
    var incl = 0, incV = 0, beta0 = 1.6, betaV = 0, kD = 1, p1 = rng() * 6, p2 = rng() * 6;
    var nEchecs = 0, nGonfl = 0, nCourse = 0, VDEC = 6.2, resultat = '', dResultat = 0, doux = false, vyTouche = 0;
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camOff = 0, camPitch = 0, camDist = 16, tSansRegard = 0, aCam = 0;
    var cP = new THREE.Vector3(), cL = new THREE.Vector3(), vLoc = new THREE.Vector3(), qPi = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    var tBip = 0, dejaTherm = false, dejaEstomac = false, tVirage = 0, dejaVise = false, repliques = {}, coeurs = [], tCoeur = 0, fini = false;
    var herP = new THREE.Vector3(), luiP = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function tactile() { return document.body.classList.contains('tactile'); }
    function sousTitre() {
      if (!api) return;
      var s = cfg.sousTitre || '';
      if (etat === 'vol' || etat === 'pose') s = '🪂 Pose-toi dans le cercle 🎯 (Ø ' + Math.round(2 * R) + ' m) en bas du Puy';
      if (etat === 'rate') s = '😅 Raté de ' + dResultat.toFixed(1).replace('.', ',') + ' m · essai ' + (nEchecs + 1);
      if (etat === 'final' || etat === 'fini') s = '🎯 Posés à ' + dResultat.toFixed(1).replace('.', ',') + ' m du centre ❤';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }
    function fonduPuis(cb) {
      var fd = document.getElementById('fondu'); fd.classList.add('noir');
      var avant = etat; etat = 'transition';
      setTimeout(function () { if (etat !== 'transition') return; cb(avant); fd.classList.remove('noir'); }, 620);
    }

    // ---------- Interface : instruments, cible, jauges ----------
    var ui = null, uiInstr, uiChip, uiFleche, uiJauge, uiJLab, uiJBar, uiJCur, uiJFill, uiJSeuil, ecoute = [], btnOreilles = false, clavOreilles = false;
    function construireUI() {
      ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;font-family:Nunito,sans-serif;color:#fff';
      var haut = document.createElement('div');
      haut.style.cssText = 'position:absolute;left:50%;top:max(14px, env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;transition:opacity .4s';
      uiInstr = document.createElement('div');
      uiInstr.style.cssText = 'padding:6px 14px;border-radius:12px;background:rgba(10,20,40,.45);font-weight:900;font-size:15px;letter-spacing:.4px;white-space:nowrap';
      uiChip = document.createElement('div');
      uiChip.style.cssText = 'padding:5px 12px;border-radius:12px;font-weight:800;font-size:14px;color:#1b2340;background:#fff;max-width:86vw;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.25)';
      uiFleche = document.createElement('div');
      uiFleche.style.cssText = 'width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.85);color:#e63946;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)';
      uiFleche.textContent = '⬆';
      haut.appendChild(uiInstr); haut.appendChild(uiChip); haut.appendChild(uiFleche);
      ui.haut = haut; ui.appendChild(haut);
      uiJauge = document.createElement('div');
      uiJauge.style.cssText = 'position:absolute;left:50%;top:24%;transform:translateX(-50%);width:min(72vw,420px);opacity:0;transition:opacity .3s;text-align:center';
      uiJLab = document.createElement('div'); uiJLab.style.cssText = 'font-weight:900;font-size:17px;text-shadow:0 2px 4px rgba(0,0,0,.5);margin-bottom:6px';
      uiJBar = document.createElement('div'); uiJBar.style.cssText = 'position:relative;height:22px;border-radius:11px;background:rgba(10,20,40,.5);overflow:hidden;border:2px solid rgba(255,255,255,.8)';
      uiJFill = document.createElement('div'); uiJFill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#ffd166,#ff7a1a)';
      uiJSeuil = document.createElement('div'); uiJSeuil.style.cssText = 'position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#7CFC00';
      uiJCur = document.createElement('div'); uiJCur.style.cssText = 'position:absolute;top:1px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.6)';
      uiJBar.appendChild(uiJFill); uiJBar.appendChild(uiJSeuil); uiJBar.appendChild(uiJCur);
      uiJauge.appendChild(uiJLab); uiJauge.appendChild(uiJBar); ui.appendChild(uiJauge);
      document.body.appendChild(ui);
      // ⤒ maintenu = les oreilles (en vol)
      var bS = document.getElementById('btn-saut');
      function on(ev) { ev.preventDefault(); btnOreilles = true; } function off() { btnOreilles = false; }
      bS.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (tp) { bS.addEventListener(tp, off); });
      ecoute.push(function () { bS.removeEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (tp) { bS.removeEventListener(tp, off); }); });
      var touchesO = ['KeyC', 'KeyF', 'ControlLeft', 'Space', 'PageDown'];
      function kd(ev) { if (touchesO.indexOf(ev.code) >= 0) clavOreilles = true; }
      function ku(ev) { if (touchesO.indexOf(ev.code) >= 0) clavOreilles = false; }
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      ecoute.push(function () { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
      document.getElementById('hud-aide-clavier').textContent = 'Course : E / Espace très vite · Vol : ← → tourner · ↑ accélérer · ↓ freiner · Espace / C (maintenu) : oreilles · E : arrondi · souris : regarder';
      boutons();
    }
    function boutons() {
      var bA = document.getElementById('btn-action'), bS = document.getElementById('btn-saut');
      if (etat === 'course' || etat === 'gonflage') { bA.textContent = '🏃'; bS.textContent = '🏃'; }
      else if (etat === 'vol') { bA.textContent = '🪂'; bS.textContent = '⬇'; }
      else { bA.textContent = '✋'; bS.textContent = '⤒'; }
    }
    function statutApproche() {
      var dx = L.x - pos.x, dz = L.z - pos.z, d = Math.sqrt(dx * dx + dz * dz), hT = pos.y - 1.35 - YL;
      if (d < 35) return ['🎯 Tu y es ! ✋ 🪂 arrondi juste avant de toucher le sol', '#ffe08a'];
      if (hT < 3) return ['🔻 Trop bas pour la cible…', '#ffc9c9'];
      var q = d / hT;
      if (q > 6.6) return ['🔻 Trop bas : file droit vers la cible ⬆ (ou monte dans un thermique 🦅)', '#ffc9c9'];
      if (q < 4.8) return ['🔺 Trop haut : fais des 360° (← →) ou les oreilles ⬇ pour descendre', '#cfe6ff'];
      return ['🟢 Pile dans la pente : vise la cible !', '#c9f2c9'];
    }
    function majUI(camera) {
      if (!ui) return;
      var enVol = etat === 'vol';
      ui.haut.style.opacity = enVol ? '1' : '0';
      if (enVol) {
        var dx = L.x - pos.x, dz = L.z - pos.z, d = Math.sqrt(dx * dx + dz * dz);
        var vyA = Math.round(vy * 10) / 10;
        uiInstr.innerHTML = 'ALT ' + Math.max(0, Math.round(agl - 1.35)) + ' m · <span style="color:' + (vyA > 0.2 ? '#8dff8d' : vyA < -3 ? '#ffb0b0' : '#fff') + '">' + (vyA > 0 ? '↑ +' : '↓ ') + vyA.toFixed(1).replace('.', ',') + ' m/s</span> · 🎯 ' + Math.round(d) + ' m';
        var s = statutApproche(); uiChip.textContent = s[0]; uiChip.style.background = s[1];
        camera.getWorldDirection(vTmp);
        var fx = vTmp.x, fz = vTmp.z, n = Math.sqrt(fx * fx + fz * fz) || 1; fx /= n; fz /= n;
        var ang = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz);
        uiFleche.style.transform = 'rotate(' + ang.toFixed(3) + 'rad)';
      }
      var jauge = etat === 'gonflage' || etat === 'course';
      uiJauge.style.opacity = jauge ? '1' : '0';
      if (etat === 'gonflage') {
        uiJLab.textContent = incl > 0.12 ? '➡ La voile penche à droite : pousse ➡' : incl < -0.12 ? '⬅ La voile penche à gauche : pousse ⬅' : '👍 La voile monte bien droite…';
        uiJFill.style.width = '0'; uiJSeuil.style.left = '50%'; uiJSeuil.style.background = '#7CFC00';
        uiJCur.style.left = (50 + borne(incl / 0.72, -1, 1) * 48) + '%';
        uiJBar.style.background = 'linear-gradient(90deg,rgba(230,57,70,.75) 0%,rgba(230,57,70,.4) 22%,rgba(124,252,0,.45) 38%,rgba(124,252,0,.45) 62%,rgba(230,57,70,.4) 78%,rgba(230,57,70,.75) 100%)';
      } else if (etat === 'course') {
        uiJLab.textContent = vCourse >= VDEC ? '🪂 Ça porte !' : geleT > 0 ? '😱 ' + nomLui + ' freine des quatre fers… tape plus vite !' : '🏃 Élan : tape ' + (tactile() ? '🏃' : 'E / Espace') + ' très vite !';
        uiJBar.style.background = 'rgba(10,20,40,.5)';
        uiJFill.style.width = Math.min(100, vCourse / 9.5 * 100) + '%';
        uiJSeuil.style.left = (VDEC / 9.5 * 100) + '%';
        uiJCur.style.left = '-20px';
      }
    }

    // ---------- Début ----------
    mo.debut = function (a) { api = a; construireUI(); placerAuDepart(); sousTitre(); };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'intro') {
        var ti = tEtat;
        if (ti < 3.5) return '🌋 Au sommet du Puy de Dôme, 1465 m… la chaîne des Puys à vos pieds';
        if (ti < 7) return '<b>' + nomLui + ' :</b> J\'ai une surprise pour toi… 🎁';
        if (ti < 10.5) return '<b>' + nomLui + ' :</b> On fait du parapente ! En biplace… et c\'est toi qui pilotes 😅';
        if (ti < 14) return '<b>Toi :</b> Mais… t\'as le vertige ?! 😳';
        return '<b>' + nomLui + ' :</b> Justement. Avec toi, j\'ai pas peur ❤ (enfin… un peu)';
      }
      if (etat === 'pret') return '🪂 La voile est étalée derrière vous · ✋ pour la gonfler !';
      if (etat === 'gonflage') return tactile() ? '🕹️ Joystick ⬅ ➡ : reste bien sous la voile' : '⬅ ➡ (Q / D) : reste bien sous la voile';
      if (etat === 'course') return '🏃 COURS ! Tape ' + (tactile() ? '🏃' : 'E ou Espace') + ' le plus vite possible jusqu\'à ce que la voile vous soulève !';
      if (etat === 'vol' && tVol < 9 && tVol > 2) return tactile() ? '🕹️ Joystick ← → : tourner · ↑ accélérer · ↓ freiner · ⬇ maintenu : les oreilles · 🪂 : arrondi'
        : '← → : tourner · ↑ accélérer · ↓ freiner · Espace / C maintenu : les oreilles · E : arrondi';
      if (etat === 'rate') return '🚐 ✋ pour remonter au sommet avec la navette et réessayer (le cercle sera plus grand)';
      return null;
    };

    // ---------- Placement au départ ----------
    function placerAuDepart() {
      pos.set(S.x, 0, S.z); h = Math.PI / 2; v = 0; vCourse = 0; incl = 0; incV = 0; gele = false; geleT = 0; flareT = 0; assis = 0; omega = 0; roulis = 0;
      if (lui.groupe.parent !== planeur.groupe) planeur.groupe.add(lui.groupe);
      lui.groupe.rotation.set(0, Math.PI, 0); lui.corps.rotation.set(0, 0, 0); lui.corps.position.set(0, 0, 0); lui.tete.rotation.set(0, 0, 0);
      ombreV.visible = false; faisceau.visible = true;
      if (J) { J.groupe.visible = true; J.ombre.visible = true; poseSol(0, 0); }
      // la voile étalée derrière, sur l'herbe (en arc)
      var bx = S.x + 7, yb = H(bx, S.z), yf = H(S.x, S.z);
      beta0 = Math.acos(borne((yb - yf - 1.05) / planeur.L, -1, 1));
      voile.rotation.set(beta0, 0, 0); betaV = beta0; voile.scale.set(1, 1, 0.15); // à plat sur l'herbe
      planeur.groupe.rotation.set(0, h, 0);
      kD = Math.max(0.35, 1 - 0.3 * nGonfl);
      VDEC = Math.max(4.4, 6.2 - 0.8 * nCourse);
    }

    // les deux au sol (debout ou en train de courir) ; vRun = vitesse
    function poseSol(vRun, dt) {
      var fx = -Math.sin(h), fz = -Math.cos(h);
      var hx = pos.x - fx * 0.55, hz = pos.z - fz * 0.55, lx = pos.x + fx * 0.6, lz = pos.z + fz * 0.6;
      var yh = H(hx, hz), yl = H(lx, lz);
      pos.y = Math.max(yh, yl) + 1.35;
      planeur.groupe.position.copy(pos); planeur.groupe.rotation.set(0, h, 0);
      var k = Math.min(1, vRun / 4), avant = phase;
      if (vRun > 0.2) phase += dt * (3 + vRun * 1.7);
      var s = Math.sin(phase);
      lui.groupe.position.set(0, yl - pos.y, -0.6);
      lui.jambes[0].rotation.set(s * 0.9 * k, 0, 0); lui.jambes[1].rotation.set(-s * 0.9 * k, 0, 0);
      lui.corps.rotation.set((geleT > 0 ? -0.35 : 0.15 * k), 0, 0);
      lui.bras[0].rotation.set(-0.35 - s * 0.3 * k, 0, 0.3); lui.bras[1].rotation.set(-0.35 + s * 0.3 * k, 0, -0.3);
      if (J) {
        J.position.set(hx, yh, hz); J.groupe.rotation.set(0, h + Math.PI, 0);
        var pr = J.parts;
        pr.jambeG.rotation.set(-s * 0.9 * k, 0, 0); pr.jambeD.rotation.set(s * 0.9 * k, 0, 0);
        pr.corps.rotation.set(0.12 * k, 0, 0); pr.corps.position.y = Math.abs(Math.cos(phase)) * 0.08 * k;
        pr.brasG.rotation.set(-0.6 + s * 0.2 * k, 0, -0.45); pr.brasD.rotation.set(-0.6 - s * 0.2 * k, 0, 0.45);
        J.ombre.visible = true; J.ombre.position.set(hx, yh + 0.03, hz); J.ombre.scale.setScalar(1);
      }
      if (k > 0.2 && Math.floor(avant / Math.PI) !== Math.floor(phase / Math.PI)) AV.audio.pas('herbe');
    }
    // repères caméra derrière / à droite du planeur
    function derriere(dist, hauteur, cote) {
      var bx = Math.sin(h), bz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
      return cP.set(pos.x + bx * dist + rx * cote, pos.y + hauteur, pos.z + bz * dist + rz * cote);
    }
    function devant(dist, hauteur) { return cL.set(pos.x - Math.sin(h) * dist, pos.y + hauteur, pos.z - Math.cos(h) * dist); }
    function cameraVers(camera, p, l, dt, rate) {
      var k = rate ? 1 - Math.exp(-dt * rate) : 1;
      camPos.lerp(p, k); camLook.lerp(l, k);
      var sol = H(camPos.x, camPos.z) + 1.6; if (camPos.y < sol) camPos.y = sol;
      camera.position.copy(camPos); camera.lookAt(camLook);
    }

    // ---------- Intro + prêt ----------
    function majIntro(dt, tap, camera) {
      poseSol(0, dt);
      lui.corps.rotation.z = etat === 'pret' ? Math.sin(tTotal * 31) * 0.012 : 0; // il tremble un peu 😅
      lui.tete.rotation.y = Math.sin(tTotal * 0.6) * 0.3;
      var ti = etat === 'intro' ? tEtat : 99, a = 2.0 + Math.min(ti, 8) * 0.08;
      var k = lisse(5.5, 9, ti);
      var pA = vTmp.set(Math.cos(a) * 165, 42 - Math.min(ti, 8) * 1.2, Math.sin(a) * 165);
      var lA = vTmp2.set(6, 18, -6);
      derriere(8.5, 2.2, 4.5); devant(30, -6);
      cP.lerp(pA, 1 - k); cL.lerp(lA, 1 - k);
      cameraVers(camera, cP, cL, dt, 0);
      if (etat === 'intro' && (tEtat > 17 || (tap && tEtat > 0.8))) { etat = 'pret'; tEtat = 0; tap = false; boutons(); }
      if (etat === 'pret' && tap && tEtat > 0.3) { etat = 'gonflage'; tEtat = 0; incl = 0; incV = 0; AV.audio.saut(); boutons(); }
    }

    // ---------- Gonflage ----------
    function majGonflage(dt, e, camera) {
      pos.x += -Math.sin(h) * 0.8 * dt; pos.z += -Math.cos(h) * 0.8 * dt; // ils avancent en tirant la voile
      poseSol(0.8, dt);
      var tg = tEtat, kInf = 1 - Math.pow(1 - Math.min(1, tg / 2.4), 3);
      if (tg > 0.6) {
        var rafale = (Math.sin(tTotal * 1.3 + p1) + 0.6 * Math.sin(tTotal * 2.9 + p2)) * 0.9 * kD;
        incV += (rafale + incl * 0.9 - e.x * 2.4 - incV * 1.6) * dt;
        incl += incV * dt;
      }
      voile.rotation.set(AV.lerp(beta0, -0.05, kInf), 0, -incl); voile.scale.z = AV.lerp(0.15, 1, lisse(0.1, 0.7, kInf));
      var pr = J.parts; pr.brasG.rotation.set(-2.4, 0, -0.3); pr.brasD.rotation.set(-2.4, 0, 0.3);
      if (Math.abs(incl) > 0.72) {
        etat = 'retombe'; tEtat = 0; nGonfl++; AV.audio.erreur(); boutons();
      } else if ((tg > 3 && Math.abs(incl) < 0.3) || tg > 7) {
        etat = 'course'; tEtat = 0; vCourse = 1; boutons();
        dire('🪂 La voile est au-dessus de vous ! 🏃 COURS !', 2.2);
      }
      cameraVers(camera, derriere(12, 4.5, 5), devant(-2, 3.5), dt, 3);
    }
    function majRetombe(dt, camera) {
      poseSol(0, dt);
      incl += (incl > 0 ? 1 : -1) * dt * 1.4;
      voile.rotation.set(AV.lerp(voile.rotation.x, beta0, Math.min(1, dt * 2)), 0, -borne(incl, -1.5, 1.5)); voile.scale.z = AV.lerp(voile.scale.z, 0.15, Math.min(1, dt * 2));
      cameraVers(camera, derriere(12, 4.5, 5), devant(-2, 2.5), dt, 3);
      if (tEtat > 1.3) {
        placerAuDepart(); etat = 'pret'; tEtat = 0; boutons();
        dire('Oups ! La voile est retombée sur le côté… ✋ pour réessayer (pousse du côté où elle penche)', 4.5);
      }
    }

    // ---------- Course d'élan ----------
    function majCourse(dt, tap, camera) {
      if (tap) vCourse = Math.min(9.5, vCourse + 0.55);
      var parcouru = Math.sqrt((pos.x - S.x) * (pos.x - S.x) + (pos.z - S.z) * (pos.z - S.z));
      var frein = 0.35;
      if (!gele && parcouru > 9) { gele = true; geleT = 1.6; dire('<b>' + nomLui + ' :</b> Attends, attends… c\'est haut 😱 !', 2.2); }
      if (geleT > 0) { geleT -= dt; frein += 0.55; if (geleT <= 0) dire('<b>Toi :</b> Allez, on y va ! 💪', 1.8); }
      vCourse = Math.max(0, vCourse + (0.25 - vCourse * frein) * dt);
      pos.x += -Math.sin(h) * vCourse * dt; pos.z += -Math.cos(h) * vCourse * dt;
      poseSol(vCourse, dt);
      voile.rotation.set(-0.05 + Math.sin(tTotal * 3) * 0.03, 0, -incl); incl *= Math.exp(-dt * 2);
      var pr = J.parts; pr.brasG.rotation.x = -2.2; pr.brasD.rotation.x = -2.2;
      if (parcouru > 14 && vCourse >= VDEC) decoller();
      else if (parcouru > 42) {
        nCourse++; AV.audio.erreur();
        fonduPuis(function () {
          placerAuDepart(); etat = 'pret'; tEtat = 0; boutons();
          dire('Pas assez d\'élan… la voile n\'a pas porté. ✋ pour réessayer : tape encore plus vite ! 💨', 4.5);
        });
      }
      cameraVers(camera, derriere(9, 3, 3.5), devant(12, -2), dt, 3);
    }
    function decoller() {
      etat = 'vol'; tEtat = 0; tVol = 0; v = Math.max(vCourse, 8); sink = 0; omega = 0; roulis = 0; assis = 0; flareT = 0;
      repliques = {}; tFlare = 99; dejaTherm = false; dejaEstomac = false; dejaVise = false; tVirage = 0; camOff = 0; camPitch = 0;
      ombreV.visible = true;
      AV.audio.souffle(true); AV.audio.saut();
      boutons(); sousTitre();
    }

    // ---------- Vol ----------
    function portance(p) {
      var l = 0;
      for (var i = 0; i < THERMIQUES.length; i++) {
        var T = THERMIQUES[i], dx = p.x - T.x, dz = p.z - T.z, d2 = dx * dx + dz * dz;
        if (d2 < T.r * T.r) l += T.f * (1 - d2 / (T.r * T.r)) * lisse(T.top, T.top - 30, p.y);
      }
      return l;
    }
    function majVol(dt, e, x, r, camera) {
      tVol += dt;
      var oreil = (btnOreilles || clavOreilles) && flareT <= 0;
      var acc = Math.max(0, e.y), fr = Math.max(0, -e.y);
      omega = AV.lerp(omega, -e.x * (oreil ? 0.4 : 0.65), 1 - Math.exp(-dt * 2.5));
      h += omega * dt;
      var vT = 11 + 3.5 * acc - 3.5 * fr - (oreil ? 1.5 : 0);
      var sT = 1.9 + 1.2 * acc - 0.55 * fr + 3.0 * Math.pow(Math.abs(omega) / 0.65, 2) + (oreil ? 2.2 : 0);
      agl = pos.y - H(pos.x, pos.z);
      if (x.action && tVol > 3) {
        if (agl < 10) { flareT = 1.8; tFlare = 0; AV.audio.clic(); }
        else dire('🪂 Pas encore ! L\'arrondi, c\'est tout près du sol (moins de 5 m)', 2.5);
      }
      if (tFlare < 8 && agl < 3) flareT = Math.max(flareT, 0.2); // une fois l'arrondi lancé, on le tient jusqu'au sol
      if (flareT > 0) { flareT -= dt; vT = 5; sT = 0.9; }
      v = AV.lerp(v, vT, 1 - Math.exp(-dt * (flareT > 0 ? 3 : 1.3)));
      sink = AV.lerp(sink, sT, 1 - Math.exp(-dt * (flareT > 0 ? 4 : 2))); tFlare += dt;
      var lift = portance(pos);
      vy = -sink + lift;
      pos.x += -Math.sin(h) * v * dt; pos.z += -Math.cos(h) * v * dt; pos.y += vy * dt;
      if (pos.y > 150) pos.y = 150;
      agl = pos.y - H(pos.x, pos.z);
      if (agl < 1.35) {
        if (tVol < 2.5) pos.y = H(pos.x, pos.z) + 1.35; // on quitte la pente
        else { toucher(); return; }
      }
      // posture : assis dans la sellette, debout pour l'atterrissage
      var cibleAssis = tVol < 0.5 ? 0 : (tVol > 4 && agl < 12 ? 0 : 1);
      assis = AV.lerp(assis, cibleAssis, 1 - Math.exp(-dt * 2.5));
      roulis = AV.lerp(roulis, omega * 0.9, 1 - Math.exp(-dt * 3));
      planeur.groupe.position.copy(pos);
      planeur.groupe.rotation.set(Math.sin(tVol * 0.8) * 0.02 + (flareT > 0 ? -0.12 : 0), h, roulis);
      voile.rotation.set(-0.05 + (oreil ? 0.05 : 0), 0, 0);
      voile.scale.x = AV.lerp(voile.scale.x, oreil ? 0.72 : 1, 1 - Math.exp(-dt * 5)); // les oreilles : bouts d'aile repliés
      planeur.groupe.updateMatrixWorld(true);
      // elle (pilote, derrière)
      planeur.groupe.localToWorld(vLoc.set(0, AV.lerp(-1.35, -1.17, assis), AV.lerp(0.55, 0.5, assis)));
      J.position.copy(vLoc); J.groupe.quaternion.copy(planeur.groupe.quaternion).multiply(qPi);
      J.ombre.visible = false;
      var pr = J.parts, fl = flareT > 0 ? 1.2 : 0;
      pr.jambeG.rotation.set(-1.3 * assis, 0, 0.05); pr.jambeD.rotation.set(-1.3 * assis, 0, -0.05);
      pr.corps.rotation.set(0.05 * assis, 0, 0); pr.corps.position.y = 0;
      pr.brasG.rotation.set(-2.6 + 1.4 * Math.min(1, fr + Math.max(0, e.x) + fl), 0, -0.35);
      pr.brasD.rotation.set(-2.6 + 1.4 * Math.min(1, fr + Math.max(0, -e.x) + fl), 0, 0.35);
      pr.tete.rotation.set(0.15, 0, 0);
      // lui (passager, devant)
      lui.groupe.position.set(0, AV.lerp(-1.35, -1.55, assis) + 0, -0.38);
      var lt = tVol, cri = lt > 0.8 && lt < 3.6, yeux = lt >= 3.6 && lt < 12, joie = lt >= 12 && lt < 20;
      var batt = cri ? Math.sin(tTotal * 14) * 0.5 : 0;
      lui.jambes[0].rotation.set(-1.3 * assis + batt, 0, 0); lui.jambes[1].rotation.set(-1.3 * assis - batt, 0, 0);
      lui.corps.rotation.set(0, 0, 0);
      if (cri) { lui.bras[0].rotation.set(-2.8 + batt, 0, -0.4); lui.bras[1].rotation.set(-2.8 - batt, 0, 0.4); }
      else if (yeux) { lui.bras[0].rotation.set(-2.25, 0, 0.62); lui.bras[1].rotation.set(-2.25, 0, -0.62); }
      else if (joie) { lui.bras[0].rotation.set(-1.3, 0, -1.0 + Math.sin(tTotal * 3) * 0.15); lui.bras[1].rotation.set(-1.3, 0, 1.0 - Math.sin(tTotal * 3) * 0.15); }
      else if (Math.abs(omega) > 0.42) { lui.bras[0].rotation.set(-2.7, 0, 0.1); lui.bras[1].rotation.set(-2.7, 0, -0.1); }
      else { lui.bras[0].rotation.set(-0.5, 0, 0.25); lui.bras[1].rotation.set(-0.5, 0, -0.25); }
      lui.tete.rotation.set(yeux ? 0.35 : -0.05, Math.sin(tTotal * 0.4) * (joie ? 0.6 : 0.15), 0);
      // ses répliques
      function une(cle, t0, txt, d, son) { if (!repliques[cle] && lt > t0) { repliques[cle] = true; dire(txt, d); if (son) son(); } }
      une('cri', 0.9, '<b>' + nomLui + ' :</b> AAAAAAAAAAAH ! 😱', 2.6, AV.audio.cri);
      une('yeux', 4.5, '<b>' + nomLui + ' :</b> J\'ai les yeux fermés… dis-moi quand c\'est fini 🙈', 3.5);
      une('beau', 12.5, '<b>' + nomLui + ' :</b> …Attends. En fait… c\'est MAGNIFIQUE 😍', 3.5);
      une('puys', 22, '<b>' + nomLui + ' :</b> Regarde la chaîne des Puys ! Et là-bas au nord, le cratère du Pariou 🌋', 4);
      une('clermont', 34, '<b>' + nomLui + ' :</b> Tout en bas à l\'est, Clermont… on voit même la cathédrale noire !', 4);
      if (Math.abs(omega) > 0.45) tVirage += dt; else tVirage = 0;
      if (tVirage > 2.5 && !dejaEstomac) { dejaEstomac = true; dire('<b>' + nomLui + ' :</b> Doucement dans les virages, mon estomac !! 🤢', 3); }
      if (lift > 0.8 && !dejaTherm) { dejaTherm = true; dire('🦅 Un thermique ! Tourne dedans pour monter ⤴ (comme les milans)', 3.5); }
      var dCx = pos.x - L.x, dCz = pos.z - L.z, dC = Math.sqrt(dCx * dCx + dCz * dCz);
      if (!dejaVise && dC < 140 && agl < 45) { dejaVise = true; dire('<b>' + nomLui + ' :</b> Vise bien le rond ! 🎯', 2.5); }
      if (Math.sqrt(pos.x * pos.x + pos.z * pos.z) > 3200 && (!parole || parole.t <= 0)) dire('🧭 On s\'éloigne trop ! Reviens vers la cible (suis la flèche)', 2.5);
      // sons : vario, vent relatif
      tBip -= dt;
      if (vy > 0.3 && tBip <= 0) { AV.audio.vario(vy); tBip = Math.max(0.12, 0.55 - vy * 0.09); }
      AV.audio.souffleVitesse(Math.min(1, v / 15));
      // ombre de la voile au sol
      ombreV.position.set(pos.x, H(pos.x, pos.z) + 0.3, pos.z); ombreV.rotation.set(-Math.PI / 2, 0, h);
      ombreV.material.opacity = 0.3 * (1 - lisse(20, 140, agl));
      faisceau.material.opacity = 0.18 * lisse(25, 90, agl);
      // caméra : derrière la voile, on peut regarder autour en glissant
      camOff += r.dx * 0.005; camPitch = borne(camPitch + r.dy * 0.003, -0.25, 0.7);
      camDist = borne(camDist + r.zoom * 0.02, 9, 40);
      if (!r.dx && !r.dy) { tSansRegard += dt; if (tSansRegard > 2.5) { camOff *= Math.exp(-dt * 0.8); camPitch *= Math.exp(-dt * 0.8); } } else tSansRegard = 0;
      var yaw = h + camOff, pc = 0.28 + camPitch + (agl < 25 ? 0.12 : 0), dd = camDist * (tVol < 2 ? 0.7 : 1);
      cP.set(pos.x + Math.sin(yaw) * dd * Math.cos(pc), pos.y + 2 + dd * Math.sin(pc), pos.z + Math.cos(yaw) * dd * Math.cos(pc));
      devant(6, 2.2);
      cameraVers(camera, cP, cL, dt, 4);
      camera.rotateZ(roulis * 0.3);
    }
    function toucher() {
      etat = 'pose'; tEtat = 0; vyTouche = vy; doux = tFlare < 8 || vy > -1.3;
      pos.y = H(pos.x, pos.z) + 1.35; betaV = voile.rotation.x; voile.scale.x = 1;
      AV.audio.souffle(false); AV.audio.pas('herbe'); AV.audio.impact && AV.audio.impact(doux ? 0.3 : 0.8);
      ombreV.visible = false; boutons();
    }

    // ---------- Posés ----------
    function majPose(dt, camera) {
      v = Math.max(0, v - dt * (5 + v * 0.6));
      pos.x += -Math.sin(h) * v * dt; pos.z += -Math.cos(h) * v * dt;
      poseSol(v, dt);
      betaV = Math.min(1.55, betaV + dt * 1.1); voile.rotation.set(betaV, 0, 0); voile.scale.z = AV.lerp(1, 0.15, lisse(0.6, 1.5, betaV));
      cameraVers(camera, derriere(-7, 2.5, 7), devant(0, 0.5), dt, 2.5);
      if (v <= 0.01 && tEtat > 1.0) evaluer();
    }
    function evaluer() {
      dResultat = Math.sqrt((pos.x - L.x) * (pos.x - L.x) + (pos.z - L.z) * (pos.z - L.z));
      var ok = dResultat <= R;
      if (ok) {
        resultat = dResultat < 3 ? '🎯 EN PLEIN DANS LE MILLE !' : '✅ Dans le cercle !';
        dire(resultat + ' À ' + dResultat.toFixed(1).replace('.', ',') + ' m du centre · ' + (doux ? 'atterrissage tout en douceur 🪶' : 'un peu sportif, mais entiers 😅'), 4);
        AV.audio.bravo(); AV.audio.ping(1);
        etat = 'final'; tEtat = 0; aCam = Math.atan2(camPos.z - pos.z, camPos.x - pos.x);
        G.attach(lui.groupe);
        luiP.copy(lui.groupe.position); herP.copy(J.position);
      } else {
        etat = 'rate'; tEtat = 0; aCam = Math.atan2(camPos.z - pos.z, camPos.x - pos.x);
        var loin = dResultat > 150;
        dire(loin ? '🐄 Posés dans un champ, à ' + Math.round(dResultat) + ' m de la cible… les Salers sont surprises !' : '😅 Raté de ' + dResultat.toFixed(1).replace('.', ',') + ' m… si près !', 4);
        AV.audio.erreur();
      }
      sousTitre(); boutons();
    }
    function majRate(dt, tap, camera) {
      poseSol(0, dt);
      lui.bras[0].rotation.set(-0.3, 0, 0.9); lui.bras[1].rotation.set(-0.3, 0, -0.9); // il hausse les épaules
      aCam += dt * 0.15;
      cameraVers(camera, cP.set(pos.x + Math.cos(aCam) * 10, pos.y + 2.5, pos.z + Math.sin(aCam) * 10), cL.set(pos.x, pos.y - 0.3, pos.z), dt, 2);
      if (tEtat > 4.5 && tEtat < 4.6 && (!parole || parole.t <= 0)) dire('<b>' + nomLui + ' :</b> On remonte ? Pour toi je refais le grand saut 😅', 3.5);
      if (tap && tEtat > 0.8) {
        nEchecs++; R = Math.min(30, 12 + 6 * nEchecs); construireCible();
        fonduPuis(function () {
          placerAuDepart(); etat = 'pret'; tEtat = 0; boutons(); sousTitre();
          dire('🚐 Retour au sommet ! Le cercle fait maintenant ' + Math.round(2 * R) + ' m · ✋ pour gonfler la voile', 4);
        });
      }
    }

    // ---------- Final : la terre ferme, puis un câlin ----------
    function majFinal(dt, camera) {
      var tF = tEtat, pr = J.parts;
      betaV = Math.min(1.55, betaV + dt * 1.1); voile.rotation.set(betaV, 0, 0); voile.scale.z = AV.lerp(1, 0.15, lisse(0.6, 1.5, betaV));
      var dx = herP.x - luiP.x, dz = herP.z - luiP.z, dl = Math.sqrt(dx * dx + dz * dz) || 1;
      // il s'agenouille et embrasse le sol
      var k1 = lisse(1.0, 1.6, tF) * (1 - lisse(3.0, 3.6, tF));
      var kA = lisse(3.6, 4.8, tF), dist = AV.lerp(dl, 0.5, kA);
      var px = herP.x - dx / dl * dist, pz = herP.z - dz / dl * dist;
      lui.groupe.position.set(px, H(px, pz) - 0.45 * k1, pz);
      lui.groupe.rotation.set(0, Math.atan2(dx, dz) + (1 - kA) * (1 - lisse(2.9, 3.6, tF)) * 0.8, 0);
      var marche = tF > 3.6 && tF < 4.8 ? Math.sin(tF * 12) * 0.6 : 0;
      lui.jambes[0].rotation.set(1.2 * k1 + marche, 0, 0); lui.jambes[1].rotation.set(1.2 * k1 - marche, 0, 0);
      lui.corps.rotation.set(1.05 * k1, 0, 0);
      var calin = lisse(4.6, 5.2, tF);
      lui.bras[0].rotation.set(AV.lerp(-0.3 - k1 * 1.2, -1.45, calin), 0, AV.lerp(0.2, 0.75, calin));
      lui.bras[1].rotation.set(AV.lerp(-0.3 - k1 * 1.2, -1.45, calin), 0, AV.lerp(-0.2, -0.75, calin));
      lui.tete.rotation.set(0.1 * calin, 0, 0.15 * calin);
      J.groupe.rotation.set(0, Math.atan2(-dx, -dz), 0);
      pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0); pr.corps.rotation.set(0, 0, -0.06 * calin);
      pr.brasG.rotation.set(AV.lerp(0, -1.4, calin), 0, AV.lerp(-0.15, 0.7, calin)); pr.brasD.rotation.set(AV.lerp(0, -1.4, calin), 0, AV.lerp(0.15, -0.7, calin));
      pr.tete.rotation.set(0, 0, -0.2 * calin);
      if (tF > 1.1 && !repliques.terre) { repliques.terre = true; dire('<b>' + nomLui + ' :</b> LA TERRE FERME !! 😂🌍', 2.6); }
      if (tF > 2.1 && !repliques.bisou) { repliques.bisou = true; AV.audio.bisou(); }
      if (tF > 5.0 && !repliques.merci) { repliques.merci = true; dire('<b>' + nomLui + ' :</b> C\'était… GÉNIAL. Merci de m\'avoir fait voler ❤', 4); AV.audio.bisou(); }
      tCoeur -= dt;
      if (tF > 5.2 && tCoeur <= 0) {
        tCoeur = 0.35;
        var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.7 });
        cs.position.set((px + herP.x) / 2 + (Math.random() - 0.5) * 0.7, herP.y + 2.1, (pz + herP.z) / 2 + (Math.random() - 0.5) * 0.5);
        G.add(cs); coeurs.push({ s: cs, t: 0 });
      }
      if (tF > 9 && !fini) { fini = true; etat = 'fini'; terminer(); }
      aCam += dt * 0.22;
      var mx = (px + herP.x) / 2, mz = (pz + herP.z) / 2, my = herP.y;
      cameraVers(camera, cP.set(mx + Math.cos(aCam) * 7, my + 2.4, mz + Math.sin(aCam) * 7), cL.set(mx, my + 1.0, mz), dt, 2);
    }
    function majCoeurs(dt) {
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var c = coeurs[i]; c.t += dt; c.s.position.y += dt * 0.6; c.s.position.x += Math.sin(c.t * 3 + i) * dt * 0.15;
        c.s.material.opacity = Math.max(0, 1 - c.t / 2.4);
        if (c.t > 2.4) { G.remove(c.s); AV.detruire(c.s); coeurs.splice(i, 1); }
      }
    }
    function terminer() { sousTitre(); if (api) api.trouver(); }

    // ---------- Pilote (chaque image) ----------
    mo.pilote = function (dt, e, appui, joueur, camera, x) {
      J = joueur; x = x || {};
      if (etat === 'parti') return;
      if (!api) return;
      tEtat += dt; tTotal += dt; if (parole) parole.t -= dt;
      var r = x.regard || { dx: 0, dy: 0, zoom: 0 }, tap = !!(x.action || x.saut);
      if (etat === 'intro' || etat === 'pret') majIntro(dt, tap, camera);
      else if (etat === 'gonflage') majGonflage(dt, e, camera);
      else if (etat === 'retombe') majRetombe(dt, camera);
      else if (etat === 'course') majCourse(dt, tap, camera);
      else if (etat === 'vol') majVol(dt, e, x, r, camera);
      else if (etat === 'pose') majPose(dt, camera);
      else if (etat === 'rate') majRate(dt, tap, camera);
      else if (etat === 'final' || etat === 'fini') majFinal(dt, camera);
      else if (etat === 'transition') { camera.position.copy(camPos); camera.lookAt(camLook); }
      majCoeurs(dt);
      cielM.position.copy(camera.position);
      soleilH.position.copy(camera.position).addScaledVector(dirS, 3000);
      majUI(camera);
    };

    mo.nettoyer = function () {
      if (etat === 'transition') { var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir'); }
      etat = 'parti';
      AV.audio.souffle(false);
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui); ui = null;
      ecoute.forEach(function (f) { f(); }); ecoute = [];
      document.getElementById('btn-action').textContent = '✋';
      document.getElementById('btn-saut').textContent = '⤒';
      btnOreilles = clavOreilles = false;
      if (J) {
        var pr = J.parts;
        J.groupe.rotation.set(0, 0, 0);
        pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15);
        pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
        pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0);
        J.ombre.visible = true; J.ombre.scale.setScalar(1);
      }
    };

    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, tEtat: Math.round(tEtat * 10) / 10, pos: pos.toArray().map(Math.round), h: Math.round(h * 100) / 100, v: Math.round(v * 10) / 10, vy: Math.round(vy * 10) / 10, agl: Math.round(agl), vCourse: Math.round(vCourse * 10) / 10, incl: Math.round(incl * 100) / 100, R: R, nEchecs: nEchecs, d: Math.round(dResultat * 10) / 10, doux: doux, tFlare: Math.round(tFlare * 10) / 10, vyTouche: Math.round(vyTouche * 10) / 10 }; },
      passer: function () { etat = 'pret'; tEtat = 1; boutons(); },
      gonfler: function () { etat = 'course'; tEtat = 0; vCourse = 1; voile.rotation.set(-0.05, 0, 0); voile.scale.set(1, 1, 1); boutons(); },
      decoller: function () { pos.set(-55, H(-55, 2) + 1.35, 2); vCourse = 8; decoller(); },
      voler: function (px, py, pz, hh) { pos.set(px, py, pz); if (hh != null) h = hh; v = 11; },
      versCible: function (dx, alt) { pos.set(L.x + dx, YL + 1.35 + alt, L.z); h = Math.PI / 2; v = 11; sink = 1.9; },
      cible: function () { return { x: L.x, y: YL, z: L.z, R: R }; },
      H: H,
      finir: function () { if (etat === 'final') tEtat = 8.9; }
    };
    return mo;
  };
})(window.AV);
