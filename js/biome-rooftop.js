/* Biome « rooftop » : le toit-terrasse de l'Arbre Blanc à Montpellier, au coucher du soleil.
   Panorama : le Lez au pied de la tour, Antigone, le Polygone, l'Écusson et ses cathédrales/églises,
   le Peyrou et l'aqueduc, le Pic Saint-Loup au nord, les étangs, la mer et Sète sous le soleil.
   Un couple est assis à une table côté coucher de soleil. La loutre est barmaid, cachée derrière
   le comptoir : quand on la trouve, elle sert un verre de blanc… et une surprise. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var SOL = -57;                       // niveau de la ville (le toit est à 0)
  var RT = 13.2;                       // rayon du toit-terrasse
  var RC = 11.8;                       // rayon du fût de la tour
  var DIR = { x: -0.78, z: 0.62 };     // direction du soleil couchant (sud-ouest)
  (function () { var l = Math.sqrt(DIR.x * DIR.x + DIR.z * DIR.z); DIR.x /= l; DIR.z /= l; })();
  var COMPTOIR = 1.1, XC = 6.4, ZL = 0.7; // bar : comptoir face à l'ouest, loutre derrière
  var CIEL = { haut: '#353c86', bas: '#ffab6e', brouillard: '#f4a67a', hemi: ['#ffd9bd', '#5a4a6e', 0.8], soleil: ['#ffb26a', 1.05, [DIR.x * 40, 8, DIR.z * 40]] };

  // ---------- Géographie (stylisée, distances compressées) ----------
  function cote(x) { return 560 + 0.25 * x; }            // trait de côte (z)
  var ETANGS = [
    { x: -520, z: 330, rx: 230, rz: 55 }, { x: -120, z: 470, rx: 200, rz: 45 },
    { x: 330, z: 580, rx: 260, rz: 55 }, { x: 760, z: 690, rx: 220, rz: 48 }
  ];
  function xLez(z) { return -42 + 14 * Math.sin(z / 110) + (z < -400 ? (z + 400) * 0.05 : 0); }
  var ANTI = { a: { x: -70, z: -110 }, u: null, L: 330 };
  (function () { var ux = -1, uz = -0.28, l = Math.sqrt(ux * ux + uz * uz); ANTI.u = { x: ux / l, z: uz / l }; })();
  function antigone(x, z) { // coordonnées le long de l'axe d'Antigone
    var dx = x - ANTI.a.x, dz = z - ANTI.a.z;
    return { s: dx * ANTI.u.x + dz * ANTI.u.z, n: dx * -ANTI.u.z + dz * ANTI.u.x };
  }
  function pointAnti(s, n) { return { x: ANTI.a.x + ANTI.u.x * s - ANTI.u.z * n, z: ANTI.a.z + ANTI.u.z * s + ANTI.u.x * n }; }
  var LIEUX = {
    polygone: pointAnti(375, 0), ecusson: { x: -560, z: -240 }, cathedrale: { x: -610, z: -300 },
    sainteAnne: { x: -520, z: -205 }, saintRoch: { x: -560, z: -280 }, peyrou: { x: -690, z: -215 },
    hotelVille: { x: 40, z: 260 }, picSaintLoup: { x: -300, z: -1550 }, sete: { x: -980, z: 720 }
  };
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function zone(x, z) {
    var c = cote(x);
    if (z > c + 14) return 'mer';
    if (z > c - 8) return 'plage';
    for (var i = 0; i < ETANGS.length; i++) { var e = ETANGS[i], ex = (x - e.x) / e.rx, ez = (z - e.z) / e.rz; if (ex * ex + ez * ez < 1) return 'etang'; }
    if (z > c - 170) return 'marais';
    if (Math.sqrt(x * x + z * z) > 1250) return 'campagne';
    return 'ville';
  }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  var boiteT = new THREE.Mesh(AV.facettes(new THREE.BoxGeometry(1, 1, 1)), matT);
  function cube(F, x, y0, z, w, h, d, rot, col) {
    boiteT.position.set(x, y0 + h / 2, z); boiteT.scale.set(w, h, d); boiteT.rotation.set(0, rot || 0, 0);
    matT.color.set(col); F.ajouter(boiteT);
  }
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col);
    o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(l, h, p, couleur, x, y, z, ombre) {
    var b = AV.maille(new THREE.BoxGeometry(l, h, p), couleur, ombre !== false);
    b.position.set(x, y, z);
    return b;
  }
  function etiquette(texte, hauteur) {
    var c = document.createElement('canvas'), x = c.getContext('2d'), f = '900 44px Nunito, sans-serif';
    x.font = f; var w = Math.ceil(x.measureText(texte).width) + 48;
    c.width = w; c.height = 72;
    x.font = f; x.fillStyle = 'rgba(32,28,60,.62)';
    var r = 30; x.beginPath(); x.moveTo(r, 2); x.lineTo(w - r, 2); x.quadraticCurveTo(w - 2, 2, w - 2, 36); x.quadraticCurveTo(w - 2, 70, w - r, 70); x.lineTo(r, 70); x.quadraticCurveTo(2, 70, 2, 36); x.quadraticCurveTo(2, 2, r, 2); x.fill();
    x.fillStyle = '#fff6e8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texte, w / 2, 38);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    s.scale.set(hauteur * w / 72, hauteur, 1);
    return s;
  }
  function texturePlanches() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d');
    for (var i = 0; i < 16; i++) {
      var v = 128 + Math.floor(Math.random() * 34); // deck gris (bois grisé au soleil)
      x.fillStyle = 'rgb(' + v + ',' + Math.floor(v * 0.95) + ',' + Math.floor(v * 0.88) + ')';
      x.fillRect(0, i * 16, 256, 15);
      x.fillStyle = 'rgba(40,36,32,.55)'; x.fillRect(0, i * 16 + 15, 256, 1);
      x.fillRect(Math.floor(Math.random() * 256), i * 16, 1, 15);
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
    return t;
  }

  // ---------- Verre de vin blanc ----------
  var matVerre = new THREE.MeshPhongMaterial({ color: '#eef6ff', transparent: true, opacity: 0.38, shininess: 120, depthWrite: false });
  function verreVin(plein) {
    var g = new THREE.Group();
    var pied = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.006, 10), matVerre); pied.position.y = 0.003; g.add(pied);
    var tige = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 5), matVerre); tige.position.y = 0.05; g.add(tige);
    var pts = [];
    for (var i = 0; i <= 8; i++) { var t = i / 8; pts.push(new THREE.Vector2(0.008 + Math.sin(t * 2.4) * 0.042 - t * t * 0.008, 0.095 + t * 0.1)); }
    var coupe = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), matVerre); g.add(coupe);
    var vin = new THREE.Group(); vin.position.y = 0.1; g.add(vin);
    var liq = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.022, 0.05, 10), new THREE.MeshLambertMaterial({ color: '#f2dc84', emissive: '#6a4a10', emissiveIntensity: 0.35 }));
    liq.position.y = 0.025; vin.add(liq);
    vin.scale.y = plein ? 1 : 0.001; vin.visible = !!plein;
    g.userData.vin = vin;
    g.scale.setScalar(1.5);
    return g;
  }
  function seauBouteille() {
    var g = new THREE.Group();
    g.add(AV.maille(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 10), '#c9ced6'));
    g.children[0].position.y = 0.11;
    var b = AV.maille(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 8), '#2f5a32'); b.position.set(0, 0.24, 0); b.rotation.z = 0.15; g.add(b);
    var c = AV.maille(new THREE.CylinderGeometry(0.018, 0.03, 0.1, 6), '#2f5a32'); c.position.set(-0.025, 0.4, 0); c.rotation.z = 0.15; g.add(c);
    var e = AV.maille(new THREE.CylinderGeometry(0.047, 0.047, 0.08, 8), '#f3ead2'); e.position.set(0.005, 0.25, 0); e.rotation.z = 0.15; g.add(e);
    return g;
  }

  // ---------- Personne assise sur une chaise (regarde +z) ----------
  function convive(o) {
    var g = new THREE.Group();
    var torse = new THREE.Group(); torse.position.set(0, 0.5, -0.05); g.add(torse);
    var t = AV.maille(new THREE.CylinderGeometry(0.18, 0.23, 0.56, 8), o.haut); t.position.y = 0.28; torse.add(t);
    var cou = AV.maille(new THREE.CylinderGeometry(0.075, 0.08, 0.16, 6), o.peau); cou.position.y = 0.6; torse.add(cou);
    var tete = new THREE.Group(); tete.position.y = 0.8; torse.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.2, 1), o.peau));
    [-1, 1].forEach(function (c) {
      var oe = AV.maille(new THREE.SphereGeometry(0.03, 6, 4), '#2b2340', false); oe.position.set(c * 0.075, 0.02, 0.18); tete.add(oe);
    });
    var cap = AV.maille(new THREE.SphereGeometry(0.218, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), o.cheveux);
    cap.rotation.x = -0.45; cap.position.y = 0.01; tete.add(cap);
    if (o.longs) {
      tete.add(boite(0.36, 0.5, 0.12, o.cheveux, 0, -0.2, -0.13));
      [-1, 1].forEach(function (c) { tete.add(boite(0.07, 0.38, 0.12, o.cheveux, c * 0.19, -0.14, 0.0)); });
    }
    if (o.bonnet) {
      var bn = AV.maille(new THREE.ConeGeometry(0.21, 0.32, 8), '#d94a4a'); bn.position.set(0, 0.24, -0.04); bn.rotation.x = -0.35; tete.add(bn);
      var rv = AV.maille(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 8), '#ffffff'); rv.position.set(0, 0.12, -0.02); rv.rotation.x = -0.35; tete.add(rv);
    }
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux, chapeau: !!o.bonnet });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.25, 0.48, 0); b.rotation.set(-1.15, 0, c * 0.12); torse.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.065, 0.058, 0.46, 6), o.haut); m.position.y = -0.23; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.065, 0), o.peau); mn.position.y = -0.48; b.add(mn);
      bras.push(b);
      g.add(boite(0.16, 0.16, 0.48, o.bas, c * 0.1, 0.52, 0.18));
      g.add(boite(0.14, 0.46, 0.14, o.bas, c * 0.1, 0.25, 0.4));
      g.add(boite(0.15, 0.1, 0.25, '#2b2b2b', c * 0.1, 0.05, 0.46));
    });
    return { groupe: g, tete: tete, torse: torse, bras: bras };
  }
  // mange-debout et tabouret haut
  function tableHaute() {
    var g = new THREE.Group();
    var p = AV.maille(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), '#f4f1ea'); p.position.y = 1.06; g.add(p);
    var c = AV.maille(new THREE.CylinderGeometry(0.04, 0.04, 1.04, 8), '#c8ccd2'); c.position.y = 0.53; g.add(c);
    var b = AV.maille(new THREE.CylinderGeometry(0.26, 0.28, 0.03, 14), '#c8ccd2'); b.position.y = 0.015; g.add(b);
    return g;
  }
  function tabouret() {
    var g = new THREE.Group();
    var s = AV.maille(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), '#e9e4da'); s.position.y = 0.77; g.add(s);
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.78, l = AV.maille(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 5), '#c8ccd2'); l.position.set(Math.cos(a) * 0.13, 0.39, Math.sin(a) * 0.13); g.add(l); }
    var r = AV.maille(new THREE.TorusGeometry(0.15, 0.012, 4, 14), '#c8ccd2'); r.rotation.x = Math.PI / 2; r.position.y = 0.32; g.add(r);
    return g;
  }
  function chaise(couleur) {
    var g = new THREE.Group();
    g.add(boite(0.46, 0.05, 0.44, couleur, 0, 0.45, 0));
    g.add(boite(0.46, 0.5, 0.05, couleur, 0, 0.72, -0.21));
    [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].forEach(function (p) { g.add(boite(0.04, 0.45, 0.04, '#d8d8d8', p[0], 0.225, p[1])); });
    return g;
  }
  function tableBistrot(l, p) {
    var g = new THREE.Group();
    g.add(boite(l, 0.05, p, '#f4f1ea', 0, 0.74, 0));
    g.add(boite(0.06, 0.72, 0.06, '#9a9ea8', 0, 0.36, 0));
    g.add(boite(0.4, 0.03, 0.4, '#9a9ea8', 0, 0.015, 0));
    return g;
  }
  function bougie() {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), new THREE.MeshPhongMaterial({ color: '#ffe0a0', transparent: true, opacity: 0.6 })));
    var f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffcf6a' })); f.position.y = 0.06; g.add(f);
    var h = AV.halo('#ffb84a', 0.5); h.position.y = 0.07; g.add(h);
    return g;
  }

  // =====================================================================
  AV.biomes.rooftop = function (cfg) {
    var rng = AV.rng(3003 + cfg.jour);
    var nom = cfg.nom || AV.nomAnimal(cfg.animal);
    var mo = new AV.Monde({
      rayon: 11.95, hauteur: function () { return 0; }, surface: 'bois', ciel: CIEL, brouillard: [300, 2300],
      depart: { x: 2.6, z: -5.6, angle: Math.atan2(DIR.x, DIR.z) + 0.35 }, theme: 'rooftop', ambiance: 'vent'
    });
    mo.loin = 2600;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe;

    // ---------- Soleil couchant, nuages, reflet sur la mer ----------
    var DS = 2000;
    var soleil = new THREE.Mesh(new THREE.SphereGeometry(42, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false }));
    soleil.position.set(DIR.x * DS, 70, DIR.z * DS); G.add(soleil);
    [[700, '#ff9a4a', 0.55], [260, '#ffe2a0', 0.8]].forEach(function (h) {
      var s = AV.halo(h[1], h[0]); s.material.fog = false; s.material.opacity = h[2]; s.position.copy(soleil.position); G.add(s);
    });
    var nuages = new AV.Fusion();
    for (var n = 0; n < 16; n++) {
      var an = Math.atan2(DIR.x, DIR.z) + (rng() - 0.5) * 2.4, dn = AV.entre(rng, 1500, 1900);
      forme(nuages, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#ffb38a', '#f6939d', '#ffc9a0', '#e889a6']),
        Math.sin(an) * dn, AV.entre(rng, 120, 330), Math.cos(an) * dn, an + Math.PI / 2, AV.entre(rng, 150, 320), AV.entre(rng, 9, 20), AV.entre(rng, 30, 60));
    }
    var nuagesM = nuages.maille(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); G.add(nuagesM);
    var reflet = new THREE.Mesh(new THREE.PlaneGeometry(140, 1200), new THREE.MeshBasicMaterial({ map: AV.textureRonde(), color: '#ffc070', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    reflet.rotation.x = -Math.PI / 2; reflet.rotation.z = Math.atan2(-DIR.x, -DIR.z);
    reflet.position.set(DIR.x * 1450, SOL + 0.6, DIR.z * 1450);
    G.add(reflet);

    // ---------- Le sol de la ville, la mer, les étangs ----------
    G.add(AV.terrain(5200, 150, function () { return SOL; }, function (x, z) {
      var zn = zone(x, z), h = hash(Math.floor(x / 60), Math.floor(z / 60));
      if (zn === 'mer') return AV.outils.varier('#4f7fae', x, z, 0.06);
      if (zn === 'plage') return AV.outils.varier('#ead6a6', x, z, 0.05);
      if (zn === 'etang') return AV.outils.varier(h > 0.85 ? '#d9a6a6' : '#79a3b8', x, z, 0.06);
      if (zn === 'marais') return AV.outils.varier(h > 0.6 ? '#a59c6c' : '#8f9a6a', x, z, 0.1);
      if (zn === 'campagne') return AV.outils.varier(h > 0.55 ? '#8d9462' : '#a3a070', x, z, 0.12);
      if (h > 0.86) return AV.outils.varier('#8a9a62', x, z, 0.1); // parcs
      return AV.outils.varier(h > 0.4 ? '#cbbb9f' : '#bfae93', x, z, 0.08);
    }));
    // le Lez (ruban d'eau qui serpente jusqu'à la mer)
    (function () {
      var pos = [], z0 = -2400, z1 = cote(-40) + 20, pas = 12, w = 9;
      for (var z = z0; z < z1; z += pas) {
        var xa = xLez(z), xb = xLez(z + pas);
        pos.push(xa - w, SOL + 0.3, z, xa + w, SOL + 0.3, z, xb - w, SOL + 0.3, z + pas,
                 xa + w, SOL + 0.3, z, xb + w, SOL + 0.3, z + pas, xb - w, SOL + 0.3, z + pas);
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      G.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: '#5d8fae', side: THREE.DoubleSide })));
    })();

    // ---------- La ville : immeubles, Antigone, monuments ----------
    var V = new AV.Fusion(), A = new AV.Fusion();
    function libre(x, z, marge) {
      if (Math.abs(x - xLez(z)) < 22 + marge) return false;
      if (zone(x, z) !== 'ville' && zone(x, z) !== 'campagne') return false;
      var a = antigone(x, z); if (a.s > -70 && a.s < ANTI.L + 85 && Math.abs(a.n) < 80 + marge) return false;
      for (var k in LIEUX) { var L = LIEUX[k], dx = x - L.x, dz = z - L.z; if (dx * dx + dz * dz < (55 + marge) * (55 + marge)) return false; }
      return x * x + z * z > 45 * 45;
    }
    var lumieresVille = [];
    for (var b = 0; b < 3200; b++) {
      var r = 45 + Math.pow(rng(), 1.7) * 1500, a = rng() * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r;
      var w = AV.entre(rng, 12, 30), d = AV.entre(rng, 12, 28);
      if (!libre(x, z, w / 2)) continue;
      var ecusson = Math.hypot(x - LIEUX.ecusson.x, z - LIEUX.ecusson.z) < 140;
      var moderne = r < 420 && !ecusson && x > -300;
      var h = r > 1250 ? AV.entre(rng, 5, 9) : moderne ? AV.entre(rng, 14, 40) : AV.entre(rng, 10, 22);
      var col = moderne ? AV.choisir(rng, ['#f2efe8', '#e9e2d4', '#dcd3c3', '#f0e6d2', '#c9d2d9', '#e7b98f'])
                        : AV.choisir(rng, ['#e3d2b2', '#d9c49f', '#ead9ba', '#cfb994', '#e6d7bf']);
      var rot = ecusson ? rng() * 3 : (rng() - 0.5) * 0.4;
      cube(V, x, SOL, z, w, h, d, rot, col);
      if (!moderne && r < 1250) cube(V, x, SOL + h, z, w * 0.92, 1.6, d * 0.92, rot, AV.choisir(rng, ['#c8724a', '#b8623e', '#d0845a']));
      if (rng() < 0.35 && r < 1100) lumieresVille.push(x + (rng() - 0.5) * w, SOL + rng() * h, z + (rng() - 0.5) * d);
    }
    // arbres le long du Lez et dans les parcs
    for (var zt = -900; zt < 420; zt += 16) {
      [-1, 1].forEach(function (c) {
        if (rng() < 0.2) return;
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#6f8a4e', '#7d9658', '#5f7d46']), xLez(zt) + c * AV.entre(rng, 13, 19), SOL + 5, zt, rng() * 3, 5, 4.5, 5);
      });
    }
    // Antigone : hémicycle face au Lez, puis les grands immeubles néo-classiques de part et d'autre de l'esplanade
    var pierre = '#ead6ad', pierre2 = '#f3e4c4';
    for (var hs = 0; hs < 9; hs++) {
      var ah = -Math.PI / 2 + hs / 8 * Math.PI, ph = pointAnti(-Math.cos(ah) * 52 + 52, Math.sin(ah) * 52);
      cube(A, ph.x, SOL, ph.z, 24, 22, 14, Math.atan2(ANTI.u.x, ANTI.u.z) + ah + Math.PI / 2, pierre);
    }
    for (var s = 70; s < ANTI.L; s += 46) {
      [-1, 1].forEach(function (c) {
        var p = pointAnti(s, c * 50), rot = Math.atan2(ANTI.u.x, ANTI.u.z);
        cube(A, p.x, SOL, p.z, 24, 23, 40, rot, pierre);
        cube(A, p.x, SOL + 23, p.z, 26, 1.4, 42, rot, pierre2);            // corniche
        for (var k = -3; k <= 3; k++) {                                      // pilastres côté esplanade
          var q = pointAnti(s + k * 5.5, c * 37.6);
          cube(A, q.x, SOL, q.z, 1.6, 21, 1.6, rot, pierre2);
        }
      });
      var pe = pointAnti(s, 0); // arbres de l'esplanade
      [-1, 1].forEach(function (c) { var pt = pointAnti(s + 12, c * 18); forme(A, new THREE.IcosahedronGeometry(1, 0), '#7d9658', pt.x, SOL + 4, pt.z, 0, 4, 3.5, 4); });
      cube(A, pe.x, SOL, pe.z, 46, 0.4, 30, Math.atan2(ANTI.u.x, ANTI.u.z), '#efe2c6');
    }
    // Polygone : grand centre commercial au bout de l'axe
    (function () {
      var p = LIEUX.polygone, rot = Math.atan2(ANTI.u.x, ANTI.u.z);
      cube(A, p.x, SOL, p.z, 120, 20, 75, rot, '#d4cbbd');
      cube(A, p.x, SOL + 20, p.z, 100, 5, 60, rot, '#8fa3b5');
      cube(A, p.x, SOL + 25, p.z, 104, 1.2, 64, rot, '#e8e2d8');
    })();
    // Cathédrale Saint-Pierre : nef, tours, et son porche aux deux énormes piliers coiffés de cônes
    (function () {
      var c = LIEUX.cathedrale, pierreC = '#cdbb94', toit = '#8a6a55', S = 1.5;
      cube(A, c.x, SOL, c.z, 26 * S, 32 * S, 80 * S, 0.35, pierreC);
      cube(A, c.x, SOL + 32 * S, c.z, 20 * S, 6 * S, 78 * S, 0.35, toit);
      var cr = Math.cos(0.35), sr = Math.sin(0.35);
      function loc(lx, lz) { return { x: c.x + lx * cr + lz * sr, z: c.z - lx * sr + lz * cr }; }
      [[-12, 30], [12, 30], [-12, -36], [12, -36]].forEach(function (t, i) { // tours carrées crénelées
        var q = loc(t[0] * S, t[1] * S), hT = (i < 2 ? 46 : 40) * S;
        cube(A, q.x, SOL, q.z, 11 * S, hT, 11 * S, 0.35, pierreC);
        for (var k = 0; k < 4; k++) { var e = loc(t[0] * S + (k % 2 ? 3.5 : -3.5) * S, t[1] * S + (k > 1 ? 3.5 : -3.5) * S); cube(A, e.x, SOL + hT, e.z, 2.5 * S, 3 * S, 2.5 * S, 0.35, pierreC); }
      });
      [-1, 1].forEach(function (k) { // le porche
        var q = loc(k * 7 * S, 52 * S);
        forme(A, new THREE.CylinderGeometry(3.4 * S, 3.6 * S, 30 * S, 10), pierreC, q.x, SOL + 15 * S, q.z);
        forme(A, new THREE.ConeGeometry(4.2 * S, 13 * S, 10), '#b9a57e', q.x, SOL + 36.5 * S, q.z);
      });
      var vo = loc(0, 48 * S); cube(A, vo.x, SOL + 24 * S, vo.z, 14 * S, 6 * S, 12 * S, 0.35, pierreC);
    })();
    // Église Sainte-Anne (grande flèche) et Saint-Roch (deux flèches)
    (function () {
      var p = LIEUX.sainteAnne;
      cube(A, p.x, SOL, p.z, 20, 22, 46, 0.2, '#cdbb94');
      cube(A, p.x, SOL, p.z - 26, 12, 50, 12, 0.2, '#cdbb94');
      forme(A, new THREE.ConeGeometry(7.5, 46, 8), '#a8987a', p.x, SOL + 73, p.z - 26, 0.2);
      var q = LIEUX.saintRoch;
      cube(A, q.x, SOL, q.z, 22, 24, 44, -0.3, '#d6c6a2');
      [-1, 1].forEach(function (k) {
        var tx = q.x + k * 8, tz = q.z + 22;
        cube(A, tx, SOL, tz, 8, 40, 8, -0.3, '#d6c6a2');
        forme(A, new THREE.ConeGeometry(5, 26, 8), '#a8987a', tx, SOL + 53, tz);
      });
    })();
    // Le Peyrou : arc de triomphe, château d'eau et aqueduc Saint-Clément
    (function () {
      var p = LIEUX.peyrou;
      cube(A, p.x + 60, SOL, p.z, 10, 22, 26, 0.1, '#e2d3b2');
      cube(A, p.x + 60, SOL + 22, p.z, 12, 6, 28, 0.1, '#e2d3b2');
      cube(A, p.x + 60.2, SOL, p.z, 10.5, 15, 9, 0.1, '#b8a888'); // voûte (ombre)
      cube(A, p.x, SOL, p.z, 70, 4, 50, 0.1, '#c8c0a8');          // la promenade
      forme(A, new THREE.CylinderGeometry(9, 9, 14, 6), '#e2d3b2', p.x - 25, SOL + 11, p.z);
      forme(A, new THREE.ConeGeometry(10, 5, 6), '#cbb894', p.x - 25, SOL + 20.5, p.z);
      for (var i = 0; i < 40; i++) {
        var ax = p.x - 40 - i * 7, az = p.z + i * 1.4;
        cube(A, ax, SOL, az, 2.2, 22, 3.2, 0.2, '#d8c8a4');
        cube(A, ax - 3.5, SOL + 12, az + 0.7, 7.2, 1.6, 3.2, 0.2, '#d8c8a4');
        cube(A, ax - 3.5, SOL + 22, az + 0.7, 7.2, 3, 3.2, 0.2, '#d8c8a4');
      }
    })();
    // Hôtel de Ville (grand cube sombre de Port Marianne)
    cube(A, LIEUX.hotelVille.x, SOL, LIEUX.hotelVille.z, 55, 48, 45, 0.2, '#30405a');
    cube(A, LIEUX.hotelVille.x, SOL + 48, LIEUX.hotelVille.z, 60, 2, 50, 0.2, '#e8eef4');
    // Pic Saint-Loup et l'Hortus au nord, collines au loin, Sète (mont Saint-Clair) sous le soleil
    forme(A, new THREE.ConeGeometry(330, 560, 7), '#71738a', LIEUX.picSaintLoup.x, SOL + 280, LIEUX.picSaintLoup.z, 0.4, 1, 1, 0.45, -0.12);
    forme(A, new THREE.ConeGeometry(260, 300, 6), '#7a7c90', LIEUX.picSaintLoup.x + 420, SOL + 150, LIEUX.picSaintLoup.z - 60, 0.1, 1.4, 1, 0.5);
    for (var co = 0; co < 14; co++) {
      var xc = -2400 + co * 360 + rng() * 120;
      forme(A, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#7f8494', '#868a99', '#787d90']), xc, SOL, -1900 - rng() * 300, rng() * 3, AV.entre(rng, 300, 500), AV.entre(rng, 90, 210), AV.entre(rng, 160, 260));
    }
    forme(A, new THREE.IcosahedronGeometry(1, 1), '#8a7d88', LIEUX.sete.x, SOL, LIEUX.sete.z, 0.5, 220, 70, 110);
    var ph = { x: -60, z: cote(-60) - 2 }; // le « phare » de Palavas
    forme(A, new THREE.CylinderGeometry(4, 6, 42, 8), '#f0ece4', ph.x, SOL + 21, ph.z);
    forme(A, new THREE.CylinderGeometry(9, 7, 8, 8), '#e05a3a', ph.x, SOL + 45, ph.z);

    var villeM = V.maille(); villeM.receiveShadow = false; G.add(villeM);
    var monuM = A.maille(); G.add(monuM);
    // premières lumières de la ville qui s'allument
    var gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lumieresVille, 3));
    var lumV = new THREE.Points(gl, new THREE.PointsMaterial({ color: '#ffd9a0', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }));
    G.add(lumV);

    // étiquettes des lieux (visibles quand on s'approche du garde-corps)
    var etiquettes = [];
    function nommer(texte, x, y, z) {
      var d = Math.sqrt(x * x + z * z), s = etiquette(texte, Math.max(4, d * 0.035));
      s.position.set(x, y, z); G.add(s);
      etiquettes.push({ s: s, ux: x / d, uz: z / d });
    }
    var pa = pointAnti(170, 0);
    nommer('Antigone', pa.x, SOL + 52, pa.z);
    nommer('Le Polygone', LIEUX.polygone.x, SOL + 58, LIEUX.polygone.z);
    nommer('Cathédrale Saint-Pierre', LIEUX.cathedrale.x, SOL + 120, LIEUX.cathedrale.z);
    nommer('Sainte-Anne', LIEUX.sainteAnne.x, SOL + 115, LIEUX.sainteAnne.z - 26);
    nommer('Saint-Roch', LIEUX.saintRoch.x - 20, SOL + 90, LIEUX.saintRoch.z + 40);
    nommer('Le Peyrou', LIEUX.peyrou.x, SOL + 55, LIEUX.peyrou.z);
    nommer('Le Lez', xLez(-60) - 4, SOL + 20, -60);
    nommer('Hôtel de Ville', LIEUX.hotelVille.x, SOL + 75, LIEUX.hotelVille.z);
    nommer('Pic Saint-Loup', LIEUX.picSaintLoup.x, SOL + 640, LIEUX.picSaintLoup.z);
    nommer('Les étangs', ETANGS[1].x, SOL + 60, ETANGS[1].z);
    nommer('Palavas', ph.x, SOL + 80, ph.z);
    nommer('La Méditerranée', 150, SOL + 90, 1100);
    nommer('Sète', LIEUX.sete.x, SOL + 260, LIEUX.sete.z);

    // ---------- La tour : fût vitré, planchers et balcons blancs en porte-à-faux ----------
    // (d'après la photo : façade blanche à pans, bandeaux vitrés, balcons en porte-à-faux sous de grandes pergolas à lames blanches)
    var T = new AV.Fusion();
    forme(T, new THREE.CylinderGeometry(RC, RC + 0.4, -SOL - 0.4, 8, 1, false, Math.PI / 8), '#f1f0ec', 0, SOL / 2 - 0.2, 0);
    var NE = 16, HE = (-SOL - 3) / NE;
    // pergola à lames : cadre + lames perpendiculaires à la façade
    function pergolaLames(F, cx, y, cz, W, L, ang) {
      var ca = Math.cos(ang), sa = Math.sin(ang);
      [-1, 1].forEach(function (c) { cube(F, cx + ca * c * W / 2, y, cz - sa * c * W / 2, 0.12, 0.16, L, ang, '#ffffff'); });
      cube(F, cx + sa * L / 2, y, cz + ca * L / 2, W + 0.12, 0.16, 0.12, ang, '#ffffff');
      for (var k = -W / 2 + 0.35; k < W / 2 - 0.1; k += 0.42) cube(F, cx + ca * k, y + 0.02, cz - sa * k, 0.1, 0.1, L - 0.1, ang, '#fbfbf8');
    }
    for (var e = 0; e < NE; e++) {
      var ye = SOL + 4 + e * HE;
      forme(T, new THREE.CylinderGeometry(RC + 0.3, RC + 0.3, 0.4, 8, 1, false, Math.PI / 8), '#fbfaf6', 0, ye, 0);
      forme(T, new THREE.CylinderGeometry(RC + 0.06, RC + 0.06, 1.5, 8, 1, false, Math.PI / 8), e % 2 ? '#93a6b8' : '#a3b4c4', 0, ye + 1.25, 0); // bandeau vitré
      for (var bi = 0; bi < 8; bi++) {
        var ab = bi / 8 * Math.PI * 2 + (e % 3) * 0.26 + (rng() - 0.5) * 0.2, L = AV.entre(rng, 2.6, 5.6), W = AV.entre(rng, 2.6, 4.2);
        var rr = RC + L / 2 - 0.4, bx = Math.sin(ab) * rr, bz = Math.cos(ab) * rr;
        cube(T, bx, ye - 0.15, bz, W, 0.28, L, ab, '#ffffff');
        var re = RC + L - 0.45, rx = Math.sin(ab) * re, rz = Math.cos(ab) * re;
        cube(T, rx, ye + 0.13, rz, W, 1.0, 0.05, ab, '#dfe9ef');                 // garde-corps vitré
        cube(T, rx, ye + 0.64, rz, W, 0.05, 0.08, ab, '#f3f3f0');               // lisse
        [-1, 1].forEach(function (c) {
          var sx = bx + Math.cos(ab) * c * W / 2, sz = bz - Math.sin(ab) * c * W / 2;
          cube(T, sx, ye + 0.13, sz, 0.05, 1.0, L - 0.4, ab, '#dfe9ef');
        });
        if (rng() < 0.5) cube(T, bx, ye, bz, W * 0.8, 0.45, 0.45, ab, '#ffffff');  // jardinière
        if (e < NE - 1 && rng() < 0.75) { // grande pergola à lames au-dessus du balcon, qui déborde
          var Lp = L + AV.entre(rng, 0.6, 1.6), rp = RC + Lp / 2 - 0.3;
          pergolaLames(T, Math.sin(ab) * rp, ye + 2.55, Math.cos(ab) * rp, W + 0.8, Lp, ab);
        }
      }
    }
    cube(T, 0, SOL, 0, 34, 4, 34, 0.3, '#e9e4da'); // socle / parvis
    var tourM = T.maille(); tourM.castShadow = false; G.add(tourM);

    // ---------- Le toit-terrasse ----------
    // terrasse à pans (octogone) : deck gris, jardinières blanches plantées le long d'un garde-corps tout en verre
    var OCT = 1 / Math.cos(Math.PI / 8), AP = 13.45;           // apothème du bord de dalle
    function octo(ap, h, ouvert) { return new THREE.CylinderGeometry(ap * OCT, ap * OCT, h, 8, 1, !!ouvert, Math.PI / 8); }
    var plancher = new THREE.Mesh(octo(AP, 0.4), [
      new THREE.MeshLambertMaterial({ color: '#f4f1ea' }), new THREE.MeshLambertMaterial({ map: texturePlanches() }), new THREE.MeshLambertMaterial({ color: '#f4f1ea' })
    ]);
    plancher.position.y = -0.2; plancher.receiveShadow = true; G.add(plancher);
    var bord = AV.maille(octo(AP + 0.2, 0.7, true), '#ffffff'); bord.position.y = -0.3; G.add(bord);
    var AG = AP - 0.12;                                         // ligne du garde-corps vitré
    var vitre = new THREE.Mesh(octo(AG, 1.15, true), new THREE.MeshPhongMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.18, shininess: 120, depthWrite: false, side: THREE.DoubleSide }));
    vitre.position.y = 0.575; G.add(vitre);
    var poteaux = new AV.Fusion(), jard = new AV.Fusion(), TAN = Math.tan(Math.PI / 8);
    for (var ed = 0; ed < 8; ed++) {
      var ang = ed * Math.PI / 4, sa = Math.sin(ang), ca = Math.cos(ang), Ls = 2 * AG * TAN;
      cube(poteaux, sa * AG, 1.12, ca * AG, Ls + 0.02, 0.05, 0.07, ang, '#e9ecef');                     // main courante
      for (var pk = -2; pk <= 2; pk++) { var tk = pk / 5 * Ls; cube(poteaux, sa * AG + ca * tk, 0, ca * AG - sa * tk, 0.05, 1.12, 0.05, ang, '#d8dce2'); }
      // jardinière continue + arbustes denses (pittosporum, lauriers…)
      var aj = AP - 0.75, Lj = 2 * aj * TAN - 0.4;
      cube(jard, sa * aj, 0, ca * aj, Lj, 0.55, 0.7, ang, '#ffffff');
      for (var tj = -Lj / 2 + 0.35; tj < Lj / 2 - 0.2; tj += AV.entre(rng, 0.45, 0.7)) {
        var xj = sa * aj + ca * tj, zj = ca * aj - sa * tj, sj = AV.entre(rng, 0.38, 0.6);
        forme(jard, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#3f6b3a', '#4b7a40', '#567f44', '#365f34']), xj, 0.55 + sj * 0.8, zj, rng() * 3, sj, sj * AV.entre(rng, 0.9, 1.5), sj);
      }
    }
    G.add(poteaux.maille());
    var jardM = jard.maille(); jardM.castShadow = true; G.add(jardM);

    // ---------- Ascenseur (retour au village) ----------
    var asc = new THREE.Group();
    asc.add(boite(2.8, 2.9, 2.4, '#f4f1ea', 0, 1.45, 0));
    asc.add(boite(1.3, 2.2, 0.05, '#9aa3b5', 0, 1.1, -1.22));
    asc.add(boite(0.03, 2.2, 0.06, '#5a6070', 0, 1.1, -1.24));
    var ascAng = Math.atan2(6.0, -8.8);
    asc.position.set(6.0, 0, -8.8); asc.rotation.y = ascAng; G.add(asc);
    asc.updateMatrixWorld(true);
    mo.bloqueurs.push(asc.children[0]);
    mo.colliders.push({ rect: true, x: 6.0, z: -8.8, hx: 1.45, hz: 1.25, a: -ascAng });
    var nomTour = AV.outils.panneau('L\'Arbre Blanc · Rooftop', '#ffffff', '#3a3550', 2.6, 0.42);
    nomTour.position.set(0, 3.15, -1.21); nomTour.rotation.y = Math.PI; asc.add(nomTour);
    var porteW = asc.localToWorld(new THREE.Vector3(0, 0, -2.1));
    mo.interactifs.push({ type: 'retour', x: porteW.x, z: porteW.z, rayon: 1.6 });

    // ---------- Le bar ----------
    var bar = new THREE.Group(); G.add(bar);
    bar.add(boite(0.75, COMPTOIR - 0.06, 6.6, '#ffffff', XC, (COMPTOIR - 0.06) / 2, 0));
    bar.add(boite(0.9, 0.07, 6.8, '#a07650', XC, COMPTOIR - 0.03, 0));
    bar.add(boite(0.05, 0.12, 6.6, '#ffb45a', XC - 0.4, 0.15, 0, false)); // néon au pied du comptoir
    // arrière-bar : étagères et bouteilles
    bar.add(boite(0.5, 2.3, 6.2, '#e8e2d6', 9.4, 1.15, 0));
    var bouteilles = new AV.Fusion();
    [0.95, 1.5, 2.05].forEach(function (yb) {
      bar.add(boite(0.4, 0.04, 6.0, '#a07650', 9.05, yb - 0.02, 0));
      for (var zb = -2.8; zb < 2.9; zb += 0.24) {
        var cb = AV.choisir(rng, ['#2f5a32', '#5a2a3a', '#d9c27a', '#3a5a7a', '#e9e2c8', '#8a3a1a']);
        forme(bouteilles, new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), cb, 9.05, yb + 0.12, zb + (rng() - 0.5) * 0.05);
        forme(bouteilles, new THREE.CylinderGeometry(0.016, 0.03, 0.1, 5), cb, 9.05, yb + 0.29, zb);
      }
    });
    bar.add(bouteilles.maille());
    bar.add(boite(0.6, 0.85, 0.7, '#3a3f4a', 8.8, 0.43, 2.5));    // frigo à vin
    bar.add(boite(0.02, 0.6, 0.5, '#2a4a6a', 8.49, 0.47, 2.5, false));
    var sb = seauBouteille(); sb.position.set(XC + 0.1, COMPTOIR, -2.6); bar.add(sb);
    for (var vv = 0; vv < 4; vv++) { var vr = verreVin(false); vr.position.set(XC + 0.15, COMPTOIR, -1.9 + vv * 0.18); bar.add(vr); }
    // tabourets
    for (var ts = -2.4; ts <= 2.41; ts += 1.2) {
      var tb = new THREE.Group();
      tb.add(boite(0.05, 0.75, 0.05, '#9a9ea8', 0, 0.37, 0));
      tb.add(AV.maille(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 10), '#d98a5a')); tb.children[1].position.y = 0.78;
      tb.add(AV.maille(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 10), '#9a9ea8'));
      tb.position.set(XC - 0.85, 0, ts); G.add(tb);
      mo.colliders.push({ x: XC - 0.85, z: ts, r: 0.2 });
    }
    mo.colliders.push({ rect: true, x: XC, z: 0, hx: 0.4, hz: 3.35, a: 0 });
    mo.colliders.push({ rect: true, x: 8.0, z: -3.5, hx: 1.6, hz: 0.18, a: 0 });
    mo.colliders.push({ rect: true, x: 8.0, z: 3.5, hx: 1.6, hz: 0.18, a: 0 });
    [-3.5, 3.5].forEach(function (zf) { G.add(boite(3.2, 1.0, 0.12, '#f4f1ea', 8.0, 0.5, zf)); });
    mo.colliders.push({ rect: true, x: 9.4, z: 0, hx: 0.3, hz: 3.1, a: 0 });
    // le pavillon vitré du bar (d'après la photo) : baies toute hauteur, façade côté terrasse grande ouverte,
    // dalle de toit blanche qui déborde, et au-dessus les grandes « feuilles » blanches à lames en porte-à-faux
    var PX0 = XC - 1.15, PX1 = 11.3, PZ = 4.7, PH = 3.3;
    var pav = new AV.Fusion();
    var matBaie = new THREE.MeshPhongMaterial({ color: '#bcd6ea', transparent: true, opacity: 0.22, shininess: 140, depthWrite: false, side: THREE.DoubleSide });
    function baie(x, z, l, rot) { var b = new THREE.Mesh(new THREE.PlaneGeometry(l, PH - 0.1), matBaie); b.position.set(x, (PH - 0.1) / 2, z); b.rotation.y = rot; G.add(b); }
    [-1, 1].forEach(function (c) {                                        // côtés nord et sud vitrés
      baie((PX0 + PX1) / 2, c * PZ, PX1 - PX0, 0);
      for (var mx = PX0; mx <= PX1 + 0.01; mx += (PX1 - PX0) / 5) cube(pav, mx, 0, c * PZ, 0.09, PH, 0.09, 0, '#f2f2f0');
      cube(pav, (PX0 + PX1) / 2, 0, c * PZ, PX1 - PX0, 0.12, 0.12, 0, '#f2f2f0');
      mo.colliders.push({ rect: true, x: (PX0 + PX1) / 2, z: c * PZ, hx: (PX1 - PX0) / 2, hz: 0.12, a: 0 });
      // façade ouest : baies coulissantes repliées aux deux bouts
      baie(PX0, c * (PZ - 0.55), 1.1, Math.PI / 2);
      cube(pav, PX0, 0, c * (PZ - 1.1), 0.09, PH, 0.09, 0, '#f2f2f0');
      mo.colliders.push({ rect: true, x: PX0, z: c * (PZ - 0.55), hx: 0.1, hz: 0.55, a: 0 });
    });
    baie(PX1, 0, 2 * PZ, Math.PI / 2);                                    // fond vitré (vers l'est)
    for (var mz = -PZ; mz <= PZ + 0.01; mz += PZ / 2.5) cube(pav, PX1, 0, mz, 0.09, PH, 0.09, 0, '#f2f2f0');
    mo.colliders.push({ rect: true, x: PX1, z: 0, hx: 0.12, hz: PZ, a: 0 });
    cube(pav, (PX0 + PX1) / 2 + 0.3, PH, 0, PX1 - PX0 + 2.4, 0.38, 2 * PZ + 1.6, 0, '#ffffff');   // dalle de toit qui déborde
    cube(pav, (PX0 + PX1) / 2 + 0.3, PH + 0.38, 0, PX1 - PX0 + 1.6, 0.5, 2 * PZ + 0.8, 0, '#f4f3ef'); // acrotère
    cube(pav, (PX0 + PX1) / 2, PH - 0.12, 0, PX1 - PX0 - 0.2, 0.06, 2 * PZ - 0.2, 0, '#fff4dc');       // plafond éclairé
    // les « feuilles » : grandes pergolas à lames, en couches, qui débordent largement de la tour
    function feuille(cx, y, cz, W, L, rot) {
      var g = new AV.Fusion(), ca = Math.cos(rot), sa = Math.sin(rot);
      [-1, 1].forEach(function (c) { cube(g, cx + ca * c * W / 2, y, cz - sa * c * W / 2, 0.16, 0.24, L, rot, '#ffffff'); });
      [-1, 1].forEach(function (c) { cube(g, cx + sa * c * L / 2, y, cz + ca * c * L / 2, W + 0.16, 0.24, 0.16, rot, '#ffffff'); });
      for (var k = -W / 2 + 0.3; k < W / 2 - 0.1; k += 0.38) cube(g, cx + ca * k, y + 0.04, cz - sa * k, 0.12, 0.14, L - 0.1, rot, '#fbfbf8');
      var m = g.maille(); m.castShadow = true; G.add(m);
    }
    feuille(9.2, PH + 1.05, -3.2, 5.2, 9.5, 0.2);
    feuille(10.6, PH + 1.35, 3.6, 4.6, 8.5, -0.35);
    feuille(13.0, PH + 0.75, 0.2, 4.0, 7.5, 1.45);
    feuille(6.4, PH + 1.7, 0.8, 3.6, 6.5, 1.2);
    feuille(-9.5, 3.25, 6.5, 3.2, 5.5, 0.95);                               // une feuille sur fins poteaux au-dessus de notre table (sud-ouest)
    [[-10.9, 4.6], [-8.0, 8.2]].forEach(function (p) { cube(pav, p[0], 0, p[1], 0.1, 3.2, 0.1, 0, '#ffffff'); mo.colliders.push({ x: p[0], z: p[1], r: 0.1 }); });
    // cordon rouge et potelets chromés à la sortie de l'ascenseur
    (function () {
      var pts = [[3.2, -8.0], [3.2, -6.6], [4.4, -5.6]];
      pts.forEach(function (p) {
        cube(pav, p[0], 0, p[1], 0.28, 0.04, 0.28, 0, '#c9ced6');
        forme(pav, new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), '#d9dee6', p[0], 0.48, p[1]);
        forme(pav, new THREE.SphereGeometry(0.06, 8, 6), '#e9edf2', p[0], 0.98, p[1]);
        mo.colliders.push({ x: p[0], z: p[1], r: 0.15 });
      });
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        for (var k = 0; k < 22; k++) {
          var u = (k + 0.5) / 22, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, y = 0.9 - Math.sin(u * Math.PI) * 0.22;
          forme(pav, new THREE.SphereGeometry(0.035, 5, 4), '#c8304a', x, y, z, 0, 1, 1, 1);
        }
        mo.colliders.push({ rect: true, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hx: 0.08, hz: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, a: -Math.atan2(b[0] - a[0], b[1] - a[1]) });
      }
    })();
    var pavM = pav.maille(); pavM.castShadow = true; G.add(pavM);
    var enseigne = AV.outils.panneau('🍸 Le Bar · L\'Arbre Blanc', '#2b2440', '#ffd27a', 3.6, 0.55);
    enseigne.position.set(PX0 - 0.25, PH - 0.45, 0); enseigne.rotation.y = -Math.PI / 2; G.add(enseigne);
    var ardoise = AV.outils.panneau('Ce soir : Picpoul de Pinet 🥂', '#1f2a24', '#ffffff', 2.6, 0.5);
    ardoise.position.set(9.12, 2.55, 0); ardoise.rotation.y = -Math.PI / 2; G.add(ardoise);
    var lumBar = mo.lumiere('#ffc27a', 0.9, 9, XC + 1.2, 2.6, 0);

    // ---------- Mobilier : salon, tables, oliviers, guirlandes ----------
    function salon(x, z, rot) {
      var g = new THREE.Group();
      g.add(boite(2.4, 0.4, 0.85, '#f4f1ea', 0, 0.2, 0));
      g.add(boite(2.4, 0.45, 0.2, '#f4f1ea', 0, 0.62, -0.33));
      [-0.6, 0.6].forEach(function (c, i) { g.add(boite(1.0, 0.14, 0.7, i ? '#e0a55a' : '#d9775a', c, 0.47, 0.03)); });
      g.add(boite(0.9, 0.35, 0.6, '#c9b59a', 0, 0.18, 1.1));
      var bg = bougie(); bg.position.set(0.2, 0.4, 1.1); g.add(bg);
      g.position.set(x, 0, z); g.rotation.y = rot; G.add(g);
      mo.colliders.push({ rect: true, x: x, z: z, hx: 1.25, hz: 0.5, a: -rot });
      var tb = g.localToWorld(new THREE.Vector3(0, 0, 1.1));
      mo.colliders.push({ x: tb.x, z: tb.z, r: 0.45 });
    }
    salon(-2.5, -9.6, 0.25);
    salon(-8.0, -6.6, 0.9);
    function tableVide(x, z) {
      var t = tableBistrot(0.7, 0.7); t.position.set(x, 0, z); G.add(t);
      [-1, 1].forEach(function (c) { var ch = chaise('#c8643c'); ch.position.set(x + c * 0.65, 0, z); ch.rotation.y = -c * Math.PI / 2; G.add(ch); });
      var bg = bougie(); bg.position.set(x, 0.77, z); G.add(bg);
      mo.colliders.push({ rect: true, x: x, z: z, hx: 0.95, hz: 0.4, a: 0 });
      // des gens attablés (l'apéro du rooftop)
      [-1, 1].forEach(function (c) {
        var femme = rng() < 0.5;
        var cv = convive({ peau: AV.choisir(rng, PEAUX_R), cheveux: AV.choisir(rng, CHEV_R), longs: femme && rng() < 0.8, haut: AV.choisir(rng, HAUTS_R), bas: AV.choisir(rng, ['#3b3550', '#2f3b52', '#c8b48a', '#4a4a58', '#e8e2d4']) });
        cv.groupe.position.set(x + c * 0.65, 0, z); cv.groupe.rotation.y = -c * Math.PI / 2; G.add(cv.groupe);
        var vv = verreVin(true); vv.position.set(x + c * 0.2, 0.765, z + (rng() - 0.5) * 0.2); G.add(vv);
        autres.push({ c: cv, ph: rng() * 10, cote: c });
      });
    }
    var autres = [], PEAUX_R = ['#f2c9a0', '#eec29a', '#e0ad84', '#c98f62', '#8d5a3b'], CHEV_R = ['#2b1d14', '#5a3420', '#8a5a2a', '#d9b26a', '#1a1a1a', '#a0a0a0'];
    var HAUTS_R = ['#e07a9a', '#4a7bd1', '#f3c34b', '#3f8f6b', '#ffffff', '#d94a4a', '#7a5ac8', '#4ab0c8', '#f08a4a', '#2b2b38'];
    tableVide(1.5, 9.8); tableVide(4.6, 8.2); tableVide(-1.8, 2.5);
    function olivier(x, z) {
      var g = new THREE.Group();
      g.add(boite(1.0, 0.8, 1.0, '#ffffff', 0, 0.4, 0));
      var tr = AV.maille(new THREE.CylinderGeometry(0.08, 0.14, 1.2, 5), '#6b5a48'); tr.position.y = 1.3; tr.rotation.z = 0.15; g.add(tr);
      for (var i = 0; i < 4; i++) { var f = AV.maille(new THREE.IcosahedronGeometry(AV.entre(rng, 0.45, 0.65), 0), AV.choisir(rng, ['#93a07e', '#a2ad8c', '#8a9775'])); f.position.set((rng() - 0.5) * 0.8, 1.9 + rng() * 0.5, (rng() - 0.5) * 0.8); g.add(f); }
      g.position.set(x, 0, z); G.add(g);
      mo.colliders.push({ rect: true, x: x, z: z, hx: 0.55, hz: 0.55, a: 0 });
      mo.bloqueurs.push(g.children[0]);
    }
    olivier(-10.6, -2.0); olivier(10.6, 5.6); olivier(0.5, -11.6); olivier(-3.2, 11.4); olivier(9.8, -5.8);
    // mât central et guirlandes lumineuses
    var mat = boite(0.12, 4.6, 0.12, '#d8dce2', 0, 2.3, 0); G.add(mat); mo.colliders.push({ x: 0, z: 0, r: 0.12 });
    var pts = [];
    for (var gi = 0; gi < 8; gi++) {
      var ag = gi / 8 * Math.PI * 2 + 0.2, gx = Math.sin(ag) * 12.2, gz = Math.cos(ag) * 12.2;
      if (gx > 5 && Math.abs(gz) < 5) continue;
      G.add(boite(0.08, 3.0, 0.08, '#d8dce2', gx, 1.5, gz)); mo.colliders.push({ x: gx, z: gz, r: 0.1 });
      pts = pts.concat(AV.outils.guirlandeEntre([0, 4.5, 0], [gx, 3.0, gz], 22, -0.7));
    }
    var guir = AV.outils.guirlande(pts, ['#ffe6a8', '#ffd27a', '#fff3d0']); guir.material.size = 0.28; G.add(guir);
    mo.lumiere('#ffcf8a', 0.5, 14, 0, 4, 0);

    // ---------- Le couple, à une table face au coucher de soleil ----------
    var rotC = Math.atan2(DIR.x, DIR.z);
    var coin = new THREE.Group(); coin.position.set(DIR.x * 10.1, 0, DIR.z * 10.1); coin.rotation.y = rotC; G.add(coin);
    // c'est nous : Axel attend à une table haute, face au coucher de soleil ; le tabouret de gauche est pour Océane
    var HT = 0.32, YT = 0.765 + HT;
    var tc = tableHaute(); tc.position.set(0, 0, 0.55); coin.add(tc);
    var bgc = bougie(); bgc.position.set(0, YT, 0.68); coin.add(bgc);
    var tO = (AV.avatars && AV.avatars.tenue(cfg)) || {}, cO = AV.avatars ? AV.avatars.couleurs : {};
    var couple = [
      { x: -0.4, cote: -1, o: { qui: 'oceane', peau: cO.peauO || '#f2c9a0', cheveux: '#5a3420', longs: true, haut: tO.veste || tO.robe || tO.haut || '#f4eee0', bas: tO.collants || (tO.type === 'robe' ? cO.peauO : tO.bas) || '#3b3550' } },
      { x: 0.4, cote: 1, o: { qui: 'axel', peau: '#eec29a', cheveux: '#2b1d14', longs: false, haut: '#f4f1ea', bas: '#3a4a66' } } // chemise en lin, jean
    ];
    couple.forEach(function (p) {
      var ch = tabouret(); ch.position.set(p.x, 0, 0); coin.add(ch);
      var c = convive(p.o); c.groupe.position.set(p.x, HT, 0.02); coin.add(c.groupe); p.c = c;
      var v = verreVin(false); v.position.set(p.x * 0.6, YT, 0.5); coin.add(v); p.verre = v;
    });
    var elleAssise = couple[0].c.groupe; elleAssise.visible = false;
    var bouteilleC = seauBouteille(); bouteilleC.position.set(0.05, YT, 0.7); bouteilleC.scale.setScalar(0.01); coin.add(bouteilleC);
    coin.updateMatrixWorld(true);
    var centreC = coin.localToWorld(new THREE.Vector3(0, 0, 0.3));
    mo.colliders.push({ rect: true, x: centreC.x, z: centreC.z, hx: 0.95, hz: 0.75, a: -rotC });
    var zoneC = coin.localToWorld(new THREE.Vector3(0, 0, -1.2));
    var tetesC = coin.localToWorld(new THREE.Vector3(0, 2.0, 0.1));

    var bulles = [];
    function bulle(texte, x, y, z, vie, largeur) {
      var s = AV.bulleBD(texte);
      s.position.set(x, y, z); s.userData.vie = vie || 2.8; G.add(s); bulles.push(s);
      return s;
    }
    function coeur() {
      var s = AV.texteSprite('❤', { couleur: '#ff5a7a', largeur: 0.4 });
      s.position.set(tetesC.x + (Math.random() - 0.5) * 0.6, tetesC.y - 0.3, tetesC.z + (Math.random() - 0.5) * 0.6); s.userData.vie = 1.8; G.add(s); bulles.push(s);
    }
    function parler(k, texte, delai, vie) {
      setTimeout(function () {
        var p = couple[k], w = coin.localToWorld(new THREE.Vector3(p.x * 1.1, 1.45 + HT, 0));
        bulle(texte, w.x, w.y, w.z, vie || 2.8, assise ? 2.0 : 2.9);
        p.parle = 1.6;
      }, delai || 0);
    }
    var servi = false;
    // ---------- Rejoindre Axel à la table haute ----------
    var nomLui = cfg.copain || 'Axel', assise = null, dejaVenue = false;
    var CAM_T = { pos: coin.localToWorld(new THREE.Vector3(-1.5, 2.3, 3.7)), cible: coin.localToWorld(new THREE.Vector3(0, 1.6, 0.1)) };
    var DIAL = [[0.4, 1, 'Te voilà ! Regarde-moi ce coucher de soleil ☀️'], [3.0, 0, 'Wouah… on voit jusqu\'à la mer 🌊'], [5.6, 1, 'On se prend un petit verre de blanc ? 🥂'],
      [8.2, 0, 'Je vais commander au bar !'], [10.6, 1, 'Par contre… il n\'y a personne derrière le comptoir 🤔']];
    var DIAL2 = [[0.4, 1, '🥂 Santé mon cœur !'], [2.4, 0, 'Quel coucher de soleil… ❤']];
    var itC = { x: zoneC.x, z: zoneC.z, rayon: 2.2, texte: '🥂 ✋ Rejoindre ' + nomLui, fn: function () { asseoir(); } };
    mo.interactifs.push(itC);
    function asseoir() {
      if (assise) return;
      var J = AV.jeu.joueur();
      assise = { t: 0, k: 0, x: J.groupe.position.x, z: J.groupe.position.z, a: J.angle, lignes: servi ? DIAL2 : (dejaVenue ? null : DIAL) };
      J.groupe.visible = false; elleAssise.visible = true; itC.__x = itC.x; itC.x = 1e6;
      mo.pilote = piloteAssise;
      if (!assise.lignes) parler(1, AV.choisir(Math.random, ['Alors, ce verre ? 😏', '❤', 'Le soleil est presque couché…']) + '  (✋ te lever)', 0, 2.6);
      if (servi) for (var c = 0; c < 5; c++) setTimeout(coeur, 1500 + c * 150);
    }
    function lever() {
      var a = assise; if (!a) return; assise = null; dejaVenue = true;
      mo.pilote = null; elleAssise.visible = false; itC.x = itC.__x;
      var J = AV.jeu.joueur(); J.groupe.visible = true; AV.jeu.placer(a.x, a.z, a.a);
    }
    function piloteAssise(dt, e, appui, joueur, camera) {
      var a = assise; if (!a) return;
      a.t += dt;
      camera.position.lerp(CAM_T.pos, Math.min(1, dt * 3)); camera.lookAt(CAM_T.cible);
      var L = a.lignes;
      if (L) {
        while (a.k < L.length && a.t > L[a.k][0]) { parler(L[a.k][1], L[a.k][2], 0, 2.5); a.k++; }
        var fin = L[L.length - 1][0] + 2.4;
        if (appui && a.t > 1) a.t = a.k < L.length ? L[a.k][0] : Math.max(a.t, fin);
        if (a.t > fin) lever();
      } else if (appui && a.t > 0.4) lever();
    }

    // ---------- La loutre barmaid, derrière le comptoir ----------
    mo.cachettes.push({ x: XC + 0.85, z: ZL, y: 0 });
    mo.zoneAnimal = { x: XC - 1.05, z: ZL, rayon: 1.7, texte: '🦦 Il y a quelqu\'un derrière le comptoir…<br>✋ Commander un verre' };
    var loutre = null, chiffon = null, YVIS = 0.32, YCACHE = -0.75;
    mo.surAnimal = function (a, col) {
      loutre = a;
      a.placer(XC + 0.85, YCACHE, ZL, -Math.PI / 2);
      col.x = XC + 0.85; col.z = ZL;
      chiffon = verreVin(false); chiffon.position.set(0.05, 0.62, 0.32); chiffon.scale.setScalar(1.3); a.m.groupe.add(chiffon);
    };

    var scen = null;
    mo.surTrouve = function (ctx) {
      scen = { ctx: ctx, t: 0, etape: 0 };
      var a = ctx.animal;
      a.tPeur = 0;
      a.base.y = Math.max(a.base.y, YCACHE);
      a.fuite = [{ x: XC + 0.15, y: COMPTOIR, z: ZL }];
      a.regardFinal = -Math.PI / 2;
      if (chiffon) chiffon.visible = false;
      AV.audio.couinement(1);
      a.bulle(ctx.scene, '🦦 Oh ! Bonsoir !', { vie: 1.5 });
      ctx.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, nom + ' saute sur le comptoir… 🍷');
    };
    var verreJ = null, cadeau = null;

    // ---------- Animation ----------
    var tBulle = 4, phrases = ['☀️ Quel coucher de soleil…', 'Regarde, on voit la mer ! 🌊', 'Tu vois la cathédrale ?', '❤', 'Antigone est toute dorée ✨', 'On est bien là…'];
    m_anime();
    function m_anime() {
      mo.anime(function (dt, t, joueur) {
        // bulles et cœurs
        for (var i = bulles.length - 1; i >= 0; i--) {
          var s = bulles[i]; s.userData.vie -= dt; s.position.y += dt * 0.3;
          s.material.opacity = Math.min(1, s.userData.vie * 2);
          if (s.userData.vie <= 0) { G.remove(s); s.material.map.dispose(); s.material.dispose(); bulles.splice(i, 1); }
        }
        // le couple : tête tournée l'un vers l'autre, elle se blottit parfois
        couple.forEach(function (p, k) {
          var tt = p.c.tete, parle = p.parle > 0;
          if (p.parle) p.parle -= dt;
          var regarde = parle || Math.sin(t * 0.5 + k * 2) > 0.5;
          tt.rotation.y = AV.lerp(tt.rotation.y, regarde ? -p.cote * 0.6 : Math.sin(t * 0.3 + k) * 0.15, dt * 3);
          tt.rotation.x = parle ? Math.sin(t * 9 + k) * 0.05 : 0;
          var blotti = k === 0 && Math.sin(t * 0.21) > 0.55;
          p.c.torse.rotation.z = AV.lerp(p.c.torse.rotation.z, blotti ? -0.16 : 0, dt * 1.5);
          tt.rotation.z = AV.lerp(tt.rotation.z, blotti ? -0.3 : 0, dt * 1.5);
          p.c.torse.scale.y = 1 + Math.sin(t * 2.2 + k) * 0.012;
          var vin = p.verre.userData.vin;
          if (servi) { vin.visible = true; vin.scale.y = AV.lerp(vin.scale.y, 1, dt * 2); }
          // ils trinquent de temps en temps une fois servis
          p.c.bras[1 - k].rotation.x = AV.lerp(p.c.bras[1 - k].rotation.x, servi && Math.sin(t * 0.6) > 0.85 ? -1.9 : -1.15, dt * 3);
        });
        if (servi) { var bs = bouteilleC.scale.x; bouteilleC.scale.setScalar(AV.lerp(bs, 1, dt * 4)); }
        var dx = joueur.x - zoneC.x, dz = joueur.z - zoneC.z;
        if (!scen) {
          tBulle -= dt;
          if (tBulle <= 0 && dx * dx + dz * dz < 36 && !assise) { tBulle = 7; parler(1, AV.choisir(Math.random, phrases), 0, 2.6); }
        }
        // les autres clients bavardent
        autres.forEach(function (o) {
          var tt = o.c.tete, ph = t * 0.6 + o.ph, parle = Math.sin(ph) > 0.3;
          tt.rotation.y = AV.lerp(tt.rotation.y, parle ? o.cote * 0.35 : Math.sin(ph * 0.5) * 0.4, dt * 2);
          tt.rotation.x = parle ? Math.sin(t * 9 + o.ph) * 0.05 : 0;
          o.c.bras[1].rotation.x = AV.lerp(o.c.bras[1].rotation.x, Math.sin(ph * 0.37) > 0.8 ? -1.9 : -1.15, dt * 3);
        });
        // étiquettes des lieux : apparaissent quand on regarde depuis le bord
        var rj = Math.sqrt(joueur.x * joueur.x + joueur.z * joueur.z);
        etiquettes.forEach(function (e) {
          var face = rj > 0.1 ? (joueur.x * e.ux + joueur.z * e.uz) / rj : 0;
          var cible = Math.max(0, Math.min(1, (rj - 6.5) / 3)) * Math.max(0, Math.min(1, (face + 0.2) * 2));
          e.s.material.opacity = AV.lerp(e.s.material.opacity, cible * 0.95, dt * 3);
          e.s.visible = e.s.material.opacity > 0.01;
        });
        lumV.material.opacity = 0.55 + Math.sin(t * 0.8) * 0.15;
        guir.material.size = 0.28 + Math.sin(t * 2.5) * 0.04;
        lumBar.intensity = 0.9 + Math.sin(t * 7) * 0.03;

        // la loutre : se cache derrière le comptoir et pointe le bout du museau en essuyant un verre
        if (loutre && !scen) {
          var ph = (t + 2) % 9.5, visible = ph > 5.2;
          loutre.base.y = AV.lerp(loutre.base.y, visible ? YVIS : YCACHE, Math.min(1, dt * 5));
          if (chiffon) { chiffon.rotation.y += dt * 4; chiffon.position.x = 0.05 + Math.sin(t * 6) * 0.04; }
        }
        // scénario : elle sert un verre de blanc, le couple est servi aussi, puis la surprise
        if (!scen) return;
        scen.t += dt;
        var T = scen.t, a = scen.ctx.animal;
        if (scen.etape === 0 && T > 1.2) {
          scen.etape = 1;
          verreJ = verreVin(false); verreJ.position.set(XC - 0.22, COMPTOIR, ZL - 0.35); verreJ.scale.setScalar(0.01); G.add(verreJ);
          cadeau = new THREE.Group();
          cadeau.add(boite(0.28, 0.24, 0.28, '#e23a5a', 0, 0.12, 0));
          cadeau.add(boite(0.3, 0.25, 0.06, '#ffd24a', 0, 0.125, 0));
          cadeau.add(boite(0.06, 0.25, 0.3, '#ffd24a', 0, 0.125, 0));
          cadeau.position.set(XC - 0.2, COMPTOIR, ZL + 0.45); cadeau.scale.setScalar(0.01); G.add(cadeau);
          AV.audio.glouglou();
          a.bulle(scen.ctx.scene, '🍷 Un verre de blanc pour toi !', { vie: 2.4, largeur: 2.8 });
        }
        if (scen.etape >= 1 && verreJ) {
          var k = Math.min(1, (T - 1.2) * 3);
          verreJ.scale.setScalar(Math.max(0.01, k * 1.5));
          var vj = verreJ.userData.vin; vj.visible = true; vj.scale.y = Math.min(1, Math.max(0.001, (T - 1.4) / 0.9));
          cadeau.scale.setScalar(Math.max(0.01, Math.min(1, (T - 1.8) * 3)) * (1 + Math.sin(T * 6) * 0.05));
        }
        if (scen.etape === 1 && T > 2.4) {
          scen.etape = 2;
          a.bulle(scen.ctx.scene, '🎁 …et une surprise avec !', { vie: 2.2, largeur: 2.8 });
          AV.audio.couinement(0.7);
        }
        if (scen.etape === 2 && T > 3.4) {
          scen.etape = 3; servi = true;
          AV.audio.tchin(1);
          parler(1, '🥂 Santé !', 200, 2.2);
          parler(1, 'Merci ' + nom + ' ! ❤', 1100, 2.2);
          for (var c = 0; c < 5; c++) setTimeout(coeur, 300 + c * 160);
        }
        if (scen.etape === 3 && T > 5.0) {
          scen.etape = 4;
          scen.ctx.fin(cfg);
        }
      });
    }

    mo.nettoyer = function () { var J = AV.jeu && AV.jeu.joueur && AV.jeu.joueur(); if (J) J.groupe.visible = true; };
    mo.debug = { couple: couple, verre: function () { return verreJ; }, asseoir: asseoir, lever: lever };
    return mo;
  };
})(window.AV);
