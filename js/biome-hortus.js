/* Biome « hortus » : lever de soleil depuis les ruines du château de Viviourès, au bord de la falaise de l'Hortus.
   Elle et lui sont assis sur le vieux mur, face au Pic Saint-Loup ; dans la vallée, les vignes et Valflaunès.
   Elle fait décoller son drone : vue caméra du drone, 3 photos à prendre (dans l'ordre qu'on veut) :
     💑 une photo d'eux deux (il faut passer devant, côté falaise),
     🌄 le lever de soleil (il se lève à droite du Pic, il faut attendre qu'il sorte),
     🐐 une chèvre (elles sont cachées sur les pentes du Pic, on entend leurs clochettes).
   Commandes : joystick / ZQSD = avancer + tourner · glisser à droite / souris = orienter la caméra ·
   ⬆ ⬇ (Espace / C) = monter / descendre · 📸 (E) = photo.
   À la fin : le drone rentre, il la prend dans ses bras, et l'album des 3 photos s'ouvre (+ les fichiers de jours.js). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#16224a', bas: '#a77f97', brouillard: '#9c7f93', hemi: ['#ffd9c0', '#4a4a66', 0.7], soleil: ['#ffb27a', 0.95, [0.49, 0.25, -0.85]] };
  var VAL = -128, AZ = 120 * Math.PI / 180;
  var ECH_O = 0.76; // échelle d'Océane dans ce décor (assise : ~1,2 m contre ~1,4 m pour Axel)
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Le relief : Hortus (falaise à l'est), vallée de Valflaunès, Pic Saint-Loup en face, collines au loin ----------
  function vallee(x, z) { return VAL + 2 * Math.sin(x * 0.011) * Math.cos(z * 0.013) + 1.2 * Math.sin(x * 0.031 + z * 0.02); }
  function bord(x) { return -9 + 2.5 * Math.sin(x * 0.021) + 1.5 * Math.sin(x * 0.067 + 0.4); }
  function hortus(x, z) {
    var e = bord(x), dz = z - e, h;
    if (dz >= 0) {
      h = 0.5 * Math.sin(x * 0.05 + 1) * Math.cos(z * 0.045) + Math.max(0, dz - 6) * 0.05;
      if (dz < 2) h -= (2 - dz) * 0.6;
    } else {
      var d = -dz;
      h = d < 17 ? -1.2 - d * 7.0 + Math.sin(x * 0.7 + d) * 0.6 : -120.2 - (d - 17) * 0.35;
    }
    var fin = Math.max(lisse(260, 650, z), lisse(320, 620, x), lisse(650, 1000, -x));
    return AV.lerp(h, VAL - 12, fin);
  }
  // Le Pic Saint-Loup tel qu'on le voit depuis Viviourès (d'après les photos) : une longue crête orientée gauche-droite,
  // une grande barre de falaises calcaires sur la face tournée vers nous au-dessus de pentes couvertes de pins,
  // le sommet (croix) un peu à gauche du centre, une épaule rocheuse plus basse et plus lointaine à gauche,
  // et à droite une crête en dents de scie qui descend vers l'est (le soleil se lève juste à sa droite).
  // distances compressées mais proportions des photos : sommet ~6° au-dessus de l'horizon, crête large d'environ 40°
  var ZS = -900, SX = -60;                     // sommet du Pic (la croix)
  var CRETE = [[-900, -140], [-720, -60], [-600, 10], [-500, 38], [-420, 46], [-350, 66], [-290, 102], [-220, 116], [-150, 120], [-60, 125],
    [20, 121], [90, 113], [150, 97], [210, 79], [270, 64], [340, 31], [420, -30], [520, -100], [620, -140]];
  function picCrete(x) {
    var c = CRETE;
    if (x <= c[0][0]) return c[0][1];
    for (var i = 1; i < c.length; i++) if (x <= c[i][0]) { var t = (x - c[i - 1][0]) / (c[i][0] - c[i - 1][0]); t = t * t * (3 - 2 * t); return c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t; }
    return c[c.length - 1][1];
  }
  function picZ(x) { return ZS - Math.max(0, -250 - x) * 0.5 - Math.max(0, x - 150) * 0.2 + 10 * Math.sin(x * 0.008); }
  function picXr() { return SX; }
  // paramètres de la crête à l'abscisse x : hauteur c, hauteur de falaise cl, largeur de la falaise wc, pente du mur
  function picParam(x) {
    var c = picCrete(x);
    // dents de la crête est, petites bosses du plateau sommital
    c += x > 110 && x < 430 ? 7 * Math.pow(Math.max(0, Math.sin(x * 0.06)), 3) + 3 * Math.pow(Math.max(0, Math.sin(x * 0.17 + 1)), 4) : 0;
    c += 1.8 * Math.sin(x * 0.09) + 1.2 * Math.sin(x * 0.23 + 2);
    var relief = Math.max(0, c - VAL);
    var principal = lisse(-400, -260, x) * (1 - lisse(160, 330, x));
    var cl = relief * (0.16 + 0.24 * principal) + 6 * Math.sin(x * 0.031 + 1) + 3 * Math.sin(x * 0.083);
    cl = Math.max(3, cl);
    var pente = 6 + 1.5 * Math.sin(x * 0.05);
    return { c: c, cl: cl, pente: pente, wc: cl / pente };
  }
  function pic(x, z) {
    var p = picParam(x), d = z - picZ(x), h;                     // d > 0 : face tournée vers nous
    if (d >= 0) {
      h = d < p.wc ? p.c - d * p.pente : p.c - p.cl - (d - p.wc) * (0.5 + 0.1 * Math.sin(x * 0.015 + z * 0.01));
      if (d > p.wc) h += 2.5 * Math.sin(x * 0.06 + z * 0.05) * Math.sin(z * 0.035 - x * 0.03); // ravines dans la forêt
    } else {
      h = p.c - (-d) * (0.8 + 0.2 * Math.sin(x * 0.02));
    }
    return h;
  }
  // nature du sol sur le Pic : 'falaise' (le mur calcaire), 'crete' (dalles sommitales), 'eboulis', 'foret' ou null
  function picSol(x, y, z) {
    if (z > -560 || z < -1350 || y < VAL + 4) return null;
    if (pic(x, z) < Math.max(vallee(x, z), collines(x, z)) + 0.5) return null;
    var p = picParam(x), d = z - picZ(x);
    if (d >= -1 && d < p.wc + 1.5) return 'falaise';
    if (d < 0 && d > -14) return 'crete';
    if (d >= p.wc && d < p.wc + 9) return 'eboulis';
    return 'foret';
  }
  function collines(x, z) {
    var dd = Math.sqrt(x * x + z * z);
    if (dd < 800) return -1e9;
    var n = 0.5 + 0.5 * Math.sin(x * 0.0021 + 1) * Math.cos(z * 0.0017 + 0.5) * (0.7 + 0.3 * Math.sin(x * 0.006 + z * 0.004));
    var versSoleil = (x * 0.5 - z * 0.866) / dd, nord = -x / dd;
    var base = lisse(800, 2600, dd);
    return VAL + base * (50 + 150 * n) * (1 - 0.85 * lisse(0.5, 0.95, versSoleil)) + lisse(0.3, 0.9, nord) * base * 140;
  }
  function H(x, z) { return Math.max(vallee(x, z), hortus(x, z), pic(x, z), collines(x, z)); }

  function couleurSol(x, y, z, ny) {
    var ps = picSol(x, y, z);
    if (ps === 'falaise' || ps === 'crete') { // calcaire clair du Pic, strates horizontales, quelques buis accrochés
      var bp = Math.floor(y / 4.5), hp = hash(Math.floor(x / 9), bp);
      if (ps === 'crete' && hp > 0.55) return varier('#6f7a4c', x, z, 0.1);
      if (ps === 'falaise' && hp > 0.9) return varier('#7a8350', x, z, 0.1);
      return varier(bp % 3 === 0 ? '#cbc4b4' : hp < 0.2 ? '#b3ac9d' : '#e6dfcf', x, z, 0.05);
    }
    if (ps === 'eboulis') return varier(hash(Math.floor(x / 6), Math.floor(z / 6)) > 0.5 ? '#bdb6a6' : '#58693f', x, z, 0.08);
    if (ps === 'foret') { // pinède sombre, quelques clairières plus claires
      var kf = hash(Math.floor(x / 13), Math.floor(z / 13));
      return varier(kf > 0.88 ? '#6c7a4a' : kf > 0.45 ? '#3d5131' : '#33462b', x, z, 0.07);
    }
    if (ny < 0.5) { // falaises calcaires en strates, avec des touffes de garrigue accrochées
      var b = Math.floor(y / 3.5), hv = hash(Math.floor(x / 7), Math.floor(y / 5) + Math.floor(z / 7));
      if (hv > 0.6 && ny > 0.3) return varier(hv > 0.8 ? '#6a7646' : '#7c8452', x, z, 0.1);
      return varier(b % 2 ? '#e2dac6' : '#d0c6ae', x, z, 0.08);
    }
    var dd = Math.sqrt(x * x + z * z);
    if (y < VAL + 5 && dd < 1600) { // fond de vallée : vignes, champs, garrigue
      var r = hash(Math.floor((x + 5000) / 45), Math.floor((z + 5000) / 38));
      return varier(r < 0.4 ? '#8d8a45' : r < 0.6 ? '#b49a6e' : r < 0.8 ? '#9aa35a' : '#6d7843', x, z, 0.06);
    }
    if (ny < 0.78) return varier(hash(Math.floor(x / 9), Math.floor(z / 9)) > 0.62 ? '#bdb39e' : '#6e7748', x, z, 0.12);
    var k = hash(Math.floor(x / 14), Math.floor(z / 14));
    return varier(k > 0.78 ? '#cfc6b0' : k > 0.45 ? '#76804f' : '#848a58', x, z, 0.1);
  }
  // un morceau de terrain (centre, taille, subdivisions) ; « puits » enfonce la partie couverte par un terrain plus fin
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
  function texDisque() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.42, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  // ---------- Lui, assis (doudoune, bonnet) ----------
  function luiAssis() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); corps.add(j);
      j.add(bm(0.15, 0.8, 0.17, '#3a4a66', 0, -0.4, 0));
      j.add(bm(0.17, 0.1, 0.27, '#6b4a32', 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), '#2f5d7c'); t.position.y = 1.11; corps.add(t);
    [0.95, 1.15, 1.33].forEach(function (y) { var b = AV.maille(new THREE.TorusGeometry(0.225, 0.02, 4, 12), '#264c66', false); b.rotation.x = Math.PI / 2; b.position.y = y; corps.add(b); });
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var bon = AV.maille(new THREE.SphereGeometry(0.185, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), '#c8a050'); bon.position.y = 0.03; tete.add(bon);
    var rev = AV.maille(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 8), '#b38c40'); rev.position.y = 0.06; tete.add(rev);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.0, 0.152); tete.add(o); });
    var sourire = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); sourire.position.set(0, -0.06, 0.155); sourire.rotation.z = Math.PI; tete.add(sourire);
    AV.avatars.coiffer(tete, 'axel', { chapeau: true });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 6), '#2f5d7c'); m.position.y = -0.28; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes };
  }

  // ---------- Une chèvre ----------
  function chevre(robe, tache) {
    var g = new THREE.Group(), c = new THREE.Group(); g.add(c);
    c.add(bm(0.42, 0.42, 0.85, robe, 0, 0.62, 0));
    if (tache) c.add(bm(0.43, 0.2, 0.4, tache, 0, 0.72, -0.15));
    [[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]].forEach(function (p) { c.add(bm(0.09, 0.45, 0.09, robe, p[0], 0.22, p[1])); c.add(bm(0.095, 0.08, 0.1, '#2b2522', p[0], 0.03, p[1])); });
    var queue = bm(0.06, 0.18, 0.06, robe, 0, 0.86, -0.45); queue.rotation.x = -0.6; c.add(queue);
    var cou = new THREE.Group(); cou.position.set(0, 0.78, 0.38); c.add(cou);
    var col = bm(0.2, 0.36, 0.2, robe, 0, 0.12, 0.05); col.rotation.x = 0.5; cou.add(col);
    var tete = new THREE.Group(); tete.position.set(0, 0.3, 0.16); cou.add(tete);
    tete.add(bm(0.2, 0.22, 0.34, robe, 0, 0, 0.08));
    tete.add(bm(0.16, 0.14, 0.12, robe, 0, -0.04, 0.27));
    var barbe = AV.maille(new THREE.ConeGeometry(0.05, 0.16, 5), '#e8e2d4'); barbe.position.set(0, -0.16, 0.24); barbe.rotation.x = Math.PI; tete.add(barbe);
    [-1, 1].forEach(function (s) {
      var o = AV.maille(new THREE.SphereGeometry(0.022, 5, 4), '#1a1a1a', false); o.position.set(s * 0.1, 0.04, 0.14); tete.add(o);
      var or = bm(0.14, 0.05, 0.06, robe, s * 0.15, 0.04, 0.0); or.rotation.z = s * -0.4; tete.add(or);
      var corne = AV.maille(new THREE.TorusGeometry(0.13, 0.025, 4, 8, Math.PI * 0.75), '#8a7a62'); corne.position.set(s * 0.06, 0.12, -0.08); corne.rotation.set(0, Math.PI / 2, 0.4); tete.add(corne);
    });
    var cloche = AV.maille(new THREE.CylinderGeometry(0.03, 0.05, 0.07, 6), '#c9a24a'); cloche.position.set(0, -0.02, 0.12); cou.add(cloche);
    return { groupe: g, cou: cou };
  }

  // ---------- Le drone ----------
  function fabriquerDrone() {
    var g = new THREE.Group();
    g.add(bm(0.3, 0.09, 0.4, '#3a3f46', 0, 0, 0));
    g.add(bm(0.2, 0.05, 0.28, '#5a616b', 0, 0.065, 0.02));
    var cam = AV.maille(new THREE.SphereGeometry(0.05, 8, 6), '#111418'); cam.position.set(0, -0.05, -0.22); g.add(cam);
    var helices = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
      var bras = AV.maille(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 5), '#2b2f35'); bras.rotation.set(Math.PI / 2, 0, 0);
      var b = new THREE.Group(); b.rotation.y = Math.atan2(p[0], p[1]); b.add(bras); bras.position.z = 0.16; g.add(b);
      var moyeu = AV.maille(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), '#2b2f35'); moyeu.position.set(p[0] * 0.22, 0.03, p[1] * 0.22); g.add(moyeu);
      var h = new THREE.Group(); h.position.set(p[0] * 0.22, 0.06, p[1] * 0.22); g.add(h);
      h.add(bm(0.3, 0.006, 0.035, '#1c1f24', 0, 0, 0)); helices.push(h);
    });
    var ledR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), new THREE.MeshBasicMaterial({ color: '#ff3b3b' })); ledR.position.set(-0.15, -0.02, -0.2); g.add(ledR);
    var ledV = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), new THREE.MeshBasicMaterial({ color: '#3bff6a' })); ledV.position.set(0.15, -0.02, -0.2); g.add(ledV);
    [-1, 1].forEach(function (s) { g.add(bm(0.02, 0.08, 0.02, '#2b2f35', s * 0.1, -0.08, 0.1)); g.add(bm(0.02, 0.08, 0.02, '#2b2f35', s * 0.1, -0.08, -0.1)); g.add(bm(0.02, 0.02, 0.26, '#2b2f35', s * 0.1, -0.12, 0)); });
    g.scale.setScalar(1.5);
    return { groupe: g, helices: helices };
  }

  // =====================================================================
  AV.biomes.hortus = function (cfg) {
    var rng = AV.rng(8008 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 9999, hauteur: H, surface: 'herbe', ciel: CIEL, brouillard: [350, 5200],
      depart: { x: 0.3, z: -6, angle: Math.PI }, theme: 'hortus', ambiance: 'aube'
    });
    mo.loin = 6000;
    mo.sansAnimal = true;
    var G = mo.groupe;

    // ---------- Ciel de l'aube (dégradé + lueur autour du soleil) ----------
    var cielMat = new THREE.ShaderMaterial({
      uniforms: { haut: { value: new THREE.Color() }, bas: { value: new THREE.Color() }, lueur: { value: new THREE.Color() }, soleilDir: { value: new THREE.Vector3(0, 0, -1) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 haut; uniform vec3 bas; uniform vec3 lueur; uniform vec3 soleilDir; varying vec3 vP;',
        'void main(){ vec3 d = normalize(vP); float h = clamp(d.y * 1.8 + 0.05, 0.0, 1.0);',
        '  vec3 c = mix(bas, haut, pow(h, 0.55));',
        '  float s = max(dot(d, soleilDir), 0.0);',
        '  c += lueur * (pow(s, 5.0) * 0.55 + pow(s, 48.0) * 0.5) * (1.0 - h * 0.55);',
        '  gl_FragColor = vec4(c, 1.0); }'].join('\n'),
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    var cielM = new THREE.Mesh(new THREE.SphereGeometry(4600, 32, 16), cielMat); cielM.renderOrder = -10; cielM.frustumCulled = false; G.add(cielM);
    var etoiles = AV.etoiles(400, 4300); etoiles.material.transparent = true; G.add(etoiles);
    var texS = texDisque();
    var soleilS = new THREE.Sprite(new THREE.SpriteMaterial({ map: texS, color: '#ffd08a', fog: false, transparent: true, depthWrite: false }));
    soleilS.scale.set(150, 150, 1); G.add(soleilS);
    var soleilH = AV.halo('#ffb060', 900); soleilH.material.fog = false; G.add(soleilH);
    // nuages étirés près de l'horizon, roses à l'aube
    var nuages = [], matNuage = new THREE.MeshBasicMaterial({ color: '#e88a8f', fog: false, transparent: true, opacity: 0.6, depthWrite: false });
    for (var n = 0; n < 11; n++) {
      var az = (55 + rng() * 120) * Math.PI / 180, el = (2.5 + rng() * 6) * Math.PI / 180, dn = 3600;
      var nu = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), matNuage);
      nu.position.set(-Math.cos(az) * Math.cos(el) * dn, Math.sin(el) * dn, -Math.sin(az) * Math.cos(el) * dn);
      nu.scale.set(AV.entre(rng, 180, 420), AV.entre(rng, 14, 30), AV.entre(rng, 60, 120)); nu.lookAt(0, nu.position.y, 0);
      nu.renderOrder = -9; G.add(nu); nuages.push(nu);
    }

    // ---------- Terrain : trois niveaux de détail ----------
    G.add(terrainZone(0, -10, 240, 120, null));
    // le Pic en maillage fin (falaises nettes), le terrain moyen s'enfonce dessous
    G.add(terrainZone(-100, -880, 880, 170, null));
    var pProche = puitsDans(-120, 120, -130, 110, 20, 25), pPic = puitsDans(-540, 340, -1320, -440, 20, 25);
    G.add(terrainZone(0, -600, 1800, 140, function (x, z) { return Math.max(pProche(x, z), pPic(x, z)); }));
    G.add(terrainZone(0, -1000, 9000, 150, puitsDans(-900, 900, -1500, 300, 70, 45)));
    var sols = G.children.slice(-4);
    // brume dans la vallée, qui se dissipe avec le soleil
    var brume = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshBasicMaterial({ color: '#efe0ea', transparent: true, opacity: 0.25, depthWrite: false }));
    brume.rotation.x = -Math.PI / 2; brume.position.set(0, VAL + 4, -450); G.add(brume);

    // ---------- Végétation ----------
    var V = new AV.Fusion();
    function pente(x, z) { return Math.abs(H(x + 2, z) - H(x - 2, z)) + Math.abs(H(x, z + 2) - H(x, z - 2)); }
    for (var t = 0; t < 2300; t++) {
      var x, z, zone = rng();
      if (zone < 0.25) { x = AV.entre(rng, -260, 260); z = AV.entre(rng, -5, 260); if (x * x + (z - 2) * (z - 2) < 22 * 22) continue; } // plateau de l'Hortus
      else if (zone < 0.6) { x = AV.entre(rng, -560, 420); z = AV.entre(rng, -1150, -650); }                                           // le Pic
      else { x = AV.entre(rng, -500, 600); z = AV.entre(rng, -40, -360); }                                                           // la vallée
      var y = H(x, z), p = pente(x, z);
      if (p > 9) continue;
      var sorte = rng(), fond = y < VAL + 6;
      if (fond && rng() < 0.55) continue;
      if (sorte < (fond ? 0.25 : 0.3)) { // pin
        var hp = AV.entre(rng, 5, 9);
        forme(V, new THREE.CylinderGeometry(0.15, 0.26, hp, 5), '#5e4a3a', x, y + hp / 2, z, 0, 1, 1, 1, 0, (rng() - 0.5) * 0.2);
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#3f5a36', '#4a6640', '#38513a']), x, y + hp, z, rng() * 3, AV.entre(rng, 2, 3.4), AV.entre(rng, 1.3, 2), AV.entre(rng, 2, 3.4));
      } else if (fond && sorte < 0.4) { // cyprès / olivier
        if (rng() < 0.5) forme(V, new THREE.ConeGeometry(1, 1, 6), '#2f4a2e', x, y + 4, z, 0, 0.9, 8, 0.9);
        else { forme(V, new THREE.CylinderGeometry(0.2, 0.3, 1.6, 5), '#6a5a48', x, y + 0.8, z, 0, 1, 1, 1); forme(V, new THREE.IcosahedronGeometry(1, 0), '#8a9a6e', x, y + 2.1, z, rng() * 3, 2, 1.2, 2); }
      } else if (sorte < 0.85) { // chênes kermès, buis
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4f5e36', '#5e6e3e', '#6b7a46', '#56643a']), x, y + 0.4, z, rng() * 3, AV.entre(rng, 0.7, 2), AV.entre(rng, 0.5, 1.2), AV.entre(rng, 0.7, 2));
      } else { // rochers calcaires
        forme(V, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ['#d6cfbe', '#c8c0ac', '#e0d9c8']), x, y + 0.2, z, rng() * 3, AV.entre(rng, 0.6, 2.2), AV.entre(rng, 0.4, 1.2), AV.entre(rng, 0.6, 2));
      }
    }
    var vegM = V.maille(); vegM.castShadow = true; G.add(vegM);

    // ---------- Vignes et village de Valflaunès, château de Montferrand sur la crête du Pic ----------
    var Vi = new AV.Fusion();
    for (var pa = 0; pa < 60; pa++) {
      var px = AV.entre(rng, -320, 460), pz = AV.entre(rng, -60, -700);
      if (Math.abs(H(px, pz) - VAL) > 3 || pente(px, pz) > 1.5 || ((px - 110) * (px - 110) + (pz + 215) * (pz + 215) < 70 * 70)) continue;
      var ang = rng() * Math.PI, lg = AV.entre(rng, 25, 45), nb = Math.floor(AV.entre(rng, 8, 15));
      for (var rI = 0; rI < nb; rI++) {
        var off = (rI - nb / 2) * 2.4, rx = px + Math.cos(ang) * off, rz = pz - Math.sin(ang) * off;
        forme(Vi, new THREE.BoxGeometry(0.7, 0.9, lg), AV.choisir(rng, ['#8f8a3a', '#9a8f3e', '#a3893a']), rx, H(rx, rz) + 0.45, rz, ang, 1, 1, 1);
      }
    }
    var cVil = [110, -215];
    for (var m = 0; m < 30; m++) {
      var a2 = rng() * Math.PI * 2, d2 = Math.sqrt(rng()) * 42, hx = cVil[0] + Math.cos(a2) * d2, hz = cVil[1] + Math.sin(a2) * d2;
      var w = AV.entre(rng, 6, 11), dp = AV.entre(rng, 5, 8), hh = AV.entre(rng, 4, 7), ry = Math.round(rng() * 4) * Math.PI / 2 + 0.3, yb = H(hx, hz);
      forme(Vi, new THREE.BoxGeometry(w, hh, dp), AV.choisir(rng, ['#e8dcc4', '#ddd0b4', '#efe4cf', '#d8c8a8']), hx, yb + hh / 2, hz, ry, 1, 1, 1);
      forme(Vi, new THREE.ConeGeometry(1, 1, 4), AV.choisir(rng, ['#b8603e', '#c56a45', '#a9573a']), hx, yb + hh + 1.1, hz, ry + Math.PI / 4, w * 0.74, 2.2, dp * 0.74);
    }
    var yE = H(cVil[0], cVil[1]);
    forme(Vi, new THREE.BoxGeometry(8, 9, 16), '#d8ccb2', cVil[0], yE + 4.5, cVil[1], 0.3, 1, 1, 1);
    forme(Vi, new THREE.BoxGeometry(4, 18, 4), '#d0c4aa', cVil[0] + 3, yE + 9, cVil[1] - 9, 0.3, 1, 1, 1);
    forme(Vi, new THREE.ConeGeometry(1, 1, 4), '#a9573a', cVil[0] + 3, yE + 19.5, cVil[1] - 9, 0.3 + Math.PI / 4, 3.2, 3, 3.2);
    // ruines du château de Montferrand, sur la crête est
    var mfx = 250, mfz = picZ(250) - 6, mfy = H(mfx, mfz);
    forme(Vi, new THREE.BoxGeometry(7, 12, 7), '#c9bfa8', mfx, mfy + 5, mfz, 0.2, 1, 1, 1);
    forme(Vi, new THREE.BoxGeometry(14, 4, 2), '#c9bfa8', mfx + 6, mfy + 1.5, mfz + 3, 0.2, 1, 1, 1);
    // la croix et la chapelle au sommet du Pic
    var sx0 = picXr(), sz0 = picZ(sx0), sy0 = H(sx0, sz0);
    forme(Vi, new THREE.BoxGeometry(0.6, 7, 0.6), '#e8e4da', sx0, sy0 + 3, sz0, 0, 1, 1, 1);
    forme(Vi, new THREE.BoxGeometry(3.4, 0.6, 0.6), '#e8e4da', sx0, sy0 + 5, sz0, 0, 1, 1, 1);
    forme(Vi, new THREE.BoxGeometry(5, 4, 8), '#d8d0bc', sx0 + 6, H(sx0 + 6, sz0 - 12) + 1.5, sz0 - 12, 0, 1, 1, 1);
    G.add(Vi.maille());

    // ---------- Les ruines du château de Viviourès ----------
    var C = new AV.Fusion(), pierres = ['#cfc6b0', '#c4baa2', '#d8cfba', '#bcb29a'];
    var ySiege = H(0, -6) + 0.75;
    function mur(x0, z0, x1, z1, hMin, hMax, ep, trous) {
      var dx = x1 - x0, dz = z1 - z0, l = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(l / 1.1)), ang = Math.atan2(dx, dz);
      for (var i = 0; i < n; i++) {
        if (trous && rng() < trous) continue;
        var k = (i + 0.5) / n, x = x0 + dx * k, z = z0 + dz * k, y = H(x, z) - 0.3, h = AV.entre(rng, hMin, hMax);
        forme(C, new THREE.BoxGeometry(ep, h + 0.3, l / n + 0.02), AV.choisir(rng, pierres), x, y + (h + 0.3) / 2, z, ang, 1, 1, 1);
        if (h > 1.5 && rng() < 0.5) forme(C, new THREE.BoxGeometry(ep * 0.7, 0.4, l / n * 0.6), AV.choisir(rng, pierres), x, y + h + 0.3, z, ang + (rng() - 0.5) * 0.2, 1, 1, 1);
      }
    }
    // le muret où ils sont assis, au bord du vide : dessus bien plat
    for (var sxI = -3.4; sxI <= 3.0; sxI += 0.8) {
      var yb2 = H(sxI, -6) - 0.3, hm = Math.abs(sxI) < 2.2 ? ySiege - yb2 : AV.entre(rng, 0.4, 0.7) + 0.3;
      forme(C, new THREE.BoxGeometry(0.82, hm, 0.8), AV.choisir(rng, pierres), sxI, yb2 + hm / 2, -6, 0, 1, 1, 1);
    }
    forme(C, new THREE.BoxGeometry(4.6, 0.06, 0.82), '#d6cdb8', -0.2, ySiege + 0.03, -6, 0, 1, 1, 1);
    mur(-3.8, -6, -9, -5, 1.2, 3, 0.9, 0.15);
    mur(-9.4, -4.6, -10.5, 9, 2.5, 5, 1, 0.1);
    mur(-10.5, 9.5, 2, 10.5, 2, 4.5, 1, 0.2);
    mur(3.6, -6, 7.5, -2.5, 0.6, 1.8, 0.9, 0.3);
    // le donjon en ruine
    (function () {
      var cx = 5.5, cz = 5, cote = 5.4, y0 = H(cx, cz) - 0.3;
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (f, i) {
        for (var s = 0; s < 5; s++) {
          var k = (s - 2) * cote / 5, hT = i === 2 && s > 2 ? AV.entre(rng, 1.5, 3) : AV.entre(rng, 6.5, 9.5);
          var x = cx + f[0] * cote / 2 + (f[1] !== 0 ? k : 0), z = cz + f[1] * cote / 2 + (f[0] !== 0 ? k : 0);
          forme(C, new THREE.BoxGeometry(f[0] !== 0 ? 1 : cote / 5 + 0.02, hT, f[1] !== 0 ? 1 : cote / 5 + 0.02), AV.choisir(rng, pierres), x, y0 + hT / 2, z, 0, 1, 1, 1);
        }
      });
      forme(C, new THREE.BoxGeometry(0.25, 1.1, 0.1), '#2a2620', cx - 1, y0 + 4.5, cz - cote / 2 - 0.5, 0, 1, 1, 1); // meurtrières
      forme(C, new THREE.BoxGeometry(0.25, 1.1, 0.1), '#2a2620', cx + 1.2, y0 + 5.5, cz - cote / 2 - 0.5, 0, 1, 1, 1);
      forme(C, new THREE.BoxGeometry(0.1, 1.1, 0.25), '#2a2620', cx - cote / 2 - 0.5, y0 + 5, cz, 0, 1, 1, 1);
    })();
    for (var e2 = 0; e2 < 50; e2++) {
      var ex = AV.entre(rng, -11, 9), ez = AV.entre(rng, -5, 11);
      if (Math.abs(ex) < 2.5 && ez < -3) continue;
      forme(C, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, pierres), ex, H(ex, ez) + 0.1, ez, rng() * 3, AV.entre(rng, 0.2, 0.5), AV.entre(rng, 0.15, 0.35), AV.entre(rng, 0.2, 0.5));
    }
    var chateau = C.maille(); chateau.castShadow = true; chateau.receiveShadow = true; G.add(chateau);

    // ---------- Lui ----------
    var lui = luiAssis();
    lui.groupe.position.set(-0.45, ySiege - 0.8 + 0.07, -6.05); lui.groupe.rotation.y = Math.PI; G.add(lui.groupe);
    lui.jambes.forEach(function (j) { j.rotation.x = -1.3; });
    lui.bras[0].rotation.set(-0.5, 0, -0.1); lui.bras[1].rotation.set(-0.5, 0, 0.1);

    // ---------- Les chèvres, sur les pentes du Pic ----------
    var chevres = [], R2 = new AV.Fusion();
    // sur les replats au pied des falaises et dans la forêt, face à nous (une seule derrière la crête)
    [[-150, -835, '#f2efe8', null], [-60, -845, '#6b4a32', '#f2efe8'], [30, -838, '#2b2522', '#f2efe8'], [160, -860, '#a07850', null], [-40, -950, '#f2efe8', '#6b4a32']].forEach(function (s, i) {
      var ch = chevre(s[2], s[3]), y = H(s[0], s[1]);
      ch.groupe.position.set(s[0], y, s[1]); ch.groupe.rotation.y = rng() * Math.PI * 2; G.add(ch.groupe);
      // un rocher ou un buisson à côté pour la cacher un peu
      var ox = s[0] + AV.entre(rng, -2.2, 2.2), oz = s[1] + AV.entre(rng, 1.4, 2.4);
      if (i % 2) forme(R2, new THREE.DodecahedronGeometry(1, 0), '#cfc6b0', ox, H(ox, oz) + 0.4, oz, rng() * 3, 1.4, 1.0, 1.2);
      else forme(R2, new THREE.IcosahedronGeometry(1, 0), '#56643a', ox, H(ox, oz) + 0.5, oz, rng() * 3, 1.5, 1.1, 1.5);
      var halo = AV.halo('#fff2b0', 7); halo.position.set(s[0], y + 1.2, s[1]); halo.material.opacity = 0; G.add(halo);
      chevres.push({ c: ch, x: s[0], y: y + 0.7, z: s[1], ph: rng() * 6, halo: halo });
    });
    G.add(R2.maille());
    mo.anime(function (dt, t) {
      chevres.forEach(function (c) {
        var k = Math.sin(t * 0.5 + c.ph);
        c.c.cou.rotation.x = k > 0.2 ? AV.lerp(c.c.cou.rotation.x, 1.0, dt * 3) : AV.lerp(c.c.cou.rotation.x, -0.1, dt * 3); // broute / relève la tête
        c.c.groupe.rotation.y += Math.sin(t * 0.13 + c.ph) * dt * 0.15;
      });
    });

    // ---------- Le drone ----------
    var dr = fabriquerDrone();
    var drSol = new THREE.Vector3(1.5, H(1.5, -4.4) + 0.13, -4.4);
    dr.groupe.position.copy(drSol); dr.groupe.rotation.y = 0; G.add(dr.groupe);
    var telecommande = new THREE.Group();
    telecommande.add(bm(0.24, 0.04, 0.13, '#2b2f35', 0, 0, 0));
    [-1, 1].forEach(function (s) { telecommande.add(bm(0.02, 0.05, 0.02, '#888', s * 0.07, 0.04, 0)); });
    var ecranT = bm(0.16, 0.005, 0.09, '#6fb4ff', 0, 0.025, 0); telecommande.add(ecranT);
    telecommande.position.set(0, 0.98, 0.42); telecommande.rotation.x = -0.6;

    // ---------- État ----------
    var etat = 'intro', tEtat = 0, tVol = 0, alt = -3.5, api = null, parole = null, J = null;
    var pos = new THREE.Vector3(), vel = new THREE.Vector3(), lacet = 0, tang = -0.12, roulis = 0, monte = false, descend = false;
    var photos = { couple: null, soleil: null, chevre: null }, nPhotos = 0, tCloche = 0, tAide = 0, dejaLeve = false;
    var camRegard = null, soleilDir = new THREE.Vector3(), tCalin = 0, coeurs = [], tCoeur = 0, fini = false;
    var cA = new THREE.Color(), cB = new THREE.Color();
    var NOMS = { couple: '💑 vous deux', soleil: '🌄 le lever de soleil', chevre: '🐐 une chèvre' };
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function restants() { return Object.keys(photos).filter(function (k) { return !photos[k]; }); }
    function sousTitre() {
      if (!api) return;
      var s = etat === 'vol' || etat === 'retour' ? '📸 ' + nPhotos + ' / 3 photos · ' + Object.keys(photos).map(function (k) { return NOMS[k].split(' ')[0] + (photos[k] ? '✔' : ''); }).join(' ')
        : etat === 'final' || etat === 'fini' ? '🌄 Le soleil s\'est levé sur le Pic Saint-Loup ❤' : (cfg.sousTitre || '');
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }

    // ---------- Soleil, couleurs du ciel, lumière ----------
    function majSoleil(camera) {
      var a = alt * Math.PI / 180;
      soleilDir.set(-Math.cos(AZ) * Math.cos(a), Math.sin(a), -Math.sin(AZ) * Math.cos(a));
      var k = lisse(-5, 11, alt);
      cielMat.uniforms.haut.value.copy(cA.set('#16224a')).lerp(cB.set('#4a86d0'), k);
      cielMat.uniforms.bas.value.copy(cA.set('#a77f97')).lerp(cB.set('#d6e2ec'), k);
      cielMat.uniforms.lueur.value.copy(cA.set('#ff8a3a')).lerp(cB.set('#ffe2a8'), k).multiplyScalar(0.7 + 0.3 * lisse(-4, 1, alt));
      cielMat.uniforms.soleilDir.value.copy(soleilDir);
      cielM.position.copy(camera.position);
      etoiles.position.copy(camera.position); etoiles.material.opacity = 0.9 * (1 - lisse(-4, 0, alt));
      soleilS.position.copy(camera.position).addScaledVector(soleilDir, 4000);
      soleilH.position.copy(camera.position).addScaledVector(soleilDir, 3900);
      soleilS.material.color.copy(cA.set('#ff9a50')).lerp(cB.set('#fff4d8'), k);
      soleilH.material.opacity = 0.35 + 0.3 * (1 - k);
      matNuage.color.copy(cA.set('#e07a8a')).lerp(cB.set('#fff1e6'), lisse(-3, 9, alt));
      brume.material.opacity = 0.2 * (1 - lisse(-2, 9, alt));
      if (api && api.scene && api.scene.fog) {
        api.scene.fog.color.copy(cA.set('#9c7f93')).lerp(cB.set('#cdd8e2'), k);
        api.scene.background = api.scene.fog.color;
      }
      if (api) api.eclairage(0.62 + 0.38 * lisse(-4, 8, alt));
    }

    // ---------- Interface : viseur du drone + les 3 polaroïds ----------
    var ui = null, uiInfo, uiFlash, slots = {}, btnBas = null, ecoute = [];
    function construireUI() {
      ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;font-family:Nunito,sans-serif;color:#fff';
      var viseur = document.createElement('div'); viseur.style.cssText = 'position:absolute;inset:0;opacity:0;transition:opacity .4s'; ui.appendChild(viseur);
      [['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].forEach(function (c) {
        var d = document.createElement('div');
        d.style.cssText = 'position:absolute;width:46px;height:46px;' + c[0] + ':9%;' + c[1] + ':12%;border-' + c[0] + ':3px solid rgba(255,255,255,.85);border-' + c[1] + ':3px solid rgba(255,255,255,.85)';
        viseur.appendChild(d);
      });
      var croix = document.createElement('div');
      croix.style.cssText = 'position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border:2px solid rgba(255,255,255,.75);border-radius:50%';
      viseur.appendChild(croix);
      uiInfo = document.createElement('div');
      uiInfo.style.cssText = 'position:absolute;left:50%;top:max(16px, env(safe-area-inset-top));transform:translateX(-50%);padding:6px 14px;border-radius:12px;background:rgba(0,0,0,.35);font-weight:900;font-size:15px;letter-spacing:.5px;white-space:nowrap';
      viseur.appendChild(uiInfo);
      ui.viseur = viseur;
      // les 3 photos à prendre
      var bande = document.createElement('div');
      bande.style.cssText = 'position:absolute;right:max(16px, env(safe-area-inset-right));top:calc(max(14px, env(safe-area-inset-top)) + 62px);display:flex;gap:10px';
      [['couple', '💑', 'Nous deux'], ['soleil', '🌄', 'Lever de soleil'], ['chevre', '🐐', 'Une chèvre']].forEach(function (s, i) {
        var p = document.createElement('div');
        p.style.cssText = 'background:#fffaf0;padding:5px 5px 4px;border-radius:3px;box-shadow:0 3px 10px rgba(0,0,0,.35);transform:rotate(' + [-3, 2, -2][i] + 'deg);width:92px;text-align:center';
        var img = document.createElement('div');
        img.style.cssText = 'width:82px;height:58px;border:2px dashed #b9ad98;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:26px;background:#efe6d6 center/cover no-repeat';
        img.textContent = s[1];
        var lab = document.createElement('div'); lab.textContent = s[2];
        lab.style.cssText = 'color:#3a3226;font-family:Caveat,cursive;font-weight:700;font-size:16px;line-height:1.1;margin-top:2px';
        p.appendChild(img); p.appendChild(lab); bande.appendChild(p);
        slots[s[0]] = { img: img, lab: lab, carte: p };
      });
      ui.appendChild(bande);
      uiFlash = document.createElement('div');
      uiFlash.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0;transition:opacity .35s';
      ui.appendChild(uiFlash);
      document.body.appendChild(ui);
      // boutons : 📸 photo, ⬆ monter, ⬇ descendre (maintenus)
      var bA = document.getElementById('btn-action'), bS = document.getElementById('btn-saut');
      bA.textContent = '📸'; bS.textContent = '⬆';
      btnBas = document.createElement('button'); btnBas.className = 'btn-jeu'; btnBas.textContent = '⬇'; btnBas.title = 'Descendre (C)';
      bS.parentNode.insertBefore(btnBas, bS);
      function tenir(el, set) {
        function on(e) { e.preventDefault(); set(true); } function off() { set(false); }
        el.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { el.addEventListener(t, off); });
        ecoute.push(function () { el.removeEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { el.removeEventListener(t, off); }); });
      }
      tenir(bS, function (v) { monte = v; });
      tenir(btnBas, function (v) { descend = v; });
      btnBas.addEventListener('pointerdown', function (e) { e.stopPropagation(); btnBas.classList.add('appuye'); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { btnBas.addEventListener(t, function () { btnBas.classList.remove('appuye'); }); });
      function kd(e) { if (e.code === 'Space' || e.code === 'KeyR' || e.code === 'PageUp') monte = true; if (e.code === 'KeyC' || e.code === 'KeyF' || e.code === 'PageDown' || e.code === 'ControlLeft') descend = true; }
      function ku(e) { if (e.code === 'Space' || e.code === 'KeyR' || e.code === 'PageUp') monte = false; if (e.code === 'KeyC' || e.code === 'KeyF' || e.code === 'PageDown' || e.code === 'ControlLeft') descend = false; }
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      ecoute.push(function () { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
      document.getElementById('hud-aide-clavier').textContent = 'ZQSD / flèches : avancer et tourner · souris : orienter la caméra · Espace / C : monter / descendre · E : photo';
    }
    function majInfo() {
      if (!ui) return;
      ui.viseur.style.opacity = etat === 'vol' || etat === 'retour' ? '1' : '0';
      var d = Math.round(Math.sqrt(pos.x * pos.x + pos.z * pos.z)), hS = Math.round(pos.y - H(pos.x, pos.z));
      uiInfo.innerHTML = '<span style="color:#ff5a5a">●</span> REC · ALT ' + hS + ' m · DIST ' + d + ' m · 🔋 ' + Math.max(23, Math.round(98 - tVol * 0.25)) + ' %';
    }
    function flash() { if (!uiFlash) return; uiFlash.style.transition = 'none'; uiFlash.style.opacity = '0.9'; void uiFlash.offsetWidth; uiFlash.style.transition = 'opacity .45s'; uiFlash.style.opacity = '0'; }

    // ---------- Photo ----------
    var vP = new THREE.Vector3(), vQ = new THREE.Vector3(), vF = new THREE.Vector3(), rc = new THREE.Raycaster();
    function dansCadre(p, camera, marge) {
      vF.set(0, 0, -1).applyQuaternion(camera.quaternion);
      vQ.copy(p).sub(camera.position);
      if (vQ.dot(vF) <= 0) return false;
      vP.copy(p).project(camera);
      return Math.abs(vP.x) < (marge || 0.85) && Math.abs(vP.y) < (marge || 0.85);
    }
    function evaluer(camera) {
      camera.updateMatrixWorld();
      var msgs = [];
      // 💑 eux deux
      var t1 = J.parts.tete.getWorldPosition(new THREE.Vector3()), t2 = lui.tete.getWorldPosition(new THREE.Vector3());
      var mid = t1.clone().add(t2).multiplyScalar(0.5), dC = camera.position.distanceTo(mid);
      if (dansCadre(t1, camera) && dansCadre(t2, camera)) {
        if (mid.z - camera.position.z < 0.8) msgs.push('On ne voit que vos dos 😄 Passe devant vous, côté falaise !');
        else if (dC > 16) msgs.push('Vous êtes tout petits… approche le drone !');
        else if (!photos.couple) return 'couple';
      } else if (dansCadre(mid, camera, 1.3) && dC < 30) msgs.push('Cadre-vous bien tous les deux 😉');
      // 🌄 le soleil
      var pS = camera.position.clone().addScaledVector(soleilDir, 3000);
      if (dansCadre(pS, camera, 0.8)) {
        rc.set(camera.position, soleilDir); rc.far = 3000;
        var cache = rc.intersectObjects(sols, false).length > 0;
        if (alt < 0.4) msgs.push('Le soleil n\'est pas encore sorti… patience 🌄');
        else if (cache) msgs.push('Le soleil est caché derrière le relief, monte un peu ⬆');
        else if (!photos.soleil) return 'soleil';
      }
      // 🐐 une chèvre
      for (var i = 0; i < chevres.length; i++) {
        var c = chevres[i]; vP.set(c.x, c.y, c.z);
        var d = camera.position.distanceTo(vP);
        if (!dansCadre(vP, camera, 0.88)) continue;
        if (d < 34) { if (!photos.chevre) return 'chevre'; }
        else if (d < 260) msgs.push('Une chèvre ! Mais elle est trop loin, approche-toi 🐐');
      }
      return msgs[0] || ('Jolie vue ! Il te manque : ' + restants().map(function (k) { return NOMS[k]; }).join(', '));
    }
    function capture(cb) {
      var gl = document.querySelector('#jeu canvas');
      // micro-tâche : exécutée juste après le rendu de cette image, avant que le tampon WebGL soit effacé
      Promise.resolve().then(function () {
        try {
          var w = 900, h = Math.round(w * gl.height / gl.width), c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d'); x.drawImage(gl, 0, 0, w, h);
          x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 22px Nunito, sans-serif'; x.textAlign = 'left';
          x.fillText('Château de Viviourès · ' + new Date().toLocaleDateString('fr-FR'), 16, h - 16);
          cb(c.toDataURL('image/jpeg', 0.86));
        } catch (e) { cb(null); }
      });
    }
    function photographier(camera) {
      AV.audio.obturateur(); flash();
      var r = evaluer(camera);
      if (r === 'couple' || r === 'soleil' || r === 'chevre') {
        photos[r] = 'en-cours'; nPhotos++;
        AV.audio.ping(1); AV.audio.etoile();
        dire('📸 ✔ Photo de ' + NOMS[r] + ' !' + (nPhotos < 3 ? ' Plus que ' + (3 - nPhotos) : ''), 3);
        var s = slots[r];
        if (s) { s.img.style.border = '2px solid #8bc34a'; s.img.textContent = ''; s.carte.style.transform += ' scale(1.08)'; }
        capture(function (url) {
          photos[r] = url || 'ok';
          if (s && url) s.img.style.backgroundImage = 'url(' + url + ')';
        });
        sousTitre();
        if (nPhotos >= 3) { etat = 'retour'; tEtat = 0; }
      } else dire('📸 ' + r, 3);
    }

    // ---------- Début ----------
    mo.debut = function (a) { api = a; construireUI(); sousTitre(); majSoleil(a.camera); };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'intro') return '🏰 Château de Viviourès, à l\'aube… le soleil va se lever sur le Pic Saint-Loup';
      if (etat === 'pret') return '🚁 ✋ pour faire décoller ton drone : 3 photos à prendre !';
      if (etat === 'vol') {
        if (tVol < 9) return !document.body.classList.contains('tactile') ?'🕹️ ZQSD : avancer / tourner · souris : caméra · Espace / C : monter / descendre · E : 📸'
          : '🕹️ Joystick : avancer / tourner · glisse à droite : caméra · ⬆ ⬇ : altitude · 📸 : photo';
        if (!photos.chevre && tVol > 50 && Math.floor(tVol / 12) % 3 === 0) return '🔔 Tu entends les clochettes ? Les chèvres sont sur les pentes du Pic, en face…';
        if (!photos.couple && tVol > 40 && Math.floor(tVol / 12) % 3 === 1) return '💑 Et une photo de vous deux ? Fais demi-tour vers le château 🏰';
        if (!photos.soleil && alt < 0.4 && tVol > 14 && Math.floor(tVol / 12) % 3 === 2) return '🌄 Le soleil va sortir derrière les collines, à droite du Pic…';
      }
      return null;
    };

    // ---------- Pose assise de la joueuse ----------
    function poseAssise(mains) {
      var pr = J.parts;
      // le modèle de la joueuse est plus grand (et plus « grosse tête ») qu'Axel : on la ramène à son échelle,
      // un peu plus petite que lui, comme sur les photos
      J.groupe.scale.setScalar(ECH_O);
      J.position.set(0.3, ySiege - 0.53 * ECH_O, -6.0);
      J.groupe.rotation.y = Math.PI;
      J.ombre.position.set(0.3, ySiege + 0.02, -6.0); J.ombre.scale.setScalar(0.7);
      pr.jambeG.rotation.set(-1.3, 0, 0.05); pr.jambeD.rotation.set(-1.3, 0, -0.05);
      pr.corps.position.y = 0; pr.corps.rotation.set(0.05, 0, 0);
      if (mains === 'telecommande') {
        if (telecommande.parent !== pr.corps) pr.corps.add(telecommande);
        pr.brasG.rotation.set(-1.0, 0, 0.45); pr.brasD.rotation.set(-1.0, 0, -0.45);
      } else {
        if (telecommande.parent) telecommande.parent.remove(telecommande);
        pr.brasG.rotation.set(-0.45, 0, 0.1); pr.brasD.rotation.set(-0.45, 0, -0.1);
      }
    }

    // ---------- Pilote (chaque image) ----------
    mo.pilote = function (dt, e, appui, joueur, camera, x) {
      J = joueur; x = x || {};
      tEtat += dt; if (parole) parole.t -= dt;
      var r = x.regard || { dx: 0, dy: 0 };
      var cible = new THREE.Vector3(), regard = new THREE.Vector3();
      var helice = etat === 'decollage' || etat === 'vol' || etat === 'retour';
      dr.helices.forEach(function (h, i) { h.rotation.y += dt * (helice ? 55 : 0) * (i % 2 ? 1 : -1); });

      if (etat === 'intro' || etat === 'pret') {
        poseAssise('rien');
        // d'abord face à eux depuis le vide (le jour se lève dans leur dos… enfin, devant eux), puis derrière eux, vers le Pic
        var ti = Math.min(1, tEtat / 7), te = lisse(0.35, 1, ti), tr = lisse(0.55, 1, ti);
        if (etat === 'pret') te = tr = 1;
        cible.set(AV.lerp(5 - ti * 3, 2.4, te), AV.lerp(ySiege + 1.4, ySiege + 1.6, te), AV.lerp(-14 + ti * 2, -1.0, te));
        regard.set(AV.lerp(0, 20, tr), AV.lerp(ySiege + 0.8, 30, tr), AV.lerp(-6, -900, tr)); // vers le Pic
        camera.position.copy(cible); camera.lookAt(regard); camRegard = regard.clone();
        lui.tete.rotation.y = Math.sin(tEtat * 0.4) * 0.2;
        if (etat === 'intro' && (tEtat > 7.2 || (appui && tEtat > 1))) { etat = 'pret'; tEtat = 0; appui = false; }
        if (etat === 'pret' && appui && tEtat > 0.3) { etat = 'decollage'; tEtat = 0; AV.audio.drone(true); AV.audio.clic(); }
      } else if (etat === 'decollage') {
        poseAssise('telecommande');
        var k1 = Math.min(1, tEtat / 1.6), k2 = lisse(1.6, 3.4, tEtat);
        pos.set(AV.lerp(drSol.x, 0.6, k2), drSol.y + k1 * 2.4 + k2 * 1.2, AV.lerp(drSol.z, -10.5, k2));
        dr.groupe.position.copy(pos); dr.groupe.position.y += Math.sin(tEtat * 9) * 0.02;
        dr.groupe.rotation.set(-0.12 * k2 * (1 - k2) * 4, 0, 0);
        AV.audio.droneVitesse(0.3 + k2 * 0.4);
        camera.position.lerp(cible.set(2.4, ySiege + 1.6, -1.0), 1 - Math.exp(-dt * 3));
        camRegard.lerp(dr.groupe.position, 1 - Math.exp(-dt * 4));
        camera.lookAt(camRegard);
        if (tEtat > 3.6) {
          etat = 'vol'; tEtat = 0; flash();
          lacet = 0; tang = -0.1; vel.set(0, 0, 0); dr.groupe.visible = false;
          camera.fov = 72; camera.updateProjectionMatrix();
          dire('🚁 C\'est parti ! ' + (alt < 0 ? 'Le soleil n\'est pas encore levé…' : ''), 2.5);
          sousTitre();
        }
      } else if (etat === 'vol' || etat === 'retour') {
        poseAssise('telecommande');
        J.parts.tete.rotation.set(0.25, 0, 0);
        tVol += dt;
        alt = Math.min(14, alt + dt * (api && api.test ? 0.3 : 0.17));
        if (!dejaLeve && alt > 0.4) { dejaLeve = true; dire('🌅 Le soleil se lève ! Vite, une photo !', 3.5); }
        var ctrl = etat === 'vol';
        lacet -= (ctrl ? e.x * dt * 1.3 + r.dx * 0.0045 : 0);
        tang = Math.max(-1.25, Math.min(0.5, tang - (ctrl ? r.dy * 0.0035 : 0)));
        var vmax = e.course ? 26 : 15, av = ctrl ? e.y * vmax : 0, vz = ctrl ? (monte ? 1 : 0) - (descend ? 1 : 0) : 0;
        if (ctrl && x.saut) vz = 1;
        cible.set(-Math.sin(lacet) * av, vz * 8, -Math.cos(lacet) * av);
        vel.lerp(cible, 1 - Math.exp(-dt * 2.4));
        pos.addScaledVector(vel, dt);
        var sol = H(pos.x, pos.z) + 1.8;
        if (pos.y < sol) { pos.y = sol; if (vel.y < 0) vel.y = 0; }
        if (pos.y > 520) pos.y = 520;
        var dd = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (dd > 1700) { pos.x *= 1700 / dd; pos.z *= 1700 / dd; if (!parole || parole.t <= 0) dire('📡 Le signal faiblit… reviens un peu !', 2); }
        roulis = AV.lerp(roulis, -e.x * 0.12, Math.min(1, dt * 4));
        camera.position.copy(pos); camera.position.y += Math.sin(tVol * 7) * 0.012;
        camera.rotation.order = 'YXZ';
        camera.rotation.set(tang, lacet, roulis);
        AV.audio.droneVitesse(Math.min(1, vel.length() / 22));
        if (ctrl && x.action) photographier(camera);
        // clochettes : plus fort quand on approche
        tCloche -= dt;
        if (tCloche <= 0) {
          tCloche = 1.1 + Math.random() * 0.8;
          var dMin = 1e9; chevres.forEach(function (c) { var d = Math.sqrt((c.x - pos.x) * (c.x - pos.x) + (c.y - pos.y) * (c.y - pos.y) + (c.z - pos.z) * (c.z - pos.z)); if (d < dMin) dMin = d; });
          if (!photos.chevre) AV.audio.clochette(Math.max(0, 1 - dMin / 220) * 0.9 + (tVol > 30 ? 0.05 : 0));
        }
        // aide : les chèvres scintillent si on ne les trouve pas
        tAide = tVol;
        chevres.forEach(function (c) { c.halo.material.opacity = !photos.chevre && tVol > 110 ? 0.35 + 0.3 * Math.sin(tVol * 4 + c.ph) : 0; });
        if (etat === 'retour' && tEtat > 2.4) {
          etat = 'transition'; tEtat = 0;
          var fd = document.getElementById('fondu'); fd.classList.add('noir');
          setTimeout(function () {
            if (etat !== 'transition') return;
            etat = 'final'; tEtat = 0; AV.audio.drone(false);
            dr.groupe.visible = true; dr.groupe.position.copy(drSol); dr.groupe.rotation.set(0, 0, 0);
            camera.fov = 60; camera.updateProjectionMatrix(); camera.rotation.order = 'XYZ';
            camera.position.set(0.9, ySiege + 0.5, -10.2); camRegard = new THREE.Vector3(-0.1, ySiege + 0.6, -6);
            alt = Math.max(alt, 7); sousTitre();
            fd.classList.remove('noir');
          }, 650);
        }
      } else if (etat === 'final' || etat === 'fini') {
        poseAssise('rien');
        var pr = J.parts, kk = lisse(0.3, 1.6, tEtat);
        // il passe son bras autour d'elle, elle pose la tête sur son épaule
        lui.bras[0].rotation.set(AV.lerp(-0.5, 0.15, kk), 0, AV.lerp(-0.1, -1.95, kk));
        lui.tete.rotation.set(0, 0, AV.lerp(0, 0.18, kk));
        pr.tete.rotation.set(0.05, 0, AV.lerp(0, -0.32, kk));
        pr.corps.rotation.z = AV.lerp(0, -0.1, kk);
        lui.corps.rotation.z = AV.lerp(0, 0.05, kk);
        tCoeur -= dt;
        if (tEtat > 1.4 && tCoeur <= 0) {
          tCoeur = 0.35;
          var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.7 });
          cs.position.set(-0.08 + (Math.random() - 0.5) * 0.7, ySiege + 1.6, -6.1 + (Math.random() - 0.5) * 0.3);
          G.add(cs); coeurs.push({ s: cs, t: 0 });
        }
        if (tEtat > 5 && !fini) { fini = true; etat = 'fini'; terminer(); }
        cible.set(1.0, ySiege + 0.95, -11.0);
        camera.position.lerp(cible, 1 - Math.exp(-dt * 0.8));
        regard.set(-0.08, ySiege + 0.75, -6);
        camRegard.lerp(regard, 1 - Math.exp(-dt * 2));
        camera.lookAt(camRegard);
      } else if (etat === 'transition') {
        camera.position.copy(pos);
      }
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var h = coeurs[i]; h.t += dt; h.s.position.y += dt * 0.6; h.s.position.x += Math.sin(h.t * 3 + i) * dt * 0.15;
        h.s.material.opacity = Math.max(0, 1 - h.t / 2.4);
        if (h.t > 2.4) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(i, 1); }
      }
      majSoleil(camera);
      majInfo();
    };

    // la surprise : l'album des photos du drone (+ les fichiers éventuels de jours.js)
    function terminer() {
      var orig = cfg.__surpriseOrig || (cfg.__surpriseOrig = cfg.surprise || { type: 'photo', fichiers: [] });
      var album = ['couple', 'soleil', 'chevre'].map(function (k) { return photos[k]; }).filter(function (u) { return u && u.indexOf('data:') === 0; });
      if (orig.type === 'photo' || orig.type === undefined) cfg.surprise = Object.assign({}, orig, { type: 'photo', fichiers: album.concat(orig.fichiers || []) });
      else cfg.surprise = orig;
      if (!cfg.surprise.fichiers || !cfg.surprise.fichiers.length) cfg.surprise = { type: 'mot', texte: orig.texte || 'Le soleil s\'est levé sur le Pic Saint-Loup… et on était là tous les deux ❤', signature: orig.signature };
      sousTitre();
      if (api) api.trouver();
    }

    mo.nettoyer = function () {
      if (etat === 'transition') { var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir'); }
      etat = 'parti';
      AV.audio.drone(false);
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui); ui = null;
      if (btnBas && btnBas.parentNode) btnBas.parentNode.removeChild(btnBas);
      ecoute.forEach(function (f) { f(); }); ecoute = [];
      document.getElementById('btn-action').textContent = '✋';
      document.getElementById('btn-saut').textContent = '⤒';
      monte = descend = false;
      if (J) {
        var pr = J.parts;
        if (telecommande.parent) telecommande.parent.remove(telecommande);
        pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15);
        pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
        pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0);
        J.ombre.scale.setScalar(1);
        J.groupe.scale.setScalar(1);
      }
    };

    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, alt: Math.round(alt * 10) / 10, tVol: Math.round(tVol), pos: pos.toArray().map(Math.round), lacet: lacet, tang: tang, photos: Object.keys(photos).map(function (k) { return k + ':' + (photos[k] ? 'ok' : '-'); }).join(' ') }; },
      decoller: function () { etat = 'pret'; tEtat = 1; },
      voler: function (x, y, z, l, t) { pos.set(x, y, z); vel.set(0, 0, 0); if (l != null) lacet = l; if (t != null) tang = t; },
      viser: function (px, py, pz) { var dx = px - pos.x, dy = py - pos.y, dz = pz - pos.z; lacet = Math.atan2(-dx, -dz); tang = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)); },
      soleil: function (a) { alt = a; },
      chevres: function () { return chevres.map(function (c) { return [Math.round(c.x), Math.round(c.y), Math.round(c.z)]; }); },
      photo: function () { pendingPhoto = true; },
      finir: function () { if (etat === 'final') tEtat = 4.9; },
      ySiege: ySiege
    };
    var pendingPhoto = false;
    var piloteBase = mo.pilote;
    mo.pilote = function (dt, e, appui, joueur, camera, x) {
      if (pendingPhoto && etat === 'vol') { pendingPhoto = false; x = Object.assign({}, x || {}, { action: true }); }
      piloteBase(dt, e, appui, joueur, camera, x);
    };
    return mo;
  };
})(window.AV);
