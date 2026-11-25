/* Biome « peyrou » : l'éclipse totale de l'été 2026 vue depuis la promenade du Peyrou à Montpellier.
   On arrive devant l'Arc de Triomphe ; au bout de la promenade, le château d'eau et l'aqueduc
   Saint-Clément, et le Soleil couchant qui se fait grignoter par la Lune juste au-dessus.
   Problème : pas de lunettes ! Il faut se faufiler dans la foule et demander aux gens…
   Un vieux monsieur à la canne a une deuxième paire : cinématique (on enfile les lunettes,
   on voit le croissant orange, puis la totalité : couronne, étoiles, lampadaires qui s'allument). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var X0 = -60, X1 = 58, ZB = 24.5;           // zone praticable de la promenade
  var BAS = -8;                                // niveau de la ville en contrebas
  var AZ = 287 * Math.PI / 180, ALT = 13 * Math.PI / 180;
  var SOLEIL = new THREE.Vector3(Math.sin(AZ) * Math.cos(ALT), Math.sin(ALT), -Math.cos(AZ) * Math.cos(ALT)); // ouest, un peu au nord
  var DS = 700, RS = DS * Math.tan(1.4 * Math.PI / 180); // Soleil (taille apparente exagérée pour le jeu)
  var P0 = 0.6, ATTENTE = 0.93;               // avancement de l'éclipse : départ, et palier en attendant les lunettes
  var JOUR = { haut: '#5a7cc4', bas: '#ffcf9a', brouillard: '#f2cfa6' };
  var NUIT = { haut: '#070b22', bas: '#d8743a', brouillard: '#2c2638' };
  var CIEL = { haut: JOUR.haut, bas: JOUR.bas, brouillard: JOUR.brouillard, hemi: ['#ffe2c4', '#6a5a5a', 0.8], soleil: ['#ffcf98', 1.0, [SOLEIL.x * 40, SOLEIL.y * 40, SOLEIL.z * 40]] };

  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function au_hasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  // fraction du disque solaire (rayon 1) cachée par la Lune (rayon 1.03) à la distance d
  function couverture(d) {
    var r1 = 1, r2 = 1.03; d = Math.abs(d);
    if (d >= r1 + r2) return 0;
    if (d <= r2 - r1) return 1;
    var a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)) + r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
      - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
    return Math.min(1, a / Math.PI);
  }

  // ---------- Outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function cube(F, x, y0, z, w, h, d, rot, col) {
    var b = new THREE.Mesh(AV.facettes(new THREE.BoxGeometry(w, h, d)), matT);
    matT.color.set(col); b.position.set(x, y0 + h / 2, z); b.rotation.y = rot || 0;
    F.ajouter(b); b.geometry.dispose();
  }
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(0, ry || 0, 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function textureGravier() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d'); x.fillStyle = '#d9c9a2'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 2600; i++) {
      var v = 170 + Math.floor(Math.random() * 60);
      x.fillStyle = 'rgba(' + v + ',' + Math.floor(v * 0.9) + ',' + Math.floor(v * 0.72) + ',.6)';
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 14);
    return t;
  }
  function textureCouronne() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var x = c.getContext('2d'), m = 256;
    var g = x.createRadialGradient(m, m, 30, m, m, 256);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.16, 'rgba(240,245,255,.95)'); g.addColorStop(0.3, 'rgba(200,215,255,.35)');
    g.addColorStop(0.6, 'rgba(160,180,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 90; i++) { // jets de la couronne
      var a = Math.random() * Math.PI * 2, l = 60 + Math.pow(Math.random(), 2) * 190, w = 2 + Math.random() * 7;
      var gr = x.createLinearGradient(m, m, m + Math.cos(a) * (40 + l), m + Math.sin(a) * (40 + l));
      gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.strokeStyle = gr; x.lineWidth = w; x.beginPath(); x.moveTo(m + Math.cos(a) * 36, m + Math.sin(a) * 36);
      x.quadraticCurveTo(m + Math.cos(a + 0.06) * (40 + l * 0.5), m + Math.sin(a + 0.06) * (40 + l * 0.5), m + Math.cos(a) * (40 + l), m + Math.sin(a) * (40 + l)); x.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  // ---------- Les gens de la foule (géométries partagées) ----------
  var GEO = null;
  function geos() {
    if (GEO) return GEO;
    var F = AV.facettes;
    GEO = {
      jambe: F(new THREE.BoxGeometry(0.15, 0.8, 0.17)), torse: F(new THREE.CylinderGeometry(0.19, 0.24, 0.62, 7)), jupe: F(new THREE.CylinderGeometry(0.2, 0.33, 0.5, 7)),
      tete: F(new THREE.IcosahedronGeometry(0.17, 1)), cheveux: F(new THREE.SphereGeometry(0.182, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      longs: F(new THREE.BoxGeometry(0.32, 0.42, 0.12)), bras: F(new THREE.CylinderGeometry(0.06, 0.055, 0.6, 5)), main: F(new THREE.IcosahedronGeometry(0.06, 0)),
      oeil: F(new THREE.SphereGeometry(0.025, 5, 4)), lentilles: F(new THREE.BoxGeometry(0.27, 0.075, 0.03)), monture: F(new THREE.BoxGeometry(0.31, 0.11, 0.015)),
      casquette: F(new THREE.CylinderGeometry(0.185, 0.19, 0.08, 8)), visiere: F(new THREE.BoxGeometry(0.2, 0.02, 0.14)),
      bord: F(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 10)), calotte: F(new THREE.CylinderGeometry(0.15, 0.17, 0.13, 8)),
      canne: F(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5)), tel: F(new THREE.BoxGeometry(0.08, 0.15, 0.015)),
      passoire: F(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), moustache: F(new THREE.BoxGeometry(0.13, 0.03, 0.03)),
      sac: F(new THREE.BoxGeometry(0.3, 0.38, 0.14))
    };
    return GEO;
  }
  function piece(geo, col) { return new THREE.Mesh(geo, AV.mat(col)); }
  function lunettes() {
    var l = new THREE.Group(), g = geos();
    l.add(piece(g.monture, '#f4efe2'));
    var v = piece(g.lentilles, '#111111'); v.position.z = 0.009; l.add(v);
    return l;
  }
  function personne(o) {
    var g = geos(), racine = new THREE.Group(), corps = new THREE.Group(); racine.add(corps);
    [-1, 1].forEach(function (c) { var j = piece(g.jambe, o.bas); j.position.set(c * 0.1, 0.4, 0); corps.add(j); });
    if (o.jupe) { var ju = piece(g.jupe, o.bas); ju.position.y = 0.72; corps.add(ju); }
    var t = piece(g.torse, o.haut); t.position.y = 1.11; corps.add(t);
    if (o.sac) { var s = piece(g.sac, o.sac); s.position.set(0, 1.12, -0.24); corps.add(s); }
    var tete = new THREE.Group(); tete.position.y = 1.6; corps.add(tete);
    tete.add(piece(g.tete, o.peau));
    var ch = piece(g.cheveux, o.cheveux); ch.rotation.x = -0.4; ch.position.y = 0.012; tete.add(ch);
    if (o.longs) { var lg = piece(g.longs, o.cheveux); lg.position.set(0, -0.12, -0.11); tete.add(lg); }
    [-1, 1].forEach(function (c) { var oe = piece(g.oeil, '#2b2340'); oe.position.set(c * 0.06, 0.03, 0.152); tete.add(oe); });
    if (o.moustache) { var mo = piece(g.moustache, o.moustache); mo.position.set(0, -0.045, 0.16); tete.add(mo); }
    if (o.casquette) {
      var ca = piece(g.casquette, o.casquette); ca.position.y = 0.12; tete.add(ca);
      var vi = piece(g.visiere, o.casquette); vi.position.set(0, 0.09, 0.2); tete.add(vi);
    }
    if (o.chapeau) {
      var bo = piece(g.bord, o.chapeau); bo.position.y = 0.12; tete.add(bo);
      var cl = piece(g.calotte, o.chapeau); cl.position.y = 0.19; tete.add(cl);
    }
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux, chapeau: !!(o.casquette || o.chapeau) });
    var lun = null;
    if (o.lunettes) { lun = lunettes(); lun.position.set(0, 0.035, 0.168); tete.add(lun); }
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.27, 1.38, 0); b.rotation.z = c * 0.08; corps.add(b);
      var m = piece(g.bras, o.haut); m.position.y = -0.3; b.add(m);
      var mn = piece(g.main, o.peau); mn.position.y = -0.62; b.add(mn);
      bras.push(b);
    });
    var objet = null;
    if (o.tel) { objet = piece(g.tel, '#1d1d24'); objet.position.set(0, -0.68, 0.05); bras[1].add(objet); }
    if (o.passoire) { objet = piece(g.passoire, '#c8ccd4'); objet.rotation.x = Math.PI; objet.position.set(0, -0.72, 0); bras[1].add(objet); }
    if (o.enfant) racine.scale.setScalar(0.62);
    return { groupe: racine, corps: corps, tete: tete, bras: bras, lunettes: lun };
  }

  // ---------- Les lunettes en carton, vues de l'intérieur (calque HTML) ----------
  function calqueLunettes() {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;transform:translateY(-115%);transition:transform 1.1s cubic-bezier(.3,.9,.4,1);';
    d.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<path fill-rule="evenodd" fill="#f3efe4" d="M-400,-300 H560 V400 H-400 Z M26,52 a26,21 0 1,0 52,0 a26,21 0 1,0 -52,0 Z M82,52 a26,21 0 1,0 52,0 a26,21 0 1,0 -52,0 Z"/>' +
      '<ellipse cx="52" cy="52" rx="26" ry="21" fill="none" stroke="#151515" stroke-width="2.4"/>' +
      '<ellipse cx="108" cy="52" rx="26" ry="21" fill="none" stroke="#151515" stroke-width="2.4"/>' +
      '<text x="80" y="23" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="7" fill="#e0602a">☀ ÉCLIPSE 2026 ☀</text>' +
      '<text x="80" y="88" text-anchor="middle" font-family="Nunito,sans-serif" font-size="3.4" fill="#8a8578">Ne jamais regarder le Soleil sans ces lunettes · ISO 12312-2</text>' +
      '<path d="M75,64 q5,-7 10,0" fill="none" stroke="#c9c2b0" stroke-width="1.2"/></svg>';
    document.body.appendChild(d);
    return d;
  }

  // =====================================================================
  AV.biomes.peyrou = function (cfg) {
    var rng = AV.rng(5005 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    function hauteur(x, z) { return (x > -64 && x < 74 && Math.abs(z) < 27) ? 0 : BAS; }
    var mo = new AV.Monde({
      rayon: 90, hauteur: hauteur, surface: 'sable', ciel: CIEL, brouillard: [90, 1100],
      depart: { x: 48, z: 0, angle: -Math.PI / 2 }, theme: 'peyrou', ambiance: 'foule',
      autorise: function (x, z) { return x > X0 && x < X1 && Math.abs(z) < ZB; }
    });
    mo.loin = 1600;
    mo.sansAnimal = true;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe, cielM = G.children[G.children.length - 1];
    var etoiles = AV.etoiles(450, 380); etoiles.material.opacity = 0; etoiles.visible = false; G.add(etoiles);

    // ---------- La ville en contrebas, la promenade surélevée ----------
    G.add(AV.terrain(1600, 80, function () { return BAS; }, function (x, z) {
      var h = Math.sin(x * 0.05) * Math.cos(z * 0.06);
      return AV.outils.varier(h > 0.3 ? '#9a9a6a' : '#c2ae8c', x, z, 0.1);
    }));
    var V = new AV.Fusion();
    for (var b = 0; b < 1400; b++) {
      var r = 40 + Math.pow(rng(), 1.3) * 650, a = rng() * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (x > -80 && x < 90 && Math.abs(z) < 38) continue;                    // la promenade et ses abords
      if (x < -75 && Math.abs(z) < 16) continue;                               // l'aqueduc
      if (x > 70 && Math.abs(z) < 7) continue;                                 // la rue Foch
      var w = AV.entre(rng, 9, 20), d = AV.entre(rng, 9, 18), h = AV.entre(rng, 9, 19) * (r > 350 ? 0.7 : 1), rot = (rng() - 0.5) * 0.5;
      cube(V, x, BAS, z, w, h, d, rot, AV.choisir(rng, ['#e8d6b4', '#dcc59c', '#efe0c2', '#d6bf98', '#e4cfa8']));
      cube(V, x, BAS + h, z, w * 0.94, 1.6, d * 0.94, rot, AV.choisir(rng, ['#c8724a', '#b8623e', '#d0845a']));
    }
    // platanes des terrasses basses, de part et d'autre de la promenade
    for (var xt = -55; xt <= 65; xt += 9) {
      [-1, 1].forEach(function (c) {
        var zt = c * AV.entre(rng, 31, 35);
        forme(V, new THREE.CylinderGeometry(0.4, 0.6, 9, 6), '#8a7a62', xt, BAS + 4.5, zt);
        forme(V, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#6f8a4e', '#7d9658', '#86a05e']), xt + (rng() - 0.5) * 2, BAS + 11, zt, rng() * 3, AV.entre(rng, 5, 6.5), AV.entre(rng, 3.5, 4.5), AV.entre(rng, 5, 6.5));
      });
    }
    // collines de garrigue à l'horizon ouest
    for (var co = 0; co < 16; co++) {
      var ac = -Math.PI / 2 + (co / 15 - 0.5) * 2.4, dc = AV.entre(rng, 900, 1150);
      forme(V, new THREE.IcosahedronGeometry(1, 1), AV.choisir(rng, ['#9c8a8a', '#a49090', '#94848c']), Math.sin(ac) * dc, BAS - 10, Math.cos(ac) * dc, rng() * 3, AV.entre(rng, 140, 260), AV.entre(rng, 40, 80), AV.entre(rng, 100, 160));
    }
    var villeM = V.maille(); villeM.castShadow = false; G.add(villeM);

    var P = new AV.Fusion(), pierre = '#e4d3ae', pierre2 = '#efe2c4';
    cube(P, 5, BAS, 0, 138, -BAS - 0.02, 54, 0, '#d8c49c');                    // mur de soutènement de la promenade
    // balustrades (bords nord et sud, extrémité ouest)
    function balustrade(xa, za, xb, zb) {
      var L = Math.hypot(xb - xa, zb - za), rot = Math.atan2(xb - xa, zb - za), n = Math.floor(L / 0.42);
      cube(P, (xa + xb) / 2, 0, (za + zb) / 2, 0.5, 0.18, L, rot, pierre);
      cube(P, (xa + xb) / 2, 0.92, (za + zb) / 2, 0.55, 0.14, L, rot, pierre2);
      for (var i = 0; i <= n; i++) {
        var k = i / n, bx = xa + (xb - xa) * k, bz = za + (zb - za) * k;
        if (i % 12 === 0) cube(P, bx, 0, bz, 0.5, 0.95, 0.5, rot, pierre2);   // piliers
        else forme(P, new THREE.CylinderGeometry(0.08, 0.11, 0.74, 5), pierre, bx, 0.55, bz);
      }
    }
    balustrade(-62, -26, 60, -26); balustrade(-62, 26, 60, 26); balustrade(-62, -26, -62, 26);
    mo.colliders.push({ rect: true, x: 0, z: -26, hx: 62, hz: 0.4, a: 0 }, { rect: true, x: 0, z: 26, hx: 62, hz: 0.4, a: 0 }, { rect: true, x: -62, z: 0, hx: 0.4, hz: 26, a: 0 });
    // pelouses
    [[-52, -6], [6, 48]].forEach(function (px) {
      [-1, 1].forEach(function (c) { cube(P, (px[0] + px[1]) / 2, 0, c * 12.5, px[1] - px[0], 0.05, 7, 0, '#7f9a52'); cube(P, (px[0] + px[1]) / 2, 0, c * 12.5, px[1] - px[0] + 0.3, 0.02, 7.3, 0, '#ece2c8'); });
    });

    // ---------- La statue équestre de Louis XIV ----------
    cube(P, 0, 0, 0, 4.2, 0.5, 5.2, 0, pierre2);
    cube(P, 0, 0.5, 0, 3.2, 4.2, 4.2, 0, pierre);
    cube(P, 0, 4.7, 0, 3.6, 0.4, 4.6, 0, pierre2);
    var bronze = '#3e4a3c';
    cube(P, 0, 6.3, 0, 1.1, 1.0, 2.6, 0, bronze);                               // le cheval
    forme(P, new THREE.CylinderGeometry(0.28, 0.35, 1.3, 6), bronze, 0, 7.4, 1.3, 0, 1, 1, 1);
    cube(P, 0, 7.6, 1.6, 0.5, 0.6, 0.9, 0, bronze);
    [[-0.4, 0.9], [0.4, 0.9], [-0.4, -0.9], [0.4, -0.9]].forEach(function (j, i) { cube(P, j[0], 5.1, j[1], 0.22, i < 2 ? 1.3 : 1.2, 0.22, 0, bronze); });
    cube(P, 0, 7.3, -0.1, 0.6, 0.9, 0.5, 0, bronze);                            // le roi
    forme(P, new THREE.IcosahedronGeometry(0.25, 0), bronze, 0, 8.45, -0.05, 0, 1, 1.15, 1);
    forme(P, new THREE.ConeGeometry(0.2, 0.9, 5), bronze, 0, 6.5, -1.5, 0, 1, 1, 1);
    for (var gr = 0; gr < 36; gr++) {                                           // grille autour du socle
      var ag = gr / 36 * Math.PI * 2;
      cube(P, Math.sin(ag) * 3.9, 0, Math.cos(ag) * 4.4, 0.06, 1.1, 0.06, 0, '#2c2f2c');
    }
    mo.colliders.push({ rect: true, x: 0, z: 0, hx: 3.9, hz: 4.4, a: 0 });

    // ---------- L'Arc de Triomphe (côté ville) ----------
    var AX = 66, arc = '#e6d6b4';
    [-1, 1].forEach(function (c) {
      cube(P, AX, 0, c * 6.75, 8, 12, 6.5, 0, arc);
      cube(P, AX - 4.05, 2.5, c * 6.75, 0.1, 5, 3.6, 0, '#d4c29c');             // bas-reliefs
    });
    cube(P, AX, 9.5, 0, 8, 2.5, 7, 0, arc);
    cube(P, AX, 12, 0, 8.6, 0.6, 21, 0, pierre2);
    cube(P, AX, 12.6, 0, 8, 3.6, 20, 0, arc);
    cube(P, AX - 4.05, 13.4, 0, 0.1, 1.6, 9, 0, '#c9b58e');                      // inscription
    cube(P, AX, 16.2, 0, 8.6, 0.5, 20.6, 0, pierre2);
    mo.colliders.push({ rect: true, x: 61, z: 0, hx: 1.2, hz: 10, a: 0 });

    // ---------- Le château d'eau et l'aqueduc Saint-Clément ----------
    var CX = -73;
    forme(P, new THREE.CylinderGeometry(8.5, 9, -BAS + 2.5, 6), pierre, CX, (BAS + 2.5) / 2, 0, Math.PI / 6, 1, 1, 1);
    for (var k = 0; k < 12; k++) {
      var ak = k / 12 * Math.PI * 2 + Math.PI / 12, rk = 6.6;
      forme(P, new THREE.CylinderGeometry(0.42, 0.46, 8, 8), pierre2, CX + Math.sin(ak) * rk, 6.5, Math.cos(ak) * rk, 0, 1, 1, 1);
    }
    forme(P, new THREE.CylinderGeometry(4.6, 4.6, 8, 6), '#cbb894', CX, 6.5, 0, Math.PI / 6, 1, 1, 1);  // la cella
    forme(P, new THREE.CylinderGeometry(7.6, 7.6, 1.6, 6), pierre2, CX, 11.3, 0, Math.PI / 6, 1, 1, 1);
    forme(P, new THREE.CylinderGeometry(4.5, 7.4, 2.2, 6), '#cdb98f', CX, 13.2, 0, Math.PI / 6, 1, 1, 1);
    forme(P, new THREE.CylinderGeometry(1.2, 2.2, 1.4, 6), pierre2, CX, 15, 0, Math.PI / 6, 1, 1, 1);
    for (var e = 0; e < 3; e++) cube(P, CX + 9 + e * 1.2, BAS, 0, 1.4, -BAS + 2.5 - e * 0.9, 16, 0, pierre2); // escaliers vers la promenade
    for (var q = 0; q < 46; q++) {
      var ax = CX - 12 - q * 8, az = q * 1.2;
      cube(P, ax, BAS, az, 2.4, 14.5, 3.2, 0.15, '#dccba6');                    // piles
      cube(P, ax - 4, BAS + 10.5, az + 0.6, 8.2, 4, 3.2, 0.15, '#dccba6');       // arches basses
      cube(P, ax - 4, BAS + 14.5, az + 0.6, 1.4, 5.5, 2.6, 0.15, '#dccba6');     // arcades hautes
      cube(P, ax, BAS + 18, az, 8.3, 2.6, 2.8, 0.15, '#d4c39e');
      cube(P, ax, BAS + 20.6, az, 8.3, 0.6, 3.1, 0.15, '#e6d8b8');
    }
    var pierres = P.maille(); pierres.castShadow = true; pierres.receiveShadow = true; G.add(pierres);
    mo.bloqueurs.push(pierres);

    // gravier de la promenade
    var gravier = new THREE.Mesh(new THREE.PlaneGeometry(126, 52), new THREE.MeshLambertMaterial({ map: textureGravier() }));
    gravier.rotation.x = -Math.PI / 2; gravier.position.set(-1, 0.01, 0); gravier.receiveShadow = true; G.add(gravier);

    // lampadaires (s'allument tout seuls pendant la totalité !)
    var matLampe = new THREE.MeshLambertMaterial({ color: '#fff2c8', emissive: '#ffcf7a', emissiveIntensity: 0 });
    var L = new AV.Fusion();
    for (var xl = -50; xl <= 45; xl += 19) {
      [-1, 1].forEach(function (c) {
        var zl = c * 8.4;
        forme(L, new THREE.CylinderGeometry(0.07, 0.12, 3.6, 6), '#2f3a33', xl, 1.8, zl, 0, 1, 1, 1);
        forme(L, new THREE.ConeGeometry(0.32, 0.3, 6), '#2f3a33', xl, 4.25, zl, 0, 1, 1, 1);
        var lp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 0.34), matLampe); lp.position.set(xl, 3.85, zl); G.add(lp);
        mo.colliders.push({ x: xl, z: zl, r: 0.16 });
      });
    }
    G.add(L.maille());
    var lumLampes = [mo.lumiere('#ffc874', 0, 16, -30, 4, 0), mo.lumiere('#ffc874', 0, 16, 10, 4, 0), mo.lumiere('#ffc874', 0, 16, 40, 4, 0)];

    // ---------- Le Soleil, la Lune, la couronne ----------
    var astres = new THREE.Group(); G.add(astres);
    var soleil = new THREE.Mesh(new THREE.SphereGeometry(RS, 24, 16), new THREE.MeshBasicMaterial({ color: '#fffbe8', fog: false }));
    soleil.position.copy(SOLEIL).multiplyScalar(DS); astres.add(soleil);
    var lune = new THREE.Mesh(new THREE.SphereGeometry(RS * 1.03 * 690 / DS, 24, 16), new THREE.MeshBasicMaterial({ color: '#000000', fog: false }));
    astres.add(lune);
    var eblouit = AV.halo('#fff6d8', RS * 9); eblouit.material.fog = false; eblouit.position.copy(SOLEIL).multiplyScalar(680); astres.add(eblouit);
    var eblouit2 = AV.halo('#ffc890', RS * 26); eblouit2.material.fog = false; eblouit2.material.opacity = 0.35; eblouit2.position.copy(SOLEIL).multiplyScalar(685); astres.add(eblouit2);
    var couronne = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureCouronne(), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    couronne.scale.set(RS * 7.5, RS * 7.5, 1); couronne.position.copy(SOLEIL).multiplyScalar(705); astres.add(couronne);
    var diamant = AV.halo('#ffffff', RS * 3); diamant.material.fog = false; diamant.material.opacity = 0; astres.add(diamant);
    var droite = new THREE.Vector3().crossVectors(SOLEIL, new THREE.Vector3(0, 1, 0)).normalize();
    var hautS = new THREE.Vector3().crossVectors(droite, SOLEIL).normalize();
    var dirLune = droite.clone().multiplyScalar(0.6).addScaledVector(hautS, 0.8).normalize();

    var p = P0, cov = 0, k = 1, filtreOn = false;
    function majAstres() {
      var sep = 2.03 * (1 - p);
      cov = couverture(sep);
      lune.position.copy(SOLEIL).multiplyScalar(690).addScaledVector(dirLune, sep * RS * 690 / DS);
      var u = 1 - cov;
      k = cov >= 0.9999 ? 0.13 : 0.13 + 0.87 * lisse(0, 0.16, u);
      eblouit.material.opacity = filtreOn ? 0 : Math.pow(u, 0.35) * 0.95;
      eblouit2.material.opacity = filtreOn ? 0 : Math.pow(u, 0.5) * 0.35;
      eblouit.scale.setScalar(RS * (4 + 7 * Math.pow(u, 0.4)));
      couronne.material.opacity = filtreOn ? 0 : lisse(0.994, 1, cov);
      var dmd = cov > 0.975 && cov < 0.9999 ? Math.sin(lisse(0.975, 0.9999, cov) * Math.PI) : 0;
      diamant.material.opacity = dmd * (filtreOn ? 0.5 : 1);
      diamant.position.copy(SOLEIL).multiplyScalar(680).addScaledVector(dirLune, -Math.sign(sep || 1) * RS * 0.98);
      diamant.scale.setScalar(RS * (1.5 + dmd * 4));
      soleil.material.color.set(filtreOn ? '#ff8a2a' : '#fffbe8');
      // la Lune est invisible sur le ciel de jour : elle n'apparaît noire qu'à travers les lunettes ou à la totalité
      if (filtreOn || cov > 0.995) lune.material.color.set('#000000');
      else lune.material.color.copy(cielM.material.uniforms.bas.value).lerp(new THREE.Color('#fff0d0'), 0.45);
    }

    // ---------- La foule ----------
    var gens = [], dejaDemande = 0;
    var LABELS = { dame: 'Une dame', monsieur: 'Un monsieur', etudiante: 'Une étudiante', touriste: 'Un touriste', enfant: 'Un enfant', maman: 'Une maman', ado: 'Un ado' };
    var REP_LUNETTES = [
      'Désolée, on n\'a qu\'une paire pour deux… 😕', 'Ah non, je les lâche pas, ça commence ! 😎', 'Je les ai achetées il y a trois mois, moi ! 😏',
      'Sorry, only one pair! 🇬🇧', 'Elles sont à ma fille, désolée…', 'On se les passe à quatre, là… 😅', 'Juste deux secondes… bon, non, en fait ! 😄'
    ];
    var REP_SANS = [
      'Moi non plus j\'en ai pas… 😅', 'Tout était en rupture, même à la pharmacie !', 'Je regarde avec mon téléphone, ça marche pas trop… 📱',
      'Regarde par terre à l\'ombre des arbres : plein de petits croissants ! 🌘', 'Il paraît qu\'on peut regarder dans une passoire… 🥣', 'J\'ai oublié les miennes à la maison… 🤦'
    ];
    var REP_INDICE = [
      'Le vieux monsieur à la casquette, sur la pelouse côté droit, il avait deux paires !', 'Demande au papy avec la canne, vers la pelouse de droite, il en a une en rab 😉',
      'J\'ai vu un monsieur avec une canne qui en avait deux, entre la statue et le château d\'eau, côté droit !'
    ];
    var peaux = ['#f2c9a0', '#eec29a', '#e0ad84', '#c98f62', '#8d5a3b', '#f6d3b0'], cheveux = ['#2b1d14', '#5a3420', '#8a5a2a', '#d9b26a', '#1a1a1a', '#a0a0a0', '#c46a3a'];
    var hauts = ['#e07a9a', '#4a7bd1', '#f3c34b', '#3f8f6b', '#ffffff', '#d94a4a', '#7a5ac8', '#4ab0c8', '#f08a4a', '#2b2b38'];
    var bass = ['#3b3550', '#2f3b52', '#c8b48a', '#4a4a58', '#5a7ab0', '#e8e2d4'];
    function libre(x, z, dmin) {
      if (Math.abs(x) < 5.5 && Math.abs(z) < 6) return false;
      for (var i = 0; i < gens.length; i++) { var g = gens[i], dx = g.x - x, dz = g.z - z; if (dx * dx + dz * dz < dmin * dmin) return false; }
      for (var c = 0; c < mo.colliders.length; c++) { var cc = mo.colliders[c]; if (!cc.rect && Math.hypot(cc.x - x, cc.z - z) < cc.r + 0.6) return false; }
      return true;
    }
    function ajouterPersonne(o, x, z, rot, info) {
      var pe = personne(o); pe.groupe.position.set(x, 0, z); pe.groupe.rotation.y = rot; G.add(pe.groupe);
      var col = { x: x, z: z, r: o.enfant ? 0.2 : 0.28 }; mo.colliders.push(col);
      var g = Object.assign(pe, { x: x, z: z, rot0: rot, rot: rot, phase: rng() * 10, tourne: 0, reponse: null, o: o }, info);
      gens.push(g);
      return g;
    }
    function versOuest(x, z) { // regarder le Soleil
      var dx = SOLEIL.x * 500 - x, dz = SOLEIL.z * 500 - z;
      return Math.atan2(dx, dz) + (rng() - 0.5) * 0.4;
    }
    // le vieux monsieur à la canne (en premier, pour lui garder sa place)
    var vieux = ajouterPersonne({ peau: '#eec2a0', cheveux: '#e8e8e8', haut: '#c8b48a', bas: '#6a6a70', casquette: '#6b6660', moustache: '#f0f0f0', lunettes: true },
      -30, -14.5, versOuest(-30, -14.5), { label: 'Un vieux monsieur à la canne', vieux: true });
    vieux.corps.rotation.x = 0.12;
    var canne = piece(geos().canne, '#4a3424'); canne.position.set(0, -1.08, 0.08); vieux.bras[1].add(canne);
    vieux.bras[1].rotation.x = -0.18;
    var paire = lunettes(); paire.position.set(0, -0.68, 0.06); paire.rotation.set(-1.2, 0, 0); vieux.bras[0].add(paire);
    vieux.bras[0].rotation.x = -0.7;
    // lui : il la suit partout dans la foule (téléphone à la main pour filmer l'éclipse)
    var lui = ajouterPersonne({ qui: 'axel', peau: '#eec29a', cheveux: '#2b1d14', haut: '#4a7bd1', bas: '#2f3b52', tel: true },
      42, -2.6, versOuest(42, -2.6), { label: nomLui, copain: true });
    lui.bras[1].rotation.x = -2.1;
    mo.colliders.splice(mo.colliders.length - 1, 1); // pas de collision avec lui : il ne doit pas la bloquer dans la foule
    var tParle = 8, REM_LUI = ['Je te suis ! Demande à quelqu\'un qui a des lunettes 😅', 'Ça commence à faire sombre… 😱', 'Là-bas, ils ont tous des lunettes !',
      'J\'aurais dû en acheter… 🙈', 'Je filme pour nous deux 📱', 'Excusez-nous… pardon… 🙏', 'Regarde, il ne reste qu\'un croissant ! 🌘'];
    function suivre(dt, t, j) {
      var dx = j.x - lui.x, dz = j.z - lui.z, d = Math.hypot(dx, dz), v = 0;
      if (d > 1.9) {
        v = Math.min(d > 6 ? 5.5 : 2.8, (d - 1.6) * 3);
        var ux = dx / d, uz = dz / d, nx = lui.x + ux * v * dt, nz = lui.z + uz * v * dt;
        // il se faufile : il s'écarte des gens qu'il frôle
        for (var i = 0; i < gens.length; i++) {
          var g = gens[i]; if (g === lui) continue;
          var ex = nx - g.x, ez = nz - g.z, e2 = ex * ex + ez * ez;
          if (e2 < 0.42 && e2 > 1e-6) { var e = Math.sqrt(e2); nx += ex / e * (0.65 - e) * 0.8; nz += ez / e * (0.65 - e) * 0.8; }
        }
        lui.x = Math.max(X0 + 0.5, Math.min(X1 - 0.5, nx)); lui.z = Math.max(-ZB + 0.5, Math.min(ZB - 0.5, nz));
        lui.rot0 = Math.atan2(ux, uz);
      } else if (lui.tourne <= 0) lui.rot0 = Math.atan2(dx, dz);
      var k2 = Math.min(1, v / 2);
      lui.groupe.position.set(lui.x, Math.abs(Math.sin(t * 9)) * 0.06 * k2, lui.z);
      lui.bras[0].rotation.x = Math.sin(t * 9) * 0.55 * k2;
      tParle -= dt;
      if (tParle <= 0 && d < 6) { tParle = 12 + Math.random() * 6; bulle(lui, au_hasard(REM_LUI), 3); }
    }
    // tout le monde, plus serré vers le château d'eau
    var essais = 0;
    // 1,4 m entre deux personnes : ça passe toujours, mais de justesse (il faut se faufiler)
    while (gens.length < 125 && essais++ < 5000) {
      var xg = X0 + 3 + Math.pow(rng(), 1.8) * 85, zg = (rng() * 2 - 1) * (ZB - 1.5);
      if (!libre(xg, zg, 1.4)) continue;
      var t = rng(), sorte = t < 0.12 ? 'enfant' : AV.choisir(rng, ['dame', 'monsieur', 'etudiante', 'touriste', 'maman', 'ado', 'monsieur', 'dame']);
      var femme = sorte === 'dame' || sorte === 'etudiante' || sorte === 'maman' || (sorte === 'enfant' && rng() < 0.5);
      var avecLunettes = rng() < 0.55;
      var o = {
        peau: AV.choisir(rng, peaux), cheveux: AV.choisir(rng, cheveux), haut: AV.choisir(rng, hauts), bas: AV.choisir(rng, bass),
        longs: femme && rng() < 0.75, jupe: femme && rng() < 0.4, lunettes: avecLunettes, enfant: sorte === 'enfant',
        casquette: !femme && rng() < 0.25 ? AV.choisir(rng, ['#d94a4a', '#2f3b52', '#f3efe4']) : null,
        chapeau: femme && rng() < 0.25 ? AV.choisir(rng, ['#e8d8a8', '#f4efe4', '#c8a070']) : null,
        tel: !avecLunettes && rng() < 0.5, passoire: !avecLunettes && rng() < 0.08,
        sac: sorte === 'touriste' ? '#3a5a7a' : null
      };
      if (o.passoire) o.tel = false;
      var g = ajouterPersonne(o, xg, zg, versOuest(xg, zg), { label: LABELS[sorte], pointe: !o.tel && rng() < 0.15 });
      if (o.tel) g.bras[1].rotation.x = -2.15;
      if (o.passoire) g.bras[1].rotation.x = -1.3;
    }
    var IDX = gens.length;

    // ---------- Bulles de dialogue ----------
    var bulles = [];
    function bulle(g, texte, vie) {
      var s = AV.bulleBD(texte);
      s.position.set(g.x, (g.o.enfant ? 1.5 : 2.4), g.z); s.userData.vie = vie || 3.2; G.add(s); bulles.push(s);
    }

    // ---------- Demander des lunettes ----------
    var api = null, scen = null, horloge = 0, majTitre = 0, prochainPsst = 0;
    var proche = { x: 1e6, z: 1e6, rayon: 1.9, texte: '', fn: null, cible: null };
    mo.interactifs.push(proche);
    function demander(g) {
      if (scen) return;
      g.tourne = 3.5;
      if (g.vieux) { if (api) api.trouver(); return; }
      if (g.copain) {
        var l = au_hasard(['Vite, trouve des lunettes, je te suis ! 😅', 'Alors, t\'as trouvé ? Ça commence ! ☀️', 'Demande aux gens vers le château d\'eau, il y a plus de monde !']);
        g.reponse = l; bulle(g, l); return;
      }
      if (!g.reponse) {
        dejaDemande++;
        if (g.lunettes) g.reponse = REP_LUNETTES[(gens.indexOf(g) + dejaDemande) % REP_LUNETTES.length];
        else if (dejaDemande >= 3 && Math.random() < 0.6) g.reponse = au_hasard(REP_INDICE);
        else g.reponse = REP_SANS[(gens.indexOf(g) + dejaDemande) % REP_SANS.length];
      }
      bulle(g, g.reponse);
    }

    mo.debut = function (a) { api = a; };
    mo.astuce = function () {
      if (scen) return null;
      if (horloge < 14) return '🕶️ Oups… pas de lunettes ! Faufile-toi dans la foule et demande aux gens de t\'en prêter une paire !';
      if (p >= ATTENTE && Math.sin(horloge * 0.8) > 0.3) return '☀️ La totalité approche ! Vite, il te faut des lunettes !';
      return null;
    };

    // ---------- Animation ----------
    mo.anime(function (dt, t, j) {
      horloge += dt;
      var acc = api && api.test ? 4 : 1;
      if (!scen) p = Math.min(ATTENTE, p + dt * acc * (ATTENTE - P0) / 150);
      majAstres();

      // lumière, ciel, étoiles, lampadaires selon l'obscurité
      var nuit = (1 - k) / 0.87;
      if (api && !filtreOn) {
        api.eclairage(k);
        var u = cielM.material.uniforms;
        u.haut.value.set(JOUR.haut).lerp(new THREE.Color(NUIT.haut), nuit);
        u.bas.value.set(JOUR.bas).lerp(new THREE.Color(NUIT.bas), Math.min(1, nuit * 1.2));
        if (api.scene.fog) api.scene.fog.color.set(JOUR.brouillard).lerp(new THREE.Color(NUIT.brouillard), nuit);
      }
      etoiles.visible = nuit > 0.55 && !filtreOn;
      etoiles.material.opacity = lisse(0.55, 0.95, nuit) * 0.9;
      matLampe.emissiveIntensity = AV.lerp(matLampe.emissiveIntensity, nuit > 0.6 ? 1 : 0, Math.min(1, dt * 1.5));
      lumLampes.forEach(function (l) { l.intensity = matLampe.emissiveIntensity * 0.9; });

      if (!scen) suivre(dt, t, j);
      // la foule
      var totalite = cov > 0.999;
      var meilleur = null, dMin = 1.9 * 1.9;
      for (var i = 0; i < gens.length; i++) {
        var g = gens[i], ph = t * 0.9 + g.phase;
        if (g.tourne > 0) {
          g.tourne -= dt;
          g.rot = AV.angleLerp(g.rot, Math.atan2(j.x - g.x, j.z - g.z), Math.min(1, dt * 6));
        } else g.rot = AV.angleLerp(g.rot, g.rot0, Math.min(1, dt * 2));
        g.groupe.rotation.y = g.rot;
        g.tete.rotation.x = g.tourne > 0 ? 0 : -0.3 + Math.sin(ph * 0.7) * 0.05;
        g.corps.rotation.z = Math.sin(ph) * 0.02;
        if (totalite && !g.copain && !g.vieux) { // la foule s'émerveille : bras levés, lunettes enlevées
          if (g.lunettes) g.lunettes.visible = false;
          g.bras[0].rotation.x = AV.lerp(g.bras[0].rotation.x, -2.7 + Math.sin(ph * 5) * 0.2, Math.min(1, dt * 4));
          if (!g.o.tel) g.bras[1].rotation.x = AV.lerp(g.bras[1].rotation.x, -2.7 + Math.cos(ph * 5) * 0.2, Math.min(1, dt * 4));
        } else if (g.pointe) g.bras[1].rotation.x = AV.lerp(g.bras[1].rotation.x, Math.sin(ph * 0.4) > 0.6 ? -2.5 : 0, Math.min(1, dt * 3));
        if (g.o.enfant) g.groupe.position.y = totalite ? Math.abs(Math.sin(ph * 6)) * 0.2 : 0;
        var dx = g.x - j.x, dz = g.z - j.z, d2 = dx * dx + dz * dz;
        if (d2 < dMin && !(g.copain && d2 > 1.1)) { dMin = d2; meilleur = g; } // lui : seulement si on va vraiment vers lui
      }
      // l'interaction suit la personne la plus proche
      if (meilleur && !scen) {
        proche.x = meilleur.x; proche.z = meilleur.z;
        proche.texte = meilleur.reponse && !meilleur.copain ? '💬 <b>' + meilleur.label + '</b> : ' + meilleur.reponse
          : meilleur.vieux ? '🙋 <b>Un vieux monsieur à la canne</b> · ✋ Demander des lunettes'
          : meilleur.copain ? '💑 <b>' + nomLui + '</b> · ✋ Lui parler' : '🙋 <b>' + meilleur.label + '</b> · ✋ Demander des lunettes';
        proche.fn = (function (g) { return function () { demander(g); }; })(meilleur);
      } else { proche.x = proche.z = 1e6; }

      // indice : le vieux monsieur fait signe avec sa canne
      if (!scen) {
        var C = window.CONFIG || {};
        if (horloge * acc > (C.indiceApres || 120)) {
          prochainPsst -= dt;
          vieux.bras[1].rotation.x = AV.lerp(vieux.bras[1].rotation.x, Math.sin(t * 6) > 0 && prochainPsst > 3 ? -2.6 : -0.18, Math.min(1, dt * 5));
          if (prochainPsst <= 0) {
            prochainPsst = 7;
            bulle(vieux, au_hasard(['Psst ! Mademoiselle ! 👋', 'Par ici ! J\'en ai deux paires ! 🕶️', 'Hé ho ! Vous cherchez des lunettes ?']), 3);
            if (horloge * acc > (C.indiceChaudFroid || 240)) AV.audio.ping(0.6);
          }
        }
        majTitre -= dt;
        if (majTitre <= 0 && api) {
          majTitre = 0.5;
          api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '🌘 Éclipse : ' + Math.round(cov * 100) + ' % · trouve quelqu\'un qui peut te prêter des lunettes !');
        }
      }

      for (var bI = bulles.length - 1; bI >= 0; bI--) {
        var s = bulles[bI]; s.userData.vie -= dt; s.position.y += dt * 0.15;
        s.material.opacity = Math.min(1, s.userData.vie * 2);
        if (s.userData.vie <= 0) { G.remove(s); s.material.map.dispose(); s.material.dispose(); bulles.splice(bI, 1); }
      }
      if (scen) scenario(dt);
    });

    // ---------- Cinématique : les lunettes, puis la totalité ----------
    var calque = null, sauveFond = null, cachees = [];
    function filtre(on) {
      if (on === filtreOn) return;
      filtreOn = on;
      if (on) {
        cachees = [];
        G.children.forEach(function (c) { if (c !== astres && c.visible) { c.visible = false; cachees.push(c); } });
        sauveFond = api.scene.background; api.scene.background = new THREE.Color('#000000');
        api.eclairage(0);
      } else {
        cachees.forEach(function (c) { c.visible = true; }); cachees = [];
        if (sauveFond) api.scene.background = sauveFond;
      }
      majAstres();
    }
    function fov(v) { scen.fovCible = v; }

    mo.surTrouve = function (ctx) {
      scen = { ctx: ctx, t: 0, etape: 0, fov: ctx.camera.fov, fovCible: ctx.camera.fov };
      proche.x = proche.z = 1e6;
      vieux.tourne = 6;
      var jp = ctx.joueur, mx = (jp.x + vieux.x) / 2, mz = (jp.z + vieux.z) / 2;
      var ax = vieux.x - jp.x, az = vieux.z - jp.z, l = Math.hypot(ax, az) || 1;
      ctx.cinema({ pos: new THREE.Vector3(mx - az / l * 3.2 + ax / l * -1.2, 2.2, mz + ax / l * 3.2 + az / l * -1.2), cible: new THREE.Vector3(mx, 1.5, mz), vitesse: 2.2,
        texte: '👴 « Tenez, mademoiselle ! J\'ai toujours une paire en rab 😉 »' });
      ctx.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '🕶️ Le vieux monsieur te prête sa paire !');
    };
    function scenario(dt) {
      var S = scen, ctx = S.ctx, T = (S.t += dt), cam = ctx.camera, jp = ctx.joueur;
      if (Math.abs(cam.fov - S.fovCible) > 0.01) { cam.fov = AV.lerp(cam.fov, S.fovCible, Math.min(1, dt * 2.2)); cam.updateProjectionMatrix(); }
      // le monsieur tend les lunettes
      if (T < 2.6) vieux.bras[0].rotation.x = AV.lerp(vieux.bras[0].rotation.x, -1.5, Math.min(1, dt * 4));
      if (S.etape === 0 && T > 2.6) {
        S.etape = 1; paire.visible = false;
        AV.audio.sourdine(true);
        // vue subjective : on regarde le Soleil à travers le verre gauche des lunettes
        var oeil = new THREE.Vector3(jp.x + SOLEIL.x * 0.5, jp.y + 1.7, jp.z + SOLEIL.z * 0.5);
        var asp = cam.aspect, visW = asp >= 1.6 ? 160 : 100 * asp, sx = 2 * ((52 - (80 - visW / 2)) / visW) - 1;
        var demi = Math.tan(6.5 * Math.PI / 180) * asp, decal = Math.tan(Math.atan(-sx * demi));
        var cible = SOLEIL.clone().multiplyScalar(DS).addScaledVector(droite, DS * decal);
        S.vue = { pos: oeil, cible: cible, vitesse: 3, texte: '🕶️ On enfile les lunettes…' };
        ctx.cinema(S.vue);
        fov(13);
        calque = calqueLunettes();
      }
      if (S.etape === 1 && T > 3.0) { S.etape = 2; calque.style.transform = 'translateY(0)'; }
      if (S.etape === 2 && T > 4.1) { S.etape = 3; filtre(true); S.vue.texte = '😮 Ça y est, on la voit ! Il ne reste qu\'un tout petit croissant…'; }
      if (S.etape >= 3 && S.etape < 5) p = ATTENTE + (1 - ATTENTE) * Math.min(1, (T - 4.1) / 7.4);
      if (S.etape === 3 && T > 9.6) { S.etape = 4; S.vue.texte = '✨ La bague de diamant… plus que quelques secondes !'; }
      if (S.etape === 4 && T > 11.2) {
        S.etape = 5; p = 1;
        filtre(false);
        calque.style.transform = 'translateY(-115%)';
        AV.audio.acclamations();
        // lui la rejoint pour la totalité
        lui.x = jp.x - SOLEIL.z * 0.9; lui.z = jp.z + SOLEIL.x * 0.9;
        lui.groupe.position.set(lui.x, 0, lui.z); lui.rot0 = lui.rot = Math.atan2(SOLEIL.x, SOLEIL.z); lui.bras[1].rotation.x = 0; lui.tourne = 0;
        var arr = new THREE.Vector3(jp.x - SOLEIL.x * 6 + droite.x * 1.5, 1.4, jp.z - SOLEIL.z * 6 + droite.z * 1.5);
        S.tot = { pos: arr, cible: SOLEIL.clone().multiplyScalar(DS).setY(SOLEIL.y * DS * 0.72), vitesse: 1.6, texte: '🌑 Totalité ! On peut enlever les lunettes… 😍' };
        ctx.cinema(S.tot);
        fov(38);
      }
      if (S.etape === 5 && T > 15.5) { S.etape = 6; S.tot.texte = '👴 « Profitez-en, ça ne dure que deux minutes ! » ❤'; }
      if (S.etape === 6 && T > 20.5) {
        S.etape = 7;
        ctx.cinema(null); fov(60); AV.audio.sourdine(false);
        if (calque) { calque.remove(); calque = null; }
        var s = cfg.surprise, avecMedia = s && s.fichiers && s.fichiers.length;
        ctx.fin(avecMedia ? cfg : null);
        ctx.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '🌑 Totalité ! Merci monsieur ❤ · le bouton 🏠 te ramène au village');
      }
      // après la totalité, la Lune continue sa route et la lumière revient doucement
      if (S.etape >= 7 && T > 45) p = Math.min(1.35, p + dt * 0.35 / 90);
    }

    mo.portailRetour(52, 17);
    mo.nettoyer = function () { if (calque) { calque.remove(); calque = null; } };
    mo.debug = {
      etat: function () { return { p: p, cov: cov, k: k, demandes: dejaDemande, gens: IDX, scen: scen && { t: scen.t, etape: scen.etape } }; },
      versVieux: function () { return { x: vieux.x + 1.4, z: vieux.z + 0.4 }; },
      avancer: function (v) { p = v; }
    };
    return mo;
  };
})(window.AV);
