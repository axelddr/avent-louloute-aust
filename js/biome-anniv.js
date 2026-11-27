/* Biome « anniv » : jour 23, les 20 ans de Loïs dans la maison des parents d'Axel (d'après les photos de media/J23).
   Grande pièce de vie carrelée : salle à manger (longue table en bois, chaises noires en métal, 3 suspensions, stores à lamelles),
   salon (canapé d'angle en cuir noir, méridienne, télé + village de Noël lumineux, panneau à tasseaux, « LIFE IS A BEAUTIFUL RIDE »,
   cage à oiseaux sur pied devant le mur de briques, rideau de l'entrée, armoire en bois, sapin), cuisine noire derrière la verrière
   (îlot à évier noir, table haute + bancs, suspension géométrique cuivrée, fenêtre à store vénitien, étagère « Coffee »).
   Jeu « Qui est qui ? » : toute la famille est là. On joue Océane ; ✋ près de quelqu'un → il/elle donne un indice, on choisit son prénom.
   Bonne réponse = son prénom s'affiche au-dessus de sa tête ; erreur = un 2e indice (puis moins de choix). Axel (qui suit) donne des coups de pouce.
   Tout le monde nommé → on se met autour de la table, lumières éteintes, ✋ chanter « Joyeux anniversaire », Loïs souffle ses 20 bougies → surprise.
   La famille (prénom, indices, apparence, place) se règle dans jours.js (cfg.famille). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#0b1230', bas: '#1c2446', brouillard: '#121933', hemi: ['#fff0dc', '#6a5a48', 0.95], soleil: ['#ffe2bc', 0.32, [0.3, 1, 0.25]] };
  var HM = 3.1, EP = 0.14;
  var SALLE = { x0: -9, x1: 9.6, z0: -6, z1: 6 };          // salle à manger (ouest) + salon (est)
  var CUIS = { x0: -15, x1: -9, z0: -6, z1: 6 };            // la cuisine, derrière la verrière
  var VERR = { z0: -0.9, z1: 2.6 };                         // grande ouverture dans la verrière
  var TABLE = { x: -3.2, z: -2.7, l: 4.4, p: 1.15, h: 0.76 };
  var ILOT = { x: -12.0, z: -1.9, l: 1.1, p: 2.6 };
  var HAUTE = { x: -12.2, z: 3.1 };
  var CAGE = { x: 1.0, z: 5.15 };
  var TV = { x: 9.3, z: -0.2 };
  var SAPIN = { x: -5.7, z: 4.9 };
  var ARMOIRE = { x: -8.1, z: 5.45 };

  function dansRect(x, z, r, m) { m = m || 0; return x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m; }
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function H() { return 0; }
  function autorise(x, z) {
    var m = 0.28;
    if (x > CUIS.x1 - 0.2 && x < CUIS.x1 + 0.2) return z > VERR.z0 + m && z < VERR.z1 - m; // passage dans la verrière
    return dansRect(x, z, { x0: SALLE.x0 + m, x1: SALLE.x1 - m, z0: SALLE.z0 + m, z1: SALLE.z1 - m }) ||
           dansRect(x, z, { x0: CUIS.x0 + m, x1: CUIS.x1 - m, z0: CUIS.z0 + m, z1: CUIS.z1 - m });
  }

  // ---------- Petits outils (géométries fusionnées) ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(F, l, h, p, col, x, y, z, ry, rx, rz) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1, rx || 0, rz || 0); }
  function cyl(F, r0, r1, h, col, x, y, z, n) { forme(F, new THREE.CylinderGeometry(r0, r1, h, n || 10), col, x, y, z, 0, 1, 1, 1); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function toile(dessin, w, h, cw, ch, opts) {
    opts = opts || {};
    var c = document.createElement('canvas'); c.width = cw || 512; c.height = ch || Math.round((cw || 512) * h / w);
    dessin(c.getContext('2d'), c.width, c.height);
    var tex = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !!opts.transparent, side: THREE.DoubleSide, depthWrite: !opts.transparent }));
    m.userData.canvas = c; m.userData.tex = tex;
    return m;
  }
  function colRect(col, x, z, hx, hz) { col.push({ rect: true, x: x, z: z, hx: hx, hz: hz, a: 0 }); }

  // ---------- Les membres de la famille : corps simple + tête lisse (coiffure, lunettes, barbe) ----------
  var Ls = function (c, o) { return AV.avatars.lisse(c, o); };
  function ml(geo, c, o) { var m = new THREE.Mesh(geo, Ls(c, o)); m.castShadow = true; return m; }
  function sph(r, w, h) { return new THREE.SphereGeometry(r, w || 14, h || 10); }
  function lathe(pts, r, gap) { // coque de cheveux autour de la tête, ouverte devant le visage (gap rad)
    return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0] * r, p[1] * r); }), 28, gap / 2, Math.PI * 2 - gap);
  }
  function coiffure(g, r, style, ch, o) {
    var br = { brillant: true, deux: true };
    function calotte(theta, rx, k) { var c = ml(new THREE.SphereGeometry(r * (k || 1.06), 22, 12, 0, Math.PI * 2, 0, Math.PI * theta), ch, br); c.rotation.x = rx; g.add(c); return c; }
    if (style === 'chauve') { var cr = ml(new THREE.SphereGeometry(r * 1.03, 20, 8, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, Math.PI * 0.42, Math.PI * 0.22), ch, br); g.add(cr); return; }
    if (style === 'degarni') { calotte(0.42, -1.0); [-1, 1].forEach(function (s) { var t = ml(sph(r * 0.5), ch, br); t.position.set(s * r * 0.82, r * 0.1, -r * 0.2); t.scale.set(0.45, 0.9, 1.1); g.add(t); }); return; }
    if (style === 'court' || style === 'ras') {
      calotte(0.5, -0.35, style === 'ras' ? 1.03 : 1.07);
      if (style === 'court') [[0, 0.95, 0.25], [-0.35, 0.88, 0.1], [0.35, 0.88, 0.1], [0, 0.9, -0.3]].forEach(function (q) { var b = ml(sph(r * 0.42), ch, br); b.position.set(q[0] * r, q[1] * r, q[2] * r); b.scale.set(1.3, 0.55, 1.1); g.add(b); });
      return;
    }
    if (style === 'court_f') { // coupe courte féminine (pixie), un peu de volume
      calotte(0.56, -0.25, 1.08);
      g.add(ml(lathe([[1.0, 0.45], [1.1, 0.0], [1.06, -0.45], [0.9, -0.7]], r, 2.4), ch, br));
      var fr = ml(sph(r * 0.5), ch, br); fr.position.set(r * 0.3, r * 0.75, r * 0.6); fr.scale.set(1.4, 0.5, 0.8); fr.rotation.z = -0.3; g.add(fr);
      return;
    }
    if (style === 'boucles') { // cheveux bouclés foncés, volumineux, aux épaules
      calotte(0.55, -0.2, 1.1);
      for (var i = 0; i < 26; i++) {
        var a = (i / 26) * Math.PI * 2, haut = i % 2;
        if (Math.cos(a) > 0.55 && !haut) continue; // dégagé devant le visage
        var b = ml(sph(r * (0.34 + (i % 3) * 0.05), 10, 8), ch, br);
        var rr = r * (1.02 + (i % 3) * 0.06), y = haut ? r * (0.35 + (i % 4) * 0.1) : -r * (0.2 + (i % 5) * 0.22);
        if (haut && Math.cos(a) > 0.6) y = r * 0.8;
        b.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr * (Math.cos(a) > 0 ? 0.75 : 1)); g.add(b);
      }
      return;
    }
    if (style === 'chignon') { calotte(0.56, -0.25, 1.07); var cg = ml(sph(r * 0.45), ch, br); cg.position.set(0, r * 0.75, -r * 0.85); g.add(cg); return; }
    // carré / mi-long / long : calotte + coque ouverte devant + longueurs
    var bas = style === 'carre' ? -0.85 : style === 'mi_long' ? -1.55 : -2.3;
    calotte(0.56, -0.28, 1.08);
    var pts = [[1.0, 0.6], [1.1, 0.25], [1.13, -0.15]];
    for (var y = -0.5; y >= bas; y -= 0.4) pts.push([1.13 - (y < -1.2 ? 0.05 : 0), y]);
    pts.push([1.0, bas - 0.08]);
    g.add(ml(lathe(pts, r, 1.3), ch, br));
    if (o.frange) { var fg = ml(new THREE.SphereGeometry(r * 1.1, 16, 6, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.18, Math.PI * 0.2), ch, br); g.add(fg); }
  }
  function tete(o) {
    var g = new THREE.Group(), r = 0.2, peau = o.peau || '#efc6a0', ch = o.cheveux || '#5a3a24', femme = o.genre === 'f';
    if (o.qui === 'axel') { // Axel garde sa tête de tous les jours (avatars.js)
      var pA = AV.avatars.couleurs.peauA; g.add(ml(sph(r, 24, 18), pA)); AV.avatars.teteAxel(g, r, { peau: pA }); return g;
    }
    g.add(ml(sph(r, 22, 16), peau));
    [-1, 1].forEach(function (s) {
      var bl = ml(sph(0.034, 12, 8), '#fbf8f4'); bl.position.set(s * 0.068, 0.012, r - 0.014); bl.scale.set(1, femme ? 1.1 : 0.9, 0.5); g.add(bl);
      var ir = ml(sph(0.021, 10, 8), o.yeux || '#4f3a28'); ir.position.set(s * 0.066, 0.01, r + 0.004); ir.scale.z = 0.45; g.add(ir);
      var pu = ml(sph(0.01, 8, 6), '#17121b'); pu.position.set(s * 0.066, 0.01, r + 0.012); pu.scale.z = 0.4; g.add(pu);
      var so = ml(new THREE.BoxGeometry(0.062, femme ? 0.01 : 0.016, 0.014), o.sourcils || (o.age === 'senior' ? '#9a9590' : ch)); so.position.set(s * 0.068, 0.058, r - 0.012); so.rotation.z = -s * 0.14; g.add(so);
      var or = ml(sph(0.045, 10, 8), peau); or.position.set(s * r * 0.97, -0.01, 0); or.scale.set(0.4, 1, 0.7); g.add(or);
      if (femme && o.boucles !== false) { var bo = ml(sph(0.014, 6, 5), '#e6b84e', { brillant: true }); bo.position.set(s * r * 1.0, -0.07, 0.01); g.add(bo); }
    });
    var nz = ml(sph(0.026, 10, 8), peau); nz.position.set(0, -0.03, r + 0.004); nz.scale.set(0.85, 1, 0.9); g.add(nz);
    var bouche = ml(new THREE.TorusGeometry(0.034, femme ? 0.01 : 0.008, 6, 10, Math.PI), femme ? '#c75e6c' : '#7a3a30'); bouche.position.set(0, -0.085, r - 0.022); bouche.rotation.z = Math.PI; g.add(bouche);
    if (o.age === 'senior') [-1, 1].forEach(function (s) { var rd = ml(new THREE.TorusGeometry(0.03, 0.004, 4, 8, 1.6), '#c99a80'); rd.position.set(s * 0.1, -0.06, r - 0.03); rd.rotation.z = s > 0 ? 0.6 : Math.PI - 2.2; g.add(rd); });
    if (o.barbe) {
      var cb = o.barbe === true ? ch : o.barbe;
      g.add(ml(new THREE.SphereGeometry(r * 1.035, 22, 8, Math.PI / 2 - 1.4, 2.8, Math.PI * 0.6, Math.PI * 0.28), cb));
      var me = ml(sph(0.06), cb); me.position.set(0, -0.165, 0.1); me.scale.set(1.3, 0.7, 0.9); g.add(me);
      [-1, 1].forEach(function (s) { var mo = ml(sph(0.02, 8, 6), cb); mo.position.set(s * 0.025, -0.06, r + 0.005); mo.scale.set(1.6, 0.6, 0.6); g.add(mo); });
    }
    if (o.lunettes) {
      var lm = o.lunettes === true ? '#1d1c22' : o.lunettes;
      [-1, 1].forEach(function (s) {
        var c = ml(new THREE.TorusGeometry(0.042, 0.007, 6, 16), lm); c.position.set(s * 0.068, 0.012, r + 0.022); c.scale.y = 0.82; g.add(c);
        var v = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), new THREE.MeshBasicMaterial({ color: '#cfe4f0', transparent: true, opacity: 0.18, depthWrite: false })); v.position.set(s * 0.068, 0.012, r + 0.024); v.scale.y = 0.82; g.add(v);
        var bt = ml(new THREE.BoxGeometry(0.008, 0.008, 0.2), lm); bt.position.set(s * 0.112, 0.02, r - 0.08); g.add(bt);
      });
      var pt = ml(new THREE.BoxGeometry(0.03, 0.008, 0.008), lm); pt.position.set(0, 0.022, r + 0.024); g.add(pt);
    }
    coiffure(g, r, o.coiffure || (femme ? 'mi_long' : 'court'), ch, o);
    return g;
  }
  // accessoires tenus en main
  function objetMain(type) {
    var g = new THREE.Group();
    if (type === 'telephone') { g.add(bm(0.08, 0.15, 0.015, '#1d1c22', 0, 0.02, 0.05)); var e = bm(0.07, 0.13, 0.004, '#5c8ad6', 0, 0.02, 0.058); g.add(e); }
    else if (type === 'verre') { var v = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 10), new THREE.MeshLambertMaterial({ color: '#f2d07a', transparent: true, opacity: 0.75 })); v.position.set(0, 0.05, 0.04); g.add(v); }
    else if (type === 'biere') { var bt = AV.maille(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 8), '#2f6b3a'); bt.position.set(0, 0.06, 0.04); g.add(bt); }
    else if (type === 'assiettes') { for (var i = 0; i < 4; i++) { var a = AV.maille(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 14), '#f4f1ec'); a.position.set(0, 0.02 + i * 0.025, 0.12); g.add(a); } }
    else if (type === 'bouteille') { var bo = AV.maille(new THREE.CylinderGeometry(0.04, 0.045, 0.3, 8), '#3d1a26'); bo.position.set(0, 0.1, 0.04); g.add(bo); var go = AV.maille(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6), '#3d1a26'); go.position.set(0, 0.3, 0.04); g.add(go); }
    else if (type === 'torchon') { g.add(bm(0.06, 0.3, 0.12, '#e9e3d8', 0, -0.1, 0.03)); }
    return g;
  }
  function membre(o) {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var peau = o.peau || '#efc6a0', jambes = [], bras = [], femme = o.genre === 'f';
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      if (o.jupe) j.add(bm(0.13, 0.8, 0.14, o.collants || peau, 0, -0.4, 0)); else j.add(bm(0.15, 0.8, 0.17, o.bas || '#3b4150', 0, -0.4, 0));
      j.add(bm(0.16, 0.1, 0.27, o.chaussures || '#2a2a30', 0, -0.79, 0.05));
      jambes.push(j);
    });
    if (o.jupe) { var ju = AV.maille(new THREE.CylinderGeometry(0.22, 0.3, 0.45, 10), o.bas || '#3b4150'); ju.position.y = 0.62; corps.add(ju); }
    var tr = AV.maille(new THREE.CylinderGeometry(femme ? 0.2 : 0.22, femme ? 0.22 : 0.25, 0.64, 10), o.haut || '#24324a'); tr.position.y = 1.11; corps.add(tr);
    if (femme) { var po = AV.maille(new THREE.SphereGeometry(0.12, 8, 6), o.haut || '#24324a'); po.position.set(0, 1.22, 0.1); po.scale.set(1.5, 0.6, 0.5); corps.add(po); }
    if (o.gilet) [-1, 1].forEach(function (s) { var gi = bm(0.2, 0.62, 0.06, o.gilet, s * 0.12, 1.1, 0.19); corps.add(gi); });
    var cou = AV.maille(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), peau); cou.position.y = 1.47; corps.add(cou);
    var tt = tete(o); tt.position.y = 1.7; corps.add(tt);
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * (femme ? 0.27 : 0.3), 1.38, 0); b.rotation.z = c * 0.08; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 8), o.manches || o.haut || '#24324a'); m.position.y = -0.28; b.add(m);
      var mn = AV.maille(new THREE.SphereGeometry(0.058, 8, 6), peau); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    var objet = null;
    if (o.tient) { objet = objetMain(o.tient); objet.position.y = -0.62; bras[1].add(objet); }
    var s = o.taille || (o.age === 'senior' ? 0.95 : 1); g.scale.setScalar(s);
    return { groupe: g, corps: corps, bras: bras, tete: tt, jambes: jambes, objet: objet, echelle: s };
  }

  AV.biomes = AV.biomes || {};
  AV.biomes.anniv = function (cfg) {
    var rng = AV.rng(2323 + cfg.jour);
    var nomLui = cfg.copain || 'Axel', nomElle = cfg.copine || 'Océane', fete = cfg.fete || 'Loïs';
    var mo = new AV.Monde({
      rayon: 16, hauteur: H, surface: 'pave', ciel: CIEL, brouillard: [40, 160],
      depart: { x: -0.6, z: 3.9, angle: Math.PI }, theme: 'anniv', ambiance: null, autorise: autorise
    });
    mo.loin = 300;
    mo.sansAnimal = true;
    var G = mo.groupe, col = mo.colliders;
    var cielM = AV.ciel(CIEL.haut, CIEL.bas); G.add(cielM);
    G.add(AV.etoiles(160, 260));

    // ---------- Sols : grand carrelage clair (salle), carrelage effet pierre (cuisine), jardin de nuit dehors ----------
    var S = new AV.Fusion();
    for (var tx = SALLE.x0; tx < SALLE.x1 - 0.01; tx += 0.8) for (var tz = SALLE.z0; tz < SALLE.z1 - 0.01; tz += 0.8)
      boite(S, 0.79, 0.04, 0.79, AV.varier ? '#e9e4dc' : '#e9e4dc', tx + 0.4, -0.02, tz + 0.4);
    boite(S, SALLE.x1 - SALLE.x0, 0.02, SALLE.z1 - SALLE.z0, '#cfc8bd', (SALLE.x0 + SALLE.x1) / 2, -0.035, (SALLE.z0 + SALLE.z1) / 2); // joints
    for (var kx = CUIS.x0; kx < CUIS.x1 - 0.01; kx += 0.5) for (var kz = CUIS.z0; kz < CUIS.z1 - 0.01; kz += 0.5)
      boite(S, 0.49, 0.04, 0.49, ((kx * 3 + kz * 7) | 0) % 3 ? '#dcd8d2' : '#d0ccc4', kx + 0.25, -0.02, kz + 0.25);
    boite(S, 80, 0.05, 80, '#1d2a1f', -3, -0.12, 0); // le jardin, dans la nuit
    var sols = S.maille(); sols.receiveShadow = true; G.add(sols);
    // un tapis gris sous la table basse du salon
    var tapis = bm(3.2, 0.015, 2.4, '#8d8a86', 5.6, 0.008, 0.6); tapis.receiveShadow = true; G.add(tapis);

    // ---------- Murs (chacun s'efface quand la caméra passe derrière) ----------
    var murs = [];
    function mur(construire, test, couleur) {
      var F = new AV.Fusion(); construire(F, couleur || '#f1ede6');
      var m = F.maille(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 }));
      m.castShadow = false; m.receiveShadow = true; G.add(m); murs.push({ m: m, test: test, o: 1 });
      return m;
    }
    function murX(F, c, x, z0, z1, y0, y1) { boite(F, EP, (y1 || HM) - (y0 || 0), z1 - z0, c, x, ((y1 || HM) + (y0 || 0)) / 2, (z0 + z1) / 2); }
    function murZ(F, c, z, x0, x1, y0, y1) { boite(F, x1 - x0, (y1 || HM) - (y0 || 0), EP, c, (x0 + x1) / 2, ((y1 || HM) + (y0 || 0)) / 2, z); }
    // nord : la baie de la salle à manger (stores à lamelles verticales), la fenêtre de la cuisine (store vénitien)
    var BAIE = { x0: -6.4, x1: 0.6 }, FENC = { x0: -13.4, x1: -11.6, y0: 1.05, y1: 2.35 };
    mur(function (F, c) {
      var z = SALLE.z0 - EP / 2;
      murZ(F, c, z, CUIS.x0 - EP, FENC.x0); murZ(F, c, z, FENC.x1, BAIE.x0); murZ(F, c, z, BAIE.x1, SALLE.x1 + EP);
      murZ(F, c, z, FENC.x0, FENC.x1, 0, FENC.y0); murZ(F, c, z, FENC.x0, FENC.x1, FENC.y1, HM); murZ(F, c, z, BAIE.x0, BAIE.x1, 2.55, HM);
      // lamelles verticales blanches (un peu ondulées) devant la baie
      for (var lx = BAIE.x0 + 0.05; lx < BAIE.x1; lx += 0.12) boite(F, 0.1, 2.45, 0.015, (Math.round(lx * 8) % 2) ? '#f6f4ef' : '#ebe7df', lx, 1.29, SALLE.z0 + 0.16, 0.5);
      boite(F, BAIE.x1 - BAIE.x0 + 0.2, 0.06, 0.12, '#d8d4cc', (BAIE.x0 + BAIE.x1) / 2, 2.53, SALLE.z0 + 0.14);
      // store vénitien gris foncé de la cuisine
      for (var ly = FENC.y0 + 0.05; ly < FENC.y1; ly += 0.07) boite(F, FENC.x1 - FENC.x0 + 0.1, 0.012, 0.05, '#5a5650', (FENC.x0 + FENC.x1) / 2, ly, SALLE.z0 + 0.06, 0, 0.6);
      // le cadre noir « THE… » (photo) et le grand miroir noir à côté de l'armoire
      boite(F, 0.7, 0.95, 0.04, '#1d1c22', 2.3, 1.75, SALLE.z0 + 0.03);
    }, function (cam) { return cam.z < SALLE.z0 + 0.1; });
    var cadre = toile(function (x, w, h) {
      x.fillStyle = '#1d1c22'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8d0c0'; x.font = '900 46px Nunito, sans-serif'; x.textAlign = 'center';
      ['ENJOY', 'THE', 'LITTLE', 'THINGS'].forEach(function (t, i) { x.fillText(t, w / 2, 70 + i * 62); });
    }, 0.6, 0.85, 256, 362);
    cadre.position.set(2.3, 1.75, SALLE.z0 + 0.06); G.add(cadre); murs[murs.length - 1].lies = [cadre];
    // sud : l'entrée (rideau brun), le mur de briques derrière la cage, la baie vitrée de la cuisine
    var RIDEAU = { x0: 2.6, x1: 4.0 }, BAIEC = { x0: -13.2, x1: -10.8 };
    mur(function (F, c) {
      var z = SALLE.z1 + EP / 2;
      murZ(F, c, z, CUIS.x0 - EP, BAIEC.x0); murZ(F, c, z, BAIEC.x1, RIDEAU.x0); murZ(F, c, z, RIDEAU.x1, SALLE.x1 + EP);
      murZ(F, c, z, BAIEC.x0, BAIEC.x1, 2.3, HM); murZ(F, c, z, RIDEAU.x0, RIDEAU.x1, 2.4, HM);
      // briques
      for (var by = 0.1; by < HM; by += 0.16) for (var bx = -0.4; bx < 2.3; bx += 0.42) boite(F, 0.38, 0.13, 0.04, ((bx * 5 + by * 9) | 0) % 3 ? '#7a4a3a' : '#8c5848', bx + ((by * 6 | 0) % 2) * 0.2, by, SALLE.z1 - 0.03);
      // rideau brun (plis) et cadre de la baie vitrée
      for (var rx = RIDEAU.x0; rx < RIDEAU.x1; rx += 0.14) boite(F, 0.13, 2.35, 0.06, (Math.round(rx * 7) % 2) ? '#6b5843' : '#5e4c39', rx + 0.07, 1.2, SALLE.z1 - 0.05, 0, 0, 0);
      [BAIEC.x0, (BAIEC.x0 + BAIEC.x1) / 2, BAIEC.x1].forEach(function (x) { boite(F, 0.07, 2.3, EP + 0.05, '#2a2a30', x, 1.15, z); });
      boite(F, BAIEC.x1 - BAIEC.x0, 0.07, EP + 0.05, '#2a2a30', (BAIEC.x0 + BAIEC.x1) / 2, 2.27, z);
    }, function (cam) { return cam.z > SALLE.z1 - 0.1; });
    // est : la télé, le panneau à tasseaux, l'escalier au fond
    mur(function (F, c) { murX(F, c, SALLE.x1 + EP / 2, SALLE.z0 - EP, SALLE.z1 + EP); }, function (cam) { return cam.x > SALLE.x1 - 0.1; });
    // ouest : le mur du fond de la cuisine
    mur(function (F, c) { murX(F, c, CUIS.x0 - EP / 2, CUIS.z0 - EP, CUIS.z1 + EP); }, function (cam) { return cam.x < CUIS.x0 + 0.1; });
    // la verrière noire entre la cuisine et la salle à manger (allège pleine + carreaux vitrés)
    mur(function (F, c) {
      var x = CUIS.x1;
      murX(F, '#26262c', x, SALLE.z0, VERR.z0, 0, 1.0); murX(F, '#26262c', x, VERR.z1, SALLE.z1, 0, 1.0);
      murX(F, c, x, SALLE.z0, SALLE.z1, 2.6, HM);
      [[SALLE.z0, VERR.z0], [VERR.z1, SALLE.z1]].forEach(function (s) {
        for (var mz = s[0]; mz <= s[1] + 0.01; mz += (s[1] - s[0]) / Math.max(1, Math.round((s[1] - s[0]) / 0.9))) boite(F, 0.07, 1.6, 0.06, '#1d1c22', x, 1.8, mz);
        boite(F, 0.07, 0.06, s[1] - s[0], '#1d1c22', x, 1.0, (s[0] + s[1]) / 2); boite(F, 0.07, 0.06, s[1] - s[0], '#1d1c22', x, 1.8, (s[0] + s[1]) / 2);
      });
      [VERR.z0, VERR.z1].forEach(function (z) { boite(F, 0.1, 2.6, 0.1, '#1d1c22', x, 1.3, z); });
      boite(F, 0.1, 0.08, VERR.z1 - VERR.z0, '#1d1c22', x, 2.6, (VERR.z0 + VERR.z1) / 2);
    }, function (cam, j) { return (cam.x < CUIS.x1) !== (j.x < CUIS.x1); });
    var vitresV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.6, SALLE.z1 - SALLE.z0), new THREE.MeshLambertMaterial({ color: '#c9dbe6', transparent: true, opacity: 0.16, depthWrite: false }));
    vitresV.position.set(CUIS.x1, 1.8, 0); G.add(vitresV);
    colRect(col, CUIS.x1, (SALLE.z0 + VERR.z0) / 2, 0.1, (VERR.z0 - SALLE.z0) / 2);
    colRect(col, CUIS.x1, (VERR.z1 + SALLE.z1) / 2, 0.1, (SALLE.z1 - VERR.z1) / 2);
    // vitres de nuit (baie de la salle, fenêtre et baie de la cuisine) : bleu nuit avec quelques reflets
    [[(BAIE.x0 + BAIE.x1) / 2, 1.27, SALLE.z0 - 0.02, BAIE.x1 - BAIE.x0, 2.55], [(FENC.x0 + FENC.x1) / 2, (FENC.y0 + FENC.y1) / 2, SALLE.z0 - 0.02, FENC.x1 - FENC.x0, FENC.y1 - FENC.y0],
     [(BAIEC.x0 + BAIEC.x1) / 2, 1.15, SALLE.z1 + 0.02, BAIEC.x1 - BAIEC.x0, 2.3]].forEach(function (v) {
      var n = new THREE.Mesh(new THREE.PlaneGeometry(v[3], v[4]), new THREE.MeshBasicMaterial({ color: '#0e1630', side: THREE.DoubleSide })); n.position.set(v[0], v[1], v[2]); G.add(n);
    });

    // ---------- Salle à manger : longue table en bois massif, chaises noires en métal, couverts de fête ----------
    var M = new AV.Fusion(), T = TABLE, tx0 = T.x - T.l / 2, tx1 = T.x + T.l / 2, tz0 = T.z - T.p / 2, tz1 = T.z + T.p / 2;
    boite(M, T.l, 0.08, T.p, '#c9a77c', T.x, T.h - 0.04, T.z);
    [[tx0 + 0.12, tz0 + 0.12], [tx1 - 0.12, tz0 + 0.12], [tx0 + 0.12, tz1 - 0.12], [tx1 - 0.12, tz1 - 0.12]].forEach(function (p) { boite(M, 0.14, T.h - 0.08, 0.14, '#bf9c70', p[0], (T.h - 0.08) / 2, p[1]); });
    boite(M, T.l - 0.3, 0.1, 0.06, '#b8946a', T.x, T.h - 0.13, tz0 + 0.1); boite(M, T.l - 0.3, 0.1, 0.06, '#b8946a', T.x, T.h - 0.13, tz1 - 0.1);
    boite(M, T.l * 0.85, 0.005, 0.45, '#f7f5f0', T.x, T.h + 0.003, T.z); // chemin de table blanc
    var SIEGES = [];
    [-1.5, 0, 1.5].forEach(function (dx) { SIEGES.push({ x: T.x + dx, z: tz0 - 0.38, a: 0 }); SIEGES.push({ x: T.x + dx, z: tz1 + 0.38, a: Math.PI }); });
    SIEGES.push({ x: tx0 - 0.4, z: T.z, a: Math.PI / 2 }); SIEGES.push({ x: tx1 + 0.4, z: T.z, a: -Math.PI / 2 });
    SIEGES.forEach(function (s) {
      var c = Math.cos(s.a), sn = Math.sin(s.a); // l'assise regarde vers la table (direction (sin a, cos a))
      boite(M, 0.42, 0.04, 0.42, '#25252b', s.x, 0.46, s.z, s.a);
      [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(function (q) { boite(M, 0.03, 0.46, 0.03, '#25252b', s.x + q[0] * c + q[1] * sn, 0.23, s.z - q[0] * sn + q[1] * c, s.a); });
      boite(M, 0.4, 0.42, 0.03, '#25252b', s.x - sn * 0.2, 0.7, s.z - c * 0.2, s.a);
      // set de table vert, assiette, verre
      boite(M, 0.4, 0.004, 0.3, '#3f6b4c', T.x + (s.x - T.x) * 0.72, T.h + 0.004, T.z + (s.z - T.z) * (Math.abs(s.z - T.z) > 0.3 ? 0.62 : 1), s.a);
      cyl(M, 0.12, 0.11, 0.015, '#f4f1ec', T.x + (s.x - T.x) * 0.72, T.h + 0.012, T.z + (s.z - T.z) * (Math.abs(s.z - T.z) > 0.3 ? 0.62 : 1), 14);
    });
    // bouteilles, jus d'orange, essuie-tout, coupelles
    [[-4.4, '#2f4a2a', 0.32], [-2.0, '#3d1a26', 0.32], [-5.0, '#e6a23a', 0.26], [-1.3, '#f2f2ee', 0.3]].forEach(function (b) { cyl(M, 0.045, 0.05, b[2], b[1], b[0], T.h + b[2] / 2, T.z + 0.12, 8); cyl(M, 0.015, 0.02, 0.1, b[1], b[0], T.h + b[2] + 0.05, T.z + 0.12, 6); });
    cyl(M, 0.06, 0.06, 0.24, '#ffffff', -3.9, T.h + 0.12, T.z - 0.05, 10);
    [[-2.6, '#d8464a'], [-3.7, '#7a8a4a'], [-2.3, '#e8c27a']].forEach(function (c) { cyl(M, 0.07, 0.05, 0.05, '#f4f1ec', c[0], T.h + 0.025, T.z + 0.18, 10); cyl(M, 0.055, 0.055, 0.02, c[1], c[0], T.h + 0.05, T.z + 0.18, 10); });
    colRect(col, T.x, T.z, T.l / 2 + 0.05, T.p / 2 + 0.05);
    // verres à pied (transparents)
    var VG = new AV.Fusion();
    SIEGES.forEach(function (s) { var gx = T.x + (s.x - T.x) * 0.72 + Math.cos(s.a) * 0.16, gz = T.z + (s.z - T.z) * (Math.abs(s.z - T.z) > 0.3 ? 0.55 : 0.85) - Math.sin(s.a) * 0.16; cyl(VG, 0.035, 0.025, 0.09, '#e8f2f6', gx, T.h + 0.14, gz, 8); cyl(VG, 0.005, 0.005, 0.08, '#e8f2f6', gx, T.h + 0.05, gz, 4); cyl(VG, 0.03, 0.03, 0.005, '#e8f2f6', gx, T.h + 0.005, gz, 8); });
    G.add(VG.maille(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false })));

    // ---------- Le gâteau au chocolat et ses 20 bougies (devant la place de la reine du jour) ----------
    var GAT = { x: T.x, z: T.z - 0.12, y: T.h };
    cyl(M, 0.24, 0.24, 0.015, '#f4f1ec', GAT.x, GAT.y + 0.008, GAT.z, 18);
    cyl(M, 0.19, 0.19, 0.14, '#4a2a1a', GAT.x, GAT.y + 0.085, GAT.z, 18);
    cyl(M, 0.195, 0.195, 0.02, '#6b3a22', GAT.x, GAT.y + 0.16, GAT.z, 18);
    var flammes = [], FL = new THREE.MeshBasicMaterial({ color: '#ffd36a' });
    for (var ib = 0; ib < 20; ib++) {
      var ab = ib / 20 * Math.PI * 2 + (ib % 2) * 0.1, rb = ib < 13 ? 0.15 : 0.08, bxp = GAT.x + Math.cos(ab * (ib < 13 ? 1 : 1.6)) * rb, bzp = GAT.z + Math.sin(ab * (ib < 13 ? 1 : 1.6)) * rb;
      cyl(M, 0.008, 0.008, 0.09, ['#ff8fa3', '#7fb2ff', '#ffd166', '#a0e0a0', '#ffffff'][ib % 5], bxp, GAT.y + 0.215, bzp, 5);
      var f = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), FL); f.scale.set(1, 1.9, 1); f.position.set(bxp, GAT.y + 0.282, bzp); G.add(f); flammes.push(f);
    }
    var lBougies = new THREE.PointLight('#ffb35a', 0.55, 4.5, 2); lBougies.position.set(GAT.x, GAT.y + 0.6, GAT.z); G.add(lBougies);

    // ---------- Suspensions : deux grands dômes gris clair, un dôme noir ; lampe trépied ; armoire ; plantes ; sapin ----------
    var lampes = [];
    [[T.x - 1.4, '#cfc8bd', 0.42], [T.x, '#2a2a30', 0.3], [T.x + 1.4, '#cfc8bd', 0.42]].forEach(function (p, i) {
      cyl(M, 0.006, 0.006, HM - 2.3, '#333', p[0], (HM + 2.3) / 2, T.z + (i === 1 ? -0.2 : 0), 4);
      forme(M, new THREE.SphereGeometry(p[2], 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), p[1], p[0], 2.08, T.z + (i === 1 ? -0.2 : 0), 0, 1, 0.75, 1);
      cyl(M, p[2] * 0.95, p[2] * 0.95, 0.01, '#fff6dd', p[0], 2.08, T.z + (i === 1 ? -0.2 : 0), 18);
      var l = new THREE.PointLight('#ffe0aa', 0.55, 7, 2); l.position.set(p[0], 1.85, T.z + (i === 1 ? -0.2 : 0)); G.add(l); lampes.push({ l: l, i0: 0.55 });
    });
    // lampe trépied (abat-jour noir) près de la baie
    [[0, 0.25], [2.1, 0.25], [4.2, 0.25]].forEach(function (q) { forme(M, new THREE.CylinderGeometry(0.015, 0.015, 1.6, 5), '#6a6a6a', 0.3 + Math.cos(q[0]) * 0.22, 0.78, -5.3 + Math.sin(q[0]) * 0.22, 0, 1, 1, 1, Math.sin(q[0]) * 0.15, -Math.cos(q[0]) * 0.15); });
    cyl(M, 0.24, 0.24, 0.32, '#1d1c22', 0.3, 1.66, -5.3, 14);
    var lTrep = new THREE.PointLight('#ffd9a0', 0.35, 5, 2); lTrep.position.set(0.3, 1.4, -5.1); G.add(lTrep);
    // plante verte en pot blanc (devant la baie) + celle près de la télé
    [[-6.9, -5.3, 1.0], [8.7, -2.9, 0.9], [-1.7, 5.45, 0.7]].forEach(function (p) {
      cyl(M, 0.25, 0.2, 0.45, '#f1ede6', p[0], 0.22, p[1], 10);
      for (var fe = 0; fe < 9; fe++) { var af = fe / 9 * Math.PI * 2; forme(M, new THREE.ConeGeometry(0.12, 0.7 * p[2], 4), fe % 2 ? '#3f7a3f' : '#4d8a4a', p[0] + Math.cos(af) * 0.18, 0.45 + 0.35 * p[2], p[1] + Math.sin(af) * 0.18, af, 1, 1, 0.35, Math.sin(af) * 0.6, -Math.cos(af) * 0.6); }
      col.push({ x: p[0], z: p[1], r: 0.32 });
    });
    // armoire en bois massif (portes à cadre)
    boite(M, 1.3, 2.1, 0.6, '#c9a77c', ARMOIRE.x, 1.05, ARMOIRE.z);
    [-0.32, 0.32].forEach(function (dx) { boite(M, 0.56, 1.7, 0.03, '#bf9c70', ARMOIRE.x + dx, 1.15, ARMOIRE.z - 0.31); boite(M, 0.4, 1.3, 0.02, '#d4b48a', ARMOIRE.x + dx, 1.15, ARMOIRE.z - 0.33); });
    boite(M, 1.36, 0.08, 0.66, '#b8946a', ARMOIRE.x, 2.12, ARMOIRE.z);
    colRect(col, ARMOIRE.x, ARMOIRE.z, 0.68, 0.33);
    // sapin de Noël et ses cadeaux
    for (var ns = 0; ns < 5; ns++) forme(M, new THREE.ConeGeometry(0.75 - ns * 0.13, 0.7, 9), ns % 2 ? '#2f6b3a' : '#3a7a44', SAPIN.x, 0.55 + ns * 0.38, SAPIN.z, ns * 0.5, 1, 1, 1);
    cyl(M, 0.07, 0.08, 0.3, '#6b4a32', SAPIN.x, 0.15, SAPIN.z, 6);
    forme(M, new THREE.OctahedronGeometry(0.1, 0), '#ffd24a', SAPIN.x, 2.42, SAPIN.z, 0, 1, 1, 1);
    [[0.6, 0.3, '#c8343f'], [-0.5, 0.45, '#e9e4dc'], [0.15, 0.7, '#2f6fb3'], [-0.7, -0.2, '#d9b45a']].forEach(function (c) { boite(M, 0.32, 0.26, 0.3, c[2], SAPIN.x + c[0], 0.13, SAPIN.z + c[1], c[0]); boite(M, 0.33, 0.04, 0.06, '#ffd24a', SAPIN.x + c[0], 0.2, SAPIN.z + c[1], c[0]); });
    col.push({ x: SAPIN.x, z: SAPIN.z, r: 0.8 });
    var guir = [], rgS = AV.rng(23);
    for (var gs = 0; gs < 60; gs++) { var ag = gs * 0.9, hg = 0.4 + gs / 60 * 1.9, rg = 0.7 * (1 - hg / 2.5) + 0.06; guir.push(new THREE.Vector3(SAPIN.x + Math.cos(ag) * rg, hg, SAPIN.z + Math.sin(ag) * rg)); }
    var gPts = new THREE.BufferGeometry().setFromPoints(guir);
    var gCols = new Float32Array(guir.length * 3); guir.forEach(function (p, i) { var c = new THREE.Color(['#ffd98a', '#ff8a8a', '#8ad0ff', '#fff0c0'][i % 4]); gCols[i * 3] = c.r; gCols[i * 3 + 1] = c.g; gCols[i * 3 + 2] = c.b; });
    gPts.setAttribute('color', new THREE.BufferAttribute(gCols, 3));
    var lumSapin = new THREE.Points(gPts, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    G.add(lumSapin);

    // ---------- Le salon : canapé d'angle en cuir noir, méridienne, table basse, télé + village de Noël, tasseaux, escalier ----------
    var CU = '#1f1f24', CU2 = '#2a2a30';
    // canapé d'angle : le dossier tourné vers la table, on regarde la télé (vers +x)
    boite(M, 0.95, 0.42, 4.0, CU, 3.5, 0.21, 0.3); boite(M, 0.25, 0.85, 4.0, CU2, 3.1, 0.42, 0.3);           // assise + dossier
    boite(M, 0.9, 0.18, 1.9, CU2, 3.55, 0.5, -0.65); boite(M, 0.9, 0.18, 1.9, CU2, 3.55, 0.5, 1.3);              // coussins
    boite(M, 1.9, 0.42, 0.95, CU, 4.4, 0.21, 2.75); boite(M, 1.9, 0.18, 0.9, CU2, 4.4, 0.5, 2.75);                // retour (méridienne d'angle)
    boite(M, 1.15, 0.62, 0.22, CU2, 3.55, 0.31, -1.8);                                                            // accoudoir
    for (var pc = -1.6; pc < 3.2; pc += 0.6) boite(M, 0.04, 0.06, 0.04, '#b8b8bc', 3.1, 0.03, pc);
    colRect(col, 3.5, 0.3, 0.52, 2.05); colRect(col, 4.4, 2.75, 0.95, 0.5);
    // méridienne près du mur de l'entrée
    boite(M, 2.0, 0.4, 0.85, CU, 6.9, 0.2, 4.6); boite(M, 2.0, 0.35, 0.2, CU2, 6.9, 0.55, 4.95); boite(M, 0.2, 0.6, 0.85, CU2, 5.95, 0.42, 4.6);
    colRect(col, 6.9, 4.6, 1.05, 0.45);
    // table basse bois + métal noir, avec la boîte orange et un bol
    boite(M, 1.3, 0.05, 0.75, '#b8946a', 5.6, 0.42, 0.6); [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]].forEach(function (q) { boite(M, 0.04, 0.4, 0.04, '#1d1c22', 5.6 + q[0], 0.2, 0.6 + q[1]); });
    boite(M, 0.2, 0.18, 0.12, '#f08a24', 5.3, 0.54, 0.5); cyl(M, 0.14, 0.09, 0.08, '#f1ede6', 5.85, 0.48, 0.7, 12);
    colRect(col, 5.6, 0.6, 0.68, 0.4);
    // petite console d'appoint au bout du canapé
    boite(M, 0.45, 0.04, 0.45, '#1d1c22', 3.4, 0.62, -2.25); [[-0.2, -0.2], [0.2, 0.2]].forEach(function (q) { boite(M, 0.03, 0.62, 0.03, '#1d1c22', 3.4 + q[0], 0.31, -2.25 + q[1]); });
    // meuble télé bas en bois + village de Noël lumineux
    boite(M, 0.5, 0.5, 2.6, '#c9a77c', TV.x - 0.15, 0.25, TV.z); colRect(col, TV.x - 0.15, TV.z, 0.28, 1.32);
    var village = [];
    for (var vm = 0; vm < 9; vm++) {
      var vz = TV.z - 1.1 + vm * 0.27, vh = 0.12 + (vm % 3) * 0.05;
      boite(M, 0.2, vh, 0.18, ['#f4f1ec', '#e8d8c0', '#d8e4ee'][vm % 3], TV.x - 0.18, 0.5 + vh / 2, vz);
      forme(M, new THREE.ConeGeometry(0.15, 0.1, 4), '#8a3a2a', TV.x - 0.18, 0.5 + vh + 0.05, vz, Math.PI / 4, 1, 1, 1);
      village.push(new THREE.Vector3(TV.x - 0.29, 0.5 + vh * 0.5, vz));
    }
    var vPts = new THREE.Points(new THREE.BufferGeometry().setFromPoints(village), new THREE.PointsMaterial({ color: '#ffd27a', size: 0.12, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    G.add(vPts);
    // la télé (écran à part) et le panneau à tasseaux en bois à côté
    boite(M, 0.06, 0.82, 1.42, '#16181c', TV.x + 0.15, 1.45, TV.z);
    for (var ts = 0; ts < 9; ts++) boite(M, 0.04, HM - 0.2, 0.05, '#b8946a', TV.x + 0.2, (HM - 0.2) / 2, TV.z - 1.25 - ts * 0.09);
    boite(M, 0.02, HM - 0.2, 0.85, '#2a2a2a', TV.x + 0.23, (HM - 0.2) / 2, TV.z - 1.62);
    // l'escalier (au fond à droite) avec sa rampe noire
    for (var es = 0; es < 13; es++) boite(M, 1.1, 0.06 + es * 0.22, 0.3, '#e9e4dc', 8.9, (0.06 + es * 0.22) / 2, -2.9 - es * 0.24);
    for (var er = 0; er < 13; er += 2) boite(M, 0.025, 0.9, 0.025, '#1d1c22', 8.33, 0.45 + er * 0.22 + 0.06, -2.9 - er * 0.24);
    forme(M, new THREE.BoxGeometry(0.04, 0.04, 3.6), '#1d1c22', 8.33, 1.35 + 1.3, -4.35, 0, 1, 1, 1, -0.72);
    colRect(col, 8.9, -4.4, 0.6, 1.6);
    // étagère blanche avec l'insert de cheminée, et les lettres « LIFE IS A BEAUTIFUL RIDE »
    boite(M, 1.6, 1.3, 0.35, '#f4f1ec', 7.2, 0.65, SALLE.z1 - 0.2); boite(M, 0.9, 0.5, 0.05, '#1d1c22', 7.0, 0.55, SALLE.z1 - 0.38);
    var feu = bm(0.8, 0.12, 0.02, '#ff9a3a', 7.0, 0.42, SALLE.z1 - 0.41); feu.material = new THREE.MeshBasicMaterial({ color: '#ff9a3a' }); G.add(feu);
    colRect(col, 7.2, SALLE.z1 - 0.2, 0.82, 0.22);
    var lettres = toile(function (x, w, h) {
      x.clearRect(0, 0, w, h); x.fillStyle = '#1d1c22'; x.textAlign = 'center';
      x.font = '900 60px "Arial Black", Nunito, sans-serif'; x.fillText('LIFE IS A', w / 2, 70);
      x.font = 'italic 900 74px "Brush Script MT", "Segoe Script", cursive'; x.fillText('Beautiful', w / 2, 150);
      x.font = '900 60px "Arial Black", Nunito, sans-serif'; x.fillText('RIDE', w / 2, 225);
    }, 1.1, 0.72, 400, 262, { transparent: true });
    lettres.position.set(7.2, 2.15, SALLE.z1 - 0.04); lettres.rotation.y = Math.PI; G.add(lettres); murs[1].lies = [lettres];
    // grande cage à oiseaux sur pied en bois (devant les briques) et les deux « cousins d'Edith »
    boite(M, 0.7, 1.0, 0.6, '#b8946a', CAGE.x, 0.5, CAGE.z); boite(M, 0.12, 2.6, 0.12, '#b8946a', CAGE.x + 0.4, 1.3, CAGE.z + 0.25);
    boite(M, 0.7, 0.06, 0.06, '#2a2a2a', CAGE.x + 0.1, 2.55, CAGE.z + 0.25);
    cyl(M, 0.32, 0.32, 0.04, '#5a3a24', CAGE.x, 1.4, CAGE.z, 14);
    for (var cb = 0; cb < 18; cb++) { var ac = cb / 18 * Math.PI * 2; cyl(M, 0.006, 0.006, 0.85, '#3a3a3a', CAGE.x + Math.cos(ac) * 0.31, 1.83, CAGE.z + Math.sin(ac) * 0.31, 3); }
    forme(M, new THREE.SphereGeometry(0.31, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), '#3a3a3a', CAGE.x, 2.25, CAGE.z, 0, 1, 0.5, 1);
    boite(M, 0.5, 0.02, 0.02, '#c9a77c', CAGE.x, 1.75, CAGE.z);
    colRect(col, CAGE.x + 0.05, CAGE.z, 0.4, 0.35);
    var oiseaux = [];
    [-0.12, 0.12].forEach(function (dx, i) {
      var o = new THREE.Group(); o.position.set(CAGE.x + dx, 1.77, CAGE.z);
      var cp = AV.maille(new THREE.SphereGeometry(0.05, 8, 6), '#f6f2e6'); cp.scale.set(0.9, 1.3, 0.9); cp.position.y = 0.05; o.add(cp);
      var tt = AV.maille(new THREE.SphereGeometry(0.035, 8, 6), '#fff3b0'); tt.position.set(0, 0.13, 0.01); o.add(tt);
      var jo = AV.maille(new THREE.SphereGeometry(0.012, 6, 4), '#ff8a3a'); jo.position.set(0.03, 0.12, 0.02); o.add(jo); var jo2 = jo.clone(); jo2.position.x = -0.03; o.add(jo2);
      var hp = AV.maille(new THREE.ConeGeometry(0.012, 0.07, 4), '#ffe26a'); hp.position.set(0, 0.18, 0); hp.rotation.x = -0.4; o.add(hp);
      var qu = AV.maille(new THREE.ConeGeometry(0.02, 0.12, 4), '#efe9d8'); qu.position.set(0, -0.03, -0.04); qu.rotation.x = -2.6; o.add(qu);
      o.rotation.y = i ? -0.4 : 0.4; G.add(o); oiseaux.push(o);
    });

    // ---------- La cuisine : meubles gris anthracite, plan bois, colonne four, îlot à évier noir, table haute ----------
    var K = new AV.Fusion(), AN = '#34363b', BO = '#b48e62';
    boite(K, 0.65, 2.5, 1.3, AN, CUIS.x0 + 0.33, 1.25, -5.3);                                 // colonne fours
    boite(K, 0.03, 0.5, 0.6, '#16181c', CUIS.x0 + 0.66, 1.65, -5.3); boite(K, 0.03, 0.4, 0.6, '#16181c', CUIS.x0 + 0.66, 1.1, -5.3);
    boite(K, 5.0, 0.86, 0.62, AN, -12.2, 0.43, CUIS.z0 + 0.31); boite(K, 5.04, 0.05, 0.66, BO, -12.2, 0.885, CUIS.z0 + 0.33); // meubles bas nord
    boite(K, 0.62, 0.86, 4.2, AN, CUIS.x0 + 0.31, 0.43, -1.9); boite(K, 0.66, 0.05, 4.2, BO, CUIS.x0 + 0.33, 0.885, -1.9);     // meubles bas ouest
    for (var tg = -14; tg < -9.8; tg += 0.9) boite(K, 0.5, 0.012, 0.02, '#8a8a8e', tg, 0.62, CUIS.z0 + 0.63);
    boite(K, 0.6, 0.02, 0.5, '#1d1c22', CUIS.x0 + 0.33, 0.92, -1.1);                          // plaque de cuisson
    boite(K, 0.5, 0.5, 0.7, '#c0c4c8', CUIS.x0 + 0.3, 2.0, -1.1); boite(K, 0.25, 0.7, 0.3, '#c0c4c8', CUIS.x0 + 0.15, 2.6, -1.1); // hotte inox
    boite(K, 0.6, 0.9, 0.04, '#c0c4c8', CUIS.x0 + 0.02, 1.4, -1.1);                           // crédence inox
    boite(K, 0.7, 0.6, 0.3, '#9a7a56', -10.6, 1.55, CUIS.z0 + 0.16); boite(K, 0.66, 0.02, 0.28, '#9a7a56', -10.6, 1.55, CUIS.z0 + 0.16); // étagère « Coffee »
    [-10.75, -10.5].forEach(function (x) { cyl(K, 0.04, 0.035, 0.08, '#f4f1ec', x, 1.62, CUIS.z0 + 0.16, 8); });
    cyl(K, 0.12, 0.1, 0.2, '#f4f1ec', -12.9, 1.0, CUIS.z0 + 0.3, 12);                         // robot pâtissier
    // l'îlot : caisson bois, plan bois, évier noir, mitigeur col de cygne noir, tapis de bar vert
    boite(K, ILOT.l, 0.88, ILOT.p, '#a8835a', ILOT.x, 0.44, ILOT.z); boite(K, ILOT.l + 0.12, 0.06, ILOT.p + 0.12, BO, ILOT.x, 0.91, ILOT.z);
    boite(K, 0.62, 0.05, 0.48, '#141416', ILOT.x - 0.05, 0.935, ILOT.z - 0.3);
    cyl(K, 0.02, 0.02, 0.4, '#141416', ILOT.x + 0.35, 1.14, ILOT.z - 0.3, 6); forme(K, new THREE.TorusGeometry(0.16, 0.018, 6, 12, Math.PI), '#141416', ILOT.x + 0.19, 1.34, ILOT.z - 0.3, 0, 1, 1, 1);
    boite(K, 0.3, 0.008, 0.6, '#2f5a3a', ILOT.x + 0.2, 0.945, ILOT.z + 0.75);
    colRect(col, ILOT.x, ILOT.z, ILOT.l / 2 + 0.08, ILOT.p / 2 + 0.08);
    colRect(col, -12.2, CUIS.z0 + 0.33, 2.55, 0.36); colRect(col, CUIS.x0 + 0.33, -2.6, 0.36, 3.4);
    // table haute en bois sur piétement noir + deux bancs ; suspension géométrique cuivrée
    boite(K, 1.9, 0.06, 0.85, '#b8946a', HAUTE.x, 1.02, HAUTE.z);
    [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(function (q) { boite(K, 0.05, 1.0, 0.05, '#1d1c22', HAUTE.x + q[0], 0.5, HAUTE.z + q[1]); });
    [-0.68, 0.68].forEach(function (dz) { boite(K, 1.7, 0.05, 0.32, '#b8946a', HAUTE.x, 0.68, HAUTE.z + dz); [[-0.7], [0.7]].forEach(function (q) { boite(K, 0.04, 0.66, 0.28, '#1d1c22', HAUTE.x + q[0], 0.33, HAUTE.z + dz); }); });
    colRect(col, HAUTE.x, HAUTE.z, 1.0, 0.85);
    var geoL = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.32, 0));
    var lustre = new THREE.LineSegments(geoL, new THREE.LineBasicMaterial({ color: '#c8875a' })); lustre.position.set(HAUTE.x, 2.2, HAUTE.z); lustre.scale.set(1, 0.8, 1); G.add(lustre);
    var amp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff2cc' })); amp.position.copy(lustre.position); G.add(amp);
    cyl(K, 0.005, 0.005, HM - 2.45, '#333', HAUTE.x, (HM + 2.45) / 2, HAUTE.z, 4);
    var lCuis = new THREE.PointLight('#ffe2b0', 0.6, 8, 2); lCuis.position.set(HAUTE.x, 2.0, HAUTE.z); G.add(lCuis);
    // poubelle inox
    cyl(K, 0.17, 0.16, 0.6, '#b8bcc0', -9.6, 0.3, -5.5, 12); col.push({ x: -9.6, z: -5.5, r: 0.2 });
    var cuisine = K.maille(); cuisine.castShadow = true; cuisine.receiveShadow = true; G.add(cuisine);
    var meubles = M.maille(); meubles.castShadow = true; meubles.receiveShadow = true; G.add(meubles);

    // ---------- L'écran de la télé (une émission de variétés) ----------
    var ecran = toile(function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3a0a2a'); gr.addColorStop(0.5, '#c8343f'); gr.addColorStop(1, '#1a0a3a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 12; i++) { x.strokeStyle = 'rgba(255,220,180,' + (0.2 + (i % 3) * 0.1) + ')'; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, h * 0.2); x.lineTo(i / 11 * w, h); x.stroke(); }
      x.fillStyle = '#f4e9d8'; x.beginPath(); x.arc(w / 2, h * 0.42, h * 0.11, 0, 7); x.fill(); x.fillStyle = '#1d1c22'; x.fillRect(w / 2 - h * 0.12, h * 0.53, h * 0.24, h * 0.4);
    }, 1.32, 0.74, 512, 287);
    ecran.position.set(TV.x + 0.11, 1.45, TV.z); ecran.rotation.y = -Math.PI / 2; G.add(ecran);
    var lTV = new THREE.PointLight('#c87aff', 0.35, 5, 2); lTV.position.set(TV.x - 0.8, 1.4, TV.z); G.add(lTV);

    // ---------- Décor de fête : guirlande de fanions, ballons dorés « 2 » « 0 » ----------
    var fan = new AV.Fusion();
    for (var fx = BAIE.x0 + 0.2; fx < BAIE.x1 - 0.1; fx += 0.32) {
      var fy = 2.35 - Math.sin((fx - BAIE.x0) / (BAIE.x1 - BAIE.x0) * Math.PI) * 0.35;
      forme(fan, new THREE.ConeGeometry(0.11, 0.24, 3), ['#ffd24a', '#ff8fa3', '#7fb2ff', '#a0e0a0', '#ffffff'][Math.round(fx * 3 + 30) % 5], fx, fy, SALLE.z0 + 0.35, 0, 1, 1, 0.15, Math.PI);
    }
    G.add(fan.maille());
    var ballons = [];
    [['2', -0.8], ['0', -0.15]].forEach(function (b, i) {
      var s = AV.texteSprite(b[0], { largeur: 1.5, echelle: 0.95, couleur: '#e6b84e', contour: '#a8822e' }); s.position.set(b[1], 2.3, -5.4); G.add(s);
      var fil = bm(0.005, 1.1, 0.005, '#e6e6e6', b[1], 1.45, -5.4); G.add(fil); ballons.push({ s: s, y: 2.3, p: i * 1.7 });
    });
    ['🎈', '🎈', '🎈'].forEach(function (e, i) { var s = AV.texteSprite(e, { largeur: 0.9 }); s.position.set(-6.5 + i * 0.4, 2.4 + (i % 2) * 0.2, -5.2); G.add(s); ballons.push({ s: s, y: s.position.y, p: i }); });

    // ---------- Petit robot aspirateur qui fait sa ronde dans le salon ----------
    var robot = new THREE.Group(); robot.add(AV.maille(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), '#f4f1ec')); var rl = bm(0.06, 0.02, 0.06, '#3a9aff', 0, 0.05, 0.08); robot.add(rl);
    G.add(robot);

    // ---------- La famille ----------
    var PLACES = {
      'gateau': { x: SIEGES[2].x, z: SIEGES[2].z, a: SIEGES[2].a, pose: 'assis' }, 'table-nord-ouest': { x: SIEGES[0].x, z: SIEGES[0].z, a: 0, pose: 'assis' },
      'table-nord-est': { x: SIEGES[4].x, z: SIEGES[4].z, a: 0, pose: 'assis' }, 'table-sud-ouest': { x: SIEGES[1].x, z: SIEGES[1].z, a: Math.PI, pose: 'assis' },
      'table-sud': { x: SIEGES[3].x, z: SIEGES[3].z, a: Math.PI, pose: 'assis' }, 'table-sud-est': { x: SIEGES[5].x, z: SIEGES[5].z, a: Math.PI, pose: 'assis' },
      'table-bout-ouest': { x: SIEGES[6].x, z: SIEGES[6].z, a: Math.PI / 2, pose: 'assis' }, 'table-bout-est': { x: SIEGES[7].x, z: SIEGES[7].z, a: -Math.PI / 2, pose: 'assis' },
      'canape-1': { x: 3.62, z: -1.1, a: Math.PI / 2, pose: 'canape' }, 'canape-2': { x: 3.62, z: 0.3, a: Math.PI / 2, pose: 'canape' }, 'canape-3': { x: 3.62, z: 1.6, a: Math.PI / 2, pose: 'canape' },
      'meridienne': { x: 6.8, z: 4.45, a: Math.PI, pose: 'canape' },
      'debout-table': { x: -5.75, z: -1.3, a: 2.3, pose: 'debout' }, 'cuisine-ilot': { x: -11.0, z: -1.9, a: -Math.PI / 2, pose: 'debout' },
      'cuisine-haute': { x: -12.6, z: 3.8, a: Math.PI, pose: 'haut' }, 'cuisine': { x: -13.9, z: 1.2, a: Math.PI / 2, pose: 'debout' },
      'tele': { x: 7.4, z: 1.9, a: 1.9, pose: 'debout' }, 'cage': { x: 1.0, z: 4.25, a: 0, pose: 'debout' }, 'sapin': { x: -5.7, z: 3.55, a: 0, pose: 'debout' },
      'escalier': { x: 7.5, z: -2.5, a: -2.2, pose: 'debout' }, 'armoire': { x: -8.0, z: 4.3, a: 0.4, pose: 'debout' }
    };
    var HSIEGE = { assis: 0.48, canape: 0.5, haut: 0.7 };
    var FAM = (cfg.famille || []).filter(function (f) { return f && f.nom; });
    var gens = [], libres = Object.keys(PLACES).filter(function (k) { return k.indexOf('table') < 0 && k !== 'gateau'; });
    FAM.forEach(function (f, i) {
      var pl = PLACES[f.place] || PLACES[libres[i % libres.length]];
      var mm = membre(f);
      var p = { f: f, nom: f.nom, m: mm, x: pl.x, z: pl.z, a: pl.a, pose: pl.pose, trouve: false, essais: 0, faux: [], parle: 0, ph: rng() * 6, label: null, objetH: 0 };
      G.add(mm.groupe); gens.push(p);
      if (pl.pose === 'debout') col.push({ x: pl.x, z: pl.z, r: 0.34 }); else col.push({ x: pl.x, z: pl.z, r: 0.3 });
      etiquette(p);
    });
    function etiquette(p) {
      if (p.label) { p.m.groupe.remove(p.label); AV.detruire(p.label); }
      p.label = p.trouve ? AV.texteSprite(p.nom, { fond: 'rgba(27,35,64,.88)', largeur: 1.05, echelle: 0.5, couleur: '#ffe08a' }) : AV.texteSprite('❓', { largeur: 0.6 });
      p.label.position.y = p.trouve ? 2.42 : 2.38; p.m.groupe.add(p.label);
    }
    function poser(p) {
      var g = p.m.groupe, s = p.m.echelle;
      g.position.set(p.x, p.pose === 'debout' ? 0 : HSIEGE[p.pose] - 0.8 * s, p.z); g.rotation.y = p.a;
      p.m.jambes.forEach(function (j, i) { j.rotation.set(p.pose === 'debout' ? 0 : -1.5, 0, (i ? -1 : 1) * (p.pose === 'debout' ? 0 : 0.06)); });
      p.m.corps.rotation.x = p.pose === 'canape' ? -0.12 : p.f.age === 'senior' && p.pose === 'debout' ? 0.08 : 0;
    }
    gens.forEach(poser);
    var nTotal = gens.length, nTrouves = 0;

    // ---------- Axel : il suit Océane, et donne des coups de pouce ----------
    var lui = membre({ qui: 'axel', genre: 'm', haut: '#2f4a6b', bas: '#2b2d33', chaussures: '#e9e4dc' }); lui.groupe.scale.setScalar(1.04); G.add(lui.groupe);
    var lP = new THREE.Vector3(mo.depart.x + 1.3, 0, mo.depart.z + 0.6), lAng = Math.PI, lPhase = 0, luiFixe = null, luiParle = 0;
    function pousser(px, pz, r) { // sort Axel des obstacles (cercles et rectangles)
      col.forEach(function (c) {
        if (c.rect) {
          var dx = px.x - c.x, dz = px.z - c.z, ox = c.hx + r - Math.abs(dx), oz = c.hz + r - Math.abs(dz);
          if (ox > 0 && oz > 0) { if (ox < oz) px.x += (dx < 0 ? -ox : ox); else px.z += (dz < 0 ? -oz : oz); }
        } else {
          var qx = px.x - c.x, qz = px.z - c.z, q = Math.sqrt(qx * qx + qz * qz), mn = c.r + r;
          if (q < mn && q > 1e-4) { px.x = c.x + qx / q * mn; px.z = c.z + qz / q * mn; }
        }
      });
    }
    function majLui(dt, t, jp) {
      var v = 0, g = lui.groupe;
      if (!luiFixe) {
        var dx = jp.x - lP.x, dz = jp.z - lP.z, d = Math.sqrt(dx * dx + dz * dz);
        var vmax = d > 2.4 ? Math.min(6, (d - 1.8) * 2.4) : 0;
        if (d > 9) { lP.x = jp.x - dx / d * 2; lP.z = jp.z - dz / d * 2; } // resté coincé derrière un meuble : il nous rejoint
        else if (vmax > 0) {
          var ax = lP.x, az = lP.z; v = vmax;
          lP.x += dx / d * v * dt; lP.z += dz / d * v * dt;
          pousser(lP, lP.x, 0.35);
          if (!autorise(lP.x, lP.z)) { lP.x = ax; lP.z = az; }
          lAng = AV.angleLerp(lAng, Math.atan2(dx, dz), Math.min(1, dt * 8));
        } else lAng = AV.angleLerp(lAng, Math.atan2(dx, dz), Math.min(1, dt * 3));
      } else { lP.x = luiFixe.x; lP.z = luiFixe.z; lAng = AV.angleLerp(lAng, luiFixe.a, Math.min(1, dt * 4)); }
      lPhase += dt * (4 + v * 1.6); var s = Math.sin(lPhase), k = Math.min(1, v / 4);
      g.position.set(lP.x, Math.abs(Math.cos(lPhase)) * 0.05 * k, lP.z); g.rotation.y = lAng;
      lui.jambes[0].rotation.x = s * 0.8 * k; lui.jambes[1].rotation.x = -s * 0.8 * k;
      if (phase === 'chant') { lui.bras[0].rotation.set(-1.1 + Math.abs(Math.sin(t * 7)) * 0.3, 0, -0.5); lui.bras[1].rotation.set(-1.1 + Math.abs(Math.sin(t * 7)) * 0.3, 0, 0.5); }
      else { lui.bras[0].rotation.set(-s * 0.7 * k, 0, -0.08); lui.bras[1].rotation.set(luiParle > 0 ? -0.9 + Math.sin(t * 6) * 0.3 : s * 0.7 * k, 0, 0.08); }
      lui.tete.rotation.x = luiParle > 0 ? Math.sin(t * 9) * 0.05 : 0;
    }

    // ---------- Dialogues ----------
    var api = null, phase = 'jeu', parole = null, enChoix = null, coeurs = [], notes = [], tFin = 0, fini = false;
    function dire(t, d) { parole = { texte: t, t: d || 4 }; }
    function quiParle(p) { return p.trouve ? p.nom : '❓'; }
    function pDit(p, t, d) { dire('<b>' + quiParle(p) + ' :</b> ' + t, d || 4.6); p.parle = d || 4.6; }
    function luiDit(t, d) { dire('<b>' + nomLui + ' :</b> ' + t, d || 4.2); luiParle = d || 4.2; }
    function sousTitre() {
      if (!api) return;
      var s = phase === 'jeu' ? '👥 ' + nTrouves + ' / ' + nTotal + ' prénoms trouvés' : phase === 'table' ? '🎂 Tout le monde à table !' : phase === 'chant' ? '🎶 Joyeux anniversaire…' : '🎉 Joyeux anniversaire ' + fete + ' !';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }
    function coeur(x, y, z, e) {
      var s = AV.texteSprite(e || auHasard(['❤️', '💕', '🎉', '✨']), { largeur: 0.5 });
      s.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5); G.add(s); coeurs.push({ s: s, t: 0 });
    }

    // ---------- Le choix du prénom (panneau HTML) ----------
    var ui = document.createElement('div');
    ui.style.cssText = 'position:fixed;z-index:40;left:50%;top:calc(max(14px, env(safe-area-inset-top)) + 64px);transform:translateX(-50%);display:none;max-width:min(94vw,660px);' +
      'background:rgba(27,35,64,.9);color:#fff;border-radius:20px;padding:12px 14px 10px;font-family:Nunito,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)';
    document.body.appendChild(ui);
    function fermerChoix() { ui.style.display = 'none'; enChoix = null; }
    function nomsPossibles(p) {
      var restants = gens.filter(function (q) { return !q.trouve; }).map(function (q) { return q.nom; });
      if (p.essais >= 2) { // aide : plus que 3 choix (la bonne réponse + 2 autres jamais tentées)
        var autres = restants.filter(function (n) { return n !== p.nom && p.faux.indexOf(n) < 0; });
        var r2 = AV.rng(p.nom.length * 31 + p.essais);
        autres.sort(function () { return r2() - 0.5; });
        restants = [p.nom].concat(autres.slice(0, 2));
        restants.sort();
      }
      return restants;
    }
    function ouvrirChoix(p) {
      enChoix = p;
      var noms = nomsPossibles(p);
      ui.innerHTML = '';
      var t = document.createElement('div'); t.style.cssText = 'font-weight:900;font-size:17px;margin-bottom:8px';
      t.textContent = (p.f.genre === 'm' ? 'Comment s\'appelle-t-il ?' : 'Comment s\'appelle-t-elle ?') + (p.essais >= 2 ? ' (plus que 3 choix 😉)' : ''); ui.appendChild(t);
      var b = document.createElement('div'); b.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center'; ui.appendChild(b);
      noms.forEach(function (n, i) {
        var bt = document.createElement('button'), faux = p.faux.indexOf(n) >= 0;
        bt.textContent = (i < 9 ? (i + 1) + ' · ' : '') + n; bt.disabled = faux;
        bt.style.cssText = 'border:0;border-radius:999px;padding:9px 15px;font:800 16px Nunito,sans-serif;cursor:pointer;touch-action:manipulation;' +
          (faux ? 'background:#545a70;color:#b9bccb;text-decoration:line-through;cursor:default' : 'background:#ffd24a;color:#2b2340');
        bt.addEventListener('click', function (e) { e.stopPropagation(); this.blur(); if (!faux) choisir(p, n); });
        b.appendChild(bt);
      });
      var x = document.createElement('button'); x.textContent = 'Plus tard';
      x.style.cssText = 'margin-top:8px;border:0;background:none;color:#c9cde0;font:700 14px Nunito,sans-serif;cursor:pointer;text-decoration:underline';
      x.addEventListener('click', function (e) { e.stopPropagation(); fermerChoix(); }); ui.appendChild(x);
      ui.style.display = 'block';
    }
    function clavier(e) {
      if (!enChoix) return;
      var k = parseInt(e.key, 10); if (!(k >= 1 && k <= 9)) return;
      var noms = nomsPossibles(enChoix), n = noms[k - 1];
      if (n && enChoix.faux.indexOf(n) < 0) { e.preventDefault(); choisir(enChoix, n); }
    }
    window.addEventListener('keydown', clavier);
    function choisir(p, n) {
      if (p.trouve) return;
      if (n === p.nom) {
        p.trouve = true; nTrouves++; fermerChoix(); etiquette(p);
        AV.audio.bravo ? AV.audio.bravo() : AV.audio.ping(1); AV.confettis(45);
        var gp = p.m.groupe.position; for (var i = 0; i < 5; i++) coeur(gp.x, 2.2, gp.z);
        pDit(p, p.f.bravo || 'Bravo ! 😄', 4.2);
        sousTitre();
        if (nTrouves >= nTotal) setTimeout(versLaTable, 4200);
      } else {
        p.essais++; p.faux.push(n); AV.audio.erreur();
        pDit(p, 'Non, moi ce n\'est pas ' + n + ' 😄 ' + (p.f.indices && p.f.indices[1] ? p.f.indices[1] : ''), 6);
        ouvrirChoix(p);
      }
    }
    function parlerA(p) {
      if (phase !== 'jeu') return;
      if (p.trouve) { pDit(p, auHasard(p.f.bavard || ['Ça fait plaisir de te voir ! 😊', 'Tu as goûté le gâteau ? Enfin… bientôt 🎂', 'Profite bien de la soirée ! 🥂']), 3.6); return; }
      var ind = p.f.indices || ['…'];
      pDit(p, ind[Math.min(p.essais > 0 ? 1 : 0, ind.length - 1)], 7);
      ouvrirChoix(p);
    }
    var nPouce = 0;
    function coupDePouce() {
      var restent = gens.filter(function (q) { return !q.trouve; });
      if (!restent.length) { luiDit('Tu les connais tous maintenant… ils t\'adorent déjà ❤', 3.6); return; }
      var p = restent[nPouce++ % restent.length];
      luiDit('Psst… ' + (p.f.axel || 'regarde bien qui il reste 😉'), 5.5);
    }
    function versLaTable() {
      if (phase !== 'jeu') return;
      phase = 'table'; sousTitre(); fermerChoix();
      var hote = gens.filter(function (q) { return q.f.hote; })[0] || gens[0];
      if (hote) pDit(hote, 'Tout le monde à table ! On éteint les lumières… 🎂🕯️', 3.4);
      var fd = document.getElementById('fondu');
      setTimeout(function () {
        if (fd) fd.classList.add('noir');
        setTimeout(function () {
          if (phase !== 'table') return;
          // ceux qui étaient debout ou au salon viennent autour de la table
          var AUT = [[-5.95, -3.7], [-0.45, -3.9], [-6.0, -1.6], [-0.35, -1.5], [-4.7, -0.95], [-1.6, -0.9], [-3.9, -4.35], [-2.5, -4.35], [-5.2, -4.4], [-1.2, -4.4], [-6.3, -2.7], [-0.1, -2.7]];
          var ia = 0;
          gens.forEach(function (q) {
            if (q.pose === 'assis' && Math.abs(q.z - TABLE.z) < 1.5 && Math.abs(q.x - TABLE.x) < 3) return;
            var s = AUT[ia++ % AUT.length]; q.x = s[0]; q.z = s[1]; q.pose = 'debout'; q.a = Math.atan2(GAT.x - q.x, GAT.z - q.z); poser(q);
          });
          gens.forEach(function (q) { if (q.label) q.label.visible = false; }); // on ne cache pas la reine du jour
          ballons.forEach(function (b) { b.s.position.z = -5.75; });
          luiFixe = { x: GAT.x + 0.75, z: tz1 + 0.95, a: Math.PI };
          if (AV.jeu) { AV.jeu.placer(GAT.x - 0.35, tz1 + 1.05, Math.PI); AV.jeu.camera(0, 0.68, 4.3); }
          if (api) api.eclairage(0.3);
          lampes.forEach(function (o) { o.l.intensity = o.i0 * 0.12; }); lTrep.intensity = 0.05; lCuis.intensity = 0.12; lTV.intensity = 0.15;
          lBougies.intensity = 1.6; lBougies.distance = 7;
          AV.audio.sourdine(true);
          if (fd) fd.classList.remove('noir');
          mo.interactifs = [itChant]; itChant.x = GAT.x - 0.35; itChant.z = tz1 + 1.05;
          dire('🕯️ Les bougies brillent dans le noir… tout le monde attend 😊', 3.5);
        }, 650);
      }, 2600);
    }
    var itChant = { x: 1e6, z: 1e6, rayon: 3.5, texte: '🎶 ✋ Chanter « Joyeux anniversaire » !', fn: function () {
      if (phase !== 'table') return;
      mo.interactifs = []; phase = 'chant'; sousTitre();
      var d = AV.audio.joyeuxAnniversaire() || 11; tFin = 0;
      dire('🎶 Joyeux anniversaire, joyeux anniversaire… joyeux anniversaire ' + fete + ' ! 🎶', d);
      setTimeout(souffler, d * 1000 + 300);
    } };
    function souffler() {
      if (phase !== 'chant') return;
      phase = 'souffle'; sousTitre();
      var reine = gens.filter(function (q) { return q.nom === fete; })[0];
      if (reine) { reine.parle = 1.5; reine.souffle = 1.2; }
      AV.audio.souffleBougies();
      flammes.forEach(function (f, i) { setTimeout(function () { f.visible = false; coeur(f.position.x, f.position.y + 0.1, f.position.z, '💨'); }, 120 + i * 35); });
      setTimeout(function () {
        lBougies.intensity = 0; AV.audio.acclamations(); AV.confettis(170);
        dire('🎉 Bravo ' + fete + ' ! 20 ans ! 🎉 Tout le monde applaudit…', 4);
        phase = 'bravo'; sousTitre(); tFin = 0;
        AV.audio.sourdine(false);
        setTimeout(function () { if (api && !fini) { fini = true; api.trouver(); } }, 4200);
      }, 900);
    }

    // l'interactif « proche » : suit la personne la plus proche (ou Axel, ou la cage)
    var itProche = { x: 1e6, z: 1e6, rayon: 1.2, texte: '', fn: null };
    mo.interactifs.push(itProche);
    function majProche(jp) {
      if (phase !== 'jeu') { itProche.x = 1e6; return; }
      var best = null, bd = 2.2;
      gens.forEach(function (p) { var dx = p.x - jp.x, dz = p.z - jp.z, d = Math.sqrt(dx * dx + dz * dz); if (d < bd) { bd = d; best = p; } });
      var dL = Math.sqrt((lP.x - jp.x) * (lP.x - jp.x) + (lP.z - jp.z) * (lP.z - jp.z)), dC = Math.sqrt((CAGE.x - jp.x) * (CAGE.x - jp.x) + (CAGE.z - jp.z) * (CAGE.z - jp.z));
      var pre = parole && parole.t > 0 ? parole.texte + '<br>' : '';
      if (best) {
        itProche.texte = pre + (best.trouve ? '💬 ✋ Discuter avec ' + best.nom : '💬 ✋ Parler à ❓ (qui est-ce ?)');
        itProche.fn = function () { parlerA(best); };
      } else if (dC < 1.9) {
        itProche.texte = pre + '🐦 ✋ Dire bonjour aux oiseaux';
        itProche.fn = function () { AV.audio.ping(1.4); setTimeout(function () { AV.audio.ping(1.6); }, 140); sautOiseau = 0.6; luiDit('Ce sont un peu les cousins d\'Edith 🐦😄', 3); };
      } else if (dL < 1.9) {
        itProche.texte = pre + '💡 ✋ Demander un coup de pouce à ' + nomLui;
        itProche.fn = coupDePouce;
      } else { itProche.x = 1e6; return; }
      itProche.x = jp.x; itProche.z = jp.z;
    }
    var sautOiseau = 0;
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (phase === 'jeu') return nTrouves === 0 ? '🎂 Toute la famille est là pour les 20 ans de ' + fete + ' ! Va parler à chacun (✋) et devine son prénom' : null;
      if (phase === 'table') return '🎶 ✋ Lance la chanson !';
      return null;
    };

    // ---------- Chaque image ----------
    var vR = new THREE.Vector3(), angRobot = 0;
    mo.anime(function (dt, t, jp) {
      if (parole) parole.t -= dt; if (luiParle > 0) luiParle -= dt;
      majProche(jp);
      if (enChoix) { var ex = enChoix.x - jp.x, ez = enChoix.z - jp.z; if (ex * ex + ez * ez > 3.4 * 3.4) fermerChoix(); }
      majLui(dt, t, jp);
      gens.forEach(function (p) {
        var m = p.m, assis = p.pose !== 'debout';
        if (p.parle > 0) p.parle -= dt;
        m.corps.position.y = Math.sin(t * 1.6 + p.ph) * 0.008;
        // la tête se tourne vers Océane quand elle approche
        var dx = jp.x - p.x, dz = jp.z - p.z, d = Math.sqrt(dx * dx + dz * dz), cible = 0;
        if (phase === 'chant' || phase === 'souffle' || phase === 'bravo') { cible = 0; }
        else if (d < 5) { cible = Math.atan2(dx, dz) - p.a; cible = Math.atan2(Math.sin(cible), Math.cos(cible)); cible = Math.max(-0.95, Math.min(0.95, cible)); }
        m.tete.rotation.y = AV.lerp(m.tete.rotation.y, cible, Math.min(1, dt * 4));
        m.tete.rotation.x = p.parle > 0 ? Math.sin(t * 9 + p.ph) * 0.05 : (p.souffle > 0 ? 0.35 : 0);
        if (p.souffle > 0) { p.souffle -= dt; m.corps.rotation.x = 0.25; } else m.corps.rotation.x = p.pose === 'canape' ? -0.12 : (p.f.age === 'senior' && !assis ? 0.08 : 0);
        var t2 = t + p.ph;
        if (phase === 'chant' || phase === 'bravo') { // on chante, on se balance, on tape dans les mains
          m.corps.rotation.z = Math.sin(t * 2.6 + p.ph) * 0.06;
          var cl = phase === 'bravo' ? Math.abs(Math.sin(t * 9 + p.ph)) * 0.35 : Math.abs(Math.sin(t * 3.7)) * 0.2;
          m.bras[0].rotation.set(-1.0 + cl, 0, -0.45); m.bras[1].rotation.set(-1.0 + cl, 0, 0.45);
          if (m.objet) m.objet.visible = false;
        } else {
          m.corps.rotation.z = 0;
          var tient = p.f.tient, haut = tient === 'telephone' ? -1.25 : tient ? -0.75 : (assis ? -0.55 : 0);
          m.bras[1].rotation.set(haut + (p.parle > 0 && !tient ? -0.5 + Math.sin(t2 * 6) * 0.3 : Math.sin(t2 * 1.2) * 0.03), 0, assis ? -0.15 : 0.08);
          m.bras[0].rotation.set((assis ? -0.55 : 0) + (p.parle > 0 && tient ? -0.4 + Math.sin(t2 * 6) * 0.3 : 0), 0, assis ? 0.15 : -0.08);
        }
      });
      // Axel coincé ? jamais dans le joueur
      // robot aspirateur : une ronde autour de la table basse
      angRobot += dt * 0.25; robot.position.set(5.6 + Math.cos(angRobot) * 1.6, 0.04, 0.6 + Math.sin(angRobot) * 1.15); robot.rotation.y = -angRobot; rl.material.color.set(Math.sin(t * 4) > 0 ? '#3a9aff' : '#9ad0ff');
      // les oiseaux se dandinent
      if (sautOiseau > 0) sautOiseau -= dt;
      oiseaux.forEach(function (o, i) { o.rotation.y = (i ? -0.4 : 0.4) + Math.sin(t * 1.7 + i * 2) * 0.5; o.position.y = 1.77 + (sautOiseau > 0 ? Math.abs(Math.sin(t * 14 + i)) * 0.06 : 0); });
      ballons.forEach(function (b) { b.s.position.y = b.y + Math.sin(t * 1.1 + b.p) * 0.05; });
      flammes.forEach(function (f, i) { if (f.visible) f.scale.set(1, 1.7 + Math.sin(t * 19 + i * 1.3) * 0.35, 1); });
      if (lBougies.intensity > 0) lBougies.intensity = (phase === 'jeu' ? 0.55 : 1.6) * (0.9 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.04);
      lumSapin.material.opacity = 0.7 + Math.sin(t * 2.2) * 0.3; vPts.material.opacity = 0.8 + Math.sin(t * 3.1) * 0.2;
      // notes de musique pendant la chanson
      if (phase === 'chant' && Math.random() < dt * 3) coeur(GAT.x + (Math.random() - 0.5) * 3, 1.9, GAT.z + (Math.random() - 0.5) * 1.6, auHasard(['🎵', '🎶']));
      if (phase === 'bravo') { tFin += dt; if (tFin < 3 && Math.random() < dt * 6) coeur(GAT.x + (Math.random() - 0.5) * 3, 1.8, GAT.z + (Math.random() - 0.5) * 2, auHasard(['🎉', '🥳', '❤️', '✨'])); var kk = Math.min(1, tFin / 2.5); if (api) api.eclairage(AV.lerp(0.3, 1, kk)); lampes.forEach(function (o) { o.l.intensity = o.i0 * AV.lerp(0.12, 1, kk); }); lTrep.intensity = 0.35 * kk; lCuis.intensity = 0.6 * kk; }
      for (var c = coeurs.length - 1; c >= 0; c--) { var h = coeurs[c]; h.t += dt; h.s.position.y += dt * 0.5; h.s.material.opacity = Math.max(0, 1 - h.t / 2.2); if (h.t > 2.2) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(c, 1); } }
    });
    // les murs s'effacent quand la caméra passe derrière
    mo.surCamera = function (camera) {
      cielM.position.copy(camera.position);
      var J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur().position : { x: 0, z: 0 };
      murs.forEach(function (w) {
        var cible = w.test(camera.position, J) ? 0.1 : 1;
        w.o += (cible - w.o) * 0.2; w.m.material.opacity = w.o; w.m.material.depthWrite = w.o > 0.9; w.m.visible = w.o > 0.03;
        if (w.lies) w.lies.forEach(function (l) { l.visible = w.o > 0.5; });
      });
    };
    mo.debut = function (a) {
      api = a; sousTitre();
      if (AV.jeu) AV.jeu.camera(0, 0.42, 7.5);
      setTimeout(function () { if (phase === 'jeu' && nTrouves === 0) luiDit('Toute ma famille est là pour les 20 ans de ma sœur 🎂 Tu sauras dire qui est qui ? Si tu bloques, viens me voir 😉', 6); }, 900);
    };
    mo.nettoyer = function () {
      phase = 'parti'; fermerChoix();
      window.removeEventListener('keydown', clavier);
      if (ui.parentNode) ui.parentNode.removeChild(ui);
      AV.audio.sourdine(false);
      var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir');
    };
    mo.debug = {
      etat: function () { return { phase: phase, trouves: nTrouves + '/' + nTotal, lui: [lP.x.toFixed(1), lP.z.toFixed(1)], restants: gens.filter(function (q) { return !q.trouve; }).map(function (q) { return q.nom; }) }; },
      aller: function (nom) { var p = gens.filter(function (q) { return q.nom === nom; })[0]; if (p && AV.jeu) AV.jeu.placer(p.x + Math.sin(p.a) * 1.3, p.z + Math.cos(p.a) * 1.3, p.a + Math.PI); return !!p; },
      parler: function (nom) { var p = gens.filter(function (q) { return q.nom === nom; })[0]; if (p) parlerA(p); },
      choisir: function (nom, n) { var p = gens.filter(function (q) { return q.nom === nom; })[0]; if (p) choisir(p, n); },
      toutTrouver: function (sauf) { gens.forEach(function (p) { if (!p.trouve && p.nom !== sauf) choisir(p, p.nom); }); },
      table: function () { gens.forEach(function (p) { if (!p.trouve) { p.trouve = true; nTrouves++; etiquette(p); } }); versLaTable(); },
      chanter: function () { itChant.fn(); }, souffler: souffler, pouce: coupDePouce,
      places: function () { return Object.keys(PLACES); }
    };
    return mo;
  };
})(window.AV);
