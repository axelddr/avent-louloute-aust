/* Biome « golf » : le practice du Golf du Pic Saint-Loup à Saint-Gély-du-Fesc.
   Postes couverts (12 sous l'auvent), tapis synthétiques, paniers de balles, écran de suivi de balle,
   la plaine de practice avec ses greens-cibles, les panneaux de distance, la voiturette ramasse-balles,
   la garrigue et les pins tout autour… et au loin le Pic Saint-Loup et l'Hortus.
   Jeu : ← → pour viser, ✋ une 1ère fois = la jauge de puissance démarre, ✋ une 2e fois = puissance choisie,
   ✋ une 3e fois quand l'aiguille passe dans le vert = précision. Il faut faire atterrir une balle sur chacun
   des 3 greens. Ensuite il vient lui faire un gros câlin, puis la surprise (petit mot) s'ouvre. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#4b8fdc', bas: '#ffe6c2', brouillard: '#e4ddcc', hemi: ['#fff4e0', '#7d7a58', 0.68], soleil: ['#ffe2b8', 0.9, [-45, 38, 25]] };
  var GRAV = 9.81, LANCER = 0.42, R_GREEN = 7, RB = 0.035, DECAL_BALLE = 0.69;
  var CIBLES_BASE = [
    { nom: 'rouge', couleur: '#e2483d', emoji: '🔴', dist: 50, psi: 0.13 },
    { nom: 'jaune', couleur: '#f2c230', emoji: '🟡', dist: 90, psi: -0.15 },
    { nom: 'bleue', couleur: '#3f7fd9', emoji: '🔵', dist: 135, psi: 0.04 }
  ];
  function portee(p) { return 10 + p * 160; }
  function puissancePour(d) { return (d - 10) / 160; }
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function dirDe(psi, v) { return (v || new THREE.Vector3()).set(-Math.sin(psi), 0, -Math.cos(psi)); }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }
  function pancarte(texte, fond, encre, w, h, gras) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(32, Math.round(1024 * h / w));
    var x = c.getContext('2d'); x.fillStyle = fond; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = encre; x.font = (gras || 900) + ' ' + Math.round(c.height * 0.56) + 'px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texte, c.width / 2, c.height / 2 + 3);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  }
  function grilleFilet() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'); x.strokeStyle = 'rgba(40,45,50,0.9)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(64, 0); x.moveTo(0, 0); x.lineTo(0, 64); x.stroke();
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  // relief autour du practice : plat sur la plaine, garrigue vallonnée au-delà
  function horsPractice(x, z) { var dx = Math.max(0, Math.abs(x) - 78), dz = Math.max(0, -285 - z, z - 40); return Math.sqrt(dx * dx + dz * dz); }
  function bruit(x, z) { return 0.5 + 0.5 * (Math.sin(x * 0.013 + 1) * Math.cos(z * 0.011) * 0.6 + 0.4 * Math.sin(x * 0.031) * Math.sin(z * 0.027 + 2)); }
  function hTerrain(x, z) { var d = horsPractice(x, z), n = bruit(x, z); return -0.3 + lisse(0, 90, d) * (4 + n * 12) + lisse(250, 900, d) * n * 34; }

  // une montagne lointaine : profil de crête (u de -1 à 1 → hauteur 0..1), versants arrondis
  function montagne(profil, demiL, haut, demiP, couleurs) {
    var geo = new THREE.PlaneGeometry(demiL * 2, demiP * 2, 64, 18); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    function crete(u) {
      if (u <= profil[0][0]) return profil[0][1];
      for (var i = 1; i < profil.length; i++) if (u <= profil[i][0]) {
        var a = profil[i - 1], b = profil[i], t = (u - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
      return profil[profil.length - 1][1];
    }
    for (var i = 0; i < p.count; i++) {
      var u = p.getX(i) / demiL, v = p.getZ(i) / demiP;
      var k = Math.pow(Math.max(0, 1 - v * v), 0.75);
      var rides = 1 + 0.06 * Math.sin(u * 23 + v * 7) + 0.04 * Math.sin(u * 51 - v * 13);
      p.setY(i, crete(u) * haut * k * rides - 6);
    }
    var g = geo.toNonIndexed(); g.computeVertexNormals();
    var pa = g.attributes.position, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var cy = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, cx = (pa.getX(f) + pa.getX(f + 1)) / 2;
      var ny = (g.attributes.normal.getY(f));
      c.copy(AV.outils.varier(ny < 0.55 && cy > haut * 0.3 ? couleurs[2] : cy > haut * 0.62 ? couleurs[1] : couleurs[0], cx, cy, 0.12));
      for (var k2 = 0; k2 < 3; k2++) { cols[(f + k2) * 3] = c.r; cols[(f + k2) * 3 + 1] = c.g; cols[(f + k2) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  }

  // ---------- Lui : polo, casquette, club à la main ----------
  function golfeur() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    [-1, 1].forEach(function (c) { corps.add(bm(0.15, 0.8, 0.17, '#d8c9a8', c * 0.1, 0.4, 0)); });
    [-1, 1].forEach(function (c) { corps.add(bm(0.17, 0.08, 0.26, '#f4f4f0', c * 0.1, 0.04, 0.04)); });
    var t = AV.maille(new THREE.CylinderGeometry(0.19, 0.23, 0.62, 7), '#2f7d5b'); t.position.y = 1.11; corps.add(t);
    var col = AV.maille(new THREE.CylinderGeometry(0.12, 0.15, 0.06, 7), '#f4f4f0'); col.position.y = 1.43; corps.add(col);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var cas = AV.maille(new THREE.SphereGeometry(0.182, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), '#1d3557'); cas.position.y = 0.02; tete.add(cas);
    var visiere = AV.maille(new THREE.BoxGeometry(0.22, 0.02, 0.16), '#1d3557'); visiere.position.set(0, 0.04, 0.2); visiere.rotation.x = 0.15; tete.add(visiere);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.0, 0.152); tete.add(o); });
    var sourire = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); sourire.position.set(0, -0.06, 0.155); sourire.rotation.z = Math.PI; tete.add(sourire);
    AV.avatars.coiffer(tete, 'axel', { chapeau: true });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.27, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.065, 0.06, 0.28, 5), '#2f7d5b'); m.position.y = -0.14; b.add(m);
      var m2 = AV.maille(new THREE.CylinderGeometry(0.05, 0.045, 0.32, 5), '#eec29a'); m2.position.y = -0.44; b.add(m2);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.62; b.add(mn);
      bras.push(b);
    });
    // son club, appuyé au sol, tenu dans la main droite
    var club = new THREE.Group(); club.position.set(0.42, 0, 0.18); club.rotation.z = 0.12; g.add(club);
    var manche = AV.maille(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 5), '#c9ced6'); manche.position.y = 0.45; club.add(manche);
    var grip = AV.maille(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), '#222222'); grip.position.y = 0.8; club.add(grip);
    var tc = AV.maille(new THREE.BoxGeometry(0.1, 0.05, 0.06), '#8d939c'); tc.position.set(0.03, 0.03, 0); club.add(tc);
    return { groupe: g, corps: corps, bras: bras, tete: tete, club: club };
  }

  // =====================================================================
  AV.biomes.golf = function (cfg) {
    var rng = AV.rng(7007 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 9999, hauteur: function () { return 0; }, surface: 'herbe', ciel: CIEL, brouillard: [180, 3400],
      depart: { x: -DECAL_BALLE, z: -0.2, angle: Math.PI / 2 }, theme: 'golf', ambiance: 'cigales'
    });
    mo.loin = 3800;
    mo.sansAnimal = true;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe;
    var CIBLES = CIBLES_BASE.map(function (c) { return Object.assign({ touche: false }, c); });

    // ---------- Le sol : la plaine de practice tondue en bandes, puis la garrigue ----------
    var P = new AV.Fusion();
    for (var bI = 0; bI < 29; bI++) {
      var z0 = -1.35 - bI * 10, lg = bI === 0 ? 10 : 10;
      forme(P, new THREE.PlaneGeometry(156, lg), bI % 2 ? '#79a948' : '#86b552', 0, 0.02, z0 - lg / 2, 0, 1, 1, 1, -Math.PI / 2);
    }
    // l'avant-poste (herbe rase entre l'auvent et la plaine) et les bords plus rustiques
    forme(P, new THREE.PlaneGeometry(156, 34), '#80b04e', 0, 0.0, 23.25, 0, 1, 1, 1, -Math.PI / 2);
    var sol = P.maille(); sol.receiveShadow = true; G.add(sol);
    var plaine = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: '#8e9670' }));
    plaine.rotation.x = -Math.PI / 2; plaine.position.y = -4; G.add(plaine);
    G.add(AV.terrain(3200, 120, hTerrain, function (x, z, y) {
      var d = horsPractice(x, z), n = bruit(x * 3.1, z * 2.7);
      if (d < 6) return AV.outils.varier('#7eaa4a', x, z, 0.05);
      if (y > 26 && n > 0.62) return AV.outils.varier('#cfcabc', x, z, 0.1);
      if (n > 0.7) return AV.outils.varier('#b8ab7a', x, z, 0.12);
      return AV.outils.varier(n > 0.4 ? '#7f8c57' : '#6c7a47', x, z, 0.14);
    }));

    // ---------- Au loin : le Pic Saint-Loup et l'Hortus ----------
    var pic = montagne([[-1, 0], [-0.7, 0.2], [-0.35, 0.42], [-0.05, 0.6], [0.22, 0.82], [0.34, 1], [0.42, 0.78], [0.52, 0.42], [0.75, 0.2], [1, 0]],
      480, 175, 230, ['#7b8758', '#a9a595', '#b3ad9c']);
    pic.position.set(420, 0, -1700); G.add(pic);
    var hortus = montagne([[-1, 0], [-0.75, 0.3], [-0.55, 0.6], [-0.3, 0.68], [0.25, 0.7], [0.38, 0.64], [0.46, 0.18], [0.7, 0.08], [1, 0]],
      380, 120, 200, ['#76825a', '#8b9068', '#b5af9e']);
    hortus.position.set(-560, 0, -1880); G.add(hortus);
    // la petite croix et la chapelle au sommet du Pic (on les devine)
    var Lo = new AV.Fusion();
    forme(Lo, new THREE.BoxGeometry(3, 26, 3), '#e8e4da', 420 + 0.34 * 480, 175 + 4, -1700, 0, 1, 1, 1);
    forme(Lo, new THREE.BoxGeometry(14, 3, 3), '#e8e4da', 420 + 0.34 * 480, 175 + 10, -1700, 0, 1, 1, 1);
    // collines de garrigue lointaines, de part et d'autre
    for (var mt = 0; mt < 22; mt++) {
      var am = AV.entre(rng, -1.9, 1.9), dm = AV.entre(rng, 900, 2400);
      forme(Lo, new THREE.ConeGeometry(1, 1, 7), AV.choisir(rng, ['#8b9476', '#959d80', '#86906f']), -Math.sin(am) * dm, -8, -Math.cos(am) * dm, rng() * 3, AV.entre(rng, 140, 300), AV.entre(rng, 30, 70), AV.entre(rng, 140, 300));
    }
    G.add(Lo.maille());

    // ---------- Végétation : pins parasols, pins d'Alep, chênes verts, rochers calcaires ----------
    var V = new AV.Fusion();
    for (var t = 0; t < 900; t++) {
      var x, z;
      var zone = rng();
      if (zone < 0.38) { x = (rng() < 0.5 ? -1 : 1) * AV.entre(rng, 84, 170); z = AV.entre(rng, 40, -300); }
      else if (zone < 0.62) { x = AV.entre(rng, -200, 200); z = AV.entre(rng, -292, -420); }
      else if (zone < 0.75) { x = AV.entre(rng, -120, 120); z = AV.entre(rng, 30, 90); if (Math.abs(x) < 30 && z < 50) continue; }
      else { var a = AV.entre(rng, -2.2, 2.2), d = AV.entre(rng, 180, 600); x = -Math.sin(a) * d; z = -Math.cos(a) * d; if (horsPractice(x, z) < 8) continue; }
      var y = hTerrain(x, z) - 0.1, sorte = rng();
      if (sorte < 0.22) { // pin parasol
        var h = AV.entre(rng, 6, 10), pen = (rng() - 0.5) * 0.18;
        forme(V, new THREE.CylinderGeometry(0.2, 0.32, h, 6), '#7a5c44', x, y + h / 2, z, 0, 1, 1, 1, 0, pen);
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4f6b3a', '#5a7540', '#46623a']), x + Math.sin(-pen) * h * 0.5, y + h + 0.4, z, rng() * 3, AV.entre(rng, 3.6, 5.2), AV.entre(rng, 1.2, 1.7), AV.entre(rng, 3.6, 5.2));
      } else if (sorte < 0.42) { // pin d'Alep
        var h2 = AV.entre(rng, 5, 9);
        forme(V, new THREE.CylinderGeometry(0.14, 0.24, h2, 5), '#7a6048', x, y + h2 / 2, z, 0, 1, 1, 1, 0, (rng() - 0.5) * 0.25);
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5f7d46', '#6f8a4e', '#56723f']), x, y + h2, z, rng() * 3, AV.entre(rng, 2, 3), AV.entre(rng, 1.4, 2), AV.entre(rng, 2, 3));
      } else if (sorte < 0.82) { // chêne vert, buisson de garrigue
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5e6e3e', '#6b7a46', '#77864f', '#8a8a52']), x, y + 0.5, z, rng() * 3, AV.entre(rng, 0.9, 2.4), AV.entre(rng, 0.7, 1.6), AV.entre(rng, 0.9, 2.4));
      } else {
        forme(V, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ['#dedad0', '#cfcabc', '#e6e2d8']), x, y + 0.2, z, rng() * 3, AV.entre(rng, 0.6, 2), AV.entre(rng, 0.4, 1.1), AV.entre(rng, 0.6, 1.8));
      }
    }
    var vegM = V.maille(); vegM.castShadow = true; G.add(vegM);

    // ---------- Les postes de practice : l'auvent, les tapis, les séparations ----------
    var S = new AV.Fusion();
    var BAIES = []; for (var k = -6; k <= 5; k++) BAIES.push(k * 2.5);
    forme(S, new THREE.BoxGeometry(31, 0.12, 5.6), '#cfc8ba', -1.25, -0.04, 1.45, 0, 1, 1, 1);               // dalle
    forme(S, new THREE.BoxGeometry(31, 0.08, 0.25), '#b7ae9e', -1.25, 0.0, -1.3, 0, 1, 1, 1);                 // bordure
    BAIES.forEach(function (bx, i) {
      forme(S, new THREE.BoxGeometry(1.9, 0.03, 1.5), '#3d8a3e', bx - 0.3, 0.015, -0.2, 0, 1, 1, 1);          // tapis
      forme(S, new THREE.BoxGeometry(0.5, 0.04, 1.5), '#2f7533', bx - 0.85, 0.016, -0.2, 0, 1, 1, 1);          // zone des pieds
      forme(S, new THREE.CylinderGeometry(0.02, 0.025, 0.04, 6), '#333333', bx, 0.04, -0.2, 0, 1, 1, 1);       // tee en caoutchouc
      if (i < BAIES.length - 1) forme(S, new THREE.BoxGeometry(0.08, 0.8, 1.4), '#8a6a48', bx + 1.25, 0.4, 1.45, 0, 1, 1, 1); // séparation
      // panier de balles + banc
      forme(S, new THREE.CylinderGeometry(0.2, 0.16, 0.26, 8), '#2e5e34', bx - 1.0, 0.13, 0.95, 0, 1, 1, 1);
      forme(S, new THREE.IcosahedronGeometry(0.17, 1), '#f6f6f2', bx - 1.0, 0.26, 0.95, 0, 1, 0.45, 1);
      forme(S, new THREE.BoxGeometry(1.2, 0.08, 0.35), '#8a6a48', bx, 0.45, 3.4, 0, 1, 1, 1);
      forme(S, new THREE.BoxGeometry(0.08, 0.45, 0.3), '#5a5f66', bx - 0.5, 0.22, 3.4, 0, 1, 1, 1);
      forme(S, new THREE.BoxGeometry(0.08, 0.45, 0.3), '#5a5f66', bx + 0.5, 0.22, 3.4, 0, 1, 1, 1);
    });
    for (var po = 0; po <= 6; po++) {
      var px = -16.25 + po * 5; // sur les lignes de séparation : jamais devant la caméra

      forme(S, new THREE.BoxGeometry(0.18, 3.25, 0.18), '#5a5f66', px, 1.62, -1.15, 0, 1, 1, 1);
      forme(S, new THREE.BoxGeometry(0.18, 2.95, 0.18), '#5a5f66', px, 1.47, 5.5, 0, 1, 1, 1);
      forme(S, new THREE.BoxGeometry(0.12, 0.25, 7.0), '#5a5f66', px, 3.12, 2.15, 0, 1, 1, 1, 0.04);
    }
    forme(S, new THREE.BoxGeometry(31.6, 0.12, 7.8), '#ded7c8', -1.25, 3.3, 2.15, 0, 1, 1, 1, 0.04);         // toit
    forme(S, new THREE.BoxGeometry(31.6, 0.55, 0.14), '#2f5f3a', -1.25, 3.18, -1.62, 0, 1, 1, 1);           // bandeau avant
    forme(S, new THREE.BoxGeometry(31.6, 2.9, 0.12), '#c9b79a', -1.25, 1.45, 5.8, 0, 1, 1, 1);             // mur du fond
    forme(S, new THREE.BoxGeometry(31, 0.12, 2), '#cfc8ba', -1.25, -0.04, 5.25, 0, 1, 1, 1);               // dalle (fond)
    // distributeur de balles au bout de l'auvent
    forme(S, new THREE.BoxGeometry(1.1, 1.8, 0.8), '#c0392b', 13.3, 0.9, 3.4, 0, 1, 1, 1);
    forme(S, new THREE.BoxGeometry(0.6, 0.4, 0.05), '#22262b', 13.3, 1.3, 2.99, 0, 1, 1, 1);
    forme(S, new THREE.BoxGeometry(0.3, 0.2, 0.25), '#555a60', 13.3, 0.5, 2.9, 0, 1, 1, 1);
    // le club-house, derrière (tuiles et murs clairs)
    forme(S, new THREE.BoxGeometry(18, 4, 9), '#ece2cf', 4, 2, 16, 0, 1, 1, 1);
    forme(S, new THREE.ConeGeometry(1, 1, 4), '#c56a45', 4, 5.2, 16, Math.PI / 4, 13.5, 2.4, 7.2);
    forme(S, new THREE.BoxGeometry(6, 2.2, 0.1), '#3b5f78', 2, 1.6, 11.45, 0, 1, 1, 1);
    var abri = S.maille(); abri.castShadow = true; abri.receiveShadow = true; G.add(abri);
    var ens = pancarte('GOLF DU PIC SAINT-LOUP  ·  PRACTICE', '#2f5f3a', '#f4efe2', 10, 0.5);
    ens.position.set(-1.25, 3.18, -1.7); ens.rotation.y = Math.PI; G.add(ens);
    var ens2 = pancarte('BALLES', '#c0392b', '#ffffff', 1.0, 0.3); ens2.position.set(13.3, 1.65, 2.99); ens2.rotation.y = Math.PI; G.add(ens2);
    var ens3 = pancarte('⛳ Club-house', '#ece2cf', '#2f5f3a', 5, 0.8); ens3.position.set(4, 3.4, 11.44); ens3.rotation.y = Math.PI; G.add(ens3);

    // l'écran de suivi de balle du poste
    var ecranC = document.createElement('canvas'); ecranC.width = 512; ecranC.height = 288;
    var ecranT = new THREE.CanvasTexture(ecranC);
    function majEcran(portee, ecart, txt) {
      var x = ecranC.getContext('2d');
      x.fillStyle = '#11161d'; x.fillRect(0, 0, 512, 288);
      x.fillStyle = '#ff6a3d'; x.fillRect(0, 0, 512, 46);
      x.fillStyle = '#fff'; x.font = '900 28px Nunito, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
      x.fillText('SUIVI DE BALLE · POSTE 7', 18, 24);
      x.font = '700 30px Nunito, sans-serif'; x.fillStyle = '#9fb3c8';
      x.fillText('PORTÉE', 24, 100); x.fillText('ÉCART', 24, 170);
      x.font = '900 52px Nunito, sans-serif'; x.fillStyle = '#ffffff'; x.textAlign = 'right';
      x.fillText(portee == null ? '–' : portee + ' m', 490, 100);
      x.fillText(ecart == null ? '–' : ecart, 490, 170);
      x.font = '700 28px Nunito, sans-serif'; x.fillStyle = '#ffd24a'; x.textAlign = 'center';
      x.fillText(txt || 'Prête ? ⛳', 256, 245);
      ecranT.needsUpdate = true;
    }
    majEcran(null, null);
    (function () {
      var e = new THREE.Group(); e.position.set(1.05, 0, 1.75); e.rotation.y = -0.5; e.scale.setScalar(0.85); G.add(e);
      e.add(bm(0.08, 0.95, 0.08, '#2b2f35', 0, 0.47, 0));
      e.add(bm(0.86, 0.52, 0.06, '#2b2f35', 0, 1.15, -0.01));
      var ec = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), new THREE.MeshBasicMaterial({ map: ecranT }));
      ec.position.set(0, 1.15, 0.025); e.add(ec);
    })();

    // ---------- Filets latéraux ----------
    var texF = grilleFilet(), F2 = new AV.Fusion();
    [-1, 1].forEach(function (c) {
      for (var zp = 4; zp >= -96; zp -= 25) forme(F2, new THREE.CylinderGeometry(0.12, 0.16, 14, 6), '#4a4f55', c * 78, 7, zp, 0, 1, 1, 1);
      var fil = new THREE.Mesh(new THREE.PlaneGeometry(100, 13), new THREE.MeshBasicMaterial({ map: texF, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      fil.material.map = texF; texF.repeat.set(100 / 0.6, 13 / 0.6);
      fil.position.set(c * 78, 7.2, -46); fil.rotation.y = Math.PI / 2; G.add(fil);
    });
    G.add(F2.maille());

    // ---------- Panneaux de distance ----------
    [50, 100, 150, 200].forEach(function (d) {
      [-1, 1].forEach(function (c) {
        var gp = new THREE.Group(); gp.position.set(c * (36 + d * 0.12), 0, -d); G.add(gp);
        gp.add(bm(0.12, 1.4, 0.12, '#f4f4f0', -0.9, 0.7, 0)); gp.add(bm(0.12, 1.4, 0.12, '#f4f4f0', 0.9, 0.7, 0));
        var pn = pancarte(String(d), '#f4f4f0', d === 100 ? '#d94a4a' : d === 150 ? '#2f6fb5' : d === 200 ? '#2b2340' : '#e2a71e', 2.4, 1.2);
        pn.position.set(0, 1.9, 0.07); gp.add(pn);
        var dos = bm(2.5, 1.3, 0.1, '#e4e0d6', 0, 1.9, 0); gp.add(dos);
      });
    });

    // ---------- Les 3 greens-cibles ----------
    var drapeaux = [];
    CIBLES.forEach(function (c, i) {
      c.x = -Math.sin(c.psi) * c.dist; c.z = -Math.cos(c.psi) * c.dist;
      var g = new THREE.Group(); g.position.set(c.x, 0, c.z); G.add(g);
      var green = new THREE.Mesh(new THREE.CircleGeometry(R_GREEN, 40), new THREE.MeshLambertMaterial({ color: '#a2d464' }));
      green.rotation.x = -Math.PI / 2; green.position.y = 0.04; green.receiveShadow = true; g.add(green);
      var bord = new THREE.Mesh(new THREE.RingGeometry(R_GREEN - 0.35, R_GREEN, 48), new THREE.MeshBasicMaterial({ color: c.couleur }));
      bord.rotation.x = -Math.PI / 2; bord.position.y = 0.05; g.add(bord);
      var milieu = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.1, 36), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      milieu.rotation.x = -Math.PI / 2; milieu.position.y = 0.05; g.add(milieu);
      var trou = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshBasicMaterial({ color: '#1e2a18' }));
      trou.rotation.x = -Math.PI / 2; trou.position.y = 0.055; g.add(trou);
      g.add(bm(0.06, 3.0, 0.06, '#f4f4f0', 0, 1.5, 0));
      var fgeo = new THREE.PlaneGeometry(1.2, 0.8, 8, 2); fgeo.translate(0.6, 0, 0);
      var drap = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ color: c.couleur, side: THREE.DoubleSide }));
      drap.position.set(0.03, 2.6, 0); g.add(drap);
      drapeaux.push({ m: drap, base: fgeo.attributes.position.array.slice(), ph: i * 1.7 });
      var lab = AV.texteSprite(c.emoji + ' ' + c.dist + ' m', { fond: 'rgba(27,35,64,.78)', largeur: 3 + c.dist * 0.05, echelle: 0.5 });
      lab.position.y = 4.4 + c.dist * 0.025; g.add(lab);
      var halo = AV.halo('#ffe9a0', 18); halo.position.y = 0.6; halo.material.opacity = 0; g.add(halo);
      c.green = green; c.label = lab; c.halo = halo; c.groupe = g;
    });
    mo.anime(function (dt, t) {
      for (var i = 0; i < drapeaux.length; i++) {
        var d = drapeaux[i], a = d.m.geometry.attributes.position, b = d.base;
        for (var v = 0; v < a.count; v++) { var x = b[v * 3]; a.array[v * 3 + 2] = Math.sin(x * 5 - t * 7 + d.ph) * 0.09 * x; }
        a.needsUpdate = true;
      }
      CIBLES.forEach(function (c) { if (c.touche) c.halo.material.opacity = 0.25 + Math.sin(t * 3) * 0.1; });
    });

    // ---------- Balles éparpillées sur le practice + la voiturette ramasse-balles ----------
    (function () {
      var n = 900, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var d = Math.pow(rng(), 0.8) * 220 + 15, a = (rng() - 0.5) * 0.9;
        pos[i * 3] = Math.max(-74, Math.min(74, -Math.sin(a) * d)); pos[i * 3 + 1] = 0.07; pos[i * 3 + 2] = -Math.cos(a) * d;
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      G.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.13, map: AV.textureRonde(), transparent: true, depthWrite: false })));
    })();
    var ramasse = new THREE.Group(); G.add(ramasse);
    (function () {
      ramasse.add(bm(1.3, 0.6, 1.9, '#e8c33a', 0, 0.6, 0));
      ramasse.add(bm(1.2, 0.08, 1.2, '#3b4148', 0, 1.9, 0.1));
      [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.7], [0.6, 0.7]].forEach(function (p) { ramasse.add(bm(0.05, 1.0, 0.05, '#3b4148', p[0], 1.4, p[1])); });
      [-1, 1].forEach(function (c) { [-0.6, 0.6].forEach(function (zz) { var r = AV.maille(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10), '#222'); r.rotation.z = Math.PI / 2; r.position.set(c * 0.72, 0.28, zz); ramasse.add(r); }); });
      for (var gI = -1; gI <= 1; gI++) { var rou = AV.maille(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 8), '#9aa0a8'); rou.rotation.z = Math.PI / 2; rou.position.set(gI * 0.95, 0.22, -1.6 - Math.abs(gI) * 0.4); ramasse.add(rou); }
    })();
    var rx0 = 0, rz0 = -205;
    mo.anime(function (dt, t) {
      var x = 58 * Math.sin(t * 0.045), z = -205 + 22 * Math.sin(t * 0.013);
      var dx = x - rx0, dz = z - rz0;
      if (dx * dx + dz * dz > 1e-6) ramasse.rotation.y = Math.atan2(-dx, -dz) + Math.PI;
      ramasse.position.set(x, 0, z); rx0 = x; rz0 = z;
    });

    // ---------- Lui, au poste d'à côté ----------
    var lui = golfeur(); lui.groupe.position.set(-2.0, 0, 0.55); G.add(lui.groupe);
    var luiDepart = lui.groupe.position.clone();

    // ---------- La balle, la trace et la ligne de visée ----------
    var B0 = new THREE.Vector3(0, RB, -0.2);
    var balle = AV.maille(new THREE.IcosahedronGeometry(RB * 1.4, 1), '#ffffff'); balle.position.copy(B0); G.add(balle);
    var halo = AV.halo('#ffffff', 1.2); halo.material.opacity = 0; balle.add(halo);
    var NTRACE = 500, traceA = new Float32Array(NTRACE * 3), traceG = new THREE.BufferGeometry();
    traceG.setAttribute('position', new THREE.BufferAttribute(traceA, 3)); traceG.setDrawRange(0, 0);
    var traceM = new THREE.LineBasicMaterial({ color: '#ff6a3d', transparent: true, opacity: 0.95 });
    var trace = new THREE.Line(traceG, traceM); trace.frustumCulled = false; G.add(trace);
    var nTrace = 0;
    function traceVider() { nTrace = 0; traceG.setDrawRange(0, 0); traceM.opacity = 0.95; }
    function tracePoint(p) {
      if (nTrace >= NTRACE) return;
      if (nTrace > 0) { var i = (nTrace - 1) * 3, dx = p.x - traceA[i], dy = p.y - traceA[i + 1], dz = p.z - traceA[i + 2]; if (dx * dx + dy * dy + dz * dz < 0.25) return; }
      traceA[nTrace * 3] = p.x; traceA[nTrace * 3 + 1] = p.y; traceA[nTrace * 3 + 2] = p.z; nTrace++;
      traceG.attributes.position.needsUpdate = true; traceG.setDrawRange(0, nTrace);
    }
    var viseG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1.2), new THREE.Vector3(0, 0, -36)]);
    var viseM = new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.9, gapSize: 0.7, transparent: true, opacity: 0.85 });
    var vise = new THREE.Line(viseG, viseM); vise.computeLineDistances(); vise.position.set(B0.x, 0.06, B0.z); G.add(vise);
    var marque = AV.texteSprite('', { fond: 'rgba(27,35,64,.8)', largeur: 4, echelle: 0.5 }); marque.visible = false; G.add(marque);
    function majMarque(txt) {
      G.remove(marque); AV.detruire(marque);
      marque = AV.texteSprite(txt, { fond: 'rgba(27,35,64,.82)', largeur: 2.2, echelle: 0.45 }); G.add(marque);
    }

    // ---------- Le club de la joueuse (bras + club qui pivotent ensemble) ----------
    var plan = new THREE.Group(); plan.position.set(0, 1.3, 0.08); plan.rotation.x = -0.16;
    var swingG = new THREE.Group(); plan.add(swingG);
    (function () {
      var br = AV.maille(new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6), '#4a7bd1'); br.position.y = -0.3; swingG.add(br);
      var mains = AV.maille(new THREE.IcosahedronGeometry(0.09, 0), '#ffffff'); mains.position.y = -0.63; swingG.add(mains);
      var grip = AV.maille(new THREE.CylinderGeometry(0.022, 0.02, 0.2, 6), '#222222'); grip.position.y = -0.7; swingG.add(grip);
      var manche = AV.maille(new THREE.CylinderGeometry(0.012, 0.01, 0.6, 5), '#c9ced6'); manche.position.y = -1.08; swingG.add(manche);
      var tc = AV.maille(new THREE.BoxGeometry(0.11, 0.05, 0.06), '#8d939c'); tc.position.set(0.035, -1.37, 0); swingG.add(tc);
    })();

    // ---------- Interface : jauge de puissance + barre de précision ----------
    var ui = null, uiRempli, uiCurseur, uiTexte, uiPrec, uiAiguille, uiTicks = [];
    function construireUI() {
      ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;left:50%;bottom:calc(max(28px, env(safe-area-inset-bottom)) + 74px);transform:translateX(-50%);width:min(560px,66vw);z-index:4;pointer-events:none;font-family:Nunito,sans-serif;color:#fff;text-align:center;transition:opacity .25s;opacity:0';
      uiTexte = document.createElement('div');
      uiTexte.style.cssText = 'font-weight:900;font-size:17px;margin-bottom:6px;text-shadow:0 1px 3px rgba(0,0,0,.6)';
      var barre = document.createElement('div');
      barre.style.cssText = 'position:relative;height:26px;border-radius:13px;background:rgba(27,35,64,.78);border:2px solid rgba(255,255,255,.85);overflow:visible';
      uiRempli = document.createElement('div');
      uiRempli.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;border-radius:11px;background:linear-gradient(90deg,#7ad06a,#ffd24a 60%,#ff6a3d)';
      barre.appendChild(uiRempli);
      CIBLES.forEach(function (c) {
        var tk = document.createElement('div'), l = puissancePour(c.dist) * 100;
        tk.style.cssText = 'position:absolute;top:-5px;bottom:-5px;width:6px;margin-left:-3px;border-radius:3px;border:1px solid #fff;left:' + l + '%;background:' + c.couleur;
        var et = document.createElement('div'); et.textContent = c.dist + ' m';
        et.style.cssText = 'position:absolute;top:30px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:900;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.7)';
        tk.appendChild(et); barre.appendChild(tk); uiTicks.push({ el: tk, et: et, c: c });
      });
      uiCurseur = document.createElement('div');
      uiCurseur.style.cssText = 'position:absolute;top:-8px;bottom:-8px;width:4px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 6px #000;left:0';
      barre.appendChild(uiCurseur);
      uiPrec = document.createElement('div');
      uiPrec.style.cssText = 'position:relative;height:20px;width:60%;margin:30px auto 0;border-radius:10px;background:linear-gradient(90deg,#e2483d,#f2c230 30%,#7ad06a 42%,#7ad06a 58%,#f2c230 70%,#e2483d);border:2px solid rgba(255,255,255,.85);opacity:.35';
      uiAiguille = document.createElement('div');
      uiAiguille.style.cssText = 'position:absolute;top:-7px;bottom:-7px;width:4px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 6px #000;left:50%';
      uiPrec.appendChild(uiAiguille);
      ui.appendChild(uiTexte); ui.appendChild(barre); ui.appendChild(uiPrec);
      document.body.appendChild(ui);
    }
    function majUI() {
      if (!ui) return;
      var vis = etat === 'viser' || etat === 'puissance' || etat === 'precision' || etat === 'frappe';
      ui.style.opacity = vis ? '1' : '0';
      uiRempli.style.width = (pow * 100) + '%';
      uiCurseur.style.left = (pow * 100) + '%';
      uiPrec.style.opacity = etat === 'precision' || etat === 'frappe' ? '1' : '0.35';
      uiAiguille.style.left = (50 + prec * 50) + '%';
      uiTicks.forEach(function (t) { t.el.style.opacity = t.c.touche ? '0.35' : '1'; t.et.textContent = t.c.touche ? '✔' : t.c.dist + ' m'; });
      uiTexte.innerHTML = etat === 'viser' ? '← → viser · ✋ swing' : etat === 'puissance' ? 'Puissance · ≈ <b>' + Math.round(portee(pow)) + ' m</b> · ✋ stop !'
        : etat === 'precision' ? '✋ quand l\'aiguille passe dans le vert !' : '&nbsp;';
    }

    // ---------- État du jeu ----------
    var etat = 'intro', tEtat = 0, psi = 0, pow = 0, sensJ = 1, prec = -1, sensP = 1, aide = 1, ratesSuite = 0, tirs = 0;
    var api = null, parole = null, J = null, cam0 = null;
    var vel = new THREE.Vector3(), courbe = 0, droite = new THREE.Vector3(), Fshot = new THREE.Vector3(), auSol = false, rebonds = 0, atterri = null, tVol = 0;
    var coeurs = [], tCoeur = 0;
    var vF = new THREE.Vector3(), vR = new THREE.Vector3(), vC = new THREE.Vector3(), vL = new THREE.Vector3();
    function dire(t, d) { parole = { texte: t, t: d || 2.8 }; }
    function nbTouches() { return CIBLES.filter(function (c) { return c.touche; }).length; }
    function sousTitre() {
      if (!api) return;
      var s = CIBLES.map(function (c) { return c.emoji + (c.touche ? '✔' : ''); }).join(' ');
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, etat === 'calin' || etat === 'fini' ? '⛳ Les 3 cibles en ' + tirs + ' balle' + (tirs > 1 ? 's' : '') + ' ! ❤'
        : '🎯 Cibles : ' + s + ' · ⛳ ' + tirs + ' balle' + (tirs > 1 ? 's' : ''));
    }
    function cibleVisee() {
      var best = null, bd = 0.05;
      CIBLES.forEach(function (c) { if (c.touche) return; var d = Math.abs(c.psi - psi); if (d < bd) { bd = d; best = c; } });
      return best;
    }

    mo.debut = function (a) { api = a; construireUI(); sousTitre(); majUI(); };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'intro') return '⛳ Practice du Golf du Pic Saint-Loup · fais atterrir une balle sur chacun des <b>3 greens</b> !';
      if (etat === 'viser') {
        var cv = cibleVisee();
        if (tirs === 0) return '← → pour viser un drapeau, puis ✋ pour lancer la jauge de puissance';
        return cv ? '🎯 Visée : cible ' + cv.nom + ' (' + cv.dist + ' m) · arrête la jauge sur son repère' : null;
      }
      return null;
    };

    function placerJoueuse() {
      if (!J) return;
      // elle se tient à côté de la balle, de profil par rapport à la cible (droitière)
      var th = psi + Math.PI / 2;
      J.position.set(B0.x - Math.sin(th) * DECAL_BALLE, 0, B0.z - Math.cos(th) * DECAL_BALLE); // elle reste au poste, seule la balle part
      J.groupe.rotation.y = th;
      J.ombre.position.set(J.position.x, 0.04, J.position.z); J.ombre.scale.setScalar(1);
    }
    function poseSwing(beta, dt) {
      if (!J) return;
      var pr = J.parts;
      if (plan.parent !== pr.corps) { pr.corps.add(plan); }
      pr.brasG.visible = pr.brasD.visible = false; plan.visible = true;
      swingG.rotation.z = beta;
      pr.corps.rotation.set(0.15, Math.max(-0.5, Math.min(0.9, beta * 0.18)), 0);
      pr.corps.position.y = 0;
      pr.tete.rotation.set(0.35, -pr.corps.rotation.y * 0.8, 0);
      pr.jambeG.rotation.set(0, 0, -0.12); pr.jambeD.rotation.set(0, 0, 0.12);
    }
    var beta = -0.05;

    function nouvelleBalle() {
      balle.position.copy(B0); balle.visible = true; halo.material.opacity = 0;
      vise.visible = true; marque.visible = false;
      etat = 'viser'; tEtat = 0; pow = 0; prec = -1; beta = -0.05;
      traceM.opacity = 0.35;
      sousTitre();
    }
    function lancerBalle(p, e) {
      var gratte = false; // (plus de « gratte » : l'aiguille fait des allers-retours)
      var C = portee(gratte ? p * 0.35 : p) * (1 - Math.abs(e) * 0.12);
      var ps = psi - e * 0.08; // aiguille en retard (e > 0) : ça part à droite et ça slice
      dirDe(ps, Fshot); droite.set(-Fshot.z, 0, Fshot.x);
      var ang = gratte ? 0.12 : LANCER;
      var v = Math.sqrt(C * GRAV / Math.sin(2 * ang));
      vel.set(Fshot.x * v * Math.cos(ang), v * Math.sin(ang), Fshot.z * v * Math.cos(ang));
      courbe = e * 2.4;
      auSol = false; rebonds = 0; atterri = null; tVol = 0;
      traceVider(); tracePoint(balle.position);
      vise.visible = false; halo.material.opacity = 0.85;
      tirs++; etat = 'vol'; tEtat = 0;
      AV.audio.impact(0.5 + p * 0.5);
      if (gratte) dire('😅 Oups, gratte !', 2);
      sousTitre();
    }
    // la balle touche le sol pour la 1ère fois
    function evaluer(p, final) {
      var gagne = null;
      CIBLES.forEach(function (c) {
        if (c.touche || gagne) return;
        var dx = p.x - c.x, dz = p.z - c.z;
        if (dx * dx + dz * dz <= R_GREEN * R_GREEN) gagne = c;
      });
      if (gagne) {
        gagne.touche = true; ratesSuite = 0;
        AV.audio.etoile(); AV.audio.ping(1); AV.audio.bravo();
        AV.confettis(60);
        var n = nbTouches();
        dire(n === 3 ? '💙 ' + nomLui + ' : « Les trois !! Viens là toi… ❤ »'
          : '🎯 Cible ' + gagne.nom + ' touchée ! 💙 ' + nomLui + ' : « ' + auHasard(['Sur le green !! 😍', 'Magnifique ! 🤩', 'Joli coup, championne ! 🏆', 'Tiger Woods n\'a qu\'à bien se tenir 😎']) + ' » · plus que ' + (3 - n), 4.2);
        sousTitre();
        return true;
      }
      return false;
    }
    function commenter(p) {
      // cible restante la plus proche du point d'atterrissage
      var best = null, bd = 1e9;
      CIBLES.forEach(function (c) { if (c.touche) return; var d = (p.x - c.x) * (p.x - c.x) + (p.z - c.z) * (p.z - c.z); if (d < bd) { bd = d; best = c; } });
      var dist = Math.round(Math.sqrt((p.x - B0.x) * (p.x - B0.x) + (p.z - B0.z) * (p.z - B0.z)));
      if (!best) return;
      dirDe(best.psi, vF); vR.set(-vF.z, 0, vF.x);
      vL.set(p.x - B0.x, 0, p.z - B0.z);
      var along = vL.dot(vF) - best.dist, lat = vL.dot(vR);
      var ecart = Math.round(Math.abs(lat)) + ' m ' + (lat < 0 ? 'G' : 'D');
      majEcran(dist, ecart, 'Cible ' + best.nom + ' : ' + (along < 0 ? 'court de ' : 'long de ') + Math.round(Math.abs(along)) + ' m');
      ratesSuite++;
      var txt;
      if (Math.abs(along) > Math.abs(lat)) txt = along < 0 ? auHasard(['Un peu court… 😉', 'Presque ! Encore un peu plus fort', 'Il manque quelques mètres !']) : auHasard(['Trop fort ! 💪', 'Waouh la puissance… un peu moins !', 'Ça passe au-dessus !']);
      else txt = lat < 0 ? auHasard(['Ça part à gauche… vise un peu plus à droite ←→', 'À gauche ! Attention à l\'aiguille']) : auHasard(['Ça file à droite… vise un peu plus à gauche', 'À droite ! L\'aiguille, bien au milieu']);
      if (ratesSuite % 3 === 0 && aide > 0.6) { aide = Math.max(0.6, aide - 0.13); txt += ' · Tiens, je te ralentis la jauge 😉'; }
      dire('💙 ' + nomLui + ' : « ' + txt + ' » · ' + dist + ' m', 3.4);
    }

    function majBalle(dt) {
      var pas = 4, h = dt / pas;
      for (var i = 0; i < pas; i++) {
        var p = balle.position;
        if (!auSol) {
          vel.y -= GRAV * h;
          vel.x += droite.x * courbe * h; vel.z += droite.z * courbe * h;
          p.addScaledVector(vel, h);
          if (p.y <= RB) {
            p.y = RB; rebonds++;
            if (!atterri) {
              atterri = p.clone();
              var dist = Math.round(Math.sqrt((p.x - B0.x) * (p.x - B0.x) + (p.z - B0.z) * (p.z - B0.z)));
              majMarque(dist + ' m'); marque.position.set(p.x, 1.6, p.z); marque.visible = true;
              if (!evaluer(p)) atterri.rate = true;
              else majEcran(dist, '🎯', 'Sur le green ! ⛳');
            }
            AV.audio.pas('herbe');
            var kh = rebonds === 1 ? 0.38 : 0.6;
            vel.x *= kh; vel.z *= kh; vel.y = -vel.y * 0.28;
            if (vel.y < 1.0) { vel.y = 0; auSol = true; }
          }
        } else {
          var sp = Math.sqrt(vel.x * vel.x + vel.z * vel.z), sp2 = Math.max(0, sp - 5 * h);
          if (sp > 1e-4) { vel.x *= sp2 / sp; vel.z *= sp2 / sp; }
          p.addScaledVector(vel, h);
          if (sp2 <= 0) break;
        }
      }
      if (!auSol || tVol < 0.3) tracePoint(balle.position);
      tVol += dt;
      var arretee = auSol && vel.x * vel.x + vel.z * vel.z < 1e-4;
      if (arretee || tVol > 14 || Math.abs(balle.position.x) > 160 || balle.position.z < -330) {
        // la balle finit sa course sur un green ? ça compte aussi
        if (atterri && atterri.rate) { if (!evaluer(balle.position)) commenter(atterri); else majEcran(Math.round(atterri.distanceTo(B0)), '🎯', 'Elle a roulé sur le green !'); }
        etat = 'arret'; tEtat = 0; halo.material.opacity = 0;
      }
    }

    var coupe = false;
    function lancerCalin() {
      etat = 'transition'; tEtat = 0;
      var fd = document.getElementById('fondu'); fd.classList.add('noir');
      setTimeout(function () {
        if (etat !== 'transition') return; // on a quitté le jour entre-temps
        etat = 'calin'; tEtat = 0; coupe = true;
        psi = 0; balle.visible = false; vise.visible = false; marque.visible = false; traceM.opacity = 0;
        placerJoueuse();
        sousTitre();
        fd.classList.remove('noir');
        AV.audio.portail();
      }, 600);
    }

    // ---------- Pilote : appelé à chaque image par le moteur ----------
    mo.pilote = function (dt, e, appui, joueur, camera) {
      J = joueur;
      tEtat += dt; if (parole) parole.t -= dt;
      var cible = new THREE.Vector3(), regard = new THREE.Vector3(), kCam = 1 - Math.exp(-dt * 4);
      dirDe(psi, vF);

      if (etat === 'intro') {
        if (!cam0) { cam0 = true; camera.position.set(10, 46, -175); }
        var ti = Math.min(1, tEtat / 4.2), te = ti * ti * (3 - 2 * ti), ty = 1 - Math.pow(1 - te, 2.2); // descend avant de passer sous l'auvent
        cible.set(AV.lerp(10, 0.45, te), AV.lerp(46, 1.65, ty), AV.lerp(-175, 4.8, te));
        regard.set(0, AV.lerp(0, -0.6, te), AV.lerp(-80, -25.2, te));
        camera.position.copy(cible); camera.lookAt(regard);
        if (tEtat > 4.4 || (appui && tEtat > 0.8)) { nouvelleBalle(); traceM.opacity = 0; }
        poseSwing(-0.05); placerJoueuse(); majUI();
        luiIdle(dt);
        return;
      }

      if (etat === 'viser') {
        psi = Math.max(-0.6, Math.min(0.6, psi - e.x * dt * 0.55));
        vise.rotation.y = psi;
        if (appui) { etat = 'puissance'; tEtat = 0; pow = 0; sensJ = 1; AV.audio.clic(); }
        beta = AV.lerp(beta, -0.05 + Math.sin(tEtat * 2.2) * 0.06, Math.min(1, dt * 6)); // petit « waggle »
      } else if (etat === 'puissance') {
        pow += sensJ * dt * 0.62 * aide;
        if (pow >= 1) { pow = 1; sensJ = -1; }
        beta = -0.2 - pow * 2.3;
        if (appui) { etat = 'precision'; tEtat = 0; prec = -1; sensP = 1; AV.audio.clic(); }
        else if (pow <= 0 && sensJ < 0) { pow = 0; etat = 'viser'; tEtat = 0; dire('⏱️ Trop tard ! Appuie sur ✋ quand la jauge arrive sur le repère de ta cible', 3); AV.audio.erreur(); }
      } else if (etat === 'precision') {
        // l'aiguille fait des allers-retours gauche ↔ droite jusqu'à l'appui
        prec += sensP * dt * 1.6 * aide;
        if (prec >= 1) { prec = 1; sensP = -1; } else if (prec <= -1) { prec = -1; sensP = 1; }
        if (appui) {
          var ee = Math.max(-1, Math.min(1, prec));
          if (Math.abs(ee) < 0.16) ee *= 0.25; // dans le vert : quasi parfait
          etat = 'frappe'; tEtat = 0; prec = ee;
          AV.audio.clic();
        }
      } else if (etat === 'frappe') {
        var b0 = -0.2 - pow * 2.3, td = 0.22;
        beta = tEtat < td ? AV.lerp(b0, 0, Math.pow(tEtat / td, 1.6)) : Math.min(2.7, AV.lerp(0, 2.7, (tEtat - td) / 0.25));
        if (tEtat >= td) lancerBalle(pow, prec); // contact : la balle part (état « vol »)
      }
      if (etat === 'vol') {
        beta = AV.lerp(beta, 2.6, Math.min(1, dt * 8)); // on tient le finish
        majBalle(dt);
      } else if (etat === 'arret') {
        beta = AV.lerp(beta, 2.6, Math.min(1, dt * 8));
        if (tEtat > 2.2) { vel.set(0, 0, 0); if (nbTouches() >= 3) lancerCalin(); else nouvelleBalle(); }
      }

      if (etat === 'transition') { majUI(); return; }
      if (etat === 'calin' || etat === 'fini') { calin(dt, camera); majUI(); return; }
      // étiquettes des cibles : cachées quand la caméra passe tout près (sinon elles deviennent énormes)
      CIBLES.forEach(function (c) { var dx = camera.position.x - c.x, dz = camera.position.z - c.z; c.label.visible = dx * dx + dz * dz > 28 * 28; });

      poseSwing(beta); placerJoueuse(); majUI();
      luiIdle(dt);

      // ---------- Caméra ----------
      if (etat === 'vol' || etat === 'arret') {
        var bp = balle.position;
        cible.copy(bp).addScaledVector(Fshot, -11); cible.y = Math.max(2.2, bp.y * 0.6 + 3.6);
        if (cible.z > -2.5) cible.y = Math.min(cible.y, 2.6); // pas à travers le toit de l'auvent
        if (tVol < 0.35 && etat === 'vol') cible.lerpVectors(camera.position, cible, tVol / 0.35);
        camera.position.lerp(cible, 1 - Math.exp(-dt * 2.6));
        regard.copy(bp); regard.y = Math.max(0.3, bp.y * 0.8);
        if (!camRegard) camRegard = regard.clone();
        camRegard.lerp(regard, 1 - Math.exp(-dt * 6));
        camera.lookAt(camRegard);
      } else {
        dirDe(psi, vF); vR.set(-vF.z, 0, vF.x);
        cible.copy(B0).addScaledVector(vF, -5.0).addScaledVector(vR, 0.45); cible.y = 1.65;
        regard.copy(B0).addScaledVector(vF, 25); regard.y = -0.6;
        camera.position.lerp(cible, kCam);
        if (!camRegard) camRegard = regard.clone();
        camRegard.lerp(regard, kCam);
        camera.lookAt(camRegard);
      }
    };
    var camRegard = null;

    // lui : il regarde, il applaudit les beaux coups
    function luiIdle(dt) {
      var t = performance.now() / 1000, fete = parole && parole.t > 0 && /🎯|Les trois/.test(parole.texte);
      var g = lui.groupe, p = J ? J.position : B0;
      g.rotation.y = AV.angleLerp(g.rotation.y, Math.atan2(p.x - g.position.x, p.z - g.position.z) - 0.5, Math.min(1, dt * 3));
      lui.bras[0].rotation.x = AV.lerp(lui.bras[0].rotation.x, fete ? -2.6 + Math.sin(t * 16) * 0.3 : 0, Math.min(1, dt * 6));
      lui.bras[1].rotation.x = AV.lerp(lui.bras[1].rotation.x, fete ? -2.6 - Math.sin(t * 16) * 0.3 : -0.25, Math.min(1, dt * 6));
      lui.corps.position.y = fete ? Math.abs(Math.sin(t * 7)) * 0.12 : Math.sin(t * 1.6) * 0.01;
      lui.club.visible = !fete;
      lui.tete.rotation.y = Math.sin(t * 0.5) * 0.15;
    }

    // ---------- Le gros câlin ----------
    var calinP = new THREE.Vector3();
    function calin(dt, camera) {
      var pr = J.parts, g = lui.groupe, me = J.position;
      // elle pose son club et se tourne vers lui
      plan.visible = false; pr.brasG.visible = pr.brasD.visible = true;
      pr.corps.rotation.set(0, 0, 0); pr.tete.rotation.set(0, 0, 0); pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
      calinP.set(me.x - 0.62, 0, me.z + 0.02);
      var dx = calinP.x - g.position.x, dz = calinP.z - g.position.z, d = Math.sqrt(dx * dx + dz * dz);
      lui.club.visible = false;
      var arrive = d < 0.05;
      if (!arrive) {
        var v = Math.min(d, dt * 2.6); g.position.x += dx / d * v; g.position.z += dz / d * v;
        g.rotation.y = AV.angleLerp(g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8));
        var ph = tEtat * 9;
        lui.corps.position.y = Math.abs(Math.sin(ph)) * 0.05;
        lui.bras[0].rotation.set(Math.sin(ph) * 0.6, 0, -0.1); lui.bras[1].rotation.set(-Math.sin(ph) * 0.6, 0, 0.1);
        J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, Math.atan2(g.position.x - me.x, g.position.z - me.z), Math.min(1, dt * 5));
        pr.brasG.rotation.set(-0.6, 0, -0.5); pr.brasD.rotation.set(-0.6, 0, 0.5); // elle ouvre les bras
        if (etat === 'calin') tCalin = 0;
      } else {
        tCalin += dt;
        g.rotation.y = AV.angleLerp(g.rotation.y, Math.PI / 2, Math.min(1, dt * 8));
        J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, -Math.PI / 2, Math.min(1, dt * 8));
        var berce = Math.sin(tCalin * 2.2) * 0.08;
        g.rotation.y += berce; J.groupe.rotation.y += berce;
        // bras autour l'un de l'autre
        pr.brasG.rotation.set(-1.25, 0, 0.75); pr.brasD.rotation.set(-1.25, 0, -0.75);
        lui.bras[0].rotation.set(-1.2, 0, 0.8); lui.bras[1].rotation.set(-1.2, 0, -0.8);
        lui.corps.rotation.x = 0.12; pr.corps.rotation.x = 0.12;
        pr.corps.position.y = Math.min(0.06, tCalin * 0.1); // sur la pointe des pieds
        lui.tete.rotation.set(0.25, 0, 0.2);
        // des cœurs qui s'envolent
        tCoeur -= dt;
        if (tCoeur <= 0) {
          tCoeur = 0.3;
          var c = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.8 });
          c.position.set((me.x + g.position.x) / 2 + (Math.random() - 0.5) * 0.8, 2.0, me.z + (Math.random() - 0.5) * 0.6);
          G.add(c); coeurs.push({ s: c, t: 0 });
          if (Math.random() < 0.4) AV.audio.ping(0.4);
        }
        if (tCalin > 4.2 && etat === 'calin') { etat = 'fini'; sousTitre(); if (api) api.trouver(); }
      }
      for (var i = coeurs.length - 1; i >= 0; i--) {
        var h = coeurs[i]; h.t += dt; h.s.position.y += dt * 0.7; h.s.position.x += Math.sin(h.t * 3 + i) * dt * 0.2;
        h.s.material.opacity = Math.max(0, 1 - h.t / 2.2);
        if (h.t > 2.2) { G.remove(h.s); AV.detruire(h.s); coeurs.splice(i, 1); }
      }
      J.ombre.position.set(me.x, 0.04, me.z);
      // caméra côté practice : on les voit sous l'auvent
      var mx = (me.x + g.position.x) / 2, mz = (me.z + g.position.z) / 2;
      var cp = new THREE.Vector3(mx + 2.0, 1.6, mz - 3.2), cv = new THREE.Vector3(mx, 1.15, mz);
      if (coupe) { coupe = false; camera.position.set(-1.0 + 3.0, 1.75, -0.2 - 4.0); camRegard = cv.clone(); CIBLES.forEach(function (c) { c.label.visible = true; }); }
      camera.position.lerp(cp, 1 - Math.exp(-dt * 1.6));
      if (!camRegard) camRegard = cv.clone();
      camRegard.lerp(cv, 1 - Math.exp(-dt * 2));
      camera.lookAt(camRegard);
    }
    var tCalin = 0;

    mo.nettoyer = function () {
      if (etat === 'transition') { var fd = document.getElementById('fondu'); if (fd) fd.classList.remove('noir'); }
      etat = 'parti';
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui);
      ui = null;
      if (J) {
        var pr = J.parts;
        if (plan.parent) plan.parent.remove(plan);
        AV.detruire(plan);
        pr.brasG.visible = pr.brasD.visible = true;
        pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15);
        pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0);
        pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
      }
    };

    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etat: etat, psi: psi, pow: pow, prec: prec, tirs: tirs, aide: aide, touches: CIBLES.map(function (c) { return c.touche; }), balle: balle.position.toArray().map(function (v) { return Math.round(v * 10) / 10; }) }; },
      viser: function (n) { psi = CIBLES[n].psi; vise.rotation.y = psi; },
      tirer: function (p, e) { var ps = psi; nouvelleBalle(); psi = ps; pow = p; prec = e || 0; etat = 'frappe'; tEtat = 0; },
      tirerSur: function (n) { this.viser(n); this.tirer(puissancePour(CIBLES[n].dist), 0); },
      toutToucher: function () { CIBLES.forEach(function (c) { c.touche = true; }); lancerCalin(); }
    };
    return mo;
  };
})(window.AV);
