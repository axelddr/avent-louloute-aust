/* Outils communs : aléatoire, matériaux, géométrie low-poly, décor réutilisable */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  // ---------- Aléatoire reproductible ----------
  AV.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  AV.entre = function (r, a, b) { return a + r() * (b - a); };
  AV.choisir = function (r, liste) { return liste[Math.floor(r() * liste.length)]; };
  AV.lerp = function (a, b, t) { return a + (b - a) * t; };
  AV.angleLerp = function (a, b, t) {
    var d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  };

  // ---------- Matériaux (en cache, jamais détruits) ----------
  var cache = {};
  AV.mat = function (couleur, opts) {
    var cle = couleur + '|' + (opts ? JSON.stringify(opts) : '');
    if (!cache[cle]) {
      var o = Object.assign({ color: couleur }, opts || {});
      var m = new THREE.MeshLambertMaterial(o);
      m.userData.cache = true;
      cache[cle] = m;
    }
    return cache[cle];
  };
  AV.matBrillant = function (couleur, intensite) {
    return AV.mat(couleur, { emissive: couleur, emissiveIntensity: intensite == null ? 1 : intensite });
  };
  AV.matBasique = function (couleur, opts) {
    var cle = 'B' + couleur + '|' + (opts ? JSON.stringify(opts) : '');
    if (!cache[cle]) {
      var m = new THREE.MeshBasicMaterial(Object.assign({ color: couleur }, opts || {}));
      m.userData.cache = true;
      cache[cle] = m;
    }
    return cache[cle];
  };

  // Normales par face : rendu « facettes » low-poly
  AV.facettes = function (geo) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    return g;
  };

  AV.maille = function (geo, couleur, ombre) {
    var m = new THREE.Mesh(AV.facettes(geo), typeof couleur === 'string' ? AV.mat(couleur) : couleur);
    m.castShadow = ombre !== false;
    m.receiveShadow = true;
    return m;
  };

  AV.detruire = function (obj) {
    obj.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function (m) {
          if (m.userData && m.userData.cache) return;
          if (m.map && !m.map.__partage) m.map.dispose();
          m.dispose();
        });
      }
    });
  };

  // ---------- Textures ----------
  AV.texteSprite = function (texte, opts) {
    opts = opts || {};
    var taille = opts.taille || 128;
    var c = document.createElement('canvas');
    c.width = taille * 2; c.height = taille;
    var x = c.getContext('2d');
    if (opts.fond) {
      x.fillStyle = opts.fond;
      var r = taille * 0.35;
      x.beginPath();
      x.moveTo(r, 4); x.lineTo(c.width - r, 4); x.quadraticCurveTo(c.width - 4, 4, c.width - 4, r);
      x.lineTo(c.width - 4, c.height - r); x.quadraticCurveTo(c.width - 4, c.height - 4, c.width - r, c.height - 4);
      x.lineTo(r, c.height - 4); x.quadraticCurveTo(4, c.height - 4, 4, c.height - r);
      x.lineTo(4, r); x.quadraticCurveTo(4, 4, r, 4); x.fill();
    }
    x.font = '900 ' + Math.round(taille * (opts.echelle || 0.62)) + 'px Nunito, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (opts.contour) { x.lineWidth = taille * 0.08; x.strokeStyle = opts.contour; x.strokeText(texte, c.width / 2, c.height / 2 + 4); }
    x.fillStyle = opts.couleur || '#fff';
    x.fillText(texte, c.width / 2, c.height / 2 + 4);
    var tex = new THREE.CanvasTexture(c);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    var l = opts.largeur || 2;
    s.scale.set(l, l / 2, 1);
    return s;
  };

  // Bulle de BD de dialogue : taille FIXE à l'écran (indépendante de la distance), retour à la ligne auto
  AV.bulleBD = function (texte, opts) {
    opts = opts || {};
    var F = '800 34px Nunito, sans-serif', LH = 42, PAD = 26, MAXW = 400, H0 = 16;
    var c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = F;
    var mots = String(texte).split(' '), lignes = [], cour = '';
    mots.forEach(function (m) {
      var essai = cour ? cour + ' ' + m : m;
      if (cour && x.measureText(essai).width > MAXW) { lignes.push(cour); cour = m; } else cour = essai;
    });
    if (cour) lignes.push(cour);
    var lw = 0; lignes.forEach(function (l) { lw = Math.max(lw, x.measureText(l).width); });
    var w = Math.ceil(lw) + PAD * 2, H = lignes.length * LH + 22;
    c.width = w; c.height = H + H0 + 4;
    x = c.getContext('2d'); x.font = F;
    x.fillStyle = opts.fond || 'rgba(255,255,255,.95)'; x.strokeStyle = 'rgba(43,35,64,.18)'; x.lineWidth = 3;
    var r = Math.min(26, H / 2 - 2);
    x.beginPath(); x.moveTo(r, 2); x.lineTo(w - r, 2); x.quadraticCurveTo(w - 2, 2, w - 2, r); x.lineTo(w - 2, H - r); x.quadraticCurveTo(w - 2, H, w - r, H);
    x.lineTo(w / 2 + 12, H); x.lineTo(w / 2, H + H0); x.lineTo(w / 2 - 12, H); x.lineTo(r, H); x.quadraticCurveTo(2, H, 2, H - r); x.lineTo(2, r); x.quadraticCurveTo(2, 2, r, 2);
    x.fill(); x.stroke();
    x.fillStyle = opts.couleur || '#2b2340'; x.textAlign = 'center'; x.textBaseline = 'middle';
    lignes.forEach(function (l, i) { x.fillText(l, w / 2, 11 + LH * (i + 0.5) + 2); });
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false, fog: false, sizeAttenuation: false }));
    var k = 0.0007 * (opts.echelle || 1); s.scale.set(c.width * k, c.height * k, 1);
    s.center.set(0.5, 0); // la pointe de la bulle est posée sur la position
    s.renderOrder = 10;
    return s;
  };

  AV.textureRonde = (function () {
    var t = null;
    return function () {
      if (t) return t;
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      t = new THREE.CanvasTexture(c);
      t.__partage = true;
      return t;
    };
  })();

  AV.halo = function (couleur, taille) {
    var m = new THREE.SpriteMaterial({ map: AV.textureRonde(), color: couleur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
    m.userData.cache = false;
    var s = new THREE.Sprite(m);
    s.scale.set(taille, taille, 1);
    return s;
  };

  // ---------- Ciel dégradé ----------
  AV.ciel = function (haut, bas) {
    var mat = new THREE.ShaderMaterial({
      uniforms: { haut: { value: new THREE.Color(haut) }, bas: { value: new THREE.Color(bas) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 haut; uniform vec3 bas; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(bas, haut, pow(h, 0.7)), 1.0); }',
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    var m = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), mat);
    m.renderOrder = -10;
    m.frustumCulled = false;
    return m;
  };

  AV.etoiles = function (n, r) {
    var rng = AV.rng(7);
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var th = rng() * Math.PI * 2, ph = Math.acos(AV.entre(rng, 0.08, 1));
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  };

  // ---------- Neige / particules ----------
  AV.chuteNeige = function (n, zone, hauteur) {
    var pos = new Float32Array(n * 3);
    var vit = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * zone;
      pos[i * 3 + 1] = Math.random() * hauteur;
      pos[i * 3 + 2] = (Math.random() - 0.5) * zone;
      vit[i] = 0.6 + Math.random() * 0.9;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.18, map: AV.textureRonde(), transparent: true, depthWrite: false, opacity: 0.9 }));
    p.frustumCulled = false;
    p.userData.maj = function (dt, t, centre) {
      var a = g.attributes.position.array;
      for (var i = 0; i < n; i++) {
        a[i * 3 + 1] -= vit[i] * dt;
        a[i * 3] += Math.sin(t * 0.7 + i) * 0.3 * dt;
        if (a[i * 3 + 1] < -1) a[i * 3 + 1] = hauteur;
      }
      g.attributes.position.needsUpdate = true;
      if (centre) { p.position.x = centre.x; p.position.z = centre.z; }
    };
    return p;
  };

  // ---------- Terrain ----------
  // hauteur(x,z) -> y ; couleur(x,z,y) -> '#hex'
  AV.terrain = function (taille, segments, hauteur, couleur) {
    var geo = new THREE.PlaneGeometry(taille, taille, segments, segments);
    geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) p.setY(i, hauteur(p.getX(i), p.getZ(i)));
    var g = geo.toNonIndexed();
    g.computeVertexNormals();
    var pa = g.attributes.position;
    var cols = new Float32Array(pa.count * 3);
    var c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var cx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3;
      var cy = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3;
      var cz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.set(couleur(cx, cz, cy));
      for (var k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    return m;
  };

  // Eau animée low-poly
  AV.eau = function (largeur, profondeur, segX, segZ, couleur, opacite) {
    var geo = new THREE.PlaneGeometry(largeur, profondeur, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    var g = geo.toNonIndexed();
    var base = g.attributes.position.array.slice();
    var m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: couleur, transparent: true, opacity: opacite || 0.85, flatShading: true, shininess: 80, specular: '#ffffff' }));
    m.receiveShadow = true;
    var t0 = 0;
    m.userData.maj = function (dt, t) {
      t0 += dt;
      if (t0 < 1 / 30) return; // 30 i/s suffisent
      t0 = 0;
      var a = g.attributes.position.array;
      for (var i = 0; i < a.length; i += 3) {
        var x = base[i], z = base[i + 2];
        a[i + 1] = Math.sin(x * 0.35 + t * 1.3) * 0.12 + Math.cos(z * 0.4 + t * 1.1) * 0.12;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    };
    return m;
  };

  // ---------- Fusion de géométries : beaucoup d'objets fixes → une seule maille (couleurs par sommet) ----------
  AV.Fusion = function () { this.pos = []; this.nor = []; this.col = []; };
  AV.Fusion.prototype.ajouter = function (obj, matrice) {
    obj.updateMatrixWorld(true);
    var self = this, M = new THREE.Matrix4(), N = new THREE.Matrix3(), v = new THREE.Vector3();
    obj.traverse(function (o) {
      if (!o.isMesh) return;
      M.multiplyMatrices(matrice || new THREE.Matrix4(), o.matrixWorld);
      N.getNormalMatrix(M);
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      var p = g.attributes.position, n = g.attributes.normal, c = o.material.color;
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(M); self.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(N).normalize(); self.nor.push(v.x, v.y, v.z);
        self.col.push(c.r, c.g, c.b);
      }
    });
  };
  AV.Fusion.prototype.geometrie = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  };
  AV.Fusion.prototype.maille = function (mat) {
    return new THREE.Mesh(this.geometrie(), mat || new THREE.MeshLambertMaterial({ vertexColors: true }));
  };
  AV.matrice = function (x, y, z, rot, echelle) {
    var s = echelle || 1;
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot || 0), new THREE.Vector3(s, s, s));
  };

  // ---------- Décor ----------
  AV.deco = {};

  AV.deco.sapin = function (r, s, enneige) {
    var g = new THREE.Group();
    s = s || 1;
    var tronc = AV.maille(new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 0.9 * s, 6), '#6b4a32');
    tronc.position.y = 0.45 * s; g.add(tronc);
    var vert = AV.choisir(r, ['#2f6b4f', '#2a5e46', '#367a58']);
    for (var i = 0; i < 3; i++) {
      var rad = (1.3 - i * 0.32) * s, h = (1.4 - i * 0.2) * s;
      var c = AV.maille(new THREE.ConeGeometry(rad, h, 7), vert);
      c.position.y = (1.1 + i * 0.75) * s;
      c.rotation.y = r() * 3;
      g.add(c);
      if (enneige) {
        var n = AV.maille(new THREE.ConeGeometry(rad * 0.62, h * 0.42, 7), '#f4f8ff', false);
        n.position.y = c.position.y + h * 0.3;
        n.rotation.y = c.rotation.y;
        g.add(n);
      }
    }
    g.userData.rayon = 0.45 * s;
    return g;
  };

  AV.deco.arbre = function (r, s, couleur) {
    var g = new THREE.Group();
    s = s || 1;
    var tronc = AV.maille(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.4 * s, 6), '#7a5338');
    tronc.position.y = 0.7 * s; g.add(tronc);
    var col = couleur || AV.choisir(r, ['#5fa35a', '#4f9150', '#76b35e']);
    var n = 2 + Math.floor(r() * 2);
    for (var i = 0; i < n; i++) {
      var b = AV.maille(new THREE.IcosahedronGeometry((0.8 + r() * 0.4) * s, 0), col);
      b.position.set((r() - 0.5) * 0.8 * s, (1.8 + r() * 0.6) * s, (r() - 0.5) * 0.8 * s);
      b.rotation.set(r() * 3, r() * 3, 0);
      g.add(b);
    }
    g.userData.rayon = 0.4 * s;
    return g;
  };

  AV.deco.rocher = function (r, s, couleur, neige) {
    var g = new THREE.Group();
    s = s || 1;
    var m = AV.maille(new THREE.DodecahedronGeometry(1, 0), couleur || AV.choisir(r, ['#8a8f98', '#7d838c', '#959aa2']));
    m.scale.set(s * AV.entre(r, 0.9, 1.4), s * AV.entre(r, 0.6, 1), s * AV.entre(r, 0.9, 1.3));
    m.rotation.set(r(), r() * 3, r());
    m.position.y = s * 0.3;
    g.add(m);
    if (neige) {
      var n = AV.maille(new THREE.DodecahedronGeometry(1, 0), '#f4f8ff', false);
      n.scale.set(m.scale.x * 0.8, m.scale.y * 0.35, m.scale.z * 0.8);
      n.position.y = m.position.y + m.scale.y * 0.65;
      n.rotation.y = m.rotation.y;
      g.add(n);
    }
    g.userData.rayon = s * 1.1;
    return g;
  };

  AV.deco.buisson = function (r, s, couleur) {
    var g = new THREE.Group();
    s = s || 1;
    for (var i = 0; i < 3; i++) {
      var b = AV.maille(new THREE.IcosahedronGeometry(0.5 * s * AV.entre(r, 0.7, 1.1), 0), couleur || '#4f9150');
      b.position.set((i - 1) * 0.45 * s, 0.35 * s, (r() - 0.5) * 0.3 * s);
      g.add(b);
    }
    g.userData.rayon = 0.7 * s;
    return g;
  };

  AV.deco.fleur = function (r) {
    var g = new THREE.Group();
    var tige = AV.maille(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), '#4f9150', false);
    tige.position.y = 0.17; g.add(tige);
    var t = AV.maille(new THREE.IcosahedronGeometry(0.09, 0), AV.choisir(r, ['#ff8fa3', '#ffd166', '#ffffff', '#c39bff', '#ff6b6b']), false);
    t.position.y = 0.37; g.add(t);
    return g;
  };

  AV.deco.maison = function (r, s, couleurMur, couleurToit, enneige) {
    var g = new THREE.Group();
    s = s || 1;
    var l = 3.2 * s, p = 2.8 * s, h = 2.4 * s;
    var mur = AV.maille(new THREE.BoxGeometry(l, h, p), couleurMur || AV.choisir(r, ['#f2e2c4', '#e8c9a0', '#f5d6d0', '#d8e4ef']));
    mur.position.y = h / 2; g.add(mur);
    var toit = AV.maille(new THREE.ConeGeometry(Math.max(l, p) * 0.82, 1.7 * s, 4), couleurToit || AV.choisir(r, ['#b5483f', '#7a4a3a', '#5a6b8a']));
    toit.position.y = h + 0.85 * s; toit.rotation.y = Math.PI / 4; g.add(toit);
    if (enneige) {
      var n = AV.maille(new THREE.ConeGeometry(Math.max(l, p) * 0.6, 0.9 * s, 4), '#f4f8ff', false);
      n.position.y = h + 1.25 * s; n.rotation.y = Math.PI / 4; g.add(n);
    }
    var porte = AV.maille(new THREE.BoxGeometry(0.7 * s, 1.2 * s, 0.1), '#6b4a32', false);
    porte.position.set(0, 0.6 * s, p / 2 + 0.02); g.add(porte);
    var fen = AV.matBrillant('#ffd27a', 0.9);
    [-1, 1].forEach(function (c) {
      var f = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.55 * s, 0.08), fen);
      f.position.set(c * l * 0.3, h * 0.6, p / 2 + 0.03); g.add(f);
    });
    var chem = AV.maille(new THREE.BoxGeometry(0.4 * s, 1 * s, 0.4 * s), '#8a5a44');
    chem.position.set(l * 0.25, h + 1.1 * s, -p * 0.15); g.add(chem);
    g.userData.rect = { hx: l / 2 + 0.1, hz: p / 2 + 0.1 };
    return g;
  };

  AV.deco.lampadaire = function (couleur) {
    var g = new THREE.Group();
    var pied = AV.maille(new THREE.CylinderGeometry(0.07, 0.1, 3, 6), '#2b2f3a');
    pied.position.y = 1.5; g.add(pied);
    var bras = AV.maille(new THREE.BoxGeometry(0.06, 0.06, 0.5), '#2b2f3a');
    bras.position.set(0, 2.95, 0.22); g.add(bras);
    var lampe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), AV.matBrillant(couleur || '#ffd98a', 1));
    lampe.position.set(0, 2.8, 0.45); g.add(lampe);
    var h = AV.halo(couleur || '#ffd98a', 1.5);
    h.material.opacity = 0.45;
    h.position.copy(lampe.position); g.add(h);
    g.userData.rayon = 0.2;
    g.userData.lampe = lampe.position;
    return g;
  };

  AV.deco.bonhomme = function () {
    var g = new THREE.Group();
    var b = '#f6f9ff';
    var s1 = AV.maille(new THREE.IcosahedronGeometry(0.6, 1), b); s1.position.y = 0.55; g.add(s1);
    var s2 = AV.maille(new THREE.IcosahedronGeometry(0.42, 1), b); s2.position.y = 1.35; g.add(s2);
    var s3 = AV.maille(new THREE.IcosahedronGeometry(0.3, 1), b); s3.position.y = 1.95; g.add(s3);
    var nez = AV.maille(new THREE.ConeGeometry(0.06, 0.3, 5), '#f08a24'); nez.rotation.x = Math.PI / 2; nez.position.set(0, 1.95, 0.4); g.add(nez);
    [-0.1, 0.1].forEach(function (x) { var o = AV.maille(new THREE.SphereGeometry(0.04, 5, 4), '#222'); o.position.set(x, 2.05, 0.26); g.add(o); });
    var ch = AV.maille(new THREE.CylinderGeometry(0.22, 0.24, 0.32, 8), '#2b2f3a'); ch.position.y = 2.3; g.add(ch);
    var bord = AV.maille(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 8), '#2b2f3a'); bord.position.y = 2.15; g.add(bord);
    var ech = AV.maille(new THREE.TorusGeometry(0.36, 0.08, 5, 10), '#d94a4a'); ech.rotation.x = Math.PI / 2; ech.position.y = 1.68; g.add(ech);
    g.userData.rayon = 0.6;
    return g;
  };

  AV.deco.tronc = function (r, l) {
    var g = new THREE.Group();
    var t = AV.maille(new THREE.CylinderGeometry(0.35, 0.4, l || 3, 7), '#6b4a32');
    t.rotation.z = Math.PI / 2; t.position.y = 0.35; g.add(t);
    var n = AV.maille(new THREE.BoxGeometry((l || 3) * 0.9, 0.12, 0.45), '#f4f8ff', false);
    n.position.y = 0.73; g.add(n);
    g.userData.rect = { hx: (l || 3) / 2, hz: 0.45 };
    return g;
  };

  // Portail (arche) : utilisé pour les portes du village et le retour
  AV.deco.portail = function (couleur) {
    var g = new THREE.Group();
    var pierre = '#d9d2c5';
    [-1, 1].forEach(function (c) {
      var p = AV.maille(new THREE.BoxGeometry(0.45, 2.6, 0.45), pierre);
      p.position.set(c * 1.25, 1.3, 0); g.add(p);
    });
    var arche = AV.maille(new THREE.TorusGeometry(1.25, 0.24, 5, 10, Math.PI), pierre);
    arche.position.y = 2.6; g.add(arche);
    var voileMat = new THREE.MeshBasicMaterial({ color: couleur || '#9fd8ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    var forme = new THREE.Shape();
    forme.moveTo(-1.05, 0); forme.lineTo(1.05, 0); forme.lineTo(1.05, 2.6);
    forme.absarc(0, 2.6, 1.05, 0, Math.PI, false); forme.lineTo(-1.05, 0);
    var voile = new THREE.Mesh(new THREE.ShapeGeometry(forme, 10), voileMat);
    g.add(voile);
    g.userData.voile = voile;
    g.userData.pierres = [];
    g.children.forEach(function (c) { if (c !== voile) g.userData.pierres.push(c); });
    return g;
  };

})(window.AV);
