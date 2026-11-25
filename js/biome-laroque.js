/* Biome « laroque » : notre première journée, au bord de l'Hérault à Laroque (un après-midi d'été).
   L'Hérault coule du nord (-z) vers le sud (+z). Rive ouest : plage de galets sous les platanes. Rive est : falaise calcaire,
   le village perché de Laroque et sa tour. En amont : la chaussée (le seuil) du vieux moulin, puis un pont de pierre au loin.
   Sous le seuil : des cailloux plats dans le courant. En aval : un grand trou d'eau pour se baigner.
   On est déjà en maillot. 1) on descend avec Axel jusqu'aux gros rochers, ✋ poser les serviettes → il fait les sandwichs
   (4 ✋ : baguette, beurre, jambon, fromage), ✋ Océane goûte et juge, les chips sont pour Axel
   2) baignade : le rejoindre dans l'eau, ✋ l'éclabousser 3 fois
   3) s'allonger sur les cailloux dans la rivière, discuter… ✋ se tourner vers lui → le premier bisou → surprise. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#3f86d8', bas: '#f4e6c8', brouillard: '#d9e2d6', hemi: ['#fff6e2', '#6f7a48', 0.68], soleil: ['#fff0cc', 0.82, [-0.5, 0.75, 0.35]] };
  var XC = 2, Z_SEUIL = -30, PLAID = { x: -15.2, z: -7 };   // les serviettes, au pied des gros rochers
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Relief : lit de la rivière, plage, falaise, collines de garrigue ----------
  function demiLargeur(z) { return 14 + 2 * Math.sin(z * 0.03) + 1.5 * Math.sin(z * 0.011 + 1); }
  function niveau(z) { return z < Z_SEUIL ? 0.8 : 0; }              // surface de l'eau
  function riv(x, z) { return (x - XC) / demiLargeur(z); }
  function sol(x, z) {
    var hw = demiLargeur(z), u = (x - XC) / hw, h;
    var amont = lisse(Z_SEUIL + 4, Z_SEUIL - 4, z);
    if (Math.abs(u) < 1) {
      var d = 1 - u * u;
      if (z < Z_SEUIL) h = 0.8 - 2.4 * d;
      else if (z < -12) h = -0.28 - 0.12 * d + 0.06 * Math.sin(x * 1.3) * Math.cos(z * 1.1);
      else { var k = lisse(-12, -4, z) * (1 - lisse(45, 70, z) * 0.7); h = AV.lerp(-0.35, -0.3 - 2.7 * d, k); }
      return h;
    }
    if (u <= -1) { // rive ouest : galets puis talus boisé
      var e = (XC - hw) - x;
      h = e * 0.07 + lisse(12, 30, e) * 3 + lisse(30, 90, e) * 8 + 0.15 * Math.sin(x * 0.4) * Math.cos(z * 0.3) * lisse(2, 6, e);
      h += amont * 1.4 * lisse(0, 3, e);
    } else {        // rive est : la falaise de Laroque
      var e2 = x - (XC + hw), haut = 14 + 9 * Math.exp(-((z - 15) * (z - 15)) / 1800);
      h = haut * lisse(0, 7, e2) + lisse(7, 80, e2) * 10 + 0.6 * Math.sin(z * 0.5) * lisse(0, 4, e2) * (1 - lisse(4, 8, e2));
      h += amont * 1.2 * (1 - lisse(0, 7, e2));
    }
    var r = Math.sqrt(x * x + z * z);   // collines de garrigue au loin
    h += lisse(120, 500, r) * (70 + 60 * Math.sin(x * 0.004 + 1) * Math.cos(z * 0.005) + 30 * Math.sin(x * 0.011 - z * 0.009));
    return h;
  }
  function dansRiviere(x, z) { return Math.abs(riv(x, z)) < 1 && z > -150 && z < 150; }
  function surSeuil(x, z) { return z > Z_SEUIL - 0.6 && z < Z_SEUIL + 0.6 && Math.abs(riv(x, z)) < 1; }
  var ROCHES = []; // cailloux plats où l'on marche (x, z, rayon, dessus)
  function H(x, z) {
    if (surSeuil(x, z)) return 0.9;
    var s = sol(x, z);
    for (var i = 0; i < ROCHES.length; i++) { var r = ROCHES[i], dx = x - r.x, dz = z - r.z; if (dx * dx + dz * dz < r.r * r.r) s = Math.max(s, r.y); }
    if (dansRiviere(x, z)) s = Math.max(s, niveau(z) - 0.95);
    return s;
  }
  function profondeur(x, z) { return dansRiviere(x, z) ? niveau(z) - H(x, z) : 0; }
  function autorise(x, z) { return x > -48 && z > -60 && z < 45 && x < XC + demiLargeur(z) + 0.5; }

  function couleurSol(x, y, z, ny) {
    var hw = demiLargeur(z), u = (x - XC) / hw, k = hash(Math.floor(x / 1.3), Math.floor(z / 1.3));
    if (Math.abs(u) < 1) return varier(y < -1.2 ? '#4f6650' : y < -0.5 ? '#7d8466' : k > 0.5 ? '#a99f82' : '#9a9276', x, z, 0.12);
    if (u <= -1) {
      var e = (XC - hw) - x;
      if (e < 11) return varier(k > 0.7 ? '#bdb29a' : k > 0.35 ? '#ada28a' : '#9f947c', x, z, 0.1);
      if (e < 14) return varier('#a9a07a', x, z, 0.1);
      return varier(k > 0.6 ? '#7f8f48' : '#8e9a52', x, z, 0.12);
    }
    if (ny < 0.6) return varier(k > 0.5 ? '#b09a74' : k > 0.25 ? '#a8805a' : '#9c8e74', x, z, 0.1);
    if (y > 40) return varier(k > 0.5 ? '#7d8a4e' : '#9a9a6a', x, z, 0.12);
    return varier(k > 0.5 ? '#6f7f40' : '#8a8a58', x, z, 0.12);
  }
  function terrain(cx, cz, taille, segs, puits) {
    var geo = new THREE.PlaneGeometry(taille, taille, segs, segs); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) { var x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setX(i, x); p.setZ(i, z); p.setY(i, sol(x, z) - (puits ? puits(x, z) : 0)); }
    var g = geo.toNonIndexed(); g.computeVertexNormals();
    var pa = g.attributes.position, no = g.attributes.normal, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var mx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, mz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.copy(couleurSol(mx, my, mz, no.getY(f)));
      for (var q = 0; q < 3; q++) { cols[(f + q) * 3] = c.r; cols[(f + q) * 3 + 1] = c.g; cols[(f + q) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; return m;
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

  // ---------- Personnages (tenue d'été, puis maillots) ----------
  function personne(o) {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var peau = o.peau || '#eec29a', jambes = [], bras = [], mats = {};
    function mat(cle, c) { mats[cle] = new THREE.MeshLambertMaterial({ color: c }); return mats[cle]; }
    var mBas = mat('bas', o.bas), mHaut = mat('haut', o.haut), mManche = mat('manche', o.manches || o.haut), mPeau = new THREE.MeshLambertMaterial({ color: peau });
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      var cuisse = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.17), mBas); cuisse.position.y = -0.2; j.add(cuisse);
      var mollet = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.16), mPeau); mollet.position.y = -0.6; j.add(mollet);
      j.add(bm(0.16, 0.08, 0.27, o.pieds || '#c9a27a', 0, -0.81, 0.05));
      jambes.push(j);
    });
    var t = new THREE.Mesh(AV.facettes(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8)), mHaut); t.position.y = 1.11; t.castShadow = true; corps.add(t);
    var jupe = null;
    if (o.robe) { jupe = new THREE.Mesh(AV.facettes(new THREE.CylinderGeometry(0.24, 0.36, 0.45, 10)), mHaut); jupe.position.y = 0.66; corps.add(jupe); }
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(new THREE.Mesh(AV.facettes(new THREE.IcosahedronGeometry(0.17, 1)), mPeau));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), o.cheveux); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    if (o.longs) { var cl = AV.maille(new THREE.BoxGeometry(0.34, 0.5, 0.1), o.cheveux); cl.position.set(0, -0.14, -0.13); tete.add(cl); }
    [-1, 1].forEach(function (c) { var oe = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); oe.position.set(c * 0.06, 0.0, 0.152); tete.add(oe); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#b0505a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux });
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 6), mManche); m.position.y = -0.13; b.add(m);
      var av = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 6), mPeau); av.position.y = -0.4; b.add(av);
      var mn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), mPeau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    // passer en maillot : haut = maillot (ou torse nu), bas = maillot
    function maillot(haut, bas) {
      mats.haut.color.set(haut); mats.manche.color.set(o.manchesMaillot || haut === peau ? peau : peau); mats.bas.color.set(bas);
      if (jupe) jupe.visible = false;
    }
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes, maillot: maillot };
  }

  AV.biomes = AV.biomes || {};
  AV.biomes.laroque = function (cfg) {
    var rng = AV.rng(1818 + cfg.jour);
    var nomLui = cfg.copain || 'Axel', nomElle = cfg.copine || 'Océane';
    var mo = new AV.Monde({
      rayon: 70, hauteur: H, surface: 'herbe', ciel: CIEL, brouillard: [120, 1100],
      depart: { x: -34, z: 6, angle: Math.PI / 2 }, theme: 'riviere', ambiance: 'riviere', autorise: autorise
    });
    mo.loin = 1600;
    mo.sansAnimal = true;
    mo.surfaceA = function (x, z) { return dansRiviere(x, z) ? 'eau' : (XC - demiLargeur(z)) - x < 11 ? 'gravier' : 'herbe'; };
    var G = mo.groupe, col = mo.colliders;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    var soleilH = AV.halo('#fff2c8', 220); soleilH.material.fog = false; soleilH.material.opacity = 0.7; G.add(soleilH);
    var dirS = new THREE.Vector3(CIEL.soleil[2][0], CIEL.soleil[2][1], CIEL.soleil[2][2]).normalize();

    // ---------- Les cailloux plats sous le seuil (on y marche, on s'y allonge) ----------
    var DALLE = { x: -2.9, z: -19, r: 1.9, y: 0.07 };
    ROCHES.length = 0;
    ROCHES.push(DALLE);
    [[-10.4, -19.3, 0.7], [-8.7, -18.6, 0.75], [-6.9, -19.4, 0.7], [-5.2, -18.8, 0.7]].forEach(function (p) { ROCHES.push({ x: p[0], z: p[1], r: p[2], y: 0.04 }); });
    for (var ro = 0; ro < 26; ro++) {
      var rx = AV.entre(rng, -9, 12), rz = AV.entre(rng, -28, -13);
      if (Math.abs(rx - DALLE.x) < 3 && Math.abs(rz - DALLE.z) < 3) continue;
      ROCHES.push({ x: rx, z: rz, r: AV.entre(rng, 0.3, 0.9), y: AV.entre(rng, -0.12, 0.1), deco: true });
    }

    // ---------- Terrain : 3 anneaux de finesse décroissante ----------
    G.add(terrain(0, 0, 170, 136));
    G.add(terrain(0, 0, 700, 140, function (x, z) { return Math.abs(x) < 84 && Math.abs(z) < 84 ? 10 : 0; }));
    G.add(terrain(0, 0, 3000, 60, function (x, z) { return Math.abs(x) < 349 && Math.abs(z) < 349 ? 40 : 0; }));

    // ---------- L'eau de l'Hérault (verte et claire), deux biefs séparés par le seuil ----------
    var geoE = new THREE.PlaneGeometry(46, 300, 23, 200); geoE.rotateX(-Math.PI / 2); geoE.translate(XC, 0, 0);
    var baseE = geoE.attributes.position.array.slice();
    var eauM = new THREE.Mesh(geoE, new THREE.MeshPhongMaterial({ color: '#2f7f7a', transparent: true, opacity: 0.84, shininess: 90, specular: '#ffffff', flatShading: true }));
    eauM.receiveShadow = true; G.add(eauM);
    var tEau = 0;
    function majEau(dt, t) {
      tEau += dt; if (tEau < 1 / 25) return; tEau = 0;
      var a = geoE.attributes.position.array;
      for (var i = 0; i < a.length; i += 3) {
        var x = baseE[i], z = baseE[i + 2];
        a[i + 1] = Math.abs(riv(x, z)) > 1.1 ? niveau(z) - 3 : niveau(z) - 0.04 + Math.sin(x * 0.9 + t * 1.7) * 0.025 + Math.sin(z * 0.7 - t * 3.2) * 0.03;
      }
      geoE.attributes.position.needsUpdate = true; geoE.computeVertexNormals();
    }
    majEau(1, 0);

    // ---------- Décor fixe (fusionné) ----------
    var F = new AV.Fusion();
    // la dalle et les galets dans l'eau
    forme(F, new THREE.CylinderGeometry(DALLE.r, DALLE.r + 0.2, 0.6, 9), '#b3a88c', DALLE.x, DALLE.y - 0.3, DALLE.z, 0.3, 1, 1, 1.25);
    ROCHES.forEach(function (r, i) {
      if (i === 0) return;
      forme(F, new THREE.IcosahedronGeometry(r.r, 0), AV.choisir(rng, ['#d2c8ae', '#c4b99c', '#b8ad92', '#ddd3bb']), r.x, r.y - r.r * 0.35, r.z, rng() * 6, 1, 0.45, 1);
    });
    // galets de la plage (petits points clairs)
    for (var gi = 0; gi < 260; gi++) {
      var gz = AV.entre(rng, -28, 40), ge = AV.entre(rng, 0.3, 10.5), gx = XC - demiLargeur(gz) - ge;
      forme(F, new THREE.IcosahedronGeometry(AV.entre(rng, 0.08, 0.3), 0), AV.choisir(rng, ['#e8e0cc', '#d4cab2', '#bfb39a', '#f0eadb']), gx, sol(gx, gz) + 0.03, gz, rng() * 6, 1, 0.5, 1.2);
    }
    // le seuil du moulin (la chaussée) et le moulin en ruine
    var hwS = demiLargeur(Z_SEUIL);
    boite(F, hwS * 2 + 3, 2.6, 1.3, '#a89c80', XC, 0.9 - 1.3, Z_SEUIL);
    boite(F, hwS * 2 + 3, 0.2, 1.5, '#b9ad90', XC, 0.85, Z_SEUIL);
    var MX = XC - demiLargeur(-35) - 6, MZ = -35, MY = sol(MX, MZ);
    boite(F, 6, 5.5, 7, '#b8a98a', MX, MY + 2.6, MZ); boite(F, 6.3, 0.3, 4, '#a85a36', MX, MY + 5.7, MZ - 1.5, 0);
    boite(F, 0.9, 1.6, 0.1, '#3a3226', MX + 3.02, MY + 1.0, MZ, Math.PI / 2); boite(F, 0.7, 0.8, 0.1, '#3a3226', MX + 3.02, MY + 3.6, MZ - 2, Math.PI / 2);
    forme(F, new THREE.TorusGeometry(1.6, 0.25, 5, 12), '#6b5233', MX + 3.4, MY + 1.2, MZ + 2.2, Math.PI / 2, 1, 1, 1);
    col.push({ rect: true, x: MX, z: MZ, hx: 3.2, hz: 3.7, a: 0 });
    // le vieux pont de pierre en amont
    var ZP = -105, hwP = demiLargeur(ZP);
    boite(F, hwP * 2 + 10, 1.4, 4.2, '#c2b394', XC, 9, ZP); boite(F, hwP * 2 + 10, 0.8, 0.3, '#b3a383', XC, 10, ZP - 2); boite(F, hwP * 2 + 10, 0.8, 0.3, '#b3a383', XC, 10, ZP + 2);
    [-0.66, 0, 0.66].forEach(function (k) { boite(F, 2.6, 11, 4.6, '#b5a587', XC + k * hwP, 3, ZP); });
    [-0.33, 0.33].forEach(function (k) { forme(F, new THREE.TorusGeometry(hwP * 0.33, 0.8, 5, 14, Math.PI), '#bfae8f', XC + k * hwP, 3.6, ZP, 0, 1, 1, 1.6); });
    // les platanes de la plage (troncs tachetés) + leur ombre
    for (var pz = -26; pz <= 38; pz += 7.5) {
      var px = XC - demiLargeur(pz) - AV.entre(rng, 12.5, 17), py = sol(px, pz), ht = AV.entre(rng, 6, 8);
      forme(F, new THREE.CylinderGeometry(0.38, 0.55, ht, 7), '#cfc6a6', px, py + ht / 2, pz, rng() * 3, 1, 1, 1);
      for (var ta = 0; ta < 4; ta++) forme(F, new THREE.BoxGeometry(0.3, 0.6, 0.08), AV.choisir(rng, ['#9f9a7a', '#e2dcc4', '#8c8a6a']), px + Math.cos(ta * 1.7) * 0.45, py + 1 + ta * 1.1, pz + Math.sin(ta * 1.7) * 0.45, -ta * 1.7 + Math.PI / 2, 1, 1, 1);
      for (var fe = 0; fe < 5; fe++) forme(F, new THREE.IcosahedronGeometry(AV.entre(rng, 2.4, 3.4), 0), AV.choisir(rng, ['#5e8a3a', '#6f9a42', '#557f33']), px + AV.entre(rng, -2.5, 2.5), py + ht + AV.entre(rng, -0.5, 2), pz + AV.entre(rng, -2.5, 2.5), rng() * 6, 1, 0.75, 1);
      col.push({ x: px, z: pz, r: 0.55 });
    }
    // roseaux au bord de l'eau
    for (var re = 0; re < 40; re++) {
      var rzz = AV.entre(rng, -60, 45), rxx = XC - demiLargeur(rzz) - AV.entre(rng, -0.3, 0.8);
      if (Math.abs(rzz - PLAID.z) < 5 || Math.abs(rzz - DALLE.z) < 3) continue;
      for (var rb = 0; rb < 5; rb++) forme(F, new THREE.ConeGeometry(0.04, 1.6, 3), '#8a9a48', rxx + AV.entre(rng, -0.4, 0.4), sol(rxx, rzz) + 0.7, rzz + AV.entre(rng, -0.4, 0.4), 0, 1, 1, 1, AV.entre(rng, -0.2, 0.2), AV.entre(rng, -0.2, 0.2));
    }
    // garrigue : chênes verts, cyprès, buissons sur les collines
    for (var cv = 0; cv < 650; cv++) {
      var an = rng() * Math.PI * 2, rr = AV.entre(rng, 22, 420), cx = Math.cos(an) * rr, cz = Math.sin(an) * rr;
      if (Math.abs(riv(cx, cz)) < 1.25) continue;
      var e0 = (XC - demiLargeur(cz)) - cx; if (e0 > -1 && e0 < 18 && Math.abs(cz) < 70) continue;
      var e1 = cx - (XC + demiLargeur(cz)); if (e1 > -1 && e1 < 8) continue;
      var cy = sol(cx, cz), sc = AV.entre(rng, 0.8, 1.6) * (rr > 150 ? 2.2 : 1);
      if (rng() < 0.15) forme(F, new THREE.ConeGeometry(0.6 * sc, 5 * sc, 6), '#3f5a2c', cx, cy + 2.5 * sc, cz, 0, 1, 1, 1);
      else forme(F, new THREE.IcosahedronGeometry(1.3 * sc, 0), AV.choisir(rng, ['#4f6a32', '#5b7538', '#6e7f44', '#7f8a50']), cx, cy + sc, cz, rng() * 6, 1, 0.8, 1);
    }
    // les gros rochers blancs au bord de l'eau (notre coin pique-nique)
    [[-12.6, -3.6, 1.9, 0.8], [-11.6, -10.6, 2.3, 0.7], [-17.8, -10.4, 2.6, 0.75], [-17.2, -3.4, 1.6, 0.85], [-9.8, -4.2, 1.4, 0.6], [-14.5, -12.6, 1.5, 0.8], [-20.5, -6.8, 2.0, 0.7]].forEach(function (r, i) {
      var ry = sol(r[0], r[1]);
      forme(F, new THREE.IcosahedronGeometry(r[2], 1), ['#d6ccb4', '#cbbfa5', '#c2b69a'][i % 3], r[0], ry + r[2] * r[3] * 0.45, r[1], i * 1.3, 1.1, r[3], 0.95);
      forme(F, new THREE.IcosahedronGeometry(r[2] * 0.45, 0), '#b8ab8e', r[0] + r[2] * 0.7, ry + r[2] * 0.15, r[1] + r[2] * 0.4, i, 1, 0.6, 1);
      col.push({ x: r[0], z: r[1], r: r[2] * 0.95 });
    });
    // le village de Laroque perché sur la falaise, et sa tour
    for (var mi = 0; mi < 30; mi++) {
      var vz = AV.entre(rng, -28, 42), vx = XC + demiLargeur(vz) + AV.entre(rng, 9, 34), vy = sol(vx, vz) - 0.5;
      var vl = AV.entre(rng, 4, 7), vp = AV.entre(rng, 4, 7), vh = AV.entre(rng, 5, 9), vr = AV.choisir(rng, [0, 0.1, -0.1]);
      boite(F, vl, vh, vp, AV.choisir(rng, ['#d9c7a3', '#cdb48c', '#e2d3b5', '#c9b08a']), vx, vy + vh / 2, vz, vr);
      forme(F, new THREE.ConeGeometry(Math.max(vl, vp) * 0.75, 1.8, 4), AV.choisir(rng, ['#c0623a', '#b5552f', '#cc7448']), vx, vy + vh + 0.9, vz, vr + Math.PI / 4, vl / Math.max(vl, vp), 1, vp / Math.max(vl, vp));
      for (var fw = 0; fw < 3; fw++) boite(F, 0.1, 0.9, 0.6, '#4a3a2c', vx - vl / 2 - 0.03, vy + 1.6 + (fw % 2) * 2.4, vz - vp / 4 + fw * vp / 4, vr);
    }
    var TX = XC + demiLargeur(14) + 13, TZ = 14, TY = sol(TX, TZ);
    boite(F, 5, 17, 5, '#cdbb96', TX, TY + 8, TZ);
    for (var cr = 0; cr < 4; cr++) { boite(F, 1, 1.2, 5.4, '#cdbb96', TX - 2.2 + cr * 1.47, TY + 17, TZ - 0); }
    boite(F, 0.6, 1.4, 0.2, '#3a3226', TX - 2.52, TY + 12, TZ, Math.PI / 2);
    G.add(F.maille());

    // ---------- Le plaid et le panier (cachés avant le pique-nique) ----------
    var PY = sol(PLAID.x, PLAID.z);
    var plaid = new THREE.Group(); plaid.position.set(PLAID.x, PY + 0.04, PLAID.z); plaid.rotation.y = 0.15; G.add(plaid);
    var cv2 = document.createElement('canvas'); cv2.width = cv2.height = 128; var cx2 = cv2.getContext('2d');
    for (var cq = 0; cq < 16; cq++) { cx2.fillStyle = cq % 2 ? '#ffffff' : '#3a8fd6'; cx2.fillRect(0, cq * 8, 60, 8); cx2.fillStyle = cq % 2 ? '#ffffff' : '#ef7aa0'; cx2.fillRect(68, cq * 8, 60, 8); }
    cx2.clearRect(60, 0, 8, 128); // deux serviettes de plage côte à côte
    var texP = new THREE.CanvasTexture(cv2); texP.magFilter = THREE.NearestFilter;
    var tissu = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.0), new THREE.MeshLambertMaterial({ map: texP, transparent: true, alphaTest: 0.5 })); tissu.rotation.x = -Math.PI / 2; tissu.receiveShadow = true; plaid.add(tissu);
    var panier = new THREE.Group(); panier.position.set(0.8, 0, -0.6); plaid.add(panier);
    panier.add(bm(0.6, 0.35, 0.4, '#b98a4e', 0, 0.18, 0)); var anse = AV.maille(new THREE.TorusGeometry(0.22, 0.03, 4, 10, Math.PI), '#9a6e3a'); anse.position.y = 0.36; panier.add(anse);
    plaid.visible = false;
    var plaidRoule = bm(0.9, 0.22, 0.22, '#d94a4a', 0, 0, 0); plaidRoule.rotation.z = Math.PI / 2;
    // le sandwich jambon-beurre-fromage, monté couche par couche sur une planche, et le paquet de chips d'Axel
    var planche = new THREE.Group(); planche.position.set(-0.1, 0, 0.15); planche.rotation.y = 0.3; plaid.add(planche);
    planche.add(bm(0.8, 0.03, 0.32, '#b07a48', 0, 0.015, 0));
    function couche(l, h, p, c, y) { var m = bm(l, h, p, c, 0, y, 0); m.visible = false; planche.add(m); return m; }
    var pain1 = AV.maille(new THREE.CylinderGeometry(0.065, 0.065, 0.66, 8), '#d9a75c'); pain1.rotation.z = Math.PI / 2; pain1.scale.x = 0.4; pain1.position.y = 0.04; pain1.visible = false; planche.add(pain1);
    var COUCHES = [
      { nom: 'la baguette 🥖', m: [pain1] },
      { nom: 'le beurre 🧈', m: [couche(0.62, 0.012, 0.11, '#fbeaa0', 0.042)] },
      { nom: 'le jambon 🍖', m: [couche(0.64, 0.02, 0.14, '#f2a0a8', 0.058), couche(0.6, 0.015, 0.13, '#ec8e98', 0.075)] },
      { nom: 'le fromage 🧀', m: [couche(0.6, 0.018, 0.12, '#f6d65a', 0.092)] }
    ];
    var pain2 = AV.maille(new THREE.CylinderGeometry(0.065, 0.065, 0.66, 8), '#dfae62'); pain2.rotation.z = Math.PI / 2; pain2.scale.x = 0.55; pain2.position.y = 0.118; pain2.visible = false; planche.add(pain2);
    COUCHES[3].m.push(pain2);
    var chips = new THREE.Group(); chips.position.set(0.55, 0, -0.35); chips.visible = false; plaid.add(chips);
    var sachet = bm(0.26, 0.34, 0.08, '#f2c230', 0, 0.17, 0); sachet.rotation.x = -0.25; chips.add(sachet); chips.add(bm(0.27, 0.06, 0.09, '#d93a2a', 0, 0.3, -0.04));
    for (var ch = 0; ch < 7; ch++) { var cp = bm(0.07, 0.01, 0.05, '#f0c860', Math.cos(ch * 2.1) * 0.2, 0.01, 0.15 + Math.sin(ch * 2.1) * 0.08); cp.rotation.y = ch; chips.add(cp); }

    // ---------- Libellules, canoë qui descend la rivière ----------
    var libs = [];
    for (var li = 0; li < 7; li++) { var lb = bm(0.18, 0.03, 0.03, li % 2 ? '#2e7fd9' : '#26b0b0', 0, 0, 0); var ai = bm(0.04, 0.005, 0.22, '#e8f4ff', 0, 0.02, 0); ai.material.transparent = true; ai.material.opacity = 0.6; lb.add(ai); G.add(lb); libs.push({ m: lb, a: ai, x: AV.entre(rng, -12, 8), z: AV.entre(rng, -26, 20), p: rng() * 9 }); }
    var canoe = new THREE.Group(); G.add(canoe);
    var coque = AV.maille(new THREE.SphereGeometry(1, 10, 6), '#e86a2a'); coque.scale.set(0.42, 0.25, 2.3); canoe.add(coque);
    [-0.8, 0.8].forEach(function (z, i) { var pp = personne({ haut: i ? '#f2d64b' : '#3a7bd5', bas: '#333', cheveux: i ? '#2a1a10' : '#a0703a', longs: !!i }); pp.groupe.scale.setScalar(0.85); pp.groupe.position.set(0, -0.45, z); pp.jambes.forEach(function (j) { j.visible = false; }); canoe.add(pp.groupe); var pag = bm(0.04, 0.04, 1.8, '#333', 0, 1.0, 0); pag.rotation.x = Math.PI / 2; pp.bras[1].add(pag); pag.position.y = -0.62; pp.bras.forEach(function (b) { b.rotation.x = -1.2; }); canoe.userData['p' + i] = pp; });
    var zCanoe = -26;

    // ---------- Le nuage en forme de cœur (on le voit allongés sur les cailloux) ----------
    var nuageC = new THREE.Group(); nuageC.position.set(-4, 30, -170); G.add(nuageC);
    var mNuage = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffe8ee', emissiveIntensity: 0.35, transparent: true, opacity: 0 });
    for (var nh = 0; nh < 26; nh++) {
      var tq = nh / 26 * Math.PI * 2, hx = 16 * Math.pow(Math.sin(tq), 3), hy = 13 * Math.cos(tq) - 5 * Math.cos(2 * tq) - 2 * Math.cos(3 * tq) - Math.cos(4 * tq);
      var bn = new THREE.Mesh(new THREE.IcosahedronGeometry(AV.entre(rng, 2.6, 3.6), 1), mNuage); bn.position.set(hx * 0.75, hy * 0.75, AV.entre(rng, -1, 1)); nuageC.add(bn);
    }
    nuageC.visible = false;
    // quelques nuages d'été ordinaires
    for (var nu = 0; nu < 9; nu++) {
      var ng = new THREE.Group(), na = rng() * Math.PI * 2, nr = AV.entre(rng, 250, 600);
      for (var nb = 0; nb < 5; nb++) { var bb = AV.maille(new THREE.IcosahedronGeometry(AV.entre(rng, 8, 16), 1), '#ffffff', false); bb.position.set(nb * 12 - 24, AV.entre(rng, -3, 4), AV.entre(rng, -5, 5)); ng.add(bb); }
      ng.position.set(Math.cos(na) * nr, AV.entre(rng, 90, 150), Math.sin(na) * nr); ng.lookAt(0, ng.position.y, 0); G.add(ng);
    }

    // ---------- Lui (personnage non joueur) ----------
    var PEAU_LUI = '#e8b88f';
    var lui = personne({ qui: 'axel', haut: PEAU_LUI, manches: PEAU_LUI, bas: '#2f6fb3', cheveux: '#5a3a24', peau: PEAU_LUI }); lui.groupe.scale.setScalar(1.06); G.add(lui.groupe); // déjà en maillot
    var lP = new THREE.Vector3(-32.5, 0, 7.2), lAng = Math.PI / 2, lPhase = 0, luiEtat = 'suit', luiBut = null, luiAssis = null;
    lui.bras[0].add(plaidRoule); plaidRoule.position.set(0.05, -0.35, 0.12);
    var TROU = { x: -2, z: 6 }, LUI_ALLONGE = { x: DALLE.x + 0.55, z: DALLE.z + 0.85 }, ELLE_ALLONGE = { x: DALLE.x - 0.45, z: DALLE.z + 0.85 };
    function luiVa(x, z, apres) { luiEtat = 'va'; luiBut = { x: x, z: z, apres: apres, t: 0 }; }
    function majLui(dt, t, jp) {
      var v = 0, cible = null;
      if (luiEtat === 'suit' || luiEtat === 'va') {
        var tx, tz, vmax;
        if (luiEtat === 'suit') { var dx = jp.x - lP.x, dz = jp.z - lP.z, d = Math.sqrt(dx * dx + dz * dz); tx = jp.x - dx / (d || 1) * 1.7; tz = jp.z - dz / (d || 1) * 1.7; vmax = d > 2.3 ? Math.min(6.5, (d - 1.7) * 2.5) : 0; cible = jp; }
        else { tx = luiBut.x; tz = luiBut.z; vmax = 3.4; luiBut.t += dt; } // (coincé derrière un rocher : après 4 s il passe au travers, sans se téléporter)
        var ex = tx - lP.x, ez = tz - lP.z, el = Math.sqrt(ex * ex + ez * ez);
        if (profondeur(lP.x, lP.z) > 0.5) vmax *= 0.6;
        if (el > 0.08 && vmax > 0) { v = Math.min(vmax, el / dt); lP.x += ex / el * v * dt; lP.z += ez / el * v * dt; lAng = AV.angleLerp(lAng, Math.atan2(ex, ez), Math.min(1, dt * 8)); }
        else if (luiEtat === 'va') { luiEtat = 'stop'; var ap = luiBut.apres; luiBut = null; if (ap) ap(); }
        if (!(luiEtat === 'va' && luiBut && luiBut.t > 4)) col.forEach(function (c) { if (c.rect) return; var qx = lP.x - c.x, qz = lP.z - c.z, q = Math.sqrt(qx * qx + qz * qz), mn = c.r + 0.4; if (q < mn && q > 1e-4) { lP.x = c.x + qx / q * mn; lP.z = c.z + qz / q * mn; } });
      }
      if (luiEtat === 'stop' || luiEtat === 'nage') cible = jp;
      if (cible && v < 0.3) lAng = AV.angleLerp(lAng, Math.atan2(cible.x - lP.x, cible.z - lP.z), Math.min(1, dt * 4));
      var sY = H(lP.x, lP.z), g = lui.groupe;
      if (luiEtat === 'assis') {
        g.position.set(luiAssis.x, PY - 0.58, luiAssis.z); g.rotation.set(0, luiAssis.a, 0);
        lui.jambes.forEach(function (j, i) { j.rotation.set(-1.45, 0, (i ? -1 : 1) * 0.12); }); lui.corps.rotation.x = -0.1;
        lui.bras[0].rotation.set(-0.3 + Math.sin(t * 1.3) * 0.05, 0, 0.5); lui.bras[1].rotation.set(-0.9 + (parleT > 0 ? Math.sin(t * 6) * 0.3 : 0), 0, -0.2);
        return;
      }
      if (luiEtat === 'allonge') return; // posé par majCailloux
      var prof = profondeur(lP.x, lP.z), nage = prof > 0.6;
      lPhase += dt * (4 + v * 1.6); var s = Math.sin(lPhase), k = Math.min(1, v / 4);
      g.position.set(lP.x, sY - (luiEtat === 'nage' ? 0.35 + Math.sin(t * 2) * 0.05 : nage ? 0.2 : 0) + Math.abs(Math.cos(lPhase)) * 0.06 * k, lP.z); g.rotation.set(0, lAng, 0);
      lui.jambes[0].rotation.set(s * 0.8 * k, 0, 0); lui.jambes[1].rotation.set(-s * 0.8 * k, 0, 0); lui.corps.rotation.x = 0.06 * k;
      if (nage || luiEtat === 'nage') { lui.bras[0].rotation.set(-1.3 + Math.sin(t * 3) * 0.4, 0, -0.6 + Math.cos(t * 3) * 0.3); lui.bras[1].rotation.set(-1.3 + Math.sin(t * 3) * 0.4, 0, 0.6 - Math.cos(t * 3) * 0.3); }
      else { lui.bras[0].rotation.set(-s * 0.7 * k, 0, -0.1); lui.bras[1].rotation.set(s * 0.7 * k, 0, 0.1); }
      if (riposte > 0) { riposte -= dt; lui.bras[1].rotation.set(-2.2 + riposte * 3, 0, 0.3); }
    }

    // ---------- Elle (le joueur) : robe d'été, puis maillot ----------
    var J = null, elle = null, cache = [], posture = 'debout';
    function habiller() {
      J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (!J || elle) return;
      J.groupe.children.forEach(function (c) { cache.push({ o: c, v: c.visible }); c.visible = false; });
      elle = personne({ qui: 'oceane', haut: '#e2506e', bas: '#e2506e', manches: '#eec29a', cheveux: '#d6b07a', longs: true, pieds: '#b98a5a' }); // déjà en maillot
      J.groupe.add(elle.groupe);
    }
    function deshabiller() {
      if (!J || !elle) return;
      J.groupe.remove(elle.groupe); AV.detruire(elle.groupe); elle = null;
      J.groupe.rotation.x = 0; cache.forEach(function (c) { c.o.visible = c.v; }); cache = [];
    }
    function animerElle(dt, t) {
      if (!elle) return;
      var p = J.parts, g = elle.groupe;
      if (posture === 'allongee') return;
      if (posture === 'assise') {
        g.position.y = -0.58; elle.jambes.forEach(function (j, i) { j.rotation.set(-1.45, 0, (i ? -1 : 1) * 0.1); });
        elle.bras[0].rotation.set(-0.35, 0, 0.4); elle.bras[1].rotation.set(-0.35, 0, -0.4); elle.corps.rotation.x = -0.08; return;
      }
      g.position.y = 0; g.rotation.set(0, 0, 0);
      elle.jambes[0].rotation.set(p.jambeG.rotation.x, 0, 0); elle.jambes[1].rotation.set(p.jambeD.rotation.x, 0, 0);
      elle.corps.position.y = p.corps.position.y; elle.corps.rotation.x = p.corps.rotation.x;
      if (profondeur(J.position.x, J.position.z) > 0.6) { // elle nage la brasse
        g.position.y = -0.25 + Math.sin(t * 2.2) * 0.04;
        elle.bras[0].rotation.set(-1.4 + Math.sin(t * 3.4) * 0.35, 0, -0.5 + Math.cos(t * 3.4) * 0.35); elle.bras[1].rotation.set(-1.4 + Math.sin(t * 3.4) * 0.35, 0, 0.5 - Math.cos(t * 3.4) * 0.35);
      } else { elle.bras[0].rotation.set(p.brasG.rotation.x, 0, -0.1); elle.bras[1].rotation.set(p.brasD.rotation.x, 0, 0.1); }
      if (lance > 0) { lance -= dt; elle.bras[1].rotation.set(-2.4 + lance * 4, 0, 0.3); }
    }

    // ---------- Éclaboussures ----------
    var NG = 240, gPos = new Float32Array(NG * 3), gVit = [], gVie = new Float32Array(NG), gi2 = 0;
    for (var q0 = 0; q0 < NG; q0++) { gPos[q0 * 3 + 1] = -50; gVit.push(new THREE.Vector3()); }
    var gGeo = new THREE.BufferGeometry(); gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    var gouttes = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: '#eafcff', size: 0.11, transparent: true, opacity: 0.9 })); gouttes.frustumCulled = false; G.add(gouttes);
    function eclabousser(x, y, z, dx, dz, n, force) {
      for (var i = 0; i < n; i++) {
        var k = gi2 = (gi2 + 1) % NG; gPos[k * 3] = x + (Math.random() - 0.5) * 0.3; gPos[k * 3 + 1] = y; gPos[k * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
        gVit[k].set(dx * force * (0.5 + Math.random()) + (Math.random() - 0.5) * 1.5, 2 + Math.random() * 3, dz * force * (0.5 + Math.random()) + (Math.random() - 0.5) * 1.5); gVie[k] = 1.4;
      }
    }
    function majGouttes(dt) {
      for (var i = 0; i < NG; i++) {
        if (gVie[i] <= 0) continue; gVie[i] -= dt; gVit[i].y -= 9.8 * dt;
        gPos[i * 3] += gVit[i].x * dt; gPos[i * 3 + 1] += gVit[i].y * dt; gPos[i * 3 + 2] += gVit[i].z * dt;
        if (gPos[i * 3 + 1] < niveau(gPos[i * 3 + 2]) - 0.1 || gVie[i] <= 0) { gVie[i] = 0; gPos[i * 3 + 1] = -50; }
      }
      gGeo.attributes.position.needsUpdate = true;
    }

    // ---------- Histoire, dialogues ----------
    var api = null, phase = 'arrivee', parole = null, parleT = 0, nMiam = 0, nEclat = 0, nParler = 0, riposte = 0, lance = 0, coeurs = [], profAvant = 0, tBisou = -1, fini = false, opNuage = 0;
    function dire(t, d) { parole = { texte: t, t: d || 3.2 }; }
    function luiDit(t, d) { dire('<b>' + nomLui + ' :</b> ' + t, d || 3.6); parleT = d || 3.6; }
    function sousTitre() {
      if (!api) return;
      var s = { arrivee: 'Notre première journée ensemble ❤', miam: '🥪 Jambon-beurre-fromage : ' + nMiam + ' / 4', baignade: '💦 Éclaboussures : ' + nEclat + ' / 3', cailloux: '🪨 Les cailloux sous le seuil…', allonges: '☁️ Allongés dans la rivière…', bisou: '❤ Notre premier bisou ❤' }[phase];
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s || '');
    }
    function coeur(x, y, z) {
      var s = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.5 });
      s.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5); G.add(s); coeurs.push({ s: s, t: 0 });
    }
    function pouf(x, y, z) { for (var i = 0; i < 4; i++) coeur(x, y + i * 0.15, z); }
    var marque = AV.texteSprite('🪨✨', { largeur: 0.9 }); marque.position.set(DALLE.x, 1.6, DALLE.z); marque.visible = false; G.add(marque);
    var marqueP = AV.texteSprite('🧺', { largeur: 0.8 }); marqueP.position.set(PLAID.x, PY + 1.7, PLAID.z); G.add(marqueP);

    var itPlaid = { x: PLAID.x, z: PLAID.z, rayon: 2.6, texte: '🏖️ ✋ Poser les serviettes au pied des gros rochers', fn: function () {
      plaid.visible = true; marqueP.visible = false; lui.bras[0].remove(plaidRoule); AV.audio.clic();
      phase = 'miam'; mo.interactifs = [itPanier]; sousTitre();
      luiVa(PLAID.x + 0.2, PLAID.z - 1.25, function () { luiEtat = 'assis'; luiAssis = { x: PLAID.x + 0.2, z: PLAID.z - 1.3, a: 0.1 }; });
      luiDit('Parfait ici, contre les rochers 😍 Je m\'occupe des sandwichs… et toi tu juges 😏', 3.6);
    } };
    var MOTS = ['Je coupe la baguette… dans la longueur, comme un chef 🔪🥖', 'Du beurre… généreux, le beurre 🧈', 'Deux tranches de jambon, on ne lésine pas 🍖', 'Et le fromage ! Voilà le chef-d\'œuvre 🥪 Alors, le verdict ?'];
    var itPanier = { x: PLAID.x, z: PLAID.z, rayon: 2.6, texte: '', fn: function () {
      if (nMiam >= 4) return;
      COUCHES[nMiam].m.forEach(function (m) { m.visible = true; }); AV.audio.ping(1); luiDit(MOTS[nMiam], 3.2); parleT = 3.2; nMiam++; sousTitre();
      if (nMiam >= 4) mo.interactifs = [itJuger];
    } };
    var itJuger = { x: PLAID.x, z: PLAID.z, rayon: 2.6, texte: '⭐ ✋ Goûter et juger le sandwich', fn: function () {
      mo.interactifs = []; AV.audio.miam && AV.audio.miam(0.8); pain2.scale.y = 0.75; pain2.position.x = -0.08;
      dire('<b>Le verdict d\'' + nomElle + ' :</b> ⭐⭐⭐⭐½ … 9/10 ! Le beurre est parfait. Le demi-point, c\'est pour qu\'il ne prenne pas la grosse tête 😏', 4.6);
      setTimeout(function () {
        if (phase !== 'miam') return; chips.visible = true; luiDit('9 sur 10, j\'accepte 😎 Et les chips… c\'est pour moi 😋', 3.4);
        var k = 0, iv = setInterval(function () { AV.audio.miam && AV.audio.miam(0.5); if (++k >= 3) clearInterval(iv); }, 700);
        setTimeout(function () { if (phase !== 'miam') return; luiDit('Il fait trop chaud… on va se baigner ? 🏊 L\'eau est super claire !', 3.6); setTimeout(allerNager, 2600); }, 3800);
      }, 4800);
    } };
    function allerNager() {
      if (phase !== 'miam') return;
      phase = 'baignade'; posture = 'debout'; luiEtat = 'stop'; sousTitre();
      luiVa(TROU.x, TROU.z, function () { luiEtat = 'nage'; AV.audio.plouf(1); eclabousser(lP.x, 0, lP.z, 0, 0, 30, 0); });
      dire('🏊 ' + nomLui + ' court déjà vers l\'eau… rejoins-le !', 3);
    }
    var itEclat = { x: 0, z: 0, rayon: 2.6, texte: '💦 ✋ L\'éclabousser !', fn: function () {
      if (!J || nEclat >= 3) return;
      var dx = lP.x - J.position.x, dz = lP.z - J.position.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
      eclabousser(J.position.x + dx / d * 0.5, 0.05, J.position.z + dz / d * 0.5, dx / d, dz / d, 40, 3.2); AV.audio.plouf(0.7); lance = 0.5;
      nEclat++; sousTitre();
      setTimeout(function () { riposte = 0.6; eclabousser(lP.x - dx / d * 0.5, 0.05, lP.z - dz / d * 0.5, -dx / d, -dz / d, 40, 3.2); AV.audio.plouf(0.6); }, 700);
      luiDit(['Hé ! 😂 Tu vas voir…', 'Ahah elle est froide !! 🥶 Revanche !', 'D\'accord, d\'accord, tu as gagné 🙌😂'][nEclat - 1], 2.8);
      if (nEclat >= 3) setTimeout(function () {
        phase = 'cailloux'; marque.visible = true; sousTitre();
        luiDit('Viens, je connais un coin sous la cascade… des cailloux plats dans l\'eau tiède, on s\'y allonge 😍', 4);
        luiVa(LUI_ALLONGE.x + 0.2, LUI_ALLONGE.z + 0.5, function () { luiEtat = 'allonge'; mo.interactifs = [itDalle]; });
      }, 3000);
    } };
    var itDalle = { x: ELLE_ALLONGE.x - 0.3, z: DALLE.z + 0.6, rayon: 2.2, texte: '🪨 ✋ S\'allonger à côté de lui, dans l\'eau', fn: function () {
      phase = 'allonges'; posture = 'allongee'; marque.visible = false; mo.interactifs = [itParler]; sousTitre();
      if (elle) { elle.groupe.rotation.set(-Math.PI / 2, 0, 0); elle.groupe.position.y = 0.24; elle.jambes.forEach(function (j) { j.rotation.set(0, 0, 0); }); elle.bras[0].rotation.set(0, 0, -0.35); elle.bras[1].rotation.set(0, 0, 0.35); }
      if (AV.jeu) AV.jeu.camera(0, 0.18, 5.5); AV.audio.plouf(0.3);
      dire('🌊 L\'eau coule tout autour de vous… on n\'entend plus que la rivière et les cigales', 3.6);
    } };
    var PAROLES = ['Tu sais, ça fait des semaines que je voulais t\'emmener ici 🙈', 'J\'aurais jamais cru être aussi bien… juste là, avec toi ☀️', 'Regarde ce nuage, là-haut… on dirait un cœur ☁️❤'];
    var itParler = { x: 0, z: 0, rayon: 3, texte: '💬 ✋ Discuter avec lui', fn: function () {
      if (nParler >= 3) return;
      luiDit(PAROLES[nParler], 3.8); nParler++;
      if (nParler === 3) { nuageC.visible = true; mo.interactifs = []; setTimeout(function () { mo.interactifs = [itBisou]; }, 3500); }
    } };
    var itBisou = { x: 0, z: 0, rayon: 3, texte: '😘 ✋ Se tourner vers lui', fn: function () {
      mo.interactifs = []; phase = 'bisou'; tBisou = 0; sousTitre();
    } };
    mo.interactifs.push(itPlaid);
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (phase === 'arrivee') return '🌊 Descends avec ' + nomLui + ' jusqu\'aux gros rochers blancs, au bord de l\'Hérault';
      if (phase === 'miam') return nMiam < 4 ? '🥪 ' + nomLui + ' fait les sandwichs : ✋ passe-lui les ingrédients' : '⭐ À toi de juger !';
      if (phase === 'baignade') return profondeur(p.x, p.z) < 0.35 ? '🏊 Rejoins ' + nomLui + ' dans l\'eau, devant la plage' : '💦 Approche-toi et éclabousse-le !';
      if (phase === 'cailloux') return '🪨 Rejoins-le sur les cailloux plats, sous le seuil du moulin (en remontant la rivière)';
      return null;
    };

    // ---------- Allongés sur les cailloux, puis le bisou ----------
    var kAllonge = 0;
    function majCailloux(dt, t) {
      var g = lui.groupe;
      if (luiEtat === 'allonge') {
        // il s'allonge en douceur (plus de saut d'une position à l'autre)
        kAllonge = Math.min(1, kAllonge + dt / 1.1); var ka = lisse(0, 1, kAllonge);
        var ax = LUI_ALLONGE.x - (tBisou >= 0 ? lisse(0, 1.2, tBisou) * 0.42 : 0);
        g.position.set(AV.lerp(lP.x, ax, ka), AV.lerp(H(lP.x, lP.z), DALLE.y + 0.24, ka), AV.lerp(lP.z, LUI_ALLONGE.z, ka)); g.rotation.set(-Math.PI / 2 * ka, AV.lerp(lAng, 0, ka), 0);
        lui.jambes.forEach(function (j, i) { j.rotation.set(0, 0, (i ? -1 : 1) * 0.06); }); lui.corps.rotation.set(0, 0, 0);
        lui.bras[0].rotation.set(0, 0, tBisou >= 0 ? -0.2 : -2.6); lui.bras[1].rotation.set(0, 0, tBisou >= 0 ? 1.2 : 2.6); // mains derrière la tête
        lui.tete.rotation.y = AV.lerp(lui.tete.rotation.y, tBisou >= 0 ? -1.1 : (parleT > 0 ? -0.6 : 0), dt * 3);
        lui.corps.rotation.y = tBisou >= 0 ? -0.55 * lisse(0, 1.2, tBisou) : 0;
      }
      if (posture === 'allongee' && J) {
        J.position.set(ELLE_ALLONGE.x, DALLE.y, ELLE_ALLONGE.z); J.angle = 0; J.groupe.rotation.y = 0; J.vitesse.set(0, 0, 0); J.vy = 0;
        if (J.ombre) J.ombre.visible = false;
        if (elle) { elle.tete.rotation.y = AV.lerp(elle.tete.rotation.y, tBisou >= 0 ? 1.1 : (parleT > 0 ? 0.5 : 0), dt * 3); elle.corps.rotation.y = tBisou >= 0 ? 0.4 * lisse(0, 1.2, tBisou) : 0; }
      }
      if (nuageC.visible) { opNuage = Math.min(0.95, opNuage + dt * 0.35); mNuage.opacity = opNuage; nuageC.position.x = -4 + Math.sin(t * 0.1) * 2; }
      if (tBisou >= 0) {
        tBisou += dt;
        if (tBisou > 1.2 && !fini) { fini = true; AV.audio.bisou(); dire('😘 …notre premier bisou, au milieu de la rivière ❤', 4); setTimeout(function () { if (api) api.trouver(); }, 3200); }
        if (tBisou > 1.2 && Math.random() < dt * 5) coeur((ELLE_ALLONGE.x + LUI_ALLONGE.x) / 2, 0.9, DALLE.z - 0.1);
        if (AV.jeu && tBisou < 1.5) AV.jeu.camera(0.5, 0.35, AV.lerp(5.5, 3.2, lisse(0, 1.5, tBisou)));
      }
    }

    // ---------- Chaque image ----------
    mo.anime(function (dt, t, jp) {
      if (!elle) habiller();
      if (parole) parole.t -= dt; if (parleT > 0) parleT -= dt;
      majEau(dt, t); majGouttes(dt);
      if (phase === 'arrivee' && J && Math.abs(jp.x - PLAID.x) < 6 && Math.abs(jp.z - PLAID.z) < 6 && !arriveDit) { arriveDit = true; luiDit('On pose le plaid ici ? ✋', 2.6); }
      if (phase === 'miam') {
        var dP = Math.sqrt((jp.x - PLAID.x) * (jp.x - PLAID.x) + (jp.z - PLAID.z) * (jp.z - PLAID.z));
        posture = dP < 1.3 && J && J.vitesse.length() < 0.2 ? 'assise' : 'debout';
        itPanier.texte = nMiam < 4 ? '🥪 ✋ Lui passer ' + COUCHES[nMiam].nom : '';
      }
      // l'eau : plouf en entrant, éclaboussures quand on court dedans
      var pr = profondeur(jp.x, jp.z);
      if (pr > 0.25 && profAvant <= 0.25) { AV.audio.plouf(0.5); eclabousser(jp.x, 0.05, jp.z, 0, 0, 18, 0); }
      if (pr > 0.15 && J && J.vitesse.length() > 2 && Math.random() < dt * 8) eclabousser(jp.x, 0.05, jp.z, 0, 0, 3, 0);
      profAvant = pr;
      if (phase === 'baignade') {
        itEclat.x = lP.x; itEclat.z = lP.z;
        var dans = luiEtat === 'nage' && pr > 0.35 && nEclat < 3, ici = mo.interactifs.indexOf(itEclat) >= 0;
        if (dans && !ici) mo.interactifs.push(itEclat); else if (!dans && ici) mo.interactifs.splice(mo.interactifs.indexOf(itEclat), 1);
      }
      if (J) { itParler.x = itBisou.x = J.position.x; itParler.z = itBisou.z = J.position.z; }
      majLui(dt, t, jp); majCailloux(dt, t); animerElle(dt, t);
      marque.position.y = 1.6 + Math.sin(t * 3) * 0.1; marqueP.position.y = PY + 1.7 + Math.sin(t * 3) * 0.1;
      // canoë et libellules
      zCanoe += dt * 1.7; if (zCanoe > 70) zCanoe = -26;
      canoe.position.set(XC + 6 + Math.sin(zCanoe * 0.05) * 2, niveau(zCanoe) + 0.08 + Math.sin(t * 2) * 0.03, zCanoe); canoe.rotation.set(0, Math.cos(zCanoe * 0.05) * 0.1, Math.sin(t * 1.6) * 0.04);
      ['p0', 'p1'].forEach(function (k, i) { var pp = canoe.userData[k]; pp.bras[1].rotation.z = Math.sin(t * 2.4 + i) * 0.6; });
      libs.forEach(function (l) { l.p += dt; l.m.position.set(l.x + Math.sin(l.p * 0.7) * 2.5, 0.5 + Math.sin(l.p * 1.9) * 0.25, l.z + Math.cos(l.p * 0.5) * 2.5); l.m.rotation.y = l.p * 0.7; l.a.scale.z = 0.6 + Math.abs(Math.sin(l.p * 60)) * 0.6; });
      for (var c = coeurs.length - 1; c >= 0; c--) { var h = coeurs[c]; h.t += dt; h.s.position.y += dt * 0.5; h.s.material.opacity = Math.max(0, 1 - h.t / 2.2); if (h.t > 2.2) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(c, 1); } }
    });
    var arriveDit = false;
    mo.surCamera = function (camera) {
      cielM.position.copy(camera.position);
      soleilH.position.copy(camera.position).addScaledVector(dirS, 900);
    };
    mo.debut = function (a) {
      api = a; habiller(); if (AV.jeu) AV.jeu.camera(-Math.PI / 2, 0.3, 7); sousTitre();
      dire('☀️ Un après-midi d\'été au bord de l\'Hérault, à Laroque… notre toute première journée ensemble ❤', 4.2);
    };
    mo.nettoyer = function () { deshabiller(); phase = 'parti'; };
    mo.debug = {
      etat: function () { return { phase: phase, lui: luiEtat, posture: posture, miam: nMiam, eclat: nEclat, parler: nParler, lui_pos: [lP.x.toFixed(1), lP.z.toFixed(1)] }; },
      plaid: function () { itPlaid.fn(); }, miam: function () { itPanier.fn(); },
      juger: function () { itJuger.fn(); }, nager: function () { allerNager(); }, eclat: function () { itEclat.fn(); },
      dalle: function () { itDalle.fn(); }, parler: function () { itParler.fn(); }, bisou: function () { itBisou.fn(); },
      luiA: function (x, z) { lP.set(x, 0, z); }, luiG: function () { return lui.groupe; }
    };
    return mo;
  };
})(window.AV);
