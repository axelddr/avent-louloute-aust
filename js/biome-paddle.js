/* Biome « paddle » : balade en paddle au lac du Crès, en plein été, avec lui sur son paddle à côté.
   L'eau turquoise de l'ancienne carrière, la plage et le poste de secours au sud, les falaises blanches au nord,
   les pins tout autour… et l'île au milieu, où se cache une famille de canards.
   Il faut trouver les 5 canards (une cane, un colvert, trois canetons) : on s'approche et ✋.
   Chaque canard trouvé suit le paddle en file indienne. ⤒ : éclabousser son chéri (il se venge !).
   Quand toute la famille est là : il vient se coller à elle, bisou au milieu du lac, puis la surprise. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#3f8be0', bas: '#d6ecff', brouillard: '#d8eaf6', hemi: ['#ffffff', '#7a8a6a', 0.78], soleil: ['#fff3dc', 0.9, [30, 55, 25]] };
  var A = 150, B = 92, IX = 8, IZ = -6; // lac (demi-axes) et centre de l'île
  var VMAX = 4.2, TROUVE = 5, Y_EAU = 0.2;
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Le lac et l'île ----------
  function rive(x, z) { // > 0 : terre, < 0 : eau (≈ mètres)
    var th = Math.atan2(z, x), f = 1 + 0.07 * Math.sin(3 * th + 0.5) + 0.04 * Math.sin(5 * th + 1);
    return (Math.sqrt((x / A) * (x / A) + (z / B) * (z / B)) - f) * B;
  }
  function rayonIle(th) { return 16 + 3 * Math.sin(3 * th) + 2 * Math.sin(5 * th + 2); }
  function ile(x, z) { var dx = x - IX, dz = z - IZ; return rayonIle(Math.atan2(dz, dx)) - Math.sqrt(dx * dx + dz * dz); } // > 0 : sur l'île
  function bruit(x, z) { return Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06) * 0.6 + 0.4 * Math.sin(x * 0.19 - z * 0.13); }
  function H(x, z) {
    var d = rive(x, z), h;
    if (d < 0) h = Math.max(-4.5, d * 0.35) - 0.1;
    else {
      var plage = lisse(20, 55, z) * (1 - lisse(45, 75, Math.abs(x)));
      var carriere = lisse(-35, -65, z) * (1 - lisse(70, 110, Math.abs(x)));
      var base = 0.1 + Math.min(4, d * 0.28) + lisse(15, 80, d) * 6 + bruit(x, z) * lisse(4, 20, d);
      var hp = 0.1 + Math.min(2.2, d * 0.06) + lisse(30, 60, d) * 3;
      var hc = d < 5 ? 0.1 + d * 3 : 15 + (d - 5) * 0.12 + bruit(x, z) * 1.5;
      h = AV.lerp(AV.lerp(base, hp, plage), hc, carriere);
    }
    var di = ile(x, z);
    if (di > -8) {
      var hi = di > 0 ? 0.15 + Math.min(2.8, di * 0.32) + (di > 4 ? bruit(x * 2, z * 2) * 0.3 : 0) : -0.2 + di * 0.4;
      h = Math.max(h, hi);
    }
    return h;
  }
  function eau(x, z, marge) { return rive(x, z) < -marge && ile(x, z) < -marge; }

  function couleurSol(x, y, z, ny) {
    var d = rive(x, z), di = ile(x, z);
    if (y < -0.05) return varier(y < -2.5 ? '#557a6a' : y < -1 ? '#7d9a7c' : '#b9b08a', x, z, 0.08);   // fond du lac
    if (di > -1) return varier(y < 0.5 ? '#d9c99a' : (Math.sin(x * 0.9) * Math.cos(z * 0.8) > 0.4 ? '#5f8a3e' : '#6f9a48'), x, z, 0.1);
    if (ny < 0.55) return varier(Math.floor(y / 1.6) % 2 ? '#ece6d6' : '#ddd5c2', x, z, 0.06);            // falaises blanches de la carrière
    var plage = lisse(20, 55, z) * (1 - lisse(45, 75, Math.abs(x)));
    if (plage > 0.5 && d < 30) return varier('#e8d9ae', x, z, 0.06);                                   // sable
    if (d < 2.5) return varier('#c9bb8c', x, z, 0.08);
    return varier(bruit(x * 1.7, z * 1.7) > 0.3 ? '#9aa35e' : '#7f9a4e', x, z, 0.12);
  }
  function terrainZone(cx, cz, taille, segs, puits) {
    var geo = new THREE.PlaneGeometry(taille, taille, segs, segs); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) { var x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setX(i, x); p.setZ(i, z); p.setY(i, H(x, z) - (puits ? puits(x, z) : 0)); }
    var g = geo.toNonIndexed(); g.computeVertexNormals();
    var pa = g.attributes.position, no = g.attributes.normal, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var mx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, mz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.copy(couleurSol(mx, my, mz, no.getY(f)));
      for (var k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true;
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
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function pancarte(texte, fond, encre, w, h) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
    var x = c.getContext('2d'); x.fillStyle = fond; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = encre; x.font = '900 ' + Math.round(c.height * 0.5) + 'px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texte, c.width / 2, c.height / 2 + 3);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
  }

  // ---------- Paddle, pagaie ----------
  function planche(couleur, bande) {
    var g = new THREE.Group();
    var p = AV.maille(new THREE.SphereGeometry(1, 16, 8), couleur); p.scale.set(0.42, 0.075, 1.65); g.add(p);
    var pad = AV.maille(new THREE.BoxGeometry(0.5, 0.02, 0.9), '#2b2f35', false); pad.position.set(0, 0.07, 0.05); g.add(pad);
    var b = AV.maille(new THREE.BoxGeometry(0.08, 0.015, 2.2), bande, false); b.position.set(0, 0.07, 0); g.add(b);
    var aileron = bm(0.03, 0.2, 0.3, '#22262b', 0, -0.12, -1.25); g.add(aileron);
    return g;
  }
  // bras + pagaie, accrochés aux épaules (pivot) ; rotation.x = balayage avant/arrière, rotation.z = côté
  function pagaie(couleurBras, couleurPale) {
    var g = new THREE.Group();
    var bras = AV.maille(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 6), couleurBras); bras.position.y = -0.25; g.add(bras);
    var mains = AV.maille(new THREE.IcosahedronGeometry(0.08, 0), '#f2c9a0'); mains.position.y = -0.52; g.add(mains);
    var manche = AV.maille(new THREE.CylinderGeometry(0.018, 0.018, 1.95, 6), '#2b2f35'); manche.position.y = -0.55; g.add(manche);
    var poignee = bm(0.16, 0.035, 0.04, '#2b2f35', 0, 0.42, 0); g.add(poignee);
    var pale = AV.maille(new THREE.BoxGeometry(0.2, 0.42, 0.025), couleurPale); pale.position.y = -1.6; g.add(pale);
    return g;
  }
  function lui3D() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    [-1, 1].forEach(function (c) { corps.add(bm(0.16, 0.8, 0.18, '#2f6fb5', c * 0.11, 0.4, 0)); });   // short de bain
    [-1, 1].forEach(function (c) { corps.add(bm(0.14, 0.4, 0.16, '#eec29a', c * 0.11, 0.2, 0)); });
    var t = AV.maille(new THREE.CylinderGeometry(0.19, 0.23, 0.62, 7), '#f4f1ea'); t.position.y = 1.11; corps.add(t); // tee-shirt
    var tete = new THREE.Group(); tete.position.y = 1.6; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var ch = AV.maille(new THREE.SphereGeometry(0.182, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), '#3a2a1c'); ch.rotation.x = -0.3; tete.add(ch);
    var lun = bm(0.3, 0.05, 0.03, '#1a1a1a', 0, 0.03, 0.16); tete.add(lun);
    var sourire = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); sourire.position.set(0, -0.06, 0.155); sourire.rotation.z = Math.PI; tete.add(sourire);
    AV.avatars.coiffer(tete, 'axel', { retirer: '#3a2a1c', lunettes: true });
    var pg = pagaie('#eec29a', '#ffb02e'); pg.position.set(0, 1.3, 0.1); corps.add(pg);
    return { groupe: g, corps: corps, tete: tete, pagaie: pg };
  }

  // ---------- Canards ----------
  function canard(sorte) {
    var g = new THREE.Group(), c = new THREE.Group(); g.add(c);
    var s = sorte === 'caneton' ? 0.55 : 1;
    var corpsC = sorte === 'colvert' ? '#c9c4b8' : sorte === 'cane' ? '#8a6a48' : '#e8c84a';
    var dos = sorte === 'colvert' ? '#6b6258' : sorte === 'cane' ? '#6e5236' : '#8a6a38';
    var b = AV.maille(new THREE.SphereGeometry(0.22, 10, 7), corpsC); b.scale.set(1, 0.75, 1.45); b.position.y = 0.12; c.add(b);
    var d = AV.maille(new THREE.SphereGeometry(0.2, 8, 6), dos); d.scale.set(0.95, 0.5, 1.3); d.position.set(0, 0.2, -0.04); c.add(d);
    if (sorte === 'colvert') { var poit = AV.maille(new THREE.SphereGeometry(0.15, 8, 6), '#7a4a2f'); poit.position.set(0, 0.16, 0.2); c.add(poit); }
    var q = AV.maille(new THREE.ConeGeometry(0.08, 0.2, 5), dos); q.rotation.x = -2.2; q.position.set(0, 0.22, -0.32); c.add(q);
    var cou = new THREE.Group(); cou.position.set(0, 0.25, 0.22); c.add(cou);
    var tete = AV.maille(new THREE.SphereGeometry(0.12, 8, 6), sorte === 'colvert' ? '#1f6b3a' : sorte === 'cane' ? '#7a5a3a' : '#f0d050'); tete.position.set(0, 0.14, 0.04); cou.add(tete);
    if (sorte === 'colvert') { var col = AV.maille(new THREE.TorusGeometry(0.075, 0.015, 4, 10), '#ffffff', false); col.rotation.x = Math.PI / 2; col.position.y = 0.04; cou.add(col); }
    var bec = AV.maille(new THREE.BoxGeometry(0.09, 0.03, 0.12), sorte === 'colvert' ? '#e8c84a' : '#e0892a'); bec.position.set(0, 0.11, 0.19); cou.add(bec);
    [-1, 1].forEach(function (k) { var o = AV.maille(new THREE.SphereGeometry(0.018, 5, 4), '#111', false); o.position.set(k * 0.08, 0.18, 0.12); cou.add(o); });
    var ailes = [];
    [-1, 1].forEach(function (k) { var a = AV.maille(new THREE.BoxGeometry(0.04, 0.12, 0.3), dos); a.position.set(k * 0.2, 0.18, -0.05); c.add(a); ailes.push(a); });
    g.scale.setScalar(s * 1.55);
    return { groupe: g, corps: c, cou: cou, ailes: ailes };
  }

  // =====================================================================
  AV.biomes.paddle = function (cfg) {
    var rng = AV.rng(9009 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 9999, hauteur: function () { return 0; }, surface: 'eau', ciel: CIEL, brouillard: [180, 900],
      depart: { x: 0, z: 74, angle: Math.PI }, theme: 'paddle', ambiance: 'vagues'
    });
    mo.loin = 1400;
    mo.sansAnimal = true;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe;

    // ---------- Terrain, eau ----------
    G.add(terrainZone(0, 0, 700, 220, function (x, z) { var d = Math.min(x - (IX - 30), (IX + 30) - x, z - (IZ - 30), (IZ + 30) - z); return d <= 0 ? 0 : lisse(0, 6, d) * 3; }));
    G.add(terrainZone(IX, IZ, 60, 60, null));
    var collines = new THREE.Mesh(new THREE.RingGeometry(320, 3000, 48, 1), new THREE.MeshLambertMaterial({ color: '#8c9a62' }));
    collines.rotation.x = -Math.PI / 2; collines.position.y = 7; G.add(collines);
    var eauM = AV.eau(340, 220, 56, 38, '#38a6a6', 0.82);
    eauM.position.set(0, 0, -2); G.add(eauM);
    mo.anime(function (dt, t) { eauM.userData.maj(dt, t * 0.6); });
    // petites vaguelettes scintillantes
    var NE = 260, eclats = new Float32Array(NE * 3);
    for (var i = 0; i < NE; i++) { eclats[i * 3] = AV.entre(rng, -140, 140); eclats[i * 3 + 1] = 0.12; eclats[i * 3 + 2] = AV.entre(rng, -85, 85); }
    var eclatG = new THREE.BufferGeometry(); eclatG.setAttribute('position', new THREE.BufferAttribute(eclats, 3));
    var eclatM = new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, map: AV.textureRonde(), transparent: true, depthWrite: false, opacity: 0.6 });
    G.add(new THREE.Points(eclatG, eclatM));
    mo.anime(function (dt, t) { eclatM.opacity = 0.35 + 0.3 * Math.sin(t * 2.3); });

    // ---------- Végétation : pins, roseaux, saule de l'île ----------
    var V = new AV.Fusion();
    for (var tI = 0; tI < 520; tI++) {
      var a = rng() * Math.PI * 2, dd = AV.entre(rng, 1.05, 1.9), x = Math.cos(a) * A * dd, z = Math.sin(a) * B * dd;
      var d = rive(x, z); if (d < 4) continue;
      var plage = lisse(20, 55, z) * (1 - lisse(45, 75, Math.abs(x)));
      if (plage > 0.4 && d < 35) continue;
      var y = H(x, z) - 0.1;
      if (rng() < 0.55) { // pin parasol
        var h = AV.entre(rng, 6, 11), pen = (rng() - 0.5) * 0.2;
        forme(V, new THREE.CylinderGeometry(0.2, 0.32, h, 6), '#7a5c44', x, y + h / 2, z, 0, 1, 1, 1, 0, pen);
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4f6b3a', '#5a7540', '#46623a']), x + Math.sin(-pen) * h * 0.5, y + h + 0.4, z, rng() * 3, AV.entre(rng, 3.6, 5.4), AV.entre(rng, 1.2, 1.8), AV.entre(rng, 3.6, 5.4));
      } else forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5e6e3e', '#6b7a46', '#77864f']), x, y + 0.6, z, rng() * 3, AV.entre(rng, 1, 2.5), AV.entre(rng, 0.8, 1.8), AV.entre(rng, 1, 2.5));
    }
    // roseaux le long des rives et tout autour de l'île
    function touffe(x, z, n, haut) {
      for (var k = 0; k < n; k++) {
        var rx = x + (rng() - 0.5) * 2.2, rz = z + (rng() - 0.5) * 2.2, h = AV.entre(rng, 1.2, 2.2) * (haut || 1);
        forme(V, new THREE.ConeGeometry(0.05, h, 3), AV.choisir(rng, ['#7f9a4e', '#93a85a', '#6d8a42', '#a8b06a']), rx, Math.max(-0.3, H(rx, rz)) + h / 2 - 0.1, rz, rng() * 3, 1, 1, 1, (rng() - 0.5) * 0.25, (rng() - 0.5) * 0.25);
        if (rng() < 0.15) forme(V, new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5), '#6b4a32', rx, Math.max(-0.3, H(rx, rz)) + h - 0.05, rz, 0, 1, 1, 1); // massette
      }
    }
    for (var rI = 0; rI < 70; rI++) {
      var ar = rng() * Math.PI * 2, xr = Math.cos(ar) * A * 0.98, zr = Math.sin(ar) * B * 0.98;
      if (zr > 40 && Math.abs(xr) < 75) continue; // pas devant la plage
      for (var s = 0; s < 6; s++) { var pr = 0.9 + s * 0.03; xr = Math.cos(ar) * A * pr; zr = Math.sin(ar) * B * pr; if (Math.abs(rive(xr, zr)) < 1.5) break; }
      if (Math.abs(rive(xr, zr)) < 3) touffe(xr, zr, 12);
    }
    for (var ri = 0; ri < 44; ri++) {
      var ai = ri / 44 * Math.PI * 2 + rng() * 0.08;
      if (Math.abs(ai - Math.PI / 2) < 0.38) continue; // la petite plage de l'île (côté sud)
      var rr = rayonIle(ai) + AV.entre(rng, -0.3, 1.0);
      touffe(IX + Math.cos(ai) * rr, IZ + Math.sin(ai) * rr, Math.abs(ai - 3 * Math.PI / 2) < 0.5 ? 26 : 12, Math.abs(ai - 3 * Math.PI / 2) < 0.5 ? 1.2 : 1);
    }
    // l'île : un saule pleureur à l'ouest, des pins, des rochers
    (function () {
      var sx = IX - 11, sz = IZ + 1, sy = H(sx, sz);
      forme(V, new THREE.CylinderGeometry(0.35, 0.55, 5, 7), '#6a5442', sx, sy + 2.5, sz, 0, 1, 1, 1, 0, -0.15);
      for (var k = 0; k < 14; k++) {
        var ak = k / 14 * Math.PI * 2, rk = AV.entre(rng, 2.5, 4.2);
        forme(V, new THREE.ConeGeometry(1, 1, 5), AV.choisir(rng, ['#8fb04e', '#7fa046', '#9cbb5a']), sx - 0.6 + Math.cos(ak) * rk, sy + 3.6, sz + Math.sin(ak) * rk, ak, 1.6, 4.4, 1.6, Math.PI, 0);
      }
      forme(V, new THREE.IcosahedronGeometry(1, 0), '#8fb04e', sx - 0.6, sy + 5.5, sz, 0, 4, 1.8, 4);
      [[IX + 3, IZ - 6, 9], [IX + 6, IZ + 4, 7], [IX - 3, IZ - 2, 10]].forEach(function (p) {
        var py = H(p[0], p[1]);
        forme(V, new THREE.CylinderGeometry(0.2, 0.3, p[2], 6), '#7a5c44', p[0], py + p[2] / 2, p[1], 0, 1, 1, 1);
        forme(V, new THREE.IcosahedronGeometry(1, 0), '#4f6b3a', p[0], py + p[2] + 0.4, p[1], rng() * 3, 4, 1.5, 4);
      });
      var ra = 0.3, rr2 = rayonIle(ra) + 0.4;
      forme(V, new THREE.DodecahedronGeometry(1, 0), '#d8d2c2', IX + Math.cos(ra) * rr2, 0.3, IZ + Math.sin(ra) * rr2, 0.4, 1.8, 1.3, 1.5);
      forme(V, new THREE.DodecahedronGeometry(1, 0), '#cfc8b6', IX + Math.cos(ra + 0.12) * (rr2 - 1.5), 0.5, IZ + Math.sin(ra + 0.12) * (rr2 - 1.5), 0, 1.3, 1, 1.2);
    })();
    var vegM = V.maille(); vegM.castShadow = true; G.add(vegM);

    // ---------- La plage : poste de secours, parasols, serviettes, panneau ----------
    var P = new AV.Fusion();
    (function () {
      var px = 18, pz = 96, py = H(px, pz);
      [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(function (q) { forme(P, new THREE.BoxGeometry(0.15, 3, 0.15), '#f4f1ea', px + q[0], py + 1.5, pz + q[1], 0, 1, 1, 1); });
      forme(P, new THREE.BoxGeometry(2.4, 1.6, 2.4), '#f4f1ea', px, py + 3.8, pz, 0, 1, 1, 1);
      forme(P, new THREE.BoxGeometry(2.4, 0.5, 0.05), '#d94a4a', px, py + 4.2, pz - 1.22, 0, 1, 1, 1);
      forme(P, new THREE.ConeGeometry(1, 1, 4), '#d94a4a', px, py + 5.0, pz, Math.PI / 4, 2.2, 0.8, 2.2);
      forme(P, new THREE.CylinderGeometry(0.04, 0.04, 3, 5), '#cccccc', px + 1.3, py + 6, pz, 0, 1, 1, 1);
      forme(P, new THREE.BoxGeometry(0.9, 0.6, 0.03), '#3aa34a', px + 1.75, py + 7.1, pz, 0, 1, 1, 1); // drapeau vert : baignade surveillée
      var cols = ['#e2483d', '#f2c230', '#3f7fd9', '#ff7fb0', '#4ab0a0'];
      for (var k = 0; k < 9; k++) {
        var bx = AV.entre(rng, -45, 45), bz = AV.entre(rng, 90, 104), by = H(bx, bz);
        if (Math.abs(bx - px) < 4) continue;
        if (k % 2 === 0) {
          forme(P, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), '#dddddd', bx, by + 1.1, bz, 0, 1, 1, 1);
          forme(P, new THREE.ConeGeometry(1.2, 0.5, 8), cols[k % cols.length], bx, by + 2.2, bz, 0, 1, 1, 1);
        }
        forme(P, new THREE.BoxGeometry(0.9, 0.03, 1.8), cols[(k + 2) % cols.length], bx + 1.2, by + 0.03, bz + 0.4, rng(), 1, 1, 1);
      }
    })();
    G.add(P.maille());
    var pan = pancarte('Lac du Crès', '#f4efe2', '#2f6fb5', 4, 1);
    pan.position.set(-10, H(-10, 93) + 2.2, 93); pan.rotation.y = Math.PI; G.add(pan);
    var pp = bm(0.12, 2, 0.12, '#7a5c44', -10, H(-10, 93) + 1, 93.05); G.add(pp);

    // ---------- Elle (le joueur) et lui, sur leurs paddles ----------
    var planEl = planche('#ff7f6a', '#ffffff'); G.add(planEl);
    var pagEl = pagaie('#4a7bd1', '#ff7f6a');
    var lui = lui3D(); G.add(lui.groupe);
    var planLui = planche('#3f9fd9', '#ffffff'); G.add(planLui);

    // ---------- Les 5 canards ----------
    function surIle(th, off) { var r = rayonIle(th) + off; return [IX + Math.cos(th) * r, IZ + Math.sin(th) * r]; }
    var canards = [
      { sorte: 'cane', nom: 'la maman cane', th: Math.PI / 2, off: -0.6, terre: true, dort: true },
      { sorte: 'colvert', nom: 'le colvert', th: 3 * Math.PI / 2 + 0.1, off: 0.9 },
      { sorte: 'caneton', nom: 'un caneton', th: Math.PI + 0.05, off: 1.0 },
      { sorte: 'caneton', nom: 'un caneton', th: 0.3, off: 2.2 },
      { sorte: 'caneton', nom: 'le caneton nageur', th: 2.2, off: 6.5, nage: true }
    ];
    canards.forEach(function (c, i) {
      c.m = canard(c.sorte); G.add(c.m.groupe);
      var p = surIle(c.th, c.off);
      c.x = p[0]; c.z = p[1]; c.y = c.terre ? H(c.x, c.z) + 0.02 : Y_EAU;
      c.m.groupe.position.set(c.x, c.y, c.z);
      c.m.groupe.rotation.y = Math.atan2(c.x - IX, c.z - IZ) + (rng() - 0.5);
      c.trouve = false; c.ph = rng() * 6;
      c.halo = AV.halo('#fff2b0', 2.6); c.halo.material.opacity = 0; c.halo.position.y = 0.6; c.m.groupe.add(c.halo);
    });
    if (canards[0].dort) canards[0].m.cou.rotation.set(0.6, 2.4, 0); // tête sous l'aile

    // ---------- Éclaboussures ----------
    var ND = 80, gouttes = [], gPos = new Float32Array(ND * 3);
    for (var gI = 0; gI < ND; gI++) { gouttes.push({ v: new THREE.Vector3(), vie: 0 }); gPos[gI * 3 + 1] = -50; }
    var gG = new THREE.BufferGeometry(); gG.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    var gouttesP = new THREE.Points(gG, new THREE.PointsMaterial({ color: '#e8fbff', size: 0.16, map: AV.textureRonde(), transparent: true, depthWrite: false }));
    gouttesP.frustumCulled = false; G.add(gouttesP);
    var gProchaine = 0;
    function eclabousser(de, vers, n) {
      var dir = vers.clone().sub(de); dir.y = 0; var l = dir.length() || 1; dir.multiplyScalar(1 / l);
      for (var k = 0; k < n; k++) {
        var g = gouttes[gProchaine]; gProchaine = (gProchaine + 1) % ND;
        g.vie = 1.4; g.p = de.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4));
        var v = Math.min(9, l * 1.6 + 2) * (0.75 + Math.random() * 0.4);
        g.v.set(dir.x * v + (Math.random() - 0.5) * 1.5, 3.2 + Math.random() * 2.2, dir.z * v + (Math.random() - 0.5) * 1.5);
      }
      AV.audio.plouf(1);
    }
    function majGouttes(dt) {
      for (var k = 0; k < ND; k++) {
        var g = gouttes[k];
        if (g.vie > 0) { g.vie -= dt; g.v.y -= 9.8 * dt; g.p.addScaledVector(g.v, dt); if (g.p.y < 0) g.vie = 0; }
        gPos[k * 3] = g.vie > 0 ? g.p.x : 0; gPos[k * 3 + 1] = g.vie > 0 ? g.p.y : -50; gPos[k * 3 + 2] = g.vie > 0 ? g.p.z : 0;
      }
      gG.attributes.position.needsUpdate = true;
    }

    // ---------- État ----------
    var etat = 'intro', tEtat = 0, tJeu = 0, api = null, parole = null, J = null;
    var pos = new THREE.Vector3(0, 0, 74), psi = 0, v = 0, w = 0, phase = 0, cote = 1, nbCoups = 0;
    var lp = new THREE.Vector3(-3, 0, 77), lpsi = 0, lv = 0, lphase = 0, lcote = -1, vengeance = -1, tCoin = 3, prochaineAide = 70;
    var camLacet = 0, camTang = 0.36, camRegard = null, tDrag = 0;
    var nTrouves = 0, file = [], coeurs = [], tCoeur = 0, fini = false;
    var vF = new THREE.Vector3(), vR = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function sousTitre() {
      if (!api) return;
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, etat === 'fin' || etat === 'fini' ? '🦆 Toute la famille canard est là ! ❤'
        : '🦆 ' + nTrouves + ' / ' + TROUVE + ' canards · ⤒ éclabousser ' + nomLui.toLowerCase().replace(/^lui$/, 'ton chéri'));
    }
    function plusProche() {
      var best = null, bd = 1e9;
      canards.forEach(function (c) { if (c.trouve) return; var d = Math.hypot(c.x - pos.x, c.z - pos.z); if (d < bd) { bd = d; best = c; } });
      return { c: best, d: bd };
    }
    function direction(c) {
      var a = Math.atan2(c.z - IZ, c.x - IX); // angle autour de l'île
      var n = ['à l\'est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l\'ouest', 'au nord-ouest', 'au nord', 'au nord-est'];
      // x = est, z = sud
      var k = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
      return n[k] + ' de l\'île';
    }

    mo.debut = function (a) {
      api = a; sousTitre();
      document.getElementById('hud-aide-clavier').textContent = 'ZQSD / flèches : pagayer et tourner · glisser : caméra · E : ✋ canard · Espace : éclabousser';
    };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'intro') return '🏖️ Lac du Crès, un après-midi d\'été… une famille de canards se cache autour de l\'île !';
      if (etat !== 'jeu') return null;
      var pp = plusProche();
      if (pp.c && pp.d < 5.5) return '✋ Coin coin ! C\'est ' + pp.c.nom + ' !';
      if (tJeu < 8) return document.body.classList.contains('tactile') ? '🏄 Joystick : pagayer / tourner · glisser à droite : caméra · ✋ près d\'un canard' : '🏄 ZQSD : pagayer / tourner · souris : caméra · E près d\'un canard';
      return null;
    };

    function trouver(c) {
      c.trouve = true; nTrouves++; file.push(c);
      AV.audio.coin(1, c.sorte === 'caneton'); AV.audio.ping(1);
      c.saut = 0.6; c.halo.material.opacity = 0;
      if (c.dort) c.m.cou.rotation.set(0, 0, 0);
      var s = AV.texteSprite('Coin ! 🦆', { fond: 'rgba(27,35,64,.8)', largeur: 1.8, echelle: 0.45 });
      s.position.set(c.m.groupe.position.x, c.m.groupe.position.y + 1.4, c.m.groupe.position.z); G.add(s); coeurs.push({ s: s, t: 0, vie: 1.8 });
      var reste = TROUVE - nTrouves;
      dire(reste ? '🦆 Tu as trouvé ' + c.nom + ' ! Il te suit 😍 · ' + nomLui + ' : « ' + auHasard(['Trop mignon !!', 'Regarde, il nage derrière toi 😂', 'Encore ' + reste + ', je crois que j\'en entends un…', 'T\'es la reine des canards 👑']) + ' »'
        : '🦆 Toute la famille est là !! ' + nomLui + ' : « Viens là toi… ❤ »', 4);
      sousTitre();
      if (!reste) {
        etat = 'fin'; tEtat = 0;
        if (Math.hypot(lp.x - pos.x, lp.z - pos.z) > 15) { // il était resté loin : il arrive en glissant juste derrière
          dirDe(psi, vF); var lx = pos.x - vF.x * 7, lz = pos.z - vF.z * 7;
          if (eau(lx, lz, 1.3)) lp.set(lx, 0, lz);
        }
        sousTitre();
      }
    }

    // ---------- Animation d'un pagayeur (pagaie : groupe accroché aux épaules) ----------
    function pagayer(pg, ph, cote, force) {
      // phase 0..1 : 0-0.55 traction (pale dans l'eau, d'avant en arrière), 0.55-1 retour (pale en l'air)
      var f = ph % 1, ax, ay;
      if (f < 0.55) { var k = f / 0.55; ax = AV.lerp(-0.75, 0.55, k); ay = 0; }
      else { var k2 = (f - 0.55) / 0.45; ax = AV.lerp(0.55, -0.75, k2); ay = Math.sin(k2 * Math.PI) * 0.25; }
      pg.rotation.set(ax * force + (1 - force) * 0.1, 0, cote * (0.38 + ay));
    }

    mo.pilote = function (dt, e, appui, joueur, camera, x) {
      J = joueur; x = x || {};
      tEtat += dt; if (parole) parole.t -= dt;
      var r = x.regard || { dx: 0, dy: 0 };
      var pr = J.parts;
      if (pagEl.parent !== pr.corps) { pagEl.position.set(0, 1.3, 0.1); pr.corps.add(pagEl); }
      pr.brasG.visible = pr.brasD.visible = false;

      var ctrl = etat === 'jeu';
      if (etat === 'intro' && (tEtat > 5 || (appui && tEtat > 0.8))) { etat = 'jeu'; tEtat = 0; }
      if (ctrl) tJeu += dt;

      // ----- elle : propulsion / direction -----
      var poussee = ctrl ? Math.max(-0.5, e.y) : 0, tourne = ctrl ? e.x : 0;
      var vCible = poussee * VMAX * (e.course ? 1.25 : 1);
      v = AV.lerp(v, vCible, Math.min(1, dt * (Math.abs(vCible) > Math.abs(v) ? 0.9 : 0.5)));
      w = AV.lerp(w, -tourne * (0.6 + Math.min(1, Math.abs(v) / 2) * 0.5), Math.min(1, dt * 3));
      psi += w * dt;
      dirDe(psi, vF);
      var nx = pos.x + vF.x * v * dt, nz = pos.z + vF.z * v * dt;
      if (eau(nx, nz, 1.3)) { pos.x = nx; pos.z = nz; }
      else if (eau(nx, pos.z, 1.3)) { pos.x = nx; v *= 0.9; }
      else if (eau(pos.x, nz, 1.3)) { pos.z = nz; v *= 0.9; }
      else { v *= -0.3; if (Math.abs(v) > 0.6) AV.audio.plouf(0.2); }
      // la pagaie : on pagaie quand on avance (on change de côté toutes les 4 tractions)
      var actif = Math.abs(poussee) > 0.08 || Math.abs(tourne) > 0.3;
      if (actif) {
        var av = phase; phase += dt * (0.9 + Math.abs(poussee) * 0.5);
        if (Math.floor(av) !== Math.floor(phase)) { nbCoups++; if (nbCoups % 4 === 0) cote = -cote; }
        if (Math.floor(av + 0.45) !== Math.floor(phase + 0.45)) AV.audio.plouf(0.15);
        if (Math.abs(tourne) > 0.3 && Math.abs(poussee) < 0.3) cote = tourne > 0 ? -1 : 1; // pour tourner, on pagaie du côté opposé
      }
      pagayer(pagEl, phase, cote, actif ? 1 : 0);
      var t = tJeu + tEtat;
      planEl.position.set(pos.x, 0.06 + Math.sin(t * 1.7) * 0.03, pos.z);
      planEl.rotation.set(Math.sin(t * 1.3) * 0.02, psi, Math.sin(t * 1.1 + 1) * 0.025 + (actif ? cote * 0.015 : 0));
      J.position.set(pos.x, planEl.position.y + 0.08, pos.z);
      J.groupe.rotation.y = psi + Math.PI;
      pr.corps.rotation.set(actif ? 0.12 + Math.sin(phase * Math.PI * 2) * 0.05 : 0.02, 0, 0);
      pr.jambeG.rotation.set(0, 0, -0.06); pr.jambeD.rotation.set(0, 0, 0.06);
      pr.tete.rotation.set(0, 0, 0);
      J.ombre.visible = false;

      // ----- lui : il la suit, un peu derrière sur sa gauche -----
      dirDe(psi, vF); vR.set(-vF.z, 0, vF.x);
      var cible = new THREE.Vector3();
      if (etat === 'fin' || etat === 'fini') cible.copy(pos).addScaledVector(vR, -1.15).addScaledVector(vF, 0.05);
      else cible.copy(pos).addScaledVector(vR, -3.2).addScaledVector(vF, -2.2);
      if (ile(cible.x, cible.z) > -2.5 || !eau(cible.x, cible.z, 1.3)) cible.copy(pos).addScaledVector(vF, -4.5);
      var dx = cible.x - lp.x, dz = cible.z - lp.z, dl = Math.sqrt(dx * dx + dz * dz);
      var lvC = Math.min(VMAX * 1.15, dl * 0.9);
      if (dl < 0.25) lvC = 0;
      lv = AV.lerp(lv, lvC, Math.min(1, dt * 1.2));
      var cap = dl > 0.5 ? Math.atan2(-dx, -dz) : psi;
      lpsi = AV.angleLerp(lpsi, cap, Math.min(1, dt * (dl > 0.5 ? 1.8 : 3)));
      dirDe(lpsi, vR);
      var lnx = lp.x + vR.x * lv * dt, lnz = lp.z + vR.z * lv * dt;
      if (eau(lnx, lnz, 1.2) && Math.hypot(lnx - pos.x, lnz - pos.z) > 0.95) { lp.x = lnx; lp.z = lnz; } else lv *= 0.5;
      var lactif = lv > 0.3;
      if (lactif) { var la = lphase; lphase += dt * (0.8 + lv * 0.15); if (Math.floor(la / 4) !== Math.floor(lphase / 4)) lcote = -lcote; }
      planLui.position.set(lp.x, 0.06 + Math.sin(t * 1.5 + 2) * 0.03, lp.z);
      planLui.rotation.set(Math.sin(t * 1.2 + 1) * 0.02, lpsi, Math.sin(t * 1.0) * 0.025);
      lui.groupe.position.set(lp.x, planLui.position.y + 0.08, lp.z);
      lui.groupe.rotation.y = lpsi + Math.PI;
      pagayer(lui.pagaie, lphase, lcote, lactif ? 1 : 0);
      lui.corps.rotation.set(lactif ? 0.1 : 0, 0, 0);

      // ----- éclabousser (⤒) -----
      var dLui = Math.hypot(lp.x - pos.x, lp.z - pos.z);
      if (ctrl && x.saut) {
        var depuis = new THREE.Vector3(pos.x, 0.3, pos.z);
        if (dLui < 9) {
          eclabousser(depuis, new THREE.Vector3(lp.x, 1.2, lp.z), 26);
          dire(auHasard(['💦 ' + nomLui + ' : « Hééé !! 😂 Tu vas voir… »', '💦 ' + nomLui + ' : « Ah c\'est comme ça ?! »', '💦 ' + nomLui + ' : « Elle est froide !! 🥶 »']), 2.4);
          vengeance = 1.1;
        } else { dirDe(psi, vF); eclabousser(depuis, depuis.clone().addScaledVector(vF, 4), 14); }
      }
      if (vengeance > 0) { vengeance -= dt; if (vengeance <= 0) { eclabousser(new THREE.Vector3(lp.x, 0.3, lp.z), new THREE.Vector3(pos.x, 1.2, pos.z), 30); dire('💦 La vengeance de ' + nomLui + ' ! 😂', 2); } }
      majGouttes(dt);

      // ----- les canards -----
      canards.forEach(function (c, i) {
        var g = c.m.groupe;
        if (!c.trouve) {
          if (c.nage) { c.th += dt * 0.05; var p = surIle(c.th, c.off); c.x = p[0]; c.z = p[1]; g.rotation.y = Math.atan2(-Math.sin(c.th), Math.cos(c.th)); }
          g.position.set(c.x, c.y + (c.terre ? 0 : Math.sin(t * 2 + c.ph) * 0.02), c.z);
          if (!c.dort) c.m.cou.rotation.x = Math.sin(t * 0.8 + c.ph) > 0.7 ? 0.8 : 0;
          c.halo.material.opacity = tJeu > 150 ? 0.4 + 0.3 * Math.sin(t * 4 + c.ph) : 0;
        } else {
          // en file indienne derrière le paddle
          var k = file.indexOf(c), devant = k === 0 ? null : file[k - 1];
          var tx, tz;
          if (etat === 'fin' || etat === 'fini') { var ang = t * 0.5 + k / TROUVE * Math.PI * 2; dirDe(psi, vF); tx = pos.x - vF.x * 3.2 + Math.cos(ang) * 2.2; tz = pos.z - vF.z * 3.2 + Math.sin(ang) * 2.2; }
          else if (!devant) { dirDe(psi, vF); tx = pos.x - vF.x * 2.6; tz = pos.z - vF.z * 2.6; }
          else { tx = devant.x; tz = devant.z; }
          var ddx = tx - c.x, ddz = tz - c.z, dd2 = Math.sqrt(ddx * ddx + ddz * ddz), esp = devant && etat === 'jeu' ? (c.sorte === 'caneton' ? 0.75 : 1.1) : 0.2;
          if (dd2 > esp) { var vit = Math.min(dd2 - esp, 1) * Math.max(2.2, Math.abs(v) + 1.4) * dt * 1.6; c.x += ddx / dd2 * vit; c.z += ddz / dd2 * vit; g.rotation.y = AV.angleLerp(g.rotation.y, Math.atan2(ddx, ddz), Math.min(1, dt * 6)); }
          c.y = AV.lerp(c.y, ile(c.x, c.z) > 0 ? H(c.x, c.z) + 0.02 : Y_EAU, Math.min(1, dt * 4));
          var saut = c.saut > 0 ? Math.sin((0.6 - c.saut) / 0.6 * Math.PI) * 0.5 : 0;
          if (c.saut > 0) c.saut -= dt;
          g.position.set(c.x, c.y + saut + Math.sin(t * 2.4 + c.ph) * 0.02, c.z);
          c.m.ailes.forEach(function (a, j) { a.rotation.z = c.saut > 0 ? Math.sin(t * 30) * 0.8 * (j ? 1 : -1) : 0; });
          c.m.cou.rotation.set(0, 0, 0);
        }
      });
      // coin coin : on entend le canard le plus proche
      var pp = plusProche();
      if (ctrl && pp.c) {
        tCoin -= dt;
        if (tCoin <= 0) { tCoin = 2.5 + Math.random() * 2.5; AV.audio.coin(Math.max(0.08, 1 - pp.d / 90), pp.c.sorte === 'caneton'); }
        if (tJeu > prochaineAide) { prochaineAide = tJeu + 45; dire('💙 ' + nomLui + ' : « J\'entends des coin-coin… regarde ' + direction(pp.c) + ' ! »', 4); }
        if (x.action && pp.d < 5.5) trouver(pp.c);
        else if (x.action) { AV.audio.coin(0.25, false); dire(pp.d < 12 ? '🦆 Presque ! Approche-toi encore un peu…' : '🔍 Pas de canard ici… cherche autour de l\'île', 2); }
      }

      // ----- la fin : bisou au milieu du lac -----
      if (etat === 'fin' || etat === 'fini') {
        v *= Math.exp(-dt * 1.5);
        // elle pivote doucement face au large (dos à l'île) pour que la caméra reste sur l'eau
        psi = AV.angleLerp(psi, Math.atan2(-(pos.x - IX), -(pos.z - IZ)), Math.min(1, dt * 0.9));
        var colle = dLui < 1.6;
        if (colle) {
          tCoeur -= dt;
          var kk = Math.min(1, tEtat / 2);
          pr.corps.rotation.set(0.05, 0, 0.18 * kk); lui.corps.rotation.set(0.05, 0, -0.18 * kk);
          if (tCoeur <= 0 && tEtat > 1) {
            tCoeur = 0.32;
            var cs = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.7 });
            cs.position.set((pos.x + lp.x) / 2 + (Math.random() - 0.5) * 0.6, 2.2, (pos.z + lp.z) / 2 + (Math.random() - 0.5) * 0.6);
            G.add(cs); coeurs.push({ s: cs, t: 0, vie: 2.3 });
          }
          if (tEtat > 6 && !fini) { fini = true; etat = 'fini'; sousTitre(); AV.audio.coin(0.8, true); if (api) api.trouver(); }
        } else if (tEtat > 12 && !fini) { lp.copy(pos).addScaledVector(vR.set(-Math.cos(psi), 0, Math.sin(psi)), 1.15); } // il est coincé : on le rapproche
      }
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var h = coeurs[i]; h.t += dt; h.s.position.y += dt * 0.6; h.s.material.opacity = Math.max(0, 1 - h.t / h.vie);
        if (h.t > h.vie) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(i, 1); }
      }

      // ----- caméra -----
      if (Math.abs(r.dx) + Math.abs(r.dy) > 0) tDrag = 2.5; else tDrag -= dt;
      camLacet -= r.dx * 0.006; camTang = Math.max(0.08, Math.min(1.1, camTang + r.dy * 0.004));
      if (tDrag <= 0 && Math.abs(v) > 0.5) camLacet = AV.lerp(camLacet, 0, Math.min(1, dt * 0.8));
      var cp = new THREE.Vector3(), cv = new THREE.Vector3(pos.x, 1.3, pos.z);
      if (etat === 'intro') {
        var ti = lisse(0, 5, tEtat);
        cp.set(AV.lerp(IX + 30, pos.x + 0.8, ti), AV.lerp(14, 3.0, ti), AV.lerp(IZ + 30, pos.z + 7, ti));
        cv.set(AV.lerp(IX, pos.x, ti), AV.lerp(1, 1.3, ti), AV.lerp(IZ, pos.z - 4, ti));
        camera.position.copy(cp); camRegard = cv.clone(); camera.lookAt(cv);
        return;
      }
      if (etat === 'fin' || etat === 'fini') {
        var mx = (pos.x + lp.x) / 2, mz = (pos.z + lp.z) / 2;
        dirDe(psi, vF);
        cp.set(mx + vF.x * 5.2, 1.9, mz + vF.z * 5.2); cv.set(mx, 1.2, mz);
        camera.position.lerp(cp, 1 - Math.exp(-dt * 1.2));
      } else {
        var cl = psi + camLacet, dist = 7.2;
        cp.set(pos.x + Math.sin(cl) * Math.cos(camTang) * dist, 0.8 + Math.sin(camTang) * dist, pos.z + Math.cos(cl) * Math.cos(camTang) * dist);
        if (cp.y < H(cp.x, cp.z) + 0.8) cp.y = H(cp.x, cp.z) + 0.8;
        camera.position.lerp(cp, 1 - Math.exp(-dt * 5));
      }
      if (!camRegard) camRegard = cv.clone();
      camRegard.lerp(cv, 1 - Math.exp(-dt * 6));
      camera.lookAt(camRegard);
    };
    function dirDe(a, out) { return out.set(-Math.sin(a), 0, -Math.cos(a)); }

    mo.nettoyer = function () {
      if (J) {
        var pr = J.parts;
        if (pagEl.parent) pagEl.parent.remove(pagEl);
        AV.detruire(pagEl);
        pr.brasG.visible = pr.brasD.visible = true;
        pr.corps.rotation.set(0, 0, 0); pr.tete.rotation.set(0, 0, 0);
        pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
        J.ombre.visible = true;
      }
    };

    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, pos: [Math.round(pos.x), Math.round(pos.z)], lui: [Math.round(lp.x), Math.round(lp.z)], trouves: nTrouves, canards: canards.map(function (c) { return [Math.round(c.x), Math.round(c.z), c.trouve]; }) }; },
      aller: function (n) { var c = canards[n]; var a = Math.atan2(c.z - IZ, c.x - IX), rr = rayonIle(a) + 4.2; pos.set(IX + Math.cos(a) * rr, 0, IZ + Math.sin(a) * rr); psi = Math.atan2(-(c.x - pos.x), -(c.z - pos.z)); v = 0; if (etat === 'intro') etat = 'jeu';
        lp.set(pos.x + Math.cos(a) * 4, 0, pos.z + Math.sin(a) * 4); },
      trouver: function (n) { if (!canards[n].trouve) trouver(canards[n]); },
      placer: function (x, z, a) { pos.set(x, 0, z); if (a != null) psi = a; }
    };
    return mo;
  };
})(window.AV);
