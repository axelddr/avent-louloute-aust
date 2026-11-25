/* Biome « cinema » : salle de cinéma confort (fauteuils inclinables rouges).
   Un couple est assis au milieu de la salle. Le chat se cache dans la cabine de projection :
   quand on toque à la vitre, il prend peur, saute sur le bouton du projecteur… et le film démarre
   sur le grand écran (vidéo de surprise.fichiers[0], sinon un écran « ajoute ta vidéo »). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  // ---------- Dimensions de la salle ----------
  var X = 10, ZF = -15, ZB = 12, PLAF = 9.5;       // intérieur : x ∈ [-X, X], z ∈ [ZF, ZB]
  var Z0 = -7, D = 2.0, R = 0.5, NR = 7;            // gradins : 7 rangées de fauteuils (avec un passage devant chaque rangée)
  function zSiege(k) { return Z0 + k * D + D - 0.55; } // fauteuils calés au fond de chaque marche
  var HAUT = (NR + 1) * R;                           // palier du haut (4 m), devant la cabine
  var BLOC = 7.6;                                    // demi-largeur du bloc de fauteuils
  var ECRAN = { y: 5.2, l: 14, h: 7.875, z: ZF + 0.26 };
  var LENTILLE = new THREE.Vector3(0, HAUT + 1.55, 9.75);
  var CAM_SEANCE = { pos: new THREE.Vector3(0, 4.2, 3.7), cible: new THREE.Vector3(0, 3.7, ECRAN.z) };
  var CIEL = { haut: '#000000', bas: '#0b0608', brouillard: '#0b0608', hemi: ['#ffd9c4', '#3a1d24', 0.72], soleil: ['#ffe6cc', 0.35, [0.25, 1, 0.45]] };

  function hauteur(x, z) {
    if (z < -13.4) return 0.35;                      // petite estrade sous l'écran
    if (z < Z0) return 0;
    var u = (z - Z0) / D;
    if (Math.abs(x) > BLOC + 0.1) return Math.min(HAUT, R * 0.5 * (Math.floor(u * 2) + 1)); // marches des allées
    return Math.min(HAUT, R * (Math.floor(u) + 1));
  }

  // ---------- Fusion de géométries (une seule maille pour ~100 fauteuils) ----------
  var Fusion = AV.Fusion, matrice = AV.matrice;
  function boite(l, h, p, couleur, x, y, z, ombre) {
    var b = AV.maille(new THREE.BoxGeometry(l, h, p), couleur, !!ombre);
    b.position.set(x, y, z);
    return b;
  }

  // ---------- Fauteuil inclinable (regarde +z, inc = 0 droit, 1 incliné) ----------
  function fauteuil(inc) {
    var g = new THREE.Group(), rouge = '#b3122e', rougeF = '#8a0c22', noir = '#1e1014';
    g.add(boite(0.86, 0.32, 0.8, noir, 0, 0.16, -0.02, true));
    g.add(boite(0.76, 0.2, 0.72, rouge, 0, 0.42, 0.04, true));
    var dos = new THREE.Group(); dos.position.set(0, 0.45, -0.34); dos.rotation.x = -(0.14 + inc * 0.42); g.add(dos);
    dos.add(boite(0.76, 0.8, 0.2, rouge, 0, 0.42, -0.02, true));
    dos.add(boite(0.82, 0.92, 0.08, rougeF, 0, 0.45, -0.15, true));
    dos.add(boite(0.62, 0.24, 0.16, rouge, 0, 0.92, 0.05, true));
    [-1, 1].forEach(function (c) {
      g.add(boite(0.13, 0.3, 0.82, noir, c * 0.46, 0.62, -0.02, true));
      g.add(boite(0.14, 0.05, 0.7, '#3a2228', c * 0.46, 0.79, -0.06, true));
      var gob = AV.maille(new THREE.CylinderGeometry(0.055, 0.045, 0.06, 7), '#0c0c0c'); gob.position.set(c * 0.46, 0.8, 0.32); g.add(gob);
    });
    var jam = new THREE.Group(); jam.position.set(0, 0.36, 0.38); jam.rotation.x = -1.25 * inc; g.add(jam);
    jam.add(boite(0.7, 0.34, 0.1, rouge, 0, -0.17, 0, true));
    return g;
  }

  // ---------- Spectateur assis dans un fauteuil incliné ----------
  function spectateur(o) {
    var g = new THREE.Group();
    var torse = new THREE.Group(); torse.position.set(0, 0.56, -0.18); torse.rotation.x = -0.5; g.add(torse);
    var t = AV.maille(new THREE.CylinderGeometry(0.19, 0.24, 0.56, 8), o.haut); t.position.y = 0.28; torse.add(t);
    var cou = AV.maille(new THREE.CylinderGeometry(0.075, 0.08, 0.16, 6), o.peau); cou.position.y = 0.6; torse.add(cou);
    var tete = new THREE.Group(); tete.position.y = 0.8; torse.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.2, 1), o.peau));
    [-1, 1].forEach(function (c) {
      var oe = AV.maille(new THREE.SphereGeometry(0.03, 6, 4), '#2b2340', false); oe.position.set(c * 0.075, 0.02, 0.18); tete.add(oe);
      var j = AV.maille(new THREE.SphereGeometry(0.035, 6, 4), '#f29a9a', false); j.position.set(c * 0.12, -0.05, 0.15); j.scale.z = 0.4; tete.add(j);
    });
    var sourire = AV.maille(new THREE.TorusGeometry(0.045, 0.012, 4, 8, Math.PI), '#8a3a3a', false); sourire.position.set(0, -0.07, 0.185); sourire.rotation.z = Math.PI; tete.add(sourire);
    var cap = AV.maille(new THREE.SphereGeometry(0.218, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), o.cheveux);
    cap.rotation.x = -0.45; cap.position.y = 0.01; tete.add(cap);
    if (o.longs) {
      tete.add(boite(0.36, 0.5, 0.12, o.cheveux, 0, -0.2, -0.13, true));
      [-1, 1].forEach(function (c) { tete.add(boite(0.07, 0.38, 0.12, o.cheveux, c * 0.19, -0.14, 0.0, true)); });
    }
    if (o.bonnet) {
      var bn = AV.maille(new THREE.ConeGeometry(0.21, 0.32, 8), '#d94a4a'); bn.position.set(0, 0.24, -0.04); bn.rotation.x = -0.35; tete.add(bn);
      var rv = AV.maille(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 8), '#ffffff'); rv.position.set(0, 0.12, -0.02); rv.rotation.x = -0.35; tete.add(rv);
    }
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux, chapeau: !!o.bonnet });
    [-1, 1].forEach(function (c) {
      var bras = new THREE.Group(); bras.position.set(c * 0.25, 0.48, 0); bras.rotation.set(-0.65, 0, c * 0.35); torse.add(bras);
      var b = AV.maille(new THREE.CylinderGeometry(0.065, 0.058, 0.46, 6), o.haut); b.position.y = -0.23; bras.add(b);
      var m = AV.maille(new THREE.IcosahedronGeometry(0.065, 0), o.peau); m.position.y = -0.48; bras.add(m);
      g.add(boite(0.16, 0.16, 0.5, o.bas, c * 0.1, 0.6, 0.06, true));
      var tib = new THREE.Group(); tib.position.set(c * 0.1, 0.6, 0.3); tib.rotation.x = -1.25; g.add(tib);
      tib.add(boite(0.14, 0.46, 0.14, o.bas, 0, -0.23, 0, true));
      tib.add(boite(0.15, 0.1, 0.24, '#2b2b2b', 0, -0.48, 0.06, true));
    });
    return { groupe: g, tete: tete, torse: torse };
  }

  // ---------- Textures ----------
  function textureMoquette() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d');
    x.fillStyle = '#3b1820'; x.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      var cx = i * 32 + (j % 2) * 16 + 8, cy = j * 32 + 16;
      x.strokeStyle = '#542430'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#8a5a2a'; x.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    return t;
  }
  function affiche(titre, sous, c1, c2) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 384;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 384);
    g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 256, 384);
    x.fillStyle = 'rgba(255,255,255,.12)';
    for (var i = 0; i < 30; i++) { x.beginPath(); x.arc(Math.random() * 256, Math.random() * 230, Math.random() * 2 + 0.5, 0, 7); x.fill(); }
    x.textAlign = 'center'; x.fillStyle = '#fff';
    var mots = titre.split(' '), lignes = [], l = '';
    x.font = '900 34px Nunito, sans-serif';
    mots.forEach(function (m) { var e = l ? l + ' ' + m : m; if (x.measureText(e).width > 220 && l) { lignes.push(l); l = m; } else l = e; });
    lignes.push(l);
    lignes.forEach(function (li, k) { x.fillText(li, 128, 250 + k * 38 - (lignes.length - 1) * 19); });
    x.font = '700 17px Nunito, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(sous, 128, 340);
    x.font = '700 14px Nunito, sans-serif'; x.fillStyle = '#ffd27a'; x.fillText('★★★★★', 128, 365);
    var grp = new THREE.Group();
    grp.add(boite(1.5, 2.2, 0.06, '#c9a04a', 0, 0, -0.03));
    var p = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.04), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), emissive: '#ffffff', emissiveIntensity: 0.25 }));
    p.material.emissiveMap = p.material.map; p.position.z = 0.01; grp.add(p);
    return grp;
  }

  // =====================================================================
  AV.biomes.cinema = function (cfg) {
    var m = new AV.Monde({
      rayon: 40, hauteur: hauteur, surface: 'moquette', ciel: CIEL, brouillard: [60, 200],
      depart: { x: 5.5, z: -9.5, angle: -0.45 }, theme: 'cinema', ambiance: null
    });
    var nom = cfg.nom || AV.nomAnimal(cfg.animal);
    var enseigne = cfg.enseigne || 'Cinéma';
    var surprise = cfg.surprise || {};
    var fichier = surprise.type === 'video' ? ((surprise.fichiers && surprise.fichiers[0]) || 'media/jour' + (cfg.jour < 10 ? '0' : '') + cfg.jour + '.mp4') : null;
    var G = m.groupe;

    // ---------- Sol, gradins, marches ----------
    var moq = new THREE.MeshLambertMaterial({ map: textureMoquette() });
    function dalle(l, h, p, x, y, z) { var b = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), moq); b.position.set(x, y, z); b.receiveShadow = true; G.add(b); m.bloqueurs.push(b); return b; }
    dalle(2 * X, 0.1, ZB - ZF, 0, -0.05, (ZB + ZF) / 2);
    dalle(2 * X, 0.35, 1.6, 0, 0.175, ZF + 0.8);
    var leds = new Fusion(), led = boite(0.32, 0.04, 0.04, '#ffb347', 0, 0, 0);
    for (var k = 0; k <= NR; k++) {
      var z0 = Z0 + k * D, h = (k + 1) * R;
      dalle(2 * BLOC + 0.2, h, ZB - z0, 0, h / 2, (z0 + ZB) / 2);
    }
    for (var j = 0; j < 2 * (NR + 1); j++) {
      var zj = Z0 + j * D / 2, hj = R * 0.5 * (j + 1);
      [-1, 1].forEach(function (s) {
        dalle(X - BLOC - 0.1, hj, ZB - zj, s * (BLOC + 0.1 + (X - BLOC - 0.1) / 2), hj / 2, (zj + ZB) / 2);
        [8.3, 9.4].forEach(function (lx) { leds.ajouter(led, matrice(s * lx, hj + 0.02, zj + 0.03)); });
      });
    }
    // petites lumières au bout de chaque rangée
    for (var k2 = 0; k2 < NR; k2++) [-1, 1].forEach(function (s) { leds.ajouter(led, matrice(s * (BLOC + 0.02), (k2 + 1) * R - 0.12, Z0 + k2 * D + 0.03, Math.PI / 2)); });
    var ledsM = leds.maille(new THREE.MeshBasicMaterial({ vertexColors: true }));
    G.add(ledsM);

    // ---------- Murs, plafond ----------
    var murC = '#2c1a24';
    function mur(l, h, p, x, y, z) { var b = boite(l, h, p, murC, x, y, z); G.add(b); m.bloqueurs.push(b); return b; }
    mur(0.4, PLAF, ZB - ZF + 0.8, -X - 0.2, PLAF / 2, (ZB + ZF) / 2);
    mur(0.4, PLAF, ZB - ZF + 0.8, X + 0.2, PLAF / 2, (ZB + ZF) / 2);
    var avant = boite(2 * X + 0.8, PLAF, 0.4, '#120a0e', 0, PLAF / 2, ZF - 0.2); G.add(avant); m.bloqueurs.push(avant);
    mur(2 * X + 0.8, PLAF, 0.4, 0, PLAF / 2, ZB + 0.2);
    var plafond = boite(2 * X + 0.8, 0.4, ZB - ZF + 0.8, '#120b10', 0, PLAF + 0.2, (ZB + ZF) / 2); G.add(plafond); m.bloqueurs.push(plafond);
    m.colliders.push({ rect: true, x: -X - 0.2, z: (ZB + ZF) / 2, hx: 0.2, hz: (ZB - ZF) / 2 + 0.4, a: 0 });
    m.colliders.push({ rect: true, x: X + 0.2, z: (ZB + ZF) / 2, hx: 0.2, hz: (ZB - ZF) / 2 + 0.4, a: 0 });
    m.colliders.push({ rect: true, x: 0, z: ZF - 0.2, hx: X + 0.4, hz: 0.2, a: 0 });
    m.colliders.push({ rect: true, x: 0, z: ZB + 0.2, hx: X + 0.4, hz: 0.2, a: 0 });
    // panneaux acoustiques
    for (var zp = ZF + 1.5; zp < ZB - 0.5; zp += 2.6) {
      [-1, 1].forEach(function (s) { G.add(boite(0.08, 6.2, 1.9, '#4a1f2e', s * (X - 0.04), 5.2, zp)); });
    }
    // ciel étoilé au plafond
    var ne = 220, pe = new Float32Array(ne * 3);
    for (var e = 0; e < ne; e++) { pe[e * 3] = (Math.random() * 2 - 1) * (X - 0.5); pe[e * 3 + 1] = PLAF - 0.05; pe[e * 3 + 2] = ZF + 1 + Math.random() * (ZB - ZF - 2); }
    var ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pe, 3));
    var etoiles = new THREE.Points(ge, new THREE.PointsMaterial({ color: '#ffe7b0', size: 0.09, map: AV.textureRonde(), transparent: true, depthWrite: false }));
    G.add(etoiles);

    // ---------- Appliques murales ----------
    var appliques = [];
    [-10, -4, 2, 8].forEach(function (za) {
      [-1, 1].forEach(function (s) {
        var y = hauteur(s * 8.5, za) + 2.8;
        var a = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.36), new THREE.MeshBasicMaterial({ color: '#ffb36b' }));
        a.position.set(s * (X - 0.08), y, za); G.add(a);
        var hl = AV.halo('#ffb36b', 2.4); hl.material.opacity = 0.4; hl.position.set(s * (X - 0.3), y + 0.3, za); G.add(hl);
        appliques.push({ m: a, h: hl });
      });
    });
    var lumieres = [
      m.lumiere('#ffb88a', 0.75, 22, -8.5, 6, -3), m.lumiere('#ffb88a', 0.75, 22, 8.5, 6, -3),
      m.lumiere('#ffc9a0', 0.6, 18, 0, 7.5, 6)
    ];
    var basesL = lumieres.map(function (l) { return l.intensity; });

    // ---------- Écran, rideaux ----------
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 576;
    var cx = cv.getContext('2d');
    var texEcran = new THREE.CanvasTexture(cv);
    var ecran = new THREE.Mesh(new THREE.PlaneGeometry(ECRAN.l, ECRAN.h), new THREE.MeshBasicMaterial({ map: texEcran, color: '#9a9a9a', fog: false }));
    ecran.position.set(0, ECRAN.y, ECRAN.z); G.add(ecran);
    G.add(boite(ECRAN.l + 0.6, ECRAN.h + 0.6, 0.05, '#050505', 0, ECRAN.y, ECRAN.z - 0.04));
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 7; i++) {
        var pli = AV.maille(new THREE.CylinderGeometry(0.2, 0.24, PLAF - 0.4, 6), i % 2 ? '#8a0f22' : '#a3132a', false);
        pli.position.set(s * (7.6 + i * 0.34), (PLAF - 0.4) / 2 + 0.3, ZF + 0.25 + (i % 2) * 0.08); G.add(pli); m.bloqueurs.push(pli);
      }
    });
    G.add(boite(2 * X, 0.7, 0.35, '#7a0d1e', 0, PLAF - 0.35, ZF + 0.3));

    function texteEcran(txt, taille, y, couleur, police) {
      cx.font = (police || '900 ') + taille + 'px ' + (police ? 'Caveat, cursive' : 'Nunito, sans-serif');
      cx.fillStyle = couleur; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(txt, 512, y);
    }
    function dessinVeille() {
      var g = cx.createLinearGradient(0, 0, 0, 576); g.addColorStop(0, '#232838'); g.addColorStop(1, '#10131b');
      cx.fillStyle = g; cx.fillRect(0, 0, 1024, 576);
      texteEcran(enseigne, 76, 210, '#ffcf7a');
      texteEcran('Salle 1 · Confort', 40, 295, '#d9c7b0');
      texteEcran('Éteignez vos téléphones… la séance va bientôt commencer', 26, 390, '#8f98ad');
      texEcran.needsUpdate = true;
    }
    function dessinCompte(n, f) {
      cx.fillStyle = '#b9b2a3'; cx.fillRect(0, 0, 1024, 576);
      cx.fillStyle = 'rgba(0,0,0,.22)';
      cx.beginPath(); cx.moveTo(512, 288); cx.arc(512, 288, 700, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); cx.closePath(); cx.fill();
      cx.strokeStyle = '#2b2b2b'; cx.lineWidth = 6;
      cx.beginPath(); cx.arc(512, 288, 210, 0, 7); cx.stroke();
      cx.beginPath(); cx.arc(512, 288, 175, 0, 7); cx.stroke();
      cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, 288); cx.lineTo(1024, 288); cx.moveTo(512, 0); cx.lineTo(512, 576); cx.stroke();
      texteEcran(String(n), 280, 300, '#1a1a1a');
      cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 1;
      for (var i = 0; i < 6; i++) { var sx = Math.random() * 1024; cx.beginPath(); cx.moveTo(sx, 0); cx.lineTo(sx + Math.random() * 20 - 10, 576); cx.stroke(); }
      texEcran.needsUpdate = true;
    }
    function dessinSansVideo() {
      var g = cx.createRadialGradient(512, 288, 50, 512, 288, 600); g.addColorStop(0, '#5a3a4a'); g.addColorStop(1, '#1a1016');
      cx.fillStyle = g; cx.fillRect(0, 0, 1024, 576);
      if (fichier) {
        texteEcran('🎬 Ici passera notre film ❤', 62, 230, '#fff3e0');
        texteEcran('Ajoute ta vidéo : ' + fichier, 30, 330, '#ffcf7a');
      } else {
        texteEcran('❤ Une surprise t\'attend… ❤', 62, 270, '#fff3e0');
      }
      cx.fillStyle = 'rgba(255,255,255,.08)';
      for (var i = 0; i < 160; i++) cx.fillRect(Math.random() * 1024, Math.random() * 576, 2, 2);
      texEcran.needsUpdate = true;
    }
    function dessinFin() {
      cx.fillStyle = '#050505'; cx.fillRect(0, 0, 1024, 576);
      texteEcran('Fin', 190, 260, '#ffffff', '700 ');
      texteEcran('❤', 70, 410, '#ff5a7a');
      texEcran.needsUpdate = true;
    }
    dessinVeille();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (etatEcran === 'veille') dessinVeille(); });
    var etatEcran = 'veille';
    var lumEcran = m.lumiere('#cfe0ff', 0, 26, 0, 4.5, -11.5);

    // ---------- Porte de sortie (retour au village) ----------
    var zPorte = -8.6;
    G.add(boite(0.1, 2.5, 1.9, '#1a1216', X - 0.05, 1.25, zPorte));
    G.add(boite(0.08, 0.07, 1.4, '#c0c4cc', X - 0.12, 1.1, zPorte));
    var sortie = AV.outils.panneau('SORTIE', '#1f8a4c', '#ffffff', 1.3, 0.42);
    sortie.position.set(X - 0.1, 2.95, zPorte); sortie.rotation.y = -Math.PI / 2; G.add(sortie);
    m.interactifs.push({ type: 'retour', x: X - 0.7, z: zPorte, rayon: 1.7 });

    // ---------- Enseigne et affiches ----------
    var ens = AV.outils.panneau(enseigne + ' · Salle 1', '#14090d', '#ffcf7a', 6, 0.85);
    ens.position.set(0, 8.1, ZB - 0.06); ens.rotation.y = Math.PI; G.add(ens);
    [[-X + 0.06, -11, Math.PI / 2, 'PERTH STORY', 'Bientôt dans nos vies ☀️🦘', '#f08a4b', '#6a2a5a'],
     [-X + 0.06, -7.5, Math.PI / 2, 'LE QUOKKA SOURIT TOUJOURS', 'Une comédie australienne', '#3fa7a0', '#1d3a5a'],
     [X - 0.06, -11.2, -Math.PI / 2, nom.toUpperCase(), 'Le chat projectionniste 🎞️', '#5b5fb0', '#1b1530']].forEach(function (a) {
      var af = affiche(a[3], a[4], a[5], a[6]); af.position.set(a[0], 2.3, a[1]); af.rotation.y = a[2]; G.add(af);
    });

    // ---------- Fauteuils (fusionnés) ----------
    var siegesF = new Fusion(), modele = fauteuil(0);
    for (var r = 0; r < NR; r++) {
      var zr = zSiege(r), hr = (r + 1) * R;
      for (var i = 0; i < 14; i++) {
        if ((r === 3 || r === 4) && (i === 6 || i === 7)) continue; // places du couple (+ rangée libre derrière pour la vue)
        siegesF.ajouter(modele, matrice(-6.825 + i * 1.05, hr, zr, Math.PI));
      }
      // collisions : une bande par rangée (on peut marcher dans le passage devant)
      if (r === 4) {
        [-1, 1].forEach(function (s) { m.colliders.push({ rect: true, x: s * 4.2, z: zr, hx: 3.15, hz: 0.5, a: 0 }); });
      } else m.colliders.push({ rect: true, x: 0, z: zr, hx: 7.35, hz: 0.5, a: 0 });
    }
    AV.detruire(modele);
    var sieges = siegesF.maille(); sieges.castShadow = sieges.receiveShadow = true; G.add(sieges);

    // ---------- Le couple (rangée 4, au milieu) ----------
    var zc = zSiege(3), hc = 4 * R;
    m.colliders.push({ rect: true, x: 0, z: zc - 0.45, hx: 1.05, hz: 0.4, a: 0 }); // repose-jambes déployés
    // c'est nous : Axel est déjà installé, la place de gauche attend Océane (habillée comme la joueuse du jour)
    var tO = (AV.avatars && AV.avatars.tenue(cfg)) || {}, cO = AV.avatars ? AV.avatars.couleurs : {};
    var hautO = tO.veste || tO.robe || tO.haut || '#1d1c22', basO = tO.collants || (tO.type === 'robe' || tO.type === 'maillot' ? cO.peauO : tO.bas) || '#3b3550';
    var couple = [
      { x: -0.525, cote: -1, o: { qui: 'oceane', peau: cO.peauO || '#f2c9a0', cheveux: '#5a3420', longs: true, haut: hautO, bas: basO } },
      { x: 0.525, cote: 1, o: { qui: 'axel', peau: '#eec29a', cheveux: '#2b1d14', longs: false, haut: '#2f3b5a', bas: '#2f3b52' } }
    ];
    couple.forEach(function (p) {
      var f = fauteuil(1); f.position.set(p.x, hc, zc); f.rotation.y = Math.PI; G.add(f);
      var s = spectateur(p.o); s.groupe.position.set(p.x, hc, zc); s.groupe.rotation.y = Math.PI; G.add(s.groupe);
      p.s = s;
    });
    var elleAssise = couple[0].s.groupe; elleAssise.visible = false;
    // pop-corn et soda
    var seau = new THREE.Group();
    var cs = document.createElement('canvas'); cs.width = 64; cs.height = 16;
    var xs = cs.getContext('2d'); for (var b = 0; b < 8; b++) { xs.fillStyle = b % 2 ? '#ffffff' : '#d61f2e'; xs.fillRect(b * 8, 0, 8, 16); }
    seau.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.3, 12, 1, true), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cs), side: THREE.DoubleSide })));
    for (var pc = 0; pc < 9; pc++) { var g1 = AV.maille(new THREE.IcosahedronGeometry(0.05, 0), '#fff1c2'); g1.position.set((Math.random() - 0.5) * 0.18, 0.15 + Math.random() * 0.06, (Math.random() - 0.5) * 0.18); seau.add(g1); }
    seau.position.set(0.525 + 0.47, hc + 0.97, zc - 0.25); G.add(seau);
    var soda = new THREE.Group();
    var gb = AV.maille(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 8), '#2a6ad1'); soda.add(gb);
    var pa = AV.maille(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4), '#ffffff'); pa.position.set(0.02, 0.17, 0); pa.rotation.z = 0.2; soda.add(pa);
    soda.position.set(-0.525 - 0.46, hc + 0.92, zc - 0.32); G.add(soda);

    // ---------- Rejoindre Axel : on s'assoit à côté de lui ----------
    var photoC = cfg.photoCouple || {}, assise = null, dejaVenue = false;
    var CAM_A = { pos: new THREE.Vector3(-1.7, hc + 1.75, zc - 1.9), cible: new THREE.Vector3(0, hc + 1.05, zc + 0.1) };
    var DIALOGUE = [
      [0.4, 'Te voilà ! Je t\'ai gardé ta place ❤'],
      [3.0, 'Pop-corn sucré, évidemment 🍿'],
      [5.6, 'Par contre… le film devrait déjà avoir commencé 🤔'],
      [8.4, 'Je parie que ' + nom + ' fait encore des siennes là-haut… 🐱'],
      [11.2, 'Tu vas voir dans la cabine ? Je garde le pop-corn 😇']
    ];
    var intA = {
      x: -0.525, z: zc, rayon: 2.3, texte: '🍿 ✋ T\'asseoir à côté d\'' + nomLui(),
      fn: function () { asseoir(false); }
    };
    m.interactifs.push(intA);
    function nomLui() { return cfg.copain || 'Axel'; }
    function asseoir(pourFilm) {
      if (assise) return;
      var J = AV.jeu.joueur();
      assise = { t: 0, film: pourFilm, x: J.groupe.position.x, z: J.groupe.position.z, a: J.angle, k: 0, lignes: !pourFilm && !dejaVenue };
      J.groupe.visible = false; elleAssise.visible = true; intA.__x = intA.x; intA.x = 1e6;
      if (!pourFilm) { AV.audio.clic && AV.audio.clic(); m.pilote = piloteAssise; }
      if (!assise.lignes && !pourFilm) bulle(AV.choisir(Math.random, ['❤', 'Alors, ce chat ? 🐱', 'Toujours pas de film… 🙄']) + '  (✋ te lever)', 0.45, hc + 1.55, zc + 0.35, 2.6, 1.9);
    }
    function lever() {
      if (!assise) return;
      var a = assise; assise = null; dejaVenue = true;
      m.pilote = null; elleAssise.visible = false;
      var J = AV.jeu.joueur(); J.groupe.visible = true; AV.jeu.placer(a.x, a.z, a.a);
      intA.x = intA.__x;
      if (a.lignes && !photoC.passer) setTimeout(function () {
        AV.recompenses.ouvrir({ jour: cfg.jour, titre: photoC.titre || 'Nous deux ❤',
          surprise: { type: 'photo', fichiers: photoC.fichiers || ['media/jour01-nous.jpg'], texte: photoC.texte || '' } },
          function () { AV.controles.vider(); });
      }, 400);
    }
    var vC = new THREE.Vector3();
    function piloteAssise(dt, e, appui, joueur, camera) {
      var a = assise; if (!a) return;
      a.t += dt;
      vC.copy(CAM_A.pos); camera.position.lerp(vC, Math.min(1, dt * 3)); camera.lookAt(CAM_A.cible);
      if (a.lignes) {
        while (a.k < DIALOGUE.length && a.t > DIALOGUE[a.k][0]) { bulle(DIALOGUE[a.k][1], 0.45, hc + 1.55, zc + 0.35, 2.5, 1.9); a.k++; }
        if (a.k >= DIALOGUE.length && a.t > 13.2 && !a.selfie) { a.selfie = true; bulle('📸 Souriez !', 0, hc + 1.6, zc + 0.35, 2.2, 1.6); for (var c = 0; c < 4; c++) setTimeout(coeurCouple, c * 150); }
        if (a.t > 14.4) { lever(); return; }
        if (appui && a.t > 1) a.t = a.k < DIALOGUE.length ? DIALOGUE[a.k][0] : Math.max(a.t, 13.2); // ✋ = réplique suivante
      } else if (appui && a.t > 0.4) lever();
    }

    // bulles de texte dans le monde
    var bulles = [];
    function bulle(texte, x, y, z, vie, largeur) {
      var s = AV.bulleBD(texte);
      s.position.set(x, y, z); s.userData.vie = vie || 2.5; G.add(s); bulles.push(s);
    }
    function coeurCouple() {
      var s = AV.texteSprite('❤', { couleur: '#ff5a7a', largeur: 0.4 });
      s.position.set((Math.random() - 0.5) * 0.3, hc + 1.5, zc + 0.4); s.userData.vie = 1.8; G.add(s); bulles.push(s);
    }

    // ---------- Cabine de projection ----------
    var cab = new THREE.Group(); G.add(cab);
    var cabC = '#3a2a33', zCab = 9.3, zMil = (zCab + ZB) / 2;
    cab.add(boite(0.15, 3, ZB - zCab, cabC, -2.8, HAUT + 1.5, zMil));
    cab.add(boite(0.15, 3, ZB - zCab, cabC, 2.8, HAUT + 1.5, zMil));
    cab.add(boite(5.75, 0.9, 0.15, cabC, 0, HAUT + 0.45, zCab));
    cab.add(boite(5.75, 0.9, 0.15, cabC, 0, HAUT + 2.55, zCab));
    [-1, 1].forEach(function (s) { cab.add(boite(0.45, 1.2, 0.15, cabC, s * 2.63, HAUT + 1.5, zCab)); });
    cab.add(boite(5.9, 0.15, ZB - zCab + 0.1, '#2a1d25', 0, HAUT + 3.05, zMil));
    cab.add(boite(5.0, 0.08, 0.2, '#c9a04a', 0, HAUT + 0.92, zCab - 0.05));
    var vitre = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), new THREE.MeshPhongMaterial({ color: '#a8c8ff', transparent: true, opacity: 0.14, shininess: 120, depthWrite: false, side: THREE.DoubleSide }));
    vitre.position.set(0, HAUT + 1.5, zCab - 0.01); cab.add(vitre);
    cab.children.forEach(function (o) { if (o !== vitre) m.bloqueurs.push(o); });
    m.colliders.push({ rect: true, x: 0, z: zMil, hx: 2.9, hz: (ZB - zCab) / 2 + 0.1, a: 0 });
    var plaque = AV.outils.panneau('🎞️ Cabine de projection', '#1c1418', '#ffcf7a', 2.8, 0.42);
    plaque.position.set(0, HAUT + 0.5, zCab - 0.12); plaque.rotation.y = Math.PI; G.add(plaque);
    var lumCab = m.lumiere('#ffc890', 0.9, 6, 0, HAUT + 2.6, 10.9);
    // table, projecteur, bobines
    G.add(boite(1.8, 1.2, 1.4, '#2b2f3a', 0.4, HAUT + 0.6, 10.7, true));
    G.add(boite(0.7, 0.7, 1.0, '#4b5670', 0, HAUT + 1.55, 10.6, true));
    var obj = AV.maille(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 10), '#1b1b22'); obj.rotation.x = Math.PI / 2; obj.position.set(0, HAUT + 1.55, 9.95); G.add(obj);
    var verre = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), new THREE.MeshBasicMaterial({ color: '#33384a' }));
    verre.position.set(0, HAUT + 1.55, 9.78); verre.rotation.y = Math.PI; G.add(verre);
    var bobines = [];
    [10.25, 10.95].forEach(function (zb) {
      var bo = new THREE.Group(); bo.position.set(0, HAUT + 2.3, zb); G.add(bo);
      var disque = AV.maille(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12), '#9aa3b5'); disque.rotation.z = Math.PI / 2; bo.add(disque);
      bo.add(boite(0.08, 0.66, 0.08, '#4b5670', 0, 0, 0));
      bo.add(boite(0.08, 0.08, 0.66, '#4b5670', 0, 0, 0));
      bobines.push(bo);
    });
    var bouton = AV.maille(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 10), '#e23a3a'); bouton.position.set(0.95, HAUT + 1.23, 10.3); G.add(bouton);
    // boîtes de films empilées (cachette du chat), gamelle
    for (var bf = 0; bf < 4; bf++) {
      var bt = AV.maille(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12), bf % 2 ? '#c0392b' : '#9aa3b5'); bt.position.set(1.95, HAUT + 0.12 + bf * 0.25, 10.9); bt.rotation.y = bf; G.add(bt);
    }
    var gam = AV.maille(new THREE.CylinderGeometry(0.2, 0.15, 0.1, 10), '#f29aaa'); gam.position.set(-1.9, HAUT + 0.05, 11.2); G.add(gam);
    var gamN = AV.texteSprite(nom, { couleur: '#ffffff', contour: '#7a2a3a', largeur: 0.9 }); gamN.position.set(-1.9, HAUT + 0.4, 11.2); G.add(gamN);
    m.cachettes.push({ x: 1.95, z: 10.9, y: 1.0 });
    m.zoneAnimal = { x: 0, z: 8.4, rayon: 2.7, yMin: HAUT - 0.3, texte: '🐱 Mais… c\'est ' + nom + ' dans la cabine !<br>✋ Toquer à la vitre' };

    // ---------- Faisceau du projecteur ----------
    var L = LENTILLE.distanceTo(new THREE.Vector3(0, ECRAN.y, ECRAN.z));
    var gf = new THREE.ConeGeometry(1, L, 4, 1, true);
    var pf = gf.attributes.position, cf = new Float32Array(pf.count * 3);
    for (var v = 0; v < pf.count; v++) { var kf = 0.25 + 0.75 * (pf.getY(v) + L / 2) / L; cf[v * 3] = cf[v * 3 + 1] = cf[v * 3 + 2] = kf; }
    gf.setAttribute('color', new THREE.BufferAttribute(cf, 3));
    gf.rotateY(Math.PI / 4); gf.translate(0, -L / 2, 0); gf.rotateX(Math.PI / 2);
    var faisceau = new THREE.Mesh(gf, new THREE.MeshBasicMaterial({ color: '#fff1d0', vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    faisceau.position.copy(LENTILLE);
    faisceau.scale.set((ECRAN.l / 2) / 0.7071, (ECRAN.h / 2) / 0.7071, 1);
    faisceau.rotation.x = -Math.atan2(LENTILLE.y - ECRAN.y, LENTILLE.z - ECRAN.z);
    faisceau.visible = false; G.add(faisceau);
    var np = 140, pp = new Float32Array(np * 3), pb = [];
    for (var q = 0; q < np; q++) {
      var tq = 0.06 + Math.random() * 0.9;
      pb.push({ x: (Math.random() - 0.5) * ECRAN.l * 0.9 * tq, y: LENTILLE.y + (ECRAN.y - LENTILLE.y) * tq + (Math.random() - 0.5) * ECRAN.h * 0.9 * tq, z: LENTILLE.z + (ECRAN.z - LENTILLE.z) * tq, ph: Math.random() * 6.28 });
    }
    var gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    var poussiere = new THREE.Points(gp, new THREE.PointsMaterial({ color: '#fff4d8', size: 0.07, map: AV.textureRonde(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    poussiere.frustumCulled = false; poussiere.visible = false; G.add(poussiere);

    // ---------- Vidéo (calque HTML aligné sur l'écran 3D) ----------
    var calque = null, video = null, videoKO = !fichier, filmEnCours = false, besoinSon = false, deverrouille = false;
    if (fichier) {
      calque = document.createElement('div');
      calque.style.cssText = 'position:fixed;z-index:1;pointer-events:none;background:#000;opacity:0;transition:opacity 1.2s;display:none;overflow:hidden;box-shadow:0 0 70px 14px rgba(210,225,255,.22)';
      video = document.createElement('video');
      video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
      video.preload = 'auto';
      video.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#000';
      video.addEventListener('error', function () { videoKO = true; if (filmEnCours) sansVideo(); });
      video.addEventListener('ended', function () { if (filmEnCours) finFilm(); });
      video.src = fichier;
      calque.appendChild(video);
      document.body.appendChild(calque);
    }
    var coins = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (c) { return new THREE.Vector3(c[0] * ECRAN.l / 2, ECRAN.y + c[1] * ECRAN.h / 2, ECRAN.z + 0.02); });
    var vp = new THREE.Vector3();
    function placerCalque(cam) {
      cam.updateMatrixWorld();
      var w = window.innerWidth, h = window.innerHeight, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      coins.forEach(function (c) {
        vp.copy(c).project(cam);
        var px = (vp.x + 1) / 2 * w, py = (1 - vp.y) / 2 * h;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
      calque.style.left = x0 + 'px'; calque.style.top = y0 + 'px';
      calque.style.width = (x1 - x0) + 'px'; calque.style.height = (y1 - y0) + 'px';
    }
    function geste() {
      if (!video || videoKO) return;
      if (besoinSon) {
        besoinSon = false; video.muted = false;
        var p = video.play(); if (p && p.catch) p.catch(function () { });
        if (scen) scen.ctx.cinema(scen.cine = { pos: CAM_SEANCE.pos, cible: CAM_SEANCE.cible, vitesse: 1.2, texte: '🎬 Bonne séance ! · ✋ Quitter la séance', quitter: finFilm });
      } else if (!deverrouille && !filmEnCours) {
        // iPad : on « débloque » la vidéo pendant un geste pour pouvoir la lancer avec le son ensuite
        deverrouille = true; video.muted = false;
        var p2 = video.play();
        if (p2 && p2.then) p2.then(function () { if (!filmEnCours) { video.pause(); video.currentTime = 0; } }).catch(function () { });
      }
    }
    document.addEventListener('touchend', geste, true);
    document.addEventListener('click', geste, true);

    m.nettoyer = function () {
      document.removeEventListener('touchend', geste, true);
      document.removeEventListener('click', geste, true);
      if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) { } }
      if (calque && calque.parentNode) calque.parentNode.removeChild(calque);
      AV.audio.projecteur(false);
      texEcran.dispose();
      var J = AV.jeu && AV.jeu.joueur && AV.jeu.joueur(); if (J) J.groupe.visible = true;
    };

    // ---------- Scénario : le chat prend peur et lance le film ----------
    var scen = null, eclair = 1, eclairCible = 1;
    function lancerFilm() {
      filmEnCours = true;
      etatEcran = 'film';
      ecran.material.color.set('#ffffff');
      if (videoKO) { sansVideo(); return; }
      calque.style.display = 'block';
      placerCalque(scen.ctx.camera);
      setTimeout(function () { if (filmEnCours && calque) calque.style.opacity = '1'; }, 30);
      video.muted = false;
      try { video.currentTime = 0; } catch (e) { }
      var p = video.play();
      if (p && p.catch) p.catch(function (err) {
        if (!filmEnCours) return;
        if (err && err.name === 'NotAllowedError') {
          // lecture avec le son refusée : on lance sans le son, un toucher l'activera
          video.muted = true; besoinSon = true;
          var p2 = video.play(); if (p2 && p2.catch) p2.catch(function () { sansVideo(); });
          scen.ctx.cinema(scen.cine = { pos: CAM_SEANCE.pos, cible: CAM_SEANCE.cible, vitesse: 1.2, texte: '🔊 Touche l\'écran pour avoir le son · ✋ Quitter', quitter: finFilm });
        } else { videoKO = true; sansVideo(); }
      });
    }
    function sansVideo() {
      if (calque) { calque.style.opacity = '0'; calque.style.display = 'none'; }
      etatEcran = 'sansvideo'; scen.tSans = 0;
      dessinSansVideo();
    }
    function finFilm() {
      if (!scen || scen.fini) return;
      scen.fini = true; filmEnCours = false; besoinSon = false;
      if (video) { try { video.pause(); } catch (e) { } }
      if (calque) { calque.style.opacity = '0'; setTimeout(function () { if (calque) calque.style.display = 'none'; }, 1200); }
      etatEcran = 'fin'; dessinFin(); ecran.material.color.set('#bbbbbb');
      eclairCible = 1;
      AV.audio.projecteur(false); AV.audio.sourdine(false);
      scen.projo = false;
      scen.ctx.cinema(null);
      bulle('👏 👏 👏', 0, hc + 2.1, zc, 2.5, 2.2);
      // le chat revient sur sa pile de boîtes, tout fier
      var a = scen.ctx.animal;
      a.fuite = [{ x: 1.95, y: HAUT + 1.0, z: 10.9 }]; a.regardFinal = Math.PI;
      setTimeout(function () {
        if (!scen) return;
        etatEcran = 'veille'; dessinVeille(); ecran.material.color.set('#9a9a9a');
        var rec = null;
        if (surprise.type === 'video') { if (surprise.texte) rec = { jour: cfg.jour, titre: cfg.titre, surprise: { type: 'mot', texte: surprise.texte, signature: surprise.signature } }; }
        else rec = cfg;
        scen.ctx.fin(rec);
      }, 2200);
    }

    m.surTrouve = function (ctx) {
      scen = { ctx: ctx, t: 0, etape: 0, fini: false, projo: false, tSans: 0 };
      var a = ctx.animal;
      a.tPeur = 0;
      a.fuite = [{ x: 0.95, y: HAUT + 1.2, z: 10.35 }];
      a.regardFinal = Math.PI;
      AV.audio.miaou();
      a.bulle(ctx.scene, '🙀 MIAOU !', { vie: 1.6 });
      ctx.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, nom + ' a eu peur… et a appuyé sur le bouton du projecteur ! 🎬');
    };

    // ---------- Animation ----------
    var tBulle = 3, phrases = ['🍿 Bonne séance !', 'Chut… 🤫', 'T\'as pas vu ' + nom + ' ?', '❤', 'Il est où ' + nom + ' ?'];
    var vZ = new THREE.Vector3();
    m.anime(function (dt, t, joueur) {
      // bulles
      for (var i = bulles.length - 1; i >= 0; i--) {
        var s = bulles[i]; s.userData.vie -= dt; s.position.y += dt * 0.35;
        s.material.opacity = Math.min(1, s.userData.vie * 2);
        if (s.userData.vie <= 0) { G.remove(s); s.material.map.dispose(); s.material.dispose(); bulles.splice(i, 1); }
      }
      // le couple
      var film = !!(scen && !scen.fini && scen.t > 1.3);
      couple.forEach(function (p, k) {
        var tt = p.s.tete;
        if (film) {
          tt.rotation.y = AV.lerp(tt.rotation.y, p.cote * 0.12, dt * 2);
          tt.rotation.z = AV.lerp(tt.rotation.z, -p.cote * 0.28, dt * 2);
        } else {
          var parle = Math.sin(t * 0.7 + k * 1.3) > 0.2;
          tt.rotation.y = AV.lerp(tt.rotation.y, parle ? p.cote * 0.55 : Math.sin(t * 0.4 + k) * 0.2, dt * 3);
          tt.rotation.z = AV.lerp(tt.rotation.z, 0, dt * 3);
          tt.rotation.x = parle ? Math.sin(t * 9 + k) * 0.04 : 0;
        }
        p.s.torse.scale.y = 1 + Math.sin(t * 2.2 + k) * 0.012;
      });
      if (film && Math.random() < dt * 0.35) coeurCouple();
      if (!scen) {
        tBulle -= dt;
        var dx = joueur.x - 0, dz = joueur.z - zc;
        if (tBulle <= 0 && dx * dx + dz * dz < 30) { tBulle = 6; bulle(AV.choisir(Math.random, phrases), (Math.random() - 0.5) * 0.8, hc + 2.0, zc, 2.6, 1.6); }
      }
      // lumières de la salle
      eclair = AV.lerp(eclair, eclairCible, Math.min(1, dt * 1.2));
      if (scen) scen.ctx.eclairage(eclair);
      lumieres.forEach(function (l, i) { l.intensity = basesL[i] * eclair; });
      appliques.forEach(function (ap) { ap.h.material.opacity = 0.4 * eclair; ap.m.material.color.setScalar(0.25 + 0.75 * eclair).multiply(new THREE.Color('#ffb36b')); });
      etoiles.material.opacity = 0.5 + 0.5 * (1 - eclair) * (0.8 + Math.sin(t * 2) * 0.2);
      // projecteur
      var cibleF = scen && scen.projo ? 1 : 0;
      faisceau.material.opacity = AV.lerp(faisceau.material.opacity, cibleF * 0.075, dt * 2);
      poussiere.material.opacity = faisceau.material.opacity * 6;
      faisceau.visible = poussiere.visible = faisceau.material.opacity > 0.002;
      verre.material.color.set(cibleF ? '#fff6dc' : '#33384a');
      if (cibleF) bobines.forEach(function (bo, i) { bo.rotation.x -= dt * (i ? 3.2 : 2.6); });
      if (poussiere.visible) {
        for (var q = 0; q < np; q++) { var b = pb[q]; pp[q * 3] = b.x + Math.sin(t * 0.3 + b.ph) * 0.15; pp[q * 3 + 1] = b.y + Math.sin(t * 0.2 + b.ph * 2) * 0.1; pp[q * 3 + 2] = b.z; }
        gp.attributes.position.needsUpdate = true;
      }
      lumEcran.intensity = AV.lerp(lumEcran.intensity, filmEnCours ? 0.9 + Math.random() * 0.12 : (etatEcran === 'compte' ? 0.5 : 0), dt * 4);
      lumCab.intensity = 0.9 * (0.6 + 0.4 * eclair) + (cibleF ? Math.random() * 0.1 : 0);
      if (calque && calque.style.display === 'block') placerCalque(scen.ctx.camera);

      if (!scen || scen.fini) return;
      // déroulé de la séance
      scen.t += dt;
      var T = scen.t, a = scen.ctx.animal;
      if (scen.etape === 0 && T > 1.15) {
        scen.etape = 1; scen.projo = true;
        AV.audio.projecteur(true); AV.audio.clic();
        bouton.position.y = HAUT + 1.21;
        a.fuite = [{ x: 0.5, y: HAUT, z: 11.75 }, { x: -0.6, y: HAUT, z: 11.6 }];
        a.bulle(scen.ctx.scene, '⚡ clic !', { vie: 1.2, largeur: 1.3 });
        bulle('🤫 Chut, ça commence !', 0, hc + 2.1, zc, 2.8);
        eclairCible = 0.3;
      }
      if (scen.etape === 1 && T > 1.6) {
        scen.etape = 2;
        if (assise) { m.pilote = null; assise.film = true; } else asseoir(true); // pour le film, elle est assise à côté d'Axel
        AV.audio.sourdine(true);
        scen.ctx.cinema(scen.cine = { pos: CAM_SEANCE.pos, cible: CAM_SEANCE.cible, vitesse: 1.2, texte: '🎬 Bonne séance ! · ✋ Quitter la séance', quitter: finFilm });
        etatEcran = 'compte'; ecran.material.color.set('#ffffff');
      }
      if (scen.etape === 2) {
        var c = (T - 2.2);
        if (c >= 0 && c < 3) { dessinCompte(3 - Math.floor(c), c % 1); if (Math.floor(c) !== scen.dernier) { scen.dernier = Math.floor(c); AV.audio.ping(0.5); } }
        if (c >= 3) { scen.etape = 3; lancerFilm(); }
      }
      if (scen.etape === 3 && etatEcran === 'sansvideo') {
        scen.tSans += dt;
        if (Math.floor(scen.tSans * 12) !== scen.grain) { scen.grain = Math.floor(scen.tSans * 12); dessinSansVideo(); }
        if (scen.tSans > 8) finFilm();
      }
      vZ.set(0, 0, 0);
    });

    return m;
  };
})(window.AV);
