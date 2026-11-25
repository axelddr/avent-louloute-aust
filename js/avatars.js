/* Avatars : Océane (la joueuse) et Axel, reconnaissables d'un jour à l'autre.
   - Océane : longs cheveux blonds raides (racines plus foncées, raie au milieu), taches de rousseur,
     créoles dorées, peau dorée ; presque toujours en robe → une garde-robe, une tenue par jour.
   - Axel : cheveux châtains ondulés avec du volume sur le dessus, barbe courte, yeux bleu-gris.
   Le décor reste « low-poly », mais les visages et les cheveux sont lisses et détaillés (yeux, nez, oreilles, sourcils…).
   AV.avatars.teteOceane(tete, r) / teteAxel(tete, r) décorent une tête (groupe, face vers +z, crâne de rayon r).
   AV.avatars.coiffer(tete, qui, o) transforme une tête de PNJ d'un biome en Axel ou en Océane.
   AV.avatars.tenue(cfg) donne la tenue du jour (cfg.tenue = nom ou objet pour la forcer). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var C = {
    peauO: '#efc6a0', cheveuxO: '#e3c58c', racinesO: '#a98154', mechesO: '#f2dfae', rousseur: '#c08462', levres: '#cf6577', sourcilsO: '#8f6b47', yeuxO: '#6b5233', or: '#e6b84e',
    peauA: '#f0c6a0', cheveuxA: '#5b3a22', cheveuxA2: '#6c4528', barbeA: '#7a5435', sourcilsA: '#4a2f1c', yeuxA: '#5f86a8'
  };

  // matériaux « facettes » (habits) et « lisses » (visages, cheveux)
  var mats = {};
  function mat(c, deux) {
    var k = c + (deux ? '2' : '');
    if (!mats[k]) mats[k] = new THREE.MeshLambertMaterial({ color: c, side: deux ? THREE.DoubleSide : THREE.FrontSide, flatShading: true });
    return mats[k];
  }
  var lisses = {};
  function lisse(c, o) {
    o = o || {};
    var k = c + (o.deux ? 'd' : '') + (o.brillant ? 'b' : '') + (o.vc ? 'v' : '') + (o.op || '');
    if (!lisses[k]) {
      var p = { color: o.vc ? '#ffffff' : c, side: o.deux ? THREE.DoubleSide : THREE.FrontSide, vertexColors: !!o.vc };
      if (o.op) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
      if (o.brillant) { p.shininess = 14; p.specular = new THREE.Color('#2a241c'); lisses[k] = new THREE.MeshPhongMaterial(p); }
      else lisses[k] = new THREE.MeshLambertMaterial(p);
    }
    return lisses[k];
  }
  function ml(geo, c, o) { var x = new THREE.Mesh(geo, lisse(c, o)); x.castShadow = !(o && o.op); return x; }
  function sph(rad, w, h) { return new THREE.SphereGeometry(rad, w || 16, h || 12); }
  // un point à la surface du crâne (face vers +z)
  function surf(r, x, y, plus) { return Math.sqrt(Math.max(0, r * r - x * x - y * y)) + (plus == null ? 0.004 : plus); }
  // dégradé vertical par sommet (racines → pointes)
  function degrade(geo, cHaut, cBas, yHaut, yBas) {
    var p = geo.attributes.position, a = new THREE.Color(cHaut), b = new THREE.Color(cBas), c = new THREE.Color(), col = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count; i++) {
      var t = Math.max(0, Math.min(1, (yHaut - p.getY(i)) / (yHaut - yBas)));
      c.copy(a).lerp(b, t); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  }
  // une mèche plate : section en ellipse (large le long de la tête, fine vers l'extérieur), effilée aux pointes,
  // couleur racine → pointe. pts = points de passage [x, y, z] dans le repère de la tête.
  function meche(pts, larg, ep, cA, cB) {
    var cv = new THREE.CatmullRomCurve3(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
    var n = 16, rs = 10, P = [], I = [], col = [], i, j;
    var a = new THREE.Color(cA), b = new THREE.Color(cB), c = new THREE.Color();
    var T = new THREE.Vector3(), R = new THREE.Vector3(), W = new THREE.Vector3(), N = new THREE.Vector3();
    for (i = 0; i <= n; i++) {
      var u = i / n, p = cv.getPointAt(u); cv.getTangentAt(u, T);
      R.set(p.x, 0, p.z); if (R.lengthSq() < 1e-8) R.set(0, 0, -1); R.normalize();      // vers l'extérieur
      W.crossVectors(T, R).normalize(); N.crossVectors(W, T).normalize(); if (N.dot(R) < 0) N.negate();
      var s = u < 0.2 ? 0.75 + 1.25 * u : 1 - 0.88 * Math.pow((u - 0.2) / 0.8, 1.6);
      c.copy(a).lerp(b, u);
      for (j = 0; j <= rs; j++) {
        var v = j / rs * Math.PI * 2, cw = Math.cos(v) * larg * s, ct = Math.sin(v) * ep * (0.4 + 0.6 * s);
        P.push(p.x + W.x * cw + N.x * ct, p.y + W.y * cw + N.y * ct, p.z + W.z * cw + N.z * ct);
        col.push(c.r, c.g, c.b);
      }
    }
    for (i = 0; i < n; i++) for (j = 0; j < rs; j++) { var q = i * (rs + 1) + j; I.push(q, q + rs + 1, q + 1, q + 1, q + rs + 1, q + rs + 2); }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(I); geo.computeVertexNormals();
    return ml(geo, '#fff', { vc: true, brillant: true, deux: true });
  }

  // ---------- le visage (commun) ----------
  function visage(g, r, qui, o) {
    var k = r / 0.31, ax = qui === 'axel', peau = o.peau || (ax ? C.peauA : C.peauO);
    if (!o.sansYeux) [-1, 1].forEach(function (s) {
      var x = s * 0.105 * k, y = 0.015 * k, z = surf(r, x, y, -0.014 * k);
      var bl = ml(sph(0.05 * k, 16, 12), '#fbf8f4'); bl.position.set(x, y, z); bl.scale.set(1, ax ? 0.88 : 1.08, 0.5); g.add(bl);
      var ir = ml(sph(0.034 * k, 14, 10), ax ? C.yeuxA : C.yeuxO); ir.position.set(x - s * 0.004 * k, y - 0.004 * k, z + 0.019 * k); ir.scale.set(1, 1.06, 0.45); g.add(ir);
      var pu = ml(sph(0.017 * k, 10, 8), '#17121b'); pu.position.set(x - s * 0.004 * k, y - 0.004 * k, z + 0.03 * k); pu.scale.z = 0.4; g.add(pu);
      var re = new THREE.Mesh(sph(0.009 * k, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' })); re.position.set(x + 0.009 * k, y + 0.011 * k, z + 0.036 * k); g.add(re);
      if (!ax) { // cils
        var cil = ml(new THREE.BoxGeometry(0.08 * k, 0.012 * k, 0.014 * k), '#2a1c14'); cil.position.set(x, y + 0.05 * k, z + 0.008 * k); cil.rotation.z = s * -0.12; g.add(cil);
        var cil2 = ml(new THREE.BoxGeometry(0.03 * k, 0.011 * k, 0.012 * k), '#2a1c14'); cil2.position.set(x + s * 0.047 * k, y + 0.055 * k, z - 0.004 * k); cil2.rotation.z = s * 0.55; g.add(cil2);
      }
      // sourcils en arc
      var so = ml(new THREE.TorusGeometry(0.06 * k, (ax ? 0.014 : 0.008) * k, 6, 12, 1.5), ax ? C.sourcilsA : C.sourcilsO);
      so.position.set(x, y + 0.045 * k, surf(r, x, y + 0.1 * k, -0.002 * k)); so.rotation.z = Math.PI / 2 - 0.75 - s * (ax ? 0.05 : 0.12); g.add(so);
    });
    // nez, oreilles
    var nz = ml(sph(0.032 * k, 12, 10), peau); nz.position.set(0, -0.045 * k, surf(r, 0, -0.045 * k, -0.006 * k)); nz.scale.set(0.85, 1, 0.9); g.add(nz);
    [-1, 1].forEach(function (s) { var or = ml(sph(0.07 * k, 12, 10), peau); or.position.set(s * r * 0.97, -0.02 * k, -0.01 * k); or.scale.set(0.42, 1, 0.72); g.add(or); });
    // bouche (devant la barbe pour Axel)
    var zb = surf(ax ? r * 1.04 : r, 0, -0.125 * k, 0.002 * k);
    var bo = ml(new THREE.TorusGeometry(0.045 * k, (ax ? 0.011 : 0.013) * k, 6, 12, Math.PI), ax ? '#6e2e26' : C.levres);
    bo.position.set(0, -0.11 * k, zb); bo.rotation.z = Math.PI; g.add(bo);
    if (!ax) {
      var lv = ml(sph(0.026 * k, 10, 8), C.levres); lv.position.set(0, -0.148 * k, surf(r, 0, -0.148 * k, -0.006 * k)); lv.scale.set(1.3, 0.5, 0.6); g.add(lv);
      [-1, 1].forEach(function (s) { // joues rosées
        var j = ml(sph(0.05 * k, 12, 8), '#f3a0a0', { op: 0.45 }); j.position.set(s * 0.17 * k, -0.06 * k, surf(r, s * 0.17 * k, -0.06 * k, -0.01 * k)); j.scale.z = 0.4; g.add(j);
      });
      // taches de rousseur (nez + pommettes)
      [[-0.15, -0.035], [-0.12, -0.065], [-0.17, -0.075], [-0.09, -0.04], [0.15, -0.035], [0.12, -0.065], [0.17, -0.075], [0.09, -0.04], [-0.035, -0.03], [0.03, -0.035], [0.0, -0.02]].forEach(function (q) {
        var x = q[0] * k, y = q[1] * k, t = ml(sph(0.0075 * k, 5, 4), C.rousseur); t.position.set(x, y, surf(r, x, y, 0.0)); g.add(t);
      });
    }
  }

  // ---------- Océane ----------
  function teteOceane(tete, r, o) {
    o = o || {};
    var g = new THREE.Group(); g.name = 'coiffure'; tete.add(g);
    var k = r / 0.31, D = o.dos || 1;
    visage(g, r, 'oceane', o);
    var RA = C.racinesO, MI = C.cheveuxO, PT = C.mechesO, br = { vc: true, brillant: true, deux: true };
    if (!o.sansCalotte) [-1, 1].forEach(function (s) { // deux moitiés légèrement écartées → la raie au milieu
      var geo = degrade(new THREE.SphereGeometry(r * 1.07, 22, 14, s < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI * 0.56), RA, MI, r * 1.07, -r * 0.2);
      var h = ml(geo, '#fff', br); h.rotation.x = -0.32; h.rotation.z = -s * 0.045; h.position.set(0, 0.012 * k, -0.02 * k); g.add(h);
    });
    // la chevelure autour de la tête (ouverte devant le visage)
    var p1 = [[0.98, 0.62], [1.08, 0.3], [1.12, -0.1], [1.12, -0.5], [1.08 * D, -0.85]].map(function (p) { return new THREE.Vector2(p[0] * r, p[1] * r); });
    g.add(ml(degrade(new THREE.LatheGeometry(p1, 30, 0.6, Math.PI * 2 - 1.2), RA, MI, 0.62 * r, -0.9 * r), '#fff', br));
    // les longueurs dans le dos, jusqu'aux omoplates
    var p2 = [[1.1, -0.5], [1.08 * D, -1.0], [1.05 * D, -1.6], [1.0 * D, -2.05], [0.94 * D, -2.15]].map(function (p) { return new THREE.Vector2(p[0] * r, p[1] * r); });
    g.add(ml(degrade(new THREE.LatheGeometry(p2, 22, Math.PI - 1.0, 2.0), MI, PT, -0.5 * r, -2.15 * r), '#fff', br));
    // mèches qui encadrent le visage et tombent devant les épaules (plates, superposées)
    [-1, 1].forEach(function (s) {
      g.add(meche([[s * 0.55 * r, 0.85 * r, 0.62 * r], [s * 0.9 * r, 0.35 * r, 0.7 * r], [s * 1.04 * r, -0.3 * r, 0.62 * r], [s * 0.98 * D * r, -0.95 * r, 0.6 * D * r], [s * 0.9 * D * r, -1.5 * r, 0.64 * D * r]], 0.17 * r, 0.07 * r, RA, PT));
      g.add(meche([[s * 0.8 * r, 0.7 * r, 0.4 * r], [s * 1.1 * r, 0.0, 0.42 * r], [s * 1.12 * D * r, -0.8 * r, 0.38 * D * r], [s * 1.04 * D * r, -1.65 * r, 0.42 * D * r]], 0.2 * r, 0.08 * r, MI, PT));
      g.add(meche([[s * 0.9 * r, 0.6 * r, 0.0], [s * 1.15 * r, -0.2 * r, 0.05 * r], [s * 1.14 * D * r, -1.0 * r, 0.05 * D * r], [s * 1.08 * D * r, -1.85 * r, 0.08 * D * r]], 0.24 * r, 0.08 * r, RA, MI));
    });
    // pointes dans le dos, de longueurs différentes (casse la ligne du bas)
    [-0.75, -0.38, 0, 0.38, 0.75].forEach(function (da, i) {
      var an = Math.PI + da, L = [2.35, 2.5, 2.42, 2.55, 2.3][i];
      var pt = function (rr, y) { return [Math.sin(an) * rr * r, y * r, Math.cos(an) * rr * r]; };
      g.add(meche([pt(1.13 * D, -0.7), pt(1.1 * D, -1.4), pt(1.06 * D, -2.0), pt(1.02 * D, -L)], 0.2 * r, 0.08 * r, MI, PT));
    });
    [-1, 1].forEach(function (s) {
      // créoles dorées
      if (o.boucles !== false) { var b = ml(new THREE.TorusGeometry(0.035 * k, 0.007 * k, 6, 14), C.or, { brillant: true }); b.position.set(s * 1.16 * r, -0.3 * r, 0.3 * r); b.rotation.y = Math.PI / 2 - s * 0.3; g.add(b); }
    });
    return g;
  }

  // ---------- Axel ----------
  function teteAxel(tete, r, o) {
    o = o || {};
    var g = new THREE.Group(); g.name = 'coiffure'; tete.add(g);
    var k = r / 0.31, br = { brillant: true };
    visage(g, r, 'axel', o);
    if (!o.sansCalotte) {
      var cal = ml(new THREE.SphereGeometry(r * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), C.cheveuxA, br); cal.rotation.x = -0.38; cal.position.set(0, 0.015 * k, -0.012 * k); g.add(cal);
      // le volume ondulé sur le dessus : des « vagues » rabattues vers l'arrière, une mèche qui retombe sur le front
      [[0, 0.29, 0.13, 0.13, 0.3], [-0.12, 0.26, 0.09, 0.11, 0.5], [0.12, 0.27, 0.07, 0.11, -0.4], [-0.05, 0.31, -0.03, 0.12, 0.2], [0.08, 0.3, -0.07, 0.11, -0.2],
       [-0.16, 0.2, -0.02, 0.09, 0.8], [0.16, 0.19, -0.02, 0.09, -0.8], [0.03, 0.24, 0.2, 0.1, -0.2], [-0.06, 0.27, -0.15, 0.11, 0.1]].forEach(function (q, i) {
        var b = ml(sph(q[3] * k, 14, 10), i % 2 ? C.cheveuxA2 : C.cheveuxA, br); b.position.set(q[0] * k, q[1] * k, q[2] * k); b.scale.set(1.25, 0.62, 1.0); b.rotation.set(-0.3, 0, q[4]); g.add(b);
      });
    }
    // pattes, barbe courte, moustache
    [-1, 1].forEach(function (s) {
      var pa = ml(sph(0.06 * k, 10, 8), C.cheveuxA); pa.position.set(s * r * 0.95, -0.03 * k, 0.05 * k); pa.scale.set(0.42, 1.35, 0.6); g.add(pa);
      var mo = ml(sph(0.03 * k, 10, 8), C.barbeA); mo.position.set(s * 0.032 * k, -0.088 * k, surf(r, s * 0.032 * k, -0.088 * k, 0.004 * k)); mo.scale.set(1.6, 0.6, 0.6); mo.rotation.z = s * -0.25; g.add(mo);
    });
    g.add(ml(new THREE.SphereGeometry(r * 1.035, 28, 10, Math.PI / 2 - 1.45, 2.9, Math.PI * 0.58, Math.PI * 0.3), C.barbeA));
    var me = ml(sph(0.1 * k, 14, 10), C.barbeA); me.position.set(0, -0.26 * k, 0.16 * k); me.scale.set(1.25, 0.75, 0.85); g.add(me);
    return g;
  }

  // ---------- la garde-robe d'Océane ----------
  // type : robe | ensemble | maillot ; longueur de robe : courte | midi | longue
  // manches : nues | courtes | longues ; motif : pois | fleurs | vichy | rayures
  var TENUES = {
    ete_blanche:   { type: 'robe', robe: '#f7f3ea', longueur: 'midi', manches: 'nues', chaussures: '#c99a6b', lunettes: true },
    noire:         { type: 'robe', robe: '#1d1c22', longueur: 'courte', manches: 'courtes', chaussures: '#1d1c22' },
    boheme:        { type: 'robe', robe: '#f4eee0', longueur: 'longue', manches: 'nues', motif: 'fleurs', motifC: '#c9a36a', chapeau: true, chaussures: '#b48356' },
    sauge:         { type: 'robe', robe: '#cfd3a8', longueur: 'longue', manches: 'nues', motif: 'fleurs', motifC: '#e8e8cf', chaussures: '#d8c2a0' },
    marine:        { type: 'robe', robe: '#2d3b63', longueur: 'midi', manches: 'courtes', motif: 'pois', motifC: '#ffffff', chaussures: '#e9e4dc' },
    fleurie_jaune: { type: 'robe', robe: '#f2cf5b', longueur: 'midi', manches: 'nues', motif: 'fleurs', motifC: '#ffffff', chaussures: '#c99a6b' },
    sport:         { type: 'ensemble', haut: '#ef6c8a', bas: '#26262e', basType: 'short', manches: 'courtes', chaussures: '#f4f4f4' },
    golf:          { type: 'ensemble', haut: '#ffffff', bas: '#d9c7a5', basType: 'jupe', manches: 'courtes', chaussures: '#ffffff', casquette: '#ffffff' },
    sweat:         { type: 'ensemble', haut: '#b9bcc2', bas: '#2a2a33', basType: 'pantalon', manches: 'longues', chaussures: '#e9e4dc' },
    maillot:       { type: 'maillot', haut: '#5a2a24', motif: 'pois', motifC: '#ffffff', chaussures: '#ecc29b' },
    rose_poudre:   { type: 'robe', robe: '#e8b9b5', longueur: 'midi', manches: 'courtes', chaussures: '#ecc29b' },
    nuisette:      { type: 'robe', robe: '#c9b6e0', longueur: 'courte', manches: 'nues', chaussures: '#ecc29b' },
    coupe_vent:    { type: 'ensemble', haut: '#2f8f83', bas: '#26262e', basType: 'pantalon', manches: 'longues', chaussures: '#7a7a80' },
    maille:        { type: 'robe', robe: '#efe5d2', longueur: 'midi', manches: 'longues', collants: '#3a3036', chaussures: '#6b4a32' },
    corail:        { type: 'robe', robe: '#ff6f5e', longueur: 'longue', manches: 'nues', chaussures: '#c99a6b' },
    vichy:         { type: 'robe', robe: '#7fa6d6', longueur: 'midi', manches: 'courtes', motif: 'vichy', motifC: '#ffffff', chaussures: '#f4f0e6' },
    montagne:      { type: 'ensemble', haut: '#d9483b', bas: '#2a2a33', basType: 'pantalon', manches: 'longues', chaussures: '#6b4a32', doudoune: true },
    bordeaux:      { type: 'robe', robe: '#7d1f33', longueur: 'courte', manches: 'longues', chaussures: '#1d1c22' },
    satin_vert:    { type: 'robe', robe: '#1f5a45', longueur: 'longue', manches: 'nues', chaussures: '#d6b56a' },
    manteau:       { type: 'robe', robe: '#1d1c22', longueur: 'courte', manches: 'longues', veste: '#b98b5c', collants: '#2a2228', echarpe: '#efe6d8', chaussures: '#3a2a20' },
    fleurie_rouge: { type: 'robe', robe: '#c8343f', longueur: 'midi', manches: 'courtes', motif: 'fleurs', motifC: '#ffe6e0', chaussures: '#ecc29b' },
    velours_noel:  { type: 'robe', robe: '#a3162a', longueur: 'midi', manches: 'longues', collants: '#2a2228', chaussures: '#1d1c22' },
    doree:         { type: 'robe', robe: '#d9b45a', longueur: 'longue', manches: 'nues', motif: 'pois', motifC: '#fff3c4', chaussures: '#d6b56a' }
  };
  // tenue par défaut de chaque jour (cfg.tenue dans jours.js la remplace)
  var PAR_JOUR = ['ete_blanche', 'noire', 'boheme', 'sauge', 'marine', 'fleurie_jaune', 'sport', 'golf', 'sweat', 'maillot', 'rose_poudre',
    'nuisette', 'coupe_vent', 'maille', 'corail', 'vichy', 'montagne', 'sauge', 'maillot', 'bordeaux', 'satin_vert', 'manteau', 'fleurie_rouge', 'velours_noel', 'doree'];
  function tenue(cfg) {
    var t = cfg && cfg.tenue;
    if (t && typeof t === 'object') return t;
    if (t && TENUES[t]) return TENUES[t];
    var j = cfg && cfg.jour ? cfg.jour : 0;
    return TENUES[PAR_JOUR[j] || 'ete_blanche'];
  }

  // motifs (textures partagées)
  var texs = {};
  function motif(nom, fond, c) {
    var key = nom + fond + c;
    if (texs[key]) return texs[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 64; var x = cv.getContext('2d');
    x.fillStyle = fond; x.fillRect(0, 0, 64, 64); x.fillStyle = c; x.strokeStyle = c;
    if (nom === 'pois') { [[10, 10], [42, 10], [26, 30], [58, 30], [10, 50], [42, 50]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 3.2, 0, 7); x.fill(); }); }
    else if (nom === 'fleurs') { [[14, 14], [46, 22], [24, 46], [54, 52]].forEach(function (p) { for (var i = 0; i < 5; i++) { var a = i / 5 * 6.283; x.beginPath(); x.arc(p[0] + Math.cos(a) * 4, p[1] + Math.sin(a) * 4, 2.8, 0, 7); x.fill(); } }); }
    else if (nom === 'vichy') { x.globalAlpha = 0.45; for (var i = 0; i < 64; i += 16) { x.fillRect(i, 0, 8, 64); x.fillRect(0, i, 64, 8); } }
    else if (nom === 'rayures') { for (var j = 0; j < 64; j += 12) x.fillRect(0, j, 64, 5); }
    var t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
    texs[key] = t; return t;
  }
  function tissu(t, couleur) {
    if (!t.motif) return mat(couleur);
    var k = 'tx' + t.motif + couleur + t.motifC;
    if (!mats[k]) mats[k] = new THREE.MeshLambertMaterial({ map: motif(t.motif, couleur, t.motifC || '#ffffff'), flatShading: true });
    return mats[k];
  }

  // Transforme une tête de PNJ déjà construite par un biome (crâne = 1er enfant, face vers +z) en Axel ou Océane :
  // crâne lissé, yeux / bouche / joues / cheveux d'origine retirés (o.retirer = couleur(s) des cheveux), nouveau visage + coiffure.
  // o.chapeau : la tête porte déjà casquette / casque / bonnet (gardés) → pas de calotte ; o.lunettes : pas d'yeux (masque, lunettes).
  // Les têtes des PNJ (rayon 0,17) sont un peu agrandies pour se rapprocher des proportions d'Océane.
  function coiffer(tete, qui, o) {
    o = o || {};
    var crane = tete.children[0], r = (crane && crane.geometry && crane.geometry.parameters && crane.geometry.parameters.radius) || 0.17;
    var hex = function (c) { return new THREE.Color(c).getHex(); };
    var hors = o.retirer ? [].concat(o.retirer).map(hex) : [], oeil = hex('#2b2340'), joues = ['#f29a9a', '#f2a0a0'].map(hex);
    tete.children.slice(1).forEach(function (c) {
      if (!c.material || !c.material.color) return;
      var h = c.material.color.getHex(), gp = c.geometry && c.geometry.parameters;
      var bouche = c.geometry && c.geometry.type === 'TorusGeometry' && gp.radius < r * 0.4 && gp.arc < 3.2;
      if (hors.indexOf(h) >= 0 || h === oeil || joues.indexOf(h) >= 0 || bouche) tete.remove(c);
    });
    var peau = '#' + crane.material.color.getHexString();
    crane.geometry = new THREE.SphereGeometry(r, 24, 18);
    crane.material = lisse(peau);
    if (r < 0.2) tete.scale.multiplyScalar(1.25);
    var oo = { sansCalotte: o.chapeau, peau: peau, sansYeux: o.lunettes, boucles: o.boucles, dos: r < 0.2 ? 1.2 : 1 };
    if (qui === 'axel') teteAxel(tete, r, oo); else teteOceane(tete, r, oo);
  }

  AV.avatars = { couleurs: C, teteOceane: teteOceane, teteAxel: teteAxel, coiffer: coiffer, TENUES: TENUES, tenue: tenue, tissu: tissu, mat: mat, lisse: lisse };
})(window.AV);
