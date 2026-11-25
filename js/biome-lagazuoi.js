/* Biome « lagazuoi » : le sommet du Lagazuoi (2752 m, Dolomites), un après-midi d'automne.
   On sort du téléphérique, le refuge et sa terrasse (transats, krapfen), la croix du sommet, la longue-vue,
   le panneau du sentier des Kaiserjäger, l'entrée des galeries de la Grande Guerre.
   Panorama : Tofana di Rozes, Cinque Torri, Averau, Pelmo, Civetta, Marmolada, Sella, Conturines…
   Loulou, la mini loutre en peluche, a chipé un krapfen à la vitrine du refuge et se cache pour le manger.
   La serveuse montre les traces de sucre glace ; une fois trouvée, Loulou offre un krapfen (récompense « krapfen »).
   Nord = -z, est = +x. y = 0 : le replat du refuge. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var DEG = Math.PI / 180;
  var CIEL = { haut: '#2a5fb5', bas: '#d3e0ef', brouillard: '#c6d5e8', hemi: ['#e6eefc', '#7a705e', 0.72], soleil: ['#fff4e2', 0.85, [-0.28, 0.6, 0.75]] };
  var YD = 0.5;                                  // plancher de la terrasse
  var CROIX = { x: 6, z: -24.5 }, TEL = { x: 10.5, z: -22.3 }, KJ = { x: 14.5, z: -6.5 }, TUN = { x: -23, z: -6.6 };
  var KIOSQUE = { x: -1, z: 1.0 };
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function pAz(az, d) { return { x: Math.sin(az * DEG) * d, z: -Math.cos(az * DEG) * d }; }
  function distRect(x, z, x0, x1, z0, z1) { var dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); return Math.sqrt(dx * dx + dz * dz); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Les massifs (distances compressées) ----------
  var BASE = -690;
  function M(nom, az, d, rx, rz, top, type, o) {
    o = o || {}; var p = o.centre || pAz(az, d);
    return { nom: nom, x: p.x, z: p.z, rx: rx, rz: rz, top: top, type: type, rot: o.rot != null ? o.rot : az * DEG, g: (az * 7.13 + d * 0.0137) % 6.28, glacier: !!o.glacier, etiquette: o.etiquette !== false && nom };
  }
  var MASSIFS = [
    M('Lagazuoi', 0, 0, 420, 260, 35, 'mesa', { centre: { x: 0, z: -200 }, rot: 0, etiquette: false }),
    M('Lagazuoi Grande', 345, 950, 320, 240, 60, 'mesa'),
    M('Conturines', 30, 2700, 650, 450, 290, 'tofana'),
    M('Lavarella', 48, 3000, 450, 400, 270, 'pic'),
    M('Sas dla Crusc', 358, 3600, 1100, 300, 140, 'mesa'),
    M('Fanes', 20, 1900, 900, 700, -260, 'dome', { etiquette: false }),
    M('Tofana di Rozes', 108, 1800, 650, 520, 450, 'tofana', { rot: 0.5 }),
    M('Tofana di Mezzo', 92, 2900, 550, 500, 470, 'pic'),
    M('Col dei Bos', 128, 950, 240, 200, -300, 'mesa', { etiquette: false }),
    M('Cinque Torri', 150, 2300, 380, 300, -480, 'dome'),
    M('Averau', 170, 2000, 300, 260, -100, 'mesa'),
    M('Nuvolau', 160, 2350, 300, 260, -190, 'dome'),
    M('Monte Pelmo', 163, 4500, 750, 650, 380, 'tofana'),
    M('Civetta', 190, 5000, 1400, 380, 420, 'pic'),
    M('Marmolada', 232, 3900, 1300, 520, 560, 'pic', { glacier: true }),
    M('Col di Lana', 245, 2100, 700, 500, -50, 'dome'),
    M('Settsass', 275, 1700, 500, 300, -80, 'mesa', { etiquette: false }),
    M('Gruppo del Sella', 283, 4300, 950, 800, 360, 'mesa'),
    M('Sassolungo', 290, 6500, 550, 450, 440, 'pic'),
    M('Sorapiss', 118, 4800, 1000, 380, 420, 'pic'),
    M('Antelao', 137, 6200, 700, 650, 520, 'pic'),
    M('Cristallo', 75, 4600, 750, 500, 420, 'pic'),
    M('Croda da Lago', 142, 3500, 700, 220, 30, 'pic', { etiquette: false }),
    M('Cernera', 195, 3000, 500, 400, 0, 'pic', { etiquette: false })
  ];
  (function () { // couronne de sommets à l'horizon
    var r = AV.rng(1616);
    for (var i = 0; i < 18; i++) MASSIFS.push(M('', i * 20 + r() * 12, 7500 + r() * 3000, 900 + r() * 700, 700 + r() * 500, 120 + r() * 300, r() < 0.5 ? 'pic' : 'mesa', { etiquette: false }));
  })();

  function tMassif(m, x, z) {
    var dx = x - m.x, dz = z - m.z, c = Math.cos(m.rot), s = Math.sin(m.rot);
    var lx = dx * c + dz * s, lz = -dx * s + dz * c;
    var a = Math.atan2(lz, lx);
    return { t: Math.sqrt((lx / m.rx) * (lx / m.rx) + (lz / m.rz) * (lz / m.rz)) * (1 + 0.08 * Math.sin(3 * a + m.g) + 0.05 * Math.sin(7 * a + 2 * m.g)), lx: lx, lz: lz };
  }
  function hMassif(m, x, z) {
    var q = tMassif(m, x, z), t = q.t;
    if (t >= 1.05) return -1e9;
    var A = m.top - BASE, core = 1 - lisse(0.68, 1, t), h;
    if (m.type === 'mesa') h = A * core * (1 - 0.25 * t * t);
    else if (m.type === 'tofana') h = A * (0.55 * core * (1 - 0.2 * t) + 0.45 * Math.pow(Math.max(0, 1 - t), 1.3));
    else if (m.type === 'pic') h = A * Math.pow(Math.max(0, 1 - t), 1.25) * (0.6 + 0.4 * core);
    else h = A * Math.exp(-t * t * 2.5);
    h += A * 0.05 * core * Math.sin(q.lx * 0.013 + m.g) * Math.cos(q.lz * 0.017 - m.g);
    return BASE + h;
  }
  function terrainLoin(x, z) {
    var r = Math.sqrt(x * x + z * z);
    var h = BASE + 45 * Math.sin(x * 0.0011) * Math.cos(z * 0.0013) + 25 * Math.sin(x * 0.003 + z * 0.002) + 80 * Math.sin(x * 0.0009 + 1) * Math.sin(z * 0.0008 - 2) + lisse(5000, 11000, r) * 300;
    for (var i = 0; i < MASSIFS.length; i++) { var v = hMassif(MASSIFS[i], x, z); if (v > h) h = v; }
    return h;
  }

  // ---------- Le replat du sommet ----------
  function Rb(th) { return 31 + 2.5 * Math.sin(3 * th + 1) + 1.8 * Math.sin(5 * th - 0.4) + 1.2 * Math.sin(8 * th + 2); }
  function replat(x, z) {
    var h = -0.035 * z;
    var dx = x - CROIX.x, dz = z - CROIX.z; h += 6.2 * Math.exp(-(dx * dx + dz * dz) / 128);
    h += 0.25 * Math.sin(x * 0.5 + z * 0.3) * Math.sin(z * 0.41 - x * 0.23) + 0.5 * Math.sin(x * 0.13 - 0.7) * Math.cos(z * 0.11 + 0.4);
    h = AV.lerp(h, 0, 1 - lisse(0, 5, distRect(x, z, -14, 5, -10, 8.5)));      // terre-plein du refuge
    h = AV.lerp(h, -0.6, 1 - lisse(0, 4, distRect(x, z, 0, 9, 19.5, 28)));     // gare du téléphérique
    return h;
  }
  function plateau(x, z) {
    var r = Math.sqrt(x * x + z * z), e = r - Rb(Math.atan2(z, x)), h = replat(x, z);
    if (e > 0) h -= e * e * 0.35 + e * 1.5;
    return h;
  }
  function sol(x, z) {
    var r2 = x * x + z * z;
    if (r2 < 24 * 24) return replat(x, z);
    var p = r2 < 110 * 110 ? plateau(x, z) : -1e9;
    if (p > 2) return p;
    return Math.max(p, terrainLoin(x, z));
  }
  function surTerrasse(x, z) { return x >= -13 && x <= 4 && z >= 0.5 && z <= 7.5; }
  function H(x, z) {
    var h = sol(x, z);
    if (surTerrasse(x, z)) h = Math.max(h, YD);
    if (x > 4 && x <= 5.2 && z >= 0.8 && z <= 4.4) h = Math.max(h, YD * 0.5); // la marche
    return h;
  }
  function autorise(x, z) { return Math.sqrt(x * x + z * z) < Rb(Math.atan2(z, x)) - 1.0; }

  // ---------- Couleurs ----------
  var CHEMINS = [
    [[4, 19], [4.5, 9], [4.8, 3]], [[5, 1], [8, -6], [12, -11], [7, -17], [9, -21], [6, -23]], [[8, -6], [14, -6.5]],
    [[-13.5, 1.5], [-18, -3], [-21.5, -6.6]], [[3, -9], [-4, -12], [-13, -10]]
  ];
  function surChemin(x, z, l) {
    for (var c = 0; c < CHEMINS.length; c++) {
      var P = CHEMINS[c];
      for (var i = 0; i < P.length - 1; i++) {
        var ax = P[i][0], az = P[i][1], bx = P[i + 1][0], bz = P[i + 1][1], vx = bx - ax, vz = bz - az;
        var k = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
        var ex = x - ax - vx * k, ez = z - az - vz * k;
        if (ex * ex + ez * ez < l * l) return true;
      }
    }
    return false;
  }
  var ROCHES = ['#b0a696', '#9c9283', '#b8a890', '#8f867b', '#ad9a82', '#a39b8e'];
  var MARMO = MASSIFS[14];
  function couleurSol(x, y, z, ny) {
    var r = Math.sqrt(x * x + z * z);
    if (r < 40 && y > -8) {
      if (r < 30 && surChemin(x, z, 0.85)) return varier('#bcb3a2', x, z, 0.06);
      var k = hash(Math.floor(x / 2.2), Math.floor(z / 2.2)), n = Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) + 0.5 * Math.sin(x * 0.5 - z * 0.4);
      if (ny < 0.75) return varier(ROCHES[Math.floor(k * 3)], x, z, 0.12);
      if (n > 0.7) return varier(k > 0.5 ? '#8c8350' : '#7a7748', x, z, 0.1);
      return varier(k > 0.7 ? '#9a9283' : k > 0.3 ? '#a59d8d' : '#aea595', x, z, 0.08);
    }
    if (MARMO && y > 180 && ny > 0.3 && tMassif(MARMO, x, z).t < 0.95) return varier('#eef3f7', x, z, 0.04);
    if (y > -400) {
      if (ny < 0.6) { var b = Math.floor((y + 1000 + 8 * Math.sin(x * 0.01 + z * 0.007)) / 26); return varier(ROCHES[((b % 6) + 6) % 6], x, z, 0.08); }
      return varier(y < -150 && ny > 0.8 ? '#9e9a66' : '#bfb6a4', x, z, 0.08);
    }
    if (ny < 0.5) return varier('#9d968a', x, z, 0.1);
    var f = Math.sin(x * 0.004 + 0.5) * Math.cos(z * 0.0035 - 1) + 0.6 * Math.sin(x * 0.011 - z * 0.009) + 0.5 * (hash(Math.floor(x / 60), Math.floor(z / 60)) - 0.5);
    if (f > 0.15) { var h2 = hash(Math.floor(x / 25), Math.floor(z / 25)); return varier(h2 > 0.62 ? '#b39a3c' : h2 > 0.5 ? '#a8863a' : '#34502c', x, z, 0.12); }
    return varier('#a3a060', x, z, 0.1);
  }

  // ---------- Maillage polaire : fin autour du sommet, de plus en plus large jusqu'à l'horizon ----------
  function terrainPolaire() {
    var NT = 256, R = [], r;
    for (r = 0; r < 48; r += 0.9) R.push(r);
    var r0 = R[R.length - 1] + 0.9, k = Math.pow(12500 / r0, 1 / 149);
    for (var i = 0; i < 150; i++) R.push(r0 * Math.pow(k, i));
    var NR = R.length, hs = new Float32Array(NR * NT), cs = new Float32Array(NT), sn = new Float32Array(NT);
    for (var j = 0; j < NT; j++) { cs[j] = Math.cos(j / NT * Math.PI * 2); sn[j] = Math.sin(j / NT * Math.PI * 2); }
    for (var a = 0; a < NR; a++) for (j = 0; j < NT; j++) hs[a * NT + j] = sol(R[a] * cs[j], R[a] * sn[j]);
    var pos = [], col = [];
    function pt(a, j) { j = j % NT; pos.push(R[a] * cs[j], hs[a * NT + j], R[a] * sn[j]); }
    for (a = 0; a < NR - 1; a++) for (j = 0; j < NT; j++) {
      if (a > 0) { pt(a, j); pt(a, j + 1); pt(a + 1, j); }
      pt(a, j + 1); pt(a + 1, j + 1); pt(a + 1, j);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    var pa = g.attributes.position, no = g.attributes.normal, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var mx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, mz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.copy(couleurSol(mx, my, mz, no.getY(f)));
      for (var q = 0; q < 3; q++) { cols[(f + q) * 3] = c.r; cols[(f + q) * 3 + 1] = c.g; cols[(f + q) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    return m;
  }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(F, l, h, p, col, x, y, z, ry, rx) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1, rx || 0); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  // panneau peint (texte sur une planche), visible des deux côtés
  function plaque(dessin, w, h, cw, ch) {
    var c = document.createElement('canvas'); c.width = cw || 512; c.height = ch || Math.round((cw || 512) * h / w);
    dessin(c.getContext('2d'), c.width, c.height);
    var tex = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.4 }));
    return m;
  }

  // ---------- Personnages (lui, randonneurs, serveuse) ----------
  function personne(o) {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var peau = o.peau || '#eec29a', jambes = [], bras = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.15, 0.8, 0.17, o.bas || '#2b2f38', 0, -0.4, 0));
      j.add(bm(0.17, 0.12, 0.28, o.chaussures || '#5a3e2b', 0, -0.79, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), o.haut || '#1d1f24'); t.position.y = 1.11; corps.add(t);
    if (o.robe) {
      var jupe = AV.maille(new THREE.CylinderGeometry(0.24, 0.4, 0.62, 10), o.robe); jupe.position.y = 0.68; corps.add(jupe);
      var tab = AV.maille(new THREE.BoxGeometry(0.34, 0.5, 0.04), o.tablier || '#c0392b'); tab.position.set(0, 0.66, 0.3); tab.rotation.x = -0.18; corps.add(tab);
      var cor = AV.maille(new THREE.CylinderGeometry(0.215, 0.235, 0.3, 8), o.corsage || '#2f5d3a'); cor.position.y = 1.0; corps.add(cor);
    }
    if (o.sac) { var s = AV.maille(new THREE.BoxGeometry(0.36, 0.48, 0.2), o.sac); s.position.set(0, 1.12, -0.28); corps.add(s); }
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), peau));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), o.cheveux || '#4a3426'); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    if (o.longs) { var cl = AV.maille(new THREE.BoxGeometry(0.32, 0.42, 0.1), o.cheveux); cl.position.set(0, -0.12, -0.13); tete.add(cl); }
    if (o.bonnet) { var bo = AV.maille(new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), o.bonnet); bo.position.y = 0.04; tete.add(bo); }
    if (o.lunettes) {
      var lu = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.04), new THREE.MeshLambertMaterial({ color: o.lunettes, emissive: o.lunettes, emissiveIntensity: 0.35 }));
      lu.position.set(0, 0.03, 0.155); tete.add(lu);
    } else {
      [-1, 1].forEach(function (c) { var oe = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); oe.position.set(c * 0.06, 0.0, 0.152); tete.add(oe); });
    }
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux || '#4a3426', chapeau: !!o.bonnet, lunettes: !!o.lunettes });
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.075, 0.07, 0.55, 6), o.manches || o.haut || '#1d1f24'); m.position.y = -0.28; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), peau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes };
  }

  AV.biomes = AV.biomes || {};
  AV.biomes.lagazuoi = function (cfg) {
    var rng = AV.rng(1616 + cfg.jour);
    var nomLui = cfg.copain || 'Axel', nom = cfg.nom || 'Loulou';
    var mo = new AV.Monde({
      rayon: 33, hauteur: H, surface: 'gravier', ciel: CIEL, brouillard: [350, 12500],
      depart: { x: 4, z: 19.2, angle: Math.PI }, theme: 'lagazuoi', ambiance: 'vent', autorise: autorise
    });
    mo.loin = 13500;
    mo.surfaceA = function (x, z) { return surTerrasse(x, z) || (x > 4 && x <= 5.2 && z >= 0.8 && z <= 4.4) ? 'bois' : 'gravier'; };
    var G = mo.groupe, col = mo.colliders;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    var soleilH = AV.halo('#fff2d0', 300); soleilH.material.fog = false; soleilH.material.opacity = 0.7; G.add(soleilH);
    var dirS = new THREE.Vector3(CIEL.soleil[2][0], CIEL.soleil[2][1], CIEL.soleil[2][2]).normalize();
    G.add(terrainPolaire());

    // ---------- Nuages et traînées d'avions ----------
    var Nu = new AV.Fusion();
    for (var cn = 0; cn < 10; cn++) {
      var ca = rng() * Math.PI * 2, cd = AV.entre(rng, 2200, 6500), cy = AV.entre(rng, 550, 1100), ct = AV.entre(rng, 120, 260);
      for (var ci = 0; ci < 8; ci++) forme(Nu, new THREE.IcosahedronGeometry(1, 1), '#ffffff', Math.cos(ca) * cd + AV.entre(rng, -ct, ct), cy + rng() * ct * 0.35, Math.sin(ca) * cd + AV.entre(rng, -ct * 0.6, ct * 0.6), rng() * 3, ct * AV.entre(rng, 0.4, 0.7), ct * AV.entre(rng, 0.3, 0.45), ct * AV.entre(rng, 0.4, 0.7));
    }
    G.add(Nu.maille(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#8f97a6', fog: false })));
    var matTr = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, fog: false, depthWrite: false, side: THREE.DoubleSide });
    for (var tr = 0; tr < 7; tr++) {
      var tm = new THREE.Mesh(new THREE.PlaneGeometry(9000, 22), matTr);
      tm.rotation.set(-Math.PI / 2, 0, rng() * Math.PI); tm.position.set(AV.entre(rng, -3000, 3000), AV.entre(rng, 2600, 3600), AV.entre(rng, -3000, 3000));
      G.add(tm);
    }

    // ---------- Cinque Torri, col Falzarego (routes, maisons), téléphérique ----------
    var Lo = new AV.Fusion();
    var c5 = pAz(150, 2300), y5 = terrainLoin(c5.x, c5.z) - 15;
    [[0, 0, 150, 70], [95, 30, 95, 45], [150, -25, 80, 40], [-75, 55, 70, 38], [45, 115, 60, 32]].forEach(function (t) {
      forme(Lo, new THREE.CylinderGeometry(t[3] * 0.4, t[3] * 0.55, t[2], 5), AV.choisir(rng, ['#c2b7a4', '#b3a996']), c5.x + t[0], y5 + t[2] / 2, c5.z + t[1], rng() * 3, 1, 1, 1);
    });
    var PASS = pAz(178, 1050); PASS.y = terrainLoin(PASS.x, PASS.z);
    for (var mi = 0; mi < 8; mi++) {
      var mx = PASS.x + AV.entre(rng, -110, 110), mz = PASS.z + AV.entre(rng, -50, 70), my = terrainLoin(mx, mz), mw = AV.entre(rng, 14, 26);
      forme(Lo, new THREE.BoxGeometry(mw, 9, mw * 0.7), '#e6dccb', mx, my + 4.5, mz, rng() * 3, 1, 1, 1);
      forme(Lo, new THREE.ConeGeometry(1, 1, 4), '#8a3b2b', mx, my + 11, mz, Math.PI / 4, mw * 0.75, 5, mw * 0.55);
    }
    var matRoute = new THREE.LineBasicMaterial({ color: '#d9d4ca' });
    [[[36, 1050], [200, 1100], [330, 1060], [420, 1150], [600, 1250], [800, 1240], [1000, 1400], [1300, 1500], [1700, 1650]],
     [[36, 1050], [-150, 1120], [-300, 1080], [-420, 1200], [-600, 1260], [-900, 1350], [-1300, 1420]],
     [[36, 1050], [-80, 900], [-140, 960], [-220, 830], [-300, 880], [-380, 720], [-520, 560], [-700, 420]]].forEach(function (R) {
      var pts = [];
      for (var i = 0; i < R.length - 1; i++) for (var s = 0; s < 8; s++) { var x = AV.lerp(R[i][0], R[i + 1][0], s / 8), z = AV.lerp(R[i][1], R[i + 1][1], s / 8); pts.push(new THREE.Vector3(x, terrainLoin(x, z) + 7, z)); }
      G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matRoute));
    });
    forme(Lo, new THREE.BoxGeometry(22, 12, 16), '#bdb8ae', PASS.x, PASS.y + 6, PASS.z + 10, 0, 1, 1, 1); // gare aval
    G.add(Lo.maille());

    // téléphérique : deux câbles, deux cabines (l'une monte quand l'autre descend)
    var GA = new THREE.Vector3(4, 4.6, 27.7), GB = new THREE.Vector3(PASS.x, PASS.y + 11, PASS.z + 4);
    function cable(s, dx, out) { out.lerpVectors(GA, GB, s); out.x += dx; out.y -= 45 * 4 * s * (1 - s); return out; }
    var matCable = new THREE.LineBasicMaterial({ color: '#3a3a3a' }), vc = new THREE.Vector3();
    [-1.6, 1.6].forEach(function (dx) { var pts = []; for (var i = 0; i <= 60; i++) pts.push(cable(i / 60, dx, new THREE.Vector3()).clone()); G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matCable)); });
    function cabine() {
      var g = new THREE.Group();
      g.add(bm(2.4, 2.2, 3.2, '#c62f2f', 0, -3.4, 0)); g.add(bm(2.45, 0.7, 3.25, '#bfe3f5', 0, -3.1, 0)); g.add(bm(2.5, 0.2, 3.3, '#7d7d7d', 0, -2.2, 0));
      g.add(bm(0.15, 2.0, 0.15, '#555', 0, -1.1, 0)); g.add(bm(0.5, 0.3, 1.4, '#444', 0, 0, 0));
      G.add(g); return g;
    }
    var cabA = cabine(), cabB = cabine(), tCab = 30;

    // ---------- Le refuge Lagazuoi ----------
    var R = new AV.Fusion(), pierre = '#9d968b', bois = '#8a5a35', boisF = '#5e3e26', planche = '#a8784e', volet = '#3d6b45';
    boite(R, 14, 3, 9, pierre, -5, 1.5, -4);
    boite(R, 14, 3.4, 9, bois, -5, 4.7, -4);
    for (var pl = 0; pl < 8; pl++) boite(R, 14.04, 0.05, 9.04, boisF, -5, 3.2 + pl * 0.42, -4);
    var tri = new THREE.Shape(); tri.moveTo(-4.5, 0); tri.lineTo(4.5, 0); tri.lineTo(0, 2.6); tri.lineTo(-4.5, 0);
    forme(R, new THREE.ExtrudeGeometry(tri, { depth: 13.9, bevelEnabled: false }), bois, -11.95, 6.4, -4, Math.PI / 2, 1, 1, 1);
    [-1, 1].forEach(function (s) { forme(R, new THREE.BoxGeometry(15.2, 0.3, 5.9), '#555a60', -5, 7.85, -4 + s * 2.3, 0, 1, 1, 1, s * 0.524, 0); });
    boite(R, 15.2, 0.3, 0.4, '#45494e', -5, 9.1, -4);
    boite(R, 1, 2.4, 1, pierre, -8, 9, -5.5);
    function fenetre(x, y, z, ry) { // fenêtre + volets, sur une façade d'orientation ry
      var c = Math.cos(ry), s = Math.sin(ry);
      boite(R, 1.0, 1.1, 0.12, '#2c3640', x, y, z, ry);
      [-1, 1].forEach(function (k) { boite(R, 0.5, 1.15, 0.08, volet, x + c * k * 0.78, y, z - s * k * 0.78, ry); });
    }
    [-10.5, -8, -2, 0.5].forEach(function (fx) { fenetre(fx, 1.7, 0.53, 0); });
    [-10.5, -8, -5, -2, 0.5].forEach(function (fx) { fenetre(fx, 4.6, 0.53, 0); });
    [-3, -6].forEach(function (fz) { fenetre(2.03, 4.6, fz, Math.PI / 2); fenetre(-12.03, 4.6, fz, Math.PI / 2); });
    fenetre(-5, 7.6, 0.4, 0);
    boite(R, 1.4, 2.3, 0.12, '#6b4a2e', -5, YD + 1.15, 0.53); boite(R, 1.2, 2.1, 0.14, '#9fc3d8', -5, YD + 1.1, 0.54); // porte vitrée
    // le kiosque à krapfen : guichet + rebord
    boite(R, 1.8, 1.2, 0.14, '#2a1d14', KIOSQUE.x, YD + 1.45, 0.53);
    boite(R, 2.1, 0.08, 0.5, planche, KIOSQUE.x, YD + 0.95, 0.75);
    boite(R, 2.2, 0.35, 0.3, '#b0402e', KIOSQUE.x, YD + 2.25, 0.62);
    boite(R, 0.9, 2.2, 0.12, '#6b4a2e', 1.4, YD + 1.1, 0.53); // porte cuisine (côté terrasse)
    // terrasse sur pilotis
    boite(R, 17, 0.2, 7, planche, -4.5, YD - 0.1, 4);
    for (var lp = 0; lp < 16; lp++) boite(R, 0.03, 0.01, 7, '#8a603c', -12.5 + lp * 1.07, YD + 0.005, 4);
    boite(R, 1.2, 0.25, 3.6, planche, 4.6, YD * 0.5 - 0.12, 2.6);
    function rambarde(x0, z0, x1, z1) {
      var dx = x1 - x0, dz = z1 - z0, l = Math.sqrt(dx * dx + dz * dz), nb = Math.max(1, Math.round(l / 1.2)), ang = Math.atan2(dx, dz);
      for (var i = 0; i <= nb; i++) boite(R, 0.1, 1.0, 0.1, boisF, x0 + dx * i / nb, YD + 0.5, z0 + dz * i / nb);
      forme(R, new THREE.BoxGeometry(0.12, 0.08, l), planche, (x0 + x1) / 2, YD + 1.0, (z0 + z1) / 2, ang, 1, 1, 1);
      forme(R, new THREE.BoxGeometry(0.05, 0.05, l), planche, (x0 + x1) / 2, YD + 0.5, (z0 + z1) / 2, ang, 1, 1, 1);
      col.push({ rect: true, x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.abs(dx) / 2 + 0.08, hz: Math.abs(dz) / 2 + 0.08, a: 0 });
    }
    rambarde(-13, 7.5, 4, 7.5); rambarde(-13, 2.6, -13, 7.5); rambarde(4, 4.6, 4, 7.5);
    // tables + bancs, parasols
    [-10.5, -6.5, -2.5].forEach(function (tx, i) {
      boite(R, 1.9, 0.08, 0.9, planche, tx, YD + 0.74, 3); [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(function (p) { boite(R, 0.08, 0.72, 0.08, boisF, tx + p[0], YD + 0.36, 3 + p[1]); });
      [-0.68, 0.68].forEach(function (o) { boite(R, 1.9, 0.07, 0.3, planche, tx, YD + 0.44, 3 + o); boite(R, 0.07, 0.44, 0.25, boisF, tx - 0.8, YD + 0.22, 3 + o); boite(R, 0.07, 0.44, 0.25, boisF, tx + 0.8, YD + 0.22, 3 + o); });
      col.push({ rect: true, x: tx, z: 3, hx: 0.98, hz: 0.85, a: 0 });
      if (i < 2) { forme(R, new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5), '#ddd', tx, YD + 1.2, 3, 0, 1, 1, 1); forme(R, new THREE.ConeGeometry(1.6, 0.6, 8), i ? '#c0392b' : '#f1e6cf', tx, YD + 2.55, 3, 0, 1, 1, 1); }
    });
    // transats alignés face aux Dolomites
    var TRANSATS = [];
    for (var ti = 0; ti < 10; ti++) {
      var tx2 = -12 + ti * 1.55, tz2 = 6.3, toile = ['#d94b3d', '#2f6fb3', '#e8b23a', '#3d8a5a'][ti % 4];
      boite(R, 0.62, 0.04, 0.85, toile, tx2, YD + 0.72, tz2 - 0.45, 0, 1.0);
      boite(R, 0.62, 0.04, 0.95, toile, tx2, YD + 0.33, tz2 + 0.3, 0, 0.22);
      [-0.3, 0.3].forEach(function (o) { boite(R, 0.04, 0.05, 1.7, boisF, tx2 + o, YD + 0.3, tz2, 0, 0.3); });
      col.push({ x: tx2, z: tz2, r: 0.45 }); TRANSATS.push({ x: tx2, z: tz2 });
    }
    // derrière : pile de transats pliés, tonneaux et caisses près de la cuisine, tas de bois
    for (var pt = 0; pt < 6; pt++) boite(R, 0.65, 0.06, 1.6, ['#d94b3d', '#2f6fb3', '#e8b23a'][pt % 3], -13.2, 0.75, -8 + pt * 0.12, 0, -1.25);
    col.push({ rect: true, x: -13.2, z: -7.7, hx: 0.45, hz: 0.6, a: 0 });
    [[3.1, -5.6], [3.9, -5.9], [3.4, -6.5]].forEach(function (b) { forme(R, new THREE.CylinderGeometry(0.33, 0.33, 0.9, 10), '#7a4e2c', b[0], 0.45, b[1], 0, 1, 1, 1); forme(R, new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10), '#555', b[0], 0.7, b[1], 0, 1, 1, 1); col.push({ x: b[0], z: b[1], r: 0.36 }); });
    boite(R, 0.8, 0.6, 0.6, '#b08a5a', 2.6, 0.3, -7.6); boite(R, 0.7, 0.5, 0.55, '#a07a4a', 2.65, 0.85, -7.6); col.push({ x: 2.6, z: -7.6, r: 0.5 });
    var refuge = R.maille(); refuge.castShadow = true; refuge.receiveShadow = true; G.add(refuge); mo.bloqueurs.push(refuge);
    col.push({ rect: true, x: -5, z: -4, hx: 7, hz: 4.5, a: 0 });
    // krapfen dans la vitrine du guichet (un manque !)
    for (var kv = 0; kv < 6; kv++) { if (kv === 3) continue; var kk = AV.krapfen(0.16); kk.position.set(KIOSQUE.x - 0.75 + kv * 0.3, YD + 1.04, 0.78); G.add(kk); }
    var enseigne = plaque(function (x, w, h) {
      x.fillStyle = '#f4ead6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5e3e26'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
      x.fillStyle = '#5e3e26'; x.textAlign = 'center'; x.font = '900 70px Nunito, sans-serif'; x.fillText('RIFUGIO LAGAZUOI', w / 2, 88); x.font = '700 46px Nunito, sans-serif'; x.fillText('2752 m', w / 2, 150);
    }, 5, 1.1, 1024, 225);
    enseigne.position.set(-5, 6.1, 0.58); G.add(enseigne);
    var ensK = plaque(function (x, w, h) { x.fillStyle = '#b0402e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 62px Nunito, sans-serif'; x.fillText('Krapfen 🍩', w / 2, 74); }, 2.1, 0.33, 512, 82);
    ensK.position.set(KIOSQUE.x, YD + 2.25, 0.78); G.add(ensK);

    // ---------- Gare du téléphérique, drapeau ----------
    var S = new AV.Fusion();
    boite(S, 8, 5.6, 6, '#bdb8ae', 4, 2.2, 24.5); boite(S, 8.4, 0.4, 6.4, '#8d8a84', 4, 5.2, 24.5);
    boite(S, 3, 2.4, 0.1, '#9fc3d8', 4, 1.0, 21.47); boite(S, 6, 0.5, 0.1, '#c62f2f', 4, 3.3, 21.45);
    boite(S, 5, 2.6, 0.2, '#2c2f36', 4, 3.6, 27.55);
    forme(S, new THREE.CylinderGeometry(0.07, 0.07, 7, 6), '#ddd', 6.6, 3.5, 8.6, 0, 1, 1, 1);
    var gare = S.maille(); gare.castShadow = true; G.add(gare); mo.bloqueurs.push(gare);
    col.push({ rect: true, x: 4, z: 24.5, hx: 4.1, hz: 3.1, a: 0 }, { x: 6.6, z: 8.6, r: 0.2 });
    var ensG = plaque(function (x, w, h) { x.fillStyle = '#c62f2f'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 52px Nunito, sans-serif'; x.fillText('FUNIVIA LAGAZUOI', w / 2, 66); }, 5.6, 0.5, 768, 92);
    ensG.position.set(4, 3.3, 21.38); ensG.rotation.y = Math.PI; G.add(ensG);
    var drap = plaque(function (x, w, h) { ['#1f8a4c', '#f7f7f2', '#cf2b37'].forEach(function (c, i) { x.fillStyle = c; x.fillRect(i * w / 3, 0, w / 3 + 1, h); }); }, 1.5, 1, 192, 128);
    drap.position.set(7.35, 6.4, 8.6); G.add(drap);

    // ---------- Croix du sommet, longue-vue, panneau Kaiserjäger, galerie ----------
    var D = new AV.Fusion(), yC = H(CROIX.x, CROIX.z);
    for (var cs = 0; cs < 9; cs++) forme(D, new THREE.DodecahedronGeometry(0.5, 0), AV.choisir(rng, ROCHES), CROIX.x + AV.entre(rng, -0.6, 0.6), yC + 0.2 + (cs > 5 ? 0.4 : 0), CROIX.z + AV.entre(rng, -0.6, 0.6), rng() * 3, 1, 0.6, 1);
    boite(D, 0.26, 5.4, 0.26, '#4a3a2c', CROIX.x, yC + 2.9, CROIX.z); boite(D, 2.4, 0.24, 0.24, '#4a3a2c', CROIX.x, yC + 4.2, CROIX.z);
    boite(D, 0.35, 0.3, 0.25, '#8a8f96', CROIX.x + 0.3, yC + 1.5, CROIX.z + 0.15);
    col.push({ x: CROIX.x, z: CROIX.z, r: 0.75 });
    var yT = H(TEL.x, TEL.z);
    forme(D, new THREE.CylinderGeometry(0.4, 0.45, 0.12, 12), '#c9ccd0', TEL.x, yT + 0.06, TEL.z, 0, 1, 1, 1);
    forme(D, new THREE.CylinderGeometry(0.11, 0.13, 1.3, 10), '#f2f2f2', TEL.x, yT + 0.7, TEL.z, 0, 1, 1, 1);
    ['#e23a5a', '#3a7bd5', '#ffd24a', '#3d8a5a'].forEach(function (c, i) { boite(D, 0.1, 0.1, 0.03, c, TEL.x + 0.08 * Math.cos(i * 1.6), yT + 0.5 + i * 0.17, TEL.z + 0.12); });
    boite(D, 0.28, 0.24, 0.5, '#8d939b', TEL.x, yT + 1.45, TEL.z, Math.atan2(0, 1) + 0.3);
    col.push({ x: TEL.x, z: TEL.z, r: 0.4 });
    var yK = H(KJ.x, KJ.z); boite(D, 0.14, 2.0, 0.14, '#6b4a2e', KJ.x, yK + 1.0, KJ.z); col.push({ x: KJ.x, z: KJ.z, r: 0.2 });
    var pan = plaque(function (x, w, h) {
      x.fillStyle = '#f3f0e8'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w - 70, 0); x.lineTo(w, h / 2); x.lineTo(w - 70, h); x.lineTo(0, h); x.fill();
      x.fillStyle = '#c0283a'; x.textAlign = 'center'; x.font = '700 50px Georgia, serif';
      ['Sentiero Dei Kaiserjäger', 'Kaiserjägersteig', 'Austrian Mountain Troop Path'].forEach(function (t, i) { x.fillText(t, w / 2 - 25, 62 + i * 58); });
    }, 2.4, 0.95, 820, 225);
    pan.position.set(KJ.x + 0.9, yK + 1.6, KJ.z + 0.1); G.add(pan);
    // l'entrée des galeries de la Grande Guerre, dans un rocher en bord de falaise
    var yG = H(TUN.x, TUN.z);
    [[-2.6, 0, 2.4, 3.6, 3.4], [-2.2, -2.6, 1.8, 2.6, 2.2], [-2.2, 2.6, 1.8, 2.8, 2.2], [-4.4, 0, 2.6, 4.2, 3.2]].forEach(function (r) { forme(D, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ROCHES), TUN.x + r[0], yG + r[3] * 0.4, TUN.z + r[1], rng() * 3, r[2], r[3], r[4]); });
    boite(D, 0.2, 2.3, 1.8, '#1b1714', TUN.x - 0.6, yG + 1.1, TUN.z);
    [-0.85, 0.85].forEach(function (o) { boite(D, 0.22, 2.3, 0.22, '#6b4a2e', TUN.x - 0.4, yG + 1.15, TUN.z + o); });
    boite(D, 0.26, 0.24, 2.1, '#6b4a2e', TUN.x - 0.4, yG + 2.35, TUN.z);
    col.push({ rect: true, x: TUN.x - 2.8, z: TUN.z, hx: 2.3, hz: 3.4, a: 0 });
    // cairns (« ometti »), dont celui où Loulou aime s'asseoir
    function cairn(x, z, n) { var y = H(x, z); for (var i = 0; i < n; i++) { var s = 0.36 - i * 0.05; forme(D, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ROCHES), x + AV.entre(rng, -0.04, 0.04), y + 0.12 + i * 0.2, z, rng() * 3, s * 1.2, 0.13, s); } col.push({ x: x, z: z, r: 0.4 }); }
    cairn(-3.5, -14.5, 4); cairn(11, -15, 5); cairn(-8, -18, 3); cairn(16, -1, 4); cairn(-18.5, 6, 3);
    // rochers calcaires
    var SPOTS0 = [[-10.5, 3], [-14.6, -9.6], [-3.5, -14.5], [-22.3, -6.6], [4.3, -7.2]];
    for (var rc = 0, essai = 0; rc < 70 && essai < 900; essai++) {
      var ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * 27, x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      if (rr > Rb(ang) - 1.5 || distRect(x, z, -15, 6, -10.5, 9) < 1 || distRect(x, z, -0.5, 9, 20, 29) < 1 || surChemin(x, z, 1.8)) continue;
      var loin = true; [[CROIX.x, CROIX.z], [TEL.x, TEL.z], [KJ.x, KJ.z], [TUN.x, TUN.z]].concat(SPOTS0).forEach(function (p) { if ((p[0] - x) * (p[0] - x) + (p[1] - z) * (p[1] - z) < 9) loin = false; });
      if (!loin) continue;
      var gros = rng() < 0.35, s2 = gros ? AV.entre(rng, 0.6, 1.3) : AV.entre(rng, 0.15, 0.4);
      forme(D, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ROCHES), x, H(x, z) + s2 * 0.3, z, rng() * 3, s2 * 1.2, s2 * 0.7, s2);
      if (gros) col.push({ x: x, z: z, r: s2 * 1.05 });
      rc++;
    }
    // garde-fou (piquets + câble) le long du bord
    var prec = null;
    for (var fa = 0; fa < Math.PI * 2 + 0.01; fa += 0.075) {
      if (fa > 3.3 && fa < 3.65) { prec = null; continue; } // pas devant la galerie
      var rf = Rb(fa) - 0.7, fx = Math.cos(fa) * rf, fz = Math.sin(fa) * rf, fy = sol(fx, fz);
      if (distRect(fx, fz, -0.5, 8.5, 21, 28) < 0.5) { prec = null; continue; }
      boite(D, 0.07, 1.0, 0.07, '#8d8d8d', fx, fy + 0.5, fz);
      if (prec) { var lx = fx - prec.x, lz = fz - prec.z, ly = fy - prec.y, ll = Math.sqrt(lx * lx + lz * lz + ly * ly); forme(D, new THREE.BoxGeometry(0.03, 0.03, ll), '#444', (fx + prec.x) / 2, (fy + prec.y) / 2 + 0.9, (fz + prec.z) / 2, Math.atan2(lx, lz), 1, 1, 1, -Math.atan2(ly, Math.sqrt(lx * lx + lz * lz)), 0); }
      prec = { x: fx, y: fy, z: fz };
    }
    var deco = D.maille(); deco.castShadow = true; deco.receiveShadow = true; G.add(deco);

    // ---------- Étiquettes des sommets (après la longue-vue) ----------
    var etiquettes = [];
    MASSIFS.forEach(function (m) {
      if (!m.etiquette) return;
      var d = Math.sqrt(m.x * m.x + m.z * m.z), s = AV.texteSprite(m.nom, { fond: 'rgba(27,35,64,.78)', largeur: 2, echelle: m.nom.length > 12 ? 0.24 : 0.32 });
      s.position.set(m.x, terrainLoin(m.x, m.z) + 60 + d * 0.03, m.z); s.scale.set(d * 0.09, d * 0.045, 1);
      s.material.opacity = 0; s.visible = false; G.add(s); etiquettes.push(s);
    });

    // ---------- Chocards (corneilles à bec jaune) qui tournent autour du refuge ----------
    var chocards = [];
    for (var ch = 0; ch < 7; ch++) {
      var cg = new THREE.Group();
      cg.add(bm(0.12, 0.12, 0.38, '#141414', 0, 0, 0)); var bec = bm(0.04, 0.04, 0.1, '#f2c12e', 0, 0, 0.23); cg.add(bec);
      var ailes = [-1, 1].map(function (c) { var a = new THREE.Group(); a.position.x = c * 0.05; a.add(bm(0.42, 0.02, 0.18, '#1d1d1d', c * 0.21, 0, 0)); cg.add(a); return a; });
      G.add(cg); chocards.push({ g: cg, ailes: ailes, r: AV.entre(rng, 8, 24), h: AV.entre(rng, 7, 18), v: AV.entre(rng, 0.15, 0.3) * (rng() < 0.5 ? -1 : 1), a0: rng() * 6.3, cx: AV.entre(rng, -8, 6), cz: AV.entre(rng, -10, 4) });
    }

    // ---------- Personnages ----------
    var lui = personne({ qui: 'axel', haut: '#17191d', bas: '#2b2f38', cheveux: '#5a3a24', lunettes: '#2f7fe0', sac: '#2a2d33' }); G.add(lui.groupe);
    var luiP = new THREE.Vector3(5.4, 0, 20.2), luiAng = Math.PI, luiPh = 0, modeLui = 'suit';
    var serveuse = personne({ haut: '#f7f3ea', manches: '#f7f3ea', robe: '#2f5d3a', tablier: '#b0402e', cheveux: '#c99a5b', longs: true, chaussures: '#2b2020' });
    serveuse.groupe.position.set(0.7, YD, 1.7); G.add(serveuse.groupe); col.push({ x: 0.7, z: 1.7, r: 0.35 });
    var plateauS = bm(0.5, 0.03, 0.35, '#8a8f96', 0, -0.62, 0.12); serveuse.bras[0].add(plateauS); serveuse.bras[0].rotation.x = -1.3;
    var rando = [];
    function randonneur(o, x, z, ry, pose) {
      var p = personne(o); p.groupe.position.set(x, H(x, z), z); p.groupe.rotation.y = ry; G.add(p.groupe); rando.push({ p: p, pose: pose, t0: rng() * 6 });
      if (pose === 'allonge') { p.groupe.rotation.x = -1.0; p.groupe.position.y = YD + 0.05; p.groupe.position.z += 0.4; p.bras[0].rotation.x = p.bras[1].rotation.x = -0.4; }
      else col.push({ x: x, z: z, r: 0.35 });
      if (pose === 'photo') { p.bras[0].rotation.x = p.bras[1].rotation.x = -1.5; p.bras[1].add(bm(0.08, 0.14, 0.02, '#222', 0, -0.62, 0.05)); }
      if (pose === 'victoire') p.bras[1].rotation.set(0, 0, 2.7);
      return p;
    }
    randonneur({ haut: '#c0392b', bas: '#3a3f4a', cheveux: '#2b1d14', sac: '#e8b23a' }, 4.4, -23.6, Math.PI * 0.85, 'victoire');
    randonneur({ haut: '#2f6fb3', bas: '#2b2f38', cheveux: '#d8b07a', longs: true, bonnet: '#e8b23a' }, 7.6, -23.2, Math.PI * 1.1, 'debout');
    randonneur({ haut: '#3d8a5a', bas: '#4a4a4a', cheveux: '#3a2a1c' }, 4.8, -19.6, Math.PI, 'photo');
    randonneur({ haut: '#7a4ea0', bas: '#2b2f38', cheveux: '#3a2a1c' }, TRANSATS[2].x, TRANSATS[2].z, 0, 'allonge');
    randonneur({ haut: '#e07a2a', bas: '#2b2f38', cheveux: '#c99a5b', longs: true }, TRANSATS[7].x, TRANSATS[7].z, 0, 'allonge');

    // ---------- Les cachettes de Loulou (+ chemin des traces de sucre depuis le guichet) ----------
    var SPOTS = [
      { id: 'table', x: -10.5, z: 3.0, y: 0, via: [[-6, 1.7], [-9.4, 1.9]], ang: 0 },
      { id: 'transats', x: -14.6, z: -9.6, y: 0, via: [[-6, 1.6], [-13.6, 1.5], [-14.6, -5]], ang: Math.PI },
      { id: 'cairn', x: -3.5, z: -14.5, y: 0.88, via: [[3.2, 1.4], [4.6, -9.4], [0.4, -12.6]], ang: Math.PI * 0.6 },
      { id: 'tunnel', x: -22.3, z: -6.6, y: 0, via: [[-6, 1.6], [-13.6, 1.5], [-18, -3.6]], ang: Math.PI / 2 },
      { id: 'tonneaux', x: 4.3, z: -7.2, y: 0, via: [[3.2, 1.4], [5.2, -3.2]], ang: Math.PI }
    ];
    SPOTS.forEach(function (s) { mo.cachettes.push({ x: s.x, z: s.z, y: s.y }); });
    var spot = SPOTS[0], loulou = null, traces = null;
    function construireTraces() {
      var F = new AV.Fusion(), pts = [[KIOSQUE.x, KIOSQUE.z]].concat(spot.via).concat([[spot.x, spot.z]]), longueur = 0, i;
      for (i = 0; i < pts.length - 1; i++) longueur += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      var fin = longueur - 2.4, s = 0.3, seg = 0, ds = 0, r2 = AV.rng(99);
      while (s < fin) {
        while (seg < pts.length - 2 && s > ds + Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1])) { ds += Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]); seg++; }
        var a = pts[seg], b = pts[seg + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = (s - ds) / L, x = AV.lerp(a[0], b[0], k), z = AV.lerp(a[1], b[1], k);
        for (var n = 0; n < 3; n++) {
          var px = x + AV.entre(r2, -0.25, 0.25), pz = z + AV.entre(r2, -0.25, 0.25), q = r2();
          var g = new THREE.CircleGeometry(q < 0.12 ? 0.07 : AV.entre(r2, 0.03, 0.06), 6); g.rotateX(-Math.PI / 2);
          forme(F, g, q < 0.06 ? '#e8782a' : q < 0.12 ? '#c7843f' : '#ffffff', px, H(px, pz) + 0.025, pz, 0, 1, 1, 1);
        }
        s += 0.55;
      }
      traces = F.maille(new THREE.MeshBasicMaterial({ vertexColors: true })); traces.visible = false; G.add(traces);
    }
    mo.surAnimal = function (a, c) {
      loulou = a;
      var best = 1e9; SPOTS.forEach(function (s) { var d = (s.x - c.x) * (s.x - c.x) + (s.z - c.z) * (s.z - c.z); if (d < best) { best = d; spot = s; } });
      a.placer(spot.x, H(spot.x, spot.z) + spot.y, spot.z, spot.ang);
      c.r = 0.35;
      construireTraces();
    };

    // ---------- État, dialogues ----------
    var api = null, parole = null, tLui = 14, indiceServeuse = false, tEtiq = 0, scen = null, coeurs = [];
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function sousTitre() {
      if (!api) return;
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, scen ? '🍩 ' + nom + ' est retrouvée !' : indiceServeuse ? '🧂 Suis les traces de sucre glace jusqu\'à ' + nom + '…' : (cfg.sousTitre || nom + ' a filé avec un krapfen…'));
    }
    var PAROLES_S = ['Ah, vous cherchez une petite loutre ? Elle est partie par là avec un krapfen… regardez le sucre glace par terre ! 🧂', 'Nos krapfen sont à la confiture d\'abricot, la spécialité du refuge 🍑', 'Suivez les traces blanches, elle ne doit pas être loin 😉'];
    var iS = 0;
    var itServ = { x: 0.7, z: 2.7, rayon: 1.9, texte: '🍩 ✋ Parler à la serveuse', fn: function () {
      itServ.texte = '<b>Serveuse :</b> ' + (indiceServeuse ? PAROLES_S[1 + (iS++ % 2)] : PAROLES_S[0]) + ' · ✋';
      if (!indiceServeuse) { indiceServeuse = true; if (traces) traces.visible = true; AV.audio.ping(1); sousTitre(); setTimeout(function () { dire('<b>' + nomLui + ' :</b> Du sucre glace partout… c\'est sûrement ' + nom + ' ! 😂', 3.5); }, 4000); }
      AV.audio.clic();
    } };
    var selfie = cfg.selfie || {};
    var itCroix = { x: CROIX.x, z: CROIX.z + 1.6, rayon: 2.4, texte: '📸 ✋ Selfie au sommet avec ' + nomLui, fn: function () {
      modeLui = 'selfie'; AV.audio.obturateur();
      var fl = document.createElement('div'); fl.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:4;pointer-events:none;opacity:.9;transition:opacity .6s'; document.body.appendChild(fl);
      setTimeout(function () { fl.style.opacity = '0'; }, 60); setTimeout(function () { if (fl.parentNode) fl.parentNode.removeChild(fl); }, 800);
      for (var c = 0; c < 5; c++) setTimeout(coeur, c * 140);
      setTimeout(function () {
        if (!selfie.fichiers || !selfie.fichiers.length) { modeLui = 'suit'; dire('<b>' + nomLui + ' :</b> Elle est trop belle celle-là ❤', 3); return; }
        AV.recompenses.ouvrir({ jour: cfg.jour, titre: selfie.titre || 'Au sommet du Lagazuoi ❤', surprise: { type: 'photo', fichiers: selfie.fichiers, texte: selfie.texte || '' } }, function () { AV.controles.vider(); modeLui = 'suit'; });
      }, 900);
    } };
    var pano = cfg.panorama || {};
    var itTel = { x: TEL.x, z: TEL.z + 1.0, rayon: 1.8, texte: '🔭 ✋ Regarder dans la longue-vue', fn: function () {
      function noms() { tEtiq = 45; dire('🏔️ Les sommets sont nommés tout autour : Tofana, Marmolada, Pelmo, Civetta…', 4); }
      if (pano.fichiers && pano.fichiers.length) AV.recompenses.ouvrir({ jour: cfg.jour, titre: pano.titre || 'La vue depuis le Lagazuoi 🔭', surprise: { type: 'photo', fichiers: pano.fichiers, texte: pano.texte || '' } }, function () { AV.controles.vider(); noms(); });
      else noms();
    } };
    // (le texte d'un interactif passe avant l'astuce : on affiche donc la réponse dans l'interactif lui-même)
    var itKJ = { x: KJ.x, z: KJ.z + 0.8, rayon: 1.8, texte: '🪧 ✋ Lire le panneau', fn: function () { itKJ.texte = '🪖 Le sentier des Kaiserjäger : les chasseurs alpins autrichiens l\'ont taillé dans la falaise pendant la Grande Guerre (1915-1917).'; AV.audio.clic(); } };
    var itTun = { x: TUN.x + 1.6, z: TUN.z, rayon: 2.0, texte: '🔦 ✋ Jeter un œil dans la galerie', fn: function () { visiterGalerie(); } };

    // ---------- La galerie de 1917 : un petit tunnel à la lampe torche ----------
    var GAL = new THREE.Group(); GAL.visible = false; G.add(GAL);
    (function () {
      var yG0 = H(TUN.x, TUN.z), L = 6.2, x0 = TUN.x - 0.72;
      var roc = new THREE.Mesh(new THREE.BoxGeometry(L, 2.3, 1.7, 8, 3, 3), new THREE.MeshLambertMaterial({ color: '#2a2622', side: THREE.BackSide, flatShading: true }));
      roc.receiveShadow = false;
      var pz = roc.geometry.attributes.position; for (var i = 0; i < pz.count; i++) { var s = Math.sin(i * 12.9898) * 43758.5453; pz.setXYZ(i, pz.getX(i), pz.getY(i) + (s - Math.floor(s) - 0.5) * 0.18, pz.getZ(i) + (Math.cos(i * 7.1) * 0.08)); }
      roc.geometry.computeVertexNormals();
      roc.position.set(x0 - L / 2, yG0 + 1.12, TUN.z); GAL.add(roc);
      for (var b = 0; b < 5; b++) { // cadres en bois
        var xb = x0 - 0.5 - b * 1.25;
        [-0.72, 0.72].forEach(function (o) { var p = bm(0.16, 2.1, 0.16, '#3a2716', xb, yG0 + 1.05, TUN.z + o); GAL.add(p); });
        GAL.add(bm(0.18, 0.16, 1.6, '#3a2716', xb, yG0 + 2.1, TUN.z));
      }
      GAL.add(bm(L, 0.04, 0.12, '#6a6a70', x0 - L / 2, yG0 + 0.03, TUN.z - 0.25)); GAL.add(bm(L, 0.04, 0.12, '#6a6a70', x0 - L / 2, yG0 + 0.03, TUN.z + 0.25)); // rails
      GAL.add(bm(0.7, 0.5, 0.6, '#6b4a2e', x0 - 3.3, yG0 + 0.25, TUN.z + 0.45)); GAL.add(bm(0.6, 0.4, 0.5, '#7a5634', x0 - 3.35, yG0 + 0.7, TUN.z + 0.45)); // caisses
      var casque = AV.maille(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#4c5a3e'); casque.position.set(x0 - 3.35, yG0 + 0.9, TUN.z + 0.45); GAL.add(casque);
      var bord = AV.maille(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 12), '#4c5a3e'); bord.position.set(x0 - 3.35, yG0 + 0.9, TUN.z + 0.45); GAL.add(bord);
      var lant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); lant.position.set(x0 - 5.4, yG0 + 1.5, TUN.z - 0.6); GAL.add(lant);
      var lumL = new THREE.PointLight('#ffb84a', 1.4, 5); lumL.position.copy(lant.position); GAL.add(lumL);
      var pan1917 = plaque(function (x, w, h) { x.fillStyle = '#3a2a1c'; x.fillRect(0, 0, w, h); x.fillStyle = '#f0e2c0'; x.textAlign = 'center'; x.font = '700 64px Georgia, serif'; x.fillText('GALLERIA · 1917', w / 2, h / 2 + 20); }, 1.4, 0.36, 600, 154);
      pan1917.position.set(x0 - 5.9, yG0 + 1.7, TUN.z); pan1917.rotation.y = Math.PI / 2; GAL.add(pan1917);
      GAL.userData = { x0: x0, y: yG0 };
    })();
    var torche = new THREE.SpotLight('#fff1d0', 2.2, 9, 0.42, 0.5, 1); torche.visible = false; G.add(torche); G.add(torche.target);
    var visite = null, vCam = new THREE.Vector3(), vVise = new THREE.Vector3();
    var MOTS_GAL = ['🔦 Brrr… il fait froid là-dedans 🥶', '🪖 Plus d\'un kilomètre de tunnels creusés à la main en 1917…', '🗣️ « Ohé ! » … ohé … ohé …', '🦦 Pas de ' + nom + ' ici… seulement un vieux casque ! (✋ pour ressortir)'];
    function visiterGalerie() {
      if (visite || scen) return;
      visite = { t: 0, k: -1 }; GAL.visible = true; torche.visible = true;
      itTun.__x = itTun.x; itTun.x = 1e6; AV.audio.clic();
      mo.pilote = piloteGalerie;
    }
    function sortirGalerie() {
      visite = null; GAL.visible = false; torche.visible = false; mo.pilote = null; itTun.x = itTun.__x;
      dire('<b>' + nomLui + ' :</b> Alors, c\'était flippant ? 😄', 3);
    }
    function piloteGalerie(dt, e, appui, joueur, camera) {
      var V = visite; if (!V) return; V.t += dt;
      var u = GAL.userData, T = V.t, k = lisse(0.2, 4.2, T), s = Math.sin(T * 1.3) * 0.12;
      if (V.sortie) k = 1 - lisse(V.sortie, V.sortie + 1.6, T);
      vCam.set(AV.lerp(TUN.x + 1.6, u.x0 - 2.6, k), u.y + 1.45 - k * 0.15, TUN.z + s * 0.4);
      vVise.set(u.x0 - 6, u.y + 1.1 + Math.sin(T * 0.9) * 0.15, TUN.z + s);
      camera.position.lerp(vCam, Math.min(1, dt * 4)); camera.lookAt(vVise);
      torche.position.copy(camera.position); torche.target.position.copy(vVise);
      var k2 = Math.min(MOTS_GAL.length - 1, Math.floor((T - 1.2) / 2.6));
      if (!V.sortie && k2 > V.k) { V.k = k2; dire(MOTS_GAL[k2], 3.2); if (k2 === 2) AV.audio.ping(0.4); }
      if (!V.sortie && ((appui && T > 1.5) || T > 13)) V.sortie = T;
      if (V.sortie && T > V.sortie + 1.7) sortirGalerie();
    }
    mo.interactifs.push(itServ, itCroix, itTel, itKJ, itTun);
    var LIGNES = ['Quelle vue… 😍', 'Regarde la Tofana, toute rayée !', 'J\'ai faim… un krapfen, ça te dit ? 🍩', 'Loulou ?! Loulouuu ! 🦦', 'Tu vois la Marmolada avec son glacier, là-bas ?', 'Les chocards ont l\'air de chercher des miettes eux aussi 🐦‍⬛'];
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (Math.abs(p.x - itServ.x) > 3 || Math.abs(p.z - itServ.z) > 3) itServ.texte = '🍩 ✋ Parler à la serveuse';
      if (Math.abs(p.x - itKJ.x) > 3 || Math.abs(p.z - itKJ.z) > 3) itKJ.texte = '🪧 ✋ Lire le panneau';
      var r = Math.sqrt(p.x * p.x + p.z * p.z);
      if (r > Rb(Math.atan2(p.z, p.x)) - 2.5) return '<b>' + nomLui + ' :</b> Pas trop près du bord… 😬';
      if (!indiceServeuse) return '🍩 ' + nom + ' a chipé un krapfen… demande à la serveuse sur la terrasse du refuge';
      return null;
    };

    // ---------- Lui qui suit (avec un peu de collision) ----------
    function pousser(p) {
      for (var i = 0; i < col.length; i++) {
        var c = col[i], dx = p.x - c.x, dz = p.z - c.z, R0 = 0.35;
        if (c.rect) {
          var qx = Math.max(-c.hx, Math.min(c.hx, dx)), qz = Math.max(-c.hz, Math.min(c.hz, dz)), ex = dx - qx, ez = dz - qz, d2 = ex * ex + ez * ez;
          if (d2 < R0 * R0) { if (d2 < 1e-6) { if (c.hx - Math.abs(dx) < c.hz - Math.abs(dz)) p.x = c.x + (dx < 0 ? -1 : 1) * (c.hx + R0); else p.z = c.z + (dz < 0 ? -1 : 1) * (c.hz + R0); } else { var d = Math.sqrt(d2), k = (R0 - d) / d; p.x += ex * k; p.z += ez * k; } }
        } else { var m = c.r + R0, dd = dx * dx + dz * dz; if (dd < m * m && dd > 1e-6) { var l = Math.sqrt(dd); p.x = c.x + dx / l * m; p.z = c.z + dz / l * m; } }
      }
    }
    function majLui(dt, t, J) {
      var v = 0, cible = null;
      if (modeLui === 'suit') cible = J;
      else if (modeLui === 'final' && scen) cible = scen.luiCible;
      if (cible) {
        var dx = cible.x - luiP.x, dz = cible.z - luiP.z, d = Math.sqrt(dx * dx + dz * dz), arret = modeLui === 'final' ? 0.05 : 1.9;
        if (modeLui === 'suit' && d > 12) { luiP.set(J.x - dx / d * 2, 0, J.z - dz / d * 2); d = 2; }
        if (d > arret) { v = Math.min(6.4, (d - arret + 0.3) * 2.4); luiP.x += dx / d * Math.min(d, v * dt); luiP.z += dz / d * Math.min(d, v * dt); if (modeLui === 'suit') pousser(luiP); luiAng = AV.angleLerp(luiAng, Math.atan2(dx, dz), Math.min(1, dt * 8)); }
        else if (modeLui === 'suit') luiAng = AV.angleLerp(luiAng, Math.atan2(dx, dz), Math.min(1, dt * 2));
        else luiAng = AV.angleLerp(luiAng, scen.luiRegard, Math.min(1, dt * 5));
      }
      luiP.y = H(luiP.x, luiP.z);
      lui.groupe.position.copy(luiP); lui.groupe.rotation.y = luiAng;
      var k = Math.min(1, v / 2.5); luiPh += dt * (4 + v * 1.6);
      lui.jambes[0].rotation.x = Math.sin(luiPh) * 0.8 * k; lui.jambes[1].rotation.x = -Math.sin(luiPh) * 0.8 * k;
      if (modeLui === 'selfie') { lui.bras[1].rotation.set(-2.6, 0, 0.3); lui.bras[0].rotation.set(0, 0, -0.9); }
      else if (modeLui === 'final' && scen && scen.t > 4.5) { lui.bras[0].rotation.set(0, 0, -0.9); lui.bras[1].rotation.set(-0.6, 0, 0); }
      else { lui.bras[0].rotation.set(-Math.sin(luiPh) * 0.7 * k, 0, -0.1); lui.bras[1].rotation.set(Math.sin(luiPh) * 0.7 * k, 0, 0.1); }
      lui.corps.position.y = Math.abs(Math.cos(luiPh)) * 0.06 * k;
    }
    function coeur(x, y, z) {
      var p = x != null ? new THREE.Vector3(x, y, z) : lui.groupe.position.clone().add(new THREE.Vector3(0, 2, 0));
      var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.7 });
      cs.position.set(p.x + (Math.random() - 0.5) * 0.6, p.y, p.z + (Math.random() - 0.5) * 0.6); G.add(cs); coeurs.push({ s: cs, t: 0 });
    }

    // ---------- Trouvée ! Loulou sursaute, croque, et tend un krapfen ----------
    var cadeauK = null;
    mo.surTrouve = function (ctx) {
      var a = ctx.animal, J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null, jp = ctx.joueur;
      a.etat = 'scene';
      var dx = jp.x - a.base.x, dz = jp.z - a.base.z, d = Math.sqrt(dx * dx + dz * dz) || 1; dx /= d; dz /= d;
      if (J) { J.angle = Math.atan2(-dx, -dz); J.groupe.rotation.y = J.angle; }
      var mx = (jp.x + a.base.x) / 2, mz = (jp.z + a.base.z) / 2, sx = -dz, sz = dx, sens = 1;
      if (!autorise(mx + sx * 5, mz + sz * 5) || distRect(mx + sx * 5, mz + sz * 5, -12.5, 2.5, -9, 1) < 0.5) sens = -1;
      var cx = mx + sx * 5 * sens, cz = mz + sz * 5 * sens;
      var cin = { pos: new THREE.Vector3(cx, Math.max(H(cx, cz) + 1.6, a.base.y + 2.2), cz), cible: new THREE.Vector3(mx, a.base.y + 0.5, mz), vitesse: 2, texte: '' };
      ctx.cinema(cin);
      scen = { ctx: ctx, cin: cin, t: 0, etape: 0, regard: Math.atan2(dx, dz), y0: a.base.y,
        luiCible: { x: jp.x - sx * 0.9 * sens + dx * 0.2, z: jp.z - sz * 0.9 * sens + dz * 0.2 }, luiRegard: Math.atan2(-dx, -dz) };
      modeLui = 'final';
      AV.audio.couinement(1); a.bulle(ctx.scene, '🦦 !!!', { vie: 1.2 });
      sousTitre();
    };
    function majScene(dt, t) {
      var S = scen, a = loulou; S.t += dt; var T = S.t, m = a.m;
      var g = a.groupe; g.rotation.y = AV.angleLerp(g.rotation.y, S.regard, Math.min(1, dt * 8));
      g.position.y = S.y0 + (T < 0.5 ? Math.sin(T / 0.5 * Math.PI) * 0.6 : 0);
      if (S.etape === 0 && T > 0.9) { S.etape = 1; a.bulle(S.ctx.scene, 'Oups… tu m\'as trouvée ! 🙈', { vie: 1.8, largeur: 2.8 }); S.cin.texte = '🦦 <b>' + nom + ' :</b> Oups… tu m\'as trouvée ! 🙈'; }
      if (S.etape === 1 && T > 2.1) { S.etape = 2; AV.audio.miam(1); a.bulle(S.ctx.scene, 'Miam… 😋', { vie: 1.3 }); S.cin.texte = '🦦 <b>' + nom + ' :</b> Miam… 😋'; }
      if (S.etape >= 2 && T < 3.4) { m.krapfen.scale.setScalar(Math.max(0.45, 1 - (T - 2.1) * 0.4)); m.krapfen.position.y = 0.36 + Math.max(0, Math.sin((T - 2.1) * 9)) * 0.1; }
      if (S.etape === 2 && T > 3.4) {
        S.etape = 3; m.krapfen.visible = false;
        cadeauK = AV.krapfen(0.34); cadeauK.position.set(0, 0.42, 0.34); cadeauK.rotation.x = 0.35; cadeauK.scale.setScalar(0.01); m.corps.add(cadeauK);
        AV.audio.ping(1); a.bulle(S.ctx.scene, '🍩 Je t\'en ai gardé un !', { vie: 2.4, largeur: 2.8 });
        S.cin.texte = '🦦 <b>' + nom + ' :</b> Celui-là, je te l\'ai gardé… tout chaud ! 🍩';
      }
      if (S.etape >= 3) {
        cadeauK.scale.setScalar(Math.min(1, (T - 3.4) * 2.5) * (1 + Math.sin(T * 6) * 0.04));
        m.pattes.forEach(function (p, i) { p.rotation.x = AV.lerp(p.rotation.x, -1.55, Math.min(1, dt * 6)); });
      }
      if (S.etape === 3 && T > 5.2) { S.etape = 4; S.cin.texte = '<b>' + nomLui + ' :</b> Le meilleur krapfen des Dolomites… avec la meilleure des deux ❤'; for (var c = 0; c < 6; c++) setTimeout(coeur, c * 160); AV.audio.bisou(); }
      if (S.etape === 4 && T > 7.4) { S.etape = 5; S.cin.texte = ''; S.ctx.cinema(null); S.ctx.fin(cfg); }
    }

    // ---------- Animations ----------
    mo.anime(function (dt, t, J) {
      if (parole) parole.t -= dt;
      majLui(dt, t, J);
      // il papote de temps en temps
      if (modeLui === 'suit' && !scen) { tLui -= dt; if (tLui <= 0) { tLui = 22 + Math.random() * 10; if (!parole || parole.t <= 0) dire('<b>' + nomLui + ' :</b> ' + auHasard(LIGNES), 3); } }
      // Loulou grignote son krapfen en cachette
      if (loulou && !scen && loulou.etat !== 'trouve') {
        var ph = (t % 2.6) / 2.6, lev = ph < 0.15 ? ph / 0.15 : ph < 0.5 ? 1 : ph < 0.65 ? 1 - (ph - 0.5) / 0.15 : 0;
        loulou.m.krapfen.position.y = 0.36 + lev * 0.16; loulou.m.krapfen.position.z = 0.24 + lev * 0.02;
        loulou.m.pattes.forEach(function (p) { p.rotation.x = -1.1 - lev * 0.5; });
      }
      if (scen && scen.etape < 5) majScene(dt, t);
      // serveuse : petit balancement, regarde vers la joueuse
      serveuse.tete.rotation.y = AV.lerp(serveuse.tete.rotation.y, Math.max(-1, Math.min(1, Math.atan2(J.x - 0.7, J.z - 1.7))), dt * 2);
      serveuse.corps.rotation.z = Math.sin(t * 1.3) * 0.02;
      rando.forEach(function (r) { r.p.tete.rotation.y = Math.sin(t * 0.4 + r.t0) * 0.5; if (r.pose === 'victoire') r.p.bras[1].rotation.z = 2.7 + Math.sin(t * 2 + r.t0) * 0.1; });
      // chocards
      chocards.forEach(function (c, i) {
        var a = c.a0 + t * c.v, x = c.cx + Math.cos(a) * c.r, z = c.cz + Math.sin(a) * c.r;
        c.g.position.set(x, c.h + Math.sin(t * 0.7 + i) * 1.5, z);
        c.g.rotation.set(0, Math.atan2(-Math.sin(a) * c.v, Math.cos(a) * c.v) + (c.v > 0 ? 0 : 0), c.v > 0 ? -0.3 : 0.3);
        c.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) * (c.v > 0 ? 1 : 1) + (c.v > 0 ? 0 : Math.PI);
        var bat = Math.sin(t * 3 + i * 2) > 0.3 ? Math.sin(t * 22 + i) * 0.6 : 0.08;
        c.ailes[0].rotation.z = bat; c.ailes[1].rotation.z = -bat;
      });
      // téléphérique : 70 s de trajet, 12 s d'arrêt à chaque gare
      tCab += dt; var cyc = tCab % 164, s;
      if (cyc < 70) s = lisse(0, 70, cyc); else if (cyc < 82) s = 1; else if (cyc < 152) s = 1 - lisse(82, 152, cyc); else s = 0;
      cable(s, -1.6, vc); cabA.position.copy(vc); cable(1 - s, 1.6, vc); cabB.position.copy(vc);
      cabA.rotation.y = cabB.rotation.y = Math.atan2(GB.x - GA.x, GB.z - GA.z);
      drap.rotation.y = Math.sin(t * 1.7) * 0.25;
      // étiquettes des sommets
      if (tEtiq > 0) tEtiq -= dt;
      etiquettes.forEach(function (e) { e.material.opacity = AV.lerp(e.material.opacity, tEtiq > 0 ? 0.95 : 0, Math.min(1, dt * 2)); e.visible = e.material.opacity > 0.02; });
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var c = coeurs[i]; c.t += dt; c.s.position.y += dt * 0.6; c.s.material.opacity = Math.max(0, 1 - c.t / 2.2);
        if (c.t > 2.2) { G.remove(c.s); AV.detruire(c.s); coeurs.splice(i, 1); }
      }
    });
    mo.surCamera = function (camera) {
      cielM.position.copy(camera.position);
      soleilH.position.copy(camera.position).addScaledVector(dirS, 1800);
    };
    mo.debut = function (a) { api = a; sousTitre(); dire('🚡 Arrivée au Lagazuoi, 2752 m… ' + nomLui + ' te suit. Mais où est passée ' + nom + ' ? 🦦', 4.5); };
    mo.nettoyer = function () { scen = null; modeLui = 'parti'; };
    mo.debug = {
      spot: function () { return spot.id; }, serveuse: function () { itServ.fn(); }, etiquettes: function () { tEtiq = 45; },
      selfie: function () { itCroix.fn(); }, longueVue: function () { itTel.fn(); },
      etat: function () { return { spot: spot.id, traces: !!(traces && traces.visible), scen: scen ? scen.etape : null, lui: modeLui }; }
    };
    return mo;
  };
  AV.biomes.lagazuoi.__H = H; // débogage
})(window.AV);
