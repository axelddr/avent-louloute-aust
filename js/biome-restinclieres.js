/* Biome « restinclieres » : le château de Restinclières (Prades-le-Lez), un après-midi de printemps.
   Château XVIIe en pierre blonde face au sud, terrasse à balustres, jardin à la française (parterres de buis, bassin et
   fontaine, vases d'Anduze), allée de platanes ; le Pic Saint-Loup au loin derrière le château.
   Sous les platanes : l'atelier de peinture sur céramique. Lui est déjà assis ; ✋ sur la chaise en face pour s'installer.
   Peinture : doigt (ou souris) sur le mug = peindre · glisser à côté = tourner le mug (ou ← →) · palette à gauche,
   outils à droite (pinceau, tampons, gomme, tailles, annuler, tournette, recommencer, fond) · ✅ J'ai fini !
   Ensuite on se tend les mugs (✋), on découvre le sien… et la surprise s'ouvre : ton mug (image à lui envoyer) + son mug. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#5b9be0', bas: '#f4e6c8', brouillard: '#e6dfcc', hemi: ['#fff4e0', '#6b7a50', 0.82], soleil: ['#ffe6bc', 1.0, [-0.45, 0.62, 0.62]] };
  var YT = 1.0;                                    // hauteur de la terrasse du château
  var TX = 21, TZ = -2;                            // la table de l'atelier
  var TH = 0.76;                                   // hauteur du plateau
  var MR = 0.075, MH = 0.16;                       // le mug (un peu plus grand que nature)
  var CW = 1024, CH = 348;                         // la « peau » du mug (circonférence × hauteur, même échelle)
  var CLE = 'av_j15_mug';
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function borne(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Relief : plat dans le domaine, collines de garrigue, Pic Saint-Loup et Hortus au nord ----------
  function sol(x, z) {
    var r = Math.sqrt(x * x + z * z), h = 0;
    h += lisse(60, 320, r) * (14 * (Math.sin(x * 0.013 + 1) * Math.cos(z * 0.011)) + 9 * Math.sin(x * 0.027 - z * 0.019) + 10);
    var dx = x + 260, dz = z + 2300;                 // le Pic : flanc ouest raide, longue crête vers l'est
    h += 330 * Math.exp(-(dz * dz) / (260 * 260)) * (dx < 0 ? Math.exp(-(dx * dx) / (130 * 130)) : Math.exp(-(dx * dx) / (430 * 430)));
    var hx = x + 1000, hz = z + 2250;                // l'Hortus en face, falaise tournée vers le Pic
    h += 170 * Math.exp(-(hz * hz) / (320 * 320)) * lisse(-560, -380, -hx) * lisse(-700, -500, hx);
    return h;
  }
  function H(x, z) {
    var h = sol(x, z);
    if (x >= -15 && x <= 15 && z >= -20 && z <= -14) h = Math.max(h, YT);
    if (x >= -2.6 && x <= 2.6 && z > -14 && z <= -11) h = Math.max(h, YT * (1 - (z + 14) / 3));
    return h;
  }
  function dansJardin(x, z) { return x >= -17 && x <= 17 && z >= -13.5 && z <= 16; }
  function dansAtelier(x, z) { return x >= 16 && x <= 30 && z >= -16 && z <= 18; }
  function dansAllee(x, z) { return Math.abs(x) < 3 && z >= 15 && z <= 50; }
  function couleurSol(x, y, z, ny) {
    var r = Math.sqrt(x * x + z * z);
    if (y > 120) return varier(ny < 0.8 ? '#a6a090' : '#7d8a5a', x, z, 0.1);       // les calcaires du Pic
    if (dansJardin(x, z) || dansAllee(x, z)) return varier('#e3d6b6', x, z, 0.05);  // gravier clair
    if (dansAtelier(x, z)) return varier('#bfa983', x, z, 0.06);                   // terre battue sous les platanes
    if (r < 44) { var k = hash(Math.floor(x / 3), Math.floor(z / 3)); return varier(k > 0.8 ? '#94b25c' : '#86a957', x, z, 0.07); }
    if (z > 50 && z < 230 && Math.abs(x) < 220) return varier('#9a8a62', x, z, 0.08); // la terre des vignes
    return varier(hash(Math.floor(x / 20), Math.floor(z / 20)) > 0.5 ? '#8c9358' : '#7c8a4e', x, z, 0.12);
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

  // ---------- Personnages (lui, l'animatrice, les autres participants) ----------
  function personne(o) {
    o = o || {};
    var peau = o.peau || '#eec29a', haut = o.haut || '#c0392b', bas = o.bas || '#3a4a66', chev = o.cheveux || '#4a3426';
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.15, 0.8, 0.17, bas, 0, -0.4, 0));
      j.add(bm(0.17, 0.1, 0.27, o.chaussures || '#f2f2f2', 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), haut); t.position.y = 1.11; corps.add(t);
    if (o.tablier) corps.add(bm(0.34, 0.5, 0.04, o.tablier, 0, 1.0, 0.235));
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), peau));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), chev); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    if (o.longs) tete.add(bm(0.3, 0.32, 0.1, chev, 0, -0.08, -0.12));
    if (o.chignon) { var cg = AV.maille(new THREE.IcosahedronGeometry(0.08, 0), chev); cg.position.set(0, 0.13, -0.13); tete.add(cg); }
    [-1, 1].forEach(function (c) { var oe = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); oe.position.set(c * 0.06, 0.0, 0.152); tete.add(oe); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: chev });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 6), peau); m.position.y = -0.28; b.add(m);
      var manche = AV.maille(new THREE.CylinderGeometry(0.085, 0.08, 0.2, 6), haut); manche.position.y = -0.08; b.add(manche);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), peau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes };
  }
  function asseoir(p, ySiege) {
    p.groupe.position.y = ySiege - 0.8 + 0.07;
    p.jambes[0].rotation.set(-1.35, 0, 0.05); p.jambes[1].rotation.set(-1.35, 0, -0.05);
    p.corps.rotation.set(0.06, 0, 0);
  }
  function pinceau(couleurPoils) {
    var g = new THREE.Group();
    g.add(bm(0.012, 0.16, 0.012, '#c9a06a', 0, -0.06, 0));
    g.add(bm(0.016, 0.03, 0.016, '#b8bcc2', 0, -0.15, 0));
    g.add(bm(0.014, 0.03, 0.014, couleurPoils || '#3a2a1a', 0, -0.18, 0));
    return g;
  }

  // ---------- Formes des tampons ----------
  function cheminCoeur(x, cx, cy, s) {
    x.beginPath(); x.moveTo(cx, cy + s * 0.35);
    x.bezierCurveTo(cx - s * 0.9, cy - s * 0.25, cx - s * 0.45, cy - s * 0.85, cx, cy - s * 0.38);
    x.bezierCurveTo(cx + s * 0.45, cy - s * 0.85, cx + s * 0.9, cy - s * 0.25, cx, cy + s * 0.35);
    x.closePath();
  }
  function cheminEtoile(x, cx, cy, s) {
    x.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.38 : s * 0.85; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath();
  }
  var TAMPONS = [
    { nom: 'coeur', icone: '❤', dessin: function (x, cx, cy, s, c) { x.fillStyle = c; cheminCoeur(x, cx, cy, s); x.fill(); } },
    { nom: 'etoile', icone: '★', dessin: function (x, cx, cy, s, c) { x.fillStyle = c; cheminEtoile(x, cx, cy, s); x.fill(); } },
    { nom: 'fleur', icone: '✿', dessin: function (x, cx, cy, s, c) {
      x.fillStyle = c;
      for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5; x.beginPath(); x.arc(cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42, s * 0.32, 0, Math.PI * 2); x.fill(); }
      if (x.globalCompositeOperation !== 'destination-out') { x.fillStyle = c === '#f2c230' ? '#f08a24' : '#f2c230'; x.beginPath(); x.arc(cx, cy, s * 0.22, 0, Math.PI * 2); x.fill(); }
    } },
    { nom: 'pois', icone: '●', dessin: function (x, cx, cy, s, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, s * 0.5, 0, Math.PI * 2); x.fill(); } }
  ];
  var COULEURS = ['#1f3f9a', '#3aa6d8', '#2bb3a3', '#3f8f3f', '#9bc53d', '#f2c230', '#f08a24', '#d9362b', '#e86aa6', '#8a4fbf', '#7a4a2a', '#1d1d1f', '#ffffff', '#f7f2e8'];
  var TAILLES = [5, 12, 24];

  // ---------- Le mug (corps texturé par un canvas) ----------
  function creerMug(cv, fond) {
    var g = new THREE.Group();
    var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    var corps = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR * 0.95, MH, 56, 1, true, -Math.PI / 2, Math.PI * 2),
      new THREE.MeshPhongMaterial({ map: tex, shininess: 70, specular: '#555555' }));
    corps.position.y = MH / 2; corps.castShadow = true; g.add(corps);
    var matInt = new THREE.MeshPhongMaterial({ color: fond, shininess: 60, specular: '#444444', side: THREE.BackSide });
    var inter = new THREE.Mesh(new THREE.CylinderGeometry(MR - 0.005, MR * 0.95 - 0.005, MH - 0.004, 40, 1, true), matInt);
    inter.position.y = MH / 2 + 0.002; g.add(inter);
    var matBord = new THREE.MeshPhongMaterial({ color: fond, shininess: 70, specular: '#555555' });
    var bord = new THREE.Mesh(new THREE.TorusGeometry(MR - 0.0025, 0.0029, 6, 48), matBord); bord.rotation.x = Math.PI / 2; bord.position.y = MH; g.add(bord);
    var fondInt = new THREE.Mesh(new THREE.CircleGeometry(MR * 0.95 - 0.004, 32), matBord); fondInt.rotation.x = -Math.PI / 2; fondInt.position.y = 0.01; g.add(fondInt);
    var anse = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 8, 22, Math.PI), matBord);
    anse.rotation.z = Math.PI / 2; anse.position.set(-MR + 0.006, MH * 0.52, 0); anse.castShadow = true; g.add(anse);
    return { groupe: g, corps: corps, tex: tex, teinte: function (c) { matBord.color.set(c); matInt.color.set(c); } };
  }

  // =====================================================================
  AV.biomes.restinclieres = function (cfg) {
    var rng = AV.rng(1515 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 42, hauteur: H, surface: 'gravier', ciel: CIEL, brouillard: [90, 4200],
      depart: { x: 0, z: 31, angle: Math.PI }, theme: 'restinclieres', ambiance: 'cigales'
    });
    mo.loin = 5200;
    mo.sansAnimal = true;
    mo.surfaceA = function (x, z) {
      if (x >= -15 && x <= 15 && z >= -20 && z <= -11) return 'pave';
      return dansJardin(x, z) || dansAllee(x, z) || dansAtelier(x, z) ? 'gravier' : 'herbe';
    };
    var G = mo.groupe;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    var soleilH = AV.halo('#ffe8b0', 240); soleilH.material.fog = false; soleilH.material.opacity = 0.55; G.add(soleilH);
    var dirS = new THREE.Vector3(CIEL.soleil[2][0], CIEL.soleil[2][1], CIEL.soleil[2][2]).normalize();
    var col = mo.colliders;

    // ---------- Terrain ----------
    G.add(terrainZone(0, 0, 130, 104, null));
    G.add(terrainZone(0, -1200, 7000, 190, puitsDans(-62, 62, -62, 62, 6, 4)));

    // ---------- Végétation lointaine : garrigue, ripisylve du Lez, vignes ----------
    var V = new AV.Fusion(), nb = 0;
    function pinParasol(F, x, z, s) {
      var y = sol(x, z), pen = (rng() - 0.5) * 0.25;
      forme(F, new THREE.CylinderGeometry(0.2 * s, 0.32 * s, 8 * s, 6), '#8a5a3a', x, y + 4 * s, z, 0, 1, 1, 1, 0, pen);
      forme(F, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#3e5f34', '#466a38', '#3a5a30']), x - pen * 8 * s, y + 8.6 * s, z, rng() * 3, 3.6 * s, 1.3 * s, 3.6 * s);
      forme(F, new THREE.IcosahedronGeometry(1, 0), '#4c7040', x - pen * 8 * s + 1.2 * s, y + 9.2 * s, z - 0.6 * s, rng() * 3, 2.2 * s, 0.9 * s, 2.2 * s);
    }
    function chene(F, x, z, s) {
      var y = sol(x, z);
      forme(F, new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 2.6 * s, 6), '#6b5038', x, y + 1.3 * s, z, 0, 1, 1, 1);
      forme(F, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4a6436', '#3f5a30', '#55703c']), x, y + 3.4 * s, z, rng() * 3, 2.3 * s, 1.9 * s, 2.3 * s);
      forme(F, new THREE.IcosahedronGeometry(1, 0), '#4f6a3a', x + 1.1 * s, y + 3 * s, z + 0.5 * s, rng() * 3, 1.5 * s, 1.3 * s, 1.5 * s);
    }
    function cypres(F, x, z, s) {
      var y = sol(x, z);
      forme(F, new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.8 * s, 5), '#5a4030', x, y + 0.4 * s, z, 0, 1, 1, 1);
      forme(F, new THREE.ConeGeometry(0.75 * s, 7.5 * s, 7), AV.choisir(rng, ['#2c4a2c', '#2f5030', '#284426']), x, y + 4.4 * s, z, rng() * 3, 1, 1, 1);
    }
    function peuplier(F, x, z, s) {
      var y = sol(x, z);
      forme(F, new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 6 * s, 6), '#b8b2a0', x, y + 3 * s, z, 0, 1, 1, 1);
      forme(F, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#6f9a45', '#7aa24c', '#668f40']), x, y + 8 * s, z, rng() * 3, 2 * s, 5 * s, 2 * s);
    }
    for (var t = 0; t < 9000 && nb < 1900; t++) {
      var x = AV.entre(rng, -1100, 1100), z = AV.entre(rng, -1600, 900), r = Math.sqrt(x * x + z * z);
      if (r < 56) continue;
      if (z > 50 && z < 230 && Math.abs(x) < 220) continue;               // les vignes
      if (Math.abs(x) < 6 && z > 40 && z < 60) continue;                  // l'entrée
      var lez = x > 62 && x < 115;                                         // la ripisylve du Lez, à l'est
      var dens = lez ? 0.95 : 0.35 + 0.35 * (Math.sin(x * 0.01) * Math.cos(z * 0.013) + 0.5);
      if (rng() > dens) continue;
      nb++;
      if (lez) (rng() < 0.5 ? peuplier : chene)(V, x, z, AV.entre(rng, 0.9, 1.4));
      else { var k = rng(); if (k < 0.45) pinParasol(V, x, z, AV.entre(rng, 0.8, 1.2)); else if (k < 0.85) chene(V, x, z, AV.entre(rng, 0.8, 1.3)); else cypres(V, x, z, AV.entre(rng, 0.8, 1.2)); }
    }
    // rangées de vigne au sud du domaine
    for (var vz = 56; vz < 225; vz += 3.2) {
      for (var vx = -210; vx < 210; vx += 14) {
        if (Math.abs(vx + 7) < 9 && vz < 70) continue;
        var cx0 = vx + 7, y0 = sol(cx0, vz);
        forme(V, new THREE.BoxGeometry(13, 0.9, 0.7), AV.choisir(rng, ['#5c7a34', '#66843a', '#56722f']), cx0, y0 + 0.45, vz, 0, 1, 1, 1);
      }
    }
    // le village de Prades-le-Lez au sud-est (tuiles et clocher)
    var Vi = new AV.Fusion();
    for (var m = 0; m < 34; m++) {
      var a2 = rng() * Math.PI * 2, d2 = Math.sqrt(rng()) * 70, hx = 240 + Math.cos(a2) * d2, hz = 260 + Math.sin(a2) * d2;
      var w = AV.entre(rng, 7, 12), dp = AV.entre(rng, 6, 10), hh = AV.entre(rng, 5, 8), ry = rng() * Math.PI, yb = sol(hx, hz);
      forme(Vi, new THREE.BoxGeometry(w, hh, dp), AV.choisir(rng, ['#e8dcc2', '#efe3c8', '#ddcfb2', '#f1e6d0']), hx, yb + hh / 2, hz, ry, 1, 1, 1);
      forme(Vi, new THREE.ConeGeometry(1, 1, 4), AV.choisir(rng, ['#b8623f', '#c06c45', '#a95a3a']), hx, yb + hh + 1, hz, ry + Math.PI / 4, w * 0.74, 2, dp * 0.74);
    }
    var yE = sol(240, 260);
    forme(Vi, new THREE.BoxGeometry(4.5, 20, 4.5), '#e0d2b4', 240, yE + 10, 260, 0.3, 1, 1, 1);
    forme(Vi, new THREE.ConeGeometry(3.4, 5, 4), '#b8623f', 240, yE + 22.5, 260, 0.3 + Math.PI / 4, 1, 1, 1);
    G.add(Vi.maille());
    G.add(V.maille());
    // nuages
    var Nu = new AV.Fusion();
    for (var cn = 0; cn < 12; cn++) {
      var ca = rng() * Math.PI * 2, cd = AV.entre(rng, 600, 1600), cy = AV.entre(rng, 260, 420), ct = AV.entre(rng, 40, 90);
      for (var ci = 0; ci < 6; ci++) forme(Nu, new THREE.IcosahedronGeometry(1, 1), '#ffffff', Math.cos(ca) * cd + AV.entre(rng, -ct, ct), cy + rng() * ct * 0.3, Math.sin(ca) * cd + AV.entre(rng, -ct * 0.6, ct * 0.6), rng() * 3, ct * AV.entre(rng, 0.4, 0.7), ct * AV.entre(rng, 0.25, 0.4), ct * AV.entre(rng, 0.4, 0.7));
    }
    G.add(Nu.maille(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#9a8e86' })));

    // ---------- Le château ----------
    var C = new AV.Fusion();
    var pierre = '#e6d7bc', pierreC = '#efe5d0', tuile = '#b8623f', volet = '#9fb0aa', vitre = '#4a5866', fer = '#2b2b2e';
    var ZF = -20;                                                    // la façade sud
    boite(C, 26, 12.2, 10, pierre, 0, 6.1, -25);                     // corps de logis
    [-10.5, 10.5].forEach(function (px) {                            // pavillons d'angle en léger avant-corps
      boite(C, 5, 13.2, 10.6, pierre, px, 6.6, -25);
      forme(C, new THREE.ConeGeometry(1, 1, 4), tuile, px, 13.2 + 1.6, -25, Math.PI / 4, 5.6 * 0.72, 3.2, 11.2 * 0.72);
      for (var q = 0; q < 12; q++) [-1, 1].forEach(function (s) { boite(C, q % 2 ? 0.5 : 0.8, 0.5, 0.06, pierreC, px + s * (2.5 - (q % 2 ? 0.25 : 0.4)), YT + 0.3 + q * 1.0, -19.68); }); // chaînes d'angle
    });
    boite(C, 3.4, 12.6, 10.3, pierre, 0, 6.3, -25);                  // avant-corps central
    var tri = new THREE.Shape(); tri.moveTo(-1.9, 0); tri.lineTo(1.9, 0); tri.lineTo(0, 1.2); tri.lineTo(-1.9, 0);
    forme(C, new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false }), pierreC, 0, 12.6, -20.3, 0, 1, 1, 1); // fronton
    forme(C, new THREE.ConeGeometry(1, 1, 4), tuile, 0, 12.2 + 1.7, -25, Math.PI / 4, 16.5 * 0.72, 3.4, 10.8 * 0.72);       // toit principal
    boite(C, 26.4, 0.5, 10.4, '#d8c7a7', 0, 12.0, -25);              // génoise
    [-6, 6, -3.5, 3.5].forEach(function (cx, i) { boite(C, 0.9, 2.4, 0.9, pierre, cx, 14.4, i < 2 ? -27 : -23); }); // cheminées
    [4.5, 8.3].forEach(function (by) { boite(C, 26.2, 0.18, 0.1, pierreC, 0, by, ZF + 0.02); }); // bandeaux
    boite(C, 26.2, 0.6, 0.12, '#cdbd9e', 0, YT + 0.1, ZF + 0.02);    // soubassement
    function fenetre(x, y, h, l, balcon, porte) {
      boite(C, l + 0.36, h + 0.36, 0.1, pierreC, x, y + h / 2, ZF + 0.05);
      boite(C, l, h, 0.12, porte ? '#6b4a2e' : vitre, x, y + h / 2, ZF + 0.06);
      if (!porte) { boite(C, 0.06, h, 0.14, '#e8e2d4', x, y + h / 2, ZF + 0.07); boite(C, l, 0.06, 0.14, '#e8e2d4', x, y + h * 0.62, ZF + 0.07); }
      if (!porte) [-1, 1].forEach(function (s) { boite(C, l * 0.52, h, 0.06, volet, x + s * (l * 0.5 + l * 0.29), y + h / 2, ZF + 0.09); });
      if (balcon) { boite(C, l + 0.3, 0.06, 0.06, fer, x, y + 0.85, ZF + 0.3); for (var b = 0; b <= 6; b++) boite(C, 0.03, 0.85, 0.03, fer, x - l / 2 - 0.1 + b * (l + 0.2) / 6, y + 0.42, ZF + 0.3); boite(C, l + 0.4, 0.1, 0.4, pierreC, x, y - 0.05, ZF + 0.2); }
    }
    [-10.5, -6.2, -3.6, 0, 3.6, 6.2, 10.5].forEach(function (fx) {
      var zf = Math.abs(fx) > 9 ? 0.3 : fx === 0 ? 0.15 : 0;
      ZF = -20 + zf;
      fenetre(fx, YT + 0.2, 2.6, 1.2, false, fx === 0);
      fenetre(fx, 5.0, 2.5, 1.15, true, false);
      fenetre(fx, 8.9, 1.5, 1.0, false, false);
      ZF = -20;
    });
    boite(C, 2.2, 0.3, 1.0, pierreC, 0, YT + 0.15, -19.4);           // seuil de la porte
    var Cote = function (zc) { boite(C, 0.1, 2.5, 1.2, vitre, 13.05, 5 + 1.25, zc); [-1, 1].forEach(function (s) { boite(C, 0.06, 2.5, 0.62, volet, 13.08, 6.25, zc + s * 0.95); }); boite(C, 0.1, 2.5, 1.2, vitre, 13.05, YT + 0.2 + 1.3, zc); };
    [-28, -25, -22].forEach(Cote);
    // l'orangerie (communs) à l'ouest
    boite(C, 12, 4.2, 6, pierre, -27, 2.1, -12, 0);
    forme(C, new THREE.ConeGeometry(1, 1, 4), tuile, -27, 4.2 + 1.1, -12, Math.PI / 4, 12.6 * 0.72, 2.2, 6.6 * 0.72);
    for (var oa = 0; oa < 4; oa++) { boite(C, 0.1, 2.6, 1.8, '#5a6a70', -20.95, 1.45, -14.7 + oa * 1.8); }
    col.push({ rect: true, x: -27, z: -12, hx: 6.1, hz: 3.1, a: 0 });
    // la terrasse, ses balustres et l'escalier
    boite(C, 30.4, YT, 6.2, '#d9cbb0', 0, YT / 2, -17);
    function balustrade(x0, z0, x1, z1) {
      var dx = x1 - x0, dz = z1 - z0, l = Math.sqrt(dx * dx + dz * dz), n = Math.round(l / 0.32), ang = Math.atan2(dx, dz);
      for (var i = 0; i <= n; i++) forme(C, new THREE.CylinderGeometry(0.06, 0.08, 0.62, 6), pierreC, x0 + dx * i / n, YT + 0.42, z0 + dz * i / n, 0, 1, 1, 1);
      forme(C, new THREE.BoxGeometry(0.26, 0.1, l), pierreC, (x0 + x1) / 2, YT + 0.78, (z0 + z1) / 2, ang, 1, 1, 1);
      forme(C, new THREE.BoxGeometry(0.26, 0.1, l), '#d6c8aa', (x0 + x1) / 2, YT + 0.06, (z0 + z1) / 2, ang, 1, 1, 1);
    }
    balustrade(-15, -14, -2.7, -14); balustrade(2.7, -14, 15, -14); balustrade(-15, -20, -15, -14); balustrade(15, -20, 15, -14);
    for (var st = 0; st < 5; st++) boite(C, 5.4, YT * (1 - st / 5), 0.6, '#dccfb4', 0, YT * (1 - st / 5) / 2, -13.7 + st * 0.6);
    col.push({ rect: true, x: 0, z: -25, hx: 13.2, hz: 5.4, a: 0 });
    col.push({ rect: true, x: -8.85, z: -14, hx: 6.15, hz: 0.14, a: 0 }, { rect: true, x: 8.85, z: -14, hx: 6.15, hz: 0.14, a: 0 });
    col.push({ rect: true, x: -15, z: -17, hx: 0.14, hz: 3, a: 0 }, { rect: true, x: 15, z: -17, hx: 0.14, hz: 3, a: 0 });
    var chateau = C.maille(); chateau.castShadow = true; chateau.receiveShadow = true; G.add(chateau);

    // ---------- Jardin à la française ----------
    var J2 = new AV.Fusion(), buis = '#2f5a2c', buisC = '#3a6a34', gazon = '#7fae55';
    function vaseAnduze(F, x, y, z, s) {
      forme(F, new THREE.CylinderGeometry(0.34 * s, 0.2 * s, 0.25 * s, 10), '#c49a6c', x, y + 0.12 * s, z, 0, 1, 1, 1);
      forme(F, new THREE.CylinderGeometry(0.52 * s, 0.3 * s, 0.75 * s, 12), AV.choisir(rng, ['#6f7d3c', '#7a6a34', '#6a7a46']), x, y + 0.62 * s, z, 0, 1, 1, 1); // vernissé vert et brun
      forme(F, new THREE.TorusGeometry(0.46 * s, 0.05 * s, 5, 14), '#c49a6c', x, y + 0.75 * s, z, 0, 1, 1, 1, Math.PI / 2, 0);   // la guirlande
      forme(F, new THREE.TorusGeometry(0.52 * s, 0.06 * s, 5, 14), '#b8875a', x, y + 1.0 * s, z, 0, 1, 1, 1, Math.PI / 2, 0);
      forme(F, new THREE.IcosahedronGeometry(0.55 * s, 1), buisC, x, y + 1.45 * s, z, rng() * 3, 1, 1, 1);
      for (var o = 0; o < 4; o++) forme(F, new THREE.IcosahedronGeometry(0.07 * s, 0), '#f2a33a', x + Math.cos(o * 1.6) * 0.45 * s, y + 1.5 * s + (o % 2) * 0.2, z + Math.sin(o * 1.6) * 0.45 * s, 0, 1, 1, 1); // citrons / oranges
    }
    function haie(x0, z0, x1, z1, h, e) {
      var dx = x1 - x0, dz = z1 - z0, l = Math.sqrt(dx * dx + dz * dz);
      forme(J2, new THREE.BoxGeometry(e, h, l), buis, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, Math.atan2(dx, dz), 1, 1, 1);
    }
    function parterre(x0, x1, z0, z1) {
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = x1 - x0, lz = z1 - z0;
      boite(J2, lx - 0.2, 0.06, lz - 0.2, gazon, cx, 0.03, cz);
      haie(x0, z0, x1, z0, 0.5, 0.4); haie(x0, z1, x1, z1, 0.5, 0.4); haie(x0, z0, x0, z1, 0.5, 0.4); haie(x1, z0, x1, z1, 0.5, 0.4);
      // broderie : losange, cercle et volutes de buis
      haie(cx, z0 + 0.9, x1 - 0.9, cz, 0.32, 0.26); haie(x1 - 0.9, cz, cx, z1 - 0.9, 0.32, 0.26); haie(cx, z1 - 0.9, x0 + 0.9, cz, 0.32, 0.26); haie(x0 + 0.9, cz, cx, z0 + 0.9, 0.32, 0.26);
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; forme(J2, new THREE.BoxGeometry(0.26, 0.3, 0.55), buis, cx + Math.cos(a) * 1.4, 0.15, cz + Math.sin(a) * 1.4, -a, 1, 1, 1); }
      for (var c = 0; c < 4; c++) { var sx = c % 2 ? 1 : -1, sz = c < 2 ? 1 : -1; forme(J2, new THREE.IcosahedronGeometry(0.45, 1), buisC, cx + sx * (lx / 2 - 0.7), 0.5, cz + sz * (lz / 2 - 0.7), rng() * 3, 1, 1, 1); }
      forme(J2, new THREE.ConeGeometry(0.6, 2.4, 8), '#2d4f2a', cx, 1.25, cz, 0, 1, 1, 1);           // if taillé en cône
      for (var lv = 0; lv < 14; lv++) { var t2 = lv / 14, px = AV.lerp(x0 + 0.7, x1 - 0.7, t2); [z0 + 0.5, z1 - 0.5].forEach(function (pz) { forme(J2, new THREE.IcosahedronGeometry(0.18, 0), '#9b7fc8', px, 0.18, pz, rng() * 3, 1, 1, 1); }); } // lavandes
      col.push({ rect: true, x: cx, z: cz, hx: lx / 2 + 0.05, hz: lz / 2 + 0.05, a: 0 });
    }
    parterre(-15, -4, -10.5, -2.5); parterre(4, 15, -10.5, -2.5); parterre(-15, -4, 6.5, 14.5); parterre(4, 15, 6.5, 14.5);
    // le bassin et sa fontaine
    var BX = 0, BZ = 2, BR = 3.2;
    for (var bi = 0; bi < 28; bi++) { var ba = bi / 28 * Math.PI * 2; forme(J2, new THREE.BoxGeometry(0.42, 0.5, BR * 2 * Math.PI / 28 + 0.06), pierreC, BX + Math.cos(ba) * BR, 0.25, BZ + Math.sin(ba) * BR, -ba, 1, 1, 1); }
    forme(J2, new THREE.CylinderGeometry(BR - 0.1, BR - 0.1, 0.06, 28), '#5f7a72', BX, 0.04, BZ, 0, 1, 1, 1);
    forme(J2, new THREE.CylinderGeometry(0.22, 0.3, 1.2, 8), pierreC, BX, 0.6, BZ, 0, 1, 1, 1);
    forme(J2, new THREE.CylinderGeometry(0.9, 0.25, 0.3, 12), pierreC, BX, 1.3, BZ, 0, 1, 1, 1);
    forme(J2, new THREE.CylinderGeometry(0.12, 0.16, 0.5, 6), pierreC, BX, 1.65, BZ, 0, 1, 1, 1);
    col.push({ x: BX, z: BZ, r: BR + 0.25 });
    var eauB = new THREE.Mesh(new THREE.CircleGeometry(BR - 0.15, 28), new THREE.MeshPhongMaterial({ color: '#7fb6c4', transparent: true, opacity: 0.82, shininess: 90, specular: '#ffffff' }));
    eauB.rotation.x = -Math.PI / 2; eauB.position.set(BX, 0.38, BZ); G.add(eauB);
    var eauV = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), eauB.material); eauV.rotation.x = -Math.PI / 2; eauV.position.set(BX, 1.43, BZ); G.add(eauV);
    // vases d'Anduze : terrasse, escalier, coins des parterres
    [[-3.3, YT, -14.6], [3.3, YT, -14.6], [-14.3, YT, -14.6], [14.3, YT, -14.6], [-3.2, 0, -10.2], [3.2, 0, -10.2], [-3.2, 0, 14.6], [3.2, 0, 14.6]].forEach(function (v) {
      vaseAnduze(J2, v[0], v[1], v[2], 0.95); if (v[1] === 0) col.push({ x: v[0], z: v[2], r: 0.55 });
    });
    // cyprès et oliviers autour du jardin, allée d'entrée bordée de cyprès
    [[-18, -13], [18, -13], [-18.5, 16], [-21, 4], [-21, -4]].forEach(function (p) { cypres(J2, p[0], p[1], 1.05); col.push({ x: p[0], z: p[1], r: 0.7 }); });
    for (var az = 20; az <= 40; az += 4) [-4, 4].forEach(function (ax) { cypres(J2, ax, az, 0.95); col.push({ x: ax, z: az, r: 0.65 }); });
    function olivier(F, x, z, s) {
      var y = sol(x, z);
      forme(F, new THREE.CylinderGeometry(0.2 * s, 0.35 * s, 1.8 * s, 6), '#7a6a58', x, y + 0.9 * s, z, 0, 1, 1, 1, 0.12, 0.1);
      [[0, 2.4, 0, 1.4], [0.9, 2.1, 0.5, 1], [-0.8, 2.2, -0.4, 1.05]].forEach(function (b) { forme(F, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#8a9a6a', '#93a273', '#7f9062']), x + b[0] * s, y + b[1] * s, z + b[2] * s, rng() * 3, b[3] * s, b[3] * s * 0.7, b[3] * s); });
      col.push({ x: x, z: z, r: 0.35 * s + 0.05 });
    }
    olivier(J2, -9, 22, 1.1); olivier(J2, 10, 24, 1); olivier(J2, -14, 30, 1.2); olivier(J2, 13, 33, 1.1); olivier(J2, -24, 18, 1);
    pinParasol(J2, -30, 10, 1.1); col.push({ x: -30, z: 10, r: 0.4 }); pinParasol(J2, -26, 28, 1); col.push({ x: -26, z: 28, r: 0.4 });
    pinParasol(J2, 33, 22, 1.05); col.push({ x: 33, z: 22, r: 0.4 }); chene(J2, -32, -22, 1.2); col.push({ x: -32, z: -22, r: 0.4 });
    chene(J2, 26, -24, 1.1); col.push({ x: 26, z: -24, r: 0.35 }); pinParasol(J2, -16, -32, 1.2); pinParasol(J2, 16, -34, 1.1);
    // le mur du domaine et le portail (ouvert)
    for (var mw = 0; mw < 120; mw++) {
      var ma = mw / 120 * Math.PI * 2, mx = Math.sin(ma) * 43.6, mz = Math.cos(ma) * 43.6;
      if (Math.abs(mx) < 3.4 && mz > 0) continue;
      forme(J2, new THREE.BoxGeometry(2.4, 1.5, 0.5), AV.choisir(rng, ['#cfc0a2', '#c6b696', '#d6c8ab']), mx, sol(mx, mz) + 0.75, mz, ma, 1, 1, 1);
    }
    [-3.6, 3.6].forEach(function (gx) {
      boite(J2, 0.9, 3, 0.9, pierreC, gx, 1.5, 43.6); forme(J2, new THREE.SphereGeometry(0.4, 8, 6), pierreC, gx, 3.4, 43.6, 0, 1, 1, 1);
      for (var gb = 0; gb < 8; gb++) boite(J2, 0.04, 2.2, 0.04, fer, gx + (gx < 0 ? 1 : -1) * 0.2, 1.1, 43.4 - 0.25 - gb * 0.32);
      boite(J2, 0.05, 0.06, 2.6, fer, gx + (gx < 0 ? 1 : -1) * 0.2, 2.2, 42.1);
    });
    var jardin = J2.maille(); jardin.castShadow = true; jardin.receiveShadow = true; G.add(jardin);
    var panneau = AV.texteSprite('Château de Restinclières', { fond: 'rgba(90,70,48,.9)', largeur: 3.2, echelle: 0.3 });
    panneau.position.set(-3.6, 4.6, 43.2); G.add(panneau);

    // ---------- L'atelier sous les platanes ----------
    var A = new AV.Fusion();
    function platane(x, z, s) {
      var y = 0;
      forme(A, new THREE.CylinderGeometry(0.34 * s, 0.5 * s, 6.5 * s, 8), '#cbc2a2', x, y + 3.25 * s, z, 0, 1, 1, 1);
      for (var i = 0; i < 9; i++) { var a = rng() * Math.PI * 2, hy = AV.entre(rng, 0.6, 5.5) * s; forme(A, new THREE.BoxGeometry(0.3 * s, 0.4 * s, 0.05), AV.choisir(rng, ['#a39d7f', '#e2dcc4', '#8f9a76']), x + Math.sin(a) * 0.42 * s, y + hy, z + Math.cos(a) * 0.42 * s, a, 1, 1, 1); }
      [[1, 7.5, 0.6], [-1.1, 7.8, -0.4], [0.2, 8.4, 1]].forEach(function (b) { forme(A, new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 3 * s, 6), '#c4bb9c', x + b[0] * 0.6 * s, y + (b[1] - 1.2) * s, z + b[2] * 0.6 * s, 0, 1, 1, 1, b[2] * 0.4, -b[0] * 0.4); });
      [[0, 10, 0, 3.6], [2.4, 9, 1.2, 2.8], [-2.3, 9.2, -1, 2.9], [0.8, 9.4, -2.4, 2.6], [-0.8, 8.8, 2.4, 2.6]].forEach(function (b) { forme(A, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#6f9a45', '#7da84f', '#86ad55', '#749f48']), x + b[0] * s, y + b[1] * s, z + b[2] * s, rng() * 3, b[3] * s, b[3] * s * 0.7, b[3] * s); });
      col.push({ x: x, z: z, r: 0.5 * s + 0.05 });
    }
    for (var pz = -14; pz <= 16; pz += 6) { platane(16.8, pz, AV.entre(rng, 0.95, 1.1)); platane(29, pz + 1, AV.entre(rng, 0.95, 1.1)); }
    var ATR = Math.atan2(-(0 - TX), -(-25 - TZ));          // elle regarde le château, lui lui fait face
    var atelier = new THREE.Group(); atelier.position.set(TX, 0, TZ); atelier.rotation.y = ATR; G.add(atelier);
    function L(lx, lz) { var c = Math.cos(ATR), s = Math.sin(ATR); return { x: TX + lx * c + lz * s, z: TZ - lx * s + lz * c }; }
    // la table et ses chaises (repère local : elle en +z, lui en -z)
    var T = new AV.Fusion(), bistrot = '#5d7d6a';
    function table(Fu, ox, oz) {
      boite(Fu, 1.5, 0.05, 1.0, '#b08a5a', ox, TH - 0.025, oz);
      boite(Fu, 1.44, 0.006, 0.94, '#d8bd8e', ox, TH + 0.003, oz);                                  // papier kraft
      [[-0.65, -0.42], [0.65, -0.42], [-0.65, 0.42], [0.65, 0.42]].forEach(function (p) { boite(Fu, 0.05, TH - 0.05, 0.05, '#7a5a3a', ox + p[0], (TH - 0.05) / 2, oz + p[1]); });
    }
    function chaise(Fu, ox, oz, dir) {
      boite(Fu, 0.44, 0.04, 0.42, bistrot, ox, 0.45, oz);
      boite(Fu, 0.44, 0.42, 0.04, bistrot, ox, 0.72, oz + dir * 0.2);
      for (var b = 0; b < 3; b++) boite(Fu, 0.42, 0.03, 0.03, '#4c6b58', ox, 0.62 + b * 0.12, oz + dir * 0.21);
      [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].forEach(function (p) { boite(Fu, 0.03, 0.45, 0.03, '#4c6b58', ox + p[0], 0.225, oz + p[1]); });
    }
    table(T, 0, 0); chaise(T, 0, 0.86, 1); chaise(T, -0.1, -0.66, -1);
    // pots de peinture, pinceaux, eau, palette, éponge
    var potsC = ['#1f3f9a', '#3aa6d8', '#2bb3a3', '#3f8f3f', '#f2c230', '#f08a24', '#d9362b', '#e86aa6', '#8a4fbf', '#1d1d1f'];
    potsC.forEach(function (pc, i) {
      var px = -0.66 + (i % 5) * 0.075, pzz = -0.02 + Math.floor(i / 5) * 0.08;
      forme(T, new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10), '#f4f4f4', px, TH + 0.02, pzz, 0, 1, 1, 1);
      forme(T, new THREE.CylinderGeometry(0.022, 0.022, 0.005, 10), pc, px, TH + 0.042, pzz, 0, 1, 1, 1);
    });
    forme(T, new THREE.CylinderGeometry(0.04, 0.035, 0.11, 10), '#c9dfe6', 0.5, TH + 0.055, 0.0, 0, 1, 1, 1);           // pot à pinceaux
    for (var pi = 0; pi < 5; pi++) forme(T, new THREE.BoxGeometry(0.008, 0.2, 0.008), '#c9a06a', 0.5 + (pi - 2) * 0.012, TH + 0.14, (pi % 2) * 0.012, 0, 1, 1, 1, (pi - 2) * 0.08, (pi - 2) * 0.12);
    forme(T, new THREE.CylinderGeometry(0.045, 0.04, 0.09, 12), '#bcd8e8', 0.5, TH + 0.045, 0.24, 0, 1, 1, 1);          // verre d'eau
    forme(T, new THREE.CylinderGeometry(0.1, 0.1, 0.008, 16), '#ffffff', -0.45, TH + 0.004, 0.3, 0, 1, 1, 1);           // palette
    ['#d9362b', '#1f3f9a', '#f2c230', '#2bb3a3'].forEach(function (pc, i) { forme(T, new THREE.CylinderGeometry(0.018, 0.018, 0.004, 8), pc, -0.45 + Math.cos(i * 1.5) * 0.055, TH + 0.01, 0.3 + Math.sin(i * 1.5) * 0.055, 0, 1, 1, 1); });
    boite(T, 0.07, 0.03, 0.05, '#f2d64b', 0.38, TH + 0.015, 0.36);                                                       // éponge
    forme(T, new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20), '#8d9399', 0, TH + 0.006, 0.2, 0, 1, 1, 1);               // tournette (socle)
    forme(T, new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20), '#8d9399', -0.22, TH + 0.006, -0.22, 0, 1, 1, 1);
    var tableM = T.maille(); tableM.castShadow = true; tableM.receiveShadow = true; atelier.add(tableM);
    col.push({ rect: true, x: TX, z: TZ, hx: 0.78, hz: 0.52, a: -ATR });
    var pC = L(-0.1, -0.66); col.push({ x: pC.x, z: pC.z, r: 0.3 });
    // la deuxième table (deux participantes) et le coin de l'animatrice : étagère de mugs, four, chevalet
    var T2X = 23.6, T2Z = 5.2, T2 = new AV.Fusion();
    table(T2, 0, 0); chaise(T2, -0.35, 0.66, 1); chaise(T2, 0.35, -0.66, -1);
    [-0.35, 0.35].forEach(function (ox, i) { forme(T2, new THREE.CylinderGeometry(MR, MR * 0.95, MH, 12), i ? '#f6d1dc' : '#cfe6f2', ox * 0.6, TH + MH / 2, i ? -0.2 : 0.2, 0, 1, 1, 1); });
    potsC.slice(0, 6).forEach(function (pc, i) { forme(T2, new THREE.CylinderGeometry(0.025, 0.025, 0.045, 10), pc, -0.6 + i * 0.07, TH + 0.022, 0, 0, 1, 1, 1); });
    var t2M = T2.maille(); t2M.castShadow = true; t2M.position.set(T2X, 0, T2Z); t2M.rotation.y = ATR; G.add(t2M);
    col.push({ rect: true, x: T2X, z: T2Z, hx: 0.78, hz: 0.95, a: -ATR });
    var E = new AV.Fusion();
    boite(E, 1.6, 1.6, 0.4, '#a77b4f', 0, 0.8, 0); for (var et = 0; et < 4; et++) boite(E, 1.6, 0.04, 0.42, '#8a603c', 0, 0.05 + et * 0.5, 0);
    for (var mg = 0; mg < 18; mg++) { var ex = -0.62 + (mg % 6) * 0.25, ey = 0.07 + Math.floor(mg / 6) * 0.5; forme(E, new THREE.CylinderGeometry(MR, MR * 0.95, MH, 10), mg % 5 === 0 ? '#cfe6f2' : '#f7f2e8', ex, ey + MH / 2, 0, 0, 1, 1, 1); }
    boite(E, 0.8, 0.9, 0.8, '#9aa0a6', 1.6, 0.45, 0.25); boite(E, 0.6, 0.04, 0.05, '#5a6066', 1.6, 0.75, 0.66); forme(E, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), '#d9362b', 1.85, 0.6, 0.66, 0, 1, 1, 1, Math.PI / 2, 0); // le four
    var etagere = E.maille(); etagere.castShadow = true; etagere.position.set(26.8, 0, -3.6); etagere.rotation.y = -Math.PI / 2 + 0.3; G.add(etagere);
    etagere.updateMatrixWorld(true);
    [[-0.45, 0], [0.45, 0], [1.6, 0.25]].forEach(function (p) { var w = etagere.localToWorld(new THREE.Vector3(p[0], 0, p[1])); col.push({ x: w.x, z: w.z, r: 0.5 }); });
    var chev = new AV.Fusion();
    [-0.35, 0.35].forEach(function (o) { forme(chev, new THREE.BoxGeometry(0.05, 1.7, 0.05), '#8a603c', o, 0.85, 0, 0, 1, 1, 1, 0, -o * 0.25); });
    boite(chev, 0.9, 0.65, 0.04, '#2f3a33', 0, 1.25, 0.04);
    var chevM = chev.maille(); chevM.position.set(18.6, 0, 3.2); chevM.rotation.y = 1.2; G.add(chevM);
    col.push({ x: 18.6, z: 3.2, r: 0.45 });
    var ardoise = AV.texteSprite('Atelier céramique 🎨', { fond: 'rgba(47,58,51,.95)', largeur: 1.6, echelle: 0.34 });
    ardoise.position.set(18.6, 2.25, 3.2); G.add(ardoise);
    // fanions et guirlande entre les platanes
    var F2 = new AV.Fusion(), fanC = ['#d9362b', '#f2c230', '#3aa6d8', '#2bb3a3', '#e86aa6', '#f08a24'];
    for (var fl = 0; fl < 2; fl++) {
      var fa = { x: 16.8, z: -8 + fl * 12, y: 4.2 }, fb = { x: 29, z: -7 + fl * 12, y: 4.2 };
      for (var fi = 0; fi <= 26; fi++) {
        var k = fi / 26, fx = AV.lerp(fa.x, fb.x, k), fz = AV.lerp(fa.z, fb.z, k), fy = fa.y - Math.sin(k * Math.PI) * 0.9;
        forme(F2, new THREE.BoxGeometry(0.26, 0.26, 0.012), fanC[fi % fanC.length], fx, fy - 0.12, fz, Math.atan2(fb.x - fa.x, fb.z - fa.z) + Math.PI / 2, 1, 1, 1, 0, Math.PI / 4);
      }
    }
    G.add(F2.maille(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    var platanesM = A.maille(); platanesM.castShadow = true; platanesM.receiveShadow = true; G.add(platanesM);

    // ---------- Les mugs ----------
    var cvT = document.createElement('canvas'); cvT.width = CW; cvT.height = CH; var xT = cvT.getContext('2d');   // ses traits
    var cvM = document.createElement('canvas'); cvM.width = CW; cvM.height = CH; var xM = cvM.getContext('2d');   // ce qu'on voit
    var cvGrain = document.createElement('canvas'); cvGrain.width = CW; cvGrain.height = CH;
    (function () { var g = cvGrain.getContext('2d'); for (var i = 0; i < 900; i++) { g.fillStyle = 'rgba(120,100,80,' + (0.05 + Math.random() * 0.08) + ')'; g.fillRect(Math.random() * CW, Math.random() * CH, 1.5, 1.5); } })();
    var fond = '#f7f2e8', sale = false, nbTraits = 0;
    var mugE = creerMug(cvM, fond);
    var ROT0 = -Math.PI / 2 - 0.7, rotMug = ROT0;
    var PE = new THREE.Vector3(0, TH + 0.012, 0.2), PL = new THREE.Vector3(-0.22, TH + 0.012, -0.22);
    mugE.groupe.position.copy(PE); mugE.groupe.rotation.y = rotMug; atelier.add(mugE.groupe);
    function composer() {
      xM.globalCompositeOperation = 'source-over'; xM.fillStyle = fond; xM.fillRect(0, 0, CW, CH);
      xM.drawImage(cvGrain, 0, 0); xM.drawImage(cvT, 0, 0);
      mugE.tex.needsUpdate = true; mugE.teinte(fond); sale = false;
    }
    composer();
    // reprise du mug commencé (sauvegardé dans le navigateur)
    var tSauve = 0;
    function sauver() { try { localStorage.setItem(CLE, JSON.stringify({ fond: fond, traits: cvT.toDataURL('image/png'), n: nbTraits })); } catch (e) { } }
    try {
      var sv = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (sv && sv.traits) { fond = sv.fond || fond; nbTraits = sv.n || 1; var im0 = new Image(); im0.onload = function () { xT.drawImage(im0, 0, 0); composer(); }; im0.src = sv.traits; composer(); }
    } catch (e) { }

    // son mug à lui : dessin par défaut (ou l'image « déroulée » de jours.js), révélé petit à petit pendant qu'il peint
    var cvLF = document.createElement('canvas'); cvLF.width = CW; cvLF.height = CH; var xLF = cvLF.getContext('2d');
    var cvL = document.createElement('canvas'); cvL.width = CW; cvL.height = CH; var xL = cvL.getContext('2d');
    var fondLui = '#fbf6ec', texLui = false, revele = 0;
    function dessinLui() {
      if (texLui) return;
      var x = xLF; x.fillStyle = fondLui; x.fillRect(0, 0, CW, CH); x.drawImage(cvGrain, 0, 0);
      x.fillStyle = '#1f3f9a';
      for (var i = 0; i <= CW; i += 4) { var w = Math.sin(i / CW * Math.PI * 12) * 6; x.fillRect(i, 0, 4, 26 + w); x.fillRect(i, CH - 26 + w, 4, 26 - w); }
      x.fillStyle = '#2bb3a3'; for (var p = 0; p < 26; p++) { x.beginPath(); x.arc(30 + (p % 13) * 18 + (p > 12 ? 9 : 0), 90 + Math.floor(p / 13) * 140 + (p % 2) * 30, 6, 0, Math.PI * 2); x.fill(); }
      for (var p2 = 0; p2 < 26; p2++) { x.beginPath(); x.arc(CW - 30 - (p2 % 13) * 18 - (p2 > 12 ? 9 : 0), 90 + Math.floor(p2 / 13) * 140 + (p2 % 2) * 30, 6, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#c7372f'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 104px Caveat, "Comic Sans MS", cursive'; x.fillText('Pour toi', CW / 2, CH / 2 - 22);
      cheminCoeur(x, CW / 2, CH / 2 + 70, 56); x.fill();
      x.fillStyle = '#e86aa6'; [[CW / 2 - 190, CH / 2 - 60, 30], [CW / 2 + 190, CH / 2 - 40, 26], [CW / 2 - 150, CH / 2 + 70, 22], [CW / 2 + 160, CH / 2 + 80, 30]].forEach(function (c) { cheminCoeur(x, c[0], c[1], c[2]); x.fill(); });
      x.font = '58px serif'; x.fillText('🦘', CW / 2 + 255, CH / 2 + 30); x.fillText('☕', CW / 2 - 255, CH / 2 + 20);
    }
    dessinLui();
    if (document.fonts && document.fonts.load) document.fonts.load('700 104px Caveat').then(function () { dessinLui(); majLui(); }).catch(function () { });
    var cfgML = cfg.mugLui || {};
    if (cfgML.texture) { var imL = new Image(); imL.onload = function () { texLui = true; xLF.drawImage(imL, 0, 0, CW, CH); majLui(); }; imL.src = cfgML.texture; }
    if (cfgML.fond) fondLui = cfgML.fond;
    var bandes = []; for (var bd = 0; bd < 32; bd++) bandes.push(bd); bandes.sort(function () { return Math.random() - 0.5; });
    function majLui() {
      xL.fillStyle = fondLui; xL.fillRect(0, 0, CW, CH); xL.drawImage(cvGrain, 0, 0);
      for (var i = 0; i < Math.min(revele, 32); i++) { var b = bandes[i]; xL.drawImage(cvLF, b * 32, 0, 32, CH, b * 32, 0, 32, CH); }
      mugL.tex.needsUpdate = true;
    }
    var mugL = creerMug(cvL, fondLui);
    mugL.groupe.position.copy(PL); mugL.groupe.rotation.y = Math.PI / 2; atelier.add(mugL.groupe);
    majLui();

    // ---------- Lui, l'animatrice, les autres ----------
    var lui = personne({ qui: 'axel', haut: '#c0392b' }); atelier.add(lui.groupe);
    lui.groupe.position.set(-0.1, 0, -0.72); asseoir(lui, 0.45);
    var pinceauLui = pinceau('#1f3f9a'); pinceauLui.position.y = -0.6; pinceauLui.rotation.x = 1.2; lui.bras[0].add(pinceauLui);
    function poseLuiPeint(t) {
      lui.bras[0].rotation.set(-1.15 + Math.sin(t * 3.1) * 0.08, 0, 0.12 + Math.sin(t * 2.3) * 0.06); // il peint (main droite)
      lui.bras[1].rotation.set(-1.0, 0, -0.05);                                                         // il tient son mug
      lui.tete.rotation.set(regardeElle > 0 ? -0.1 : 0.42, regardeElle > 0 ? 0 : -0.2, 0);
    }
    var regardeElle = 0;
    var anim = personne({ haut: '#f4f1ea', bas: '#46505e', cheveux: '#2a1d16', chignon: true, tablier: '#3a7d6a', peau: '#d9a67c' });
    anim.groupe.position.set(23.9, 0, 0.9); anim.groupe.rotation.y = -2.2; G.add(anim.groupe);
    anim.bras[0].rotation.set(-0.5, 0, 0.1); anim.bras[1].rotation.set(-0.3, 0, -0.1);
    col.push({ x: 23.9, z: 0.9, r: 0.35 });
    var amies = [personne({ haut: '#f2c230', cheveux: '#b07a3a', longs: true, bas: '#5a6a8a' }), personne({ haut: '#5aa0c8', cheveux: '#201812', longs: true, bas: '#2f2f3a', peau: '#c48a5e' })];
    amies.forEach(function (p, i) {
      var g = new THREE.Group(); g.position.set(T2X, 0, T2Z); g.rotation.y = ATR; G.add(g); g.add(p.groupe);
      p.groupe.position.set(i ? 0.35 : -0.35, 0, i ? -0.72 : 0.72); p.groupe.rotation.y = i ? 0 : Math.PI; asseoir(p, 0.45);
      p.bras[0].rotation.set(-1.1, 0, -0.3); p.bras[1].rotation.set(-0.9, 0, 0.3); p.tete.rotation.x = 0.4;
      var pc = pinceau(i ? '#d9362b' : '#2bb3a3'); pc.position.y = -0.6; pc.rotation.x = 1.2; p.bras[0].add(pc);
    });
    // fontaine : jet d'eau en particules
    var NG = 70, posG = new Float32Array(NG * 3), gouttes = [];
    for (var gi = 0; gi < NG; gi++) gouttes.push({ t: Math.random() * 1.2, a: Math.random() * Math.PI * 2, v: 0.6 + Math.random() * 0.5 });
    var geoG = new THREE.BufferGeometry(); geoG.setAttribute('position', new THREE.BufferAttribute(posG, 3));
    var jet = new THREE.Points(geoG, new THREE.PointsMaterial({ color: '#e8f6ff', size: 0.12, map: AV.textureRonde(), transparent: true, depthWrite: false, opacity: 0.85 }));
    jet.frustumCulled = false; G.add(jet);

    // ---------- État ----------
    var etat = 'marche', tEtat = 0, tTotal = 0, api = null, J = null, parole = null, camera = null, fini = false;
    var tournette = false, outil = 'pinceau', iTampon = 0, iTaille = 1, couleur = COULEURS[7], pile = [];
    var tRemarque = 12, tRevele = 2, coeurs = [], tCoeur = 0, repliques = {}, vues = [], composite = null, aCam = 0;
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), cP = new THREE.Vector3(), cL = new THREE.Vector3(), vT = new THREE.Vector3();
    var depE = new THREE.Vector3(), depL = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function tactile() { return document.body.classList.contains('tactile'); }
    function sousTitre() {
      if (!api) return;
      var s = cfg.sousTitre || '';
      if (etat === 'peinture') s = '🎨 Peins ton mug comme tu veux… puis ✅ « J\'ai fini »';
      if (etat === 'tendre' || etat === 'echange' || etat === 'decouverte') s = '🎁 L\'échange des mugs !';
      if (etat === 'final' || etat === 'fini') s = '☕ Un mug chacun… pour penser à l\'autre à chaque café ❤';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }
    function fonduPuis(cb) {
      var fd = document.getElementById('fondu'); fd.classList.add('noir'); var avant = etat; etat = 'transition';
      setTimeout(function () { if (etat !== 'transition') return; etat = avant; cb(); fd.classList.remove('noir'); }, 600);
    }
    function W(lx, ly, lz, out) { return atelier.localToWorld((out || new THREE.Vector3()).set(lx, ly, lz)); }
    function cameraVers(p, l, dt, rate) {
      var k = rate ? 1 - Math.exp(-dt * rate) : 1;
      camPos.lerp(p, k); camLook.lerp(l, k);
      camera.position.copy(camPos); camera.lookAt(camLook);
    }
    function fov(f) { if (camera && camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); } }

    // ---------- Interactions à pied ----------
    var PAROLES = ['Viens t\'asseoir, je t\'ai gardé la place en face 🎨', 'Interdit de regarder mon mug avant la fin 🙈', 'À la fin, on s\'échange les mugs, d\'accord ? ☕', 'Il est beau ce château, hein ? 🏰'];
    var PAROLES_A = ['Bienvenue à l\'atelier ! Installez-vous et peignez ce que vous voulez 🎨', 'Ensuite je les passe au four : les couleurs deviendront brillantes ✨', 'Astuce : avec la tournette 🔄, on fait de jolies rayures bien droites !'];
    var iP = 0, iA = 0;
    var cS = L(0, 1.35), cLu = L(-0.1, -1.35);
    var itChaise = { x: cS.x, z: cS.z, rayon: 1.0, texte: '🎨 ✋ T\'asseoir et peindre ton mug', fn: function () { fonduPuis(entrerPeinture); } };
    var itLui = { x: cLu.x, z: cLu.z, rayon: 1.5, texte: '💬 ✋ Parler à ' + nomLui, fn: function () { itLui.texte = '<b>' + nomLui + ' :</b> ' + PAROLES[iP % PAROLES.length] + ' · ✋'; iP++; AV.audio.clic(); } };
    var itAnim = { x: 23.9 + Math.sin(-2.2) * 0.9, z: 0.9 + Math.cos(-2.2) * 0.9, rayon: 1.4, texte: '💬 ✋ Parler à l\'animatrice', fn: function () { itAnim.texte = '<b>L\'animatrice :</b> ' + PAROLES_A[iA % PAROLES_A.length] + ' · ✋'; iA++; AV.audio.clic(); } };
    var itFontaine = { x: BX, z: BZ, rayon: BR + 1.1, texte: '🪙 ✋ Faire un vœu dans la fontaine', fn: function () { AV.audio.plouf(0.6); dire('🪙 Plouf ! Un vœu secret… 🤫✨', 3); } };
    var itPorte = { x: 0, z: -19, rayon: 1.6, texte: '🚪 La porte du château est fermée… l\'atelier est dehors, sous les platanes 😉', fn: null };
    function interactifsMarche() { mo.interactifs = fini ? [itLui, itAnim, itFontaine, itPorte] : [itChaise, itLui, itAnim, itFontaine, itPorte]; }
    interactifsMarche();
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'marche') {
        [itLui, itAnim].forEach(function (it) { if (Math.abs(p.x - it.x) > 3 || Math.abs(p.z - it.z) > 3) it.texte = it === itLui ? '💬 ✋ Parler à ' + nomLui : '💬 ✋ Parler à l\'animatrice'; });
        if (fini) return null;
        if (p.x < 15) return '🎨 L\'atelier céramique est sous les platanes, à droite du jardin ➡';
        return '🎨 Ta chaise t\'attend, en face de ' + nomLui;
      }
      if (etat === 'peinture') {
        if (tEtat < 9) return tactile() ? '🖌️ Peins avec le doigt sur le mug · glisse à côté pour le tourner' : '🖌️ Clique-glisse sur le mug pour peindre · à côté (ou ← →) pour le tourner';
        return null;
      }
      if (etat === 'tendre') return tactile() ? '🎁 ✋ Tends-lui ton mug !' : '🎁 E (ou ✋) : tends-lui ton mug !';
      if (etat === 'fini') return '✋ pour te lever';
      return null;
    };

    // ---------- Peinture : dessin sur la « peau » du mug ----------
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function toucheMug(cx, cy) {
      if (!camera) return null;
      ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var h = ray.intersectObject(mugE.corps, false)[0];
      return h && h.uv ? { x: h.uv.x * CW, y: (1 - h.uv.y) * CH } : null;
    }
    function memoriser() { try { pile.push({ img: xT.getImageData(0, 0, CW, CH), fond: fond }); if (pile.length > 12) pile.shift(); } catch (e) { } }
    function annuler() { var p = pile.pop(); if (!p) { AV.audio.erreur(); return; } xT.putImageData(p.img, 0, 0); fond = p.fond; sale = true; AV.audio.clic(); tSauve = 0.5; }
    function style() {
      xT.globalCompositeOperation = outil === 'gomme' ? 'destination-out' : 'source-over';
      xT.strokeStyle = couleur; xT.lineWidth = TAILLES[iTaille] * (outil === 'gomme' ? 1.6 : 1); xT.lineCap = 'round'; xT.lineJoin = 'round'; xT.globalAlpha = outil === 'gomme' ? 1 : 0.94;
    }
    function point(p) {
      style();
      if (outil === 'tampon') { var s = Math.max(22, TAILLES[iTaille] * 3); [-CW, 0, CW].forEach(function (o) { TAMPONS[iTampon].dessin(xT, p.x + o, p.y, s, couleur); }); AV.audio.tampon(); }
      else { xT.fillStyle = couleur; [-CW, 0, CW].forEach(function (o) { xT.beginPath(); xT.arc(p.x + o, p.y, xT.lineWidth / 2, 0, Math.PI * 2); xT.fill(); }); }
      xT.globalAlpha = 1; xT.globalCompositeOperation = 'source-over'; sale = true;
    }
    function ligne(a, b) {
      style();
      var ax = a.x, dx = b.x - a.x; if (dx > CW / 2) ax += CW; else if (dx < -CW / 2) ax -= CW;
      [-CW, 0, CW].forEach(function (o) { xT.beginPath(); xT.moveTo(ax + o, a.y); xT.lineTo(b.x + o, b.y); xT.stroke(); });
      xT.globalAlpha = 1; xT.globalCompositeOperation = 'source-over'; sale = true;
    }
    var trait = null, tourne = null, tSon = 0;
    function surDown(e) {
      e.preventDefault(); if (etat !== 'peinture' || dialogue) return;
      try { surf.setPointerCapture(e.pointerId); } catch (er) { }
      var p = toucheMug(e.clientX, e.clientY);
      if (p) {
        memoriser(); nbTraits++; trait = { id: e.pointerId, der: p }; point(p);
        if (outil === 'tampon') trait.der = null;
      } else tourne = { id: e.pointerId, x: e.clientX };
    }
    function surMove(e) {
      if (trait && e.pointerId === trait.id && outil !== 'tampon') {
        var p = toucheMug(e.clientX, e.clientY);
        if (p && trait.der) { ligne(trait.der, p); tSon -= 1; if (tSon <= 0) { tSon = 6; AV.audio.pinceau(0.7); } }
        trait.der = p;
      } else if (tourne && e.pointerId === tourne.id) { rotMug -= (e.clientX - tourne.x) * 0.011; tourne.x = e.clientX; }
    }
    function surUp(e) {
      if (trait && e.pointerId === trait.id) { trait = null; tSauve = 1.2; }
      if (tourne && e.pointerId === tourne.id) tourne = null;
    }

    // ---------- Interface de l'atelier ----------
    var css = null, surf = null, pG = null, pD = null, bFini = null, dialogue = null, boutonsOutils = {}, boutonsTaille = [], boutonsCouleur = [];
    function installerCSS() {
      if (css) return;
      css = document.createElement('style');
      css.textContent = [
        'body.atelier #hud-boutons, body.atelier #joystick, body.atelier #hud-aide-clavier { display: none !important; }',
        'body.atelier #hud-message { bottom: auto; top: max(96px, calc(env(safe-area-inset-top) + 84px)); }',
        '.atl-surface { position: fixed; inset: 0; z-index: 3; touch-action: none; cursor: crosshair; }',
        '.atl-panneau { position: fixed; z-index: 3; top: 54%; transform: translateY(-50%); background: rgba(255,250,240,.9); border-radius: 22px; padding: 9px; box-shadow: 0 6px 20px rgba(0,0,0,.25); display: grid; gap: 7px; grid-template-columns: repeat(2, 44px); font-family: Nunito, sans-serif; touch-action: none; }',
        '.atl-g { left: max(12px, env(safe-area-inset-left)); } .atl-d { right: max(12px, env(safe-area-inset-right)); }',
        '.atl-c { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); cursor: pointer; padding: 0; }',
        '.atl-c.on { outline: 3px solid #1b2340; outline-offset: 2px; }',
        '.atl-b { width: 44px; height: 44px; border-radius: 14px; border: none; background: #fff; font-size: 21px; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.2); display: flex; align-items: center; justify-content: center; padding: 0; color: #1b2340; font-weight: 900; }',
        '.atl-b.on { background: #ffd98a; box-shadow: inset 0 0 0 3px #e0a030; }',
        '.atl-large { grid-column: span 2; width: auto; font-size: 14px; gap: 4px; }',
        '.atl-titre { grid-column: span 2; text-align: center; font-size: 12px; font-weight: 900; color: #6b5a44; letter-spacing: .5px; text-transform: uppercase; }',
        '.atl-fini { position: fixed; z-index: 3; right: max(22px, env(safe-area-inset-right)); bottom: max(22px, env(safe-area-inset-bottom)); padding: 14px 24px; border-radius: 30px; border: none; background: #3f8f6b; color: #fff; font: 900 19px Nunito, sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.3); cursor: pointer; }',
        '.atl-dialogue { position: fixed; z-index: 6; left: 50%; top: 50%; transform: translate(-50%,-50%); background: #fffaf0; border-radius: 24px; padding: 22px 26px; text-align: center; font-family: Nunito, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,.35); max-width: min(86vw, 420px); color: #1b2340; }',
        '.atl-dialogue p { font-size: 19px; font-weight: 700; margin: 0 0 16px; } .atl-dialogue button { margin: 5px; padding: 12px 18px; border-radius: 22px; border: none; font: 900 16px Nunito, sans-serif; cursor: pointer; }',
        '.atl-oui { background: #3f8f6b; color: #fff; } .atl-non { background: #eee4d6; color: #1b2340; }'
      ].join('\n');
      document.head.appendChild(css);
    }
    function bouton(parent, cls, html, titre, fn) {
      var b = document.createElement('button'); b.className = cls; b.innerHTML = html; if (titre) b.title = titre;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); fn(b); });
      parent.appendChild(b); return b;
    }
    function majOutils() {
      Object.keys(boutonsOutils).forEach(function (k) { boutonsOutils[k].classList.toggle('on', outil === k); });
      boutonsOutils.tampon.innerHTML = '<span style="color:' + (couleur === '#ffffff' || couleur === '#f7f2e8' ? '#c9b89a' : couleur) + '">' + TAMPONS[iTampon].icone + '</span>';
      boutonsTaille.forEach(function (b, i) { b.classList.toggle('on', i === iTaille); });
      boutonsCouleur.forEach(function (b) { b.classList.toggle('on', b.dataset.c === couleur); });
      if (bTour) bTour.classList.toggle('on', tournette);
    }
    var bTour = null, bRaz = null, razArme = 0;
    function construireUI() {
      installerCSS(); document.body.classList.add('atelier');
      surf = document.createElement('div'); surf.className = 'atl-surface'; document.body.appendChild(surf);
      surf.addEventListener('pointerdown', surDown); surf.addEventListener('pointermove', surMove);
      surf.addEventListener('pointerup', surUp); surf.addEventListener('pointercancel', surUp);
      pG = document.createElement('div'); pG.className = 'atl-panneau atl-g'; document.body.appendChild(pG);
      var tt = document.createElement('div'); tt.className = 'atl-titre'; tt.textContent = 'Couleurs'; pG.appendChild(tt);
      boutonsCouleur = [];
      COULEURS.forEach(function (c) {
        var b = bouton(pG, 'atl-c', '', c === '#f7f2e8' ? 'Blanc cassé' : '', function () { couleur = c; if (outil === 'gomme') outil = 'pinceau'; AV.audio.clic(); majOutils(); });
        b.style.background = c; b.dataset.c = c; boutonsCouleur.push(b);
      });
      bouton(pG, 'atl-b atl-large', '🪣 Fond', 'Peindre tout le fond du mug de cette couleur', function () { memoriser(); fond = couleur; sale = true; tSauve = 0.5; AV.audio.pinceau(1); dire('🪣 Le fond du mug est maintenant de cette couleur', 2); });
      pD = document.createElement('div'); pD.className = 'atl-panneau atl-d'; document.body.appendChild(pD);
      var td = document.createElement('div'); td.className = 'atl-titre'; td.textContent = 'Outils'; pD.appendChild(td);
      boutonsOutils.pinceau = bouton(pD, 'atl-b', '🖌️', 'Pinceau', function () { outil = 'pinceau'; AV.audio.clic(); majOutils(); });
      boutonsOutils.tampon = bouton(pD, 'atl-b', '❤', 'Tampon (touche encore pour changer de forme)', function () { if (outil === 'tampon') iTampon = (iTampon + 1) % TAMPONS.length; outil = 'tampon'; AV.audio.clic(); majOutils(); });
      boutonsOutils.gomme = bouton(pD, 'atl-b', '🧽', 'Éponge (efface)', function () { outil = 'gomme'; AV.audio.clic(); majOutils(); });
      bouton(pD, 'atl-b', '↶', 'Annuler', function () { annuler(); });
      boutonsTaille = TAILLES.map(function (t, i) { return bouton(pD, 'atl-b', '<span style="display:block;width:' + (6 + i * 7) + 'px;height:' + (6 + i * 7) + 'px;border-radius:50%;background:#1b2340"></span>', 'Taille', function () { iTaille = i; AV.audio.clic(); majOutils(); }); });
      bTour = bouton(pD, 'atl-b', '🔄', 'Tournette : le mug tourne tout seul (pour les rayures)', function () { tournette = !tournette; AV.audio.clic(); majOutils(); dire(tournette ? '🔄 La tournette tourne : pose le pinceau et garde le doigt immobile pour une rayure' : '🔄 Tournette arrêtée', 2.6); });
      bRaz = bouton(pD, 'atl-b atl-large', '🗑️ Tout effacer', 'Recommencer', function (b) {
        if (razArme > 0) { memoriser(); xT.clearRect(0, 0, CW, CH); fond = '#f7f2e8'; sale = true; razArme = 0; b.innerHTML = '🗑️ Tout effacer'; AV.audio.plouf(0.3); tSauve = 0.5; nbTraits = 0; }
        else { razArme = 2.5; b.innerHTML = '❓ Sûre ?'; AV.audio.clic(); }
      });
      bouton(pD, 'atl-b atl-large', '🚶 Me lever', 'Se lever (ton mug est gardé)', function () { fonduPuis(seLever); });
      bFini = document.createElement('button'); bFini.className = 'atl-fini'; bFini.textContent = '✅ J\'ai fini !'; document.body.appendChild(bFini);
      bFini.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); demanderFin(); });
      majOutils();
    }
    function retirerUI() {
      [surf, pG, pD, bFini, dialogue].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
      surf = pG = pD = bFini = dialogue = null; bTour = bRaz = null; trait = tourne = null;
      document.body.classList.remove('atelier');
    }
    function demanderFin() {
      if (dialogue || etat !== 'peinture') return;
      AV.audio.clic();
      dialogue = document.createElement('div'); dialogue.className = 'atl-dialogue';
      var vide = nbTraits === 0 && fond === '#f7f2e8';
      dialogue.innerHTML = '<p>' + (vide ? 'Ton mug est encore tout blanc… 😅<br>Tu es sûre de vouloir l\'échanger comme ça ?' : 'Tu as fini ton chef-d\'œuvre ? 🎨<br>On s\'échange les mugs !') + '</p>';
      var non = document.createElement('button'); non.className = 'atl-non'; non.textContent = 'Encore un peu ✏️';
      var oui = document.createElement('button'); oui.className = 'atl-oui'; oui.textContent = 'Oui, on échange ! 🎁';
      non.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); fermerDialogue(); AV.audio.clic(); });
      oui.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); fermerDialogue(); AV.audio.clic(); terminerPeinture(); });
      dialogue.appendChild(non); dialogue.appendChild(oui); document.body.appendChild(dialogue);
    }
    function fermerDialogue() { if (dialogue && dialogue.parentNode) dialogue.parentNode.removeChild(dialogue); dialogue = null; }

    // ---------- S'asseoir / se lever ----------
    function placerElleAssise() {
      if (!J) return;
      var p = W(0, 0, 0.92, vT);
      J.groupe.visible = true; J.ombre.visible = true;
      J.position.set(p.x, -0.07, p.z); J.groupe.rotation.set(0, ATR + Math.PI, 0);
      var pr = J.parts;
      pr.jambeG.rotation.set(-1.45, 0, 0.05); pr.jambeD.rotation.set(-1.45, 0, -0.05);
      pr.corps.rotation.set(0.1, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0.15, 0, 0);
      pr.brasG.rotation.set(-0.9, 0, 0.2); pr.brasD.rotation.set(-0.9, 0, -0.2);
      J.ombre.position.set(p.x, 0.03, p.z);
    }
    function reposer() {
      if (!J) return;
      var pr = J.parts;
      J.groupe.visible = true; J.ombre.visible = true; J.groupe.rotation.set(0, 0, 0);
      pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15); pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
      pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0); J.ombre.scale.setScalar(1);
    }
    function entrerPeinture() {
      J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : J;
      etat = 'peinture'; tEtat = 0; mo.interactifs = []; mo.pilote = pilote;
      if (J) { J.groupe.visible = false; J.ombre.visible = false; }
      construireUI(); sousTitre(); tRemarque = 10;
      if (!repliques.bienvenue) { repliques.bienvenue = true; setTimeout(function () { if (etat === 'peinture') dire('<b>L\'animatrice :</b> Chacun son mug ! Vous les échangerez à la fin 😉', 3.5); }, 1500); }
      W(0, 1.0, 0.6, camPos); W(0, 0.89, 0.2, camLook);
    }
    function seLever() {
      retirerUI(); sauver(); fov(60);
      etat = 'marche'; mo.pilote = null; interactifsMarche(); sousTitre();
      if (J) { reposer(); var p = L(0, 1.4); J.placer(p.x, p.z, ATR + Math.PI, mo); }
      if (AV.jeu) AV.jeu.camera(ATR, 0.4, 5);
    }

    // ---------- Fin de la peinture : photos du mug, puis l'échange ----------
    var ANGLES = [ROT0 + 0.7, ROT0 + 0.7 + 2.1, ROT0 + 0.7 - 2.1];
    function terminerPeinture() {
      retirerUI(); composer(); sauver();
      etat = 'photos'; tEtat = 0; vues = []; tournette = false;
      if (tTotal < 40) dire('<b>' + nomLui + ' :</b> Déjà ?! Attends, je finis le mien… 😅', 2.6);
    }
    function capturerVue() {
      var gl = document.querySelector('#jeu canvas'), cam = camera;
      var c0 = mugE.groupe.localToWorld(new THREE.Vector3(0, MH / 2, 0)), cH = mugE.groupe.localToWorld(new THREE.Vector3(0, MH, 0)), cB = mugE.groupe.localToWorld(new THREE.Vector3(0, 0, 0));
      Promise.resolve().then(function () {
        try {
          var sx = gl.width, sy = gl.height;
          function ecran(v) { var p = v.clone().project(cam); return { x: (p.x + 1) / 2 * sx, y: (1 - p.y) / 2 * sy }; }
          var e0 = ecran(c0), eH = ecran(cH), eB = ecran(cB), cote = Math.abs(eB.y - eH.y) * 1.6;
          var c = document.createElement('canvas'); c.width = c.height = 420;
          c.getContext('2d').drawImage(gl, e0.x - cote / 2, e0.y - cote / 2, cote, cote, 0, 0, 420, 420);
          vues.push(c);
        } catch (e) { }
      });
    }
    function fabriquerComposite() {
      var c = document.createElement('canvas'); c.width = 1400; c.height = 1040;
      var x = c.getContext('2d');
      x.fillStyle = '#fbf6ec'; x.fillRect(0, 0, 1400, 1040);
      x.fillStyle = '#8a3b2e'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 76px Caveat, "Comic Sans MS", cursive'; x.fillText('Le mug que je t\'ai peint ❤', 700, 70);
      vues.forEach(function (v, i) {
        var px = 70 + i * 440, py = 135;
        x.save(); x.beginPath(); if (x.roundRect) x.roundRect(px, py, 380, 380, 28); else x.rect(px, py, 380, 380); x.clip();
        x.drawImage(v, px, py, 380, 380); x.restore();
        x.strokeStyle = '#e2d5bd'; x.lineWidth = 4; x.strokeRect(px, py, 380, 380);
      });
      x.font = '700 40px Caveat, cursive'; x.fillStyle = '#6b5a44'; x.fillText('… et tout le tour du mug :', 700, 572);
      var lw = 1260, lh = Math.round(lw * CH / CW);
      x.drawImage(cvM, 70, 610, lw, lh);
      x.strokeStyle = '#e2d5bd'; x.lineWidth = 4; x.strokeRect(70, 610, lw, lh);
      x.font = '700 30px Nunito, sans-serif'; x.fillStyle = '#9a8a70';
      x.fillText('Atelier céramique · Château de Restinclières · ' + new Date().toLocaleDateString('fr-FR'), 700, 1000);
      try { return c.toDataURL('image/jpeg', 0.9); } catch (e) { return null; }
    }
    function donner() {
      etat = 'echange'; tEtat = 0; AV.audio.clic();
      depE.copy(mugE.groupe.position); depL.copy(mugL.groupe.position);
      revele = 32; majLui();
    }
    function terminer() {
      var orig = cfg.__surpriseOrig || (cfg.__surpriseOrig = cfg.surprise || { type: 'echange', fichiers: [] });
      composite = composite || fabriquerComposite();
      try { if (composite) localStorage.setItem('av_j15_resultat', composite); } catch (e) { }
      cfg.surprise = Object.assign({}, orig, {
        type: 'echange', monMug: composite, nomFichier: 'mon-mug-restinclieres.jpg',
        texte: orig.texte || 'Un mug chacun… pour penser à l\'autre à chaque café ☕❤'
      });
      if (api) api.trouver();
    }

    // ---------- Chaque image (assise) ----------
    function pilote(dt, e, appui, joueur, cam, x) {
      J = joueur; camera = cam; x = x || {};
      if (!api) return;
      tEtat += dt; tTotal += dt; if (parole) parole.t -= dt;
      if (razArme > 0) { razArme -= dt; if (razArme <= 0 && bRaz) bRaz.innerHTML = '🗑️ Tout effacer'; }
      if (etat === 'peinture' || etat === 'photos') {
        fov(54);
        if (etat === 'peinture') {
          if (tournette) rotMug += dt * 1.5;
          rotMug += e.x * dt * 2.2;
          if (x.action) demanderFin();
          if (sale) composer();
          if (tSauve > 0) { tSauve -= dt; if (tSauve <= 0) sauver(); }
          // lui peint le sien, et le révèle petit à petit
          tRevele -= dt; if (tRevele <= 0 && revele < 30) { tRevele = 3 + Math.random() * 3; revele++; majLui(); }
          regardeElle -= dt; if (regardeElle < -6 - Math.random() * 8) regardeElle = 1.6;
          tRemarque -= dt;
          if (tRemarque <= 0) { tRemarque = 16 + Math.random() * 8; dire('<b>' + nomLui + ' :</b> ' + auHasard(['Pas le droit de regarder le mien 🙈', 'Oh… c\'est trop joli ce que tu fais 😍', 'Je crois que j\'ai débordé 😅', 'Tu me passes le bleu ? 🖌️', 'Le mien va être un chef-d\'œuvre, tu vas voir 😎', 'Prends ton temps ❤', 'J\'adore les couleurs que tu as choisies !']), 3); regardeElle = 2.2; }
        } else { // photos du mug sous trois angles
          var k = vues.length;
          if (k < 3 && tEtat < 2.5) { rotMug = ANGLES[k]; mugE.groupe.rotation.y = rotMug; if (tEtat > 0.15 * (k + 1) && !repliques['v' + k]) { repliques['v' + k] = true; capturerVue(); } }
          else if (tEtat > 0.7) { composite = fabriquerComposite(); etat = 'tendre'; tEtat = 0; sousTitre(); placerElleAssise(); fov(60); dire('<b>' + nomLui + ' :</b> Moi aussi j\'ai fini ! On échange ? 🎁', 3); revele = 32; majLui(); }
        }
        mugE.groupe.rotation.y = rotMug;
        poseLuiPeint(tTotal);
        cameraVers(W(0, 1.0, 0.6, cP), W(0, 0.89, 0.2, cL), dt, 0);
      } else if (etat === 'tendre') {
        fov(60); placerElleAssise();
        J.parts.brasG.rotation.set(-1.0, 0, 0.25); J.parts.brasD.rotation.set(-1.0, 0, -0.25);
        lui.bras[0].rotation.set(-1.0, 0, -0.3); lui.bras[1].rotation.set(-1.0, 0, 0.3); lui.tete.rotation.set(-0.05, 0, 0);
        if (x.action || appui) donner();
        cameraVers(W(2.1, 1.5, -0.15, cP), W(0, 0.95, 0.1, cL), dt, tEtat < 0.05 ? 0 : 3);
      } else if (etat === 'echange') {
        var k2 = lisse(0, 2.2, tEtat), arc = Math.sin(k2 * Math.PI) * 0.28;
        mugE.groupe.position.set(AV.lerp(depE.x, PL.x, k2), depE.y + arc, AV.lerp(depE.z, PL.z, k2));
        mugL.groupe.position.set(AV.lerp(depL.x, PE.x, k2), depL.y + arc * 0.8, AV.lerp(depL.z, PE.z, k2));
        mugE.groupe.rotation.y = rotMug + Math.PI * k2;
        mugL.groupe.rotation.y = Math.PI / 2 + Math.PI * k2;
        var tend = Math.sin(k2 * Math.PI);
        J.parts.brasG.rotation.set(-1.0 - 0.4 * tend, 0, 0.25); J.parts.brasD.rotation.set(-1.0 - 0.4 * tend, 0, -0.25);
        lui.bras[0].rotation.set(-1.0 - 0.4 * tend, 0, -0.3); lui.bras[1].rotation.set(-1.0 - 0.4 * tend, 0, 0.3);
        if (tEtat > 2.5) { etat = 'decouverte'; tEtat = 0; aCam = 0; AV.audio.ping(1); dire('<b>' + nomLui + ' :</b> Voilà le mien… sois indulgente 😅', 3.2); }
        cameraVers(W(2.1, 1.5, -0.15, cP), W(0, 0.95, 0.1, cL), dt, 3);
      } else if (etat === 'decouverte') {
        if (J) { J.groupe.visible = false; J.ombre.visible = false; }
        mugL.groupe.position.copy(PE); mugL.groupe.rotation.y = -Math.PI / 2 + Math.sin(tEtat * 0.7) * 0.9;
        if (tEtat > 3.4 && !repliques.garde) { repliques.garde = true; dire('<b>' + nomLui + ' :</b> Et le tien, je le garde pour mon café du matin ☕❤', 3.4); AV.audio.bravo(); }
        if (tEtat > 4 && !repliques.four) { repliques.four = true; setTimeout(function () { if (etat === 'decouverte' || etat === 'final') dire('<b>L\'animatrice :</b> Je les passe au four et vous les récupérez tout brillants ✨', 3); }, 3200); }
        if (tEtat > 6.8) { etat = 'final'; tEtat = 0; sousTitre(); AV.audio.bisou(); }
        cameraVers(W(0, 1.02, 0.66, cP), W(0, 0.88, 0.2, cL), dt, tEtat < 0.05 ? 0 : 2.5);
        fov(54);
      } else if (etat === 'final' || etat === 'fini') {
        fov(60); placerElleAssise();
        mugL.groupe.position.copy(PE); mugL.groupe.rotation.y = -Math.PI / 2 + Math.sin(tTotal * 0.5) * 0.3;
        lui.bras[0].rotation.set(-1.25, 0, -0.1); lui.bras[1].rotation.set(-1.25, 0, 0.1); lui.tete.rotation.set(-0.1, 0, Math.sin(tTotal * 1.3) * 0.08);
        J.parts.brasG.rotation.set(-1.25, 0, 0.1); J.parts.brasD.rotation.set(-1.25, 0, -0.1);   // main dans la main au-dessus de la table
        tCoeur -= dt;
        if (etat === 'final' && tCoeur <= 0) {
          tCoeur = 0.35;
          var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.5 });
          cs.position.copy(W((Math.random() - 0.5) * 0.4, 1.5, (Math.random() - 0.5) * 0.3, vT)); G.add(cs); coeurs.push({ s: cs, t: 0 });
        }
        if (etat === 'final' && tEtat > 3.2 && !fini) { fini = true; etat = 'fini'; tEtat = 0; sousTitre(); terminer(); }
        if (etat === 'fini' && tEtat > 1 && x.action) { fonduPuis(function () { etat = 'marche'; mo.pilote = null; interactifsMarche(); reposer(); var p = L(0.9, 1.3); J.placer(p.x, p.z, ATR + Math.PI, mo); if (AV.jeu) AV.jeu.camera(ATR, 0.4, 5); sousTitre(); }); }
        aCam += dt;
        var a = 1.75 + Math.sin(aCam * 0.25) * 0.3;
        cameraVers(W(Math.sin(a) * 2.2, 1.55, Math.cos(a) * 2.2, cP), W(0, 1.0, 0, cL), dt, 2);
      } else if (etat === 'transition') { camera.position.copy(camPos); camera.lookAt(camLook); }
      majCoeurs(dt);
    }
    function majCoeurs(dt) {
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var c = coeurs[i]; c.t += dt; c.s.position.y += dt * 0.5; c.s.material.opacity = Math.max(0, 1 - c.t / 2.4);
        if (c.t > 2.4) { G.remove(c.s); AV.detruire(c.s); coeurs.splice(i, 1); }
      }
    }

    // ---------- Animations permanentes ----------
    mo.anime(function (dt, t) {
      for (var i = 0; i < NG; i++) {
        var g = gouttes[i]; g.t += dt; if (g.t > 1.2) { g.t -= 1.2; g.a = Math.random() * Math.PI * 2; }
        var r = g.t * g.v, y = 1.9 + g.t * 3.2 - 4.9 * g.t * g.t;
        if (y < 0.4) { y = 0.4; }
        posG[i * 3] = BX + Math.cos(g.a) * r; posG[i * 3 + 1] = y; posG[i * 3 + 2] = BZ + Math.sin(g.a) * r;
      }
      geoG.attributes.position.needsUpdate = true;
      if (etat === 'marche') {
        poseLuiPeint(t);
        if (J) { var d = Math.hypot(J.position.x - cLu.x, J.position.z - cLu.z); if (d < 6) { lui.tete.rotation.set(-0.1, 0, 0); lui.bras[1].rotation.set(-2.6 + Math.sin(t * 8) * 0.25, 0, 0.3); } } // il lui fait signe
        J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : J;
      }
      anim.tete.rotation.y = Math.sin(t * 0.4) * 0.5; anim.bras[1].rotation.x = -0.3 + Math.sin(t * 0.9) * 0.15;
      amies.forEach(function (p, i) { p.bras[0].rotation.x = -1.1 + Math.sin(t * (2.6 + i) + i) * 0.08; });
    });
    mo.surCamera = function (cam) {
      cielM.position.copy(cam.position);
      soleilH.position.copy(cam.position).addScaledVector(dirS, 1800);
      if (etat === 'marche') { camPos.copy(cam.position); cam.getWorldDirection(camLook); camLook.multiplyScalar(5).add(cam.position); }
    };
    mo.debut = function (a) { api = a; camera = a.camera; sousTitre(); dire('🏰 Le château de Restinclières… ' + nomLui + ' t\'attend à l\'atelier céramique, sous les platanes 🎨', 4.5); };
    mo.nettoyer = function () {
      if (etat === 'transition') { var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir'); }
      if (etat === 'peinture') sauver();
      etat = 'parti'; mo.pilote = null;
      retirerUI(); if (css && css.parentNode) css.parentNode.removeChild(css); css = null;
      fov(60);
      if (J) { reposer(); J.groupe.rotation.order = 'XYZ'; }
    };
    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, tEtat: Math.round(tEtat * 10) / 10, traits: nbTraits, revele: revele, rot: Math.round(rotMug * 100) / 100, vues: vues.length }; },
      asseoir: function () { entrerPeinture(); },
      gribouiller: function (n) { // quelques traits au hasard (test)
        for (var i = 0; i < (n || 12); i++) { couleur = auHasard(COULEURS); iTaille = i % 3; var a = { x: Math.random() * CW, y: 30 + Math.random() * (CH - 60) }, b = { x: a.x + (Math.random() - 0.5) * 300, y: 30 + Math.random() * (CH - 60) }; ligne(a, b); }
        outil = 'tampon'; for (var j = 0; j < 8; j++) { iTampon = j % 4; couleur = auHasard(COULEURS); point({ x: 380 + j * 40, y: 170 }); } outil = 'pinceau';
        nbTraits += n || 12;
      },
      peindreEcran: function (cx, cy) { return toucheMug(cx, cy); },
      finir: function () { terminerPeinture(); },
      donner: function () { donner(); },
      image: function () { return composite; },
      effacerSauvegarde: function () { try { localStorage.removeItem(CLE); } catch (e) { } },
      H: H
    };
    return mo;
  };
})(window.AV);
