/* Biome « chalet » : le chalet de Camprieu (Saint-Sauveur-Camprieu, 1100 m, au pied de l'Aigoual), une fin d'après-midi d'été.
   Elle se promène librement (terrasse sur pilotis, escalier, jardin en pente) ; lui reste sur la terrasse avec son verre.
   En bas du jardin, une slackline tendue entre deux hêtres : ✋ pour monter dessus.
   Équilibre : joystick / flèches ← → pour se rattraper (pousse du côté où tu penches), ↑ pour avancer pas à pas, ↓ reculer,
   ✋ pour sauter de la ligne. Chaque chute rend la ligne un peu plus calme ; après 3 chutes, il descend te tenir la main.
   Au bout : il la rejoint, gros câlin… et la surprise de jours.js s'ouvre. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#4a8ad6', bas: '#f3dcb4', brouillard: '#e2dccd', hemi: ['#fff1dc', '#5a6a48', 0.8], soleil: ['#ffd9a0', 0.95, [-0.55, 0.5, 0.45]] };
  var YD = 0.45, PENTE = 0.3;                         // plancher de la terrasse ; pente du jardin vers le sud (+z)
  var LA = { x: -5.5, z: 9 }, LB = { x: 5.5, z: 9 }, LEN = 11; // les deux hêtres de la slackline
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function borne(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Relief ----------
  function sol(x, z) {
    var zz = Math.max(-3, Math.min(z, 22));
    var h = -PENTE * (zz + 3) - (z > 22 ? (z - 22) * 0.1 : 0);
    h += 0.1 * Math.sin(x * 0.6 + z * 0.3) * Math.sin(z * 0.45 - x * 0.2) * lisse(-3, 3, z);
    h += lisse(-14, -90, z) * 22; // la colline boisée derrière le chalet
    var r = Math.sqrt(x * x + z * z);
    h += lisse(45, 280, r) * (28 * (Math.sin(x * 0.011 + 1) * Math.cos(z * 0.009) + 0.6 * Math.sin(x * 0.023 - z * 0.017)));
    var ax = x - 430, az = z + 380; h += 270 * Math.exp(-(ax * ax + az * az) / (330 * 330)) * lisse(60, 200, r); // le mont Aigoual (rien autour du chalet)
    return h;
  }
  function escalier(z) { return AV.lerp(YD, sol(6.1, 6), z / 6); }
  function H(x, z) {
    var h = sol(x, z);
    if (x >= -7 && x <= 7 && z >= -5.2 && z <= 0) h = Math.max(h, YD);
    if (x >= 5.4 && x <= 6.8 && z >= 0 && z <= 6) h = Math.max(h, escalier(z));
    if (x >= -6 && x <= 6 && z >= -12 && z <= -5) h = Math.max(h, YD);
    return h;
  }
  function foret(x, z) {
    var r = Math.sqrt(x * x + z * z);
    if (r < 30) return false;
    var n = Math.sin(x * 0.021 + 0.5) * Math.cos(z * 0.017 - 1) + 0.5 * Math.sin(x * 0.05 - z * 0.04) + 0.4 * (hash(Math.floor(x / 25), Math.floor(z / 25)) - 0.5);
    if (z < -20 && r < 140) n += 0.8; // la forêt derrière le chalet
    var vx = x + 170, vz = z - 140; if (vx * vx + vz * vz < 90 * 90) n -= 2; // le village
    return n > 0.25;
  }
  function couleurSol(x, y, z, ny) {
    var r = Math.sqrt(x * x + z * z);
    if (y > 150) return varier(ny < 0.85 ? '#8c8a7c' : '#8e9a62', x, z, 0.1); // les hauteurs de l'Aigoual
    if (r > 30 && foret(x, z)) return varier('#3c5a33', x, z, 0.14);
    if (Math.abs(x - 6.1) < 1.2 && z > 5 && z < 9) return varier('#b3a58a', x, z, 0.08); // petit chemin
    var k = hash(Math.floor(x / 3), Math.floor(z / 3));
    return varier(k > 0.85 ? '#9ab85e' : k > 0.4 ? '#7fae55' : '#76a44f', x, z, 0.08);
  }
  function terrainZone(cx, cz, taille, segs, puits) {
    var geo = new THREE.PlaneGeometry(taille, taille, segs, segs); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i) + cx, z = p.getZ(i) + cz;
      p.setX(i, x); p.setZ(i, z); p.setY(i, sol(x, z) - (puits ? puits(x, z) : 0));
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
  function boite(F, l, h, p, col, x, y, z, ry) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }

  // ---------- Lui (t-shirt, cheveux bruns) ----------
  function fabriquerLui() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.15, 0.8, 0.17, '#3a4a66', 0, -0.4, 0));
      j.add(bm(0.17, 0.1, 0.27, '#f2f2f2', 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), '#c0392b'); t.position.y = 1.11; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), '#4a3426'); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.0, 0.152); tete.add(o); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    AV.avatars.coiffer(tete, 'axel', { retirer: '#4a3426' });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 6), '#eec29a'); m.position.y = -0.28; b.add(m);
      var manche = AV.maille(new THREE.CylinderGeometry(0.085, 0.08, 0.2, 6), '#c0392b'); manche.position.y = -0.08; b.add(manche);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    // son verre (dans la main droite)
    var verre = new THREE.Group();
    var vv = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.12, 8), new THREE.MeshLambertMaterial({ color: '#d8ecf2', transparent: true, opacity: 0.6 })); vv.position.y = 0.1; verre.add(vv);
    var vin = AV.maille(new THREE.CylinderGeometry(0.042, 0.033, 0.06, 8), '#f0d878', false); vin.position.y = 0.07; verre.add(vin);
    verre.position.y = -0.64; bras[1].add(verre);
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes, verre: verre };
  }

  // =====================================================================
  AV.biomes.chalet = function (cfg) {
    var rng = AV.rng(1313 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 24, hauteur: H, surface: 'herbe', ciel: CIEL, brouillard: [70, 1500],
      depart: { x: 2.5, z: -3.2, angle: 0 }, theme: 'chalet', ambiance: 'aube'
    });
    mo.loin = 2600;
    mo.sansAnimal = true;
    mo.surfaceA = function (x, z) { return (x >= -7 && x <= 7 && z >= -5.2 && z <= 0) || (x >= 5.4 && x <= 6.8 && z >= 0 && z <= 6) ? 'bois' : 'herbe'; };
    var G = mo.groupe;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    var soleilH = AV.halo('#ffe2a8', 260); soleilH.material.fog = false; soleilH.material.opacity = 0.6; G.add(soleilH);
    var dirS = new THREE.Vector3(CIEL.soleil[2][0], CIEL.soleil[2][1], CIEL.soleil[2][2]).normalize();

    // ---------- Terrain ----------
    G.add(terrainZone(0, 4, 90, 90, null));
    G.add(terrainZone(0, 0, 3000, 150, puitsDans(-45, 45, -41, 49, 8, 6)));

    // ---------- Forêts (pins et sapins), nuages ----------
    var V = new AV.Fusion(), n = 0;
    for (var t = 0; t < 7000 && n < 2200; t++) {
      var x = AV.entre(rng, -800, 800), z = AV.entre(rng, -800, 800);
      if (!foret(x, z)) continue;
      var y = sol(x, z), hp = AV.entre(rng, 9, 17); n++;
      if (rng() < 0.6) forme(V, new THREE.ConeGeometry(1, 1, 6), AV.choisir(rng, ['#2f4d2e', '#34552f', '#2a462b']), x, y + hp * 0.5, z, rng() * 3, hp * 0.24, hp, hp * 0.24);
      else { forme(V, new THREE.CylinderGeometry(0.25, 0.35, hp * 0.7, 5), '#8a5a3a', x, y + hp * 0.35, z, 0, 1, 1, 1); forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#3f6136', '#466b3a']), x, y + hp * 0.78, z, rng() * 3, hp * 0.22, hp * 0.16, hp * 0.22); }
    }
    var Nu = new AV.Fusion();
    for (var cn = 0; cn < 14; cn++) {
      var ca = rng() * Math.PI * 2, cd = AV.entre(rng, 500, 1300), cy = AV.entre(rng, 220, 380), ct = AV.entre(rng, 40, 90);
      for (var ci = 0; ci < 7; ci++) forme(Nu, new THREE.IcosahedronGeometry(1, 1), '#ffffff', Math.cos(ca) * cd + AV.entre(rng, -ct, ct), cy + rng() * ct * 0.3, Math.sin(ca) * cd + AV.entre(rng, -ct * 0.6, ct * 0.6), rng() * 3, ct * AV.entre(rng, 0.4, 0.7), ct * AV.entre(rng, 0.3, 0.45), ct * AV.entre(rng, 0.4, 0.7));
    }
    G.add(Nu.maille(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#9a8e86' })));

    // ---------- Le village de Camprieu (pierre et lauzes) et l'observatoire de l'Aigoual ----------
    var Vi = new AV.Fusion();
    for (var m = 0; m < 26; m++) {
      var a2 = rng() * Math.PI * 2, d2 = Math.sqrt(rng()) * 55, hx = -170 + Math.cos(a2) * d2, hz = 140 + Math.sin(a2) * d2;
      var w = AV.entre(rng, 7, 12), dp = AV.entre(rng, 6, 9), hh = AV.entre(rng, 5, 7), ry = rng() * Math.PI, yb = sol(hx, hz);
      forme(Vi, new THREE.BoxGeometry(w, hh, dp), AV.choisir(rng, ['#b9b0a2', '#a8a092', '#c4bcae']), hx, yb + hh / 2, hz, ry, 1, 1, 1);
      forme(Vi, new THREE.ConeGeometry(1, 1, 4), AV.choisir(rng, ['#5b5f66', '#64676c']), hx, yb + hh + 1.4, hz, ry + Math.PI / 4, w * 0.74, 2.8, dp * 0.74);
    }
    var yE = sol(-170, 140);
    forme(Vi, new THREE.BoxGeometry(8, 8, 15), '#b0a898', -170, yE + 4, 140, 0.4, 1, 1, 1);
    forme(Vi, new THREE.BoxGeometry(4, 16, 4), '#a8a092', -166, yE + 8, 133, 0.4, 1, 1, 1);
    forme(Vi, new THREE.ConeGeometry(3.2, 6, 4), '#5b5f66', -166, yE + 19, 133, 0.4 + Math.PI / 4, 1, 1, 1);
    var ys = sol(430, -380);
    forme(Vi, new THREE.BoxGeometry(14, 18, 14), '#a8a092', 430, ys + 9, -380, 0.2, 1, 1, 1);
    forme(Vi, new THREE.CylinderGeometry(4, 4, 8, 10), '#b9b0a2', 433, ys + 22, -380, 0, 1, 1, 1);
    forme(Vi, new THREE.CylinderGeometry(0.4, 0.4, 14, 5), '#e0e0e0', 433, ys + 33, -380, 0, 1, 1, 1);
    G.add(Vi.maille());
    G.add(V.maille());

    // ---------- Le chalet ----------
    var C = new AV.Fusion(), bois = '#7a5233', boisF = '#5e3e26', planche = '#a8784e';
    boite(C, 12.4, 1.0, 7.4, '#8f877c', 0, -0.05, -8.5);                     // soubassement en pierre
    boite(C, 12, 3.3, 7, bois, 0, YD + 1.65, -8.5);                            // murs
    for (var pl = 0; pl < 8; pl++) boite(C, 12.04, 0.05, 7.04, boisF, 0, YD + 0.2 + pl * 0.42, -8.5); // planches
    var tri = new THREE.Shape(); tri.moveTo(-3.6, 0); tri.lineTo(3.6, 0); tri.lineTo(0, 2.4); tri.lineTo(-3.6, 0);
    var pignon = new THREE.ExtrudeGeometry(tri, { depth: 11.9, bevelEnabled: false });
    forme(C, pignon, bois, -5.95, YD + 3.3, -8.5, Math.PI / 2, 1, 1, 1);
    [-1, 1].forEach(function (s) { forme(C, new THREE.BoxGeometry(13.6, 0.28, 5.0), '#5b5f66', 0, YD + 4.5, -8.5 + s * 2.05, 0, 1, 1, 1, s * 0.585, 0); }); // toit en lauzes
    boite(C, 13.6, 0.3, 0.4, '#4a4e55', 0, YD + 5.75, -8.5);
    boite(C, 0.9, 2.6, 0.9, '#8f877c', 3.2, YD + 5.6, -10);                   // cheminée
    // la façade sud : baie vitrée, fenêtres, balconnières
    var vitre = '#ffd98a';
    boite(C, 2.2, 2.3, 0.1, boisF, 0, YD + 1.2, -4.96); boite(C, 1.9, 2.05, 0.12, vitre, 0, YD + 1.15, -4.94);
    [-3.6, 3.6].forEach(function (fx) { boite(C, 1.5, 1.3, 0.1, boisF, fx, YD + 1.7, -4.96); boite(C, 1.25, 1.05, 0.12, vitre, fx, YD + 1.7, -4.94); boite(C, 0.7, 1.3, 0.08, '#2f5d3a', fx - 1.05, YD + 1.7, -4.93); boite(C, 0.7, 1.3, 0.08, '#2f5d3a', fx + 1.05, YD + 1.7, -4.93); });
    boite(C, 1.3, 1.0, 0.1, boisF, 0, YD + 4.4, -4.96 + 0.0); boite(C, 1.1, 0.8, 0.12, vitre, 0, YD + 4.4, -4.94);
    // la terrasse sur pilotis
    boite(C, 14, 0.2, 5.2, planche, 0, YD - 0.1, -2.6);
    for (var lp = 0; lp < 13; lp++) boite(C, 0.03, 0.01, 5.2, '#8a603c', -6.5 + lp * 1.08, YD + 0.005, -2.6);
    [-6.85, -3.4, 0, 3.4, 6.85].forEach(function (px) { var yb = sol(px, -0.15); boite(C, 0.22, YD - yb, 0.22, boisF, px, (YD + yb) / 2, -0.15); var yb2 = sol(px, -2.6); boite(C, 0.2, YD - yb2, 0.2, boisF, px, (YD + yb2) / 2, -2.6); });
    // garde-corps (ouvert au-dessus de l'escalier)
    function gardeCorps(x0, z0, x1, z1) {
      var dx = x1 - x0, dz = z1 - z0, l = Math.sqrt(dx * dx + dz * dz), nb = Math.max(1, Math.round(l / 1.1)), ang = Math.atan2(dx, dz);
      for (var i = 0; i <= nb; i++) boite(C, 0.1, 1.0, 0.1, boisF, x0 + dx * i / nb, YD + 0.5, z0 + dz * i / nb);
      forme(C, new THREE.BoxGeometry(0.12, 0.08, l), planche, (x0 + x1) / 2, YD + 1.0, (z0 + z1) / 2, ang, 1, 1, 1);
      forme(C, new THREE.BoxGeometry(0.05, 0.05, l), planche, (x0 + x1) / 2, YD + 0.5, (z0 + z1) / 2, ang, 1, 1, 1);
    }
    gardeCorps(-7, -5, -7, 0); gardeCorps(-7, 0, 5.35, 0); gardeCorps(6.85, 0, 7, 0); gardeCorps(7, 0, 7, -5);
    // balconnières de géraniums
    [-5, -2, 2, 4.2].forEach(function (bx) { boite(C, 1.2, 0.25, 0.25, '#8a603c', bx, YD + 1.12, 0.12); for (var f = 0; f < 5; f++) forme(C, new THREE.IcosahedronGeometry(0.09, 0), f % 2 ? '#e8384f' : '#ff5a6e', bx - 0.5 + f * 0.25, YD + 1.3, 0.12, 0, 1, 1, 1); });
    // l'escalier vers le jardin
    for (var st = 0; st < 12; st++) { var zs = st * 0.5 + 0.25, ye = escalier(zs); boite(C, 1.4, 0.08, 0.5, planche, 6.1, ye - 0.04, zs); boite(C, 1.4, Math.max(0.05, ye - sol(6.1, zs)), 0.06, boisF, 6.1, (ye + sol(6.1, zs)) / 2, zs + 0.22); }
    [5.35, 6.85].forEach(function (sx) {
      var y0 = YD, y1 = escalier(6), l = Math.sqrt(36 + (y0 - y1) * (y0 - y1)), ang = Math.atan2(y0 - y1, 6);
      forme(C, new THREE.BoxGeometry(0.08, 0.3, l), boisF, sx, (y0 + y1) / 2, 3, 0, 1, 1, 1, ang, 0);
      forme(C, new THREE.BoxGeometry(0.08, 0.08, l), planche, sx, (y0 + y1) / 2 + 0.95, 3, 0, 1, 1, 1, ang, 0);
      for (var i = 0; i <= 5; i++) { var zz = i * 1.2, yy = escalier(zz); boite(C, 0.08, 0.95, 0.08, boisF, sx, yy + 0.47, zz); }
    });
    // table, chaises, bouteille, lanterne
    boite(C, 1.8, 0.08, 0.9, planche, -2.4, YD + 0.74, -2.9); [[-3.1, -3.25], [-1.7, -3.25], [-3.1, -2.55], [-1.7, -2.55]].forEach(function (p) { boite(C, 0.08, 0.72, 0.08, boisF, p[0], YD + 0.36, p[1]); });
    function chaise(cx, cz) { boite(C, 0.6, 0.06, 0.55, planche, cx, YD + 0.42, cz); boite(C, 0.6, 0.7, 0.06, planche, cx, YD + 0.8, cz - 0.3); [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].forEach(function (p) { boite(C, 0.05, 0.42, 0.05, boisF, cx + p[0], YD + 0.21, cz + p[1]); }); }
    chaise(-1.3, -1.95); chaise(-3.5, -1.95);
    forme(C, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), '#2f5d3a', -2.2, YD + 0.93, -3.0, 0, 1, 1, 1);
    boite(C, 0.18, 0.25, 0.18, '#2b2b2b', -2.9, YD + 0.9, -3.0);
    // tas de bois sous la terrasse, banc et panneau dans le jardin
    for (var tb = 0; tb < 24; tb++) forme(C, new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6), tb % 3 ? '#9a6a42' : '#b07a4c', -6.6 + (tb % 8) * 0.25, sol(-6, -3.5) + 0.12 + Math.floor(tb / 8) * 0.22, -3.5, 0, 1, 1, 1, Math.PI / 2, 0);
    boite(C, 1.6, 0.08, 0.4, planche, -9, sol(-9, 5) + 0.45, 5); [-0.65, 0.65].forEach(function (o) { boite(C, 0.08, 0.45, 0.35, boisF, -9 + o, sol(-9, 5) + 0.22, 5); });
    boite(C, 0.1, 1.3, 0.1, boisF, 8, sol(8, 6.5) + 0.65, 6.5);
    var maison = C.maille(); maison.castShadow = true; maison.receiveShadow = true; G.add(maison);
    mo.bloqueurs.push(maison);
    var panneau = AV.texteSprite('Camprieu · 1100 m', { fond: 'rgba(110,74,44,.92)', largeur: 1.8, echelle: 0.32 });
    panneau.position.set(8, sol(8, 6.5) + 1.45, 6.5); G.add(panneau);
    // guirlande lumineuse au-dessus de la terrasse
    var gl = AV.outils.guirlande(AV.outils.guirlandeEntre([-6.9, YD + 2.6, -0.05], [6.9, YD + 2.6, -0.05], 28, 0.35), ['#ffd98a', '#ffb070', '#fff0c0']);
    gl.material.size = 0.22; G.add(gl);
    // fumée de la cheminée
    var fumees = [];
    for (var fi = 0; fi < 8; fi++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: AV.textureRonde(), color: '#d8d4cc', transparent: true, depthWrite: false, opacity: 0.4 })); G.add(sp); fumees.push({ s: sp, t: fi / 8 * 6 }); }

    // ---------- Collisions ----------
    var col = mo.colliders;
    col.push({ rect: true, x: 0, z: -8.5, hx: 6.2, hz: 3.7, a: 0 });
    col.push({ rect: true, x: -0.83, z: 0, hx: 6.2, hz: 0.1, a: 0 }, { rect: true, x: 6.93, z: 0, hx: 0.1, hz: 0.1, a: 0 });
    col.push({ rect: true, x: -7, z: -2.6, hx: 0.1, hz: 2.6, a: 0 }, { rect: true, x: 7, z: -2.6, hx: 0.1, hz: 2.6, a: 0 });
    col.push({ rect: true, x: 5.3, z: 2.75, hx: 0.08, hz: 2.75, a: 0 }, { rect: true, x: 6.9, z: 2.75, hx: 0.08, hz: 2.75, a: 0 });
    col.push({ rect: true, x: -2.4, z: -2.9, hx: 0.95, hz: 0.5, a: 0 }, { x: -1.3, z: -1.95, r: 0.35 }, { x: -3.5, z: -1.95, r: 0.35 });
    col.push({ x: -9, z: 5, r: 0.6 }, { x: 8, z: 6.5, r: 0.2 });

    // ---------- Arbres du jardin (dont les deux hêtres de la slackline) ----------
    var A = new AV.Fusion();
    function hetre(x, z, s) {
      var y = sol(x, z);
      forme(A, new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 5 * s, 7), '#8f8a80', x, y + 2.5 * s, z, 0, 1, 1, 1);
      [[0, 6.2, 0, 2.6], [1.3, 5.4, 0.6, 2], [-1.2, 5.6, -0.5, 2.1], [0.3, 7.4, -0.3, 1.8]].forEach(function (b) { forme(A, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5f8f45', '#6a9a4c', '#58863f']), x + b[0] * s, y + b[1] * s, z + b[2] * s, rng() * 3, b[3] * s, b[3] * s * 0.85, b[3] * s); });
      col.push({ x: x, z: z, r: 0.32 * s + 0.05 });
    }
    function pin(x, z, s) {
      var y = sol(x, z);
      forme(A, new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 9 * s, 6), '#9a5a3a', x, y + 4.5 * s, z, 0, 1, 1, 1);
      forme(A, new THREE.IcosahedronGeometry(1, 0), '#3f6136', x, y + 9 * s, z, rng() * 3, 2.4 * s, 1.5 * s, 2.4 * s);
      forme(A, new THREE.IcosahedronGeometry(1, 0), '#466b3a', x + 0.8 * s, y + 7.8 * s, z - 0.4 * s, rng() * 3, 1.6 * s, 1 * s, 1.6 * s);
      col.push({ x: x, z: z, r: 0.28 * s + 0.05 });
    }
    function sapin(x, z, s) {
      var y = sol(x, z);
      forme(A, new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.5 * s, 6), '#6b4a32', x, y + 0.75 * s, z, 0, 1, 1, 1);
      for (var i = 0; i < 4; i++) forme(A, new THREE.ConeGeometry((2 - i * 0.42) * s, 2.4 * s, 7), '#2f5a3e', x, y + (2 + i * 1.5) * s, z, rng() * 3, 1, 1, 1);
      col.push({ x: x, z: z, r: 0.3 * s });
    }
    hetre(LA.x, LA.z, 1.15); hetre(LB.x, LB.z, 1.1);
    pin(-11, 3, 1); pin(12, 13, 1.1); pin(-4, 19, 1); pin(14, -1, 0.95); pin(-15, 13, 1.05);
    sapin(10, 2.5, 1); sapin(-13, -6, 1.1); sapin(13, -8, 1.2); sapin(-9, -15, 1.3); sapin(9, -16, 1.2); sapin(4, 18, 0.9); sapin(-18, 4, 1.1);
    hetre(-10, 16, 0.9); hetre(17, 7, 1);
    // fleurs, cailloux, muret de pierre sèche en bas du jardin
    for (var fl = 0; fl < 140; fl++) { var fx2 = AV.entre(rng, -20, 20), fz2 = AV.entre(rng, 1, 21); if (Math.abs(fz2 - 9) < 1.2 && Math.abs(fx2) < 6) continue; forme(A, new THREE.IcosahedronGeometry(0.08, 0), AV.choisir(rng, ['#ffffff', '#ffd166', '#c39bff', '#ff8fa3', '#7fb2ff']), fx2, sol(fx2, fz2) + 0.12, fz2, 0, 1, 1, 1); }
    for (var mu = -22; mu <= 22; mu += 0.9) forme(A, new THREE.DodecahedronGeometry(0.5, 0), AV.choisir(rng, ['#a8a092', '#9b948a', '#b9b0a2']), mu, sol(mu, 22) + 0.3, 22 + AV.entre(rng, -0.15, 0.15), rng() * 3, 1, AV.entre(rng, 0.7, 1.1), 0.8);
    // protections d'arbre et cliquet de la slackline
    var yA = sol(LA.x, LA.z) + 0.8, yB = sol(LB.x, LB.z) + 0.8;
    forme(A, new THREE.CylinderGeometry(0.42, 0.42, 0.25, 10), '#3d7a4a', LA.x, yA, LA.z, 0, 1, 1, 1);
    forme(A, new THREE.CylinderGeometry(0.4, 0.4, 0.25, 10), '#3d7a4a', LB.x, yB, LB.z, 0, 1, 1, 1);
    boite(A, 0.22, 0.1, 0.14, '#b8bcc2', LA.x + 0.6, yA - 0.02, LA.z);
    var arbresM = A.maille(); arbresM.castShadow = true; G.add(arbresM);

    // ---------- La slackline (deux segments qui suivent son poids) ----------
    var matLigne = new THREE.MeshLambertMaterial({ color: '#ff7a1a' });
    var seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 1), matLigne), seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 1), matLigne);
    seg1.castShadow = seg2.castShadow = true; G.add(seg1); G.add(seg2);
    var pA = new THREE.Vector3(LA.x + 0.42, yA, LA.z), pB = new THREE.Vector3(LB.x - 0.42, yB, LB.z), P = new THREE.Vector3();
    function poser(sg, a, b) { sg.position.copy(a).add(b).multiplyScalar(0.5); sg.scale.z = a.distanceTo(b); sg.lookAt(b); }
    function pointLigne(s, charge, off, out) {
      var L2 = pB.x - pA.x, u = borne(s - 0.42, 0.05, L2 - 0.05), k = 4 * u * (L2 - u) / (L2 * L2);
      out.set(pA.x + u, AV.lerp(pA.y, pB.y, u / L2) - (charge ? 0.06 + 0.32 * k : 0.05 * k), LA.z + (charge ? off : 0));
      return out;
    }
    function majLigne(s, charge, off) { pointLigne(s, charge, off, P); poser(seg1, pA, P); poser(seg2, P, pB); }
    majLigne(LEN / 2, false, 0);

    // ---------- Lui ----------
    var lui = fabriquerLui(); G.add(lui.groupe);
    function luiAssis() {
      lui.groupe.position.set(-1.3, YD + 0.45 - 0.8 + 0.07, -1.9); lui.groupe.rotation.set(0, 0, 0);
      lui.jambes[0].rotation.set(-1.35, 0, 0.05); lui.jambes[1].rotation.set(-1.35, 0, -0.05);
      lui.corps.rotation.set(-0.08, 0, 0); lui.corps.position.set(0, 0, 0);
      lui.bras[0].rotation.set(-0.3, 0, 0.1); lui.bras[1].rotation.set(-1.2, 0, -0.1);
      lui.verre.visible = true;
    }
    luiAssis();
    var modeLui = 'terrasse'; // terrasse | aide | final

    // ---------- État ----------
    var etat = 'marche', tEtat = 0, tTotal = 0, api = null, J = null, parole = null;
    var s = 0.6, th = 0, om = 0, phase = 0, off = 0, nChutes = 0, aide = false, cote = 1, grace = 0, meilleur = 0, tCri = 4;
    var p1 = rng() * 6, p2 = rng() * 6, coeurs = [], tCoeur = 0, fini = false, repliques = {}, aCam = 0;
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), cP = new THREE.Vector3(), cL = new THREE.Vector3(), herP = new THREE.Vector3(), depart = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function tactile() { return document.body.classList.contains('tactile'); }
    function sousTitre() {
      if (!api) return;
      var st2 = cfg.sousTitre || '';
      if (etat === 'equilibre' || etat === 'monte' || etat === 'chute') st2 = '🤸 Traverse toute la slackline · record ' + Math.round(meilleur / (LEN - 1.2) * 100) + ' %' + (nChutes ? ' · chutes : ' + nChutes : '');
      if (etat === 'final' || etat === 'fini') st2 = '🎉 Slackline traversée' + (nChutes ? ' après ' + nChutes + ' chute' + (nChutes > 1 ? 's' : '') : ' du premier coup !') + ' ❤';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, st2);
    }
    function fonduPuis(cb) {
      var fd = document.getElementById('fondu'); fd.classList.add('noir'); etat = 'transition';
      setTimeout(function () { if (etat !== 'transition') return; cb(); fd.classList.remove('noir'); }, 600);
    }

    // ---------- Interactions à pied ----------
    var PAROLES = ['Tu vois la slackline en bas, entre les deux hêtres ? 😏', 'Je te parie un bisou que tu n\'arrives pas au bout 😘', 'Moi je reste ici avec mon verre… je te regarde 🍷', 'Astuce : regarde l\'arbre au bout, pas tes pieds 😉'];
    var iParole = 0;
    var itLui = { x: -1.3, z: -0.9, rayon: 1.7, texte: '💬 ✋ Parler à ' + nomLui, fn: function () { itLui.texte = '<b>' + nomLui + ' :</b> ' + PAROLES[iParole % PAROLES.length] + ' · ✋'; iParole++; AV.audio.clic(); } };
    var itSlack = { x: LA.x + 1.0, z: LA.z - 0.9, rayon: 1.5, texte: '🤸 ✋ Monter sur la slackline', fn: function () { monter(); } };
    mo.interactifs.push(itLui, itSlack);
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'marche') {
        if (Math.abs(p.x - itLui.x) > 3 || Math.abs(p.z - itLui.z) > 3) itLui.texte = '💬 ✋ Parler à ' + nomLui;
        if (p.z < 0.5 && p.y > 0.2) return '🌲 La slackline t\'attend en bas du jardin… descends par l\'escalier';
        return '🤸 Va jusqu\'au hêtre de gauche pour monter sur la slackline';
      }
      if (etat === 'monte') return '🤸 Un pied, puis l\'autre…';
      if (etat === 'equilibre') {
        if (grace > 0 || (s < 1.4 && nChutes === 0)) return tactile() ? '🕹️ Joystick ← → : rattrape-toi (pousse du côté où tu penches) · ↑ : avance · ✋ : sauter' : '← → : rattrape-toi (pousse du côté où tu penches) · ↑ : avance · E : sauter de la ligne';
        return null;
      }
      return null;
    };

    // ---------- Interface : équilibre + progression ----------
    var ui = null, uiLab, uiCur, uiProg, uiPt;
    function construireUI() {
      ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;left:50%;top:max(16px, env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;font-family:Nunito,sans-serif;color:#fff;width:min(72vw,440px);text-align:center;opacity:0;transition:opacity .3s';
      uiProg = document.createElement('div');
      uiProg.style.cssText = 'position:relative;height:26px;margin-bottom:10px;border-radius:13px;background:rgba(10,20,40,.45);font-size:18px;line-height:26px;display:flex;justify-content:space-between;padding:0 6px';
      uiProg.innerHTML = '<span>🌳</span><span>🌳</span>';
      var rail = document.createElement('div'); rail.style.cssText = 'position:absolute;left:34px;right:34px;top:12px;height:3px;background:#ff7a1a;border-radius:2px';
      uiPt = document.createElement('div'); uiPt.style.cssText = 'position:absolute;top:-10px;width:22px;margin-left:-11px;font-size:18px;line-height:22px'; uiPt.textContent = '🤸';
      rail.appendChild(uiPt); uiProg.appendChild(rail);
      uiLab = document.createElement('div'); uiLab.style.cssText = 'font-weight:900;font-size:16px;text-shadow:0 2px 4px rgba(0,0,0,.5);margin-bottom:5px';
      var bar = document.createElement('div');
      bar.style.cssText = 'position:relative;height:20px;border-radius:10px;border:2px solid rgba(255,255,255,.85);background:linear-gradient(90deg,rgba(230,57,70,.8) 0%,rgba(230,57,70,.4) 20%,rgba(124,252,0,.5) 38%,rgba(124,252,0,.5) 62%,rgba(230,57,70,.4) 80%,rgba(230,57,70,.8) 100%)';
      uiCur = document.createElement('div'); uiCur.style.cssText = 'position:absolute;top:0;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.6)';
      bar.appendChild(uiCur);
      ui.appendChild(uiProg); ui.appendChild(uiLab); ui.appendChild(bar);
      document.body.appendChild(ui);
    }
    function majUI() {
      if (!ui) return;
      var vis = etat === 'equilibre' || etat === 'monte';
      ui.style.opacity = vis ? '1' : '0';
      if (!vis) return;
      uiPt.style.left = (borne((s - 0.6) / (LEN - 1.2), 0, 1) * 100) + '%';
      uiCur.style.left = (50 + borne(th / 0.62, -1, 1) * 48) + '%';
      uiLab.textContent = th > 0.15 ? '➡ Tu penches à droite : pousse ➡' : th < -0.15 ? '⬅ Tu penches à gauche : pousse ⬅' : (aide ? '🤝 Il te tient la main…' : '😌 Bien droite… avance doucement ↑');
    }

    // ---------- Monter / descendre ----------
    function monter() {
      etat = 'monte'; tEtat = 0; s = 0.6; th = 0; om = 0; off = 0; grace = 1.6;
      mo.interactifs = [itLui];
      mo.pilote = piloteSlack;
      AV.audio.clic(); sousTitre();
    }
    function descendre() { // on saute de la ligne, retour à pied
      etat = 'marche'; mo.pilote = null; mo.interactifs = [itLui, itSlack];
      if (J) {
        J.groupe.rotation.set(0, 0, 0);
        var pr = J.parts; pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15); pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0); pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0;
        J.placer(P.x, LA.z - 1.1, Math.PI, mo); J.ombre.scale.setScalar(1);
        if (AV.jeu) AV.jeu.camera(0, 0.35, 6);
      }
      if (aide) { modeLui = 'terrasse'; luiAssis(); aide = false; }
      majLigne(LEN / 2, false, 0); sousTitre();
    }
    function cameraVers(camera, p, l, dt, rate) {
      var k = rate ? 1 - Math.exp(-dt * rate) : 1;
      camPos.lerp(p, k); camLook.lerp(l, k);
      var sl = H(camPos.x, camPos.z) + 0.6; if (camPos.y < sl) camPos.y = sl;
      camera.position.copy(camPos); camera.lookAt(camLook);
    }

    // ---------- Pose sur la ligne ----------
    function poseLigne(dt, avance) {
      var pr = J.parts;
      J.position.copy(P);
      J.groupe.rotation.order = 'YXZ';
      J.groupe.rotation.set(0, Math.PI / 2, th);
      var ph = Math.sin(phase);
      pr.jambeG.rotation.set(ph * 0.35 * avance, 0, 0.05); pr.jambeD.rotation.set(-ph * 0.35 * avance, 0, -0.05);
      pr.corps.rotation.set(0.12, 0, 0); pr.corps.position.y = -0.04;
      var bal = -th * 1.1 + Math.sin(tTotal * 2.3) * 0.06;
      pr.brasG.rotation.set(0, 0, aide ? -0.85 : -1.45 + bal); pr.brasD.rotation.set(0, 0, 1.45 + bal);
      pr.tete.rotation.set(0.15, 0, -th * 0.6);
      J.ombre.position.set(P.x, sol(P.x, P.z) + 0.03, P.z); J.ombre.scale.setScalar(0.8);
    }
    function poseLuiAide(dt, v) {
      var lz = LA.z + 0.85;
      lui.groupe.position.set(P.x, sol(P.x, lz), lz); lui.groupe.rotation.set(0, Math.PI / 2, 0);
      var k = Math.min(1, Math.abs(v) / 0.4), ph = Math.sin(phase);
      lui.jambes[0].rotation.set(ph * 0.5 * k, 0, 0); lui.jambes[1].rotation.set(-ph * 0.5 * k, 0, 0);
      lui.corps.rotation.set(0, 0, -0.05); lui.verre.visible = false;
      lui.bras[1].rotation.set(0, 0, 2.15 - th * 0.4); lui.bras[0].rotation.set(0.2, 0, 0.15);
      lui.tete.rotation.set(-0.25, -0.5, 0);
    }
    function regardeLui() { // depuis la terrasse, il la suit des yeux et réagit
      if (modeLui !== 'terrasse' || !J) return;
      var dx = J.position.x - lui.groupe.position.x, dz = J.position.z - lui.groupe.position.z;
      lui.tete.rotation.y = AV.lerp(lui.tete.rotation.y, borne(Math.atan2(dx, dz), -1.1, 1.1), 0.1);
    }

    // ---------- Le jeu d'équilibre (chaque image) ----------
    function piloteSlack(dt, e, appui, joueur, camera, x) {
      J = joueur; x = x || {};
      if (!api) return;
      tEtat += dt; tTotal += dt; if (parole) parole.t -= dt;
      var diff = Math.max(0.45, 1 - 0.12 * nChutes) * (aide ? 0.55 : 1);
      if (etat === 'monte') {
        var k = lisse(0, 0.7, tEtat);
        majLigne(s, true, 0);
        var pr = J.parts;
        J.groupe.rotation.order = 'YXZ'; J.groupe.rotation.set(0, Math.PI / 2, 0);
        J.position.set(P.x, AV.lerp(sol(P.x, P.z - 0.6), P.y, k), AV.lerp(P.z - 0.6, P.z, k));
        pr.jambeG.rotation.set(-0.8 * Math.sin(k * Math.PI), 0, 0); pr.brasG.rotation.set(0, 0, -1.45 * k); pr.brasD.rotation.set(0, 0, 1.45 * k);
        if (aide) poseLuiAide(dt, 0);
        if (tEtat > 0.75) { etat = 'equilibre'; tEtat = 0; sousTitre(); }
        cameraVers(camera, cP.set(P.x - 3.4, P.y + 1.8, P.z + 0.9), cL.set(P.x + 2.5, P.y + 0.9, P.z), dt, tEtat < 0.1 ? 0 : 4);
      } else if (etat === 'equilibre') {
        grace -= dt;
        if (x.action) { descendre(); return; }
        var av = e.y > 0.25 ? e.y : 0, rec = e.y < -0.25 ? -e.y : 0, vit = av * 0.6 - rec * 0.35;
        var s0 = s; s = borne(s + vit * dt, 0.6, LEN - 0.6);
        var avant = phase; phase += dt * Math.abs(s - s0) / Math.max(dt, 1e-4) * 9;
        if (Math.floor(avant / Math.PI) !== Math.floor(phase / Math.PI)) { om += (Math.random() - 0.5) * 0.36 * diff; AV.audio.pas('bois'); }
        var bouge = Math.min(1, Math.abs(vit) / 0.5);
        var pert = grace > 0 ? 0 : (Math.sin(tTotal * 1.7 + p1) + 0.7 * Math.sin(tTotal * 3.1 + p2) + 0.4 * Math.sin(tTotal * 5.3)) * (0.35 + 0.6 * bouge) * diff;
        var Gv = (2.0 + 0.8 * diff) * (grace > 0 ? 0.3 : 1);
        var acc = Gv * Math.sin(th) + pert - e.x * 3.6 - om * 1.6 - (aide ? th * 2.2 : 0);
        om += acc * dt; th += om * dt;
        off = AV.lerp(off, -th * 0.16 + Math.sin(tTotal * 2.1) * 0.015 * bouge, Math.min(1, dt * 6));
        majLigne(s, true, off);
        poseLigne(dt, bouge);
        if (aide) poseLuiAide(dt, vit);
        if (s > meilleur) { var m0 = meilleur; meilleur = s; if (Math.floor(m0 / 2.5) !== Math.floor(s / 2.5)) sousTitre(); }
        // encouragements
        tCri -= dt;
        if (tCri <= 0) { tCri = 7 + Math.random() * 4; dire('<b>' + nomLui + ' :</b> ' + auHasard(aide ? ['Je te tiens, t\'inquiète ❤', 'Doucement… voilà !', 'T\'es trop forte 😍'] : ['Allez ! Tu gères 💪', 'Regarde l\'arbre au bout, pas tes pieds !', 'Respire… 😌', 'Plie un peu les genoux !', 'Waouh, la funambule ! 🤩']), 2.4); }
        if (!repliques.moitie && s > LEN / 2) { repliques.moitie = true; dire('<b>' + nomLui + ' :</b> À mi-chemin ! 🎉', 2.2); if (modeLui === 'terrasse') AV.audio.bravo(); }
        if (Math.abs(th) > 0.62) chuter();
        else if (s >= LEN - 0.6) arriver();
        cameraVers(camera, cP.set(P.x - 3.4, P.y + 1.8, P.z + 0.9), cL.set(P.x + 2.5, P.y + 0.9, P.z), dt, 4);
      } else if (etat === 'chute') {
        var kc = lisse(0, 0.55, tEtat), pr2 = J.parts;
        th = cote * AV.lerp(0.62, 1.45, kc);
        majLigne(s, kc < 0.3, off * (1 - kc));
        J.position.set(depart.x, AV.lerp(depart.y, sol(depart.x, depart.z + cote * 0.8) + 0.15, kc), depart.z + cote * 0.8 * kc);
        J.groupe.rotation.set(0, Math.PI / 2, th);
        pr2.brasG.rotation.set(-2.2 * kc, 0, -1.2); pr2.brasD.rotation.set(-2.2 * kc, 0, 1.2); pr2.jambeG.rotation.set(-0.6 * kc, 0, 0);
        if (aide) poseLuiAide(dt, 0);
        else if (modeLui === 'terrasse') lui.corps.rotation.z = Math.sin(tTotal * 25) * 0.04 * (tEtat < 1.8 ? 1 : 0); // il rigole
        if (tEtat > 2.2) {
          nChutes++;
          fonduPuis(function () {
            if (nChutes >= 3 && !aide) { aide = true; modeLui = 'aide'; lui.corps.rotation.set(0, 0, 0); dire('🤝 ' + nomLui + ' est descendu te tenir la main ❤', 3.5); }
            else dire(auHasard(['On remonte ! La ligne est un peu plus calme maintenant 😉', 'Allez, encore un essai 💪', 'Tu y étais presque !']), 2.5);
            if (modeLui === 'terrasse') luiAssis();
            monter();
          });
        }
        cameraVers(camera, cP.set(depart.x - 3.6, depart.y + 1.6, depart.z + 1.2), cL.set(depart.x, depart.y - 0.2, depart.z + cote * 0.4), dt, 3);
      } else if (etat === 'arrivee') {
        var ka = lisse(0, 0.8, tEtat), pr3 = J.parts;
        majLigne(s, ka < 0.4, 0);
        var gx = LB.x - 1.7, gz = LB.z - 1.8;
        J.position.set(AV.lerp(depart.x, gx, ka), AV.lerp(depart.y, sol(gx, gz), ka) + Math.sin(ka * Math.PI) * 0.5, AV.lerp(depart.z, gz, ka));
        J.groupe.rotation.set(0, Math.PI / 2 + ka * 0.6, 0);
        pr3.brasG.rotation.set(0, 0, -2.7 - Math.sin(tTotal * 8) * 0.15 * ka); pr3.brasD.rotation.set(0, 0, 2.7 + Math.sin(tTotal * 8) * 0.15 * ka);
        pr3.jambeG.rotation.set(0, 0, 0); pr3.jambeD.rotation.set(0, 0, 0); pr3.corps.rotation.set(0, 0, 0); pr3.tete.rotation.set(-0.2, 0, 0);
        J.ombre.position.set(J.position.x, sol(J.position.x, J.position.z) + 0.03, J.position.z);
        if (modeLui === 'terrasse') { lui.groupe.position.y = YD - 0.28 + Math.abs(Math.sin(tTotal * 6)) * 0.15; lui.bras[0].rotation.set(-2.8, 0, 0.2); lui.bras[1].rotation.set(-2.8, 0, -0.2); }
        if (tEtat > 2.4) fonduPuis(function () { etat = 'final'; tEtat = 0; herP.copy(J.position); aCam = 0; modeLui = 'final'; sousTitre(); });
        cameraVers(camera, cP.set(gx - 4, sol(gx, gz) + 2.2, gz + 3), cL.set(gx, sol(gx, gz) + 1, gz), dt, 2);
      } else if (etat === 'final' || etat === 'fini') {
        majFinal(dt, camera);
      } else if (etat === 'transition') { camera.position.copy(camPos); camera.lookAt(camLook); }
      majCoeurs(dt);
      majUI();
    }
    function chuter() {
      etat = 'chute'; tEtat = 0; cote = th > 0 ? 1 : -1; depart.copy(P);
      AV.audio.impact(0.5); AV.audio.saut();
      if (modeLui === 'terrasse') dire('<b>' + nomLui + ' :</b> ' + auHasard(['Aïe ! 😂 Ça va ?', 'Joli plongeon ! 😄', 'Oups ! Dans l\'herbe 🌼', 'Hahaha… pardon 😅']), 2.4);
      else dire('<b>' + nomLui + ' :</b> Oups, je t\'ai pas assez tenue 😅', 2.4);
    }
    function arriver() {
      etat = 'arrivee'; tEtat = 0; depart.copy(P); meilleur = LEN;
      AV.audio.bravo(); AV.audio.ping(1); AV.confettis(60);
      dire('🎉 Tu as traversé toute la slackline !', 2.6);
      sousTitre();
    }

    // ---------- Final : il la rejoint, câlin ----------
    function majFinal(dt, camera) {
      var tF = tEtat, pr = J.parts;
      var dirx = 0.25, dirz = -1, dl = Math.sqrt(dirx * dirx + dirz * dirz); dirx /= dl; dirz /= dl;
      var dist = AV.lerp(1.6, 0.5, lisse(0.3, 1.6, tF));
      var px = herP.x + dirx * dist, pz = herP.z + dirz * dist;
      lui.groupe.position.set(px, sol(px, pz), pz);
      lui.groupe.rotation.set(0, Math.atan2(herP.x - px, herP.z - pz), 0);
      lui.verre.visible = false;
      var marche = tF > 0.3 && tF < 1.6 ? Math.sin(tF * 12) * 0.5 : 0;
      lui.jambes[0].rotation.set(marche, 0, 0); lui.jambes[1].rotation.set(-marche, 0, 0); lui.corps.rotation.set(0, 0, 0);
      var calin = lisse(1.4, 2.0, tF);
      lui.bras[0].rotation.set(AV.lerp(-0.2, -1.45, calin), 0, AV.lerp(0.15, 0.75, calin));
      lui.bras[1].rotation.set(AV.lerp(-0.2, -1.45, calin), 0, AV.lerp(-0.15, -0.75, calin));
      lui.tete.rotation.set(0.1 * calin, 0, 0.15 * calin);
      J.groupe.rotation.set(0, Math.atan2(px - herP.x, pz - herP.z), 0);
      J.position.set(herP.x, sol(herP.x, herP.z), herP.z);
      pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0); pr.corps.rotation.set(0, 0, -0.06 * calin); pr.corps.position.y = 0;
      pr.brasG.rotation.set(AV.lerp(0, -1.4, calin), 0, AV.lerp(-0.15, 0.7, calin)); pr.brasD.rotation.set(AV.lerp(0, -1.4, calin), 0, AV.lerp(0.15, -0.7, calin));
      pr.tete.rotation.set(0, 0, -0.2 * calin);
      J.ombre.position.set(herP.x, sol(herP.x, herP.z) + 0.03, herP.z); J.ombre.scale.setScalar(1);
      if (tF > 0.5 && !repliques.bravo) { repliques.bravo = true; dire('<b>' + nomLui + ' :</b> Ma funambule préférée ❤', 3); }
      if (tF > 2.2 && !repliques.pari) { repliques.pari = true; dire('<b>' + nomLui + ' :</b> Bon… j\'ai perdu mon pari. Voilà ton bisou 😘', 3.5); AV.audio.bisou(); }
      tCoeur -= dt;
      if (tF > 2.0 && tCoeur <= 0) {
        tCoeur = 0.35;
        var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.7 });
        cs.position.set((px + herP.x) / 2 + (Math.random() - 0.5) * 0.6, herP.y + 2.1, (pz + herP.z) / 2 + (Math.random() - 0.5) * 0.5);
        G.add(cs); coeurs.push({ s: cs, t: 0 });
      }
      if (tF > 6 && !fini) { fini = true; etat = 'fini'; sousTitre(); if (api) api.trouver(); }
      aCam += dt;
      var mx = (px + herP.x) / 2, mz = (pz + herP.z) / 2, my = sol(mx, mz);
      cameraVers(camera, cP.set(mx + Math.cos(2.3 + Math.sin(aCam * 0.25) * 0.45) * 5.5, my + 1.6, mz + Math.sin(2.3 + Math.sin(aCam * 0.25) * 0.45) * 5.5), cL.set(mx, my + 1.1, mz), dt, tF < 0.1 ? 0 : 2);
    }
    function majCoeurs(dt) {
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var c = coeurs[i]; c.t += dt; c.s.position.y += dt * 0.6; c.s.position.x += Math.sin(c.t * 3 + i) * dt * 0.15;
        c.s.material.opacity = Math.max(0, 1 - c.t / 2.4);
        if (c.t > 2.4) { G.remove(c.s); AV.detruire(c.s); coeurs.splice(i, 1); }
      }
    }

    // ---------- Animations permanentes ----------
    mo.anime(function (dt, t) {
      fumees.forEach(function (f) {
        f.t += dt; var k = (f.t % 6) / 6;
        f.s.position.set(3.2 + k * 2.5 + Math.sin(t * 0.7 + f.t) * 0.3, YD + 7 + k * 7, -10 + k * 1.2);
        var sc = 0.8 + k * 2.6; f.s.scale.set(sc, sc, 1); f.s.material.opacity = 0.38 * (1 - k);
      });
      if (etat === 'marche') { regardeLui(); lui.bras[1].rotation.x = -1.2 + Math.max(0, Math.sin(t * 0.25)) * -0.6; } // il sirote
      else if (etat === 'equilibre' || etat === 'monte') regardeLui();
    });
    mo.surCamera = function (camera) {
      cielM.position.copy(camera.position);
      soleilH.position.copy(camera.position).addScaledVector(dirS, 1800);
      if (etat === 'marche') { camPos.copy(camera.position); camera.getWorldDirection(camLook); camLook.multiplyScalar(5).add(camera.position); }
    };
    mo.debut = function (a) { api = a; construireUI(); sousTitre(); dire('🏔️ Le chalet de Camprieu… ' + nomLui + ' sirote un verre sur la terrasse', 4); };
    mo.nettoyer = function () {
      if (etat === 'transition') { var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir'); }
      etat = 'parti'; mo.pilote = null;
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui); ui = null;
      if (J) {
        var pr = J.parts;
        J.groupe.rotation.order = 'XYZ'; J.groupe.rotation.set(0, 0, 0);
        pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15);
        pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
        pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0);
        J.ombre.scale.setScalar(1);
      }
    };
    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, tEtat: Math.round(tEtat * 10) / 10, s: Math.round(s * 100) / 100, th: Math.round(th * 100) / 100, om: Math.round(om * 100) / 100, chutes: nChutes, aide: aide, meilleur: Math.round(meilleur * 10) / 10 }; },
      monter: monter,
      presque: function () { s = LEN - 1.2; },
      chutes: function (n) { nChutes = n; },
      H: H
    };
    return mo;
  };
})(window.AV);
