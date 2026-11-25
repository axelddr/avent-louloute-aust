/* Personnage joueur : modèle low-poly, déplacement, saut, collisions, animations */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var MARCHE = 4.2, COURSE = 7.8, SAUT = 7, GRAVITE = 20, RAYON = 0.38;

  function membre(longueur, epais, couleur, bout, couleurBout) {
    var pivot = new THREE.Group();
    var m = AV.maille(new THREE.CylinderGeometry(epais, epais * 0.9, longueur, 6), couleur);
    m.position.y = -longueur / 2; pivot.add(m);
    if (bout) {
      var b = AV.maille(bout, couleurBout);
      b.position.y = -longueur - 0.02; pivot.add(b);
    }
    return pivot;
  }

  // Océane : le squelette (pivots animés) ne change pas, les habits se reconstruisent chaque jour (habiller)
  AV.Personnage = function () {
    var g = new THREE.Group();
    var corps = new THREE.Group(); g.add(corps);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    var pompon = new THREE.Object3D(); tete.add(pompon); // (ancien pompon du bonnet : gardé pour l'animation)
    var brasG = new THREE.Group(), brasD = new THREE.Group();
    brasG.position.set(-0.36, 1.32, 0); brasD.position.set(0.36, 1.32, 0);
    brasG.rotation.z = -0.15; brasD.rotation.z = 0.15;
    corps.add(brasG, brasD);
    var jambeG = new THREE.Group(), jambeD = new THREE.Group();
    jambeG.position.set(-0.13, 0.62, 0); jambeD.position.set(0.13, 0.62, 0);
    g.add(jambeG, jambeD);
    this.habits = new THREE.Group(); corps.add(this.habits);
    this.groupe = g;
    this.parts = { corps: corps, tete: tete, brasG: brasG, brasD: brasD, jambeG: jambeG, jambeD: jambeD, pompon: pompon };
    this.habiller(AV.avatars ? AV.avatars.tenue(null) : null);

    // ombre ronde au sol (lisible même sans ombres portées)
    var ombre = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    ombre.rotation.x = -Math.PI / 2;

    this.groupe = g;
    this.ombre = ombre;
    this.position = g.position;
    this.vitesse = new THREE.Vector3();
    this.vy = 0;
    this.auSol = true;
    this.angle = 0;
    this.phase = 0;
    this.dernierPas = 0;
    this.parts = { corps: corps, tete: tete, brasG: brasG, brasD: brasD, jambeG: jambeG, jambeD: jambeD, pompon: pompon };
  };

  // ---------- la tenue du jour (voir AV.avatars.TENUES) ----------
  AV.Personnage.prototype.habiller = function (t) {
    var A = AV.avatars; if (!A || !t) return;
    var pr = this.parts, C = A.couleurs, M = A.mat, peau = C.peauO, H = this.habits;
    function vider(o) {
      for (var i = o.children.length - 1; i >= 0; i--) { var c = o.children[i]; o.remove(c); c.traverse(function (x) { if (x.geometry) x.geometry.dispose(); }); }
    }
    function mm(geo, mt, x, y, z) { var o = new THREE.Mesh(geo, mt); o.castShadow = true; o.position.set(x || 0, y || 0, z || 0); return o; }
    vider(H); vider(pr.tete); vider(pr.brasG); vider(pr.brasD); vider(pr.jambeG); vider(pr.jambeD);
    var robe = t.type === 'robe', maillot = t.type === 'maillot', mPeau = M(peau);
    var mHaut = maillot ? mPeau : t.veste ? M(t.veste) : A.tissu(t, robe ? t.robe : t.haut);
    var nues = t.manches === 'nues' && !t.veste;
    var gros = t.doudoune ? 0.05 : 0;

    // tête : crâne (toujours le 1er enfant), yeux, joues, puis coiffure d'Océane
    pr.tete.add(mm(new THREE.SphereGeometry(0.27, 24, 18), A.lisse(peau)));
    A.teteOceane(pr.tete, 0.27);
    if (t.chapeau) { // chapeau de paille
      var ch = new THREE.Group(); ch.position.y = 0.2; ch.rotation.x = -0.12; pr.tete.add(ch);
      ch.add(mm(new THREE.CylinderGeometry(0.5, 0.52, 0.025, 16), M('#e6cf96'))); ch.add(mm(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 14), M('#e6cf96'), 0, 0.1, 0));
      ch.add(mm(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 14), M('#8a5a3a'), 0, 0.03, 0));
    }
    if (t.casquette) { var cq = new THREE.Group(); cq.position.set(0, 0.2, 0); cq.rotation.x = -0.15; pr.tete.add(cq); var dome = mm(new THREE.SphereGeometry(0.33, 12, 6, 0, 6.283, 0, Math.PI / 2), M(t.casquette)); dome.scale.y = 0.6; cq.add(dome); cq.add(mm(new THREE.BoxGeometry(0.34, 0.02, 0.24), M(t.casquette), 0, 0, 0.36)); }
    if (t.lunettes) { [-0.09, 0.09].forEach(function (x) { var l = mm(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), M('#2a2a30'), x, 0.27, 0.15); l.rotation.x = 1.0; pr.tete.add(l); }); }
    pr.tete.add(pr.pompon);

    // cou, buste, épaules
    H.add(mm(new THREE.CylinderGeometry(0.085, 0.1, 0.16, 8), mPeau, 0, 1.42, 0));
    var buste = mm(new THREE.CylinderGeometry(0.235 + gros, 0.255 + gros, 0.52, 10), mHaut, 0, 1.12, 0); H.add(buste);
    var ep = mm(new THREE.SphereGeometry(0.24 + gros, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), nues || maillot ? mPeau : mHaut, 0, 1.37, 0); ep.scale.y = 0.45; H.add(ep);
    if (nues && !maillot) [-0.1, 0.1].forEach(function (x) { H.add(mm(new THREE.BoxGeometry(0.035, 0.14, 0.04), mHaut, x, 1.4, 0.15)); }); // bretelles
    if (t.doudoune) [0.95, 1.12, 1.29].forEach(function (y) { var b = mm(new THREE.TorusGeometry(0.29, 0.035, 5, 14), M(t.haut), 0, y, 0); b.rotation.x = Math.PI / 2; H.add(b); });
    if (maillot) { // bikini
      var mb = A.tissu(t, t.haut);
      [-0.085, 0.085].forEach(function (x) { var c = mm(new THREE.SphereGeometry(0.085, 8, 5), mb, x, 1.2, 0.2); c.scale.set(1, 0.8, 0.55); H.add(c); });
      H.add(mm(new THREE.CylinderGeometry(0.262, 0.262, 0.035, 10), mb, 0, 1.2, 0));
      H.add(mm(new THREE.CylinderGeometry(0.255, 0.24, 0.16, 10), mb, 0, 0.86, 0));
    }
    if (t.echarpe) { var e = mm(new THREE.TorusGeometry(0.2, 0.07, 5, 10), M(t.echarpe), 0, 1.38, 0); e.rotation.x = Math.PI / 2; H.add(e); var pn = mm(new THREE.BoxGeometry(0.12, 0.36, 0.05), M(t.echarpe), 0.1, 1.2, 0.24); pn.rotation.z = 0.12; H.add(pn); }

    // robe, jupe, short, pantalon
    var jambes = mPeau;
    if (robe) {
      var hem = t.longueur === 'courte' ? 0.5 : t.longueur === 'longue' ? 0.1 : 0.3, rb = t.longueur === 'courte' ? 0.35 : t.longueur === 'longue' ? 0.46 : 0.41;
      H.add(mm(new THREE.CylinderGeometry(0.255, rb, 0.92 - hem, 14), A.tissu(t, t.robe), 0, (0.92 + hem) / 2, 0));
      H.add(mm(new THREE.CylinderGeometry(0.262, 0.262, 0.04, 12), M(shade(t.robe)), 0, 0.9, 0)); // ceinture
      if (t.veste) { var mv = M(t.veste); H.add(mm(new THREE.CylinderGeometry(0.27, 0.43, 0.52, 14, 1, true), new THREE.MeshLambertMaterial({ color: t.veste, side: THREE.DoubleSide, flatShading: true }), 0, 0.68, 0)); [-0.06, 0.06].forEach(function (x) { H.add(mm(new THREE.BoxGeometry(0.1, 0.5, 0.03), mv, x, 1.12, 0.25)); }); }
    } else if (!maillot) {
      var mb2 = M(t.bas);
      H.add(mm(new THREE.CylinderGeometry(0.255, 0.27, 0.22, 10), mb2, 0, 0.84, 0));
      if (t.basType === 'jupe') H.add(mm(new THREE.CylinderGeometry(0.26, 0.36, 0.4, 12), mb2, 0, 0.72, 0));
      if (t.basType === 'pantalon') jambes = mb2;
    }
    if (t.collants) jambes = M(t.collants);

    // bras : peau, manches courtes ou longues ; main ; bracelet doré
    [pr.brasG, pr.brasD].forEach(function (b, i) {
      var longues = t.manches === 'longues' || t.veste;
      var bras = mm(new THREE.CylinderGeometry(0.068 + gros, 0.06 + gros, 0.55, 6), longues ? mHaut : mPeau, 0, -0.275, 0); b.add(bras);
      if (t.manches === 'courtes' && !t.veste) b.add(mm(new THREE.CylinderGeometry(0.088, 0.082, 0.2, 7), mHaut, 0, -0.08, 0));
      b.add(mm(new THREE.IcosahedronGeometry(0.068, 0), mPeau, 0, -0.58, 0));
      if (i === 1 && !longues) { var br = mm(new THREE.TorusGeometry(0.068, 0.012, 4, 10), M(C.or), 0, -0.5, 0); br.rotation.x = Math.PI / 2; b.add(br); }
    });
    // jambes + chaussures
    [pr.jambeG, pr.jambeD].forEach(function (j) {
      j.add(mm(new THREE.CylinderGeometry(0.08, 0.065, 0.55, 6), jambes, 0, -0.275, 0));
      j.add(mm(new THREE.BoxGeometry(0.15, 0.09, 0.26), M(t.chaussures || '#c99a6b'), 0, -0.57, 0.05));
    });
    function shade(c) { var k = new THREE.Color(c); k.multiplyScalar(0.75); return '#' + k.getHexString(); }
    this.tenue = t;
  };

  AV.Personnage.prototype.placer = function (x, z, angle, monde) {
    this.position.set(x, monde.hauteur(x, z), z);
    this.angle = angle || 0;
    this.groupe.rotation.y = this.angle;
    this.vitesse.set(0, 0, 0);
    this.vy = 0;
  };

  function collisions(p, monde) {
    var cs = monde.colliders;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (c.rect) {
        // rectangle orienté (angle c.a)
        var dx = p.x - c.x, dz = p.z - c.z;
        var ca = Math.cos(-c.a || 0), sa = Math.sin(-c.a || 0);
        var lx = dx * ca - dz * sa, lz = dx * sa + dz * ca;
        var qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
        var ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
        if (d2 < RAYON * RAYON) {
          if (d2 < 1e-6) { // au centre : sortir par le côté le plus proche
            if (c.hx - Math.abs(lx) < c.hz - Math.abs(lz)) { lx = (lx < 0 ? -1 : 1) * (c.hx + RAYON); }
            else { lz = (lz < 0 ? -1 : 1) * (c.hz + RAYON); }
          } else {
            var d = Math.sqrt(d2), k = (RAYON - d) / d;
            lx += ex * k; lz += ez * k;
          }
          p.x = c.x + lx * Math.cos(c.a || 0) - lz * Math.sin(c.a || 0);
          p.z = c.z + lx * Math.sin(c.a || 0) + lz * Math.cos(c.a || 0);
        }
      } else {
        var ddx = p.x - c.x, ddz = p.z - c.z, min = c.r + RAYON;
        var dd = ddx * ddx + ddz * ddz;
        if (dd < min * min && dd > 1e-6) {
          var l = Math.sqrt(dd);
          p.x = c.x + ddx / l * min; p.z = c.z + ddz / l * min;
        }
      }
    }
    var lr = Math.sqrt(p.x * p.x + p.z * p.z);
    if (lr > monde.rayon) { p.x *= monde.rayon / lr; p.z *= monde.rayon / lr; }
  }

  AV.Personnage.prototype.maj = function (dt, entree, sauter, lacet, monde, t) {
    var fx = -Math.sin(lacet), fz = -Math.cos(lacet);
    var rx = Math.cos(lacet), rz = -Math.sin(lacet);
    var mx = fx * entree.y + rx * entree.x, mz = fz * entree.y + rz * entree.x;
    var l = Math.sqrt(mx * mx + mz * mz);
    var vmax = entree.course ? COURSE : MARCHE;
    var cible = new THREE.Vector3(0, 0, 0);
    if (l > 0.05) { cible.set(mx / Math.max(l, 1), 0, mz / Math.max(l, 1)).multiplyScalar(vmax * Math.min(1, l * 1.15)); }
    var acc = this.auSol ? 12 : 4;
    this.vitesse.x = AV.lerp(this.vitesse.x, cible.x, Math.min(1, acc * dt));
    this.vitesse.z = AV.lerp(this.vitesse.z, cible.z, Math.min(1, acc * dt));

    var p = this.position;
    var ancien = { x: p.x, z: p.z };
    p.x += this.vitesse.x * dt; p.z += this.vitesse.z * dt;
    collisions(p, monde);
    if (monde.autorise && !monde.autorise(p.x, p.z)) { p.x = ancien.x; p.z = ancien.z; }

    var sol = monde.hauteur(p.x, p.z);
    if (sauter && this.auSol) { this.vy = SAUT; this.auSol = false; AV.audio.saut(); }
    this.vy -= GRAVITE * dt;
    p.y += this.vy * dt;
    if (p.y <= sol || (this.auSol && p.y - sol < 0.35 && this.vy <= 0)) {
      if (!this.auSol && this.vy < -4) AV.audio.pas(monde.surface);
      p.y = sol; this.vy = 0; this.auSol = true;
    } else if (p.y > sol + 0.35) {
      this.auSol = false;
    }

    // orientation
    var v = Math.sqrt(this.vitesse.x * this.vitesse.x + this.vitesse.z * this.vitesse.z);
    if (v > 0.3) this.angle = AV.angleLerp(this.angle, Math.atan2(this.vitesse.x, this.vitesse.z), Math.min(1, 12 * dt));
    this.groupe.rotation.y = this.angle;

    // animation
    var pr = this.parts;
    var k = Math.min(1, v / MARCHE);
    if (this.auSol) {
      var avant = this.phase;
      this.phase += dt * (4 + v * 1.6);
      var s = Math.sin(this.phase);
      pr.jambeG.rotation.x = s * 0.9 * k; pr.jambeD.rotation.x = -s * 0.9 * k;
      pr.brasG.rotation.x = -s * 0.8 * k; pr.brasD.rotation.x = s * 0.8 * k;
      pr.corps.position.y = Math.abs(Math.cos(this.phase)) * 0.08 * k + Math.sin(t * 2) * 0.01;
      pr.corps.rotation.x = 0.08 * k * (v / COURSE + 0.5);
      pr.pompon.position.z = -0.08 - Math.abs(s) * 0.05 * k;
      if (k > 0.2 && Math.floor(avant / Math.PI) !== Math.floor(this.phase / Math.PI)) AV.audio.pas(monde.surface);
      if (k < 0.05) { pr.tete.rotation.y = Math.sin(t * 0.6) * 0.25; } else { pr.tete.rotation.y *= 0.9; }
    } else {
      pr.jambeG.rotation.x = 0.5; pr.jambeD.rotation.x = -0.3;
      pr.brasG.rotation.x = -2.4; pr.brasD.rotation.x = -2.4;
      pr.corps.rotation.x = -0.05;
    }

    this.ombre.position.set(p.x, sol + 0.03, p.z);
    var hAir = Math.max(0, p.y - sol);
    this.ombre.scale.setScalar(Math.max(0.4, 1 - hAir * 0.25));
    return v;
  };
})(window.AV);
