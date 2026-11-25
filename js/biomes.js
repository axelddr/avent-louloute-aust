/* Biomes : village (hub), plage, forêt enneigée, ville la nuit, + biomes génériques */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  // ---------- Ambiances de ciel ----------
  var CIELS = {
    jour:       { haut: '#4f93e0', bas: '#d4ecff', brouillard: '#d4ecff', hemi: ['#ffffff', '#7a8a6a', 0.8], soleil: ['#fff3dc', 0.85, [30, 50, 20]] },
    coucher:    { haut: '#5b5fb0', bas: '#ffb27a', brouillard: '#f3b28e', hemi: ['#ffd9c0', '#6a5a7a', 0.75], soleil: ['#ffb070', 0.95, [-25, 14, -60]] },
    nuit:       { haut: '#070b1f', bas: '#2c2f5e', brouillard: '#1a1d3a', hemi: ['#8597d8', '#1a1a2a', 0.5], soleil: ['#9db8ff', 0.35, [30, 60, -40]], etoiles: true },
    crepuscule: { haut: '#24346a', bas: '#f0b9a0', brouillard: '#c4a6b8', hemi: ['#d7d9ff', '#5a5a7a', 0.75], soleil: ['#ffc8a0', 0.7, [-30, 25, -50]], etoiles: true },
    hiver:      { haut: '#0f1a3a', bas: '#6585bb', brouillard: '#536f9e', hemi: ['#a9c0ff', '#3a4466', 0.65], soleil: ['#cfe0ff', 0.45, [40, 70, -60]], etoiles: true }
  };
  AV.CIELS = CIELS;

  // ---------- Outils ----------
  function ondul(x, z, a, f) {
    return a * (Math.sin(x * f) * Math.cos(z * f * 1.3) + 0.5 * Math.sin(x * f * 2.1 + 1.3) * Math.sin(z * f * 1.7 + 0.7));
  }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) {
    var c = new THREE.Color(hex), k = 1 + (hash(x, z) - 0.5) * amp;
    c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k);
    return c;
  }
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

  // ---------- Monde ----------
  function Monde(o) {
    this.groupe = new THREE.Group();
    this.colliders = []; this.bloqueurs = []; this.cachettes = []; this.interactifs = []; this.animes = []; this.reserves = [];
    this.rayon = o.rayon; this.hauteur = o.hauteur; this.surface = o.surface || 'herbe';
    this.depart = o.depart; this.theme = o.theme || 'defaut'; this.ambiance = o.ambiance || null;
    this.ciel = o.ciel; this.brouillard = o.brouillard || [25, 120];
    this.autorise = o.autorise || null; this.surfaceA = o.surfaceA || null;
    this.reserver(o.depart.x, o.depart.z, 3.5);
  }
  Monde.prototype.ajouter = function (obj, x, z, rot, o) {
    o = o || {};
    obj.position.set(x, (o.y != null ? o.y : this.hauteur(x, z)) + (o.dy || 0), z);
    obj.rotation.y = rot || 0;
    this.groupe.add(obj);
    if (o.collision !== false) {
      var s = obj.scale.x;
      if (obj.userData.rect) this.colliders.push({ rect: true, x: x, z: z, hx: obj.userData.rect.hx * s, hz: obj.userData.rect.hz * s, a: -(rot || 0) });
      else if (obj.userData.rayon) this.colliders.push({ x: x, z: z, r: obj.userData.rayon * s });
    }
    if (o.bloque) this.bloqueurs.push(obj);
    return obj;
  };
  Monde.prototype.reserver = function (x, z, r) { this.reserves.push({ x: x, z: z, r: r }); };
  Monde.prototype.libre = function (x, z, r) {
    var i, c, dx, dz, rr;
    for (i = 0; i < this.colliders.length; i++) {
      c = this.colliders[i]; dx = x - c.x; dz = z - c.z;
      rr = c.rect ? Math.sqrt(c.hx * c.hx + c.hz * c.hz) : c.r;
      if (dx * dx + dz * dz < (rr + r) * (rr + r)) return false;
    }
    for (i = 0; i < this.reserves.length; i++) {
      c = this.reserves[i]; dx = x - c.x; dz = z - c.z;
      if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return false;
    }
    return true;
  };
  Monde.prototype.semer = function (rng, n, fabrique, o) {
    o = o || {};
    var places = [], min = o.min || 0, max = o.max || this.rayon - 1;
    for (var i = 0; i < n; i++) {
      for (var essai = 0; essai < 25; essai++) {
        var a = rng() * Math.PI * 2, d = Math.sqrt(AV.lerp(min * min, max * max, rng()));
        var x = Math.sin(a) * d, z = Math.cos(a) * d;
        if (o.filtre && !o.filtre(x, z)) continue;
        if (!this.libre(x, z, o.marge || 1)) continue;
        var obj = fabrique(rng, x, z);
        this.ajouter(obj, x, z, rng() * Math.PI * 2, { collision: o.collision, bloque: o.bloque, dy: o.dy });
        if (o.collision === false && o.marge) this.reserver(x, z, o.marge * 0.5);
        places.push({ x: x, z: z, obj: obj });
        break;
      }
    }
    return places;
  };
  // Cachette : de l'autre côté d'un objet par rapport au point de départ
  Monde.prototype.cachetteDerriere = function (x, z, r, dy) {
    var dx = x - this.depart.x, dz = z - this.depart.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
    var cx = x + dx / l * (r + 0.7), cz = z + dz / l * (r + 0.7);
    if (cx * cx + cz * cz > (this.rayon - 1.5) * (this.rayon - 1.5)) return;
    var ok = true;
    for (var i = 0; i < this.colliders.length; i++) {
      var c = this.colliders[i], ex = cx - c.x, ez = cz - c.z;
      var rr = c.rect ? Math.min(c.hx, c.hz) : c.r;
      if (ex * ex + ez * ez < (rr + 0.3) * (rr + 0.3) && !(Math.abs(c.x - x) < 0.01 && Math.abs(c.z - z) < 0.01)) { ok = false; break; }
    }
    if (ok) this.cachettes.push({ x: cx, z: cz, y: dy || 0 });
  };
  Monde.prototype.anime = function (f) { this.animes.push(f); };
  Monde.prototype.maj = function (dt, t, centre) { for (var i = 0; i < this.animes.length; i++) this.animes[i](dt, t, centre); };

  Monde.prototype.portail = function (x, z, rot, couleur) {
    var p = AV.deco.portail(couleur);
    this.ajouter(p, x, z, rot, { collision: false, bloque: true });
    var self = this;
    [-1, 1].forEach(function (c) {
      self.colliders.push({ x: x + c * 1.25 * Math.cos(rot), z: z - c * 1.25 * Math.sin(rot), r: 0.32 });
    });
    return p;
  };
  Monde.prototype.portailRetour = function (px, pz) {
    var d = this.depart;
    // à droite du point de départ, tourné dans le même sens que le joueur (ou position imposée)
    var x = d.x - Math.cos(d.angle) * 5.5 + Math.sin(d.angle) * 1.5, z = d.z + Math.sin(d.angle) * 5.5 + Math.cos(d.angle) * 1.5;
    if (px != null) { x = px; z = pz; }
    var p = this.portail(x, z, d.angle, '#ffd98a');
    var s = AV.texteSprite('🏠 Village', { fond: 'rgba(27,35,64,.85)', largeur: 2.6, echelle: 0.45 });
    s.position.y = 4.4; p.add(s);
    this.interactifs.push({ type: 'retour', x: x, z: z, rayon: 2.2 });
    this.reserver(x, z, 2.5);
    var voile = p.userData.voile;
    this.anime(function (dt, t) { voile.material.opacity = 0.4 + Math.sin(t * 2) * 0.15; });
  };

  Monde.prototype.cielEtLumieres = function (ciel) {
    this.ciel = ciel;
    this.groupe.add(AV.ciel(ciel.haut, ciel.bas));
    if (ciel.etoiles) this.groupe.add(AV.etoiles(500, 380));
  };

  Monde.prototype.neige = function (n) {
    var p = AV.chuteNeige(n || 700, 60, 25);
    this.groupe.add(p);
    this.anime(function (dt, t, centre) { p.userData.maj(dt, t, centre); });
  };

  Monde.prototype.lumiere = function (couleur, intensite, distance, x, y, z, scintille) {
    var l = new THREE.PointLight(couleur, intensite, distance, 2);
    l.position.set(x, y, z);
    this.groupe.add(l);
    if (scintille) this.anime(function (dt, t) { l.intensity = intensite * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07); });
    return l;
  };

  function lune(m, x, y, z, taille) {
    var l = new THREE.Mesh(new THREE.SphereGeometry(taille || 10, 16, 12), new THREE.MeshBasicMaterial({ color: '#fffbe8', fog: false }));
    l.position.set(x, y, z); m.groupe.add(l);
    var h = AV.halo('#fff3c8', (taille || 10) * 6); h.material.fog = false; h.material.opacity = 0.35; h.position.copy(l.position); m.groupe.add(h);
  }

  // ---------- Décors spécifiques ----------
  function palmier(r, s) {
    var g = new THREE.Group(); s = s || 1;
    var courbe = AV.entre(r, 0.1, 0.3), x = 0, y = 0;
    for (var i = 0; i < 6; i++) {
      var seg = AV.maille(new THREE.CylinderGeometry((0.17 - i * 0.012) * s, (0.21 - i * 0.012) * s, 0.78 * s, 6), i % 2 ? '#9b7a52' : '#8a6a45');
      x += courbe * i * 0.09 * s;
      seg.position.set(x, y + 0.38 * s, 0); seg.rotation.z = -courbe * i * 0.12; g.add(seg);
      y += 0.72 * s;
    }
    var tete = new THREE.Group(); tete.position.set(x, y, 0); g.add(tete);
    for (var k = 0; k < 7; k++) {
      var f = new THREE.Group(); f.rotation.y = k / 7 * Math.PI * 2 + r();
      var pv = new THREE.Group(); pv.rotation.x = AV.entre(r, 0.35, 0.65); f.add(pv);
      var feuille = AV.maille(new THREE.BoxGeometry(0.55 * s, 0.05 * s, 2.3 * s), k % 2 ? '#4f9a4a' : '#5fae55');
      feuille.position.z = 1.1 * s; pv.add(feuille);
      tete.add(f);
    }
    for (var c = 0; c < 3; c++) {
      var co = AV.maille(new THREE.IcosahedronGeometry(0.14 * s, 0), '#6b4a32');
      co.position.set(Math.cos(c * 2.1) * 0.2 * s, -0.15 * s, Math.sin(c * 2.1) * 0.2 * s); tete.add(co);
    }
    g.userData.rayon = 0.35 * s;
    g.userData.tete = tete;
    return g;
  }

  function coneRaye(rayon, h, c1, c2, n) {
    var geo = AV.facettes(new THREE.ConeGeometry(rayon, h, n || 8, 1, true));
    var p = geo.attributes.position, cols = new Float32Array(p.count * 3), a = new THREE.Color(c1), b = new THREE.Color(c2);
    for (var f = 0; f < p.count; f += 3) {
      var cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      var idx = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * (n || 8));
      var c = idx % 2 ? a : b;
      for (var k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    m.castShadow = true;
    return m;
  }

  function parasol(c1) {
    var g = new THREE.Group();
    var mat = AV.maille(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), '#eeeeee'); mat.position.y = 1.3; g.add(mat);
    var t = coneRaye(1.7, 0.7, c1 || '#d94a4a', '#ffffff', 10); t.position.y = 2.6; g.add(t);
    g.userData.rayon = 0.2;
    return g;
  }

  function chateauSable() {
    var g = new THREE.Group(), sable = '#e8c98e';
    var base = AV.maille(new THREE.BoxGeometry(1.8, 0.6, 1.8), sable); base.position.y = 0.3; g.add(base);
    [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(function (p) {
      var t = AV.maille(new THREE.CylinderGeometry(0.32, 0.38, 1.1, 7), sable); t.position.set(p[0], 0.55, p[1]); g.add(t);
      var c = AV.maille(new THREE.ConeGeometry(0.38, 0.45, 7), '#dcb97a'); c.position.set(p[0], 1.32, p[1]); g.add(c);
    });
    var d = AV.maille(new THREE.CylinderGeometry(0.45, 0.5, 1.5, 8), sable); d.position.y = 0.95; g.add(d);
    var mat = AV.maille(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), '#6b4a32'); mat.position.y = 2.05; g.add(mat);
    var dr = AV.maille(new THREE.BoxGeometry(0.4, 0.25, 0.02), '#d94a4a'); dr.position.set(0.2, 2.3, 0); g.add(dr);
    g.userData.rayon = 1.3;
    return g;
  }

  function feuDeCamp(m, x, z) {
    var g = new THREE.Group();
    for (var i = 0; i < 4; i++) {
      var b = AV.maille(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), '#6b4a32'); b.rotation.z = Math.PI / 2; b.rotation.y = i * Math.PI / 4; b.position.y = 0.1; g.add(b);
    }
    for (var k = 0; k < 8; k++) {
      var p = AV.maille(new THREE.DodecahedronGeometry(0.16, 0), '#8a8f98'); p.position.set(Math.cos(k / 8 * 6.28) * 0.75, 0.08, Math.sin(k / 8 * 6.28) * 0.75); g.add(p);
    }
    var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 6), AV.matBrillant('#ff8a2a', 1)); f1.position.y = 0.5; g.add(f1);
    var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 6), AV.matBrillant('#ffd24a', 1)); f2.position.y = 0.45; g.add(f2);
    var h = AV.halo('#ff9a4a', 3.5); h.position.y = 0.6; g.add(h);
    g.userData.rayon = 0.9;
    m.ajouter(g, x, z, 0);
    m.lumiere('#ff8a3a', 1.6, 14, x, m.hauteur(x, z) + 1.2, z, true);
    m.anime(function (dt, t) {
      f1.scale.set(1, 1 + Math.sin(t * 11) * 0.15, 1); f2.scale.set(1, 1 + Math.sin(t * 15 + 1) * 0.2, 1);
      f1.rotation.y += dt * 2; f2.rotation.y -= dt * 3;
    });
    return g;
  }

  function mouette() {
    var g = new THREE.Group();
    var c = AV.maille(new THREE.IcosahedronGeometry(0.15, 0), '#ffffff', false); c.scale.z = 1.8; g.add(c);
    var ailes = [];
    [-1, 1].forEach(function (s) {
      var pv = new THREE.Group(); var a = AV.maille(new THREE.BoxGeometry(0.7, 0.03, 0.25), '#f2f2f2', false); a.position.x = s * 0.35; pv.add(a); g.add(pv); ailes.push(pv);
    });
    g.userData.ailes = ailes;
    return g;
  }

  function cactus(r) {
    var g = new THREE.Group(), v = AV.choisir(r, ['#4f8a4a', '#5a9a55']), h = AV.entre(r, 1.6, 2.8);
    var t = AV.maille(new THREE.CylinderGeometry(0.28, 0.32, h, 7), v); t.position.y = h / 2; g.add(t);
    var hc = AV.maille(new THREE.IcosahedronGeometry(0.28, 0), v); hc.position.y = h; g.add(hc);
    [-1, 1].forEach(function (s) {
      if (r() < 0.75) {
        var y = AV.entre(r, 0.7, h - 0.5);
        var b1 = AV.maille(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 6), v); b1.rotation.z = Math.PI / 2; b1.position.set(s * 0.45, y, 0); g.add(b1);
        var b2 = AV.maille(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 6), v); b2.position.set(s * 0.68, y + 0.3, 0); g.add(b2);
      }
    });
    if (r() < 0.5) { var fl = AV.maille(new THREE.IcosahedronGeometry(0.12, 0), '#ff8fa3', false); fl.position.y = h + 0.25; g.add(fl); }
    g.userData.rayon = 0.45;
    return g;
  }

  function botteFoin() {
    var g = new THREE.Group();
    var b = AV.maille(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 10), '#e3c36b'); b.rotation.z = Math.PI / 2; b.position.y = 0.7; g.add(b);
    g.userData.rayon = 0.8;
    return g;
  }

  function barriere(l) {
    var g = new THREE.Group();
    for (var i = 0; i <= l; i++) { var p = AV.maille(new THREE.BoxGeometry(0.12, 1, 0.12), '#a07850'); p.position.set(i - l / 2, 0.5, 0); g.add(p); }
    [0.4, 0.8].forEach(function (y) { var t = AV.maille(new THREE.BoxGeometry(l, 0.08, 0.06), '#b88a5c'); t.position.y = y; g.add(t); });
    g.userData.rect = { hx: l / 2, hz: 0.15 };
    return g;
  }

  function champignon(r) {
    var g = new THREE.Group();
    var p = AV.maille(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 5), '#f5ecd8', false); p.position.y = 0.15; g.add(p);
    var c = AV.maille(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), r() < 0.6 ? '#d94a4a' : '#c8925a', false); c.position.y = 0.28; g.add(c);
    return g;
  }

  function voiture(r) {
    var g = new THREE.Group(), col = AV.choisir(r, ['#d94a4a', '#3f6fd1', '#f3c34b', '#e8e8ee', '#3f8f6b', '#2b2f3a']);
    var c = AV.maille(new THREE.BoxGeometry(1.8, 0.6, 3.6), col); c.position.y = 0.55; g.add(c);
    var h = AV.maille(new THREE.BoxGeometry(1.5, 0.55, 1.9), col); h.position.set(0, 1.1, -0.2); g.add(h);
    var v = AV.maille(new THREE.BoxGeometry(1.52, 0.4, 1.7), '#1e2a4a', false); v.position.set(0, 1.12, -0.2); g.add(v);
    [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]].forEach(function (p) {
      var w = AV.maille(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 8), '#1b1b22'); w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.33, p[1]); g.add(w);
    });
    [-0.55, 0.55].forEach(function (x) {
      var l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), AV.matBrillant('#fff6d0', 1)); l.position.set(x, 0.6, 1.81); g.add(l);
      var a = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), AV.matBrillant('#ff3030', 0.8)); a.position.set(x, 0.6, -1.81); g.add(a);
    });
    g.userData.rect = { hx: 0.95, hz: 1.85 };
    return g;
  }

  function chalet(r) {
    var g = new THREE.Group();
    var b = AV.maille(new THREE.BoxGeometry(2.6, 1.9, 2), '#9b6a45'); b.position.y = 0.95; g.add(b);
    var comptoir = AV.maille(new THREE.BoxGeometry(2.4, 0.15, 0.6), '#c8925a'); comptoir.position.set(0, 1, 1.2); g.add(comptoir);
    var ouv = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.05), AV.matBrillant('#ffcf7a', 0.8)); ouv.position.set(0, 1.45, 1.01); g.add(ouv);
    var t = coneRaye(2.2, 1.1, AV.choisir(r, ['#d94a4a', '#3f8f6b', '#3f6fd1']), '#ffffff', 4); t.rotation.y = Math.PI / 4; t.position.y = 2.45; g.add(t);
    var h = AV.halo('#ffcf7a', 3); h.position.set(0, 1.5, 1.5); g.add(h);
    g.userData.rect = { hx: 1.35, hz: 1.35 };
    return g;
  }

  function banc() {
    var g = new THREE.Group();
    var s = AV.maille(new THREE.BoxGeometry(1.8, 0.1, 0.5), '#a07850'); s.position.y = 0.5; g.add(s);
    var d = AV.maille(new THREE.BoxGeometry(1.8, 0.45, 0.08), '#a07850'); d.position.set(0, 0.85, -0.22); g.add(d);
    [-0.75, 0.75].forEach(function (x) { var p = AV.maille(new THREE.BoxGeometry(0.08, 0.5, 0.45), '#2b2f3a'); p.position.set(x, 0.25, 0); g.add(p); });
    g.userData.rect = { hx: 0.95, hz: 0.3 };
    return g;
  }

  function guirlande(points, couleurs) {
    var pos = new Float32Array(points.length * 3), col = new Float32Array(points.length * 3), c = new THREE.Color();
    points.forEach(function (p, i) {
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      c.set(couleurs[i % couleurs.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  function guirlandeEntre(a, b, n, creux) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push([AV.lerp(a[0], b[0], t), AV.lerp(a[1], b[1], t) - creux * (1 - Math.pow(t * 2 - 1, 2)), AV.lerp(a[2], b[2], t)]);
    }
    return pts;
  }

  AV.biomes = {};

  // =====================================================================
  //  VILLAGE (hub) : 24 portails autour du grand sapin
  // =====================================================================
  AV.biomes.hubNeige = function (etats) {
    var rng = AV.rng(2024);
    var H = function (x, z) {
      var d = Math.sqrt(x * x + z * z), h = ondul(x, z, 0.12, 0.25);
      if (d > 27) h += Math.pow(d - 27, 1.4) * 0.35 + ondul(x, z, 0.8, 0.15) * lisse(27, 34, d);
      return h;
    };
    var m = new Monde({ rayon: 33, hauteur: H, surface: 'neige', depart: { x: 0, z: 15, angle: Math.PI }, theme: 'hub', ambiance: 'vent', brouillard: [35, 120] });
    m.cielEtLumieres(CIELS.crepuscule);
    m.groupe.add(AV.terrain(130, 90, H, function (x, z) {
      var d = Math.sqrt(x * x + z * z);
      if (Math.abs(d - 22) < 1.7) return varier('#cfc6bb', x, z, 0.14);
      if (d < 4.6) return varier('#d9cbb5', x, z, 0.12);
      if (Math.abs(x) < 1.4 && z > 4 && z < 21) return varier('#d6cdc2', x, z, 0.12);
      return varier('#eef3fb', x, z, 0.07);
    }));

    // Grand sapin
    var sapin = AV.deco.sapin(rng, 3, true);
    var cols = ['#ff5a5a', '#ffd24a', '#5ab0ff', '#ff8af0', '#ffffff'];
    for (var i = 0; i < 46; i++) {
      var couche = Math.floor(rng() * 3), rad = (1.3 - couche * 0.32) * 3, h = (1.4 - couche * 0.2) * 3, cy = (1.1 + couche * 0.75) * 3;
      var tt = AV.entre(rng, 0.15, 0.85), a = rng() * Math.PI * 2;
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), AV.matBrillant(cols[i % cols.length], 0.7));
      b.position.set(Math.cos(a) * rad * (1 - tt) * 1.02, cy - h / 2 + tt * h, Math.sin(a) * rad * (1 - tt) * 1.02);
      sapin.add(b);
    }
    var etoile = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), AV.matBrillant('#ffd24a', 1));
    etoile.position.y = 9.7; sapin.add(etoile);
    var he = AV.halo('#ffe08a', 5); he.position.y = 9.7; sapin.add(he);
    m.ajouter(sapin, 0, 0, 0, { collision: false, bloque: true });
    m.colliders.push({ x: 0, z: 0, r: 3.6 });
    m.anime(function (dt, t) { etoile.rotation.y += dt; he.material.opacity = 0.6 + Math.sin(t * 2) * 0.2; });
    m.lumiere('#ffcf8a', 1, 20, 0, 4, 4);
    for (var k = 0; k < 7; k++) {
      var ca = new THREE.Group(), cc = AV.choisir(rng, ['#d94a4a', '#3f8f6b', '#3f6fd1', '#f3c34b', '#c39bff']);
      var tl = AV.entre(rng, 0.6, 1);
      var boite = AV.maille(new THREE.BoxGeometry(tl, tl * 0.8, tl), cc); boite.position.y = tl * 0.4; ca.add(boite);
      var ru = AV.maille(new THREE.BoxGeometry(tl * 1.02, tl * 0.82, 0.12), '#ffffff'); ru.position.y = tl * 0.4; ca.add(ru);
      var a2 = k / 7 * Math.PI * 2 + 0.3;
      m.ajouter(ca, Math.sin(a2) * 3.9, Math.cos(a2) * 3.9, rng() * 3, { collision: false });
    }

    // Portails
    m.portails = [];
    for (var j = 0; j < 24; j++) {
      var ang = (j + 0.5) / 24 * Math.PI * 2;
      var px = Math.sin(ang) * 22, pz = Math.cos(ang) * 22;
      var p = m.portail(px, pz, ang, '#9fd8ff');
      var gemMat = new THREE.MeshLambertMaterial({ color: '#9fd8ff', emissive: '#9fd8ff', emissiveIntensity: 0.6 });
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat); gem.position.y = 4.05; p.add(gem);
      var num = AV.texteSprite(String(j + 1), { fond: 'rgba(27,35,64,.85)', largeur: 1.6 }); num.position.y = 4.9; p.add(num);
      var cadenas = AV.texteSprite('🔒', { largeur: 2.2 }); cadenas.position.y = 1.4; p.add(cadenas);
      var coche = AV.texteSprite('✔', { couleur: '#ffd24a', contour: '#7a5a00', largeur: 2.4 }); coche.position.y = 1.5; p.add(coche);
      var rayon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      rayon.position.y = 20; p.add(rayon);
      var info = { type: 'portail', jour: j + 1, x: px, z: pz, rayon: 2.4, objet: p, gem: gem, cadenas: cadenas, coche: coche, faisceau: rayon };
      m.portails.push(info);
      m.interactifs.push(info);
      m.reserver(px, pz, 2.6);
    }
    m.appliquerEtats = function (etats) {
      m.portails.forEach(function (p) {
        var e = etats[p.jour - 1] || 'verrouille', v = p.objet.userData.voile.material;
        p.etat = e;
        var c = e === 'verrouille' ? '#7d8296' : e === 'fait' ? '#ffd24a' : e === 'aujourdhui' ? '#ffb347' : '#9fd8ff';
        v.color.set(c); v.opacity = e === 'verrouille' ? 0.22 : 0.55;
        p.gem.material.color.set(c); p.gem.material.emissive.set(c);
        p.cadenas.visible = e === 'verrouille';
        p.coche.visible = e === 'fait';
        p.faisceau.visible = e === 'aujourdhui';
      });
    };
    m.appliquerEtats(etats || []);
    m.anime(function (dt, t) {
      m.portails.forEach(function (p, i) {
        p.gem.rotation.y += dt * 1.5;
        p.gem.position.y = 4.05 + Math.sin(t * 2 + i) * 0.08;
        if (p.etat !== 'verrouille') p.objet.userData.voile.material.opacity = 0.5 + Math.sin(t * 2 + i * 0.7) * 0.12;
        if (p.etat === 'aujourdhui') p.faisceau.material.opacity = 0.16 + Math.sin(t * 3) * 0.08;
      });
    });

    // Maisons, lampadaires, forêt autour
    for (var hm = 0; hm < 10; hm++) {
      var ah = (hm + 0.5) / 10 * Math.PI * 2;
      if (Math.abs(Math.sin(ah)) < 0.2 && Math.cos(ah) > 0) continue; // dégage l'allée d'arrivée
      var mai = AV.deco.maison(rng, AV.entre(rng, 0.9, 1.15), null, null, true);
      m.ajouter(mai, Math.sin(ah) * 29.5, Math.cos(ah) * 29.5, ah + Math.PI, { bloque: true });
      m.cachetteDerriere(Math.sin(ah) * 29.5, Math.cos(ah) * 29.5, 2);
    }
    for (var l = 0; l < 12; l++) {
      var al = (l + 0.5) / 12 * Math.PI * 2;
      m.ajouter(AV.deco.lampadaire('#ffd98a'), Math.sin(al) * 17.5, Math.cos(al) * 17.5, al + Math.PI);
    }
    m.semer(rng, 80, function (r) { return AV.deco.sapin(r, AV.entre(r, 0.9, 1.6), true); }, { min: 31, max: 55, collision: false, marge: 1.2 });
    m.ajouter(AV.deco.bonhomme(), 4.5, 12.5, -0.6);
    m.ajouter(AV.deco.bonhomme(), -9, -10, 2.2);
    m.neige(800);
    return m;
  };

  // =====================================================================
  //  PLAGE au coucher du soleil
  // =====================================================================
  AV.biomes.plage = function (cfg) {
    var rng = AV.rng(100 + cfg.jour);
    var ciel = CIELS[(cfg.ambiance && cfg.ambiance.ciel) || 'coucher'] || CIELS.coucher;
    var PONTON = { x0: 7.8, x1: 10.6, z0: -27, z1: -4.5 };
    var sol = function (x, z) {
      var h = ondul(x, z, 0.25, 0.18);
      if (z < -6) h -= (-6 - z) * 0.16;
      if (z > 17) h += Math.pow(z - 17, 1.3) * 0.22 + ondul(x, z, 0.5, 0.3) * lisse(17, 22, z);
      return h;
    };
    var surPonton = function (x, z) { return x > PONTON.x0 && x < PONTON.x1 && z > PONTON.z0 && z < PONTON.z1; };
    var H = function (x, z) { return surPonton(x, z) ? 0.62 : sol(x, z); };
    var m = new Monde({
      rayon: 38, hauteur: H, surface: 'sable', depart: { x: 0, z: 13, angle: Math.PI }, theme: 'plage', ambiance: 'vagues',
      brouillard: [35, 150],
      autorise: function (x, z) { return surPonton(x, z) || sol(x, z) > -0.75; },
      surfaceA: function (x, z) { return surPonton(x, z) ? 'bois' : 'sable'; }
    });
    m.cielEtLumieres(ciel);
    m.groupe.add(AV.terrain(130, 80, sol, function (x, z, y) {
      if (z > 21) return varier('#c9cf8a', x, z, 0.12);
      if (y < -0.35) return varier('#c4a26e', x, z, 0.08);
      if (y < 0) return varier('#dcc08c', x, z, 0.08);
      return varier('#f3dba8', x, z, 0.07);
    }));
    var eau = AV.eau(170, 80, 40, 20, '#3fb0c4', 0.82);
    eau.position.set(0, -0.45, -40); m.groupe.add(eau);
    m.anime(function (dt, t) { eau.userData.maj(dt, t); });

    // soleil couchant
    if (ciel === CIELS.coucher) {
      var sl = new THREE.Mesh(new THREE.SphereGeometry(22, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffcf6a', fog: false }));
      sl.position.set(-80, 18, -330); m.groupe.add(sl);
      var hs = AV.halo('#ffb05a', 160); hs.material.fog = false; hs.material.opacity = 0.5; hs.position.copy(sl.position); m.groupe.add(hs);
    } else if (ciel.etoiles) { lune(m, -60, 90, -300, 12); }

    // ponton
    var ponton = new THREE.Group();
    for (var z = PONTON.z1; z > PONTON.z0; z -= 0.6) {
      var pl = AV.maille(new THREE.BoxGeometry(PONTON.x1 - PONTON.x0, 0.1, 0.5), z % 1.2 < 0.6 ? '#a07850' : '#8f6a45');
      pl.position.set((PONTON.x0 + PONTON.x1) / 2, 0.57, z); ponton.add(pl);
    }
    for (var zp = PONTON.z1 - 1; zp > PONTON.z0; zp -= 3) {
      [PONTON.x0 + 0.1, PONTON.x1 - 0.1].forEach(function (x) {
        var po = AV.maille(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), '#6b4a32'); po.position.set(x, -0.3, zp); ponton.add(po);
      });
    }
    m.groupe.add(ponton);
    m.reserver(9.2, -15, 3);
    m.cachettes.push({ x: 9.2, z: -25.8, y: 0 });

    // palmiers
    m.semer(rng, 11, function (r) { return palmier(r, AV.entre(r, 0.9, 1.25)); }, {
      max: 30, marge: 2.5, bloque: true, filtre: function (x, z) { return z > 1 && z < 24; }
    }).forEach(function (p) { m.cachetteDerriere(p.x, p.z, 0.5); });

    // rochers au bord de l'eau
    [[-19, -4], [21, -3], [-8, -7.5], [26, 6], [-28, 8]].forEach(function (c, i) {
      for (var k = 0; k < 3; k++) {
        var ro = AV.deco.rocher(rng, AV.entre(rng, 0.6, 1.3) * (k ? 0.7 : 1));
        m.ajouter(ro, c[0] + (k - 1) * 1.4, c[1] + (rng() - 0.5) * 1.5, rng() * 3, { bloque: !k });
      }
      m.cachetteDerriere(c[0], c[1], 1.6);
    });

    var ch = chateauSable(); m.ajouter(ch, -6, 3, 0.3); m.cachetteDerriere(-6, 3, 1.3);
    var pa = parasol('#d94a4a'); m.ajouter(pa, 5.5, 5.5, 0);
    var serv = AV.maille(new THREE.BoxGeometry(1, 0.04, 2), '#5ab0ff', false); m.ajouter(serv, 5.8, 6.8, 0.2, { collision: false, dy: 0.02 });
    var serv2 = AV.maille(new THREE.BoxGeometry(1.01, 0.045, 0.4), '#ffffff', false); serv.add(serv2);
    m.cachettes.push({ x: 4.7, z: 4.9, y: 0 });
    var pa2 = parasol('#3f8f6b'); m.ajouter(pa2, -14, 9, 0);
    m.cachettes.push({ x: -14.6, z: 9.8, y: 0 });

    var cab = AV.deco.maison(rng, 0.75, '#ffffff', '#3fa0c9', false);
    m.ajouter(cab, -20, 16, 0.4, { bloque: true }); m.cachetteDerriere(-20, 16, 1.8);
    var cab2 = AV.deco.maison(rng, 0.7, '#ffe0e0', '#d94a4a', false);
    m.ajouter(cab2, 18, 15, -0.5, { bloque: true }); m.cachetteDerriere(18, 15, 1.8);

    feuDeCamp(m, -2, 8);
    m.reserver(-2, 8, 1.8);

    // herbes des dunes
    m.semer(rng, 45, function (r) {
      var g = new THREE.Group();
      for (var i = 0; i < 4; i++) { var b = AV.maille(new THREE.ConeGeometry(0.06, AV.entre(r, 0.6, 1.1), 3), '#a8b45a', false); b.position.set((r() - 0.5) * 0.4, 0.35, (r() - 0.5) * 0.4); b.rotation.z = (r() - 0.5) * 0.6; g.add(b); }
      return g;
    }, { min: 5, max: 37, collision: false, filtre: function (x, z) { return z > 18; } });
    // coquillages
    m.semer(rng, 30, function (r) {
      var c = AV.maille(new THREE.SphereGeometry(0.12, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), AV.choisir(r, ['#ffe4e1', '#fff4d6', '#f7c6b8']), false);
      c.scale.y = 0.6; return c;
    }, { max: 36, collision: false, marge: 0.3, filtre: function (x, z) { return z > -8 && z < 10; } });

    // mouettes
    for (var g = 0; g < 5; g++) {
      (function (i) {
        var mo = mouette(); m.groupe.add(mo);
        var r = 14 + i * 4, v = 0.25 + i * 0.05, hh = 10 + i * 1.5, ph = i * 1.7;
        m.anime(function (dt, t) {
          var a = t * v + ph;
          mo.position.set(Math.cos(a) * r, hh + Math.sin(t + i) * 0.8, -12 + Math.sin(a) * r * 0.6);
          mo.rotation.y = -a;
          var f = Math.sin(t * 8 + i) * 0.5;
          mo.userData.ailes[0].rotation.z = f; mo.userData.ailes[1].rotation.z = -f;
        });
      })(g);
    }
    m.portailRetour();
    return m;
  };

  // =====================================================================
  //  FORÊT ENNEIGÉE avec lac gelé, chalet et aurore
  // =====================================================================
  AV.biomes.foret_neige = function (cfg) {
    var rng = AV.rng(200 + cfg.jour);
    var ciel = CIELS[(cfg.ambiance && cfg.ambiance.ciel) || 'hiver'] || CIELS.hiver;
    var LAC = { x: 12, z: -10, r: 9 };
    var H = function (x, z) {
      var h = ondul(x, z, 1.2, 0.11) + ondul(x + 40, z - 20, 0.4, 0.3);
      var dl = Math.sqrt((x - LAC.x) * (x - LAC.x) + (z - LAC.z) * (z - LAC.z));
      h = AV.lerp(-0.25, h, lisse(LAC.r, LAC.r + 3.5, dl));
      var ds = Math.sqrt(x * x + (z - 20) * (z - 20));
      h = AV.lerp(h * 0.25, h, lisse(3, 9, ds));
      var d = Math.sqrt(x * x + z * z);
      if (d > 34) h += Math.pow(d - 34, 1.4) * 0.5;
      return h;
    };
    var surLac = function (x, z) { var dx = x - LAC.x, dz = z - LAC.z; return dx * dx + dz * dz < LAC.r * LAC.r; };
    var m = new Monde({
      rayon: 37, hauteur: H, surface: 'neige', depart: { x: 0, z: 20, angle: Math.PI }, theme: 'foret_neige', ambiance: 'vent',
      brouillard: [22, 90], surfaceA: function (x, z) { return surLac(x, z) ? 'glace' : 'neige'; }
    });
    m.cielEtLumieres(ciel);
    m.groupe.add(AV.terrain(130, 90, H, function (x, z, y) {
      return varier(y < 0.2 ? '#e3ebf7' : '#f3f7fd', x, z, 0.07);
    }));
    var glace = new THREE.Mesh(new THREE.CircleGeometry(LAC.r + 0.6, 28), new THREE.MeshPhongMaterial({ color: '#bfe6f8', shininess: 120, specular: '#ffffff', transparent: true, opacity: 0.92 }));
    glace.rotation.x = -Math.PI / 2; glace.position.set(LAC.x, -0.2, LAC.z); glace.receiveShadow = true; m.groupe.add(glace);
    m.reserver(LAC.x, LAC.z, LAC.r + 1);

    lune(m, 90, 130, -260, 12);

    // aurore boréale
    var cv = document.createElement('canvas'); cv.width = 4; cv.height = 64;
    var cx = cv.getContext('2d'), gr = cx.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(120,80,255,0)'); gr.addColorStop(0.4, 'rgba(90,255,180,.9)'); gr.addColorStop(1, 'rgba(60,255,160,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 4, 64);
    var texA = new THREE.CanvasTexture(cv);
    for (var a = 0; a < 3; a++) {
      (function (i) {
        var geo = new THREE.PlaneGeometry(260, 40, 40, 1), base = geo.attributes.position.array.slice();
        var mat = new THREE.MeshBasicMaterial({ map: i === 0 ? texA : texA, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
        var au = new THREE.Mesh(geo, mat);
        au.position.set(-20 + i * 30, 85 + i * 12, -200 - i * 30); au.rotation.x = 0.3;
        m.groupe.add(au);
        m.anime(function (dt, t) {
          var p = geo.attributes.position.array;
          for (var k = 0; k < p.length; k += 3) p[k + 2] = base[k + 2] + Math.sin(base[k] * 0.03 + t * 0.4 + i) * 18;
          geo.attributes.position.needsUpdate = true;
          mat.opacity = 0.25 + Math.sin(t * 0.5 + i * 2) * 0.1;
        });
      })(a);
    }

    // chalet
    var cha = AV.deco.maison(rng, 1.2, '#9b6a45', '#5a3a2a', true);
    m.ajouter(cha, -13, -6, 0.6, { bloque: true });
    m.cachetteDerriere(-13, -6, 2.4);
    m.reserver(-13, -6, 4.5);
    m.lumiere('#ffb35a', 1.4, 14, -13 + Math.sin(0.6) * 3, H(-13, -6) + 1.8, -6 + Math.cos(0.6) * 3);
    var fumees = [];
    for (var f = 0; f < 6; f++) {
      var fu = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshLambertMaterial({ color: '#c9d2e0', transparent: true, opacity: 0.6 }));
      m.groupe.add(fu); fumees.push(fu);
    }
    var chem = new THREE.Vector3(-13, 0, -6).add(new THREE.Vector3(0.96, 0, -0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6));
    chem.y = H(-13, -6) + 4.3;
    m.anime(function (dt, t) {
      fumees.forEach(function (s, i) {
        var k = ((t * 0.25 + i / fumees.length) % 1);
        s.position.set(chem.x + Math.sin(t + i) * 0.3 * k + k * 1.2, chem.y + k * 5, chem.z);
        s.scale.setScalar(0.5 + k * 1.6); s.material.opacity = 0.6 * (1 - k);
      });
    });

    // sapins
    m.semer(rng, 75, function (r) { return AV.deco.sapin(r, AV.entre(r, 0.9, 1.7), true); }, { max: 35, marge: 1.6, bloque: true })
      .forEach(function (p, i) { if (i % 6 === 0) m.cachetteDerriere(p.x, p.z, 0.6); });
    m.semer(rng, 70, function (r) { return AV.deco.sapin(r, AV.entre(r, 1.2, 2), true); }, { min: 37, max: 60, collision: false, marge: 1.4 });
    m.semer(rng, 12, function (r) { return AV.deco.rocher(r, AV.entre(r, 0.8, 1.6), '#7d838c', true); }, { max: 34, marge: 2, bloque: true })
      .forEach(function (p) { m.cachetteDerriere(p.x, p.z, p.obj.userData.rayon); });
    m.semer(rng, 6, function (r) { return AV.deco.tronc(r, AV.entre(r, 2.5, 3.5)); }, { max: 32, marge: 2.5 })
      .forEach(function (p) { m.cachetteDerriere(p.x, p.z, 0.5); });
    m.semer(rng, 2, function () { return AV.deco.bonhomme(); }, { max: 20, marge: 2 });
    m.semer(rng, 25, function (r) { return AV.deco.buisson(r, AV.entre(r, 0.6, 1), '#dfe8f5'); }, { max: 34, marge: 1, collision: false });

    m.neige(900);
    m.portailRetour();
    return m;
  };

  // =====================================================================
  //  VILLE LA NUIT : avenues, place, fontaine, marché de Noël
  // =====================================================================
  AV.biomes.ville_nuit = function (cfg) {
    var rng = AV.rng(300 + cfg.jour);
    var ciel = CIELS[(cfg.ambiance && cfg.ambiance.ciel) || 'nuit'] || CIELS.nuit;
    var H = function () { return 0; };
    var m = new Monde({ rayon: 36, hauteur: H, surface: 'pave', depart: { x: 0, z: 30, angle: Math.PI }, theme: 'ville_nuit', ambiance: 'ville', brouillard: [28, 110] });
    m.cielEtLumieres(ciel);
    lune(m, -70, 110, -250, 10);
    m.groupe.add(AV.terrain(130, 100, H, function (x, z) {
      var d = Math.sqrt(x * x + z * z), ax = Math.abs(x), az = Math.abs(z);
      if (d < 9) return varier((Math.floor(x * 0.7) + Math.floor(z * 0.7)) % 2 ? '#948e86' : '#857f78', x, z, 0.05);
      if (ax < 4 || az < 4) return varier('#3a3d48', x, z, 0.06);
      if (ax < 6.5 || az < 6.5) return varier('#7c7f8c', x, z, 0.06);
      return varier('#3f4f45', x, z, 0.1);
    }));

    // textures de façades
    var murs = ['#3b3550', '#4a3b3b', '#2f3b52', '#46405a', '#3a4a4a', '#523f38'];
    var mats = murs.map(function (mur, i) {
      var r = AV.rng(900 + i), c = document.createElement('canvas'); c.width = 128; c.height = 256;
      var x = c.getContext('2d'); x.fillStyle = mur; x.fillRect(0, 0, 128, 256);
      for (var row = 0; row < 8; row++) for (var col = 0; col < 4; col++) {
        var allume = r() < 0.45;
        x.fillStyle = allume ? AV.choisir(r, ['#ffd27a', '#ffe7a8', '#ffb86b']) : 'rgba(10,12,30,.85)';
        x.fillRect(10 + col * 30, 12 + row * 30, 18, 20);
      }
      var t = new THREE.CanvasTexture(c);
      return new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55 });
    });
    function immeuble(r, l, p, h) {
      var g = new THREE.Group();
      var b = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), AV.choisir(r, mats)); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
      var t = AV.maille(new THREE.BoxGeometry(l + 0.3, 0.4, p + 0.3), '#2b2f3a'); t.position.y = h + 0.2; g.add(t);
      if (r() < 0.4) { var an = AV.maille(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), '#2b2f3a'); an.position.set(l * 0.3, h + 1.2, 0); g.add(an); var lr = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), AV.matBrillant('#ff3030', 1)); lr.position.set(l * 0.3, h + 2.2, 0); g.add(lr); }
      g.userData.rect = { hx: l / 2, hz: p / 2 };
      return g;
    }
    [12.5, 19.5, 26.5, 33.5].forEach(function (d) {
      [-1, 1].forEach(function (s1) {
        [-1, 1].forEach(function (s2) {
          // le long de l'avenue nord-sud (immeubles de part et d'autre)
          m.ajouter(immeuble(rng, 8, 6, AV.entre(rng, 7, 15)), s1 * 10.5, s2 * d, 0, { bloque: true });
          m.cachettes.push({ x: s1 * 8.2, z: s2 * (d + 3.5), y: 0 });
        });
      });
    });
    [18.5, 25.5, 32.5].forEach(function (d) {
      [-1, 1].forEach(function (s1) {
        [-1, 1].forEach(function (s2) {
          m.ajouter(immeuble(rng, 6, 8, AV.entre(rng, 7, 15)), s1 * d, s2 * 10.5, 0, { bloque: true });
          m.cachettes.push({ x: s1 * (d - 3.5), z: s2 * 8.2, y: 0 });
        });
      });
    });
    // silhouette de ville au loin
    for (var k = 0; k < 40; k++) {
      var a = k / 40 * Math.PI * 2 + rng() * 0.1, dd = AV.entre(rng, 48, 70);
      m.ajouter(immeuble(rng, AV.entre(rng, 6, 10), AV.entre(rng, 6, 10), AV.entre(rng, 12, 30)), Math.sin(a) * dd, Math.cos(a) * dd, 0, { collision: false });
    }

    // fontaine
    var fo = new THREE.Group();
    var bas = AV.maille(new THREE.CylinderGeometry(3.2, 3.4, 0.7, 14), '#a8a29a'); bas.position.y = 0.35; fo.add(bas);
    var eauF = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.1, 14), new THREE.MeshPhongMaterial({ color: '#4fa0d0', shininess: 90, emissive: '#10304a' })); eauF.position.y = 0.66; fo.add(eauF);
    var col = AV.maille(new THREE.CylinderGeometry(0.3, 0.45, 2, 8), '#a8a29a'); col.position.y = 1.5; fo.add(col);
    var vasque = AV.maille(new THREE.CylinderGeometry(1.1, 0.4, 0.4, 10), '#a8a29a'); vasque.position.y = 2.5; fo.add(vasque);
    fo.userData.rayon = 3.3;
    m.ajouter(fo, 0, 0, 0, { bloque: true });
    var nj = 160, jp = new Float32Array(nj * 3), jv = [];
    for (var j = 0; j < nj; j++) jv.push({ a: Math.random() * 6.28, v: 1 + Math.random(), t: Math.random() });
    var jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.BufferAttribute(jp, 3));
    var jet = new THREE.Points(jg, new THREE.PointsMaterial({ color: '#bfe6ff', size: 0.14, map: AV.textureRonde(), transparent: true, depthWrite: false }));
    jet.frustumCulled = false; m.groupe.add(jet);
    m.anime(function (dt) {
      for (var i = 0; i < nj; i++) {
        var q = jv[i]; q.t += dt * 0.8; if (q.t > 1) q.t -= 1;
        var rr = q.t * 1.6 * q.v;
        jp[i * 3] = Math.cos(q.a) * rr; jp[i * 3 + 2] = Math.sin(q.a) * rr;
        jp[i * 3 + 1] = 2.8 + q.t * 2.2 - q.t * q.t * 4.2 + 0.7;
      }
      jg.attributes.position.needsUpdate = true;
    });
    m.cachetteDerriere(0, 0, 3.3);

    // lampadaires et lumières
    [11, 18, 25, 32].forEach(function (d) {
      [-1, 1].forEach(function (s) {
        m.ajouter(AV.deco.lampadaire(), s * 5.8, d, s > 0 ? -Math.PI / 2 : Math.PI / 2);
        m.ajouter(AV.deco.lampadaire(), s * 5.8, -d, s > 0 ? -Math.PI / 2 : Math.PI / 2);
        m.ajouter(AV.deco.lampadaire(), d, s * 5.8, s > 0 ? Math.PI : 0);
        m.ajouter(AV.deco.lampadaire(), -d, s * 5.8, s > 0 ? Math.PI : 0);
      });
    });
    [[6.4, 6.4], [-6.4, 6.4], [6.4, -6.4], [-6.4, -6.4]].forEach(function (p) {
      m.ajouter(AV.deco.lampadaire(), p[0], p[1], Math.atan2(-p[0], -p[1]));
      m.lumiere('#ffcf8a', 1.1, 16, p[0] * 0.92, 2.8, p[1] * 0.92);
    });
    m.lumiere('#9fb8ff', 0.6, 30, 0, 6, 22);

    // guirlandes au-dessus des avenues
    var couleurs = ['#ff5a5a', '#ffd24a', '#5ab0ff', '#7dff9a', '#ff8af0'];
    var pts = [];
    [12, 18, 24, 30].forEach(function (d) {
      [-1, 1].forEach(function (s) {
        pts = pts.concat(guirlandeEntre([-6.5, 6.5, s * d], [6.5, 6.5, s * d], 26, 1.2));
        pts = pts.concat(guirlandeEntre([s * d, 6.5, -6.5], [s * d, 6.5, 6.5], 26, 1.2));
      });
    });
    for (var gi = 0; gi < 4; gi++) {
      var aa = gi / 4 * Math.PI * 2 + Math.PI / 4;
      pts = pts.concat(guirlandeEntre([0, 3.2, 0], [Math.sin(aa) * 6.2, 5.2, Math.cos(aa) * 6.2], 18, -0.6));
    }
    var guir = guirlande(pts, couleurs); m.groupe.add(guir);
    m.anime(function (dt, t) { guir.material.size = 0.45 + Math.sin(t * 3) * 0.08; });

    // marché de Noël
    [[0, -7.6, 0], [7.6, 0, -Math.PI / 2], [-7.6, 0, Math.PI / 2]].forEach(function (c) {
      var ch = chalet(rng); m.ajouter(ch, c[0], c[1], c[2], { bloque: true }); m.cachetteDerriere(c[0], c[1], 1.5);
    });
    // voitures garées, bancs
    [[4.7, 14, 0], [-4.7, 22, Math.PI], [4.7, -20, 0], [-4.7, -13, Math.PI], [15, 4.7, Math.PI / 2], [-22, -4.7, -Math.PI / 2], [28, -4.7, -Math.PI / 2]].forEach(function (c) {
      m.ajouter(voiture(rng), c[0], c[1], c[2], { bloque: true });
      m.cachetteDerriere(c[0], c[1], 1.2);
    });
    [[5.5, 3.8, -Math.PI / 2], [-5.5, -3.8, Math.PI / 2], [3.8, -5.5, 0], [-3.8, 5.5, Math.PI]].forEach(function (c) {
      m.ajouter(banc(), c[0], c[1], c[2]);
    });
    // cours intérieures : arbres
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      for (var i = 0; i < 4; i++) {
        var x = q[0] * AV.entre(rng, 17, 30), z = q[1] * AV.entre(rng, 17, 30);
        if (m.libre(x, z, 1.5)) { m.ajouter(AV.deco.arbre(rng, 1, '#2f5a45'), x, z, rng() * 6, { bloque: true }); m.cachetteDerriere(x, z, 0.6); }
      }
    });
    // marquage au sol
    for (var zl = -34; zl < 34; zl += 3) {
      if (Math.abs(zl) < 9) continue;
      var tr = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 1.4), AV.mat('#d8d8d8')); tr.position.set(0, 0.01, zl); m.groupe.add(tr);
      var tr2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.15), AV.mat('#d8d8d8')); tr2.position.set(zl, 0.01, 0); m.groupe.add(tr2);
    }
    m.portailRetour();
    return m;
  };

  // =====================================================================
  //  BIOMES GÉNÉRIQUES (à remplacer par des biomes soignés à l'étape 2)
  // =====================================================================
  var PRESETS = {
    montagne: { ciel: 'jour', relief: 3.5, bord: 0.9, surface: 'herbe', couleurs: ['#6f8f58', '#8a9a6a', '#9a9aa0', '#f6f9ff'], sommets: true },
    desert:   { ciel: 'jour', cielPerso: { haut: '#3f86d6', bas: '#ffe2b0', brouillard: '#f6dcb0' }, relief: 1.6, bord: 0.5, surface: 'sable', couleurs: ['#e3b878', '#d9a86a', '#e8c288', '#e8c288'] },
    lac:      { ciel: 'jour', relief: 0.8, bord: 0.6, surface: 'herbe', couleurs: ['#7fb069', '#6f9f5c', '#8a9a6a', '#8a9a6a'], lac: true },
    campagne: { ciel: 'jour', relief: 0.7, bord: 0.5, surface: 'herbe', couleurs: ['#8fc46a', '#7fb35c', '#9a9a6a', '#9a9a6a'], champs: true },
    foret:    { ciel: 'jour', relief: 1, bord: 0.6, surface: 'herbe', couleurs: ['#5f8f4a', '#527f40', '#6a7a50', '#6a7a50'] },
    neige:    { ciel: 'hiver', relief: 1.2, bord: 0.6, surface: 'neige', couleurs: ['#f0f5fc', '#e3ebf7', '#dfe6f2', '#ffffff'], neige: true }
  };

  function generique(cfg) {
    var pr = PRESETS[cfg.biome] || PRESETS.campagne;
    var rng = AV.rng(400 + cfg.jour * 7);
    var nomCiel = (cfg.ambiance && cfg.ambiance.ciel) || pr.ciel;
    var ciel = Object.assign({}, CIELS[nomCiel] || CIELS.jour, nomCiel === pr.ciel ? (pr.cielPerso || {}) : {});
    var LAC = { x: 0, z: -6, r: 9 };
    var H = function (x, z) {
      var h = ondul(x, z, pr.relief * 0.45, 0.1) + ondul(x + 17, z - 9, pr.relief * 0.15, 0.27);
      var ds = Math.sqrt(x * x + (z - 20) * (z - 20));
      h = AV.lerp(h * 0.2, h, lisse(3, 10, ds));
      if (pr.lac) { var dl = Math.sqrt((x - LAC.x) * (x - LAC.x) + (z - LAC.z) * (z - LAC.z)); h = AV.lerp(-1.2, h, lisse(LAC.r - 2, LAC.r + 3, dl)); }
      var d = Math.sqrt(x * x + z * z);
      if (d > 32) h += Math.pow(d - 32, 1.25) * pr.bord * 0.6;
      return h;
    };
    var m = new Monde({
      rayon: 36, hauteur: H, surface: pr.surface, depart: { x: 0, z: 20, angle: Math.PI }, theme: nomCiel === 'nuit' ? 'ville_nuit' : 'defaut',
      ambiance: pr.surface === 'neige' ? 'vent' : null, brouillard: [30, 130],
      autorise: pr.lac ? function (x, z) { return H(x, z) > -0.55; } : null
    });
    m.cielEtLumieres(ciel);
    if (ciel.etoiles) lune(m, 80, 120, -260, 10);
    var c = pr.couleurs;
    m.groupe.add(AV.terrain(130, 85, H, function (x, z, y) {
      if (pr.champs && Math.abs(x) > 8 && Math.sqrt(x * x + z * z) < 34) {
        var bande = Math.floor((z + 100) / 6) % 3;
        return varier(['#d9c36a', '#8fc46a', '#b5a05a'][bande], x, z, 0.1);
      }
      if (pr.sommets && y > 6) return varier(c[3], x, z, 0.05);
      if (y > 3) return varier(c[2], x, z, 0.1);
      if (y < -0.3) return varier('#b5a37a', x, z, 0.08);
      return varier(hash(Math.floor(x / 3), Math.floor(z / 3)) > 0.5 ? c[0] : c[1], x, z, 0.08);
    }));
    if (pr.lac) {
      var eau = AV.eau(2 * LAC.r + 6, 2 * LAC.r + 6, 16, 16, '#4fa8d0', 0.85);
      eau.position.set(LAC.x, -0.6, LAC.z); m.groupe.add(eau);
      m.anime(function (dt, t) { eau.userData.maj(dt, t); });
      m.reserver(LAC.x, LAC.z, LAC.r + 1);
    }

    var neige = pr.surface === 'neige';
    var b = cfg.biome;
    if (b === 'desert') {
      m.semer(rng, 28, cactus, { max: 34, marge: 2, bloque: true }).forEach(function (p, i) { if (i % 3 === 0) m.cachetteDerriere(p.x, p.z, 0.5); });
      m.semer(rng, 14, function (r) { return AV.deco.rocher(r, AV.entre(r, 1, 2.2), AV.choisir(r, ['#c2734a', '#b5683f', '#d08a5a'])); }, { max: 34, marge: 3, bloque: true })
        .forEach(function (p) { m.cachetteDerriere(p.x, p.z, p.obj.userData.rayon); });
    } else if (b === 'montagne') {
      m.semer(rng, 45, function (r) { return AV.deco.sapin(r, AV.entre(r, 0.9, 1.6), r() < 0.3); }, { max: 34, marge: 1.8, bloque: true }).forEach(function (p, i) { if (i % 5 === 0) m.cachetteDerriere(p.x, p.z, 0.6); });
      m.semer(rng, 22, function (r) { return AV.deco.rocher(r, AV.entre(r, 0.8, 2)); }, { max: 34, marge: 2, bloque: true }).forEach(function (p) { m.cachetteDerriere(p.x, p.z, p.obj.userData.rayon); });
      m.semer(rng, 50, AV.deco.fleur, { max: 30, collision: false, marge: 0.3 });
    } else if (b === 'campagne') {
      m.semer(rng, 16, botteFoin, { max: 32, marge: 2, filtre: function (x) { return Math.abs(x) > 9; } }).forEach(function (p) { m.cachetteDerriere(p.x, p.z, 0.8); });
      m.semer(rng, 18, function (r) { return AV.deco.arbre(r, AV.entre(r, 0.9, 1.4)); }, { max: 34, marge: 2.5, bloque: true }).forEach(function (p, i) { if (i % 3 === 0) m.cachetteDerriere(p.x, p.z, 0.5); });
      m.semer(rng, 8, function () { return barriere(5); }, { max: 30, marge: 3 }).forEach(function (p) { m.cachetteDerriere(p.x, p.z, 0.4); });
      m.semer(rng, 2, function (r) { return AV.deco.maison(r, 1.1); }, { min: 14, max: 28, marge: 5, bloque: true }).forEach(function (p) { m.cachetteDerriere(p.x, p.z, 2.2); });
      m.semer(rng, 60, AV.deco.fleur, { max: 32, collision: false, marge: 0.3 });
    } else {
      // forêt, lac, neige et biomes inconnus
      var nb = b === 'foret' ? 70 : 35;
      m.semer(rng, nb, function (r) { return neige ? AV.deco.sapin(r, AV.entre(r, 0.9, 1.6), true) : (r() < 0.7 ? AV.deco.arbre(r, AV.entre(r, 0.9, 1.5)) : AV.deco.sapin(r, AV.entre(r, 0.9, 1.4))); }, { max: 34, marge: 1.8, bloque: true })
        .forEach(function (p, i) { if (i % 5 === 0) m.cachetteDerriere(p.x, p.z, 0.6); });
      m.semer(rng, 10, function (r) { return AV.deco.rocher(r, AV.entre(r, 0.7, 1.4), null, neige); }, { max: 34, marge: 2, bloque: true })
        .forEach(function (p) { m.cachetteDerriere(p.x, p.z, p.obj.userData.rayon); });
      m.semer(rng, 20, function (r) { return AV.deco.buisson(r, AV.entre(r, 0.7, 1.2), neige ? '#dfe8f5' : null); }, { max: 34, marge: 1.2 })
        .forEach(function (p, i) { if (i % 3 === 0) m.cachetteDerriere(p.x, p.z, 0.7); });
      if (!neige) m.semer(rng, b === 'foret' ? 30 : 50, b === 'foret' ? champignon : AV.deco.fleur, { max: 32, collision: false, marge: 0.3 });
      if (neige) m.semer(rng, 2, function () { return AV.deco.bonhomme(); }, { max: 22, marge: 2 });
    }
    m.semer(rng, 60, function (r) { return neige ? AV.deco.sapin(r, AV.entre(r, 1.2, 2), true) : (b === 'desert' ? cactus(r) : AV.deco.arbre(r, AV.entre(r, 1.2, 1.8))); }, { min: 37, max: 60, collision: false, marge: 1.5 });
    if (pr.neige) m.neige(700);
    m.portailRetour();
    return m;
  }

  // =====================================================================
  //  VILLAGE D'ACCUEIL : NOËL À PERTH ☀️🎄 (été australien, 34 °C)
  // =====================================================================
  function panneau(texte, fond, couleur, l, h) {
    var c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / l);
    var x = c.getContext('2d');
    x.fillStyle = fond; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 10; x.strokeRect(5, 5, c.width - 10, c.height - 10);
    x.fillStyle = couleur || '#2b2340'; x.textAlign = 'center'; x.textBaseline = 'middle';
    var taille = c.height * 0.55;
    x.font = '900 ' + taille + 'px Nunito, sans-serif';
    while (x.measureText(texte).width > c.width - 50 && taille > 10) { taille -= 2; x.font = '900 ' + taille + 'px Nunito, sans-serif'; }
    x.fillText(texte, c.width / 2, c.height / 2 + 4);
    var tex = new THREE.CanvasTexture(c);
    var g = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ map: tex });
    var avant = new THREE.Mesh(new THREE.PlaneGeometry(l, h), mat); avant.position.z = 0.03; g.add(avant);
    var arriere = new THREE.Mesh(new THREE.PlaneGeometry(l, h), mat); arriere.rotation.y = Math.PI; arriere.position.z = -0.03; g.add(arriere);
    var bord = AV.maille(new THREE.BoxGeometry(l + 0.1, h + 0.1, 0.05), '#8a6a45'); g.add(bord);
    return g;
  }

  function pereNoelEte() {
    var g = new THREE.Group();
    var corps = AV.maille(new THREE.CylinderGeometry(0.38, 0.45, 0.8, 8), '#d94a4a'); corps.position.y = 1.35; g.add(corps);
    var ceinture = AV.maille(new THREE.CylinderGeometry(0.43, 0.43, 0.1, 8), '#2b2340'); ceinture.position.y = 1.2; g.add(ceinture);
    var tete = AV.maille(new THREE.IcosahedronGeometry(0.27, 1), '#f2c9a0'); tete.position.y = 2.0; g.add(tete);
    var barbe = AV.maille(new THREE.ConeGeometry(0.26, 0.5, 7), '#ffffff'); barbe.rotation.x = Math.PI; barbe.position.set(0, 1.78, 0.12); g.add(barbe);
    var bonnet = AV.bonnetNoel(1.9); bonnet.position.y = 2.18; g.add(bonnet);
    var lunettes = AV.maille(new THREE.BoxGeometry(0.42, 0.09, 0.05), '#111111', false); lunettes.position.set(0, 2.05, 0.25); g.add(lunettes);
    var bras = new THREE.Group(); bras.position.set(0.42, 1.6, 0); g.add(bras);
    var b = AV.maille(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 5), '#d94a4a'); b.position.y = 0.27; bras.add(b);
    var m = AV.maille(new THREE.IcosahedronGeometry(0.09, 0), '#ffffff'); m.position.y = 0.58; bras.add(m);
    g.userData.bras = bras;
    return g;
  }

  AV.biomes.hub = function (etats) {
    var rng = AV.rng(2512);
    var ciel = { haut: '#2f8fe0', bas: '#c4e8ff', brouillard: '#cdeaff', hemi: ['#ffffff', '#c9a878', 0.68], soleil: ['#fff1d0', 0.85, [-25, 45, -55]] };
    var H = function (x, z) {
      var d = Math.sqrt(x * x + z * z), h = ondul(x, z, 0.12, 0.25);
      if (d > 26) {
        var k = d - 26, t = lisse(-0.15, -0.55, z / d);
        h += (1 - t) * (Math.pow(k, 1.3) * 0.3 + ondul(x, z, 0.6, 0.2) * lisse(26, 32, d)) - t * k * 0.22;
      }
      return h;
    };
    var m = new Monde({
      rayon: 33, hauteur: H, surface: 'sable', depart: { x: 0, z: 15, angle: Math.PI }, theme: 'hub', ambiance: 'vagues',
      brouillard: [40, 160], autorise: function (x, z) { return H(x, z) > -0.6; }
    });
    m.meteo = '☀️ 34 °C à Perth';
    m.cielEtLumieres(ciel);
    m.groupe.add(AV.terrain(140, 90, H, function (x, z, y) {
      var d = Math.sqrt(x * x + z * z);
      if (y < -0.3) return varier('#d2b47e', x, z, 0.08);
      if (y > 1.2) return varier('#a9b86c', x, z, 0.12);
      if (Math.abs(d - 22) < 1.7) return varier('#e6cfa2', x, z, 0.1);
      if (Math.abs(x) < 1.4 && z > 4 && z < 21) return varier('#e6cfa2', x, z, 0.1);
      return varier('#f3dba8', x, z, 0.07);
    }));
    var eau = AV.eau(220, 95, 44, 19, '#2fb3c9', 0.85);
    eau.position.set(0, -0.45, -75); m.groupe.add(eau);
    m.anime(function (dt, t) { eau.userData.maj(dt, t); });

    // Le soleil, en bonnet de Père Noël et lunettes de soleil
    var soleilG = new THREE.Group(); soleilG.position.set(-70, 85, -320); soleilG.lookAt(0, 0, 0); m.groupe.add(soleilG);
    var bas = function (c) { return new THREE.MeshBasicMaterial({ color: c, fog: false, side: THREE.DoubleSide }); };
    soleilG.add(new THREE.Mesh(new THREE.SphereGeometry(20, 20, 14), bas('#ffe27a')));
    var hS = AV.halo('#fff0a0', 120); hS.material.fog = false; hS.material.opacity = 0.45; soleilG.add(hS);
    var chap = new THREE.Group(); chap.position.y = 12; chap.rotation.z = -0.35; soleilG.add(chap);
    var cc = new THREE.Mesh(new THREE.ConeGeometry(17, 28, 12), bas('#e23b3b')); cc.position.y = 16; chap.add(cc);
    var cr = new THREE.Mesh(new THREE.TorusGeometry(17, 3.5, 8, 20), bas('#ffffff')); cr.rotation.x = Math.PI / 2; cr.position.y = 2; chap.add(cr);
    var cp = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), bas('#ffffff')); cp.position.y = 31; chap.add(cp);
    [-1, 1].forEach(function (s) { var v = new THREE.Mesh(new THREE.CircleGeometry(6, 16), bas('#1b1b22')); v.position.set(s * 7.5, 2, 20.3); soleilG.add(v); });
    var pont = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.5), bas('#1b1b22')); pont.position.set(0, 3, 20.3); soleilG.add(pont);
    var sourire = new THREE.Mesh(new THREE.TorusGeometry(7, 1, 6, 16, Math.PI), bas('#c0612a')); sourire.rotation.z = Math.PI; sourire.position.set(0, -4, 20.2); soleilG.add(sourire);

    // Sapin central... sur le sable
    var sapin = AV.deco.sapin(rng, 3, false);
    var cols = ['#ff5a5a', '#ffd24a', '#5ab0ff', '#ff8af0', '#ffffff'];
    for (var i = 0; i < 46; i++) {
      var couche = Math.floor(rng() * 3), rad = (1.3 - couche * 0.32) * 3, h = (1.4 - couche * 0.2) * 3, cy = (1.1 + couche * 0.75) * 3;
      var tt = AV.entre(rng, 0.15, 0.85), a = rng() * Math.PI * 2;
      var bo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), AV.matBrillant(cols[i % cols.length], 0.7));
      bo.position.set(Math.cos(a) * rad * (1 - tt) * 1.02, cy - h / 2 + tt * h, Math.sin(a) * rad * (1 - tt) * 1.02);
      sapin.add(bo);
    }
    var etoile = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), AV.matBrillant('#ffd24a', 1));
    etoile.position.y = 9.7; sapin.add(etoile);
    m.ajouter(sapin, 0, 0, 0, { collision: false, bloque: true });
    m.colliders.push({ x: 0, z: 0, r: 3.6 });
    m.anime(function (dt) { etoile.rotation.y += dt; });
    for (var k = 0; k < 7; k++) {
      var ca = new THREE.Group(), coul = AV.choisir(rng, ['#d94a4a', '#3f8f6b', '#3f6fd1', '#f3c34b', '#c39bff']);
      var tl = AV.entre(rng, 0.6, 1);
      var boite = AV.maille(new THREE.BoxGeometry(tl, tl * 0.8, tl), coul); boite.position.y = tl * 0.4; ca.add(boite);
      var ru = AV.maille(new THREE.BoxGeometry(tl * 1.02, tl * 0.82, 0.12), '#ffffff'); ru.position.y = tl * 0.4; ca.add(ru);
      var a2 = k / 7 * Math.PI * 2 + 0.3;
      m.ajouter(ca, Math.sin(a2) * 3.9, Math.cos(a2) * 3.9, rng() * 3, { collision: false });
    }
    // planches de surf plantées autour du sapin
    [['#ff8a3a', -4.6, 2.2], ['#5ab0ff', -4.9, 1.0], ['#ff5ab4', 4.7, -1.8]].forEach(function (p) {
      var s = AV.maille(new THREE.IcosahedronGeometry(1, 1), p[0]); s.scale.set(0.32, 1.25, 0.06);
      var gs = new THREE.Group(); s.position.y = 1.05; gs.add(s);
      var bande = AV.maille(new THREE.BoxGeometry(0.05, 2.2, 0.07), '#ffffff', false); bande.position.y = 1.05; gs.add(bande);
      gs.rotation.z = 0.12; gs.userData.rayon = 0.35;
      m.ajouter(gs, p[1], p[2], Math.atan2(p[1], p[2]));
    });

    // Portails (identiques au village enneigé)
    m.portails = [];
    for (var j = 0; j < 24; j++) {
      var ang = (j + 0.5) / 24 * Math.PI * 2;
      var px = Math.sin(ang) * 22, pz = Math.cos(ang) * 22;
      var p = m.portail(px, pz, ang, '#9fd8ff');
      var gemMat = new THREE.MeshLambertMaterial({ color: '#9fd8ff', emissive: '#9fd8ff', emissiveIntensity: 0.6 });
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat); gem.position.y = 4.05; p.add(gem);
      var num = AV.texteSprite(String(j + 1), { fond: 'rgba(27,35,64,.85)', largeur: 1.6 }); num.position.y = 4.9; p.add(num);
      var cadenas = AV.texteSprite('🔒', { largeur: 2.2 }); cadenas.position.y = 1.4; p.add(cadenas);
      var coche = AV.texteSprite('✔', { couleur: '#ffd24a', contour: '#7a5a00', largeur: 2.4 }); coche.position.y = 1.5; p.add(coche);
      var faisceau = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      faisceau.position.y = 20; p.add(faisceau);
      var info = { type: 'portail', jour: j + 1, x: px, z: pz, rayon: 2.4, objet: p, gem: gem, cadenas: cadenas, coche: coche, faisceau: faisceau };
      m.portails.push(info); m.interactifs.push(info); m.reserver(px, pz, 2.6);
    }
    m.appliquerEtats = function (etats) {
      m.portails.forEach(function (p) {
        var e = etats[p.jour - 1] || 'verrouille', v = p.objet.userData.voile.material;
        p.etat = e;
        var c = e === 'verrouille' ? '#7d8296' : e === 'fait' ? '#ffd24a' : e === 'aujourdhui' ? '#ffb347' : '#9fd8ff';
        v.color.set(c); v.opacity = e === 'verrouille' ? 0.22 : 0.55;
        p.gem.material.color.set(c); p.gem.material.emissive.set(c);
        p.cadenas.visible = e === 'verrouille'; p.coche.visible = e === 'fait'; p.faisceau.visible = e === 'aujourdhui';
      });
    };
    m.appliquerEtats(etats || []);
    m.anime(function (dt, t) {
      m.portails.forEach(function (p, i) {
        p.gem.rotation.y += dt * 1.5;
        p.gem.position.y = 4.05 + Math.sin(t * 2 + i) * 0.08;
        if (p.etat !== 'verrouille') p.objet.userData.voile.material.opacity = 0.5 + Math.sin(t * 2 + i * 0.7) * 0.12;
        if (p.etat === 'aujourdhui') p.faisceau.material.opacity = 0.16 + Math.sin(t * 3) * 0.08;
      });
    });

    // Guirlandes : palmiers illuminés + maisons au toit de tôle
    var pts = [];
    for (var l = 0; l < 12; l++) {
      var al = (l + 0.5) / 12 * Math.PI * 2, lx = Math.sin(al) * 17.5, lz = Math.cos(al) * 17.5;
      m.ajouter(palmier(rng, AV.entre(rng, 0.95, 1.15)), lx, lz, rng() * 6, { bloque: true });
      var y0 = H(lx, lz);
      for (var q = 0; q < 34; q++) { var tq = q / 34; pts.push([lx + Math.cos(tq * 20) * 0.3 + tq * 0.3, y0 + 0.3 + tq * 3.8, lz + Math.sin(tq * 20) * 0.3]); }
    }
    for (var hm = 0; hm < 10; hm++) {
      var ah = (hm + 0.5) / 10 * Math.PI * 2;
      if (Math.cos(ah) < -0.3) continue; // côté océan
      if (Math.abs(Math.sin(ah)) < 0.2 && Math.cos(ah) > 0) continue; // allée d'arrivée
      var hx = Math.sin(ah) * 29.5, hz = Math.cos(ah) * 29.5, rot = ah + Math.PI, sc = AV.entre(rng, 0.95, 1.1);
      m.ajouter(AV.deco.maison(rng, sc, AV.choisir(rng, ['#fff2d6', '#d9f0ec', '#ffe0e0', '#e6f0ff']), '#9aa5b1', false), hx, hz, rot, { bloque: true });
      var L = 3.2 * sc * 0.82, hy = H(hx, hz) + 2.4 * sc + 0.05;
      for (var e = 0; e < 40; e++) {
        var u = e / 40 * 4, lxx, lzz;
        if (u < 1) { lxx = -L + u * 2 * L; lzz = L; } else if (u < 2) { lxx = L; lzz = L - (u - 1) * 2 * L; }
        else if (u < 3) { lxx = L - (u - 2) * 2 * L; lzz = -L; } else { lxx = -L; lzz = -L + (u - 3) * 2 * L; }
        pts.push([hx + lxx * Math.cos(rot) + lzz * Math.sin(rot), hy, hz - lxx * Math.sin(rot) + lzz * Math.cos(rot)]);
      }
    }
    var guir = guirlande(pts, ['#ff5a5a', '#ffd24a', '#5ab0ff', '#7dff9a', '#ff8af0']);
    guir.material.size = 0.35; m.groupe.add(guir);
    m.semer(rng, 25, function (r) { return r() < 0.5 ? palmier(r, AV.entre(r, 1, 1.4)) : AV.deco.arbre(r, AV.entre(r, 1.1, 1.6), '#8aa88f'); },
      { min: 31, max: 55, collision: false, marge: 2, filtre: function (x, z) { return z > -18; } });

    // Bannière d'accueil
    var ban = new THREE.Group();
    [-2.9, 2.9].forEach(function (x) { var po = AV.maille(new THREE.CylinderGeometry(0.1, 0.12, 4.2, 6), '#8a6a45'); po.position.set(x, 2.1, 0); ban.add(po); });
    var tissu = panneau('MERRY CHRISTMAS, MATE ! ☀️🎄', '#ffd24a', '#c0392b', 5.6, 0.9); tissu.position.y = 3.6; ban.add(tissu);
    m.ajouter(ban, 0, 10, 0, { collision: false });
    m.colliders.push({ x: -2.9, z: 10, r: 0.2 }, { x: 2.9, z: 10, r: 0.2 });

    // Panneau indicateur
    var pi = new THREE.Group();
    var mat = AV.maille(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6), '#8a6a45'); mat.position.y = 1.8; pi.add(mat);
    var p1 = panneau('❄️ France : 14 000 km', '#dff1ff', '#2b2340', 2.6, 0.5); p1.position.set(0.9, 3.1, 0); p1.rotation.y = 0.25; pi.add(p1);
    var p2 = panneau('☀️ Perth : tu y es !', '#ffe9b0', '#2b2340', 2.6, 0.5); p2.position.set(-0.9, 2.45, 0); p2.rotation.y = -0.3; pi.add(p2);
    var p3 = panneau('🌡️ 34 °C le 25/12', '#ffd0c0', '#c0392b', 2.2, 0.45); p3.position.set(0.7, 1.8, 0); p3.rotation.y = 0.1; pi.add(p3);
    pi.userData.rayon = 0.2;
    m.ajouter(pi, -6.2, 9.8, 0.5);

    // Bonhomme de neige qui fond…
    var fond = AV.deco.bonhomme(); fond.scale.set(1, 0.8, 1); fond.rotation.z = 0.22;
    m.ajouter(fond, 6.5, 15.5, -0.5);
    var flaque = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), new THREE.MeshPhongMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.7, shininess: 100 }));
    flaque.rotation.x = -Math.PI / 2; flaque.position.set(6.5, H(6.5, 15.5) + 0.04, 15.5); m.groupe.add(flaque);
    var chaud = AV.texteSprite('🥵', { largeur: 1.6 }); chaud.position.set(6.5, H(6.5, 15.5) + 2.9, 15.5); m.groupe.add(chaud);
    m.anime(function (dt, t) { fond.scale.y = 0.78 + Math.sin(t * 0.8) * 0.03; flaque.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05); chaud.position.y = H(6.5, 15.5) + 2.9 + Math.sin(t * 2) * 0.1; });
    // … et bonhomme de sable qui frime
    var bs = new THREE.Group(), sable = '#e8c98e';
    [[0.6, 0.55], [0.42, 1.35], [0.3, 1.95]].forEach(function (b) { var sp = AV.maille(new THREE.IcosahedronGeometry(b[0], 1), sable); sp.position.y = b[1]; bs.add(sp); });
    var bnt = AV.bonnetNoel(2.2); bnt.position.y = 2.15; bs.add(bnt);
    var lun = AV.maille(new THREE.BoxGeometry(0.5, 0.1, 0.05), '#111111', false); lun.position.set(0, 2.02, 0.27); bs.add(lun);
    var seau = AV.maille(new THREE.CylinderGeometry(0.25, 0.18, 0.35, 8), '#ff5ab4'); seau.position.set(0.8, 0.17, 0.3); bs.add(seau);
    bs.userData.rayon = 0.6;
    m.ajouter(bs, -6.5, 15.5, 0.5);

    // Canon à neige artificielle
    var canon = new THREE.Group();
    var cb = AV.maille(new THREE.BoxGeometry(0.9, 0.7, 0.9), '#e8e8ee'); cb.position.y = 0.45; canon.add(cb);
    var tube = AV.maille(new THREE.CylinderGeometry(0.18, 0.25, 1.1, 8), '#5a6b8a'); tube.position.set(0, 1.1, -0.2); tube.rotation.x = -0.6; canon.add(tube);
    var etiq = AV.texteSprite('neige artificielle 😅', { fond: 'rgba(255,255,255,.9)', couleur: '#2b2340', largeur: 2.4, echelle: 0.32 }); etiq.position.y = 2; canon.add(etiq);
    canon.userData.rayon = 0.6;
    m.ajouter(canon, 5.6, 3.4, Math.atan2(-5.6, -3.4) + Math.PI);
    var nN = 160, nP = new Float32Array(nN * 3), nV = [];
    for (var ni = 0; ni < nN; ni++) nV.push({ t: Math.random(), dx: (Math.random() - 0.5) * 0.6, dz: (Math.random() - 0.5) * 0.6, v: 0.8 + Math.random() * 0.4 });
    var nG = new THREE.BufferGeometry(); nG.setAttribute('position', new THREE.BufferAttribute(nP, 3));
    var flocons = new THREE.Points(nG, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, map: AV.textureRonde(), transparent: true, depthWrite: false }));
    flocons.frustumCulled = false; m.groupe.add(flocons);
    var buse = new THREE.Vector3(5.6, H(5.6, 3.4) + 1.6, 3.4), versSapin = new THREE.Vector3(-5.6, 0, -3.4).normalize();
    m.anime(function (dt) {
      for (var i = 0; i < nN; i++) {
        var f = nV[i]; f.t += dt * 0.5; if (f.t > 1) f.t -= 1;
        var tt = f.t * 2.4 * f.v;
        nP[i * 3] = buse.x + (versSapin.x * 2.2 + f.dx) * tt;
        nP[i * 3 + 1] = buse.y + 3.2 * tt - 2.2 * tt * tt;
        nP[i * 3 + 2] = buse.z + (versSapin.z * 2.2 + f.dz) * tt;
      }
      nG.attributes.position.needsUpdate = true;
    });

    // Barbecue (et glacière)
    var bbq = new THREE.Group();
    [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(function (p) { var pi2 = AV.maille(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4), '#2b2f3a'); pi2.position.set(p[0], 0.45, p[1]); bbq.add(pi2); });
    var cuve = AV.maille(new THREE.BoxGeometry(1.3, 0.3, 0.8), '#2b2f3a'); cuve.position.y = 0.95; bbq.add(cuve);
    var braise = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.65), AV.matBrillant('#ff6a2a', 0.8)); braise.position.y = 1.1; bbq.add(braise);
    for (var sg = 0; sg < 5; sg++) { var sau = AV.maille(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), '#9b4a2a'); sau.rotation.z = Math.PI / 2; sau.position.set(0, 1.17, -0.28 + sg * 0.14); bbq.add(sau); }
    var glac = AV.maille(new THREE.BoxGeometry(0.8, 0.5, 0.5), '#3f6fd1'); glac.position.set(1.2, 0.25, 0.1); bbq.add(glac);
    var couv = AV.maille(new THREE.BoxGeometry(0.84, 0.12, 0.54), '#ffffff'); couv.position.set(1.2, 0.56, 0.1); bbq.add(couv);
    bbq.userData.rect = { hx: 1.2, hz: 0.5 };
    var BX = -10.5, BZ = 3;
    m.ajouter(bbq, BX, BZ, 1.2);
    var fumees = [];
    for (var f = 0; f < 6; f++) { var fu = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshLambertMaterial({ color: '#dddddd', transparent: true, opacity: 0.5 })); m.groupe.add(fu); fumees.push(fu); }
    var by = H(BX, BZ) + 1.2;
    m.anime(function (dt, t) {
      fumees.forEach(function (s, i) {
        var k2 = (t * 0.3 + i / fumees.length) % 1;
        s.position.set(BX + Math.sin(t + i) * 0.2 + k2 * 0.8, by + k2 * 3, BZ - k2 * 0.4);
        s.scale.setScalar(0.5 + k2 * 1.5); s.material.opacity = 0.5 * (1 - k2);
      });
    });

    // Traîneau du Père Noël… tiré par des kangourous
    var tr = new THREE.Group(); m.groupe.add(tr);
    var caisse = AV.maille(new THREE.BoxGeometry(1.5, 0.7, 2.0), '#c0392b'); caisse.position.y = 0.75; tr.add(caisse);
    var dos = AV.maille(new THREE.BoxGeometry(1.5, 0.9, 0.2), '#c0392b'); dos.position.set(0, 1.3, -0.95); tr.add(dos);
    [-0.65, 0.65].forEach(function (x) {
      var pat = AV.maille(new THREE.BoxGeometry(0.08, 0.08, 2.6), '#f3c34b'); pat.position.set(x, 0.12, 0.15); tr.add(pat);
      var cr2 = AV.maille(new THREE.BoxGeometry(0.08, 0.5, 0.08), '#f3c34b'); cr2.position.set(x, 0.35, 1.4); tr.add(cr2);
    });
    var sac = AV.maille(new THREE.IcosahedronGeometry(0.5, 1), '#8a6a45'); sac.position.set(0, 1.25, -0.5); tr.add(sac);
    var pn = pereNoelEte(); pn.position.set(0, -0.15, 0.15); tr.add(pn);
    var kangs = [];
    [[-0.55, 2.6], [0.55, 2.6], [-0.55, 4.0], [0.55, 4.0]].forEach(function (p, i) {
      var kg = new AV.Animal('kangourou');
      kg.groupe.position.set(p[0], 0, p[1]); kg.m.groupe.scale.setScalar(0.85);
      var bk = AV.bonnetNoel(1); bk.position.set(0, 0.22, 0); kg.m.tete.add(bk);
      tr.add(kg.groupe); kangs.push(kg);
    });
    var rene = AV.maille(new THREE.BoxGeometry(1.2, 0.03, 3.2), '#6b4a32', false); rene.position.set(0, 0.9, 2.6); tr.add(rene);
    var Rt = 9;
    m.anime(function (dt, t) {
      var a = t * 0.16, x = Math.sin(a) * Rt, z = Math.cos(a) * Rt;
      tr.position.set(x, H(x, z), z); tr.rotation.y = a + Math.PI / 2;
      pn.userData.bras.rotation.z = -0.4 - Math.abs(Math.sin(t * 3)) * 1.2;
      kangs.forEach(function (kg, i) {
        var s = Math.abs(Math.sin(t * 6 + i * 1.3));
        kg.groupe.position.y = s * 0.45;
        kg.m.corps.rotation.x = 0.25 - s * 0.3;
        kg.m.queue.rotation.x = s * 0.4;
      });
    });

    // Quokkas en bonnet qui se baladent (et sourient)
    var quokkas = [];
    for (var qk = 0; qk < 4; qk++) {
      var qa = new AV.Animal('quokka');
      var bq = AV.bonnetNoel(0.9); bq.position.set(0, 0.2, 0); qa.m.tete.add(bq);
      var aq = qk / 4 * Math.PI * 2 + 0.8, rq = 13 + qk;
      var o = { a: qa, x: Math.sin(aq) * rq, z: Math.cos(aq) * rq, cap: rng() * 6, minuteur: 0, bouge: false };
      qa.placer(o.x, H(o.x, o.z), o.z, o.cap);
      m.groupe.add(qa.groupe);
      quokkas.push(o);
    }
    m.anime(function (dt, t, centre) {
      quokkas.forEach(function (o) {
        o.minuteur -= dt;
        if (o.minuteur <= 0) { o.minuteur = 1.5 + Math.random() * 3; o.bouge = Math.random() < 0.6; o.cap += (Math.random() - 0.5) * 2.5; }
        var d = Math.sqrt(o.x * o.x + o.z * o.z);
        if (d < 11 || d > 19.5) o.cap = Math.atan2(-o.x, -o.z) + (d < 11 ? Math.PI : 0);
        var dj = centre ? Math.sqrt((centre.x - o.x) * (centre.x - o.x) + (centre.z - o.z) * (centre.z - o.z)) : 99;
        if (o.bouge && dj > 3) { o.x += Math.sin(o.cap) * 1.3 * dt; o.z += Math.cos(o.cap) * 1.3 * dt; }
        o.a.base.set(o.x, H(o.x, o.z) + (o.bouge && dj > 3 ? Math.abs(Math.sin(t * 9)) * 0.18 : 0), o.z);
        o.a.groupe.position.x = o.x; o.a.groupe.position.z = o.z;
        o.a.cible = o.cap;
        o.a.etat = dj < 4 ? 'alerte' : 'repos';
        if (centre) o.a.maj(dt, t, centre, null);
      });
    });

    // Mouettes
    for (var g2 = 0; g2 < 4; g2++) {
      (function (i) {
        var mo = mouette(); m.groupe.add(mo);
        var r = 18 + i * 5, v = 0.2 + i * 0.05, hh = 11 + i * 1.5;
        m.anime(function (dt, t) {
          var a = t * v + i * 1.7;
          mo.position.set(Math.cos(a) * r, hh + Math.sin(t + i) * 0.8, -15 + Math.sin(a) * r * 0.5);
          mo.rotation.y = -a;
          var fl = Math.sin(t * 8 + i) * 0.5; mo.userData.ailes[0].rotation.z = fl; mo.userData.ailes[1].rotation.z = -fl;
        });
      })(g2);
    }

    // Le joueur transpire dans son bonnet et son écharpe 💦
    var gouttes = [], prochaine = 2;
    m.anime(function (dt, t, centre) {
      if (!centre) return;
      prochaine -= dt;
      if (prochaine <= 0) {
        prochaine = 2.5 + Math.random() * 2;
        var gt = AV.texteSprite('💦', { largeur: 0.9 });
        gt.position.set(centre.x + 0.4, centre.y + 2.1, centre.z); gt.userData.vie = 1.2;
        m.groupe.add(gt); gouttes.push(gt);
      }
      for (var i = gouttes.length - 1; i >= 0; i--) {
        var gg = gouttes[i]; gg.userData.vie -= dt;
        gg.position.y -= dt * 0.5; gg.material.opacity = Math.min(1, gg.userData.vie * 2);
        if (gg.userData.vie <= 0) { m.groupe.remove(gg); gg.material.map.dispose(); gg.material.dispose(); gouttes.splice(i, 1); }
      }
    });
    return m;
  };

  // outils partagés avec les biomes définis dans d'autres fichiers (js/biome-*.js)
  AV.Monde = Monde;
  AV.outils = { panneau: panneau, coneRaye: coneRaye, varier: varier, lisse: lisse, guirlande: guirlande, guirlandeEntre: guirlandeEntre };

  // Point d'entrée
  AV.creerMonde = function (cfg) {
    var f = AV.biomes[cfg.biome];
    var m = (f && cfg.biome !== 'hub') ? f(cfg) : generique(cfg);
    if (!m.cachettes.length) m.cachettes.push({ x: 8, z: -8, y: 0 });
    return m;
  };
})(window.AV);
