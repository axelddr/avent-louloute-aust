/* Animaux à trouver : modèles low-poly + animations (repos, alerte, trouvé) */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var NOMS = {
    renard: 'le renard', chat: 'le chat', lapin: 'le lapin', hibou: 'le hibou', tortue: 'la tortue',
    pingouin: 'le pingouin', chien: 'le chien', ecureuil: "l'écureuil", ours: "l'ourson",
    kangourou: 'le kangourou', quokka: 'le quokka', calopsite: 'la calopsite', loutre: 'la loutre', loulou: 'Loulou'
  };
  AV.nomAnimal = function (t) { return NOMS[t] || "l'animal"; };

  function yeux(tete, ecart, y, z, taille) {
    [-1, 1].forEach(function (c) {
      var o = AV.maille(new THREE.SphereGeometry(taille || 0.045, 6, 4), '#1b1b22', false);
      o.position.set(c * ecart, y, z); tete.add(o);
      var b = AV.maille(new THREE.SphereGeometry((taille || 0.045) * 0.35, 4, 3), '#ffffff', false);
      b.position.set(c * ecart + 0.012, y + 0.015, z + (taille || 0.045) * 0.8); tete.add(b);
    });
  }

  // Quadrupède paramétrable
  function quadrupede(o) {
    var g = new THREE.Group(), s = o.taille || 1;
    var corps = new THREE.Group(); g.add(corps);
    var tronc = AV.maille(new THREE.IcosahedronGeometry(0.34, 1), o.couleur);
    tronc.scale.set(0.95, 0.85, 1.35); tronc.position.y = 0.45; corps.add(tronc);
    if (o.ventre) {
      var v = AV.maille(new THREE.IcosahedronGeometry(0.26, 1), o.ventre);
      v.scale.set(0.8, 0.7, 1.1); v.position.set(0, 0.37, 0.12); corps.add(v);
    }
    var tete = new THREE.Group(); tete.position.set(0, 0.78, 0.42); corps.add(tete);
    var crane = AV.maille(new THREE.IcosahedronGeometry(0.25, 1), o.couleur); tete.add(crane);
    if (o.museau === 'pointu') {
      var m = AV.maille(new THREE.ConeGeometry(0.12, 0.3, 6), o.ventre || o.couleur); m.rotation.x = Math.PI / 2; m.position.set(0, -0.06, 0.26); tete.add(m);
      var nz = AV.maille(new THREE.SphereGeometry(0.04, 5, 4), '#1b1b22', false); nz.position.set(0, -0.06, 0.41); tete.add(nz);
    } else {
      var m2 = AV.maille(new THREE.IcosahedronGeometry(0.12, 0), o.ventre || o.couleur); m2.scale.set(1.1, 0.75, 0.9); m2.position.set(0, -0.07, 0.2); tete.add(m2);
      var nz2 = AV.maille(new THREE.SphereGeometry(0.035, 5, 4), o.nez || '#1b1b22', false); nz2.position.set(0, -0.03, 0.3); tete.add(nz2);
    }
    yeux(tete, 0.1, 0.05, 0.2);
    var oreilles = [];
    [-1, 1].forEach(function (c) {
      var or;
      if (o.oreilles === 'longues') { or = AV.maille(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 5), o.couleur); or.scale.z = 0.5; or.position.set(c * 0.09, 0.38, -0.02); or.rotation.z = -c * 0.12; }
      else if (o.oreilles === 'rondes') { or = AV.maille(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), o.couleur); or.rotation.x = Math.PI / 2; or.position.set(c * 0.17, 0.2, -0.02); }
      else if (o.oreilles === 'tombantes') { or = AV.maille(new THREE.BoxGeometry(0.08, 0.26, 0.14), o.oreilleCouleur || o.couleur); or.position.set(c * 0.24, -0.02, 0); or.rotation.z = c * 0.25; }
      else { or = AV.maille(new THREE.ConeGeometry(0.09, 0.22, 4), o.couleur); or.position.set(c * 0.13, 0.25, -0.02); or.rotation.z = -c * 0.25; }
      tete.add(or); oreilles.push(or);
    });
    var pattes = [];
    [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]].forEach(function (p) {
      var pv = new THREE.Group(); pv.position.set(p[0], 0.28, p[1]);
      var pa = AV.maille(new THREE.CylinderGeometry(0.055, 0.05, 0.3, 5), o.pattes || o.couleur); pa.position.y = -0.14; pv.add(pa);
      corps.add(pv); pattes.push(pv);
    });
    var queue = new THREE.Group(); queue.position.set(0, 0.55, -0.42); corps.add(queue);
    if (o.queue === 'touffue') {
      var q = AV.maille(new THREE.ConeGeometry(0.15, 0.6, 6), o.couleur); q.rotation.x = -Math.PI / 2 - 0.5; q.position.set(0, 0.12, -0.25); queue.add(q);
      if (o.bout) { var b = AV.maille(new THREE.ConeGeometry(0.1, 0.2, 6), o.bout); b.rotation.x = Math.PI / 2 - 0.5; b.position.set(0, 0.26, -0.5); queue.add(b); }
    } else if (o.queue === 'pompon') {
      var pp = AV.maille(new THREE.IcosahedronGeometry(0.12, 0), '#ffffff'); pp.position.set(0, 0, -0.04); queue.add(pp);
    } else if (o.queue === 'geante') {
      for (var i = 0; i < 4; i++) {
        var e = AV.maille(new THREE.IcosahedronGeometry(0.16 + i * 0.02, 0), o.couleur);
        e.position.set(0, 0.12 + i * 0.2, -0.12 - Math.sin(i * 0.9) * 0.18); queue.add(e);
      }
    } else if (o.queue === 'courte') {
      var qc = AV.maille(new THREE.IcosahedronGeometry(0.08, 0), o.couleur); queue.add(qc);
    } else {
      var qf = AV.maille(new THREE.CylinderGeometry(0.04, 0.03, 0.5, 5), o.couleur); qf.rotation.x = -0.9; qf.position.set(0, 0.18, -0.15); queue.add(qf);
    }
    g.scale.setScalar(s);
    return { groupe: g, corps: corps, tete: tete, queue: queue, oreilles: oreilles, pattes: pattes };
  }

  function hibou() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var b = AV.maille(new THREE.IcosahedronGeometry(0.36, 1), '#8a6a4a'); b.scale.set(1, 1.15, 0.95); b.position.y = 0.45; corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.27, 1), '#e8d2b0'); v.scale.set(1, 1.1, 0.6); v.position.set(0, 0.4, 0.17); corps.add(v);
    var tete = new THREE.Group(); tete.position.y = 0.85; corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.3, 1), '#8a6a4a'); cr.scale.y = 0.85; tete.add(cr);
    [-1, 1].forEach(function (c) {
      var d = AV.maille(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10), '#ffffff', false); d.rotation.x = Math.PI / 2; d.position.set(c * 0.12, 0.02, 0.25); tete.add(d);
      var p = AV.maille(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), '#1b1b22', false); p.rotation.x = Math.PI / 2; p.position.set(c * 0.12, 0.02, 0.27); tete.add(p);
      var t = AV.maille(new THREE.ConeGeometry(0.06, 0.18, 4), '#6b4f36'); t.position.set(c * 0.18, 0.27, 0); t.rotation.z = -c * 0.4; tete.add(t);
    });
    var bec = AV.maille(new THREE.ConeGeometry(0.04, 0.12, 4), '#f0a030'); bec.rotation.x = Math.PI / 2 + 0.5; bec.position.set(0, -0.08, 0.28); tete.add(bec);
    var ailes = [];
    [-1, 1].forEach(function (c) {
      var a = AV.maille(new THREE.IcosahedronGeometry(0.2, 0), '#6b4f36'); a.scale.set(0.4, 1.2, 0.9); a.position.set(c * 0.33, 0.48, -0.02); corps.add(a); ailes.push(a);
    });
    [-1, 1].forEach(function (c) { var p = AV.maille(new THREE.BoxGeometry(0.1, 0.05, 0.12), '#f0a030'); p.position.set(c * 0.12, 0.05, 0.12); corps.add(p); });
    return { groupe: g, corps: corps, tete: tete, oreilles: [], pattes: [], ailes: ailes };
  }

  function pingouin() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var b = AV.maille(new THREE.IcosahedronGeometry(0.36, 1), '#23283a'); b.scale.set(0.95, 1.4, 0.9); b.position.y = 0.55; corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.3, 1), '#ffffff'); v.scale.set(0.85, 1.3, 0.6); v.position.set(0, 0.5, 0.16); corps.add(v);
    var tete = new THREE.Group(); tete.position.y = 1.08; corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.24, 1), '#23283a'); tete.add(cr);
    var face = AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#ffffff'); face.scale.z = 0.5; face.position.set(0, -0.02, 0.14); tete.add(face);
    yeux(tete, 0.07, 0.03, 0.21, 0.035);
    var bec = AV.maille(new THREE.ConeGeometry(0.05, 0.16, 4), '#f0a030'); bec.rotation.x = Math.PI / 2; bec.position.set(0, -0.05, 0.27); tete.add(bec);
    var ailes = [];
    [-1, 1].forEach(function (c) {
      var pv = new THREE.Group(); pv.position.set(c * 0.33, 0.8, 0);
      var a = AV.maille(new THREE.BoxGeometry(0.07, 0.42, 0.2), '#23283a'); a.position.y = -0.2; pv.add(a);
      corps.add(pv); ailes.push(pv);
      var p = AV.maille(new THREE.BoxGeometry(0.14, 0.05, 0.2), '#f0a030'); p.position.set(c * 0.12, 0.03, 0.1); corps.add(p);
    });
    // bonnet de Noël, parce que c'est l'Avent
    var bo = AV.maille(new THREE.ConeGeometry(0.2, 0.32, 7), '#d94a4a'); bo.position.y = 0.26; bo.rotation.z = 0.3; tete.add(bo);
    var po = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#ffffff'); po.position.set(-0.08, 0.42, 0); tete.add(po);
    return { groupe: g, corps: corps, tete: tete, oreilles: [], pattes: [], ailes: ailes, dandine: true };
  }

  function tortue() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var cara = AV.maille(new THREE.SphereGeometry(0.45, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#5f8f4a'); cara.scale.y = 0.75; cara.position.y = 0.16; corps.add(cara);
    var bord = AV.maille(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 10), '#c9b26b'); bord.position.y = 0.16; corps.add(bord);
    for (var i = 0; i < 5; i++) {
      var e = AV.maille(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 6), '#7aa85e', false);
      var a = i / 5 * Math.PI * 2;
      e.position.set(Math.cos(a) * 0.22, 0.42, Math.sin(a) * 0.22); e.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); corps.add(e);
    }
    var tete = new THREE.Group(); tete.position.set(0, 0.22, 0.5); corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.14, 1), '#9cc47a'); cr.scale.z = 1.2; tete.add(cr);
    yeux(tete, 0.07, 0.04, 0.12, 0.03);
    var pattes = [];
    [[-0.3, 0.25], [0.3, 0.25], [-0.3, -0.25], [0.3, -0.25]].forEach(function (p) {
      var pv = new THREE.Group(); pv.position.set(p[0], 0.1, p[1]);
      var pa = AV.maille(new THREE.IcosahedronGeometry(0.09, 0), '#9cc47a'); pa.scale.set(1, 0.7, 1.3); pv.add(pa);
      corps.add(pv); pattes.push(pv);
    });
    return { groupe: g, corps: corps, tete: tete, oreilles: [], pattes: pattes };
  }

  function kangourou() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var fauve = '#c48a55', clair = '#ecd2ae';
    var b = AV.maille(new THREE.IcosahedronGeometry(0.4, 1), fauve); b.scale.set(0.8, 1.2, 0.85); b.rotation.x = 0.35; b.position.y = 0.95; corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.3, 1), clair); v.scale.set(0.75, 1.1, 0.6); v.rotation.x = 0.35; v.position.set(0, 0.92, 0.17); corps.add(v);
    var tete = new THREE.Group(); tete.position.set(0, 1.62, 0.32); corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.2, 1), fauve); cr.scale.z = 1.3; tete.add(cr);
    var mu = AV.maille(new THREE.IcosahedronGeometry(0.11, 0), clair); mu.position.set(0, -0.06, 0.22); tete.add(mu);
    var nz = AV.maille(new THREE.SphereGeometry(0.04, 5, 4), '#2b1b12', false); nz.position.set(0, -0.03, 0.32); tete.add(nz);
    yeux(tete, 0.09, 0.05, 0.15, 0.035);
    var oreilles = [];
    [-1, 1].forEach(function (c) {
      var o = AV.maille(new THREE.ConeGeometry(0.07, 0.32, 4), fauve); o.position.set(c * 0.1, 0.26, -0.05); o.rotation.z = -c * 0.2; tete.add(o); oreilles.push(o);
      var bras = AV.maille(new THREE.CylinderGeometry(0.04, 0.035, 0.3, 5), fauve); bras.position.set(c * 0.14, 1.12, 0.33); bras.rotation.x = 0.8; corps.add(bras);
      var cuisse = AV.maille(new THREE.IcosahedronGeometry(0.2, 0), fauve); cuisse.scale.set(0.7, 1, 1.2); cuisse.position.set(c * 0.24, 0.48, 0); corps.add(cuisse);
      var pied = AV.maille(new THREE.BoxGeometry(0.12, 0.08, 0.55), '#8a5a35'); pied.position.set(c * 0.24, 0.05, 0.12); corps.add(pied);
    });
    var queue = new THREE.Group(); queue.position.set(0, 0.55, -0.3); corps.add(queue);
    var q = AV.maille(new THREE.ConeGeometry(0.12, 1.1, 6), fauve); q.rotation.x = -2.05; q.position.set(0, -0.25, -0.45); queue.add(q);
    return { groupe: g, corps: corps, tete: tete, queue: queue, oreilles: oreilles, pattes: [] };
  }

  // Calopsite blanche avec un peu de gris : joues orange, huppe, longue queue grise
  function calopsite() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var blanc = '#f4f3ef', creme = '#ffffff', gris = '#a3a5ab', grisClair = '#cfd0d4';
    var b = AV.maille(new THREE.IcosahedronGeometry(0.26, 1), blanc); b.scale.set(0.9, 1.25, 0.95); b.rotation.x = -0.2; b.position.set(0, 0.42, -0.02); corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.2, 1), creme); v.scale.set(0.85, 1.1, 0.7); v.position.set(0, 0.38, 0.1); corps.add(v);
    var dos = AV.maille(new THREE.IcosahedronGeometry(0.17, 1), grisClair); dos.scale.set(0.9, 1.1, 0.6); dos.position.set(0, 0.5, -0.17); corps.add(dos);
    var tete = new THREE.Group(); tete.position.set(0, 0.8, 0.05); corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.19, 1), blanc));
    var nuque = AV.maille(new THREE.IcosahedronGeometry(0.15, 1), grisClair); nuque.scale.set(1, 0.8, 0.7); nuque.position.set(0, 0.02, -0.1); tete.add(nuque);
    [-1, 1].forEach(function (c) {
      var j = AV.maille(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 10), '#ff8a3a', false);
      j.rotation.z = Math.PI / 2; j.position.set(c * 0.165, -0.04, 0.05); tete.add(j);
    });
    yeux(tete, 0.105, 0.035, 0.13, 0.032);
    var bec = AV.maille(new THREE.ConeGeometry(0.05, 0.12, 5), '#cfc6b8'); bec.rotation.x = Math.PI / 2 + 0.6; bec.position.set(0, -0.05, 0.19); tete.add(bec);
    // huppe : plumes jaunes recourbées vers l'arrière
    [[0, 0.32, -0.25], [0.03, 0.27, -0.55], [-0.03, 0.24, -0.8], [0, 0.2, -1.05]].forEach(function (p, i) {
      var pl = AV.maille(new THREE.ConeGeometry(0.03, p[1], 4), i % 2 ? grisClair : '#f2f2ef');
      pl.position.set(p[0], 0.14 + p[1] / 2 * Math.cos(p[2]), 0.04 - i * 0.03 + p[1] / 2 * Math.sin(p[2]));
      pl.rotation.x = p[2]; tete.add(pl);
    });
    var ailes = [];
    [-1, 1].forEach(function (c) {
      var pv = new THREE.Group(); pv.position.set(c * 0.22, 0.6, -0.02);
      var a = AV.maille(new THREE.IcosahedronGeometry(0.18, 0), '#ecebe7'); a.scale.set(0.35, 1.25, 0.8); a.position.set(0, -0.16, -0.04); a.rotation.x = 0.25; pv.add(a);
      var rm = AV.maille(new THREE.IcosahedronGeometry(0.12, 0), gris); rm.scale.set(0.3, 1.2, 0.7); rm.position.set(0, -0.3, -0.12); rm.rotation.x = 0.35; pv.add(rm);
      corps.add(pv); ailes.push(pv);
      var p = AV.maille(new THREE.BoxGeometry(0.08, 0.04, 0.12), '#f2a8a8'); p.position.set(c * 0.09, 0.03, 0.04); corps.add(p);
    });
    var queue = new THREE.Group(); queue.position.set(0, 0.28, -0.2); corps.add(queue);
    var q = AV.maille(new THREE.ConeGeometry(0.07, 0.55, 5), gris); q.rotation.x = -2.5; q.position.set(0, -0.15, -0.2); queue.add(q);
    g.scale.setScalar(1.15);
    return { groupe: g, corps: corps, tete: tete, queue: queue, oreilles: [], pattes: [], ailes: ailes };
  }

  // Loutre barmaid, debout : pelage brun, museau crème, moustaches, nœud papillon
  function loutre() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var brun = '#7a5236', fonce = '#5e3d27', creme = '#e9d3b4';
    var b = AV.maille(new THREE.IcosahedronGeometry(0.27, 1), brun); b.scale.set(0.95, 1.45, 0.85); b.position.set(0, 0.42, 0); corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.2, 1), creme); v.scale.set(0.85, 1.35, 0.6); v.position.set(0, 0.47, 0.11); corps.add(v);
    var tete = new THREE.Group(); tete.position.set(0, 0.86, 0.02); corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.19, 1), brun); cr.scale.set(1.1, 0.92, 1); tete.add(cr);
    var mu = AV.maille(new THREE.IcosahedronGeometry(0.12, 1), creme); mu.scale.set(1.25, 0.8, 0.9); mu.position.set(0, -0.06, 0.13); tete.add(mu);
    var nz = AV.maille(new THREE.IcosahedronGeometry(0.04, 0), '#2a1a12', false); nz.scale.set(1.3, 0.8, 1); nz.position.set(0, -0.02, 0.24); tete.add(nz);
    yeux(tete, 0.085, 0.05, 0.15, 0.033);
    var oreilles = [];
    [-1, 1].forEach(function (c) {
      var o = AV.maille(new THREE.IcosahedronGeometry(0.045, 0), fonce); o.scale.z = 0.5; o.position.set(c * 0.16, 0.1, -0.02); tete.add(o); oreilles.push(o);
      for (var k = 0; k < 3; k++) { // moustaches
        var mo = AV.maille(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 3), '#f6efe4', false);
        mo.rotation.z = Math.PI / 2 + c * (k - 1) * 0.18; mo.position.set(c * 0.15, -0.05 - k * 0.012, 0.18); tete.add(mo);
      }
    });
    // pattes avant (bras) et arrière
    var pattes = [];
    [-1, 1].forEach(function (c) {
      var pv = new THREE.Group(); pv.position.set(c * 0.17, 0.66, 0.1); pv.rotation.x = -0.9;
      var a = AV.maille(new THREE.CylinderGeometry(0.05, 0.045, 0.24, 5), brun); a.position.y = -0.11; pv.add(a);
      var m = AV.maille(new THREE.IcosahedronGeometry(0.05, 0), fonce); m.position.y = -0.24; pv.add(m);
      corps.add(pv); pattes.push(pv);
      var pied = AV.maille(new THREE.IcosahedronGeometry(0.08, 0), fonce); pied.scale.set(0.9, 0.5, 1.4); pied.position.set(c * 0.12, 0.03, 0.08); corps.add(pied);
    });
    // nœud papillon de barmaid
    [-1, 1].forEach(function (c) { var n = AV.maille(new THREE.ConeGeometry(0.05, 0.09, 4), '#c0233a', false); n.rotation.z = c * Math.PI / 2; n.position.set(c * 0.045, 0.72, 0.2); corps.add(n); });
    var nc = AV.maille(new THREE.IcosahedronGeometry(0.025, 0), '#8a1426', false); nc.position.set(0, 0.72, 0.21); corps.add(nc);
    // grosse queue effilée
    var queue = new THREE.Group(); queue.position.set(0, 0.15, -0.18); corps.add(queue);
    var q = AV.maille(new THREE.ConeGeometry(0.11, 0.7, 6), brun); q.rotation.x = -1.95; q.position.set(0, -0.08, -0.32); queue.add(q);
    g.scale.setScalar(1.05);
    return { groupe: g, corps: corps, tete: tete, queue: queue, oreilles: oreilles, pattes: pattes };
  }

  // Krapfen (beignet des Dolomites) : doré, ceinture claire, sucre glace, point de confiture d'abricot
  AV.krapfen = function (taille) {
    var g = new THREE.Group(), s = taille || 1;
    var b = AV.maille(new THREE.SphereGeometry(0.5 * s, 12, 8), '#c7843f'); b.scale.y = 0.62; g.add(b);
    var c = AV.maille(new THREE.CylinderGeometry(0.505 * s, 0.505 * s, 0.13 * s, 14), '#f2deb0', false); g.add(c);
    var su = AV.maille(new THREE.SphereGeometry(0.42 * s, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.32), '#fbf7ee', false); su.position.y = 0.08 * s; su.scale.y = 0.8; g.add(su);
    var j = AV.maille(new THREE.SphereGeometry(0.075 * s, 6, 5), '#e8782a', false); j.position.set(0, 0, 0.49 * s); g.add(j);
    return g;
  };

  // Loulou : la mini loutre en peluche (marron, grand masque blanc, ventre crème), assise avec son krapfen
  function loulou() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var brun = '#6e4a2f', fonce = '#4f3420', creme = '#efe4d0';
    var b = AV.maille(new THREE.IcosahedronGeometry(0.24, 1), brun); b.scale.set(1, 1.15, 0.9); b.position.set(0, 0.27, 0); corps.add(b);
    var v = AV.maille(new THREE.IcosahedronGeometry(0.18, 1), creme); v.scale.set(0.9, 1.05, 0.6); v.position.set(0, 0.3, 0.1); corps.add(v);
    var tete = new THREE.Group(); tete.position.set(0, 0.6, 0.02); corps.add(tete);
    var cr = AV.maille(new THREE.IcosahedronGeometry(0.2, 1), brun); cr.scale.set(1.05, 0.95, 1); tete.add(cr);
    var masque = AV.maille(new THREE.IcosahedronGeometry(0.15, 1), creme); masque.scale.set(1.2, 0.85, 0.85); masque.position.set(0, -0.05, 0.1); tete.add(masque);
    var nz = AV.maille(new THREE.IcosahedronGeometry(0.035, 0), '#24150c', false); nz.scale.set(1.4, 0.8, 1); nz.position.set(0, -0.01, 0.225); tete.add(nz);
    yeux(tete, 0.075, 0.06, 0.165, 0.03);
    var oreilles = [];
    [-1, 1].forEach(function (c) {
      var o = AV.maille(new THREE.IcosahedronGeometry(0.05, 0), fonce); o.scale.z = 0.5; o.position.set(c * 0.16, 0.11, -0.02); tete.add(o); oreilles.push(o);
    });
    // pattes avant qui tiennent le krapfen
    var pattes = [];
    [-1, 1].forEach(function (c) {
      var pv = new THREE.Group(); pv.position.set(c * 0.15, 0.42, 0.08); pv.rotation.set(-1.1, 0, -c * 0.35);
      var a = AV.maille(new THREE.CylinderGeometry(0.055, 0.05, 0.2, 5), brun); a.position.y = -0.09; pv.add(a);
      var m = AV.maille(new THREE.IcosahedronGeometry(0.055, 0), fonce); m.position.y = -0.2; pv.add(m);
      corps.add(pv); pattes.push(pv);
      var pied = AV.maille(new THREE.IcosahedronGeometry(0.08, 0), fonce); pied.scale.set(0.9, 0.5, 1.4); pied.position.set(c * 0.12, 0.03, 0.12); corps.add(pied);
    });
    var krapfen = AV.krapfen(0.24); krapfen.position.set(0, 0.36, 0.24); krapfen.rotation.x = 0.5; corps.add(krapfen);
    // grosse queue de peluche, posée au sol
    var queue = new THREE.Group(); queue.position.set(0, 0.1, -0.16); corps.add(queue);
    var q = AV.maille(new THREE.ConeGeometry(0.1, 0.55, 6), brun); q.rotation.x = -1.9; q.position.set(0, -0.05, -0.25); queue.add(q);
    g.scale.setScalar(1.1);
    return { groupe: g, corps: corps, tete: tete, queue: queue, oreilles: oreilles, pattes: pattes, krapfen: krapfen };
  }

  // bonnet de Noël à poser sur n'importe quel animal (décor du village)
  AV.bonnetNoel = function (taille) {
    var g = new THREE.Group(), s = taille || 1;
    var c = AV.maille(new THREE.ConeGeometry(0.15 * s, 0.3 * s, 7), '#d94a4a'); c.position.y = 0.15 * s; c.rotation.z = 0.35; g.add(c);
    var r = AV.maille(new THREE.CylinderGeometry(0.16 * s, 0.16 * s, 0.06 * s, 8), '#ffffff'); g.add(r);
    var p = AV.maille(new THREE.IcosahedronGeometry(0.05 * s, 0), '#ffffff'); p.position.set(-0.1 * s, 0.3 * s, 0); g.add(p);
    return g;
  };

  var MODELES = {
    kangourou: kangourou,
    quokka: function () { return quadrupede({ couleur: '#8b6b4e', ventre: '#c9a988', oreilles: 'rondes', queue: 'fine', nez: '#2b1b12', taille: 0.7 }); },
    renard: function () { return quadrupede({ couleur: '#e8792f', ventre: '#fff4e6', museau: 'pointu', oreilles: 'pointues', queue: 'touffue', bout: '#ffffff', pattes: '#3b2a22' }); },
    chat: function () { return quadrupede({ couleur: '#8d8d99', ventre: '#e6e6ee', oreilles: 'pointues', queue: 'fine', nez: '#f29aaa', taille: 0.85 }); },
    lapin: function () { return quadrupede({ couleur: '#f1ece4', ventre: '#ffffff', oreilles: 'longues', queue: 'pompon', nez: '#f29aaa', taille: 0.8 }); },
    chien: function () { return quadrupede({ couleur: '#c8925a', ventre: '#f5e6d0', oreilles: 'tombantes', oreilleCouleur: '#7a5338', queue: 'fine', taille: 1.05 }); },
    ecureuil: function () { return quadrupede({ couleur: '#b5582a', ventre: '#f5dcc0', oreilles: 'pointues', queue: 'geante', taille: 0.7 }); },
    ours: function () { return quadrupede({ couleur: '#7a5338', ventre: '#c8a27a', oreilles: 'rondes', queue: 'courte', taille: 1.35 }); },
    hibou: hibou, pingouin: pingouin, tortue: tortue, calopsite: calopsite, loutre: loutre, loulou: loulou
  };

  AV.Animal = function (type) {
    var m = (MODELES[type] || MODELES.renard)();
    this.type = type;
    this.m = m;
    this.groupe = new THREE.Group();
    this.groupe.add(m.groupe);
    this.etat = 'repos';
    this.saut = 0;
    this.base = new THREE.Vector3();
    this.cible = 0;
    this.coeurs = [];
  };

  AV.Animal.prototype.placer = function (x, y, z, angle) {
    this.base.set(x, y, z);
    this.groupe.position.set(x, y, z);
    this.groupe.rotation.y = angle || 0;
    this.cible = angle || 0;
  };

  AV.Animal.prototype.maj = function (dt, t, joueur, scene) {
    var m = this.m, g = this.groupe;
    var dx = joueur.x - g.position.x, dz = joueur.z - g.position.z;
    var vers = Math.atan2(dx, dz);

    // respiration
    m.corps.scale.y = 1 + Math.sin(t * 2.4) * 0.025;
    if (m.queue) m.queue.rotation.y = Math.sin(t * (this.etat === 'repos' ? 3 : 9)) * 0.5;

    if (this.vole) {
      // en vol (déplacé par le décor via this.base / this.cible) : ailes qui battent
      g.position.copy(this.base);
      g.rotation.y = AV.angleLerp(g.rotation.y, this.cible, dt * 8);
      if (m.ailes) m.ailes.forEach(function (a, i) { a.rotation.z = (i ? 1 : -1) * (1.2 + Math.sin(t * 24) * 0.7); });
      m.tete.rotation.set(-0.2, 0, 0);
      m.corps.rotation.x = 0.5;
    } else if (this.etat === 'repos') {
      m.corps.rotation.x *= 0.85;
      if (m.ailes) m.ailes.forEach(function (a) { a.rotation.z *= 0.85; });
      m.tete.rotation.y = Math.sin(t * 0.5) * 0.6;
      m.tete.rotation.x = Math.sin(t * 0.33) * 0.1;
      if (m.oreilles.length && Math.sin(t * 1.7) > 0.97) m.oreilles[0].rotation.x = -0.4; else if (m.oreilles.length) m.oreilles[0].rotation.x *= 0.9;
      g.rotation.y = AV.angleLerp(g.rotation.y, this.cible, dt * 2);
      g.position.y = AV.lerp(g.position.y, this.base.y, dt * 6);
    } else if (this.etat === 'alerte') {
      g.rotation.y = AV.angleLerp(g.rotation.y, vers, dt * 3);
      m.tete.rotation.y *= 0.9;
      m.tete.rotation.x = -0.15 + Math.sin(t * 6) * 0.05;
      m.oreilles.forEach(function (o, i) { o.rotation.x = Math.sin(t * 10 + i) * 0.15; });
      // petits bonds curieux
      this.saut += dt * 5;
      g.position.y = this.base.y + Math.max(0, Math.sin(this.saut)) * 0.12;
      if (m.ailes) m.ailes.forEach(function (a, i) { a.rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(t * 8)) * 0.4; });
    } else if (this.etat === 'trouve') {
      g.rotation.y = AV.angleLerp(g.rotation.y, vers, dt * 4);
      this.saut += dt * 7;
      var h = Math.abs(Math.sin(this.saut));
      g.position.y = this.base.y + h * 0.7;
      m.corps.rotation.y = Math.sin(this.saut * 0.5) * 0.4;
      m.tete.rotation.x = -0.25;
      m.pattes.forEach(function (p, i) { p.rotation.x = Math.sin(t * 14 + i) * 0.6; });
      if (m.ailes) m.ailes.forEach(function (a, i) { a.rotation.z = (i ? -1 : 1) * (0.5 + Math.sin(t * 16) * 0.5); });
      // cœurs
      if (Math.random() < dt * 4 && scene) this.coeur(scene);
    } else if (this.etat === 'peur') {
      // grand bond de surprise, poils hérissés, puis fuite le long de this.fuite [{x,y,z}, ...]
      this.tPeur = (this.tPeur || 0) + dt;
      var tp = this.tPeur, bouge = false;
      if (tp > 0.55 && this.fuite && this.fuite.length) {
        var f = this.fuite[0], fx = f.x - this.base.x, fz = f.z - this.base.z, fl = Math.sqrt(fx * fx + fz * fz);
        var pas = dt * 3.2;
        if (fl <= pas) { this.base.set(f.x, f.y, f.z); this.fuite.shift(); this.tSaut = 0; }
        else { this.base.x += fx / fl * pas; this.base.z += fz / fl * pas; this.base.y = AV.lerp(this.base.y, f.y, Math.min(1, pas / fl)); g.rotation.y = AV.angleLerp(g.rotation.y, Math.atan2(fx, fz), dt * 12); }
        bouge = true;
      } else if (tp > 0.55 && this.regardFinal != null) {
        g.rotation.y = AV.angleLerp(g.rotation.y, this.regardFinal, dt * 5);
      } else if (tp <= 0.55) g.rotation.y = AV.angleLerp(g.rotation.y, vers, dt * 10);
      g.position.x = this.base.x; g.position.z = this.base.z;
      if (tp < 0.55) g.position.y = this.base.y + Math.sin(tp / 0.55 * Math.PI) * 1.1;
      else if (bouge) g.position.y = this.base.y + Math.abs(Math.sin(tp * 12)) * 0.18;
      else g.position.y = this.base.y + Math.abs(Math.sin(tp * 30)) * 0.02;
      var poil = tp < 2.5 ? 1.18 : AV.lerp(1.18, 1, Math.min(1, (tp - 2.5) / 2));
      m.corps.scale.set(poil, poil * (1 + Math.sin(t * 40) * 0.02), poil);
      if (m.queue) { m.queue.rotation.x = -0.9 * (poil - 1) * 5; m.queue.rotation.y = Math.sin(t * 30) * 0.1; }
      m.oreilles.forEach(function (o, i) { o.rotation.z = (i ? 1 : -1) * 0.5 * (poil - 1) * 5; });
      m.pattes.forEach(function (p, i) { p.rotation.x = bouge ? Math.sin(t * 18 + i * 1.6) * 0.8 : 0; });
    }
    if (m.dandine) m.corps.rotation.z = Math.sin(t * 3) * 0.08;

    for (var i = this.coeurs.length - 1; i >= 0; i--) {
      var c = this.coeurs[i];
      c.userData.vie -= dt;
      c.position.y += dt * 1.2;
      c.material.opacity = Math.min(1, c.userData.vie);
      if (c.userData.vie <= 0) { scene.remove(c); c.material.map.dispose(); c.material.dispose(); this.coeurs.splice(i, 1); }
    }
  };

  AV.Animal.prototype.coeur = function (scene) {
    var s = AV.texteSprite(Math.random() < 0.7 ? '❤' : '✨', { couleur: '#ff5a7a', largeur: 0.9 });
    s.position.copy(this.groupe.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2, (Math.random() - 0.5) * 0.8));
    s.userData.vie = 1.6;
    scene.add(s);
    this.coeurs.push(s);
  };

  // bulle (émoji / texte) qui monte au-dessus de l'animal
  AV.Animal.prototype.bulle = function (scene, texte, opts) {
    opts = opts || {};
    var s = AV.bulleBD(texte, { fond: opts.fond, couleur: opts.couleur });
    s.position.copy(this.groupe.position).add(new THREE.Vector3(0, 1.3, 0));
    s.userData.vie = opts.vie || 2;
    scene.add(s);
    this.coeurs.push(s);
    return s;
  };

  AV.Animal.prototype.nettoyer = function (scene) {
    this.coeurs.forEach(function (c) { scene.remove(c); c.material.map.dispose(); c.material.dispose(); });
    this.coeurs = [];
  };
})(window.AV);
