/* Biome « trail » : descente de trail à fond la caisse dans la garrigue (calcaire blanc, pins, chênes verts).
   La coureuse descend toute seule ; on la guide à gauche / à droite, on saute (⤒ ou ✋).
   Cailloux : sauter ou éviter. Troncs / racines en travers : sauter. Branches basses : passer de l'autre côté.
   Si on percute un obstacle, les clés tombent un peu plus bas sur le sentier : il faut passer dessus pour
   les ramasser, sinon on remonte à la dernière balise. En bas, il l'attend sous l'arche d'arrivée. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var L = 900;                // longueur de la descente (m)
  var FIN = L + 45;           // le sentier continue un peu dans la clairière d'arrivée
  var DEMI = 1.9;             // demi-largeur du sentier
  var LAT = 1.4;              // écart latéral maxi de la coureuse
  var GRAV = 22, SAUT = 6.6;
  var CIEL = { haut: '#3f86d8', bas: '#d8ecff', brouillard: '#cfe2f2', hemi: ['#ffffff', '#7a7a5a', 0.6], soleil: ['#fff1d8', 0.75, [25, 40, -30]] };

  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function au_hasard(l) { return l[Math.floor(Math.random() * l.length)]; }

  // ---------- Le tracé ----------
  var N = FIN + 1, PX = new Float32Array(N), PZ = new Float32Array(N), PY = new Float32Array(N), TH = new Float32Array(N);
  (function () {
    var x = 0, z = 0;
    for (var s = 0; s < N; s++) {
      var th = s < L ? 0.75 * Math.sin(s / 90) + 0.38 * Math.sin(s / 41 + 1) : TH[Math.max(0, s - 1)] * 0.97;
      TH[s] = th; PX[s] = x; PZ[s] = z;
      PY[s] = s < L ? 150 * Math.pow(1 - s / L, 0.95) + 1.4 * Math.sin(s / 17) * (1 - s / L) : 0;
      x += Math.sin(th); z -= Math.cos(th);
    }
  })();
  function echant(arr, s) { s = Math.max(0, Math.min(N - 1.001, s)); var i = Math.floor(s), f = s - i; return arr[i] + (arr[i + 1] - arr[i]) * f; }
  // point du sentier : s = distance parcourue, o = décalage latéral (positif = à droite en descendant)
  function point(s, o, v) {
    var th = echant(TH, s), x = echant(PX, s), z = echant(PZ, s);
    return (v || new THREE.Vector3()).set(x + Math.cos(th) * o, echant(PY, s), z + Math.sin(th) * o);
  }
  // relief de part et d'autre : la montagne monte à gauche, descend à droite
  function flanc(s, o) {
    var a = Math.abs(o);
    if (a <= DEMI + 0.05) return 0;
    var k = a - DEMI, bruit = Math.sin(s * 0.13 + o * 0.4) * Math.cos(s * 0.05 - o * 0.21);
    return (o < 0 ? k * 0.55 : -k * 0.38) + lisse(0, 6, k) * bruit * 1.6 + lisse(0, 1.2, k) * 0.15;
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
    var c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    var x = c.getContext('2d'); x.fillStyle = fond; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = encre; x.font = '900 ' + Math.round(c.height * 0.55) + 'px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texte, c.width / 2, c.height / 2 + 4);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
  }
  function supporter() { // lui, debout, qui attend à l'arrivée
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    [-1, 1].forEach(function (c) { corps.add(bm(0.15, 0.8, 0.17, '#2f3b52', c * 0.1, 0.4, 0)); });
    var t = AV.maille(new THREE.CylinderGeometry(0.19, 0.24, 0.62, 7), '#4a7bd1'); t.position.y = 1.11; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.6; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var ch = AV.maille(new THREE.SphereGeometry(0.182, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), '#2b1d14'); ch.rotation.x = -0.4; tete.add(ch);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.03, 0.152); tete.add(o); });
    AV.avatars.coiffer(tete, 'axel', { retirer: '#2b1d14' });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.27, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.06, 0.055, 0.6, 5), '#4a7bd1'); m.position.y = -0.3; b.add(m);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.62; b.add(mn);
      bras.push(b);
    });
    return { groupe: g, corps: corps, bras: bras, tete: tete };
  }
  function trousseau() {
    var g = new THREE.Group();
    var anneau = AV.maille(new THREE.TorusGeometry(0.07, 0.014, 5, 12), '#d8dce4'); g.add(anneau);
    [[0.11, 0.3, '#e8c45a'], [0.09, -0.4, '#c8ccd4']].forEach(function (k) {
      var c = new THREE.Group(); c.rotation.z = k[1]; g.add(c);
      c.add(bm(0.035, 0.15, 0.012, k[2], 0, -0.13, 0));
      c.add(bm(0.06, 0.05, 0.014, k[2], 0, -0.05, 0));
      c.add(bm(0.03, 0.025, 0.012, k[2], 0.03, -0.18, 0));
    });
    var pompon = AV.maille(new THREE.IcosahedronGeometry(0.04, 0), '#e2574c'); pompon.position.set(-0.05, -0.1, 0); g.add(pompon);
    var halo = AV.halo('#ffe9a0', 0.9); halo.material.opacity = 0.7; g.add(halo);
    var s = AV.texteSprite('🔑', { largeur: 0.9 }); s.position.y = 0.55; g.add(s);
    g.scale.setScalar(1.6);
    return g;
  }

  // =====================================================================
  AV.biomes.trail = function (cfg) {
    var rng = AV.rng(6006 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 9999, hauteur: function () { return PY[0]; }, surface: 'sable', ciel: CIEL, brouillard: [120, 900],
      depart: { x: PX[0], z: PZ[0], angle: Math.PI }, theme: 'trail', ambiance: 'vent'
    });
    mo.loin = 2200;
    mo.sansAnimal = true;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe;

    // ---------- Le versant : un ruban de terrain qui suit le sentier ----------
    (function () {
      var OFF = [-46, -32, -22, -15, -10, -6.5, -4, -2.6, -DEMI, -1.1, 0, 1.1, DEMI, 2.6, 4, 6.5, 10, 15, 22, 32, 46];
      var pas = 3, nS = Math.floor(FIN / pas) + 1, nO = OFF.length, pos = [], col = [], v = new THREE.Vector3(), c = new THREE.Color();
      var grille = [];
      for (var i = 0; i < nS; i++) {
        var s = i * pas, ligne = [];
        for (var j = 0; j < nO; j++) {
          var o = OFF[j], sl = s > L ? Math.max(0, 1 - (s - L) / 20) : 1;
          point(s, o, v); v.y += flanc(s, o) * (s > L ? sl * 0.4 + 0.1 : 1);
          ligne.push(v.clone());
        }
        grille.push(ligne);
      }
      function couleur(s, oA, oB) {
        var om = (oA + oB) / 2, h = Math.sin(s * 0.37 + om * 1.3) * Math.cos(s * 0.11 - om * 0.7);
        if (Math.abs(om) < DEMI) return AV.outils.varier(s > L ? '#d6c49a' : (h > 0.5 ? '#a88f68' : '#b39a74'), s, om, 0.08);
        if (Math.abs(om) < 2.7) return AV.outils.varier('#a39578', s, om, 0.12);
        if (h > 0.55) return AV.outils.varier('#d9d4c4', s, om, 0.1);            // dalles calcaires
        return AV.outils.varier(h > 0 ? '#7a8550' : '#6a7846', s, om, 0.14);    // garrigue
      }
      for (var a = 0; a < nS - 1; a++) for (var b = 0; b < nO - 1; b++) {
        var p00 = grille[a][b], p01 = grille[a][b + 1], p10 = grille[a + 1][b], p11 = grille[a + 1][b + 1];
        [p00, p10, p01, p01, p10, p11].forEach(function (p) { pos.push(p.x, p.y, p.z); });
        c.copy(couleur(a * pas, OFF[b], OFF[b + 1]));
        for (var k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      m.receiveShadow = true; G.add(m);
    })();
    // le reste de la montagne : elle descend de part et d'autre de la crête jusqu'à la plaine
    (function () {
      var ech = [];
      for (var k = 0; k < FIN; k += 8) ech.push(k);
      G.add(AV.terrain(2600, 96, function (x, z) {
        var best = 1e12, bs = 0;
        for (var i = 0; i < ech.length; i++) { var dx = x - PX[ech[i]], dz = z - PZ[ech[i]], d = dx * dx + dz * dz; if (d < best) { best = d; bs = ech[i]; } }
        var d1 = Math.sqrt(best), bruit = Math.sin(x * 0.011) * Math.cos(z * 0.013) * 9;
        return Math.max(-30 + bruit * 0.3, PY[bs] - 5 - Math.max(0, d1 - 10) * 0.42 + bruit * lisse(60, 200, d1));
      }, function (x, z, yy) {
        return AV.outils.varier(yy < -26 ? '#9aa874' : (Math.sin(x * 0.07) * Math.cos(z * 0.05) > 0.45 ? '#cfcabc' : '#7f8c57'), x, z, 0.14);
      }));
      var plaine = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: '#9aa874' }));
      plaine.rotation.x = -Math.PI / 2; plaine.position.set(0, -31, 0); G.add(plaine);
    })();
    var Lo = new AV.Fusion();
    for (var mt = 0; mt < 26; mt++) {
      var am = rng() * Math.PI * 2, dm = AV.entre(rng, 700, 1300);
      forme(Lo, new THREE.ConeGeometry(1, 1, 6), AV.choisir(rng, ['#8b93a6', '#9aa0b2', '#848ca0']), PX[450] + Math.sin(am) * dm, -30, PZ[450] + Math.cos(am) * dm, rng() * 3, AV.entre(rng, 160, 320), AV.entre(rng, 120, 300), AV.entre(rng, 160, 320));
    }
    G.add(Lo.maille());

    // ---------- Végétation ----------
    var V = new AV.Fusion(), v3 = new THREE.Vector3();
    for (var t = 0; t < 1400; t++) {
      var st = rng() * FIN, ot = (rng() < 0.5 ? -1 : 1) * AV.entre(rng, 3.2, 44);
      if (st > L - 5 && Math.abs(ot) < 14) continue;
      point(st, ot, v3); v3.y += flanc(st, ot) - 0.1;
      var sorte = rng();
      if (sorte < 0.3) { // pin d'Alep
        var h = AV.entre(rng, 4, 8);
        forme(V, new THREE.CylinderGeometry(0.12, 0.22, h, 5), '#7a6048', v3.x, v3.y + h / 2, v3.z, 0, 1, 1, 1, 0, (rng() - 0.5) * 0.25);
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5f7d46', '#6f8a4e', '#56723f']), v3.x, v3.y + h, v3.z, rng() * 3, AV.entre(rng, 1.8, 2.8), AV.entre(rng, 1.1, 1.6), AV.entre(rng, 1.8, 2.8));
      } else if (sorte < 0.65) { // chêne vert / buisson de garrigue
        forme(V, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5e6e3e', '#6b7a46', '#77864f', '#8a8a52']), v3.x, v3.y + 0.4, v3.z, rng() * 3, AV.entre(rng, 0.6, 1.6), AV.entre(rng, 0.5, 1.1), AV.entre(rng, 0.6, 1.6));
      } else { // rochers calcaires
        forme(V, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ['#dedad0', '#cfcabc', '#e6e2d8']), v3.x, v3.y + 0.2, v3.z, rng() * 3, AV.entre(rng, 0.5, 1.8), AV.entre(rng, 0.4, 1.0), AV.entre(rng, 0.5, 1.6));
      }
    }
    var vegM = V.maille(); vegM.castShadow = true; G.add(vegM);

    // ---------- Les obstacles ----------
    var obstacles = [], O = new AV.Fusion();
    function caillou(s) {
      var w = AV.entre(rng, 0.75, 1.15), o = AV.entre(rng, -1.0, 1.0);
      point(s, o, v3);
      forme(O, new THREE.DodecahedronGeometry(1, 0), AV.choisir(rng, ['#e2ded2', '#d4cfc0', '#ece8dc']), v3.x, v3.y + 0.2, v3.z, rng() * 3, w / 2, 0.32, 0.42);
      forme(O, new THREE.DodecahedronGeometry(1, 0), '#c8c2b0', v3.x + 0.15, v3.y + 0.1, v3.z + 0.1, rng() * 3, w / 3.2, 0.2, 0.3);
      obstacles.push({ s: s, type: 'caillou', a: o - w / 2, b: o + w / 2, h: 0.45 });
    }
    function tronc(s) {
      point(s, 0, v3); var th = echant(TH, s);
      forme(O, new THREE.CylinderGeometry(0.17, 0.2, DEMI * 2 + 1.4, 7), '#6b4a32', v3.x, v3.y + 0.17, v3.z, -th, 1, 1, 1, 0, Math.PI / 2);
      for (var r = 0; r < 3; r++) { var ob = AV.entre(rng, -1.5, 1.5); point(s, ob, v3); forme(O, new THREE.IcosahedronGeometry(0.12, 0), '#5a3e2a', v3.x, v3.y + 0.3, v3.z, 0, 1, 1, 1); }
      obstacles.push({ s: s, type: 'tronc', a: -9, b: 9, h: 0.38 });
    }
    function branche(s) {
      var cote = rng() < 0.5 ? -1 : 1, pied = new THREE.Vector3(), bout = new THREE.Vector3();
      point(s, cote * 2.7, pied); pied.y += flanc(s, cote * 2.7);
      var hb = 1.3;
      forme(O, new THREE.CylinderGeometry(0.18, 0.3, 4.5, 6), '#6e5640', pied.x, pied.y + 2.25, pied.z, 0, 1, 1, 1);
      forme(O, new THREE.IcosahedronGeometry(1, 0), '#5f7d46', pied.x, pied.y + 4.8, pied.z, rng() * 3, 2.2, 1.5, 2.2);
      point(s, -cote * 0.25, bout); bout.y = echant(PY, s) + hb;
      var mid = pied.clone().setY(echant(PY, s) + hb + 0.15).add(bout).multiplyScalar(0.5), long = pied.distanceTo(bout.clone().setY(pied.y));
      var br = new THREE.Mesh(AV.facettes(new THREE.CylinderGeometry(0.06, 0.11, long, 5)), matT);
      br.position.copy(mid); br.lookAt(bout); br.rotateX(Math.PI / 2);
      matT.color.set('#6e5640'); O.ajouter(br); br.geometry.dispose();
      for (var f = 0; f < 4; f++) {
        var k = 0.35 + f * 0.2; var q = pied.clone().setY(echant(PY, s) + hb + 0.15).lerp(bout, k);
        forme(O, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#5f7d46', '#6f8a4e']), q.x, q.y + 0.08, q.z, rng() * 3, 0.45, 0.32, 0.45);
      }
      obstacles.push({ s: s, type: 'branche', a: cote < 0 ? -9 : -0.25, b: cote < 0 ? 0.25 : 9, h: 99 });
    }
    var sCur = 45;
    while (sCur < L - 30) {
      var dif = sCur / L, r = rng();
      if (r < 0.45) caillou(sCur); else if (r < 0.7) branche(sCur); else tronc(sCur);
      if (dif > 0.35 && rng() < 0.35) { var s2 = sCur + AV.entre(rng, 4.5, 6); if (rng() < 0.5) caillou(s2); else branche(s2); sCur = s2; }
      sCur += AV.entre(rng, 16, 24) - dif * 7;
    }
    var obsM = O.maille(); obsM.castShadow = true; G.add(obsM);

    // balises (points de reprise) : poteau peint en blanc et rouge, tous les 150 m
    var balises = [0];
    for (var sb = 150; sb < L - 50; sb += 150) {
      var libreB = obstacles.every(function (o) { return Math.abs(o.s - sb) > 6; });
      if (!libreB) sb += 7;
      balises.push(sb);
      point(sb, 2.4, v3); v3.y += flanc(sb, 2.4);
      var po = new THREE.Group(); po.position.copy(v3); G.add(po);
      po.add(bm(0.14, 1.2, 0.14, '#7a6048', 0, 0.6, 0));
      po.add(bm(0.16, 0.12, 0.16, '#ffffff', 0, 1.1, 0)); po.add(bm(0.16, 0.12, 0.16, '#d94a4a', 0, 0.98, 0));
      var pan = pancarte(Math.round(L - sb) + ' m', '#f4efe2', '#2b2340', 0.7, 0.3); pan.position.set(0, 1.4, 0); pan.rotation.y = -echant(TH, sb); po.add(pan);
    }

    // ---------- L'arrivée ----------
    var A = new THREE.Group(); point(L, 0, A.position); A.rotation.y = -echant(TH, L); G.add(A);
    [-1, 1].forEach(function (c) { A.add(bm(0.2, 3.2, 0.2, '#e2574c', c * 2.6, 1.6, 0)); });
    [0, Math.PI].forEach(function (r) { // lisible des deux côtés
      var ban = pancarte('🏁 ARRIVÉE 🏁', '#2f6fb5', '#ffffff', 5.4, 0.9); ban.material.side = THREE.FrontSide;
      ban.position.set(0, 2.85, r ? -0.01 : 0.01); ban.rotation.y = r; A.add(ban);
    });
    var gui = AV.outils.guirlande(AV.outils.guirlandeEntre([-2.6, 3.2, 0], [2.6, 3.2, 0], 18, -0.4), ['#ffd24a', '#e2574c', '#4ab0c8']);
    gui.material.size = 0.25; A.add(gui);
    var lui = supporter();
    point(L + 12, 0.6, lui.groupe.position); lui.groupe.rotation.y = -echant(TH, L + 12); G.add(lui.groupe);
    var tableRavito = bm(1.4, 0.8, 0.6, '#f4efe2', 0, 0.4, 0); point(L + 9, -2.6, tableRavito.position); tableRavito.position.y += 0.4; tableRavito.rotation.y = -echant(TH, L + 9); G.add(tableRavito);

    // ---------- La coureuse ----------
    var s = 0, o = 0, vy = 0, y = 0, auSol = true, vitesse = 0, phase = 0, stun = 0, invuln = 0;
    var etat = 'depart', tEtat = 0, chutes = 0, cles = true, clesSol = null, derniereBalise = 0, vus = {};
    var cleMesh = trousseau(); cleMesh.visible = false; G.add(cleMesh);
    var api = null, parole = null, majT = 0;
    function dire(t, d) { parole = { texte: t, t: d || 2.6 }; }
    function sousTitre() {
      if (!api) return;
      var reste = Math.max(0, Math.round(L - s));
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, etat === 'fini' ? '🏁 Arrivée ! ' + (chutes ? chutes + ' chute' + (chutes > 1 ? 's' : '') + ' · ' : 'Sans une chute ! · ') + '🔑 clés sauvées'
        : '⛰️ Plus que ' + reste + ' m · ' + (cles ? '🔑 clés en poche' : '😱 clés par terre !') + (chutes ? ' · 💥 ' + chutes : ''));
    }

    mo.debut = function (a) { api = a; sousTitre(); };
    mo.astuce = function () {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'depart') return tEtat < 1 ? '3…' : tEtat < 2 ? '2…' : '1…';
      if (etat !== 'course') return null;
      // conseils pour les premiers obstacles de chaque type
      for (var i = 0; i < obstacles.length; i++) {
        var ob = obstacles[i], d = ob.s - s;
        if (d < 0 || d > 22) continue;
        if (vus[ob.type] > 1) return null;
        return ob.type === 'caillou' ? '🪨 Un caillou : saute (⤒) ou contourne-le ← →'
          : ob.type === 'tronc' ? '🪵 Un tronc en travers : saute ! (⤒)' : '🌿 Une branche basse : passe de l\'autre côté ← →';
      }
      return null;
    };

    function tomberCles() {
      chutes++; stun = 1.0; invuln = 1.4; vitesse = 2.5;
      AV.audio.erreur(); AV.audio.cles();
      if (cles) {
        cles = false;
        var sk = s + AV.entre(Math.random, 7, 10), ok = AV.entre(Math.random, -1.1, 1.1);
        clesSol = { s: sk, o: ok, vol: 0, depart: point(s, o).setY(echant(PY, s) + y + 1.1) };
        cleMesh.visible = true;
        dire('💥 Aïe ! Les clés sont tombées… passe dessus pour les ramasser ! 🔑', 3);
      } else dire('💥 Aïe ! Et les clés sont toujours par terre !', 2.2);
      sousTitre();
    }
    function remonter() {
      var fd = document.getElementById('fondu'); fd.classList.add('noir');
      etat = 'remonte';
      setTimeout(function () {
        s = derniereBalise; o = 0; y = 0; vy = 0; vitesse = 0; cles = true; clesSol = null; cleMesh.visible = false;
        obstacles.forEach(function (ob) { if (ob.s > s) ob.passe = false; });
        etat = 'depart'; tEtat = 1.2;
        fd.classList.remove('noir');
        dire('😅 On est remontée chercher les clés… c\'est reparti depuis la balise !', 3);
        sousTitre();
      }, 600);
    }

    mo.pilote = function (dt, e, sauter, joueur, camera) {
      tEtat += dt; if (parole) parole.t -= dt;
      var acc = 0;
      if (etat === 'depart') {
        if (tEtat >= 3) { etat = 'course'; tEtat = 0; dire('🏃 Partez ! À fond !', 1.2); AV.audio.portail(); }
        else if (Math.floor(tEtat) !== Math.floor(tEtat - dt)) AV.audio.clic();
      } else if (etat === 'course') {
        var vmax = (8.2 + 3.2 * s / L) * (1 + 0.28 * Math.max(-1, Math.min(1, e.y)));
        if (stun > 0) { stun -= dt; vmax *= 0.35; }
        vitesse = AV.lerp(vitesse, vmax, Math.min(1, dt * (stun > 0 ? 3 : 1.6)));
        o = Math.max(-LAT, Math.min(LAT, o + e.x * dt * 4.6));
        if (sauter && auSol && stun <= 0) { vy = SAUT; auSol = false; AV.audio.saut(); }
        var avant = s; s += vitesse * dt;
        // obstacles franchis entre avant et s
        invuln -= dt;
        for (var i = 0; i < obstacles.length; i++) {
          var ob = obstacles[i];
          if (ob.passe || ob.s < avant - 0.3 || ob.s > s + 0.3) continue;
          if (ob.s > s) continue;
          ob.passe = true; vus[ob.type] = (vus[ob.type] || 0) + 1;
          var dedans = o + 0.3 > ob.a && o - 0.3 < ob.b;
          if (dedans && y < ob.h && invuln <= 0) tomberCles();
        }
        // ramasser les clés
        if (clesSol && clesSol.vol >= 1 && s >= clesSol.s - 0.6) {
          if (Math.abs(o - clesSol.o) < 0.75 && y < 0.9) {
            cles = true; clesSol = null; cleMesh.visible = false; AV.audio.ping(1); AV.audio.cles();
            dire('🔑 Ouf, récupérées !', 1.6); sousTitre();
          } else if (s > clesSol.s + 1.2) { dire('😱 Les clés sont restées par terre !', 1.5); remonter(); }
        }
        for (var bI = balises.length - 1; bI >= 0; bI--) if (s >= balises[bI] && cles) { if (balises[bI] > derniereBalise) derniereBalise = balises[bI]; break; }
        if (s >= L) { etat = 'arrivee'; tEtat = 0; AV.audio.portail(); dire('💙 ' + nomLui + ' : « Bravo !! Et… t\'as toujours les clés ? 😄🔑 »', 4); }
      } else if (etat === 'arrivee') {
        vitesse = AV.lerp(vitesse, s < L + 9.5 ? 3 : 0, Math.min(1, dt * 2));
        s = Math.min(L + 10.2, s + vitesse * dt); o = AV.lerp(o, -0.2, dt * 2);
        if (tEtat > 3.2) { etat = 'fini'; sousTitre(); if (api) api.trouver(); }
      } else if (etat === 'fini') { vitesse = 0; }

      // saut / gravité
      vy -= GRAV * dt; y += vy * dt;
      if (y <= 0) { if (!auSol && vy < -3) AV.audio.pas('sable'); y = 0; vy = 0; auSol = true; }
      majT -= dt; if (majT <= 0 && etat === 'course') { majT = 0.3; sousTitre(); }

      // position et animation de la coureuse
      var p = point(s, o), th = echant(TH, s);
      joueur.position.set(p.x, p.y + y, p.z);
      joueur.groupe.rotation.y = Math.PI - th + (etat === 'fini' ? 0.6 : -e.x * 0.25 * (vitesse > 1 ? 1 : 0));
      joueur.ombre.position.set(p.x, p.y + 0.04, p.z); joueur.ombre.scale.setScalar(Math.max(0.4, 1 - y * 0.3));
      var pr = joueur.parts, k = Math.min(1, vitesse / 8);
      if (auSol) {
        var av = phase; phase += dt * (5 + vitesse * 1.3);
        var sn = Math.sin(phase);
        pr.jambeG.rotation.x = sn * 1.1 * k; pr.jambeD.rotation.x = -sn * 1.1 * k;
        pr.brasG.rotation.x = -sn * 1.0 * k; pr.brasD.rotation.x = sn * 1.0 * k;
        pr.corps.position.y = Math.abs(Math.cos(phase)) * 0.1 * k; pr.corps.rotation.x = 0.18 * k + (stun > 0 ? Math.sin(tEtat * 20) * 0.15 : 0);
        if (k > 0.2 && Math.floor(av / Math.PI) !== Math.floor(phase / Math.PI)) AV.audio.pas('sable');
      } else { pr.jambeG.rotation.x = 0.7; pr.jambeD.rotation.x = -0.5; pr.brasG.rotation.x = -2.2; pr.brasD.rotation.x = -2.2; pr.corps.rotation.x = 0.05; }
      if (etat === 'fini') { pr.brasG.rotation.x = -2.8 + Math.sin(tEtat * 8) * 0.2; pr.brasD.rotation.x = -2.8 - Math.sin(tEtat * 8) * 0.2; }

      // les clés : vol en cloche puis posées sur le sentier, qui brillent
      if (clesSol) {
        var cible = point(clesSol.s, clesSol.o);
        if (clesSol.vol < 1) {
          clesSol.vol = Math.min(1, clesSol.vol + dt * 1.6);
          cleMesh.position.copy(clesSol.depart).lerp(cible, clesSol.vol); cleMesh.position.y += Math.sin(clesSol.vol * Math.PI) * 2.2 + 0.15;
          cleMesh.rotation.z += dt * 12;
        } else { cleMesh.position.copy(cible); cleMesh.position.y += 0.18 + Math.sin(tEtat * 5) * 0.05; cleMesh.rotation.set(0, cleMesh.rotation.y + dt * 3, 0); }
      }

      // lui : sautille et applaudit quand elle arrive
      var proche = s > L - 60;
      lui.bras[0].rotation.x = AV.lerp(lui.bras[0].rotation.x, proche ? -2.7 + Math.sin(tEtat * 9) * 0.3 : 0, Math.min(1, dt * 4));
      lui.bras[1].rotation.x = AV.lerp(lui.bras[1].rotation.x, proche ? -2.7 - Math.sin(tEtat * 9) * 0.3 : 0, Math.min(1, dt * 4));
      lui.groupe.position.y = echant(PY, L + 12) + (proche && etat !== 'fini' ? Math.abs(Math.sin(tEtat * 6)) * 0.15 : 0);

      // caméra : derrière et au-dessus, qui regarde la pente devant
      var recul = etat === 'fini' ? 0 : 5.2, cp = point(Math.max(0, s - recul), o * 0.5);
      var cv = point(s + 7, o * 0.3);
      if (etat === 'fini') { cp = point(L + 16, 3.5); cp.y += 1.2; cv = point(L + 11, 0.2); cv.y += 1.1; }
      else { cp.y += 2.7 + y * 0.4; cv.y += 0.6; }
      camera.position.lerp(cp, Math.min(1, dt * (etat === 'fini' ? 1.2 : 7)));
      camera.lookAt(cv);
      var fovV = 62 + Math.min(14, vitesse * 0.9);
      if (Math.abs(camera.fov - fovV) > 0.05) { camera.fov = AV.lerp(camera.fov, fovV, Math.min(1, dt * 2)); camera.updateProjectionMatrix(); }
    };
    // la caméra démarre au bon endroit
    mo.nettoyer = function () { var fd = document.getElementById('fondu'); if (fd && etat === 'remonte') fd.classList.remove('noir'); };

    mo.debug = {
      avancer: function (v) { s = v; obstacles.forEach(function (ob) { ob.passe = ob.s < v; }); },
      etat: function () { return { s: Math.round(s * 10) / 10, o: o, etat: etat, vitesse: vitesse, cles: cles, chutes: chutes, obstacles: obstacles.length, balise: derniereBalise }; },
      prochain: function () { for (var i = 0; i < obstacles.length; i++) if (obstacles[i].s > s) return obstacles[i]; return null; },
      placer: function (oo) { o = oo; },
      clesSol: function () { return clesSol && { s: clesSol.s, o: clesSol.o, vol: clesSol.vol }; }
    };
    return mo;
  };
})(window.AV);
