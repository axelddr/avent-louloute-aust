/* Biome « appart » : notre appartement, modélisé d'après le plan (media/appartement jour 10.png) et les photos.
   Séjour-cuisine (canapé blanc « nuage » en L, tables basses rondes en verre noir, mur TV à LED, cuisine bois/blanc,
   bar en marbre et tabouret noir), terrasse, chambre (mur noir, soleils en paille), salle d'eau, WC, entrée.
   4 souvenirs à débloquer :
     👨‍🍳 parler à lui qui cuisine            → la recette (cfg.recette)
     🧩 s'asseoir sur le tabouret de la cuisine → puzzle de notre photo (cfg.puzzle)
     📖 le livre sur la table basse            → le livre scanné, à feuilleter (cfg.livre)
     🎬 s'allonger sur le canapé               → il vient s'asseoir à côté, notre vlog des Dolomites passe à la télé (cfg.vlog)
   Échelle : 1 m réel = 1,4 unité (le personnage est un peu « grand » : l'appart reste à son échelle).
   Caméra « maison de poupée » : pas de plafond vu d'en haut, les murs entre la caméra et nous deviennent transparents. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  // ---------- Plan → monde ----------
  var SC = 1.4 / 61.5, OX = 300, OY = 380;      // 61,5 px du plan = 1 m réel
  var HP = 3.5, HD = 2.95, HA = 1.3, EXT = 0.3, INT = 0.14;
  function P(px, py) { return { x: (px - OX) * SC, z: (py - OY) * SC }; }
  // repère le long d'un mur : u = direction a→b, n = normale (côté intérieur si le segment est bien orienté)
  function cadre(a, b) {
    var A = P(a[0], a[1]), B = P(b[0], b[1]), dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
    var u = { x: dx / L, z: dz / L }, n = { x: u.z, z: -u.x };
    return {
      A: A, u: u, n: n, L: L, rot: Math.atan2(-u.z, u.x) + Math.PI, // objet local : +z = n (vers la pièce), +x = -u
      pt: function (s, d) { return { x: A.x + u.x * s + n.x * d, z: A.z + u.z * s + n.z * d }; }
    };
  }
  function placer(o, c, s, d, y) { var p = c.pt(s, d); o.position.set(p.x, y || 0, p.z); o.rotation.y = c.rot; return o; }
  function versMonde(c, s, d, lx, lz) { // point local (lx, lz) d'un objet placé en (s, d) sur le cadre c
    return { x: c.A.x + c.u.x * (s - lx) + c.n.x * (d + lz), z: c.A.z + c.u.z * (s - lx) + c.n.z * (d + lz) };
  }
  function angleVers(dx, dz) { return Math.atan2(dx, dz); } // orientation d'un personnage qui regarde (dx, dz)

  var CIEL_MATIN = { haut: '#9cc4f2', bas: '#ffe6c8', brouillard: '#f6e6d2', hemi: ['#fff8ee', '#8f8473', 0.85], soleil: ['#ffe3b8', 0.85, [0.85, 0.55, -0.75]] };
  var CIEL = { haut: '#7ea3e6', bas: '#ffd9b8', brouillard: '#f3dcc6', hemi: ['#fff4e6', '#8f8170', 0.82], soleil: ['#ffd9a8', 0.62, [-0.7, 1.1, -0.35]] };

  // ---------- Textures ----------
  function toile(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); return t; }
  function texCarrelage(clair, joint) {
    var t = toile(256, 256, function (x, w) {
      x.fillStyle = joint; x.fillRect(0, 0, w, w);
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        x.fillStyle = clair; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
        x.fillStyle = 'rgba(0,0,0,' + (0.015 + Math.random() * 0.03) + ')'; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texBois(base, veine) {
    var t = toile(256, 256, function (x, w, h) {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 40; i++) {
        x.strokeStyle = veine; x.globalAlpha = 0.12 + Math.random() * 0.18; x.lineWidth = 1 + Math.random() * 2;
        var y0 = Math.random() * h; x.beginPath(); x.moveTo(0, y0);
        for (var k = 0; k <= 8; k++) x.lineTo(k * w / 8, y0 + Math.sin(k * 0.9 + i) * 4);
        x.stroke();
      }
      x.globalAlpha = 1;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texMarbre() {
    var t = toile(256, 256, function (x, w, h) {
      x.fillStyle = '#f4f2ef'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 9; i++) {
        x.strokeStyle = 'rgba(120,120,130,' + (0.12 + Math.random() * 0.2) + ')'; x.lineWidth = 0.6 + Math.random() * 1.6;
        x.beginPath(); var px = Math.random() * w, py = 0; x.moveTo(px, py);
        while (py < h) { px += (Math.random() - 0.5) * 40; py += 10 + Math.random() * 25; x.lineTo(px, py); }
        x.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texSoleilPaille() {
    return toile(256, 256, function (x, w) {
      x.translate(w / 2, w / 2);
      for (var i = 0; i < 160; i++) {
        x.rotate(Math.PI * 2 / 160); x.strokeStyle = i % 2 ? '#c9a066' : '#ddb87e'; x.lineWidth = 2.2;
        x.beginPath(); x.moveTo(0, 30); x.lineTo(0, 118 - Math.random() * 14); x.stroke();
      }
      x.fillStyle = '#b8894a'; x.beginPath(); x.arc(0, 0, 34, 0, 7); x.fill();
      x.fillStyle = '#9a7038'; x.beginPath(); x.arc(0, 0, 18, 0, 7); x.fill();
    });
  }
  function texFacade() {
    var t = toile(256, 256, function (x, w, h) {
      x.fillStyle = '#efeae2'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
        x.fillStyle = (i + j) % 3 ? '#5d6b7a' : '#8aa0b6'; x.fillRect(i * 64 + 18, j * 64 + 14, 28, 36);
        x.fillStyle = '#d8d2c8'; x.fillRect(i * 64 + 14, j * 64 + 50, 36, 4);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texTV(mode) { // écran de veille / écran « ajoute ta vidéo »
    var c = document.createElement('canvas'); c.width = 512; c.height = 288;
    var t = new THREE.CanvasTexture(c);
    t.dessiner = function (m, k) {
      var x = c.getContext('2d');
      if (m === 'veille') {
        var g = x.createLinearGradient(0, 0, 512, 288); g.addColorStop(0, '#0d1018'); g.addColorStop(1, '#1a2030');
        x.fillStyle = g; x.fillRect(0, 0, 512, 288);
        x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(200, 0); x.lineTo(80, 288); x.lineTo(0, 288); x.fill();
      } else {
        var g2 = x.createLinearGradient(0, 0, 0, 288); g2.addColorStop(0, '#f7b98a'); g2.addColorStop(0.55, '#f6dcc0'); g2.addColorStop(1, '#8fb6d8');
        x.fillStyle = g2; x.fillRect(0, 0, 512, 288);
        // les Dolomites : aiguilles rocheuses
        x.fillStyle = '#b9a99a';
        x.beginPath(); x.moveTo(0, 230);
        [[40, 150], [70, 190], [95, 95], [120, 170], [150, 80], [175, 160], [200, 120], [230, 190], [270, 110], [300, 70], [320, 140], [350, 100], [380, 175], [420, 120], [460, 180], [512, 150], [512, 288], [0, 288]].forEach(function (p) { x.lineTo(p[0], p[1]); });
        x.fill();
        x.fillStyle = '#6f8f5a'; x.beginPath(); x.moveTo(0, 240);
        for (var i = 0; i <= 16; i++) x.lineTo(i * 32, 225 + Math.sin(i * 1.3) * 10);
        x.lineTo(512, 288); x.lineTo(0, 288); x.fill();
        x.fillStyle = 'rgba(20,24,40,.55)'; x.fillRect(56, 196, 400, 64);
        x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 26px Nunito, sans-serif';
        x.fillText('🏔️ Notre vlog aux Dolomites', 256, 224);
        x.font = '700 15px Nunito, sans-serif'; x.fillText(m === 'manque' ? 'Ajoute la vidéo : ' + k : 'Chargement…', 256, 248);
      }
      t.needsUpdate = true;
    };
    t.dessiner(mode || 'veille');
    return t;
  }

  // ---------- Petites briques ----------
  function bx(l, h, p, c, x, y, z, ombre) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c, ombre); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cyl(r1, r2, h, c, x, y, z, seg) { var m = AV.maille(new THREE.CylinderGeometry(r1, r2, h, seg || 12), c); m.position.set(x || 0, y || 0, z || 0); return m; }
  function matTex(tex, rx, ry, opts) { var t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial(Object.assign({ map: t }, opts || {})); }

  // ---------- Lui (personnage animable : marcher, s'asseoir, cuisiner) ----------
  function membre(l, e, c, bout, cb) {
    var p = new THREE.Group(), m = AV.maille(new THREE.CylinderGeometry(e, e * 0.9, l, 6), c); m.position.y = -l / 2; p.add(m);
    if (bout) { var b = AV.maille(bout, cb); b.position.y = -l - 0.02; p.add(b); }
    return p;
  }
  function luiPerso() {
    var g = new THREE.Group(), haut = new THREE.Group(); haut.position.y = 0.62; g.add(haut);
    var pull = '#5f6f7e', peau = '#eec29a';
    var t = AV.maille(new THREE.CylinderGeometry(0.3, 0.37, 0.8, 8), pull); t.position.y = 0.37; haut.add(t);
    var tablier = bx(0.5, 0.75, 0.05, '#efe3c8', 0, 0.32, 0.33); tablier.rotation.x = -0.08; haut.add(tablier);
    var poche = bx(0.26, 0.14, 0.02, '#e2d2b0', 0, 0.2, 0.36); haut.add(poche);
    var cordon = AV.maille(new THREE.TorusGeometry(0.33, 0.018, 4, 12), '#efe3c8'); cordon.rotation.x = Math.PI / 2; cordon.position.y = 0.15; haut.add(cordon);
    var tete = new THREE.Group(); tete.position.y = 1.02; haut.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.3, 1), peau));
    var ch = AV.maille(new THREE.SphereGeometry(0.315, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), '#4a3020'); ch.rotation.x = -0.32; ch.position.y = 0.02; tete.add(ch);
    [-1, 1].forEach(function (k) {
      var o = AV.maille(new THREE.SphereGeometry(0.042, 6, 4), '#2b2340', false); o.position.set(k * 0.11, 0.03, 0.27); tete.add(o);
      var j = AV.maille(new THREE.SphereGeometry(0.05, 6, 4), '#f29a9a', false); j.position.set(k * 0.18, -0.07, 0.22); j.scale.z = 0.4; tete.add(j);
    });
    var barbe = AV.maille(new THREE.SphereGeometry(0.24, 8, 5, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.35), '#5a3c28'); barbe.position.set(0, 0.02, 0.05); tete.add(barbe);
    var sourire = AV.maille(new THREE.TorusGeometry(0.06, 0.014, 4, 8, Math.PI), '#7a3a2a', false); sourire.position.set(0, -0.09, 0.275); sourire.rotation.z = Math.PI; tete.add(sourire);
    AV.avatars.coiffer(tete, 'axel', { retirer: ['#4a3020', '#5a3c28'] });
    var brasG = membre(0.55, 0.09, pull, new THREE.IcosahedronGeometry(0.085, 0), peau), brasD = membre(0.55, 0.09, pull, new THREE.IcosahedronGeometry(0.085, 0), peau);
    brasG.position.set(-0.4, 0.68, 0); brasD.position.set(0.4, 0.68, 0); brasG.rotation.z = -0.15; brasD.rotation.z = 0.15;
    haut.add(brasG, brasD);
    var spatule = new THREE.Group(); spatule.add(bx(0.03, 0.42, 0.03, '#2b2b2b', 0, -0.2, 0)); spatule.add(bx(0.1, 0.12, 0.015, '#2b2b2b', 0, -0.44, 0));
    spatule.position.set(0, -0.6, 0.05); spatule.rotation.x = 0.5; brasD.add(spatule);
    var jambeG = membre(0.6, 0.11, '#344a6a', new THREE.BoxGeometry(0.2, 0.12, 0.3), '#e9e4dc'), jambeD = membre(0.6, 0.11, '#344a6a', new THREE.BoxGeometry(0.2, 0.12, 0.3), '#e9e4dc');
    jambeG.position.set(-0.15, 0.64, 0); jambeD.position.set(0.15, 0.64, 0);
    jambeG.children[1].position.z = 0.06; jambeD.children[1].position.z = 0.06;
    g.add(jambeG, jambeD);
    return { groupe: g, haut: haut, tete: tete, brasG: brasG, brasD: brasD, jambeG: jambeG, jambeD: jambeD, spatule: spatule };
  }

  // =====================================================================
  AV.biomes.appart = function (cfg) {
    var nomLui = cfg.copain || 'Axel';
    var REVEIL = cfg.scenario === 'reveil'; // jour 11 : le réveil (même appartement, autre histoire)
    var ciel = REVEIL ? CIEL_MATIN : CIEL;
    var mo = new AV.Monde({
      rayon: 60, hauteur: function () { return 0; }, surface: 'pave', ciel: ciel, brouillard: [45, 260],
      depart: REVEIL ? { x: 7.0, z: 0.9, angle: Math.PI } : { x: 0.6, z: 1.6, angle: Math.PI + 0.5 }, theme: 'appart', ambiance: REVEIL ? 'aube' : null
    });
    mo.sansAnimal = true;
    mo.loin = 600;
    mo.cielEtLumieres(ciel);
    var G = mo.groupe;
    var murs = [];                 // murs « fondus » quand ils cachent la scène : { meshes, mats, op }
    var maillesMurs = [];

    // ---------- Sols, plafond ----------
    var CONTOUR = [[262, 188], [368, 240], [655, 245], [655, 590], [612, 590], [612, 635], [332, 635], [280, 588], [78, 490]];
    var TERRASSE = [[262, 188], [305, 82], [372, 126], [655, 126], [655, 243], [368, 240]];
    function forme(liste) { var s = new THREE.Shape(); liste.forEach(function (q, i) { var p = P(q[0], q[1]); if (i) s.lineTo(p.x, -p.z); else s.moveTo(p.x, -p.z); }); return s; }
    var tCarr = texCarrelage('#e7dfd2', '#cfc5b6'); tCarr.repeat.set(1 / 0.84, 1 / 0.84);
    var sol = new THREE.Mesh(new THREE.ShapeGeometry(forme(CONTOUR)), new THREE.MeshLambertMaterial({ map: tCarr }));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; G.add(sol);
    var tTer = texCarrelage('#bdb5a8', '#a59c8f'); tTer.repeat.set(1 / 0.84, 1 / 0.84);
    var terr = new THREE.Mesh(new THREE.ShapeGeometry(forme(TERRASSE)), new THREE.MeshLambertMaterial({ map: tTer }));
    terr.rotation.x = -Math.PI / 2; terr.position.y = -0.04; terr.receiveShadow = true; G.add(terr);
    var plafond = new THREE.Mesh(new THREE.ShapeGeometry(forme(CONTOUR)), new THREE.MeshLambertMaterial({ color: '#f7f4ef', emissive: '#5c5852', side: THREE.BackSide }));
    plafond.rotation.x = -Math.PI / 2; plafond.position.y = HP; G.add(plafond); // visible seulement d'en dessous

    // ---------- Murs (avec portes / fenêtres) ----------
    var verre = new THREE.MeshPhongMaterial({ color: '#bfe0f0', transparent: true, opacity: 0.22, shininess: 90, specular: '#ffffff', depthWrite: false });
    var alu = '#3b3f45';
    function mur(a, b, ep, ouv, couleur) {
      var c = cadre(a, b), mat = new THREE.MeshLambertMaterial({ color: couleur || '#f2eee8', transparent: true });
      var w = { meshes: [], mats: [mat], op: 1, c: c };
      var th = Math.atan2(c.u.z, c.u.x);
      function piece(t0, t1, y0, y1, collision, m) {
        var l = (t1 - t0) * c.L; if (l < 0.01) return null;
        var o = new THREE.Mesh(new THREE.BoxGeometry(l, y1 - y0, ep), m || mat);
        o.castShadow = true; o.receiveShadow = true;
        placer(o, c, (t0 + t1) / 2 * c.L, 0, (y0 + y1) / 2); G.add(o);
        w.meshes.push(o); maillesMurs.push(o); o.userData.mur = w;
        if (collision) { var p = c.pt((t0 + t1) / 2 * c.L, 0); mo.colliders.push({ rect: true, x: p.x, z: p.z, hx: l / 2, hz: ep / 2 + 0.02, a: th }); }
        return o;
      }
      var t = 0;
      (ouv || []).forEach(function (o) {
        piece(t, o[0], 0, HP, true);
        var typ = o[2], l = (o[1] - o[0]) * c.L, sm = (o[0] + o[1]) / 2 * c.L;
        piece(o[0], o[1], typ === 'fenetre' ? 2.6 : HD, HP, false);
        if (typ === 'fenetre') piece(o[0], o[1], 0, HA, true);
        if (typ === 'baie' || typ === 'fenetre' || typ === 'baie-ouverte') {
          var y0 = typ === 'fenetre' ? HA : 0, y1 = typ === 'fenetre' ? 2.6 : HD;
          var cad = new THREE.Group(); placer(cad, c, sm, 0, 0); G.add(cad);
          var cadreM = AV.mat(alu);
          [[l, 0.07, 0, y1 - 0.035], [l, 0.07, 0, y0 + 0.035], [0.07, y1 - y0, -l / 2 + 0.035, (y0 + y1) / 2], [0.07, y1 - y0, l / 2 - 0.035, (y0 + y1) / 2]].forEach(function (q) {
            var f = new THREE.Mesh(new THREE.BoxGeometry(q[0], q[1], 0.09), cadreM); f.position.set(q[2], q[3], 0); cad.add(f);
          });
          if (typ === 'baie-ouverte') { // porte-fenêtre ouverte vers l'intérieur, rabattue contre le mur
            var bat = new THREE.Group(); bat.position.set(l / 2 - 0.04, 0, 0.05); bat.rotation.y = -1.45; cad.add(bat);
            var vb = new THREE.Mesh(new THREE.PlaneGeometry(l - 0.1, y1 - 0.12), verre); vb.position.set(-(l - 0.1) / 2, y1 / 2, 0); bat.add(vb);
            [[l - 0.06, 0.07, -(l - 0.06) / 2, 0.04], [l - 0.06, 0.07, -(l - 0.06) / 2, y1 - 0.08], [0.07, y1, -l + 0.07, y1 / 2], [0.07, y1, -0.03, y1 / 2]].forEach(function (q) {
              var f = new THREE.Mesh(new THREE.BoxGeometry(q[0], q[1], 0.06), cadreM); f.position.set(q[2], q[3], 0); bat.add(f);
            });
          } else {
            var vg = new THREE.Mesh(new THREE.PlaneGeometry(l - 0.1, y1 - y0 - 0.1), verre); vg.position.set(0, (y0 + y1) / 2, 0); cad.add(vg);
            if (typ === 'baie') { var mont = new THREE.Mesh(new THREE.BoxGeometry(0.06, y1 - y0, 0.08), cadreM); mont.position.set(0, (y0 + y1) / 2, 0); cad.add(mont); }
            var p2 = c.pt(sm, 0); mo.colliders.push({ rect: true, x: p2.x, z: p2.z, hx: l / 2, hz: ep / 2, a: th });
          }
          w.meshes.push(cad); cad.userData.mur = w;
        }
        if (typ === 'porte-entree') { // porte palière blanche, gonds côté +x local, s'ouvre vers l'intérieur
          var pe = new THREE.Group(); placer(pe, c, sm, 0.02, 0); G.add(pe);
          var piv = new THREE.Group(); piv.position.set(l / 2 - 0.03, 0, 0); pe.add(piv);
          var lp = l - 0.06;
          piv.add(bx(lp, HD - 0.03, 0.08, '#f6f4f0', -lp / 2, (HD - 0.03) / 2, 0));
          piv.add(bx(0.2, 0.04, 0.05, '#1c1c1c', -lp + 0.2, 1.45, 0.08)); piv.add(bx(0.06, 0.12, 0.03, '#1c1c1c', -lp + 0.15, 1.4, 0.06));
          piv.add(bx(0.2, 0.04, 0.05, '#1c1c1c', -lp + 0.2, 1.45, -0.08));
          var oeil = cyl(0.025, 0.025, 0.02, '#1c1c1c', -lp / 2, 2.0, 0.05); oeil.rotation.x = Math.PI / 2; piv.add(oeil);
          var p3 = c.pt(sm, 0); mo.colliders.push({ rect: true, x: p3.x, z: p3.z, hx: l / 2, hz: ep / 2, a: th });
          w.meshes.push(pe); pe.userData.mur = w; porteEntree = piv;
        }
        if (typ === 'porte' && o[3]) { // battant intérieur ouvert (gonds en t0), o[3] = +1 vers n / -1 vers -n
          var bp = new THREE.Group(); placer(bp, c, o[0] * c.L + 0.04, 0, 0); G.add(bp);
          var bat2 = new THREE.Group(); bat2.rotation.y = o[3] * Math.PI / 2 * (o[4] || 0.92); bp.add(bat2);
          bat2.add(bx(l - 0.1, HD - 0.05, 0.045, '#f7f6f2', -(l - 0.1) / 2, (HD - 0.05) / 2, 0));
          bat2.add(bx(0.16, 0.035, 0.04, '#1c1c1c', -(l - 0.1) + 0.14, 1.45, o[3] * 0.05));
          for (var r2 = 0; r2 < 4; r2++) bat2.add(bx(l - 0.2, 0.012, 0.05, '#e4e1da', -(l - 0.1) / 2, 0.9 + r2 * 0.09, 0)); // rainures
          w.meshes.push(bp); bp.userData.mur = w;
        }
        t = o[1];
      });
      piece(t, 1, 0, HP, true);
      murs.push(w);
      return w;
    }
    // relevé du plan (px) : seules les façades nord donnent dehors (baie du séjour + 2 portes-fenêtres sur la terrasse) ;
    // l'entrée est ouverte sur le séjour, la chambre s'ouvre à côté du meuble TV, la salle d'eau s'ouvre depuis la chambre,
    // le WC depuis l'entrée ; gaine technique pleine entre l'entrée et la chambre.
    var W = {}, porteEntree = null;
    W.n1 = mur([262, 188], [368, 240], EXT, [[0.2, 0.8, 'baie']]);
    W.n2a = mur([368, 240], [450, 243], EXT, [[0.15, 0.79, 'baie-ouverte']]);
    W.n2b = mur([450, 243], [655, 245], EXT, [[0.08, 0.36, 'baie']]);
    W.e = mur([655, 245], [655, 590], EXT);
    W.se1 = mur([655, 590], [612, 590], EXT); W.se2 = mur([612, 590], [612, 635], EXT);
    W.s = mur([612, 635], [332, 635], EXT);
    W.sw = mur([280, 588], [332, 635], EXT, [[0.14, 0.86, 'porte-entree']]);
    W.k = mur([280, 588], [78, 490], EXT);
    W.w = mur([78, 490], [262, 188], EXT);
    W.frigo = mur([280, 588], [340, 462], INT);                                            // cloison cuisine / entrée
    W.tv = mur([450, 243], [450, 475], INT, [[(423 - 243) / 232, 1, 'porte', 1]]);         // mur TV + porte de la chambre
    W.gaine = mur([397, 486], [452, 486], 0.5);                                           // gaine technique
    W.sud = mur([397, 497], [655, 497], INT, [[(517 - 397) / 258, (560 - 397) / 258, 'porte', 1]]); // chambre / WC / salle d'eau
    W.wc = mur([413, 497], [413, 635], INT, [[(548 - 497) / 138, (600 - 497) / 138, 'porte', 1]]);
    W.sde = mur([500, 497], [500, 635], INT);
    function accrocher(w) { (w.deco = w.deco || []).push.apply(w.deco, Array.prototype.slice.call(arguments, 1)); } // décor mural caché quand son mur s'efface
    function attacher(w, obj) { obj.userData.mur = w; w.meshes.push(obj); obj.traverse(function (o) { if (o.isMesh && o.material && w.mats.indexOf(o.material) < 0 && !o.material.userData.cache) { o.material.transparent = true; w.mats.push(o.material); } }); }

    // ---------- La terrasse ----------
    var cT = [[262, 188], [305, 82], [372, 126], [605, 126]];
    for (var iT = 0; iT < cT.length - 1; iT++) {
      var cr = cadre(cT[iT], cT[iT + 1]), gr = new THREE.Group(); placer(gr, cr, cr.L / 2, 0, 0); G.add(gr);
      var vr = new THREE.Mesh(new THREE.PlaneGeometry(cr.L, 1.25), verre); vr.position.y = 0.72; gr.add(vr);
      gr.add(bx(cr.L, 0.06, 0.08, alu, 0, 1.38, 0)); gr.add(bx(cr.L, 0.1, 0.25, '#d8d2c8', 0, 0.05, 0));
      var pc = cr.pt(cr.L / 2, 0); mo.colliders.push({ rect: true, x: pc.x, z: pc.z, hx: cr.L / 2, hz: 0.12, a: Math.atan2(cr.u.z, cr.u.x) });
    }
    (function () { // jardinière (zone hachurée du plan) + petite table et 2 chaises
      var a = P(605, 126), b = P(655, 243), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, lx = b.x - a.x, lz = b.z - a.z;
      G.add(bx(lx, 0.9, lz, '#8c8378', cx, 0.45, cz)); G.add(bx(lx - 0.15, 0.06, lz - 0.15, '#5a4636', cx, 0.9, cz));
      for (var k = 0; k < 9; k++) {
        var px = cx + (Math.random() - 0.5) * (lx - 0.4), pz = cz + (Math.random() - 0.5) * (lz - 0.4), h = 0.5 + Math.random() * 0.9;
        var f = AV.maille(new THREE.ConeGeometry(0.28 + Math.random() * 0.2, h, 5), AV.choisir(Math.random, ['#5f8a3e', '#4f7a36', '#6f9a48'])); f.position.set(px, 0.9 + h / 2, pz); G.add(f);
      }
      mo.colliders.push({ rect: true, x: cx, z: cz, hx: lx / 2, hz: lz / 2, a: 0 });
      var tp = P(470, 175);
      G.add(cyl(0.45, 0.45, 0.04, '#2b2b2b', tp.x, 1.0, tp.z)); G.add(cyl(0.04, 0.04, 1.0, '#2b2b2b', tp.x, 0.5, tp.z, 6));
      mo.colliders.push({ x: tp.x, z: tp.z, r: 0.5 });
      [-1, 1].forEach(function (k) {
        var ch = new THREE.Group(); ch.position.set(tp.x + k * 0.95, 0, tp.z); ch.rotation.y = -k * Math.PI / 2; G.add(ch);
        ch.add(bx(0.55, 0.05, 0.55, '#2b2b2b', 0, 0.65, 0));
        ch.add(bx(0.55, 0.6, 0.05, '#2b2b2b', 0, 0.95, -0.26));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { ch.add(bx(0.04, 0.65, 0.04, '#2b2b2b', q[0] * 0.24, 0.32, q[1] * 0.24)); });
      });
    })();

    // ---------- L'immeuble et le quartier (vus par les fenêtres) ----------
    // l'appartement est au R+1 : un seul étage en dessous, et le reste de l'immeuble autour (paliers, voisins)
    var SOLX = -3.9;
    (function () {
      var tf = texFacade(); tf.repeat.set(4, 1);
      var bas = new THREE.Mesh(new THREE.BoxGeometry(14.4, -SOLX - 0.06, 13.6), new THREE.MeshLambertMaterial({ map: tf }));
      bas.position.set(1.5, SOLX / 2 - 0.03, -0.5); G.add(bas);
      // dalle + nez de dalle entre RDC et R+1
      G.add(bx(14.6, 0.25, 13.8, '#e4ded4', 1.5, -0.16, -0.5));
      // ailes voisines du même immeuble (elles s'effacent comme les murs quand elles cachent le jeu)
      function aile(a, b, prof, long) {
        var c = cadre(a, b), t2 = texFacade(); t2.repeat.set(Math.max(1, Math.round(c.L / 4)), 2);
        var m = new THREE.MeshLambertMaterial({ map: t2, transparent: true }), mt = new THREE.MeshLambertMaterial({ map: toile(64, 64, function (x) { x.fillStyle = '#a9a398'; x.fillRect(0, 0, 64, 64); for (var i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? '#bdb7ab' : '#97918a'; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } }), transparent: true });
        var h = HP + 0.35 - SOLX;
        var o = new THREE.Mesh(new THREE.BoxGeometry(c.L + (long || 0), h, prof), [m, m, mt, m, m, m]);
        placer(o, c, c.L / 2, -prof / 2 - EXT / 2, SOLX + h / 2); G.add(o);
        var w = { meshes: [o], mats: [m, mt], op: 1, c: c }; o.userData.mur = w; maillesMurs.push(o); murs.push(w);
      }
      aile([262, 188], [78, 490], 4, 0);      // à l'ouest
      aile([78, 490], [280, 588], 4, 3);      // au sud-ouest (palier, escalier)
      aile([280, 635], [655, 635], 4, 5);     // au sud
      aile([655, 635], [655, 245], 4, 2);     // à l'est
      var sol2 = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: '#9aa772' }));
      sol2.rotation.x = -Math.PI / 2; sol2.position.y = SOLX; G.add(sol2);
      // rue, trottoir et haie au pied de la façade nord
      var rue = new THREE.Mesh(new THREE.PlaneGeometry(200, 9), AV.mat('#6d6f73')); rue.rotation.x = -Math.PI / 2; rue.position.set(0, SOLX + 0.02, -20); G.add(rue);
      var tr = new THREE.Mesh(new THREE.PlaneGeometry(200, 3), AV.mat('#c9c3b8')); tr.rotation.x = -Math.PI / 2; tr.position.set(0, SOLX + 0.03, -14.5); G.add(tr);
      for (var hh = -14; hh < 18; hh += 1.6) G.add(bx(1.7, 1.2, 1.1, '#4f7a3a', hh, SOLX + 0.6, -11.8));
      var V = new AV.Fusion(), rng = AV.rng(1010), mt = new THREE.MeshLambertMaterial();
      function f(geo, col, x, y, z, sx, sy, sz) { var o = new THREE.Mesh(AV.facettes(geo), mt); mt.color.set(col); o.position.set(x, y, z); if (sx) o.scale.set(sx, sy, sz); V.ajouter(o); o.geometry.dispose(); }
      for (var i = 0; i < 22; i++) { // immeubles voisins (R+1 à R+3)
        var a = rng() * Math.PI * 2, d = AV.entre(rng, 28, 75), x = Math.cos(a) * d, z = Math.sin(a) * d - 8, h = AV.entre(rng, 8, 16), l = AV.entre(rng, 9, 18), p = AV.entre(rng, 8, 14);
        f(new THREE.BoxGeometry(1, 1, 1), AV.choisir(rng, ['#efe9df', '#e6ddcf', '#f3efe8', '#ddd3c4']), x, SOLX + h / 2, z, l, h, p);
        f(new THREE.BoxGeometry(1, 1, 1), '#8a8f96', x, SOLX + h + 0.2, z, l + 0.3, 0.4, p + 0.3);
      }
      for (var j = 0; j < 150; j++) { // pins et arbres (leurs cimes à hauteur des fenêtres)
        var a2 = rng() * Math.PI * 2, d2 = AV.entre(rng, 13, 90), x2 = Math.cos(a2) * d2, z2 = Math.sin(a2) * d2 - 4, h2 = AV.entre(rng, 4, 9);
        if (Math.abs(z2 + 20) < 6) continue; // pas sur la rue
        f(new THREE.CylinderGeometry(0.2, 0.3, h2, 5), '#6e5440', x2, SOLX + h2 / 2, z2);
        f(new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4f6b3a', '#5a7540', '#46623a', '#6b8a46']), x2, SOLX + h2 + 0.5, z2, AV.entre(rng, 2.4, 3.8), AV.entre(rng, 1.4, 2.4), AV.entre(rng, 2.4, 3.8));
      }
      G.add(V.maille());
    })();

    // =========================================================
    // ---------- La cuisine (le long du mur sud-ouest) ----------
    var cK = cadre([78, 490], [280, 588]);
    var D0 = EXT / 2, PROF = 0.84, HPLAN = 1.26;
    var tBoisC = texBois('#c49a6c', '#7a5534'), tMarbre = texMarbre();
    var mBoisC = matTex(tBoisC, 1, 1), mMarbre = matTex(tMarbre, 1, 1), mBlanc = AV.mat('#f4f2ee');
    function bloc(s0, s1, d0, d1, y0, y1, m) { var o = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, d1 - d0), typeof m === 'string' ? AV.mat(m) : m); o.castShadow = o.receiveShadow = true; placer(o, cK, (s0 + s1) / 2, (d0 + d1) / 2, (y0 + y1) / 2); G.add(o); return o; }
    var S_CUIS = 1.55, S_EVIER = 3.05, S_FRIGO0 = 3.98, S_FRIGO1 = 4.92;
    var cuisine = new THREE.Group(); G.add(cuisine);
    bloc(0.15, S_FRIGO0, D0, D0 + PROF, 0, 0.12, '#1e1e1e');                      // socle noir
    bloc(0.15, S_FRIGO0, D0, D0 + PROF - 0.04, 0.12, HPLAN - 0.05, mBlanc);       // façades blanches
    bloc(0.1, S_FRIGO0, D0, D0 + PROF + 0.03, HPLAN - 0.05, HPLAN, mMarbre);     // plan de travail marbre
    bloc(0.1, S_FRIGO0, D0, D0 + 0.03, HPLAN, 2.0, mMarbre);                     // crédence marbre
    bloc(0.1, S_FRIGO0 - 0.6, D0, D0 + 0.5, 2.05, 3.0, mBoisC);                  // meubles hauts en bois
    var led = bloc(0.12, S_FRIGO0 - 0.62, D0 + 0.4, D0 + 0.44, 2.02, 2.04, AV.matBrillant('#ffd49a', 1));
    bloc(S_FRIGO0, S_FRIGO1, D0, D0 + PROF + 0.04, 0, 3.08, mBoisC);              // colonne frigo bois
    bloc(S_FRIGO0 + 0.02, S_FRIGO1 - 0.02, D0 + PROF + 0.04, D0 + PROF + 0.06, 0.12, 3.0, AV.mat('#b58c60'));
    for (var iC = 0; iC < 5; iC++) { // joints des portes blanches
      var sj = 0.15 + iC * (S_FRIGO0 - 0.15) / 5;
      bloc(sj - 0.01, sj + 0.01, D0 + PROF - 0.04, D0 + PROF - 0.03, 0.15, HPLAN - 0.08, '#d9d6d0');
    }
    // plaque de cuisson + poêle + évier + robinet noir
    bloc(S_CUIS - 0.38, S_CUIS + 0.38, D0 + 0.12, D0 + 0.72, HPLAN, HPLAN + 0.015, '#111316');
    var poele = new THREE.Group(), pp0 = cK.pt(S_CUIS - 0.15, D0 + 0.45); poele.position.set(pp0.x, HPLAN + 0.02, pp0.z); G.add(poele);
    poele.add(cyl(0.24, 0.2, 0.08, '#2a2a2a', 0, 0.04, 0, 14));
    var garniture = cyl(0.2, 0.2, 0.03, '#d9a24e', 0, 0.065, 0, 12); poele.add(garniture);
    var manche = bx(0.38, 0.035, 0.05, '#1c1c1c', 0.4, 0.07, 0); poele.add(manche);
    var casserole = cyl(0.16, 0.16, 0.22, '#9aa0a8', 0, 0, 0, 12); var pc0 = cK.pt(S_CUIS + 0.2, D0 + 0.3); casserole.position.set(pc0.x, HPLAN + 0.12, pc0.z); G.add(casserole);
    bloc(S_EVIER - 0.32, S_EVIER + 0.32, D0 + 0.18, D0 + 0.66, HPLAN - 0.02, HPLAN + 0.005, '#2d2f33');
    var rob = new THREE.Group(); placer(rob, cK, S_EVIER, D0 + 0.12, HPLAN); G.add(rob);
    rob.add(cyl(0.025, 0.025, 0.55, '#1c1c1c', 0, 0.27, 0, 6));
    var bec = AV.maille(new THREE.TorusGeometry(0.14, 0.022, 5, 10, Math.PI), '#1c1c1c'); bec.position.set(0, 0.55, 0.14); bec.rotation.y = Math.PI / 2; rob.add(bec);
    // bouilloire, planche, coupe de fruits
    var bou = cyl(0.1, 0.12, 0.24, '#2a2a2a', 0, 0, 0, 10); var bp = cK.pt(3.75, D0 + 0.4); bou.position.set(bp.x, HPLAN + 0.12, bp.z); G.add(bou);
    var planche = bloc(0.4, 0.85, D0 + 0.25, D0 + 0.6, HPLAN, HPLAN + 0.03, mBoisC);
    mo.colliders.push((function () { var p = cK.pt(S_FRIGO1 / 2 + 0.05, D0 + PROF / 2); return { rect: true, x: p.x, z: p.z, hx: S_FRIGO1 / 2, hz: PROF / 2 + 0.03, a: Math.atan2(cK.u.z, cK.u.x) }; })());
    // le bar en marbre : parallèle à la cuisine, fixé au mur du canapé, pied cascade en marbre au bout libre
    var BAR_D0 = D0 + PROF + 1.45, BAR_D1 = BAR_D0 + 0.85, HBAR = 1.47, BAR_S0 = 0.36, BAR_S1 = 2.86;
    var BAR_SM = (BAR_S0 + BAR_S1) / 2, BAR_DM = (BAR_D0 + BAR_D1) / 2;
    var barP = new THREE.Mesh(new THREE.BoxGeometry(BAR_S1 - BAR_S0, 0.07, BAR_D1 - BAR_D0), mMarbre); placer(barP, cK, BAR_SM, BAR_DM, HBAR); barP.castShadow = barP.receiveShadow = true; G.add(barP);
    var pied = new THREE.Mesh(new THREE.BoxGeometry(0.08, HBAR, BAR_D1 - BAR_D0), mMarbre); placer(pied, cK, BAR_S1 - 0.04, BAR_DM, HBAR / 2); pied.castShadow = true; G.add(pied);
    var pan = new THREE.Mesh(new THREE.BoxGeometry(BAR_S1 - BAR_S0 - 0.5, HBAR - 0.04, 0.1), mBoisC); placer(pan, cK, BAR_SM - 0.2, BAR_DM + 0.1, HBAR / 2); pan.castShadow = true; G.add(pan);
    var poub = new THREE.Mesh(AV.facettes(new THREE.BoxGeometry(0.42, 0.75, 0.32)), AV.mat('#e8e0d2')); placer(poub, cK, BAR_S1 - 0.4, BAR_D0 + 0.2, 0.38); G.add(poub);
    var coupe = cyl(0.28, 0.12, 0.08, '#151515', 0, 0, 0, 12); var cpp = cK.pt(BAR_S0 + 0.6, BAR_DM); coupe.position.set(cpp.x, HBAR + 0.08, cpp.z); G.add(coupe);
    var fruits = [coupe];
    ['#e85a3c', '#f2a03a', '#d8402e'].forEach(function (cf, i) { var fr = AV.maille(new THREE.IcosahedronGeometry(0.075, 0), cf); fr.position.set(cpp.x + (i - 1) * 0.12, HBAR + 0.16, cpp.z + (i % 2) * 0.06); G.add(fr); fruits.push(fr); });
    (function () { var p = cK.pt(BAR_SM, BAR_DM); mo.colliders.push({ rect: true, x: p.x, z: p.z, hx: (BAR_S1 - BAR_S0) / 2 + 0.02, hz: (BAR_D1 - BAR_D0) / 2 + 0.02, a: Math.atan2(cK.u.z, cK.u.x) }); })();
    var TAB = { s: BAR_S1 - 0.75, d: BAR_D1 + 0.42, h: 1.05 };
    var tabouret = new THREE.Group(); placer(tabouret, cK, TAB.s, TAB.d, 0); G.add(tabouret);
    tabouret.add(cyl(0.24, 0.22, 0.08, '#1b1b1d', 0, TAB.h, 0, 14));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var l = cyl(0.025, 0.03, TAB.h, '#1b1b1d', q[0] * 0.15, TAB.h / 2, q[1] * 0.15, 5); l.rotation.set(q[1] * 0.08, 0, -q[0] * 0.08); tabouret.add(l); });
    var rep = AV.maille(new THREE.TorusGeometry(0.19, 0.018, 4, 12), '#1b1b1d'); rep.rotation.x = Math.PI / 2; rep.position.y = 0.4; tabouret.add(rep);
    var TABW = cK.pt(TAB.s, TAB.d);
    mo.colliders.push({ x: TABW.x, z: TABW.z, r: 0.28 });

    // ---------- Le séjour : canapé « nuage », tables basses, tapis, livre ----------
    var cW = cadre([262, 188], [78, 490]);
    var LS = 3.3, DS = 1.3, DC = 2.3, WC = 1.3, HS = 0.6, S_CANAPE = 2.55, D_CANAPE = EXT / 2 + 0.02;
    var crème = '#efebe2', crèmeO = '#e3ded2';
    var canape = new THREE.Group(); placer(canape, cW, S_CANAPE, D_CANAPE, 0); G.add(canape);
    var matDoux = new THREE.MeshLambertMaterial({ color: '#f6f2ea' }), matDoux2 = new THREE.MeshLambertMaterial({ color: '#fbf9f4' });
    function boudin(l, h, p, x, y, z, c) { // coussins bouclette : ombrage lisse (pas de facettes)
      var o = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), c ? matDoux2 : matDoux); o.castShadow = o.receiveShadow = true;
      o.scale.set(l, h, p); o.position.set(x, y, z); canape.add(o); return o;
    }
    canape.add(bx(LS, 0.28, DS, crèmeO, 0, 0.14, DS / 2));                       // base
    for (var iS = 0; iS < 3; iS++) boudin((LS - WC) / 3 + 0.05, 0.3, DS - 0.35, -LS / 2 + (iS + 0.5) * (LS - WC) / 3, HS - 0.12, 0.35 + (DS - 0.35) / 2);
    for (var iD = 0; iD < 4; iD++) boudin(LS / 4 + 0.08, 0.75, 0.42, -LS / 2 + (iD + 0.5) * LS / 4, 0.82, 0.22);
    boudin(0.4, 0.5, DS, -LS / 2 + 0.12, 0.58, DS / 2);                           // accoudoir
    canape.add(bx(WC, 0.28, DC - DS, crèmeO, LS / 2 - WC / 2, 0.14, DS + (DC - DS) / 2)); // méridienne
    for (var iM = 0; iM < 3; iM++) boudin(WC - 0.05, 0.3, (DC - 0.35) / 3 + 0.08, LS / 2 - WC / 2, HS - 0.12, 0.35 + (iM + 0.5) * (DC - 0.35) / 3);
    boudin(0.42, 0.5, DC - 0.2, LS / 2 - 0.12, 0.58, (DC - 0.2) / 2 + 0.1);
    var coussin1 = boudin(0.55, 0.42, 0.22, -0.9, 0.85, 0.5, '#f6f3ec'); coussin1.rotation.z = 0.15;
    var coussin2 = boudin(0.5, 0.4, 0.2, LS / 2 - 0.5, 0.82, 0.5, '#f6f3ec'); coussin2.rotation.z = -0.2;
    var tele = bx(0.12, 0.03, 0.22, '#111', -0.2, HS + 0.02, 0.9); canape.add(tele);   // télécommande
    (function () { // colliders du canapé (2 rectangles)
      var a = Math.atan2(cW.u.z, cW.u.x), p1 = versMonde(cW, S_CANAPE, D_CANAPE, 0, DS / 2), p2 = versMonde(cW, S_CANAPE, D_CANAPE, LS / 2 - WC / 2, DS + (DC - DS) / 2);
      mo.colliders.push({ rect: true, x: p1.x, z: p1.z, hx: LS / 2, hz: DS / 2, a: a });
      mo.colliders.push({ rect: true, x: p2.x, z: p2.z, hx: WC / 2, hz: (DC - DS) / 2, a: a });
    })();
    // panneau bois au-dessus du canapé (il s'efface avec le mur)
    var tBoisP = texBois('#a87f58', '#6a4a30');
    var panneau = new THREE.Mesh(new THREE.BoxGeometry(1.7, HP - 0.1, 0.06), matTex(tBoisP, 1, 2)); placer(panneau, cW, S_CANAPE - 0.95, EXT / 2 + 0.03, (HP - 0.1) / 2); G.add(panneau);
    attacher(W.w, panneau);
    // tapis + tables basses en verre noir
    var tapis = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshLambertMaterial({ map: toile(128, 96, function (x, w, h) { x.fillStyle = '#e7dccb'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d6c8b2'; x.lineWidth = 2; for (var i = 4; i < w; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } x.strokeStyle = '#cdbda4'; x.strokeRect(5, 5, w - 10, h - 10); }) }));
    tapis.rotation.x = -Math.PI / 2; var tpW = versMonde(cW, S_CANAPE, D_CANAPE, -0.5, DS + 1.45); tapis.position.set(tpW.x, 0.012, tpW.z); tapis.rotation.z = cW.rot; tapis.receiveShadow = true; G.add(tapis);
    var verreNoir = new THREE.MeshPhongMaterial({ color: '#1d2026', transparent: true, opacity: 0.72, shininess: 100, specular: '#888' });
    function tableRonde(r, h, lx, lz) {
      var g = new THREE.Group(), p = versMonde(cW, S_CANAPE, D_CANAPE, lx, lz); g.position.set(p.x, 0, p.z); G.add(g);
      var dessus = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 24), verreNoir); dessus.position.y = h; g.add(dessus);
      var anneau = AV.maille(new THREE.TorusGeometry(r, 0.022, 5, 24), '#111'); anneau.rotation.x = Math.PI / 2; anneau.position.y = h; g.add(anneau);
      var bas = AV.maille(new THREE.TorusGeometry(r * 0.9, 0.02, 5, 24), '#111'); bas.rotation.x = Math.PI / 2; bas.position.y = 0.03; g.add(bas);
      for (var k = 0; k < 3; k++) { var a = k / 3 * Math.PI * 2 + 0.4, l = cyl(0.018, 0.018, h, '#111', Math.cos(a) * r * 0.92, h / 2, Math.sin(a) * r * 0.92, 5); g.add(l); }
      mo.colliders.push({ x: p.x, z: p.z, r: r * 0.85 });
      return { g: g, x: p.x, z: p.z, h: h };
    }
    // tables gigognes devant l'assise, dégagées de la méridienne (passage libre entre les deux)
    // et du bout du canapé (la petite table bloquait l'accès au tabouret du bar : elle passe devant la grande)
    var tb1 = tableRonde(0.68, 0.62, -0.45, DS + 1.7), tb2 = tableRonde(0.5, 0.5, -1.05, DS + 2.75);
    // le livre (posé sur la grande table basse)
    var livreG = new THREE.Group(); G.add(livreG);
    livreG.add(bx(0.46, 0.07, 0.6, '#3b5d4f', 0, 0.035, 0));
    livreG.add(bx(0.43, 0.055, 0.57, '#f4efe2', 0.02, 0.035, 0));
    var titreL = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ transparent: true, map: toile(256, 150, function (x) { x.fillStyle = '#d9b862'; x.font = 'italic 700 46px Georgia, serif'; x.textAlign = 'center'; x.fillText('Nous', 128, 70); x.font = '28px Georgia, serif'; x.fillText('❤', 128, 118); }) }));
    titreL.rotation.x = -Math.PI / 2; titreL.position.y = 0.072; livreG.add(titreL);
    var LIVRE0 = { x: tb1.x + 0.15, y: tb1.h + 0.012, z: tb1.z, ry: cW.rot + 0.4 };
    livreG.position.set(LIVRE0.x, LIVRE0.y, LIVRE0.z); livreG.rotation.y = LIVRE0.ry;
    var plante = new THREE.Group(), plp = versMonde(cW, S_CANAPE, D_CANAPE, -LS / 2 - 0.55, 0.45); plante.position.set(plp.x, 0, plp.z); G.add(plante);
    plante.add(cyl(0.26, 0.2, 0.5, '#d8d0c2', 0, 0.25, 0, 10));
    for (var iP = 0; iP < 9; iP++) { var fe = AV.maille(new THREE.ConeGeometry(0.12, 1.0, 4), '#3f7a3a'); var ap = iP / 9 * Math.PI * 2; fe.position.set(Math.cos(ap) * 0.15, 0.95, Math.sin(ap) * 0.15); fe.rotation.set(Math.sin(ap) * 0.4, 0, -Math.cos(ap) * 0.4); plante.add(fe); }
    mo.colliders.push({ x: plp.x, z: plp.z, r: 0.3 });

    // ---------- Le mur TV (LED chaudes) ----------
    var cTV = cadre([450, 423], [450, 243]);
    var S_TV = (423 - 369) * SC, TVL = 2.0, TVH = 1.13, TVY = 1.9;
    var meubleTV = new THREE.Group(); placer(meubleTV, cTV, S_TV, INT / 2, 0); G.add(meubleTV);
    meubleTV.add(bx(2.2, 0.42, 0.55, '#f4f2ee', 0, 0.62, 0.3)); meubleTV.add(bx(2.2, 0.03, 0.02, '#d9d6d0', 0, 0.62, 0.58));
    meubleTV.add(bx(0.32, 2.3, 0.1, '#f4f2ee', -1.45, 1.15, 0.06)); // colonne blanche à gauche de la télé
    var ledMeuble = bx(2.1, 0.02, 0.02, AV.matBrillant('#ffc98a', 1), 0, 0.4, 0.52); meubleTV.add(ledMeuble);
    meubleTV.add(cyl(0.05, 0.07, 0.18, '#3a3a3a', -0.8, 0.92, 0.3, 8)); meubleTV.add(bx(0.32, 0.22, 0.08, '#1a1a1a', 0.75, 0.94, 0.3));
    var halo = new THREE.Mesh(new THREE.PlaneGeometry(TVL + 0.9, TVH + 0.8), new THREE.MeshBasicMaterial({ color: '#ffb866', transparent: true, opacity: 0.45, map: AV.textureRonde(), depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(0, TVY, 0.02); meubleTV.add(halo);
    meubleTV.add(bx(TVL + 0.06, TVH + 0.06, 0.06, '#0b0b0d', 0, TVY, 0.06));
    var texEcran = texTV('veille');
    var ecran = new THREE.Mesh(new THREE.PlaneGeometry(TVL, TVH), new THREE.MeshBasicMaterial({ map: texEcran, color: '#ffffff' }));
    ecran.position.set(0, TVY, 0.095); meubleTV.add(ecran);
    (function () { var p = cTV.pt(S_TV, INT / 2 + 0.3); mo.colliders.push({ rect: true, x: p.x, z: p.z, hx: 1.1, hz: 0.3, a: Math.atan2(cTV.u.z, cTV.u.x) }); })();
    // plafonnier (anneau) du séjour
    var plaf = AV.maille(new THREE.TorusGeometry(0.32, 0.05, 6, 20), AV.matBrillant('#fff3dc', 0.8)); plaf.rotation.x = Math.PI / 2; var pf = P(260, 360); plaf.position.set(pf.x, HP - 0.12, pf.z); G.add(plaf);

    // ---------- La chambre (mur noir, lit, soleils en paille, commode, miroir rond) ----------
    var cE = cadre([655, 465], [655, 245]);
    var S_LIT = (465 - 357) * SC;
    var murNoir = new THREE.Mesh(new THREE.PlaneGeometry(cE.L - 0.16, HP), new THREE.MeshLambertMaterial({ color: '#202226', transparent: true }));
    placer(murNoir, cE, cE.L / 2, EXT / 2 + 0.01, HP / 2); G.add(murNoir); attacher(W.e, murNoir);
    var lit = new THREE.Group(); placer(lit, cE, S_LIT, EXT / 2 + 0.02, 0); G.add(lit);
    var tBoisL = texBois('#c9a77e', '#8a6844'), mBoisL = matTex(tBoisL, 1, 1);
    lit.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.25, 0.1), mBoisL)); lit.children[0].position.set(0, 0.95, 0.05);
    lit.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 2.8), mBoisL)); lit.children[1].position.set(0, 0.2, 1.5);
    lit.add(bx(2.2, 0.32, 2.7, '#f6f4f0', 0, 0.55, 1.5));                 // matelas / draps blancs
    lit.add(bx(2.26, 0.06, 1.9, '#1c1d22', 0, 0.73, 1.95));               // plaid noir
    lit.add(bx(2.26, 0.4, 0.06, '#1c1d22', 0, 0.55, 2.88));
    [-0.55, 0.55].forEach(function (x) { var o = AV.maille(new THREE.SphereGeometry(0.5, 10, 6), '#ffffff'); o.scale.set(0.95, 0.4, 0.5); o.position.set(x, 0.85, 0.42); lit.add(o); });
    [-0.45, 0.45].forEach(function (x, i) { var o = AV.maille(new THREE.BoxGeometry(0.62, 0.5, 0.18), '#c99a3e'); o.position.set(x, 0.92, 0.7); o.rotation.set(-0.35, 0, i ? -0.15 : 0.12); lit.add(o); });
    var tSoleil = texSoleilPaille();
    [[-0.75, 2.75, 0.62], [0.05, 2.45, 0.42], [0.75, 2.15, 0.7]].forEach(function (q) { var s = new THREE.Mesh(new THREE.CircleGeometry(q[2], 28), new THREE.MeshLambertMaterial({ map: tSoleil, transparent: true })); s.position.set(q[0], q[1] + 0.3, 0.03); lit.add(s); });
    [-1, 1].forEach(function (k) {
      lit.add(bx(0.55, 0.2, 0.42, mBoisL, k * 1.55, 1.0, 0.24));
      var fil = bx(0.012, HP - 2.2, 0.012, '#111', k * 1.45, (HP + 2.2) / 2, 0.45); lit.add(fil);
      var lampe = AV.maille(new THREE.CylinderGeometry(0.16, 0.18, 0.36, 10), new THREE.MeshLambertMaterial({ color: '#d9a85a', emissive: '#ffb04a', emissiveIntensity: 0.65 })); lampe.position.set(k * 1.45, 2.05, 0.45); lit.add(lampe);
    });
    (function () { var p = versMonde(cE, S_LIT, EXT / 2 + 0.02, 0, 1.5); mo.colliders.push({ rect: true, x: p.x, z: p.z, hx: 1.2, hz: 1.45, a: Math.atan2(cE.u.z, cE.u.x) }); })();
    var cP2e = cadre([450, 243], [450, 475]), S_COM = (370 - 243) * SC;
    var commode = new THREE.Group(); placer(commode, cP2e, S_COM, INT / 2, 0); G.add(commode);
    commode.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.66), mBoisL)); commode.children[0].position.set(0, 0.58, 0.33);
    for (var r = 0; r < 3; r++) for (var cc = 0; cc < 2; cc++) commode.add(bx(1.06, 0.32, 0.02, '#d4b48b', (cc - 0.5) * 1.08, 0.25 + r * 0.34, 0.67));
    commode.add(cyl(0.22, 0.12, 0.08, '#f3efe6', 0.6, 1.17, 0.3, 12)); commode.add(cyl(0.06, 0.06, 0.24, '#e8e2d6', -0.5, 1.25, 0.3, 8)); commode.add(cyl(0.05, 0.05, 0.18, '#e8e2d6', -0.35, 1.22, 0.32, 8));
    var miroir = new THREE.Group(); miroir.position.set(0, 2.2, 0.03); commode.add(miroir);
    var mr = AV.maille(new THREE.TorusGeometry(0.42, 0.035, 6, 24), '#1a1a1a'); miroir.add(mr);
    var mg = new THREE.Mesh(new THREE.CircleGeometry(0.41, 24), new THREE.MeshPhongMaterial({ color: '#a9b8c4', shininess: 120, specular: '#fff' })); miroir.add(mg);
    (function () { var p = cP2e.pt(S_COM, INT / 2 + 0.35); mo.colliders.push({ rect: true, x: p.x, z: p.z, hx: 1.1, hz: 0.35, a: Math.atan2(cP2e.u.z, cP2e.u.x) }); })();
    // radiateur blanc (au nord de la commode) et placard blanc (coin sud-est, zone PL du plan)
    var radC = new THREE.Group(); placer(radC, cP2e, (290 - 243) * SC, INT / 2, 0); G.add(radC);
    for (var iR = 0; iR < 9; iR++) radC.add(bx(0.07, 0.95, 0.09, '#f5f5f3', -0.42 + iR * 0.105, 0.9, 0.08));
    var placard = new THREE.Group(), pl0 = P(597, 476); placard.position.set(pl0.x, 0, pl0.z); G.add(placard);
    placard.add(bx(1.25, HP - 0.05, 0.9, '#f4f2ee', 0, (HP - 0.05) / 2, 0)); placard.add(bx(0.02, HP - 0.3, 0.02, '#cfcac2', 0, HP / 2, -0.46));
    mo.colliders.push({ rect: true, x: pl0.x, z: pl0.z, hx: 0.63, hz: 0.45, a: 0 });
    // miroir étroit à côté de la porte de la salle d'eau
    var mirE = new THREE.Group(), mpE = P(505, 493.4); mirE.position.set(mpE.x, 0, mpE.z); G.add(mirE);
    mirE.add(bx(0.38, 1.75, 0.03, '#111', 0, 1.6, 0)); var glE = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 1.7), new THREE.MeshPhongMaterial({ color: '#b9c6cf', shininess: 120 })); glE.rotation.y = Math.PI; glE.position.set(0, 1.6, -0.02); mirE.add(glE);
    var tapisN = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), AV.mat('#1e1e22')); tapisN.rotation.x = -Math.PI / 2; var tn = P(520, 300); tapisN.position.set(tn.x, 0.012, tn.z); G.add(tapisN);
    var plafCh = new THREE.Group(), pc2 = P(560, 330); plafCh.position.set(pc2.x, HP - 0.15, pc2.z); G.add(plafCh);
    [-0.2, 0.2].forEach(function (x) { var a = AV.maille(new THREE.TorusGeometry(0.3, 0.04, 6, 20), '#1a1a1a'); a.rotation.x = Math.PI / 2; a.position.x = x; plafCh.add(a); });

    // ---------- Salle d'eau, WC, entrée ----------
    (function () {
      var d1 = P(612, 512), d2 = P(653, 588); // douche
      G.add(bx(d2.x - d1.x, 0.08, d2.z - d1.z, '#f3f2ef', (d1.x + d2.x) / 2, 0.04, (d1.z + d2.z) / 2));
      var fai = new THREE.Mesh(new THREE.PlaneGeometry(d2.z - d1.z, 2.9), new THREE.MeshLambertMaterial({ map: toile(128, 128, function (x, w) { for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { x.fillStyle = ['#a49a8e', '#b3aa9e', '#988e82'][(i * 3 + j * 7) % 3]; x.fillRect(i * 16, j * 16, 15, 15); } }), transparent: true }));
      fai.rotation.y = -Math.PI / 2; fai.position.set(d2.x - 0.01, 1.45, (d1.z + d2.z) / 2); G.add(fai); attacher(W.e, fai);
      var vit = new THREE.Mesh(new THREE.PlaneGeometry(d2.z - d1.z - 0.6, 2.6), verre); vit.rotation.y = Math.PI / 2; vit.position.set(d1.x, 1.35, (d1.z + d2.z) / 2 + 0.3); G.add(vit);
      G.add(bx(0.03, 2.6, 0.03, '#c9ccd0', d1.x, 1.35, d1.z + 0.6));
      mo.colliders.push({ rect: true, x: (d1.x + d2.x) / 2, z: (d1.z + d2.z) / 2, hx: (d2.x - d1.x) / 2, hz: (d2.z - d1.z) / 2, a: 0 });
      var v = P(585, 618); // meuble vasque gris + plan bois + miroir (photo) ; lave-linge à gauche
      G.add(bx(0.95, 0.55, 0.62, '#77797c', v.x - 0.15, 1.0, v.z)); G.add(bx(1.5, 0.05, 0.66, '#9b8f80', v.x + 0.1, 1.3, v.z));
      G.add(bx(0.55, 0.06, 0.42, '#ffffff', v.x - 0.15, 1.35, v.z - 0.02));
      var mir = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.0), new THREE.MeshPhongMaterial({ color: '#b4c2cc', shininess: 120 })); mir.rotation.y = Math.PI; mir.position.set(v.x - 0.15, 2.05, v.z + 0.21); G.add(mir);
      mo.colliders.push({ rect: true, x: v.x, z: v.z, hx: 0.75, hz: 0.33, a: 0 });
      var ll = P(542, 612); G.add(bx(0.82, 1.2, 0.8, '#f4f4f2', ll.x, 0.6, ll.z));
      var hub = cyl(0.25, 0.25, 0.03, '#9aa3ad', ll.x, 0.62, ll.z - 0.41, 16); hub.rotation.x = Math.PI / 2; G.add(hub);
      mo.colliders.push({ rect: true, x: ll.x, z: ll.z, hx: 0.41, hz: 0.4, a: 0 });
      var sr = P(503, 560); G.add(bx(0.08, 1.4, 0.55, '#f4f4f4', sr.x + 0.06, 1.1, sr.z));
      var wc = P(457, 618); // WC
      G.add(cyl(0.2, 0.16, 0.5, '#ffffff', wc.x, 0.25, wc.z - 0.25, 12)); G.add(bx(0.5, 0.6, 0.18, '#ffffff', wc.x, 0.9, wc.z + 0.05));
      G.add(bx(0.18, 0.12, 0.02, '#d0d0d0', wc.x, 1.12, wc.z - 0.04));
      mo.colliders.push({ x: wc.x, z: wc.z - 0.15, r: 0.35 });
      // entrée : miroir LED, tasseaux, tablette, suspension filaire, plante sur tabouret en fil
      // (sur la cloison en biais côté entrée : miroir près du séjour, tasseaux vers la porte palière)
      var cH = cadre([340, 462], [280, 588]);
      var miroirE = new THREE.Group(); placer(miroirE, cH, 1.15, INT / 2, 0); G.add(miroirE);
      var lumE = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.55), new THREE.MeshBasicMaterial({ color: '#ffcf8f', transparent: true, opacity: 0.5, map: AV.textureRonde(), blending: THREE.AdditiveBlending, depthWrite: false })); lumE.position.set(0, 1.6, 0.01); miroirE.add(lumE);
      miroirE.add(bx(0.9, 2.25, 0.04, '#121212', 0, 1.6, 0.03));
      var glace = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.19), new THREE.MeshPhongMaterial({ color: '#c3cdd4', shininess: 120 })); glace.position.set(0, 1.6, 0.052); miroirE.add(glace);
      var tas = new THREE.Group(); tas.position.set(-0.85, 0, 0.03); miroirE.add(tas);
      for (var i = 0; i < 9; i++) tas.add(bx(0.05, HP - 0.1, 0.04, '#8a6040', -i * 0.08, (HP - 0.1) / 2, 0.02));
      tas.add(bx(0.75, HP - 0.1, 0.01, '#2b2018', -0.32, (HP - 0.1) / 2, -0.005));
      miroirE.add(bx(0.62, 0.05, 0.22, '#9a6f48', -0.05, 1.05, 0.13)); miroirE.add(bx(0.62, 0.05, 0.22, '#9a6f48', -0.05, 1.3, 0.13));
      miroirE.add(cyl(0.11, 0.09, 0.14, '#efe6d6', -0.05, 1.4, 0.13, 10));
      accrocher(W.frigo, miroirE);
      var su = P(362, 545), susp = new THREE.Group(); susp.position.set(su.x, HP - 0.7, su.z); G.add(susp);
      susp.add(bx(0.01, 0.7, 0.01, '#111', 0, 0.35, 0));
      var abat = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 4, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshBasicMaterial({ color: '#151515', wireframe: true })); abat.scale.y = 0.6; susp.add(abat);
      susp.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), AV.matBrillant('#fff1cf', 1)));
      var pl = P(346, 614); var pot = new THREE.Group(); pot.position.set(pl.x, 0, pl.z); G.add(pot);
      var cage = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.6, 10, 3, true), new THREE.MeshBasicMaterial({ color: '#151515', wireframe: true })); cage.position.y = 0.3; pot.add(cage);
      pot.add(cyl(0.25, 0.25, 0.04, '#b58c60', 0, 0.62, 0, 12)); pot.add(cyl(0.15, 0.12, 0.25, '#f2efe8', 0, 0.76, 0, 10));
      for (var f = 0; f < 7; f++) { var fe = AV.maille(new THREE.ConeGeometry(0.08, 0.6, 4), '#2f6b35'); var a = f / 7 * Math.PI * 2; fe.position.set(Math.cos(a) * 0.1, 1.1, Math.sin(a) * 0.1); fe.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); pot.add(fe); }
      mo.colliders.push({ x: pl.x, z: pl.z, r: 0.28 });
      // placard technique (tableau électrique) à gauche de la porte palière, porte blanche à rainures
      var gt = P(393, 622); G.add(bx(0.85, HD, 0.5, '#f7f5f1', gt.x, HD / 2, gt.z));
      for (var rg = 0; rg < 4; rg++) G.add(bx(0.75, 0.012, 0.52, '#e2ded6', gt.x, 1.2 + rg * 0.09, gt.z));
      mo.colliders.push({ rect: true, x: gt.x, z: gt.z, hx: 0.43, hz: 0.25, a: 0 });
      // placard (PL) en haut du WC
      var pw = P(456, 520); G.add(bx(1.9, HP - 0.1, 0.95, '#f7f5f1', pw.x, (HP - 0.1) / 2, pw.z));
      G.add(bx(0.015, HP - 0.3, 0.02, '#cfcac2', pw.x, HP / 2, pw.z + 0.48));
      mo.colliders.push({ rect: true, x: pw.x, z: pw.z, hx: 0.95, hz: 0.48, a: 0 });
    })();

    accrocher(W.tv, meubleTV, commode, radC); accrocher(W.sud, mirE);

    // ---------- Lumières ----------
    var lumieres = [];
    function lampe(c, i, d, x, y, z) { var l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); G.add(l); lumieres.push({ l: l, base: i }); return l; }
    var lp1 = P(240, 360); lampe('#ffe3bd', 0.55, 10, lp1.x, 3.0, lp1.z);
    var lk = cK.pt(2.6, D0 + 0.6); var lumCuisine = lampe('#ffc98a', 0.55, 4.5, lk.x, 1.9, lk.z);
    var ltv = cTV.pt(S_TV, 0.6); var lumTV = lampe('#ffb866', 0.4, 4.2, ltv.x, 1.9, ltv.z);
    var lc = P(600, 357); lampe('#ffc27a', 0.5, 6, lc.x - 0.6, 2.2, lc.z);

    // ---------- Lui, qui cuisine ----------
    var lui = luiPerso(); G.add(lui.groupe);
    var CUIS = cK.pt(S_CUIS, D0 + PROF + 0.5), angCuis = angleVers(-cK.n.x, -cK.n.z);
    var L = { x: CUIS.x, z: CUIS.z, ang: angCuis, etat: 'cuisine', chemin: null, ensuite: null, phase: 0, assis: null, vitesse: 2.3 };
    var colLui = { x: CUIS.x, z: CUIS.z, r: 0.42 }; mo.colliders.push(colLui);
    // vapeur
    var NV = 22, vPos = new Float32Array(NV * 3), vap = [];
    for (var iv = 0; iv < NV; iv++) vap.push({ t: Math.random() * 2, ox: (Math.random() - 0.5) * 0.25, oz: (Math.random() - 0.5) * 0.25 });
    var vG = new THREE.BufferGeometry(); vG.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
    var vapeur = new THREE.Points(vG, new THREE.PointsMaterial({ color: '#ffffff', size: 0.22, map: AV.textureRonde(), transparent: true, opacity: 0.35, depthWrite: false }));
    vapeur.frustumCulled = false; G.add(vapeur);

    // ---------- Bulles ----------
    var bulles = [];
    function bulle(texte, x, y, z, vie) { // bulle de BD à la largeur du texte
      var s = AV.bulleBD(texte); // taille fixe à l'écran, retour à la ligne
      s.position.set(x, y, z); s.userData.vie = vie || 3; G.add(s); bulles.push(s); return s;
    }
    function bulleLui(t, vie) { var p = lui.tete.getWorldPosition(new THREE.Vector3()); bulle(t, p.x, p.y + 0.85, p.z, vie || 3); }

    // ---------- Progression ----------
    // cfg.missions : les souvenirs de ce jour (par défaut les 4). Les autres restent visibles,
    // mais Axel a « de meilleures idées » quand on essaie d'y toucher.
    var TOUTES = ['recette', 'puzzle', 'livre', 'vlog'];
    var MISSIONS = (cfg.missions && cfg.missions.length ? cfg.missions : TOUTES).filter(function (k) { return TOUTES.indexOf(k) >= 0; });
    if (!MISSIONS.length) MISSIONS = TOUTES.slice();
    var FAIT = {}; MISSIONS.forEach(function (k) { FAIT[k] = false; });
    var ICO = { recette: '🍳', puzzle: '🧩', livre: '📖', vlog: '🎬' };
    var MISSION_DE = { recette: 'recette', tabouret: 'puzzle', livre: 'livre', canape: 'vlog' };
    var PAS_AUJOURDHUI = {
      recette: ['Secret du chef 🤫 J\'ai de meilleures idées pour toi…', 'Pas touche à ma recette 😏 J\'ai mieux à te proposer !'],
      puzzle: ['Un puzzle ? Pfff, j\'ai de bien meilleures idées 😏', 'Laisse ce tabouret, j\'ai mieux en tête 😉'],
      livre: ['Le livre ? Pas ce soir… j\'ai une bien meilleure idée 😏', 'Range ce livre, j\'ai mieux à te proposer 😉'],
      vlog: ['Le canapé ? Pas maintenant, j\'ai de meilleures idées 😏', 'On se pose plus tard… j\'ai mieux à te proposer 😉']
    };
    var api = null, J = null, posJ = null, scene = null, tps = 0, tBulle = 6, tGres = 0, fini = false, note = null;
    function dire(t, d) { note = { t: t, v: d || 3 }; }
    function nbFaits() { var n = 0; for (var k in FAIT) if (FAIT[k]) n++; return n; }
    function sousTitre() {
      if (!api) return;
      var s = Object.keys(FAIT).map(function (k) { return ICO[k] + (FAIT[k] ? '✔' : ''); }).join('  ');
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, fini ? '🏠 Tous nos souvenirs de l\'appart sont là ❤' : '🏠 ' + nbFaits() + ' / ' + MISSIONS.length + ' souvenirs · ' + s);
    }
    function faire(k) {
      if (!(k in FAIT) || FAIT[k]) return;
      FAIT[k] = true; AV.audio.ping(1); sousTitre();
      if (nbFaits() === MISSIONS.length && !fini) setTimeout(function () { fini = true; sousTitre(); if (api) api.trouver(); }, 1500);
    }
    mo.surTrouve = function (ctx) {
      bulleLui('Je t\'aime ❤', 3.5);
      ctx.fin(cfg.surprise ? cfg : null);
    };

    // ---------- Interactifs ----------
    var LIVRE_INT = { x: tb1.x, z: tb1.z, rayon: 1.2, texte: '✋ Ouvrir le livre 📖', fn: function () { lancer('livre'); } };
    var chaiseW = versMonde(cW, S_CANAPE, D_CANAPE, LS / 2 - 0.25, DC + 0.45);
    var CANAPE_INT = { x: chaiseW.x, z: chaiseW.z, rayon: 1.3, texte: '✋ S\'allonger sur le canapé 🛋️', fn: function () { lancer('canape'); } };
    var LUI_INT = { x: CUIS.x, z: CUIS.z, rayon: 1.7, texte: '✋ Qu\'est-ce que tu nous prépares ? 👨‍🍳', fn: function () { lancer('recette'); } };
    var TAB_INT = { x: TABW.x, z: TABW.z, rayon: 1.15, texte: '✋ S\'asseoir sur le tabouret 🪑', fn: function () { lancer('tabouret'); } };
    var porte = cadre([280, 588], [332, 635]), pP = porte.pt(porte.L / 2, 1.0);
    var RETOUR = { type: 'retour', x: pP.x, z: pP.z, rayon: 1.0 };
    var INTERACTIFS = [TAB_INT, LUI_INT, LIVRE_INT, CANAPE_INT, RETOUR];
    INTERACTIFS.forEach(function (i) { mo.interactifs.push(i); });

    // ---------- Vidéo du vlog (calque HTML aligné sur la télé) ----------
    var vlog = cfg.vlog || {};
    var fichierVlog = (vlog.fichiers && vlog.fichiers[0]) || null;
    var calque = null, video = null, videoKO = !fichierVlog, deverrouille = false, besoinSon = false, filmEnCours = false;
    if (fichierVlog) {
      calque = document.createElement('div');
      calque.style.cssText = 'position:fixed;z-index:1;pointer-events:none;background:#000;opacity:0;transition:opacity 1s;display:none;overflow:hidden;box-shadow:0 0 50px 10px rgba(255,190,120,.25)';
      video = document.createElement('video');
      video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
      video.preload = 'metadata';
      video.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#000';
      video.addEventListener('error', function () { videoKO = true; if (filmEnCours) sansVideo(); });
      video.addEventListener('ended', function () { if (filmEnCours && scene && scene.nom === 'canape') scene.arreter(); });
      video.src = fichierVlog;
      calque.appendChild(video); document.body.appendChild(calque);
    }
    function geste() {
      if (!video || videoKO) return;
      if (besoinSon) { besoinSon = false; video.muted = false; var p = video.play(); if (p && p.catch) p.catch(function () { }); }
      else if (!deverrouille && !filmEnCours) {
        deverrouille = true; video.muted = false; // iPad : on « débloque » la vidéo pendant un geste
        var p2 = video.play(); if (p2 && p2.then) p2.then(function () { if (!filmEnCours) { video.pause(); video.currentTime = 0; } }).catch(function () { });
      }
    }
    document.addEventListener('touchend', geste, true);
    document.addEventListener('click', geste, true);
    var coinsTV = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { return new THREE.Vector3(q[0] * TVL / 2, q[1] * TVH / 2, 0); });
    var vp = new THREE.Vector3();
    function placerCalque(cam) {
      cam.updateMatrixWorld(); ecran.updateMatrixWorld();
      var w = window.innerWidth, h = window.innerHeight, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      coinsTV.forEach(function (c) { vp.copy(c).applyMatrix4(ecran.matrixWorld).project(cam); var px = (vp.x + 1) / 2 * w, py = (1 - vp.y) / 2 * h; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
      calque.style.left = x0 + 'px'; calque.style.top = y0 + 'px'; calque.style.width = (x1 - x0) + 'px'; calque.style.height = (y1 - y0) + 'px';
    }
    function lancerVideo() {
      filmEnCours = true;
      if (videoKO) { sansVideo(); return; }
      texEcran.dessiner('film'); calque.style.display = 'block';
      setTimeout(function () { if (filmEnCours && calque) calque.style.opacity = '1'; }, 30);
      video.muted = false; try { video.currentTime = 0; } catch (e) { }
      var p = video.play();
      if (p && p.catch) p.catch(function (err) {
        if (!filmEnCours) return;
        if (err && err.name === 'NotAllowedError') { video.muted = true; besoinSon = true; var p2 = video.play(); if (p2 && p2.catch) p2.catch(function () { sansVideo(); }); }
        else { videoKO = true; sansVideo(); }
      });
    }
    function sansVideo() { if (calque) { calque.style.opacity = '0'; calque.style.display = 'none'; } texEcran.dessiner('manque', fichierVlog || 'media/jour10-dolomites.mp4'); }
    function arreterVideo() {
      filmEnCours = false; besoinSon = false;
      if (video) { try { video.pause(); } catch (e) { } }
      if (calque) { calque.style.opacity = '0'; setTimeout(function () { if (calque && !filmEnCours) calque.style.display = 'none'; }, 1000); }
      texEcran.dessiner('veille');
    }

    // ---------- Poses du joueur ----------
    function poseDebout(J) {
      var pr = J.parts;
      J.groupe.rotation.order = 'XYZ'; J.groupe.rotation.x = 0; J.groupe.rotation.z = 0;
      pr.corps.rotation.set(0, 0, 0); pr.corps.position.y = 0; pr.tete.rotation.set(0, 0, 0);
      pr.jambeG.rotation.set(0, 0, 0); pr.jambeD.rotation.set(0, 0, 0);
      pr.brasG.rotation.set(0, 0, -0.15); pr.brasD.rotation.set(0, 0, 0.15);
      J.ombre.visible = true; J.position.y = 0;
    }
    function poseAssise(J, k) { // k : 0 debout → 1 assise
      var pr = J.parts;
      pr.jambeG.rotation.set(-1.45 * k, 0, -0.04 * k); pr.jambeD.rotation.set(-1.45 * k, 0, 0.04 * k);
      pr.brasG.rotation.set(-0.7 * k, 0, -0.15 + 0.2 * k); pr.brasD.rotation.set(-0.7 * k, 0, 0.15 - 0.2 * k);
      pr.corps.rotation.x = -0.06 * k;
    }
    function marcheJambes(J, ph, k) {
      var pr = J.parts, s = Math.sin(ph);
      pr.jambeG.rotation.set(s * 0.8 * k, 0, 0); pr.jambeD.rotation.set(-s * 0.8 * k, 0, 0);
      pr.brasG.rotation.set(-s * 0.7 * k, 0, -0.15); pr.brasD.rotation.set(s * 0.7 * k, 0, 0.15);
    }
    // déplacer doucement le joueur vers un point (renvoie true une fois arrivé)
    function allerVers(J, sc, cx, cz, dt, angFin) {
      var dx = cx - J.position.x, dz = cz - J.position.z, d = Math.hypot(dx, dz);
      if (d > 0.04) {
        var v = Math.min(d, dt * 3.2);
        J.position.x += dx / d * v; J.position.z += dz / d * v;
        J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
        sc.ph = (sc.ph || 0) + dt * 9; marcheJambes(J, sc.ph, 1);
        return false;
      }
      if (angFin != null) J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, angFin, Math.min(1, dt * 8));
      marcheJambes(J, 0, 0);
      return angFin == null || Math.abs(AV.angleLerp(J.groupe.rotation.y, angFin, 1) - J.groupe.rotation.y) < 0.05;
    }
    var vCam = new THREE.Vector3(), vVise = new THREE.Vector3(), regardCam = null;
    function cameraVers(camera, px, py, pz, cx, cy, cz, dt, v) {
      var k = 1 - Math.exp(-dt * (v || 2.5));
      vCam.set(px, py, pz); camera.position.lerp(vCam, k);
      vVise.set(cx, cy, cz);
      if (!regardCam) { regardCam = new THREE.Vector3(); camera.getWorldDirection(regardCam).multiplyScalar(4).add(camera.position); }
      regardCam.lerp(vVise, k); camera.lookAt(regardCam);
    }

    // ---------- Scènes (le décor prend la main sur le personnage et la caméra) ----------
    function lancer(nom) {
      if (scene) return;
      var mis = MISSION_DE[nom];
      if (mis && !(mis in FAIT)) { pasAujourdhui(mis); return; }
      scene = { nom: nom, t: 0, etape: 0, arreter: arreterFilm };
      regardCam = null;
      INTERACTIFS.forEach(function (i) { i.__r = i.rayon; i.rayon = 0; });
      mo.pilote = SCENES[nom];
      AV.controles.vider();
    }
    // souvenir d'un autre jour : Axel a de meilleures idées… et renvoie vers ce qui reste à faire
    var tPas = -9;
    function pasAujourdhui(mis) {
      if (tps - tPas < 2.5) return;
      tPas = tps; tBulle = 6;
      bulleLui(AV.choisir(Math.random, PAS_AUJOURDHUI[mis]), 3.2);
      var reste = MISSIONS.filter(function (k) { return !FAIT[k]; });
      dire(nomLui + ' a de meilleures idées… ' + (reste.length ? ASTUCES[reste[0]] : '❤'), 4);
    }
    function finScene() {
      if (J) { poseDebout(J); J.angle = J.groupe.rotation.y; J.vitesse.set(0, 0, 0); J.vy = 0; }
      scene = null; mo.pilote = null;
      INTERACTIFS.forEach(function (i) { if (i.__r != null) i.rayon = i.__r; });
      AV.controles.vider();
    }
    function ouvrir(titre, surprise, quandFerme) { AV.recompenses.ouvrir({ jour: cfg.jour, titre: titre, surprise: surprise }, quandFerme); }

    var SCENES = {
      // 👨‍🍳 la recette
      recette: function (dt, e, appui, Jj, camera) {
        J = Jj; var sc = scene; sc.t += dt;
        var cible = cK.pt(S_CUIS + 1.05, D0 + PROF + 0.62);
        var arrive = allerVers(J, sc, cible.x, cible.z, dt, angleVers(L.x - cible.x, L.z - cible.z));
        L.regard = { x: J.position.x, z: J.position.z };
        var mx = (J.position.x + L.x) / 2, mz = (J.position.z + L.z) / 2;
        cameraVers(camera, mx + cK.n.x * 3.4 + cK.u.x * 0.6, 2.7, mz + cK.n.z * 3.4 + cK.u.z * 0.6, mx, 1.55, mz, dt);
        if (sc.etape === 0 && arrive && sc.t > 0.6) { sc.etape = 1; sc.t2 = 0; bulleLui(AV.choisir(Math.random, ['Ce soir, c\'est moi le chef ! 👨‍🍳', 'Surprise… je te montre la recette 😋']), 3); }
        if (sc.etape === 1) { sc.t2 += dt; if (sc.t2 > 1.5) { sc.etape = 2; ouvrir('La recette du chef 👨‍🍳', { type: 'recette', recette: cfg.recette || {} }, function () { sc.etape = 3; sc.t2 = 0; }); } }
        if (sc.etape === 3) {
          sc.t2 += dt;
          if (sc.t2 > 0.05 && !sc.dit) { sc.dit = true; bulleLui(AV.choisir(Math.random, ['À table dans 10 minutes ❤', 'Bon appétit mon cœur ❤', 'Tu goûtes ? 🥄']), 3); faire('recette'); }
          if (sc.t2 > 1.4) { L.regard = null; finScene(); }
        }
      },
      // 🧩 le tabouret → puzzle
      tabouret: function (dt, e, appui, Jj, camera) {
        J = Jj; var sc = scene; sc.t += dt;
        var face = angleVers(-cK.n.x, -cK.n.z);
        if (sc.etape === 0) {
          var dev = cK.pt(TAB.s + 0.7, TAB.d + 0.35);
          if (!sc.p1) { if (allerVers(J, sc, dev.x, dev.z, dt, null)) sc.p1 = true; }
          else { sc.k = Math.min(1, (sc.k || 0) + dt * 2.2); var k = sc.k;
            J.position.x = AV.lerp(dev.x, TABW.x, k); J.position.z = AV.lerp(dev.z, TABW.z, k);
            J.position.y = (TAB.h + 0.04 - 0.62) * Math.sin(k * Math.PI / 2) + Math.sin(k * Math.PI) * 0.25;
            J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, face, Math.min(1, dt * 8)); poseAssise(J, k); J.ombre.visible = false;
            if (k >= 1) { sc.etape = 1; sc.t2 = 0; }
          }
        } else { J.position.set(TABW.x, TAB.h + 0.04 - 0.62, TABW.z); J.groupe.rotation.y = face; poseAssise(J, 1); J.parts.brasG.rotation.set(-1.25, 0, 0.1); J.parts.brasD.rotation.set(-1.25, 0, -0.1); }
        var bp = cK.pt(TAB.s, TAB.d + 2.4);
        cameraVers(camera, bp.x + cK.u.x * 1.2, 3.1, bp.z + cK.u.z * 1.2, TABW.x - cK.n.x * 0.8, 1.6, TABW.z - cK.n.z * 0.8, dt);
        if (sc.etape === 1) { sc.t2 += dt; if (sc.t2 > 0.7) { sc.etape = 2;
          var pz = cfg.puzzle || {};
          ouvrir('Notre photo 🧩', { type: 'jeu', jeu: 'puzzle', fichiers: pz.fichiers || [], pieces: pz.pieces || 9, texte: pz.texte || '', surGagne: function () { sc.gagne = true; } }, function () { sc.etape = 3; sc.t2 = 0; });
        } }
        if (sc.etape === 3) {
          sc.t2 += dt;
          if (!sc.dit) { sc.dit = true; if (sc.gagne) { faire('puzzle'); bulleLui('Elle est trop belle cette photo ❤', 3); } else dire('🧩 Pas fini ? Reviens t\'asseoir sur le tabouret quand tu veux !', 4); }
          if (sc.t2 > 0.9) { J.position.set(cK.pt(TAB.s + 0.7, TAB.d + 0.35).x, 0, cK.pt(TAB.s + 0.7, TAB.d + 0.35).z); finScene(); }
        }
      },
      // 📖 le livre
      livre: function (dt, e, appui, Jj, camera) {
        J = Jj; var sc = scene; sc.t += dt;
        var siege = versMonde(cW, S_CANAPE, D_CANAPE, -0.95, 0.82), devant = versMonde(cW, S_CANAPE, D_CANAPE, -0.95, 1.5);
        var face = angleVers(cW.n.x, cW.n.z);
        if (sc.etape === 0) {
          if (!sc.p1) { if (allerVers(J, sc, devant.x, devant.z, dt, face)) sc.p1 = true; }
          else { sc.k = Math.min(1, (sc.k || 0) + dt * 2); var k = sc.k;
            J.position.x = AV.lerp(devant.x, siege.x, k); J.position.z = AV.lerp(devant.z, siege.z, k); J.position.y = (HS + 0.03 - 0.62) * k;
            J.groupe.rotation.y = face; poseAssise(J, k); J.ombre.visible = false;
            if (k >= 1) { sc.etape = 1; sc.t2 = 0; }
          }
        } else if (sc.etape < 4) { J.position.set(siege.x, HS + 0.03 - 0.62, siege.z); J.groupe.rotation.y = face; poseAssise(J, 1); J.parts.brasG.rotation.set(-1.1, 0, 0.25); J.parts.brasD.rotation.set(-1.1, 0, -0.25); }
        // le livre vient dans ses mains
        var mains = new THREE.Vector3(0, 1.0, 0.62); J.groupe.localToWorld(mains);
        var kl = sc.etape >= 1 && sc.etape < 4 ? Math.min(1, (sc.t2 || 0) * 1.6) : 0;
        if (sc.etape === 4) kl = Math.max(0, 1 - sc.t2 * 1.6);
        livreG.position.set(AV.lerp(LIVRE0.x, mains.x, kl), AV.lerp(LIVRE0.y, mains.y, kl) + Math.sin(kl * Math.PI) * 0.3, AV.lerp(LIVRE0.z, mains.z, kl));
        livreG.rotation.set(-0.7 * kl, AV.angleLerp(LIVRE0.ry, face, kl), 0);
        var cp = versMonde(cW, S_CANAPE, D_CANAPE, -1.6, 3.4);
        cameraVers(camera, cp.x, 2.5, cp.z, siege.x, 1.25, siege.z, dt);
        if (sc.etape === 1) { sc.t2 += dt; if (sc.t2 > 1.2) { sc.etape = 2; var lv = cfg.livre || {};
          ouvrir(lv.titre || 'Notre livre 📖', { type: 'livre', pages: lv.pages, nombre: lv.nombre, dossier: lv.dossier, extension: lv.extension, texte: lv.texte || '' }, function () { sc.etape = 4; sc.t2 = 0; faire('livre'); });
        } }
        if (sc.etape === 4) { sc.t2 += dt; if (sc.t2 > 0.8) { livreG.position.set(LIVRE0.x, LIVRE0.y, LIVRE0.z); livreG.rotation.set(0, LIVRE0.ry, 0); J.position.set(devant.x, 0, devant.z); finScene(); } }
      },
      // 🎬 le canapé : elle s'allonge, il la rejoint, notre vlog passe à la télé
      canape: function (dt, e, appui, Jj, camera, x) {
        J = Jj; var sc = scene; sc.t += dt; x = x || {};
        var pieds = versMonde(cW, S_CANAPE, D_CANAPE, LS / 2 - WC / 2, DC - 0.25), devant = versMonde(cW, S_CANAPE, D_CANAPE, LS / 2 - WC / 2 - 0.1, DC + 0.55);
        var tete = angleVers(-cW.n.x, -cW.n.z); // la tête vers le dossier
        if (sc.etape === 0) {
          if (!sc.p1) { if (allerVers(J, sc, devant.x, devant.z, dt, null)) sc.p1 = true; }
          else {
            sc.k = Math.min(1, (sc.k || 0) + dt * 1.4); var k = sc.k;
            J.position.x = AV.lerp(devant.x, pieds.x, k); J.position.z = AV.lerp(devant.z, pieds.z, k); J.position.y = (HS + 0.28) * Math.min(1, k * 1.5);
            J.groupe.rotation.order = 'YXZ'; J.groupe.rotation.y = AV.angleLerp(J.groupe.rotation.y, tete + Math.PI, Math.min(1, dt * 10));
            J.groupe.rotation.x = -(Math.PI / 2 - 0.42) * k;
            J.parts.jambeG.rotation.set(0.1 * k, 0, 0); J.parts.jambeD.rotation.set(0.05 * k, 0, 0.05 * k);
            J.ombre.visible = false;
            if (k >= 1) { sc.etape = 1; sc.t2 = 0; L.etat = 'marche'; L.chemin = cheminVersCanape(); L.ensuite = 'assis'; bulleLui(nomLui === 'Lui' ? 'J\'arrive ! 🛋️' : 'J\'arrive ! 🛋️', 2); }
          }
        } else {
          J.groupe.rotation.order = 'YXZ'; J.position.set(pieds.x, HS + 0.28, pieds.z); J.groupe.rotation.y = tete + Math.PI; J.groupe.rotation.x = -(Math.PI / 2 - 0.42);
          J.parts.brasG.rotation.set(-0.3, 0, -0.5); J.parts.brasD.rotation.set(-0.3, 0, 0.5);
          // elle tourne la tête vers lui quand il est là
          J.parts.tete.rotation.y = AV.lerp(J.parts.tete.rotation.y, L.etat === 'assis' ? -0.35 : 0, Math.min(1, dt * 2));
        }
        // caméra : par-dessus le canapé (le mur derrière s'efface), vers la télé
        var cam0 = versMonde(cW, S_CANAPE, D_CANAPE, 0.45, 0.05), cTVw = cTV.pt(S_TV, 0.2);
        var vise = sc.etape >= 2 ? { x: cTVw.x, y: TVY - 0.15, z: cTVw.z } : { x: pieds.x, y: 1.0, z: pieds.z };
        if (sc.etape >= 2) cameraVers(camera, cam0.x, 2.55, cam0.z, vise.x, vise.y, vise.z, dt, 1.6);
        else { var c1 = versMonde(cW, S_CANAPE, D_CANAPE, -0.6, 4.8); cameraVers(camera, c1.x, 3.2, c1.z, vise.x, vise.y, vise.z, dt, 2); }
        if (sc.etape === 1) { sc.t2 += dt; if (L.etat === 'assis' && L.tAssis > 0.8) { sc.etape = 2; sc.t2 = 0; sc.lum = 1; AV.audio.sourdine(true); bulleLui('On regarde notre vlog ? 🏔️', 2.4); } }
        if (sc.etape >= 2 && sc.etape < 4) sc.lum = Math.max(0.35, sc.lum - dt * 0.4);
        if (sc.etape === 2) { sc.t2 += dt; if (sc.t2 > 1.6) { sc.etape = 3; sc.t2 = 0; lancerVideo(); } }
        if (sc.etape === 3) {
          sc.t2 += dt;
          if (calque && calque.style.display === 'block') placerCalque(camera);
          if (x.action || x.saut) sc.arreter();
          if (videoKO && sc.t2 > 25) sc.arreter();
        }
        if (sc.etape === 4) {
          sc.t2 += dt; sc.lum = Math.min(1, sc.lum + dt * 0.6);
          if (sc.t2 > 2.2) {
            sc.etape = 5; L.etat = 'marche'; L.chemin = cheminVersCuisine(); L.ensuite = 'cuisine'; L.assis = null;
            J.position.set(devant.x, 0, devant.z); poseDebout(J); AV.audio.sourdine(false); finScene();
            if (api) api.eclairage(1); lumieres.forEach(function (q) { q.l.intensity = q.base; });
            return;
          }
        }
        if (api && sc.lum != null) { api.eclairage(sc.lum); lumieres.forEach(function (q) { q.l.intensity = q.base * (q.l === lumTV ? 1.5 : sc.lum); }); }
      }
    };
    // arrêt du film (bouton ✋ ou fin de la vidéo)
    function arreterFilm() {
      if (!scene || scene.nom !== 'canape' || scene.etape !== 3) return;
      scene.etape = 4; scene.t2 = 0; arreterVideo(); faire('vlog');
      bulleLui(AV.choisir(Math.random, ['On y retourne quand ? 🏔️', 'Meilleur voyage ❤', 'Trop beau ce vlog 😍']), 2.6);
    }

    // ---------- Chemins de lui (il passe entre la table basse et la méridienne) ----------
    var XL = LS / 2 - WC - 0.42;
    function cheminVersCanape() {
      // il longe la cuisine, contourne le bout du bar, puis rejoint le canapé
      var p0 = cK.pt(BAR_S1 + 0.55, D0 + PROF + 0.55), p1 = cK.pt(BAR_S1 + 0.6, BAR_D1 + 0.9), siege = versMonde(cW, S_CANAPE, D_CANAPE, XL, 0.8), dev = versMonde(cW, S_CANAPE, D_CANAPE, XL + 0.05, DS + 0.45);
      // … puis passe entre la grande table basse et le bout de la méridienne
      var p2 = versMonde(cW, S_CANAPE, D_CANAPE, 0.6, DS + 2.3), p3 = versMonde(cW, S_CANAPE, D_CANAPE, 0.28, DS + 0.9);
      L.assis = { x: siege.x, z: siege.z, ang: angleVers(cW.n.x, cW.n.z), devant: dev };
      return [p0, p1, p2, p3, dev];
    }
    function cheminVersCuisine() {
      var p0 = versMonde(cW, S_CANAPE, D_CANAPE, 0.28, DS + 0.9), p1 = versMonde(cW, S_CANAPE, D_CANAPE, 0.6, DS + 2.3), p2 = cK.pt(BAR_S1 + 0.6, BAR_D1 + 0.9), p3 = cK.pt(BAR_S1 + 0.55, D0 + PROF + 0.55);
      return [p0, p1, p2, p3, { x: CUIS.x, z: CUIS.z }];
    }

    // ---------- Animation ----------
    var vT = new THREE.Vector3();
    mo.anime(function (dt, t, joueur) {
      tps += dt; posJ = joueur;
      if (note) { note.v -= dt; if (note.v <= 0) note = null; }
      // lui
      var lg = lui.groupe, lh = lui.haut;
      if (L.etat === 'cuisine') {
        L.x = AV.lerp(L.x, CUIS.x, Math.min(1, dt * 4)); L.z = AV.lerp(L.z, CUIS.z, Math.min(1, dt * 4));
        var angC = L.regard ? angleVers(L.regard.x - L.x, L.regard.z - L.z) : angCuis;
        var dj = Math.hypot(joueur.x - L.x, joueur.z - L.z);
        if (!L.regard && dj < 3.2 && Math.sin(t * 0.6) > 0.3) angC = angCuis + Math.max(-1.2, Math.min(1.2, AV.angleLerp(0, angleVers(joueur.x - L.x, joueur.z - L.z) - angCuis, 1)));
        L.ang = AV.angleLerp(L.ang, angC, Math.min(1, dt * 4));
        lg.position.set(L.x, 0, L.z); lg.rotation.y = L.ang;
        var remue = !L.regard;
        lui.brasD.rotation.set(remue ? -1.1 + Math.sin(t * 5) * 0.25 : -0.2, remue ? Math.cos(t * 5) * 0.3 : 0, remue ? 0.1 : 0.4);
        lui.brasG.rotation.set(remue ? -0.9 : -0.2, 0, remue ? -0.1 : -0.4);
        lui.jambeG.rotation.set(0, 0, 0); lui.jambeD.rotation.set(0, 0, 0);
        lh.rotation.set(remue ? 0.12 : 0, 0, 0); lh.position.y = 0.62 + Math.sin(t * 2) * 0.01;
        lui.tete.rotation.set(remue ? 0.25 : 0, 0, Math.sin(t * 1.3) * 0.08);
        lui.spatule.visible = true;
        garniture.rotation.y += dt * 0.6;
        // petite phrase quand on passe près de lui
        tBulle -= dt;
        if (!scene && tBulle <= 0 && dj < 3.5) { tBulle = 9; bulleLui(AV.choisir(Math.random, ['Ça sent bon hein ? 😋', 'Pas touche, c\'est une surprise !', 'Tu mets la table ? 😏', 'Goûte ça… attention c\'est chaud !'])); }
        tGres -= dt; if (tGres <= 0) { tGres = 0.35; AV.audio.poele(Math.max(0, 1 - dj / 7) * 0.8); }
      } else if (L.etat === 'marche' && L.chemin) {
        var cible = L.chemin[0], dx = cible.x - L.x, dz = cible.z - L.z, d = Math.hypot(dx, dz);
        var pas = Math.min(d, dt * L.vitesse);
        if (d > 0.001) { L.x += dx / d * pas; L.z += dz / d * pas; L.ang = AV.angleLerp(L.ang, Math.atan2(dx, dz), Math.min(1, dt * 9)); }
        if (d < 0.06) { L.chemin.shift(); if (!L.chemin.length) { L.chemin = null; L.etat = L.ensuite; L.tAssis = 0; L.k = 0; } }
        L.phase += dt * 8.5;
        var s = Math.sin(L.phase);
        lui.jambeG.rotation.set(s * 0.75, 0, 0); lui.jambeD.rotation.set(-s * 0.75, 0, 0);
        lui.brasG.rotation.set(-s * 0.6, 0, -0.15); lui.brasD.rotation.set(s * 0.6, 0, 0.15);
        lh.rotation.set(0.06, 0, 0); lh.position.y = 0.62 + Math.abs(Math.cos(L.phase)) * 0.06;
        lui.tete.rotation.set(0, 0, 0); lui.spatule.visible = false;
        lg.position.set(L.x, 0, L.z); lg.rotation.y = L.ang;
      } else if (L.etat === 'assis' && L.assis) {
        L.tAssis += dt; L.k = Math.min(1, (L.k || 0) + dt * 2);
        var k = L.k, as = L.assis;
        L.x = AV.lerp(as.devant.x, as.x, k); L.z = AV.lerp(as.devant.z, as.z, k);
        L.ang = AV.angleLerp(L.ang, as.ang, Math.min(1, dt * 8));
        lg.position.set(L.x, (HS + 0.03 - 0.64) * k, L.z); lg.rotation.y = L.ang;
        lui.jambeG.rotation.set(-1.45 * k, 0, -0.04); lui.jambeD.rotation.set(-1.45 * k, 0, 0.04);
        // un bras autour d'elle, la tête penchée vers elle
        lui.brasD.rotation.set(-0.3 * k, 0, 0.15 + 1.6 * k); lui.brasG.rotation.set(-0.8 * k, 0, -0.2);
        lh.rotation.set(-0.08 * k, 0, 0.12 * k); lh.position.y = 0.62;
        lui.tete.rotation.set(0, 0.35 * k, 0.2 * k);
        lui.spatule.visible = false;
      }
      colLui.x = L.x; colLui.z = L.z;
      LUI_INT.x = L.x; LUI_INT.z = L.z;
      if (!scene) LUI_INT.rayon = L.etat === 'cuisine' ? 1.7 : 0;
      // vapeur de la poêle
      for (var i = 0; i < NV; i++) {
        var v = vap[i]; v.t += dt * 0.6; if (v.t > 1.6) v.t -= 1.6;
        vPos[i * 3] = poele.position.x + v.ox + Math.sin(v.t * 3 + i) * 0.05; vPos[i * 3 + 1] = poele.position.y + 0.1 + v.t * 0.7; vPos[i * 3 + 2] = poele.position.z + v.oz;
      }
      vG.attributes.position.needsUpdate = true;
      // bulles
      for (var b = bulles.length - 1; b >= 0; b--) {
        var sb = bulles[b]; sb.userData.vie -= dt; sb.position.y += dt * 0.12;
        sb.material.opacity = Math.min(1, sb.userData.vie * 2);
        if (sb.userData.vie <= 0) { G.remove(sb); AV.detruire(sb); bulles.splice(b, 1); }
      }
      halo.material.opacity = filmEnCours ? 0.25 + Math.random() * 0.05 : 0.45;
    });

    // ---------- Murs transparents quand ils cachent la scène ----------
    var ray = new THREE.Raycaster(), vTete = new THREE.Vector3(), vDir = new THREE.Vector3(), cibleFondu = [];
    mo.surCamera = function (camera, dt) {
      var p = posJ || { x: 0, y: 0, z: 0 };
      var pts = [[p.x, (p.y || 0) + 1.3, p.z], [p.x, (p.y || 0) + 0.3, p.z]];
      if (scene && scene.nom === 'canape' && scene.etape >= 2) { var ct = cTV.pt(S_TV, 0.2); pts.push([ct.x, TVY, ct.z]); }
      if (scene && scene.nom === 'recette') pts.push([L.x, 1.5, L.z]);
      murs.forEach(function (w) { w.cible = 1; });
      pts.forEach(function (q) {
        vTete.set(q[0], q[1], q[2]); vDir.copy(vTete).sub(camera.position); var d = vDir.length(); vDir.multiplyScalar(1 / d);
        ray.set(camera.position, vDir); ray.far = d - 0.25;
        var hits = ray.intersectObjects(maillesMurs, false);
        for (var i = 0; i < hits.length; i++) { var w = hits[i].object.userData.mur; if (w) w.cible = 0.12; }
      });
      // en vue plongeante, les murs proches de la caméra qui coupent le champ s'effacent aussi
      murs.forEach(function (w) {
        w.op = AV.lerp(w.op, w.cible, Math.min(1, dt * 7));
        var op = w.op;
        w.mats.forEach(function (m) { m.opacity = op; m.depthWrite = op > 0.95; });
        w.meshes.forEach(function (o) { o.visible = op > 0.03; });
        if (w.deco) w.deco.forEach(function (o) { o.visible = op > 0.5; });
      });
    };

    // ---------- Début, conseils, nettoyage ----------
    mo.debut = function (a) {
      api = a; sousTitre();
      if (AV.jeu && AV.jeu.camera) AV.jeu.camera(mo.depart.angle + Math.PI, 0.72, 6.2);
      document.getElementById('hud-aide-clavier').textContent = 'ZQSD / flèches : bouger · glisser : caméra · E : ✋ action';
      setTimeout(function () { if (!scene) bulleLui('Bienvenue à la maison ❤', 3.2); }, 1200);
    };
    var ASTUCES = {
      recette: '👨‍🍳 ' + nomLui + ' cuisine quelque chose… va voir ce qu\'il prépare !',
      puzzle: '🪑 Et si tu t\'asseyais sur le tabouret de la cuisine ?',
      livre: '📖 Il y a un livre sur la table basse…',
      vlog: '🛋️ Le canapé a l\'air trop confortable…'
    };
    mo.astuce = function () {
      if (note) return note.t;
      if (scene && scene.nom === 'canape') {
        if (scene.etape === 3) return besoinSon ? '🔊 Touche l\'écran pour le son · ✋ arrêter le film' : '🎬 Notre vlog aux Dolomites · ✋ arrêter';
        if (scene.etape === 1) return '🛋️ ' + nomLui + ' arrive…';
        return null;
      }
      if (scene) return null;
      if (fini) return '🏠 Tu peux te balader dans l\'appart… ou rentrer par la porte d\'entrée';
      var reste = Object.keys(FAIT).filter(function (k) { return !FAIT[k]; });
      if (!reste.length) return null;
      return ASTUCES[reste[Math.floor(tps / 7) % reste.length]];
    };
    mo.nettoyer = function () {
      document.removeEventListener('touchend', geste, true);
      document.removeEventListener('click', geste, true);
      if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) { } }
      if (calque && calque.parentNode) calque.parentNode.removeChild(calque);
      if (J) poseDebout(J);
      AV.audio.sourdine(false);
      if (AV.jeu && AV.jeu.camera) AV.jeu.camera(0, 0.38, 6.5);
    };
    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { scene: scene && scene.nom, etape: scene && scene.etape, fait: JSON.stringify(FAIT), lui: L.etat, fini: fini }; },
      lancer: function (n) { lancer(n); },
      arreter: function () { arreterFilm(); },
      faire: function (k) { faire(k); },
      points: function () { return { lui: [CUIS.x, CUIS.z], tabouret: [TABW.x, TABW.z], livre: [tb1.x, tb1.z], canape: [chaiseW.x, chaiseW.z], porte: [pP.x, pP.z] }; }
    };
    if (REVEIL) reveil();
    // autres histoires dans le même appart (fichiers séparés : AV.scenariosAppart[nom](X))
    else if (cfg.scenario && AV.scenariosAppart && AV.scenariosAppart[cfg.scenario]) {
      AV.scenariosAppart[cfg.scenario]({
        mo: mo, G: G, cfg: cfg, nomLui: nomLui, lui: lui, L: L, colLui: colLui,
        INT: { tabouret: TAB_INT, lui: LUI_INT, livre: LIVRE_INT, canape: CANAPE_INT, retour: RETOUR }, INTERACTIFS: INTERACTIFS,
        cK: cK, D0: D0, PROF: PROF, HPLAN: HPLAN, BAR_S0: BAR_S0, BAR_S1: BAR_S1, BAR_D0: BAR_D0, BAR_D1: BAR_D1, BAR_SM: BAR_SM, BAR_DM: BAR_DM, HBAR: HBAR,
        TAB: TAB, TABW: TABW, tabouret: tabouret, S_CUIS: S_CUIS, S_EVIER: S_EVIER, S_FRIGO0: S_FRIGO0, S_FRIGO1: S_FRIGO1, CUIS: CUIS, angCuis: angCuis,
        poele: poele, garniture: garniture, casserole: casserole, planche: planche, bouilloire: bou, vapeur: vapeur, fruits: fruits,
        cW: cW, S_CANAPE: S_CANAPE, D_CANAPE: D_CANAPE, LS: LS, DS: DS, DC: DC, WC: WC, tb1: tb1, tb2: tb2,
        bulle: bulle, bulleLui: bulleLui, bulles: bulles, dire: dire, note: function () { return note; },
        poseDebout: poseDebout, poseAssise: poseAssise, marcheJambes: marcheJambes, allerVers: allerVers,
        cameraVers: cameraVers, resetCam: function () { regardCam = null; }, angleVers: angleVers, versMonde: versMonde, placer: placer,
        P: P, bx: bx, cyl: cyl, toile: toile, lumieres: lumieres, cheminVersCanape: cheminVersCanape
      });
    }
    return mo;

    // =====================================================================
    // JOUR 11 : le réveil. Elle somnole, il part au boulot en lui faisant un bisou sur le front,
    // 5 secondes de rêve, elle se lève et trouve un post-it sur le bar.
    function reveil() {
      // le décor du jour 10 se met en veille
      INTERACTIFS.forEach(function (i) { var k = mo.interactifs.indexOf(i); if (k >= 0) mo.interactifs.splice(k, 1); });
      vapeur.visible = false; garniture.visible = false; colLui.r = 0;
      lui.haut.children[1].visible = lui.haut.children[2].visible = lui.haut.children[3].visible = false; // pas de tablier
      lui.haut.add(bx(0.46, 0.52, 0.2, '#2d3a4a', 0, 0.45, -0.4));                                        // sac à dos
      lui.haut.add(bx(0.06, 0.6, 0.04, '#222a35', -0.18, 0.5, -0.26)); lui.haut.add(bx(0.06, 0.6, 0.04, '#222a35', 0.18, 0.5, -0.26));
      lui.spatule.visible = false; lui.groupe.visible = false;
      L.etat = 'absent'; L.vitesse = 1.9;
      lumieres.forEach(function (q) { q.base *= 0.5; q.l.intensity = q.base; }); // lumières tamisées, c'est le matin
      var R = { etape: 'dort', t: 0, t2: 0, oeil: 0, flou: 7, lean: 0, porte: 0, porteCible: 0, lum: 0.8 };

      // repères autour du lit (repère local du lit : +x = côté sud, +z = vers le pied du lit)
      function litW(lx, lz) { return versMonde(cE, S_LIT, EXT / 2 + 0.02, lx, lz); }
      var CHEVET = litW(1.78, 0.72), DEBOUT = litW(1.6, 1.6);
      var ELLE = { lx: 0.5, y: 1.0, lzPieds: 2.2 };
      var piedsW = litW(ELLE.lx, ELLE.lzPieds);
      var couette = AV.maille(new THREE.SphereGeometry(0.5, 14, 8), '#1c1d22'); couette.scale.set(1.0, 0.36, 1.75);
      var cw = litW(ELLE.lx, 1.55); couette.position.set(cw.x, 0.86, cw.z); couette.rotation.y = cE.rot; G.add(couette);
      // le post-it + un café sur le bar
      var pPost = cK.pt(BAR_S1 - 0.55, BAR_DM + 0.12);
      var postit = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshLambertMaterial({ map: toile(128, 128, function (x) {
        x.fillStyle = '#ffe96a'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, 0, 128, 14);
        x.strokeStyle = '#2b2a6b'; x.lineWidth = 3; for (var i = 0; i < 4; i++) { x.beginPath(); x.moveTo(16, 36 + i * 20); for (var k = 0; k < 8; k++) x.lineTo(16 + k * 12, 36 + i * 20 + Math.sin(k * 2 + i) * 3); x.stroke(); }
        x.fillStyle = '#d6303a'; x.font = '30px sans-serif'; x.fillText('❤', 86, 118);
      }), emissive: '#3a3200' }));
      postit.rotation.set(-Math.PI / 2, 0, cK.rot + 0.35); postit.position.set(pPost.x, HBAR + 0.042, pPost.z); G.add(postit);
      var lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: AV.textureRonde(), color: '#ffe680', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      lueur.scale.set(1.1, 1.1, 1); lueur.position.set(pPost.x, HBAR + 0.12, pPost.z); G.add(lueur);
      var tasse = new THREE.Group(), pT = cK.pt(BAR_S1 - 0.95, BAR_DM - 0.05); tasse.position.set(pT.x, HBAR + 0.035, pT.z); G.add(tasse);
      tasse.add(cyl(0.085, 0.07, 0.18, '#f7f4ee', 0, 0.09, 0, 14)); tasse.add(cyl(0.075, 0.075, 0.01, '#4a2c1a', 0, 0.17, 0, 14));
      var anse = AV.maille(new THREE.TorusGeometry(0.05, 0.015, 5, 10), '#f7f4ee'); anse.position.set(0.1, 0.09, 0); tasse.add(anse);
      var NF = 8, fPos = new Float32Array(NF * 3), fumee = [];
      for (var i = 0; i < NF; i++) fumee.push({ t: Math.random() * 1.4, o: Math.random() * 6 });
      var fG = new THREE.BufferGeometry(); fG.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
      var fum = new THREE.Points(fG, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, map: AV.textureRonde(), transparent: true, opacity: 0.35, depthWrite: false }));
      fum.frustumCulled = false; G.add(fum);
      var POSTIT_INT = { x: pPost.x, z: pPost.z, rayon: 0, texte: '✋ Lire le post-it 📝', fn: function () { lire(); } };
      mo.interactifs.unshift(POSTIT_INT);

      // paupières (calque HTML) + flou du canvas + rêve
      var pH = document.createElement('div'), pB = document.createElement('div'), reveEl = document.createElement('div');
      pH.className = 'paupiere haut'; pB.className = 'paupiere bas'; reveEl.className = 'reve';
      document.body.appendChild(pH); document.body.appendChild(pB); document.body.appendChild(reveEl);
      var jeuEl = document.getElementById('jeu');
      function yeux(k, flou) {
        k = Math.max(0, Math.min(1, k));
        pH.style.transform = 'translateY(' + (-k * 112) + '%)'; pB.style.transform = 'translateY(' + (k * 112) + '%)';
        pH.style.display = pB.style.display = k >= 0.999 ? 'none' : 'block';
        jeuEl.style.filter = flou > 0.2 ? 'blur(' + flou.toFixed(1) + 'px) brightness(1.12)' : '';
      }
      yeux(0, 7);
      document.body.classList.add('fpv');
      // le rêve : lui, à dos de baleine volante, mène l'armée des baleines à l'assaut du château des crapauds
      function rever() {
        var h = '';
        for (var i = 0; i < 4; i++) h += '<div class="nuage" style="top:' + (6 + i * 21) + '%;left:' + (i % 2 ? 50 : 0) + '%;animation-delay:' + (-i * 1.3) + 's">☁️</div>';
        // le château des crapauds (ils sautent sur les remparts, le roi au sommet)
        h += '<div class="chateau"><span class="tour">🏰</span>' +
          '<span class="crapaud roi" style="left:50%;top:18%">🐸<b>👑</b></span>' +
          '<span class="crapaud" style="left:12%;top:58%;animation-delay:-.2s">🐸</span>' +
          '<span class="crapaud" style="left:88%;top:58%;animation-delay:-.35s">🐸</span>' +
          '<span class="crapaud" style="left:33%;top:60%;animation-delay:-.1s">🐸</span>' +
          '<span class="boum" style="left:25%;top:62%;animation-delay:2.5s">💥</span>' +
          '<span class="boum" style="left:72%;top:40%;animation-delay:3.1s">💦</span>' +
          '<span class="boum" style="left:52%;top:30%;animation-delay:3.6s">💥</span>' +
          '<span class="drapeau">🏳️</span></div>';
        // l'escadron de baleines volantes, lui en tête
        var bal = [[30, 36, 17, 1], [13, 18, 10, 0], [9, 60, 11, 0], [-5, 36, 9, 0], [18, 76, 8, 0], [0, 8, 8, 0], [-14, 62, 7, 0]];
        h += '<div class="escadron">';
        bal.forEach(function (b, k) {
          h += '<div class="baleine' + (b[3] ? ' chef' : '') + '" style="left:' + b[0] + 'vw;top:' + b[1] + '%;font-size:' + b[2] + 'vmin;animation-delay:' + (-k * 0.37) + 's">' +
            '<span class="jet">💦</span><i>' + (k % 2 ? '🐋' : '🐳') + '</i>' +
            (b[3] ? '<span class="cavalier">🤴<em>🗡️</em></span><span class="cri">' + String(nomLui).replace(/</g, '&lt;') + ' :« À l\'assaaaaut !! »</span>' : '') + '</div>';
        });
        h += '</div><div class="bulle-reve legende">💭 Zzz… l\'armée des baleines volantes<br>attaque le château des crapauds ?!</div>';
        reveEl.innerHTML = h;
        reveEl.classList.add('visible'); AV.audio.reve();
      }
      function coeur(x, y, z) {
        var s = AV.texteSprite('❤', { fond: 'rgba(0,0,0,0)', largeur: 0.6, echelle: 0.5 });
        s.position.set(x, y, z); s.userData.vie = 2.2; G.add(s); bulles.push(s);
      }

      // ---------- trajets de lui ----------
      var porteC = cadre([280, 588], [332, 635]);
      var DEDANS = porteC.pt(porteC.L / 2, 0.8), DEHORS = porteC.pt(porteC.L / 2, -1.1), SEUIL = porteC.pt(porteC.L / 2, 0.1);
      function cheminArrivee() { return [P(430, 449), P(474, 449), P(560, 434), CHEVET]; }
      function cheminDepart() { return [P(560, 434), P(474, 449), P(430, 449), P(370, 483), P(352, 552), DEDANS]; }
      var DEP = P(398, 438);
      L.x = DEP.x; L.z = DEP.z; L.ang = angleVers(1, 0);

      // ---------- le scénario (le décor pilote la joueuse et la caméra) ----------
      var vTmp = new THREE.Vector3(), vTmp2 = new THREE.Vector3(), regard = new THREE.Vector3();
      function poseCouchee(Jj) {
        Jj.groupe.visible = R.etape === 'leve' || R.etape === 'libre' || R.etape === 'lire';
        Jj.groupe.rotation.order = 'YXZ'; Jj.groupe.rotation.y = angleVers(cE.n.x, cE.n.z); Jj.groupe.rotation.x = -(Math.PI / 2 - 0.15);
        Jj.position.set(piedsW.x, ELLE.y, piedsW.z); Jj.ombre.visible = false;
        Jj.parts.brasG.rotation.set(0, 0, -0.25); Jj.parts.brasD.rotation.set(0, 0, 0.25);
        Jj.parts.jambeG.rotation.set(0, 0, 0); Jj.parts.jambeD.rotation.set(0, 0, 0);
      }
      function cameraTete(camera, dt) {
        var oeil = litW(ELLE.lx, 0.62); camera.position.set(oeil.x, 1.32, oeil.z);
        var plaf = litW(0.1, 3.4); vTmp.set(plaf.x, 2.25, plaf.z);
        if (lui.groupe.visible && Math.hypot(L.x - CHEVET.x, L.z - CHEVET.z) < 3.5) { lui.tete.getWorldPosition(vTmp2); vTmp.lerp(vTmp2, R.etape === 'bisou' ? 0.95 : 0.6); }
        else if (lui.groupe.visible) { lui.tete.getWorldPosition(vTmp2); vTmp.lerp(vTmp2, 0.35); }
        if (!R.regardInit) { R.regardInit = true; regard.copy(vTmp); }
        regard.lerp(vTmp, Math.min(1, dt * 2.2));
        camera.lookAt(regard.x + Math.sin(R.t * 0.7) * 0.05, regard.y + Math.sin(R.t * 0.5) * 0.04, regard.z);
      }
      function piloteReveil(dt, e, appui, Jj, camera, x) {
        J = Jj; x = x || {}; R.t += dt; R.t2 += dt;
        if (R.etape === 'dort' || R.etape === 'bisou' || R.etape === 'depart' || R.etape === 'reve' || R.etape === 'eveil') {
          poseCouchee(Jj); cameraTete(camera, dt);
          if (x.action && R.t > 2 && R.etape !== 'reve' && R.etape !== 'eveil') { // passer l'intro
            versReve();
          }
        }
        if (R.etape === 'dort') {
          // elle entrouvre les yeux… il entre dans la chambre
          R.oeil = Math.min(0.32, R.t * 0.12) * (Math.sin(R.t * 1.7) > 0.93 ? 0.3 : 1);
          R.flou = Math.max(3.5, 7 - R.t * 1.5);
          if (R.t > 0.6 && L.etat === 'absent') { L.etat = 'marche'; L.chemin = cheminArrivee(); L.ensuite = 'chevet'; }
          if (L.etat === 'chevet') { R.etape = 'bisou'; R.t2 = 0; }
        } else if (R.etape === 'bisou') {
          R.oeil = AV.lerp(R.oeil, 0.55, Math.min(1, dt * 2)); R.flou = AV.lerp(R.flou, 2.2, Math.min(1, dt * 2));
          R.lean = R.t2 < 2.8 ? Math.min(1, R.t2 / 1.2) : Math.max(0, 1 - (R.t2 - 2.8) / 0.8);
          if (R.t2 > 1.2 && !R.bisou) {
            R.bisou = true; AV.audio.bisou(); var tw = litW(ELLE.lx, 0.5); coeur(tw.x, 1.65, tw.z);
            dire('💬 ' + nomLui + ' : « Je file au boulot… dors bien mon cœur ❤ »', 4.5);
          }
          if (R.t2 > 3.7) { R.etape = 'depart'; R.t2 = 0; L.etat = 'marche'; L.chemin = cheminDepart(); L.ensuite = 'porte'; }
        } else if (R.etape === 'depart') {
          // ses paupières se referment pendant qu'il s'en va
          R.oeil = Math.max(0, 0.55 - Math.max(0, R.t2 - 1.0) * 0.14); R.flou = Math.min(7, 2.2 + R.t2 * 0.8);
          if (L.etat === 'porte' && !R.ouvre) { R.ouvre = true; R.porteCible = 1; AV.audio.porte(false); setTimeout(function () { if (L.etat === 'porte') { L.etat = 'marche'; L.chemin = [SEUIL, DEHORS]; L.ensuite = 'parti'; } }, 700); }
          if (L.etat === 'parti' && !R.ferme) { R.ferme = true; R.porteCible = 0; setTimeout(function () { AV.audio.porte(true); }, 450); }
          if ((L.etat === 'parti' && R.t2 > 4.6) || R.t2 > 16) { R.etape = 'reve'; R.t2 = 0; R.reveT0 = Date.now(); rever(); }
        } else if (R.etape === 'reve') {
          R.oeil = 0; R.flou = 7;
          if (Date.now() - R.reveT0 > 5000) { reveEl.classList.remove('visible'); R.etape = 'eveil'; R.t2 = 0; R.lumCible = 1; dire('☀️ Mmmh… il est déjà parti ? 🥱', 3.5); AV.audio.sourdine(false); if (api) api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '☀️ Debout, petite marmotte !'); }
        } else if (R.etape === 'eveil') {
          // deux clignements, puis les yeux grands ouverts
          var k = R.t2, seq = [[0, 0], [0.5, 0.3], [0.75, 0.04], [1.25, 0.65], [1.45, 0.3], [2.1, 1]];
          for (var i = 0; i < seq.length - 1; i++) if (k >= seq[i][0] && k < seq[i + 1][0]) R.oeil = AV.lerp(seq[i][1], seq[i + 1][1], (k - seq[i][0]) / (seq[i + 1][0] - seq[i][0]));
          if (k >= 2.1) R.oeil = 1;
          R.flou = Math.max(0, 5 - k * 2.4);
          if (k > 2.4) { R.etape = 'leve'; R.t2 = 0; couette.visible = false; }
        } else if (R.etape === 'leve') {
          // vue subjective : elle se redresse, s'étire, pose les pieds par terre et se tourne vers la porte
          var q = Math.min(1, R.t2 / 2.4), qe = q * q * (3 - 2 * q), oeilL = litW(ELLE.lx, 0.62);
          Jj.groupe.visible = false;
          var hx = AV.lerp(oeilL.x, DEBOUT.x, qe), hz = AV.lerp(oeilL.z, DEBOUT.z, qe);
          camera.position.set(hx, AV.lerp(1.32, OEIL_H, qe) + Math.sin(q * Math.PI) * 0.12, hz);
          var plafL = litW(0.1, 3.4), devant = { x: DEBOUT.x - Math.sin(LACET0) * 3, z: DEBOUT.z - Math.cos(LACET0) * 3 };
          var mi = litW(ELLE.lx, 3.2); // à mi-chemin : elle regarde ses pieds au bout du lit
          var a = Math.min(1, qe * 2), b = Math.max(0, qe * 2 - 1);
          vTmp.set(AV.lerp(plafL.x, mi.x, a), AV.lerp(2.25, 0.7, a), AV.lerp(plafL.z, mi.z, a));
          vTmp.set(AV.lerp(vTmp.x, devant.x, b), AV.lerp(vTmp.y, OEIL_H - 0.15, b), AV.lerp(vTmp.z, devant.z, b));
          regard.lerp(vTmp, Math.min(1, dt * 5));
          camera.lookAt(regard);
          if (q >= 1) {
            R.etape = 'libre'; R.t2 = 0; poseDebout(Jj); Jj.position.set(DEBOUT.x, 0, DEBOUT.z); Jj.groupe.rotation.y = angleVers(-cE.u.x, -cE.u.z);
            Jj.angle = Jj.groupe.rotation.y; Jj.vitesse.set(0, 0, 0); Jj.vy = 0;
            R.lacet = LACET0; R.tang = -0.05;
            document.body.classList.remove('fpv'); mo.pilote = piloteFP; POSTIT_INT.rayon = 1.55;
            dire('📝 Il t\'a laissé quelque chose sur la table de la cuisine…', 5);
          }
        }
        yeux(R.oeil, R.flou);
      }
      mo.pilote = piloteReveil;

      // ---------- après le lever : marche libre en première personne ----------
      // en se levant elle se tourne vers la porte de la chambre (convention du moteur : regard = (-sin, -cos))
      var PORTE_CH = P(450, 449), LACET0 = Math.atan2(-(PORTE_CH.x - DEBOUT.x), -(PORTE_CH.z - DEBOUT.z));
      var OEIL_H = 2.15; // hauteur des yeux debout (le décor est à l'échelle ×1,4)
      function piloteFP(dt, e, appui, Jj, camera, x) {
        J = Jj; x = x || {}; R.t += dt; R.t2 += dt;
        var r = x.regard || { dx: 0, dy: 0 };
        R.lacet -= r.dx * 0.0055;
        R.tang = Math.max(-0.8, Math.min(0.55, R.tang - r.dy * 0.004));
        Jj.maj(dt, e, x.saut, R.lacet, mo, R.t);
        Jj.groupe.visible = false; if (Jj.ombre) Jj.ombre.visible = false;
        var v = Math.hypot(Jj.vitesse.x, Jj.vitesse.z);
        R.pas = (R.pas || 0) + dt * v * 3.2;
        var cp = Math.cos(R.tang), py = Jj.position.y + OEIL_H + Math.sin(R.pas) * 0.025 * Math.min(1, v);
        camera.position.set(Jj.position.x, py, Jj.position.z);
        camera.lookAt(Jj.position.x - Math.sin(R.lacet) * cp, py + Math.sin(R.tang), Jj.position.z - Math.cos(R.lacet) * cp);
        // ✋ : le moteur confie le bouton au décor pendant le pilotage
        if (x.action) {
          var px = Jj.position.x, pz = Jj.position.z;
          if (R.etape === 'libre' && Math.hypot(px - pPost.x, pz - pPost.z) < POSTIT_INT.rayon) { AV.audio.clic(); lire(); }
          else if (R.etape === 'fini' && Math.hypot(px - RETOUR.x, pz - RETOUR.z) < RETOUR.rayon) { AV.audio.clic(); AV.jeu.allerHub(); }
        }
      }

      // lire le post-it : gros plan, puis la surprise
      function lire() {
        if (R.etape !== 'libre') return;
        R.etape = 'lire'; R.t2 = 0; POSTIT_INT.rayon = 0; regardCam = null;
        var pj = J ? J.position : posJ;
        var cote = (pj && ((pj.x - pPost.x) * cK.n.x + (pj.z - pPost.z) * cK.n.z) < 0) ? -1 : 1;
        var ici = cK.pt(BAR_S1 - 0.55, cote > 0 ? BAR_D1 + 0.45 : BAR_D0 - 0.45);
        var dep = { x: J ? J.position.x : ici.x, z: J ? J.position.z : ici.z }, init = false;
        mo.pilote = function (dt, e, appui, Jj, camera) {
          J = Jj; R.t2 += dt;
          if (!init) { init = true; camera.getWorldDirection(vTmp2); regard.copy(camera.position).add(vTmp2.multiplyScalar(2)); }
          // elle s'approche du bar, se penche et prend le post-it (vue subjective)
          var k = Math.min(1, R.t2 / 1.1), ke = k * k * (3 - 2 * k);
          Jj.position.set(AV.lerp(dep.x, ici.x, ke), 0, AV.lerp(dep.z, ici.z, ke)); Jj.vitesse.set(0, 0, 0);
          Jj.groupe.visible = false;
          var lev = Math.max(0, R.t2 - 1.0);
          postit.position.y = HBAR + 0.042 + Math.min(0.3, lev * 0.3);
          postit.rotation.x = -Math.PI / 2 + Math.min(0.7, lev * 0.7);
          var cx = AV.lerp(Jj.position.x, pPost.x, 0.35 * ke), cz = AV.lerp(Jj.position.z, pPost.z, 0.35 * ke);
          camera.position.set(cx, OEIL_H - 0.3 * ke, cz); // elle se penche au-dessus du bar
          vTmp.set(pPost.x, postit.position.y, pPost.z); regard.lerp(vTmp, Math.min(1, dt * 4)); camera.lookAt(regard);
          if (R.t2 > 2.1 && !R.lu) {
            R.lu = true; postit.visible = false; lueur.visible = false;
            if (api) api.trouver();
            setTimeout(function () {
              R.etape = 'fini'; R.lacet = Math.atan2(-(pPost.x - ici.x), -(pPost.z - ici.z)); R.tang = -0.1;
              if (mo.interactifs.indexOf(RETOUR) < 0) mo.interactifs.push(RETOUR);
              mo.pilote = piloteFP;
            }, 600);
          }
        };
      }

      // animation : lui (chevet, porte), la porte d'entrée, le café, la lueur du post-it
      mo.anime(function (dt, t) {
        var lg = lui.groupe;
        lg.visible = L.etat !== 'absent' && L.etat !== 'parti';
        if (L.etat === 'chevet') {
          var vers = litW(ELLE.lx, 0.55);
          L.x = CHEVET.x; L.z = CHEVET.z; L.ang = AV.angleLerp(L.ang, angleVers(vers.x - L.x, vers.z - L.z), Math.min(1, dt * 6));
          lg.position.set(L.x, 0, L.z); lg.rotation.y = L.ang;
          lui.haut.rotation.set(0.8 * R.lean, 0, 0); lui.haut.position.y = 0.62;
          lui.tete.rotation.set(0.35 * R.lean, 0, 0.15 * R.lean);
          lui.brasD.rotation.set(-0.9 * R.lean, 0, 0.15); lui.brasG.rotation.set(-0.3 * R.lean, 0, -0.15);
          lui.jambeG.rotation.set(0, 0, 0); lui.jambeD.rotation.set(0, 0, 0);
        } else if (L.etat === 'porte') {
          lg.position.set(L.x, 0, L.z); lui.jambeG.rotation.set(0, 0, 0); lui.jambeD.rotation.set(0, 0, 0);
          lui.brasD.rotation.set(-0.8, 0, 0.2); lui.haut.rotation.set(0, 0, 0);
        }
        R.porte = AV.lerp(R.porte, R.porteCible, Math.min(1, dt * 5));
        if (porteEntree) porteEntree.rotation.y = R.porte * 1.35;
        // lumière du matin qui monte au réveil
        if (R.lumCible) { R.lum = Math.min(1, R.lum + dt * 0.35); if (api) api.eclairage(R.lum); }
        for (var i = 0; i < NF; i++) {
          var f = fumee[i]; f.t += dt * 0.5; if (f.t > 1.4) f.t -= 1.4;
          fPos[i * 3] = tasse.position.x + Math.sin(f.t * 4 + f.o) * 0.03; fPos[i * 3 + 1] = tasse.position.y + 0.2 + f.t * 0.35; fPos[i * 3 + 2] = tasse.position.z + Math.cos(f.t * 3 + f.o) * 0.03;
        }
        fG.attributes.position.needsUpdate = true;
        lueur.material.opacity = R.etape === 'libre' ? 0.35 + Math.sin(t * 3) * 0.2 : 0;
      });

      mo.surTrouve = function (ctx) { ctx.fin(cfg.surprise ? cfg : null); };
      mo.debut = function (a) {
        api = a; api.eclairage(R.lum); AV.audio.sourdine(true);
        api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, '😴 7 h 12… encore un peu…');
        document.getElementById('hud-aide-clavier').textContent = 'E / ✋ : passer l\'intro · ZQSD : marcher · glisser : regarder autour';
      };
      mo.astuce = function () {
        if (note) return note.t;
        if (R.etape === 'dort') return '😴 …';
        if (R.etape === 'bisou') return R.bisou ? '😊 mmh… ❤' : '😴 …';
        if (R.etape === 'libre') return '📝 Il t\'a laissé un mot sur la table de la cuisine…';
        if (R.etape === 'fini') return '☕ Bonne journée ! La porte d\'entrée te ramène au village';
        return null;
      };
      var nettoyerBase = mo.nettoyer;
      mo.nettoyer = function () {
        nettoyerBase();
        [pH, pB, reveEl].forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
        jeuEl.style.filter = ''; document.body.classList.remove('fpv');
        if (J) { J.groupe.visible = true; if (J.ombre) J.ombre.visible = true; }
      };
      mo.debug.etat = function () { return { etape: R.etape, lui: L.etat, x: +L.x.toFixed(2), z: +L.z.toFixed(2), reste: L.chemin && L.chemin.length, porte: +R.porte.toFixed(2), oeil: +R.oeil.toFixed(2), t2: +R.t2.toFixed(1), jx: J && +J.position.x.toFixed(2), jz: J && +J.position.z.toFixed(2), debout: [+DEBOUT.x.toFixed(2), +DEBOUT.z.toFixed(2)], lacet: R.lacet && +R.lacet.toFixed(2) }; };
      function versReve() { L.etat = 'parti'; L.chemin = null; R.porteCible = 0; R.etape = 'reve'; R.t2 = 0; R.reveT0 = Date.now(); rever(); }
      mo.debug.rever = versReve;
      mo.debug.passer = function () { versReve(); R.reveT0 = Date.now() - 4900; };
      mo.debug.lire = function () { lire(); };
      mo.debug.postit = function () { return [pPost.x, pPost.z]; };
    }
  };
})(window.AV);
