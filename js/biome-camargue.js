/* Biome « camargue » : parc ornithologique avec étangs, chevaux blancs, taureaux noirs
   et une grande colonie de flamants roses. L'animal (Edith la calopsite) est cachée au milieu
   des flamants, trop serrés pour passer : régulièrement, la colonie s'envole, fait un tour
   et se repose… juste le temps de courir jusqu'à elle. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var lisse = function (a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // îlots où la colonie (et Edith) se pose tour à tour ; le premier est la cachette de départ
  var SITES = [{ x: 0, z: -18 }, { x: -25, z: -8 }, { x: 25, z: -6 }];
  var E = SITES[0];
  var ETANGS = [   // étangs peu profonds : on peut y marcher
    { x: 0, z: -18, rx: 13, rz: 10, prof: -0.3 },
    { x: -25, z: -8, rx: 10, rz: 8, prof: -0.3 },
    { x: 25, z: -6, rx: 9, rz: 9.5, prof: -0.3 },
    { x: -18, z: 33, rx: 5.5, rz: 4, prof: -0.8 }
  ];
  var PONTON = { x0: -1.3, x1: 1.3, z0: -10.5, z1: -5 };
  var PRES = { chevaux: { x0: -30, x1: -8, z0: 8, z1: 24 }, taureaux: { x0: 8, x1: 30, z0: 8, z1: 24 } };
  var CHEMINS = [[[0, 40], [0, -5]], [[0, 0], [12, -4], [15, -24]], [[0, 4], [-15, -2]]];
  var CIEL = { haut: '#4f93e0', bas: '#fde7cf', brouillard: '#f3e3cf', hemi: ['#ffffff', '#8a8a5a', 0.8], soleil: ['#fff1d6', 0.9, [30, 50, 20]] };

  function distSeg(x, z, a, b) {
    var dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
    var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
    var ex = x - a[0] - t * dx, ez = z - a[1] - t * dz;
    return Math.sqrt(ex * ex + ez * ez);
  }
  function chemin(x, z) {
    var d = 1e9;
    CHEMINS.forEach(function (c) { for (var i = 0; i < c.length - 1; i++) d = Math.min(d, distSeg(x, z, c[i], c[i + 1])); });
    return d;
  }
  function etang(x, z) { // indice elliptique minimal (< 1 = dans l'eau)
    var m = 9;
    ETANGS.forEach(function (e) { var ex = (x - e.x) / e.rx, ez = (z - e.z) / e.rz; m = Math.min(m, Math.sqrt(ex * ex + ez * ez)); });
    return m;
  }
  function dansPre(x, z, marge) {
    marge = marge || 0;
    for (var k in PRES) { var p = PRES[k]; if (x > p.x0 - marge && x < p.x1 + marge && z > p.z0 - marge && z < p.z1 + marge) return k; }
    return null;
  }
  function brut(x, z) {
    var h = 0.32 + Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.06 + Math.sin(x * 0.31 + 1) * Math.sin(z * 0.27) * 0.03;
    var d = Math.sqrt(x * x + z * z);
    if (d > 44) h = AV.lerp(h, -1.4, lisse(44, 52, d));
    ETANGS.forEach(function (e) {
      var ex = (x - e.x) / e.rx, ez = (z - e.z) / e.rz, ee = Math.sqrt(ex * ex + ez * ez);
      if (ee < 1.2) h = AV.lerp(h, e.prof, lisse(1.15, 0.8, ee));
    });
    SITES.forEach(function (s) {
      var de = Math.sqrt((x - s.x) * (x - s.x) + (z - s.z) * (z - s.z));
      if (de < 1.6) h = Math.max(h, AV.lerp(0.18, -0.3, lisse(0.6, 1.6, de)));
    });
    return h;
  }
  function surPonton(x, z) { return x > PONTON.x0 && x < PONTON.x1 && z > PONTON.z0 && z < PONTON.z1; }
  function hauteur(x, z) { var h = brut(x, z); return surPonton(x, z) ? Math.max(h, 0.5) : h; }

  // ---------- Flamant rose (géométries pour l'instanciation) ----------
  function cuire(construire) { var g = new THREE.Group(); construire(g); var f = new AV.Fusion(); f.ajouter(g); AV.detruire(g); return f.geometrie(); }
  function m(geo, c, x, y, z, rx, sx, sy, sz) {
    var o = AV.maille(geo, c); o.position.set(x, y, z); o.rotation.x = rx || 0;
    if (sx) o.scale.set(sx, sy, sz);
    return o;
  }
  var ROSE = '#f7a8ba', ROSE2 = '#f27f9c', NOIR = '#1d1a22';
  function geoCorps() {
    return cuire(function (g) {
      g.add(m(new THREE.IcosahedronGeometry(0.36, 1), ROSE, 0, 1.3, 0, 0, 0.72, 0.62, 1.15));
      g.add(m(new THREE.IcosahedronGeometry(0.3, 1), ROSE2, 0, 1.37, -0.08, 0, 0.78, 0.5, 1.1));
      g.add(m(new THREE.BoxGeometry(0.4, 0.1, 0.28), NOIR, 0, 1.34, -0.42, 0.3));
      g.add(m(new THREE.ConeGeometry(0.13, 0.3, 5), ROSE, 0, 1.36, -0.5, -Math.PI / 2 - 0.3));
    });
  }
  function geoCou() { // pivot à la base du cou ; droit quand rotation = 0
    return cuire(function (g) {
      g.add(m(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 6), ROSE, 0, 0.25, -0.04, -0.15));
      g.add(m(new THREE.CylinderGeometry(0.055, 0.06, 0.5, 6), ROSE, 0, 0.7, 0.0, 0.2));
      g.add(m(new THREE.IcosahedronGeometry(0.11, 1), '#f9b6c4', 0, 0.97, 0.06, 0, 1, 1, 1.3));
      g.add(m(new THREE.ConeGeometry(0.05, 0.17, 5), '#f4e6e0', 0, 0.93, 0.2, Math.PI / 2 + 0.7));
      g.add(m(new THREE.ConeGeometry(0.036, 0.1, 5), NOIR, 0, 0.86, 0.27, Math.PI / 2 + 1.4));
      [-1, 1].forEach(function (c) { g.add(m(new THREE.SphereGeometry(0.022, 5, 4), '#2b2340', c * 0.085, 1.0, 0.1)); });
    });
  }
  function geoPattes() { // pivot à la hanche
    return cuire(function (g) {
      [-1, 1].forEach(function (c) {
        g.add(m(new THREE.CylinderGeometry(0.028, 0.024, 1.08, 5), '#ef8aa3', c * 0.08, -0.54, 0));
        g.add(m(new THREE.SphereGeometry(0.042, 5, 4), '#e07890', c * 0.08, -0.55, 0));
        g.add(m(new THREE.BoxGeometry(0.1, 0.03, 0.17), '#e07890', c * 0.08, -1.07, 0.05));
      });
    });
  }
  function geoAile(cote) { // pivot à l'épaule, aile vers ±x
    return cuire(function (g) {
      g.add(m(new THREE.BoxGeometry(0.75, 0.04, 0.5), ROSE2, cote * 0.375, 0, 0));
      g.add(m(new THREE.BoxGeometry(0.4, 0.05, 0.44), NOIR, cote * 0.92, 0, -0.03));
      g.add(m(new THREE.BoxGeometry(0.5, 0.06, 0.3), ROSE, cote * 0.3, 0.02, 0.08));
    });
  }

  // ---------- Chevaux et taureaux ----------
  function bete(type) {
    var cheval = type === 'cheval';
    var c = cheval ? '#ecebe6' : '#1f1b1b', jambe = cheval ? 0.95 : 0.75, by = jambe + 0.33;
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var tr = AV.maille(new THREE.IcosahedronGeometry(0.55, 1), c);
    if (cheval) tr.scale.set(0.72, 0.68, 1.45); else tr.scale.set(0.85, 0.8, 1.35);
    tr.position.y = by; corps.add(tr);
    var tete = new THREE.Group(); tete.position.set(0, by + (cheval ? 0.22 : 0.1), cheval ? 0.68 : 0.7); corps.add(tete);
    if (cheval) {
      tete.add(m(new THREE.CylinderGeometry(0.15, 0.22, 0.75, 6), c, 0, 0.28, 0.15, 0.55));
      tete.add(m(new THREE.BoxGeometry(0.06, 0.7, 0.14), '#bdbdb6', 0, 0.36, 0.0, 0.55));
      var t = m(new THREE.BoxGeometry(0.24, 0.26, 0.6), c, 0, 0.6, 0.5, 0.95); tete.add(t);
      tete.add(m(new THREE.BoxGeometry(0.22, 0.2, 0.16), '#8a8a86', 0, 0.37, 0.72, 0.95));
      [-1, 1].forEach(function (k) {
        tete.add(m(new THREE.ConeGeometry(0.05, 0.16, 4), c, k * 0.08, 0.86, 0.32, -0.2));
        tete.add(m(new THREE.SphereGeometry(0.03, 5, 4), '#1b1b22', k * 0.125, 0.66, 0.46));
      });
    } else {
      tete.add(m(new THREE.BoxGeometry(0.38, 0.36, 0.52), c, 0, 0.02, 0.3, 0.5));
      tete.add(m(new THREE.BoxGeometry(0.3, 0.2, 0.16), '#3a3333', 0, -0.12, 0.55, 0.5));
      [-1, 1].forEach(function (k) {
        var co = m(new THREE.ConeGeometry(0.05, 0.45, 5), '#efe6d0', k * 0.24, 0.3, 0.22); co.rotation.z = -k * 0.75; tete.add(co);
        tete.add(m(new THREE.SphereGeometry(0.03, 5, 4), '#d9d0c0', k * 0.19, 0.1, 0.42));
      });
    }
    var pattes = [];
    [[-0.22, 0.5], [0.22, 0.5], [-0.22, -0.5], [0.22, -0.5]].forEach(function (p) {
      var pv = new THREE.Group(); pv.position.set(p[0], jambe, p[1]);
      pv.add(m(new THREE.CylinderGeometry(0.075, 0.06, jambe, 5), c, 0, -jambe / 2, 0));
      pv.add(m(new THREE.BoxGeometry(0.14, 0.08, 0.16), '#2b2522', 0, -jambe + 0.04, 0.01));
      corps.add(pv); pattes.push(pv);
    });
    var queue = new THREE.Group(); queue.position.set(0, by + 0.15, -0.75); corps.add(queue);
    queue.add(m(new THREE.CylinderGeometry(0.035, 0.03, 0.75, 4), cheval ? '#d7d7d0' : c, 0, -0.37, -0.05, 0.15));
    queue.add(m(new THREE.ConeGeometry(0.08, 0.3, 5), cheval ? '#cfcfc8' : '#0d0b0b', 0, -0.75, -0.1, Math.PI));
    g.userData.rayon = 0.9;
    return { groupe: g, tete: tete, pattes: pattes, queue: queue, cheval: cheval };
  }

  function tamaris(r) {
    var g = new THREE.Group(), s = AV.entre(r, 0.8, 1.3);
    g.add(m(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.6 * s, 5), '#6b5440', 0, 0.8 * s, 0, 0.1));
    for (var i = 0; i < 4; i++) {
      var a = i / 4 * Math.PI * 2 + r();
      var f = AV.maille(new THREE.IcosahedronGeometry(AV.entre(r, 0.6, 0.9) * s, 0), AV.choisir(r, ['#9fae8a', '#93a57f', '#a8b391']));
      f.position.set(Math.sin(a) * 0.55 * s, (1.7 + r() * 0.6) * s, Math.cos(a) * 0.55 * s); g.add(f);
      if (r() < 0.6) { var fl = AV.maille(new THREE.IcosahedronGeometry(0.3 * s, 0), '#e2b3c2'); fl.position.copy(f.position).add(new THREE.Vector3(0, 0.45 * s, 0)); g.add(fl); }
    }
    g.userData.rayon = 0.4;
    return g;
  }

  function cabane() {
    var g = new THREE.Group();
    g.add(m(new THREE.BoxGeometry(3.2, 2.2, 4.6), '#f4f1ea', 0, 1.1, 0));
    var toit = AV.maille(new THREE.CylinderGeometry(1.75, 1.75, 4.9, 3), '#cdb57c');
    toit.rotation.x = -Math.PI / 2; toit.scale.set(1.15, 1, 1.1); toit.position.y = 2.2 + 0.875 * 1.1; g.add(toit);
    g.add(m(new THREE.BoxGeometry(0.9, 1.6, 0.06), '#4a7bb0', 0, 0.8, 2.31));
    [-1, 1].forEach(function (c) { g.add(m(new THREE.BoxGeometry(0.06, 0.6, 0.7), '#4a7bb0', c * 1.62, 1.3, 0.6)); });
    g.add(m(new THREE.BoxGeometry(0.07, 0.75, 0.07), '#5a4a3a', 0, 5.35, 2.15));
    g.add(m(new THREE.BoxGeometry(0.45, 0.07, 0.07), '#5a4a3a', 0, 5.45, 2.15));
    g.userData.rect = { hx: 1.75, hz: 2.45 };
    return g;
  }

  function pancarte(texte, l) {
    var g = new THREE.Group(), p = AV.outils.panneau(texte, '#f6ecd6', '#4a3424', l, 0.6);
    p.position.y = 1.6; g.add(p);
    [-1, 1].forEach(function (c) { g.add(m(new THREE.BoxGeometry(0.1, 1.6, 0.1), '#7a5a3a', c * (l / 2 - 0.2), 0.8, -0.05)); });
    g.userData.rayon = 0.3;
    return g;
  }

  // =====================================================================
  AV.biomes.camargue = function (cfg) {
    var rng = AV.rng(4200 + cfg.jour);
    var ciel = (cfg.ambiance && cfg.ambiance.ciel && AV.CIELS[cfg.ambiance.ciel]) || CIEL;
    var nom = cfg.nom || AV.nomAnimal(cfg.animal);
    var mo = new AV.Monde({
      rayon: 46, hauteur: hauteur, surface: 'herbe', ciel: ciel, brouillard: [45, 230],
      depart: { x: 0, z: 34, angle: Math.PI }, theme: 'camargue', ambiance: 'vent',
      autorise: function (x, z) { return surPonton(x, z) || brut(x, z) > -0.55; },
      surfaceA: function (x, z) { return surPonton(x, z) ? 'bois' : brut(x, z) < -0.06 ? 'eau' : chemin(x, z) < 1.3 ? 'sable' : 'herbe'; }
    });
    mo.cielEtLumieres(ciel);
    var G = mo.groupe;

    // ---------- Sol et eau ----------
    G.add(AV.terrain(130, 100, brut, function (x, z, y) {
      if (y < -0.1) return AV.outils.varier('#8f8c66', x, z, 0.1);
      if (y < 0.12) return AV.outils.varier('#cdbd90', x, z, 0.08);
      if (chemin(x, z) < 1.3) return AV.outils.varier('#dcc9a0', x, z, 0.06);
      var n = Math.sin(x * 0.21 + z * 0.17) * Math.cos(z * 0.23 - x * 0.07);
      if (n > 0.55) return AV.outils.varier('#9a6a5c', x, z, 0.12); // salicorne
      return AV.outils.varier(n > 0 ? '#86935a' : '#7a8a50', x, z, 0.1);
    }));
    var eau = AV.eau(130, 130, 36, 36, '#6fb3cc', 0.8);
    eau.position.y = -0.06; eau.scale.y = 0.35; G.add(eau);
    mo.anime(function (dt, t) { eau.userData.maj(dt, t); });

    // ---------- Ponton d'observation ----------
    var bois = new AV.Fusion(), planche = m(new THREE.BoxGeometry(2.6, 0.08, 0.3), '#9a7652', 0, 0, 0);
    for (var zp = PONTON.z0 + 0.15; zp < PONTON.z1; zp += 0.34) bois.ajouter(planche, AV.matrice(0, 0.46, zp, 0));
    var pieu = m(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5), '#6b5440', 0, 0, 0);
    var rambarde = m(new THREE.BoxGeometry(0.08, 0.08, PONTON.z1 - PONTON.z0), '#8a6a48', 0, 0, 0);
    [-1, 1].forEach(function (c) {
      for (var zq = PONTON.z0 + 0.2; zq < PONTON.z1; zq += 1.6) bois.ajouter(pieu, AV.matrice(c * 1.25, 0.35, zq, 0));
      bois.ajouter(rambarde, AV.matrice(c * 1.25, 1.05, (PONTON.z0 + PONTON.z1) / 2, 0));
      mo.colliders.push({ rect: true, x: c * 1.32, z: (PONTON.z0 + PONTON.z1) / 2, hx: 0.06, hz: (PONTON.z1 - PONTON.z0) / 2, a: 0 });
    });

    // ---------- Clôtures des prés ----------
    var poteau = m(new THREE.BoxGeometry(0.15, 1.3, 0.15), '#8a6a48', 0, 0, 0);
    Object.keys(PRES).forEach(function (k) {
      var p = PRES[k];
      [[p.x0, p.z0, p.x1, p.z0], [p.x1, p.z0, p.x1, p.z1], [p.x1, p.z1, p.x0, p.z1], [p.x0, p.z1, p.x0, p.z0]].forEach(function (s) {
        var l = Math.sqrt((s[2] - s[0]) * (s[2] - s[0]) + (s[3] - s[1]) * (s[3] - s[1])), n = Math.ceil(l / 2.5);
        var rot = Math.atan2(s[2] - s[0], s[3] - s[1]), cx = (s[0] + s[2]) / 2, cz = (s[1] + s[3]) / 2;
        for (var i = 0; i <= n; i++) { var x = AV.lerp(s[0], s[2], i / n), z = AV.lerp(s[1], s[3], i / n); bois.ajouter(poteau, AV.matrice(x, hauteur(x, z) + 0.6, z, 0)); }
        var rail = m(new THREE.BoxGeometry(0.07, 0.09, l), '#9a7652', 0, 0, 0);
        [0.6, 1.05].forEach(function (h) { bois.ajouter(rail, AV.matrice(cx, hauteur(cx, cz) + h, cz, rot)); });
        AV.detruire(rail);
        mo.colliders.push({ rect: true, x: cx, z: cz, hx: 0.12, hz: l / 2, a: -rot });
      });
    });
    var boisM = bois.maille(); boisM.castShadow = boisM.receiveShadow = true; G.add(boisM);
    [planche, pieu, rambarde, poteau].forEach(AV.detruire);

    // ---------- Roseaux (une seule maille) ----------
    var modeles = [];
    for (var mi = 0; mi < 4; mi++) {
      var touffe = new THREE.Group();
      for (var b = 0; b < 6; b++) {
        var h = AV.entre(rng, 1.0, 1.9);
        var tige = m(new THREE.ConeGeometry(0.035, h, 3), AV.choisir(rng, ['#b5a86a', '#9c9a5a', '#c2b678', '#8d9a58']), (rng() - 0.5) * 0.5, h / 2, (rng() - 0.5) * 0.5);
        tige.rotation.z = (rng() - 0.5) * 0.3; touffe.add(tige);
        if (rng() < 0.3) touffe.add(m(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5), '#6b4a32', tige.position.x, h * 0.8, tige.position.z));
      }
      modeles.push(touffe);
    }
    var roseaux = new AV.Fusion();
    ETANGS.forEach(function (e, ie) {
      var n = ie === 0 ? 70 : 40;
      for (var i = 0; i < n; i++) {
        var a = rng() * Math.PI * 2, ee = AV.entre(rng, 0.97, 1.15);
        var x = e.x + Math.sin(a) * e.rx * ee, z = e.z + Math.cos(a) * e.rz * ee;
        if (Math.abs(x) < 3 && z > -12 && z < -3) continue;      // devant le ponton
        if (chemin(x, z) < 1.6 || dansPre(x, z, 0.5)) continue;
        roseaux.ajouter(AV.choisir(rng, modeles), AV.matrice(x, brut(x, z) - 0.05, z, rng() * 6, AV.entre(rng, 0.8, 1.2)));
      }
    });
    modeles.forEach(AV.detruire);
    var roseauxM = roseaux.maille(); roseauxM.castShadow = true; G.add(roseauxM);

    // ---------- Cabane de gardian, tamaris, panneaux ----------
    mo.ajouter(cabane(), 15, -28, 0, { bloque: true });
    [['Bienvenue en Camargue ☀️', 3.2, -3.2, 31, 0], ['🦩 Parc ornithologique · Camargue', 4, 3.2, -4.2, 0],
     ['🐂 Taureaux : ne pas déranger !', 3.6, 6.6, 16, -Math.PI / 2], ['🐴 Chevaux de Camargue', 3.2, -6.6, 16, Math.PI / 2]].forEach(function (p) {
      mo.ajouter(pancarte(p[0], p[1]), p[2], p[3], p[4]);
    });
    mo.semer(rng, 22, function (r) { return tamaris(r); }, {
      min: 6, max: 42, marge: 2.2, bloque: true,
      filtre: function (x, z) { return etang(x, z) > 1.3 && chemin(x, z) > 3 && !dansPre(x, z, 2) && brut(x, z) > 0.15; }
    });
    // l'église des Saintes-Maries au loin
    var eglise = new THREE.Group();
    eglise.add(m(new THREE.BoxGeometry(10, 9, 26), '#d6c7aa', 0, 4.5, 0));
    eglise.add(m(new THREE.BoxGeometry(6, 16, 6), '#d6c7aa', 0, 8, -10));
    for (var cr = 0; cr < 5; cr++) eglise.add(m(new THREE.BoxGeometry(1, 1.2, 1), '#d6c7aa', -2.4 + cr * 1.2, 16.6, -12.5));
    eglise.position.set(-45, -1, -120); eglise.rotation.y = 0.4; G.add(eglise);

    // îlot de la cachette
    SITES.forEach(function (s) {
      var ilot = AV.deco.rocher(rng, 0.55, '#a59a86'); ilot.scale.y *= 0.5;
      mo.ajouter(ilot, s.x, s.z, 0, { collision: false });
    });
    mo.cachettes.push({ x: E.x, z: E.z, y: 0.3 });
    mo.zoneAnimal = { x: E.x, z: E.z, rayon: 2.0, texte: '🐦 ' + nom + ' ! ✋ Lui tendre le doigt' };

    // ---------- Chevaux et taureaux ----------
    var betes = [];
    function placerBetes(type, n, pre) {
      for (var i = 0; i < n; i++) {
        var b = bete(type);
        var x = AV.entre(rng, pre.x0 + 2, pre.x1 - 2), z = AV.entre(rng, pre.z0 + 2, pre.z1 - 2);
        b.groupe.position.set(x, hauteur(x, z), z); b.groupe.rotation.y = rng() * 6.28;
        G.add(b.groupe);
        var col = { x: x, z: z, r: 0.95 }; mo.colliders.push(col);
        betes.push({ b: b, pre: pre, x: x, z: z, yaw: b.groupe.rotation.y, etat: 'broute', t: rng() * 5, cx: x, cz: z, col: col, ph: rng() * 6, vit: type === 'cheval' ? 1.1 : 0.7 });
      }
    }
    placerBetes('cheval', 5, PRES.chevaux);
    placerBetes('taureau', 4, PRES.taureaux);
    mo.anime(function (dt, t) {
      betes.forEach(function (o) {
        var b = o.b;
        if (o.etat === 'marche') {
          var dx = o.cx - o.x, dz = o.cz - o.z, l = Math.sqrt(dx * dx + dz * dz);
          if (l < 0.2) { o.etat = 'broute'; o.t = 3 + Math.random() * 7; }
          else {
            o.x += dx / l * o.vit * dt; o.z += dz / l * o.vit * dt;
            o.yaw = AV.angleLerp(o.yaw, Math.atan2(dx, dz), dt * 2.5);
            b.pattes.forEach(function (p, i) { p.rotation.x = Math.sin(t * 6 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.45; });
          }
          b.tete.rotation.x = AV.lerp(b.tete.rotation.x, 0.15, dt * 3);
        } else {
          o.t -= dt;
          b.tete.rotation.x = AV.lerp(b.tete.rotation.x, (b.cheval ? 1.05 : 0.6) + Math.sin(t * 3 + o.ph) * 0.05, dt * 2);
          b.pattes.forEach(function (p) { p.rotation.x *= 0.9; });
          if (o.t <= 0) { o.etat = 'marche'; o.cx = AV.entre(Math.random, o.pre.x0 + 2, o.pre.x1 - 2); o.cz = AV.entre(Math.random, o.pre.z0 + 2, o.pre.z1 - 2); }
        }
        b.queue.rotation.z = Math.sin(t * 2.2 + o.ph) * 0.35;
        b.groupe.position.set(o.x, hauteur(o.x, o.z), o.z);
        b.groupe.rotation.y = o.yaw;
        o.col.x = o.x; o.col.z = o.z;
      });
    });

    // ---------- Colonie de flamants roses ----------
    // La colonie se pose sur un îlot en cercles serrés autour d'Edith, en laissant UN couloir
    // pour la rejoindre ; puis elle s'envole (Edith aussi !) vers un autre étang.
    var oiseaux = [], principaux = [];
    // 3 cercles, avec entre eux une allée juste assez large pour passer
    var RINGS = [[2.3, 9], [4.3, 17], [6.3, 25]];
    function flamant(principal, x, z) {
      var o = { hx: x || 0, hz: z || 0, hy: 0, fx: 0, fz: 0, fy: 0, yaw: rng() * 6.28, s: AV.entre(rng, 0.9, 1.1), ph: rng() * 6.28,
        principal: principal, col: null, ring: -1, cou: 0.1, couC: 0.1, tCou: rng() * 4, px: x || 0, pz: z || 0,
        hv: 4.5 + (oiseaux.length % 5) * 0.8, tourne: 1.5 + (oiseaux.length % 4) * 0.8, teinte: AV.entre(rng, 0.9, 1.06) };
      o.hy = Math.max(brut(o.hx, o.hz), -0.32);
      oiseaux.push(o);
      if (principal) principaux.push(o);
      return o;
    }
    RINGS.forEach(function (c, ri) {
      for (var i = 0; i < c[1]; i++) { var o = flamant(true); o.ring = ri; o.slot = i; o.col = { x: 9999, z: 0, r: 0.5 }; mo.colliders.push(o.col); }
    });
    for (var sc = 0; sc < 16; sc++) flamant(true);
    var e4 = ETANGS[3]; // quelques flamants qui restent dans le petit étang
    for (var d4 = 0; d4 < 8; d4++) { var a4 = rng() * 6.28, r4 = AV.entre(rng, 0.1, 0.6); flamant(false, e4.x + Math.sin(a4) * e4.rx * r4, e4.z + Math.cos(a4) * e4.rz * r4); }

    // places au sol autour d'un îlot : chaque cercle a UNE ouverture, décalée d'un cercle à l'autre
    // (on entre par l'extérieur, on contourne dans l'allée jusqu'à l'ouverture suivante…)
    function dansCouloir(lx, lz, cx, cz, l) { return lx * cx + lz * cz > 0 && Math.abs(lx * cz - lz * cx) < l; }
    function formation(site, couloir) {
      var S = SITES[site], cx = Math.sin(couloir), cz = Math.cos(couloir), r = Math.random;
      var sens = r() < 0.5 ? -1 : 1, ouv = [];
      ouv[2] = couloir;
      ouv[1] = ouv[2] + sens * AV.entre(r, 1.5, 2.2);
      ouv[0] = ouv[1] + sens * AV.entre(r, 1.4, 2.0);
      principaux.forEach(function (o) {
        var x, z, ok = false;
        if (o.ring >= 0) {
          var c = RINGS[o.ring], a = o.slot / c[1] * Math.PI * 2 + o.ring * 0.3 + (r() - 0.5) * 0.03, rr = c[0] + (r() - 0.5) * 0.08;
          var lx = Math.sin(a) * rr, lz = Math.cos(a) * rr;
          if (!dansCouloir(lx, lz, Math.sin(ouv[o.ring]), Math.cos(ouv[o.ring]), 1.05)) { x = S.x + lx; z = S.z + lz; ok = true; }
        }
        if (!ok) { // les autres se dispersent autour, jamais devant le couloir
          for (var k = 0; k < 25; k++) {
            var a2 = couloir + Math.PI + (r() - 0.5) * 4.2, r2 = AV.entre(r, 7.4, 9.6);
            x = S.x + Math.sin(a2) * r2; z = S.z + Math.cos(a2) * r2;
            if (etang(x, z) < 1.0 && !dansCouloir(x - S.x, z - S.z, cx, cz, 1.8) && !(Math.abs(x) < 2 && z > -11.5 && z < -4)) break;
          }
        }
        o.fx = o.px; o.fz = o.pz; o.fy = o.hy;
        o.hx = x; o.hz = z; o.hy = Math.max(brut(x, z), -0.32);
      });
    }
    // à l'arrivée dans le monde, la colonie (et Edith) arrive en vol au-dessus de l'entrée du parc
    var DEPART_VOL = { x: -12, z: 46, y: 10 };
    var colonie = { etat: 'vol', t: 0, duree: 11, site: Math.floor(Math.random() * 3), couloir: Math.random() * Math.PI * 2, TV: 9 };
    formation(colonie.site, colonie.couloir);
    principaux.forEach(function (o) {
      o.fx = DEPART_VOL.x + (Math.random() - 0.5) * 14; o.fz = DEPART_VOL.z + (Math.random() - 0.5) * 10; o.fy = DEPART_VOL.y + Math.random() * 3;
      o.px = o.fx; o.pz = o.fz;
    });
    var S0 = SITES[colonie.site];
    colonie.TV = 5 + Math.sqrt((S0.x - DEPART_VOL.x) * (S0.x - DEPART_VOL.x) + (S0.z - DEPART_VOL.z) * (S0.z - DEPART_VOL.z)) / 6;
    mo.zoneAnimal.rayon = 0;

    // Edith (l'animal du jour) voyage avec la colonie
    var edith = null, edithCol = null, edithLibre = true, ed = { fx: 0, fy: 0, fz: 0, hx: E.x, hy: 0, hz: E.z };
    mo.surAnimal = function (a, col) {
      edith = a; edithCol = col;
      ed.fx = DEPART_VOL.x; ed.fz = DEPART_VOL.z; ed.fy = DEPART_VOL.y + 1;
      ed.hx = S0.x; ed.hz = S0.z; ed.hy = brut(S0.x, S0.z) + 0.3;
      a.vole = true; a.cible = a.groupe.rotation.y || 0; a.base.set(ed.fx, ed.fy, ed.fz); a.groupe.position.copy(a.base);
      col.x = 9999;
    };

    var N = oiseaux.length, matF = new THREE.MeshLambertMaterial({ vertexColors: true });
    function inst(geo) {
      var im = new THREE.InstancedMesh(geo, matF, N);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true; im.frustumCulled = false; G.add(im);
      return im;
    }
    var iCorps = inst(geoCorps()), iCou = inst(geoCou()), iPattes = inst(geoPattes()), iAileD = inst(geoAile(1)), iAileG = inst(geoAile(-1));
    var teinte = new THREE.Color();
    // (r128 : toutes les mailles qui partagent le matériau doivent avoir une couleur d'instance)
    oiseaux.forEach(function (o, i) {
      teinte.setRGB(o.teinte, o.teinte, o.teinte);
      [iCorps, iCou, iPattes, iAileD, iAileG].forEach(function (im) { im.setColorAt(i, teinte); });
    });

    // cycle : posée → s'agite → s'envole (avec Edith) → se pose sur un autre îlot
    function envol() {
      var C = colonie, prec = C.site, choix = [0, 1, 2].filter(function (s) { return s !== prec; });
      C.site = choix[Math.floor(Math.random() * choix.length)];
      C.couloir = Math.random() * Math.PI * 2;
      formation(C.site, C.couloir);
      var A = SITES[prec], B = SITES[C.site];
      C.TV = 4 + Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.z - A.z) * (B.z - A.z)) / 5;
      C.etat = 'vol'; C.t = 0;
      AV.audio.flamants(1);
      mo.zoneAnimal.rayon = 0;
      if (edith && edithLibre) {
        ed.fx = edith.base.x; ed.fy = edith.base.y; ed.fz = edith.base.z;
        ed.hx = B.x; ed.hz = B.z; ed.hy = brut(B.x, B.z) + 0.3;
        edith.vole = true;
        AV.audio.sifflet(0.6);
      }
    }
    function atterrir() {
      var C = colonie, S = SITES[C.site];
      C.etat = 'sol'; C.t = 0; C.duree = AV.entre(Math.random, 10, 13);
      mo.zoneAnimal.x = S.x; mo.zoneAnimal.z = S.z; mo.zoneAnimal.rayon = 2.0;
      if (edith && edith.vole) {
        edith.vole = false;
        edith.m.corps.rotation.x = 0;
        if (edith.m.ailes) edith.m.ailes.forEach(function (a) { a.rotation.z = 0; });
        edith.placer(ed.hx, ed.hy, ed.hz, C.couloir); // elle regarde vers le couloir
        if (edithCol) { edithCol.x = ed.hx; edithCol.z = ed.hz; }
      }
    }
    var mB = new THREE.Matrix4(), mP = new THREE.Matrix4(), mT = new THREE.Matrix4(), q = new THREE.Quaternion();
    var AXE = new THREE.Vector3(0, 1, 0), vp = new THREE.Vector3(), vs = new THREE.Vector3(), v1 = new THREE.Vector3();
    var ease = function (v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };

    mo.anime(function (dt, t, joueur) {
      var C = colonie;
      C.t += dt;
      if (C.etat === 'sol' && C.t > C.duree) { C.etat = 'agite'; C.t = 0; AV.audio.flamants(0.45); }
      else if (C.etat === 'agite' && C.t > 2.2) envol();
      else if (C.etat === 'vol' && C.t > C.TV) atterrir();
      else if (C.etat === 'fete' && C.t > 4) { C.etat = 'sol'; C.t = 0; C.duree = 20; }
      var libre = C.etat === 'vol' && C.t < C.TV - 0.4;
      var fv = Math.min(1, C.t / C.TV), ev = ease(fv), arc = Math.sin(Math.PI * fv);

      // Edith en vol
      if (edith && edith.vole) {
        var ex = AV.lerp(ed.fx, ed.hx, ev) + Math.sin(fv * 6.28) * 1.2 * arc, ez = AV.lerp(ed.fz, ed.hz, ev) + Math.cos(fv * 6.28) * 1.2 * arc;
        var dxe = ex - edith.base.x, dze = ez - edith.base.z;
        if (dxe * dxe + dze * dze > 1e-6) edith.cible = Math.atan2(dxe, dze);
        edith.base.set(ex, AV.lerp(ed.fy, ed.hy, ev) + 5.5 * arc, ez);
        if (edithCol) edithCol.x = 9999;
        // petite traînée de cœurs / étincelles pour la suivre des yeux
        if (arc > 0.2 && edith.groupe.parent && Math.random() < dt * 5) edith.coeur(edith.groupe.parent);
      }

      for (var i = 0; i < N; i++) {
        var o = oiseaux[i], x = o.hx, y = o.hy, z = o.hz, cou, pattes = 0, aile = 0, battement = 0;
        if (o.col) { o.col.x = libre ? 9999 : o.hx; o.col.z = o.hz; }
        // cou : picorer / se redresser
        o.tCou -= dt;
        if (o.tCou <= 0) { o.couC = Math.random() < 0.45 ? 2.6 : 0.05 + Math.random() * 0.25; o.tCou = 2 + Math.random() * 5; }
        o.cou = AV.lerp(o.cou, o.couC, Math.min(1, dt * 2));
        cou = o.cou;
        if (o.principal && C.etat === 'vol') {
          var ang = o.ph + fv * Math.PI * 2, sw = o.tourne * arc;
          x = AV.lerp(o.fx, o.hx, ev) + Math.sin(ang) * sw;
          z = AV.lerp(o.fz, o.hz, ev) + Math.cos(ang) * sw;
          y = AV.lerp(o.fy, o.hy, ev) + o.hv * arc;
          var pose = Math.min(1, arc * 4);
          cou = AV.lerp(o.cou, 1.45, pose); pattes = 1.4 * pose; aile = Math.max(0.001, pose);
          battement = Math.sin(t * 7 + o.ph) * 0.85 * pose;
          var dx = x - o.px, dz = z - o.pz;
          if (dx * dx + dz * dz > 1e-5) o.yaw = AV.angleLerp(o.yaw, Math.atan2(dx, dz), Math.min(1, dt * 8));
        } else if (o.principal && (C.etat === 'agite' || C.etat === 'fete')) {
          aile = Math.min(1, C.t / 0.6) * 0.8; battement = Math.sin(t * 14 + o.ph) * 0.5;
          y += Math.max(0, Math.sin(t * 7 + o.ph)) * 0.12; cou = AV.lerp(cou, 0.2, Math.min(1, C.t));
        } else {
          o.yaw += Math.sin(t * 0.3 + o.ph) * dt * 0.1;
        }
        o.px = x; o.pz = z;
        mB.compose(vp.set(x, y, z), q.setFromAxisAngle(AXE, o.yaw), vs.setScalar(o.s));
        iCorps.setMatrixAt(i, mB);
        mP.makeRotationX(cou); mP.setPosition(0, 1.42, 0.3); mT.multiplyMatrices(mB, mP); iCou.setMatrixAt(i, mT);
        mP.makeRotationX(pattes); mP.setPosition(0, 1.08, 0); mT.multiplyMatrices(mB, mP); iPattes.setMatrixAt(i, mT);
        var ech = aile || 0.001;
        mP.makeRotationZ(battement); mP.scale(v1.set(ech, ech, ech)); mP.setPosition(0.22, 1.38, 0.05); mT.multiplyMatrices(mB, mP); iAileD.setMatrixAt(i, mT);
        mP.makeRotationZ(-battement); mP.scale(v1.set(ech, ech, ech)); mP.setPosition(-0.22, 1.38, 0.05); mT.multiplyMatrices(mB, mP); iAileG.setMatrixAt(i, mT);
      }
      [iCorps, iCou, iPattes, iAileD, iAileG].forEach(function (im) { im.instanceMatrix.needsUpdate = true; });
      if (scen) { scen.t += dt; var k = Math.min(1, scen.t * 3); scen.cadeau.scale.setScalar(Math.max(0.01, k * (1 + Math.sin(scen.t * 6) * 0.06))); }
    });

    // astuce affichée près de la colonie
    mo.astuce = function (p) {
      var C = colonie, S = SITES[C.site], dx = p.x - S.x, dz = p.z - S.z, d2 = dx * dx + dz * dz;
      if (C.etat === 'vol') return d2 < 40 * 40 ? '🦩 La colonie s\'envole avec ' + nom + ' ! Suis-les…' : null;
      if (d2 > 16 * 16) return null;
      if (C.etat === 'agite') return '🦩 Ils s\'agitent… ils vont changer d\'étang !';
      return '🦩 ' + nom + ' est au milieu des flamants… trouve le passage !';
    };

    // ---------- Découverte : Edith tend un cadeau ----------
    var scen = null;
    mo.surTrouve = function (ctx) {
      var cad = new THREE.Group();
      cad.add(m(new THREE.BoxGeometry(0.3, 0.26, 0.3), '#e23a5a', 0, 0, 0));
      cad.add(m(new THREE.BoxGeometry(0.32, 0.27, 0.07), '#ffd24a', 0, 0, 0));
      cad.add(m(new THREE.BoxGeometry(0.07, 0.27, 0.32), '#ffd24a', 0, 0, 0));
      [-1, 1].forEach(function (c) { var n = m(new THREE.TorusGeometry(0.06, 0.02, 4, 8), '#ffd24a', c * 0.06, 0.17, 0); n.rotation.y = Math.PI / 2; cad.add(n); });
      cad.position.set(0, 0.5, 0.42); cad.scale.setScalar(0.01);
      ctx.animal.groupe.add(cad);
      scen = { cadeau: cad, t: 0 };
      AV.audio.sifflet(1);
      ctx.animal.bulle(ctx.scene, '🎁 Pour toi !', { vie: 2.6 });
      edithLibre = false;                       // elle reste avec toi
      colonie.etat = 'fete'; colonie.t = 0;     // la colonie bat des ailes pour fêter ça
      AV.audio.flamants(0.6);
      setTimeout(function () { ctx.fin(cfg); }, 1000);
    };

    mo.debug = { colonie: colonie, sites: SITES };
    mo.portailRetour(4.5, 22);
    return mo;
  };
})(window.AV);
