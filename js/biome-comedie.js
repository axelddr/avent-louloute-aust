/* Biome « comedie » : Cœur de Ville en Lumières sur la place de la Comédie (Montpellier), mi-novembre.
   L'« Œuf » de nuit : l'Opéra Comédie au sud, les Trois Grâces au centre, les immeubles haussmanniens
   tout autour, le tram bleu aux hirondelles, l'Esplanade et ses guirlandes au nord, la foule en doudoune.
   1) On arrive par l'Esplanade avec Axel, on peut prendre un cornet de châtaignes, on trouve une place
      devant les Trois Grâces (cercle doré).
   2) Le spectacle de vidéo-mapping sur la façade de l'Opéra (3 tableaux : éveil, kaléidoscope, tuiles).
   3) Bug ! Une comète de lumière s'échappe de l'Opéra et file sur un immeuble à droite : il faut la suivre
      du regard… et nos vidéos (cfg.medias) y sont projetées, dans un cadre de lumière.
   4) Final sur l'Opéra (gerbes + nos prénoms), câlin, surprise. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var A = 33, B = 44, OZ = 2;               // l'« Œuf » : ellipse de la place (demi-axes x / z, centre en z)
  var FZ = -46, FW = 36, FH = 26;           // façade de l'Opéra : plan z, largeur, hauteur
  var TRAM_Z = -30;
  var SPOT = { x: 0, z: -14 };              // la meilleure place, devant les Trois Grâces
  var FONT = { x: 0, z: -3, r: 4.3 };       // fontaine des Trois Grâces
  var CHAT = { x: -10, z: 19 };             // marchand de châtaignes
  var CIEL = { haut: '#04071a', bas: '#1c2350', brouillard: '#141a3a', hemi: ['#8a9ad8', '#2a2230', 0.55], soleil: ['#aebfff', 0.28, [-30, 60, 40]] };

  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  function surOeuf(th) { return { x: A * Math.sin(th), z: OZ + B * Math.cos(th) }; }
  function dansOeuf(x, z, marge) { var a = A - marge, b = B - marge, dz = z - OZ; return (x * x) / (a * a) + (dz * dz) / (b * b) < 1; }

  // ---------- Outils de fusion (coordonnées locales + matrice de l'immeuble) ----------
  var matT = new THREE.MeshLambertMaterial();
  function bloc(F, M, w, h, d, col, x, y, z, rx, ry, rz) {
    var g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, matT);
    matT.color.set(col); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.updateMatrixWorld(true);
    F.ajouter(m, M); g.dispose();
  }
  function forme(F, M, geo, col, x, y, z, rx, ry, sx, sy, sz) {
    var g = AV.facettes(geo), m = new THREE.Mesh(g, matT);
    matT.color.set(col); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0);
    if (sx) m.scale.set(sx, sy, sz);
    m.updateMatrixWorld(true); F.ajouter(m, M); g.dispose();
  }
  var I = new THREE.Matrix4();

  // ---------- Textures ----------
  function textureDalles() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#7d766c'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      var v = 168 + Math.floor(Math.random() * 26);
      x.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 16) + ')';
      x.fillRect(i * 64 + (j % 2) * 32 + 1, j * 64 + 1, 62, 62);
      x.fillRect(i * 64 + (j % 2) * 32 - 255, j * 64 + 1, 62, 62);
    }
    for (var k = 0; k < 1800; k++) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '60,50,40') + ',.07)'; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70);
    return t;
  }

  // ---------- L'Opéra Comédie : plan de la façade (mêmes données pour la 3D et pour le mapping) ----------
  // x de -18 à 18, y de 0 à 26 (m)
  var OP = {
    portes: [-5, 0, 5].map(function (x) { return { x: x, w: 3.4, y0: 0.6, y1: 4.2 }; }),          // 3 arcades d'entrée
    fenRdc: [-15, -10.5, 10.5, 15].map(function (x) { return { x: x, w: 2, y0: 1.5, y1: 4.5 }; }),
    loggia: [-5, 0, 5].map(function (x) { return { x: x, w: 3, y0: 8.6, y1: 12.6 }; }),            // grandes baies cintrées
    fenPav: [-16, -12, 12, 16].map(function (x) { return { x: x, w: 1.8, y0: 8.8, y1: 12.8 }; }),   // fenêtres des pavillons (frontons)
    colonnes: [-8, -7, -3, -2, 2, 3, 7, 8],                                                         // colonnes jumelées
    corniches: [7.0, 15.0, 16.0, 17.2],
    attique: { x0: -9, x1: 9, y0: 17.2, y1: 21 }, oculus: { x: 0, y: 19.1, r: 1.3 }
  };
  function planOpera() {
    var W = 1024, H = Math.round(1024 * FH / FW), c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), sx = W / FW, sy = H / FH;
    function X(v) { return (v + FW / 2) * sx; } function Y(v) { return (FH - v) * sy; }
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    function arche(o, r) { // contour d'une baie cintrée
      var rr = o.w / 2;
      x.beginPath(); x.moveTo(X(o.x - rr), Y(o.y0)); x.lineTo(X(o.x - rr), Y(o.y1));
      x.arc(X(o.x), Y(o.y1), rr * sx, Math.PI, 0); x.lineTo(X(o.x + rr), Y(o.y0)); if (r) x.closePath();
    }
    function rect(o) { x.beginPath(); x.rect(X(o.x - o.w / 2), Y(o.y1), o.w * sx, (o.y1 - o.y0) * sy); }
    // ouvertures pleines (canal vert)
    x.fillStyle = 'rgb(0,255,0)';
    OP.portes.concat(OP.fenRdc, OP.loggia).forEach(function (o) { arche(o, true); x.fill(); });
    OP.fenPav.forEach(function (o) { rect(o); x.fill(); });
    x.beginPath(); x.arc(X(OP.oculus.x), Y(OP.oculus.y), OP.oculus.r * sx, 0, Math.PI * 2); x.fill();
    // colonnes, statues, frontons (canal bleu)
    x.fillStyle = 'rgb(0,0,255)';
    OP.colonnes.forEach(function (cx) { x.fillRect(X(cx - 0.35), Y(15), 0.7 * sx, (15 - 7.6) * sy); });
    [-17, 17].forEach(function (cx) { x.fillRect(X(cx - 0.6), Y(19.6), 1.2 * sx, 2.4 * sy); });
    x.beginPath(); x.ellipse(X(0), Y(22.6), 3.2 * sx, 1.6 * sy, 0, 0, Math.PI * 2); x.fill();
    // le dessin de l'architecture (canal rouge) : un trait épais flou + un trait fin
    function traits(larg, a) {
      x.strokeStyle = 'rgba(255,0,0,' + a + ')'; x.lineWidth = larg;
      OP.portes.concat(OP.fenRdc, OP.loggia).forEach(function (o) { arche(o, false); x.stroke(); });
      OP.fenPav.forEach(function (o) {
        rect(o); x.stroke();
        x.beginPath(); x.moveTo(X(o.x - 1.2), Y(o.y1 + 0.4)); x.lineTo(X(o.x), Y(o.y1 + 1.4)); x.lineTo(X(o.x + 1.2), Y(o.y1 + 0.4)); x.closePath(); x.stroke();
      });
      OP.corniches.forEach(function (y) { x.beginPath(); x.moveTo(X(-18), Y(y)); x.lineTo(X(18), Y(y)); x.stroke(); });
      OP.colonnes.forEach(function (cx) { x.beginPath(); x.moveTo(X(cx - 0.35), Y(7.6)); x.lineTo(X(cx - 0.35), Y(15)); x.moveTo(X(cx + 0.35), Y(7.6)); x.lineTo(X(cx + 0.35), Y(15)); x.stroke(); });
      [-10, 10, -18, 18].forEach(function (cx) { x.beginPath(); x.moveTo(X(cx), Y(0)); x.lineTo(X(cx), Y(17.2)); x.stroke(); });
      var at = OP.attique; x.beginPath(); x.rect(X(at.x0), Y(at.y1), (at.x1 - at.x0) * sx, (at.y1 - at.y0) * sy); x.stroke();
      x.beginPath(); x.arc(X(OP.oculus.x), Y(OP.oculus.y), OP.oculus.r * sx, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(X(OP.oculus.x), Y(OP.oculus.y), (OP.oculus.r + 0.4) * sx, 0, Math.PI * 2); x.stroke();
      for (var b = -17.5; b <= 17.5; b += 0.7) { x.beginPath(); x.moveTo(X(b), Y(16)); x.lineTo(X(b), Y(17.2)); x.stroke(); } // balustres
      [-14, 14].forEach(function (cx) { x.beginPath(); x.moveTo(X(cx - 4), Y(17.2)); x.quadraticCurveTo(X(cx), Y(21.5), X(cx + 4), Y(17.2)); x.stroke(); }); // dômes des pavillons
      x.beginPath(); x.moveTo(X(-9), Y(21)); x.quadraticCurveTo(X(0), Y(25.5), X(9), Y(21)); x.stroke();
    }
    traits(9, 0.35); traits(3, 1);
    var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    return t;
  }
  function texteFinal(txt) {
    var W = 1024, H = Math.round(1024 * FH / FW), c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'); x.clearRect(0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    x.font = '900 116px Nunito, sans-serif';
    x.shadowColor = '#fff'; x.shadowBlur = 24;
    x.fillText(txt, W / 2, (FH - 11.2) / FH * H);
    var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    return t;
  }

  // ---------- Le shader de vidéo-mapping (ajouté par-dessus la pierre) ----------
  function materielMapping(plan, texte) {
    return new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uMode: { value: 0 }, uK: { value: 0 }, uInt: { value: 1 }, uGlitch: { value: 0 }, uTxt: { value: 0 }, uPlan: { value: plan }, uTexte: { value: texte } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uT, uMode, uK, uInt, uGlitch, uTxt; uniform sampler2D uPlan; uniform sampler2D uTexte; varying vec2 vUv;',
        'vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }',
        'float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'void main(){',
        '  vec2 uv = vUv; float ft = floor(uT * 14.0);',
        '  if (uGlitch > 0.0) { float b = floor(uv.y * 24.0); if (h21(vec2(b, ft)) < uGlitch * 0.6) uv.x += (h21(vec2(b, ft + 2.0)) - 0.5) * 0.14 * uGlitch; }',
        '  vec4 p = texture2D(uPlan, uv); float L = p.r, O = p.g, C = p.b;',
        '  vec3 dore = vec3(1.0, 0.72, 0.32); vec3 col = vec3(0.0); vec2 q = uv * vec2(1.385, 1.0);',
        '  if (uMode < 0.5) {',
        '    col = dore * (0.07 + 0.05 * sin(uv.x * 4.0 + uT * 0.6)) + dore * L * 0.08 + vec3(1.0, 0.8, 0.5) * O * 0.04;',
        '  } else if (uMode < 1.5) {',
        '    float d = distance(q, vec2(0.69, 0.0)); float fr = uK * 1.9;',
        '    float rev = smoothstep(fr, fr - 0.08, d); float bord = smoothstep(0.06, 0.0, abs(d - fr)) * step(uK, 0.98);',
        '    col = dore * L * rev * 1.5 + vec3(1.0, 0.95, 0.8) * bord * (0.2 + L);',
        '    col += dore * C * rev * 0.4 * smoothstep(0.45, 0.85, uK);',
        '    col += vec3(1.0, 0.6, 0.25) * O * rev * smoothstep(0.55, 1.0, uK) * (0.6 + 0.4 * sin(uT * 7.0 + uv.x * 40.0));',
        '  } else if (uMode < 2.5) {',
        '    float h = fract(uv.x * 0.7 + uv.y * 0.35 - uT * 0.12); vec3 c = hsv(h, 0.75, 1.0);',
        '    float bande = 0.5 + 0.5 * sin((q.y + q.x) * 14.0 - uT * 3.0);',
        '    col = c * (0.16 + 0.34 * bande) * (1.0 - O) + hsv(fract(h + 0.5), 0.6, 1.0) * O * 0.9 + vec3(1.0) * L * 0.75 + c * C * 0.5;',
        '    vec2 g = vec2(uv.x * 40.0, uv.y * 28.0 + uT * 3.0); vec2 id = floor(g); float r = h21(id);',
        '    if (r > 0.93) { vec2 f = fract(g) - 0.5; col += vec3(1.0, 0.95, 0.8) * smoothstep(0.25, 0.0, length(f)) * (r - 0.93) * 14.0; }',
        '    col *= smoothstep(0.0, 0.06, uK);',
        '  } else if (uMode < 3.5) {',
        '    vec2 g = vec2(uv.x * 18.0, uv.y * 13.0); vec2 id = floor(g); float r = h21(id);',
        '    float flip = smoothstep(r * 0.7, r * 0.7 + 0.15, uK); vec3 c = hsv(fract(r * 0.3 + 0.55 + uT * 0.05), 0.7, 1.0);',
        '    vec2 f = fract(g); float joint = step(0.06, f.x) * step(0.06, f.y);',
        '    float w = 0.5 + 0.5 * sin(distance(q, vec2(0.69, 0.12)) * 30.0 - uT * 5.0);',
        '    col = mix(vec3(0.05, 0.08, 0.25) * w, c * (0.3 + 0.45 * w), flip) * joint + vec3(1.0) * L * 0.7 + c * O * flip * 0.8;',
        '  } else if (uMode < 4.5) {',
        '    col = vec3(0.15, 0.3, 0.9) * (0.1 + 0.07 * sin(uT * 1.2)) + vec3(0.5, 0.7, 1.0) * L * 0.3 + vec3(0.3, 0.5, 1.0) * O * 0.12;',
        '  } else {',
        '    for (int i = 0; i < 7; i++) { float fi = float(i); float per = 2.2 + fi * 0.37; float tt = mod(uT + fi * 0.9, per) / per; float n = floor((uT + fi * 0.9) / per);',
        '      vec2 c0 = vec2(0.12 + 0.76 * h21(vec2(fi, n)), 0.2 + 0.65 * h21(vec2(n, fi + 3.0)));',
        '      float d = distance(q, c0 * vec2(1.385, 1.0)); float ring = smoothstep(0.03, 0.0, abs(d - tt * 0.42)) * (1.0 - tt);',
        '      col += hsv(h21(vec2(fi, n + 7.0)), 0.7, 1.0) * ring * 1.5; }',
        '    col += vec3(1.0, 0.85, 0.6) * L * (0.45 + 0.3 * sin(uT * 3.0)) + vec3(1.0, 0.5, 0.7) * O * 0.25;',
        '  }',
        '  col += vec3(1.0, 0.78, 0.88) * texture2D(uTexte, vUv).a * uTxt * (0.85 + 0.15 * sin(uT * 4.0));',
        // silhouette de l'Opéra : rien n'est projeté dans le ciel
        '  float X = (vUv.x - 0.5) * 36.0, Y = vUv.y * 26.0;',
        '  float sil = step(Y, 17.4) + step(abs(X), 9.2) * step(Y, 21.2) + step(length(vec2((abs(X) - 14.0) / 4.0, (Y - 17.2) / 3.4)), 1.0)',
        '    + step(length(vec2(X / 3.8, (Y - 22.8) / 2.6)), 1.0) + step(abs(abs(X) - 17.0), 0.9) * step(Y, 19.8) + step(length(vec2(X, Y - 25.4)), 1.0);',
        '  col *= clamp(sil, 0.0, 1.0);',
        '  if (uGlitch > 0.0) { col.r += uGlitch * 0.35 * h21(vec2(floor(uv.y * 60.0), ft)); col.b += uGlitch * 0.25 * h21(vec2(ft, floor(uv.x * 30.0))); }',
        '  gl_FragColor = vec4(col * uInt, 1.0);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  // ---------- Les gens (tenue d'hiver, géométries partagées) ----------
  var GEO = null;
  function geos() {
    if (GEO) return GEO;
    var F = AV.facettes;
    GEO = {
      jambe: F(new THREE.BoxGeometry(0.15, 0.8, 0.17)), manteau: F(new THREE.CylinderGeometry(0.2, 0.27, 0.8, 7)),
      tete: F(new THREE.IcosahedronGeometry(0.17, 1)), cheveux: F(new THREE.SphereGeometry(0.182, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      longs: F(new THREE.BoxGeometry(0.32, 0.42, 0.12)), bras: F(new THREE.CylinderGeometry(0.075, 0.065, 0.6, 5)), main: F(new THREE.IcosahedronGeometry(0.06, 0)),
      oeil: F(new THREE.SphereGeometry(0.025, 5, 4)), bonnet: F(new THREE.SphereGeometry(0.195, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5)), pompon: F(new THREE.IcosahedronGeometry(0.06, 0)),
      echarpe: F(new THREE.TorusGeometry(0.16, 0.055, 5, 10)), tel: new THREE.BoxGeometry(0.08, 0.15, 0.015), ecran: new THREE.PlaneGeometry(0.066, 0.125)
    };
    return GEO;
  }
  function piece(geo, col) { return new THREE.Mesh(geo, AV.mat(col)); }
  var matEcran = new THREE.MeshBasicMaterial({ color: '#cfe6ff' });
  function personne(o) {
    var g = geos(), racine = new THREE.Group(), corps = new THREE.Group(); racine.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) { var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); corps.add(j); var m = piece(g.jambe, o.bas); m.position.y = -0.4; j.add(m); jambes.push(j); });
    var t = piece(g.manteau, o.haut); t.position.y = 1.0; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.6; corps.add(tete);
    tete.add(piece(g.tete, o.peau));
    var ch = piece(g.cheveux, o.cheveux); ch.rotation.x = -0.4; ch.position.y = 0.012; tete.add(ch);
    if (o.longs) { var lg = piece(g.longs, o.cheveux); lg.position.set(0, -0.12, -0.11); tete.add(lg); }
    [-1, 1].forEach(function (c) { var oe = piece(g.oeil, '#2b2340'); oe.position.set(c * 0.06, 0.03, 0.152); tete.add(oe); });
    if (o.bonnet) {
      var bo = piece(g.bonnet, o.bonnet); bo.position.y = 0.04; tete.add(bo);
      if (o.pompon) { var po = piece(g.pompon, '#f4efe4'); po.position.y = 0.24; tete.add(po); }
    }
    if (o.echarpe) { var ec = piece(g.echarpe, o.echarpe); ec.rotation.x = Math.PI / 2; ec.position.y = 1.38; corps.add(ec); }
    if (o.qui) AV.avatars.coiffer(tete, o.qui, { retirer: o.cheveux, chapeau: !!o.bonnet });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.27, 1.36, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = piece(g.bras, o.haut); m.position.y = -0.3; b.add(m);
      var mn = piece(g.main, o.peau); mn.position.y = -0.62; b.add(mn);
      bras.push(b);
    });
    var tel = null;
    if (o.tel) {
      tel = new THREE.Group(); tel.add(piece(g.tel, '#1d1d24'));
      var e = new THREE.Mesh(g.ecran, matEcran); e.position.z = -0.009; e.rotation.y = Math.PI; tel.add(e);
      tel.position.set(0, -0.68, 0.06); tel.rotation.x = Math.PI / 2; tel.visible = false; bras[1].add(tel);
    }
    if (o.enfant) racine.scale.setScalar(0.62);
    return { groupe: racine, corps: corps, tete: tete, bras: bras, jambes: jambes, tel: tel };
  }

  // ---------- Écran HTML projeté sur l'immeuble (homographie → matrix3d, mélange « screen ») ----------
  function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
  function mulMM(a, b) { var c = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var s = 0; for (var k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; }
  function mulMV(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function base4(p) { var m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1], v = mulMV(adj(m), [p[6], p[7], 1]); return mulMM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
  function homographie(src, dst) { var t = mulMM(base4(dst), adj(base4(src))); for (var i = 0; i < 9; i++) t[i] /= t[8]; return [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]]; }
  var STYLE_ECRAN =
    '.c21-ecran{position:fixed;left:0;top:0;transform-origin:0 0;z-index:1;pointer-events:none;mix-blend-mode:screen;display:none;opacity:0;transition:opacity .9s}' +
    '.c21-contenu{position:absolute;inset:0;overflow:hidden;-webkit-clip-path:circle(0% at 50% 50%);clip-path:circle(0% at 50% 50%);transition:clip-path 1.8s ease-out,-webkit-clip-path 1.8s ease-out}' +
    '.c21-contenu.ouvert{-webkit-clip-path:circle(80% at 50% 50%);clip-path:circle(80% at 50% 50%)}' +
    '.c21-contenu video,.c21-contenu img{position:absolute;inset:4%;width:92%;height:92%;object-fit:contain;filter:brightness(1.12) saturate(1.2) contrast(1.05);transition:opacity .6s,transform 7s linear}' +
    '.c21-vide{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffe2b0;font:900 96px Nunito,sans-serif;text-align:center;text-shadow:0 0 30px #ffb060,0 0 60px #ff8040}' +
    '.c21-vide small{font-size:44px;font-weight:700;margin-top:24px;color:#bfe0ff;text-shadow:0 0 20px #60a0ff}' +
    '.c21-cadre{position:absolute;inset:1.2%;border:10px solid #ffd08a;border-radius:14px;box-shadow:0 0 60px 18px rgba(255,180,90,.65),inset 0 0 60px 14px rgba(255,180,90,.55);animation:c21-teinte 9s linear infinite}' +
    '.c21-voile{position:absolute;top:-10%;bottom:-10%;width:30%;left:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,240,210,.95),rgba(255,255,255,0));transform:translateX(-140%) skewX(-12deg);opacity:0}' +
    '.c21-voile.passe{animation:c21-balaye 1.1s ease-in-out}' +
    '@keyframes c21-teinte{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}' +
    '@keyframes c21-balaye{0%{opacity:1;transform:translateX(-140%) skewX(-12deg)}100%{opacity:1;transform:translateX(430%) skewX(-12deg)}}';

  // =====================================================================
  AV.biomes.comedie = function (cfg) {
    var rng = AV.rng(2111 + cfg.jour);
    var nomLui = cfg.copain || 'Axel', nomElle = cfg.copine || 'Océane';
    var mo = new AV.Monde({
      rayon: 60, hauteur: function () { return 0; }, surface: 'pave', ciel: CIEL, brouillard: [70, 300],
      depart: { x: 0, z: 35, angle: Math.PI }, theme: 'comedie', ambiance: 'foule',
      autorise: function (x, z) { return dansOeuf(x, z, 2.6) && z > -25.5 && z < 39; }
    });
    mo.loin = 900;
    mo.sansAnimal = true;
    mo.cielEtLumieres(CIEL);
    var G = mo.groupe;
    var et = AV.etoiles(160, 380); et.material.opacity = 0.5; G.add(et);
    var luneM = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false }));
    luneM.position.set(-140, 150, -260); G.add(luneM);
    var hl = AV.halo('#fff0c8', 46); hl.material.fog = false; hl.material.opacity = 0.3; hl.position.copy(luneM.position); G.add(hl);

    // ---------- Le sol : dallage clair de la Comédie ----------
    var sol = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ map: textureDalles() }));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; G.add(sol);

    var Fi = new AV.Fusion(), FL = new AV.Fusion();        // pierre (éclairée) / vitres allumées (sans ombrage)
    var CHAUD = ['#ffd690', '#ffc070', '#ffe8b8', '#f6b25a', '#ffdca8'];

    // ---------- L'Opéra Comédie ----------
    var pierre = '#e9dcc0', pierre2 = '#f1e6cf', ardoise = '#4a5262';
    bloc(Fi, I, FW, 17.2, 22, pierre, 0, 8.6, FZ - 11);
    [-14, 14].forEach(function (cx) { bloc(Fi, I, 8, 17.2, 0.6, pierre2, cx, 8.6, FZ + 0.3); });
    for (var yr = 0.9; yr < 7; yr += 0.9) bloc(Fi, I, FW + 0.1, 0.07, 0.04, '#cbbd9c', 0, yr, FZ + 0.62); // bossages du rez-de-chaussée
    OP.corniches.forEach(function (y) { bloc(Fi, I, FW + 0.6, 0.35, 0.95, pierre2, 0, y, FZ + 0.35); });
    OP.portes.forEach(function (o) {
      bloc(FL, I, o.w, o.y1 - o.y0, 0.1, '#d8953e', o.x, (o.y0 + o.y1) / 2, FZ + 0.66);
      forme(FL, I, new THREE.CylinderGeometry(o.w / 2, o.w / 2, 0.1, 14), '#d8953e', o.x, o.y1, FZ + 0.66, Math.PI / 2);
    });
    OP.fenRdc.forEach(function (o) {
      bloc(FL, I, o.w, o.y1 - o.y0, 0.1, '#a8702e', o.x, (o.y0 + o.y1) / 2, FZ + 0.66);
      forme(FL, I, new THREE.CylinderGeometry(o.w / 2, o.w / 2, 0.1, 12), '#a8702e', o.x, o.y1, FZ + 0.66, Math.PI / 2);
    });
    OP.loggia.forEach(function (o) {
      bloc(FL, I, o.w, o.y1 - o.y0, 0.1, '#e0a050', o.x, (o.y0 + o.y1) / 2, FZ + 0.06);
      forme(FL, I, new THREE.CylinderGeometry(o.w / 2, o.w / 2, 0.1, 14), '#e0a050', o.x, o.y1, FZ + 0.06, Math.PI / 2);
    });
    OP.fenPav.forEach(function (o) {
      bloc(FL, I, o.w, o.y1 - o.y0, 0.1, '#c88a40', o.x, (o.y0 + o.y1) / 2, FZ + 0.66);
      bloc(Fi, I, 1.4, 0.18, 0.4, pierre2, o.x - 0.62, o.y1 + 0.85, FZ + 0.75, 0, 0, 0.62);
      bloc(Fi, I, 1.4, 0.18, 0.4, pierre2, o.x + 0.62, o.y1 + 0.85, FZ + 0.75, 0, 0, -0.62);
    });
    OP.colonnes.forEach(function (cx) {
      forme(Fi, I, new THREE.CylinderGeometry(0.33, 0.37, 7.4, 8), pierre2, cx, 11.3, FZ + 0.8);
      bloc(Fi, I, 0.9, 0.35, 0.9, pierre2, cx, 7.75, FZ + 0.8); bloc(Fi, I, 0.95, 0.4, 0.95, pierre2, cx, 14.8, FZ + 0.8);
    });
    bloc(Fi, I, FW, 0.2, 0.7, pierre2, 0, 16.1, FZ + 0.35); bloc(Fi, I, FW, 0.22, 0.7, pierre2, 0, 17.1, FZ + 0.35);
    for (var bx = -17.5; bx <= 17.5; bx += 0.7) forme(Fi, I, new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5), pierre, bx, 16.6, FZ + 0.4);
    bloc(Fi, I, 18, 3.8, 10, pierre, 0, 19.1, FZ - 5.3);
    forme(FL, I, new THREE.CylinderGeometry(OP.oculus.r, OP.oculus.r, 0.1, 20), '#f0c070', 0, OP.oculus.y, FZ - 0.25, Math.PI / 2);
    forme(Fi, I, new THREE.TorusGeometry(OP.oculus.r + 0.2, 0.18, 5, 20), pierre2, 0, OP.oculus.y, FZ - 0.2);
    [[-2.2, 22, 1.1], [-0.8, 22.9, 1.3], [0.8, 22.9, 1.3], [2.2, 22, 1.1], [0, 24, 0.9], [-3.4, 21.5, 0.8], [3.4, 21.5, 0.8]].forEach(function (s) {
      forme(Fi, I, new THREE.IcosahedronGeometry(s[2], 1), pierre2, s[0], s[1], FZ - 0.9, 0, rng() * 3, 0.8, 1.2, 0.7);
    });
    forme(Fi, I, new THREE.TorusGeometry(0.7, 0.12, 6, 14), '#d8b060', 0, 25.4, FZ - 0.9);   // la lyre
    [-17, 17].forEach(function (cx) { forme(Fi, I, new THREE.IcosahedronGeometry(0.8, 1), pierre2, cx, 18.5, FZ + 0.2, 0, 0.5, 0.7, 1.5, 0.6); });
    [-14, 14].forEach(function (cx) {
      forme(Fi, I, new THREE.SphereGeometry(4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), ardoise, cx, 17.2, FZ - 3.2, 0, 0, 1, 0.85, 1);
      forme(Fi, I, new THREE.ConeGeometry(0.35, 1.6, 6), '#c8a050', cx, 21.4, FZ - 3.2);
    });
    bloc(Fi, I, 32, 2.6, 17, ardoise, 0, 18.5, FZ - 13.5);
    forme(Fi, I, new THREE.SphereGeometry(6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#55665f', 0, 19.8, FZ - 13);
    forme(Fi, I, new THREE.CylinderGeometry(0.9, 1.1, 2.2, 8), '#55665f', 0, 26.6, FZ - 13);
    for (var st = 0; st < 4; st++) bloc(Fi, I, 22 - st * 0.4, 0.2, 3.4 - st * 0.8, pierre2, 0, 0.1 + st * 0.2, FZ + 0.6 + (3.4 - st * 0.8) / 2);
    mo.colliders.push({ rect: true, x: 0, z: FZ - 9, hx: 19, hz: 13.5, a: 0 });
    mo.lumiere('#ffc890', 1.15, 36, -10, 1.2, FZ + 9); mo.lumiere('#ffc890', 1.15, 36, 10, 1.2, FZ + 9);

    // ---------- Le mapping (plan additif devant la façade) ----------
    var matMap = materielMapping(planOpera(), texteFinal(nomElle + ' ❤ ' + nomLui));
    var mapping = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), matMap);
    mapping.position.set(0, FH / 2, FZ + 1.35); mapping.renderOrder = 5; G.add(mapping);
    var lumProj = mo.lumiere('#ffd090', 0, 55, 0, 9, FZ + 15);

    // ---------- Les immeubles haussmanniens autour de l'Œuf ----------
    function immeuble(p1, p2, o) {
      o = o || {};
      var dx = p2.x - p1.x, dz = p2.z - p1.z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, mx = (p1.x + p2.x) / 2, mz = (p1.z + p2.z) / 2;
      var vx = (o.vers ? o.vers.x : 0) - mx, vz = (o.vers ? o.vers.z : OZ) - mz;
      if (nx * vx + nz * vz < 0) { nx = -nx; nz = -nz; }
      var ry = Math.atan2(nx, nz), M = AV.matrice(mx, 0, mz, ry);
      var w = L + 0.6, nf = o.etages || (4 + Math.floor(rng() * 2)), Hc = 5 + nf * 3.2;
      var pi = o.pierre || AV.choisir(rng, ['#e6dcc6', '#ecdfc4', '#e2d6bc', '#efe5d0']), pi2 = '#f3ead8', zinc = '#59616e';
      bloc(Fi, M, w, Hc, 14, pi, 0, Hc / 2, -7);
      bloc(Fi, M, w, 0.35, 0.5, '#d8ccb2', 0, 5, 0.12);
      bloc(Fi, M, w, 0.45, 0.85, '#d8ccb2', 0, Hc, 0.28);
      var nw = Math.max(2, Math.round(w / 2.7)), pas = w / nw;
      for (var i = 0; i < nw; i++) {
        var x = -w / 2 + pas * (i + 0.5);
        if (!o.sansBoutique) {
          bloc(FL, M, pas * 0.78, 3.3, 0.06, AV.choisir(rng, ['#ffd79a', '#ffe9c8', '#ffc68a', '#fff0d8']), x, 2.05, 0.05);
          bloc(Fi, M, pas * 0.12, 4.6, 0.3, pi2, x - pas / 2, 2.3, 0.1);
          if (rng() < 0.35) bloc(Fi, M, pas * 0.92, 0.08, 1.5, AV.choisir(rng, ['#8a2a2a', '#2a4a6a', '#2f5a3a', '#5a2a4a']), x, 4.35, 0.72, 0.38);
        }
        for (var f = 0; f < nf; f++) {
          var y = 5 + f * 3.2 + 1.7;
          bloc(Fi, M, 1.55, 2.35, 0.08, pi2, x, y, 0.03);
          if (rng() < (o.allume == null ? 0.42 : o.allume)) bloc(FL, M, 1.15, 1.95, 0.06, AV.choisir(rng, CHAUD), x, y, 0.08);
          else bloc(Fi, M, 1.15, 1.95, 0.06, '#23232f', x, y, 0.08);
        }
        if (i % 2 === 0) { // lucarne
          bloc(Fi, M, 1.3, 1.6, 1.2, zinc, x, Hc + 1.5, -0.7);
          if (rng() < 0.4) bloc(FL, M, 0.7, 0.9, 0.05, AV.choisir(rng, CHAUD), x, Hc + 1.45, -0.08); else bloc(Fi, M, 0.7, 0.9, 0.05, '#23232f', x, Hc + 1.45, -0.08);
        }
      }
      [1, nf - 1].forEach(function (f) {
        var yb = 5 + f * 3.2 + 0.15;
        bloc(Fi, M, w - 0.4, 0.15, 0.85, pi2, 0, yb, 0.42);
        bloc(Fi, M, w - 0.4, 0.85, 0.05, '#22252c', 0, yb + 0.5, 0.82);
      });
      bloc(Fi, M, w, 3.3, 0.3, zinc, 0, Hc + 1.55, -0.95, -0.34);
      bloc(Fi, M, w, 0.3, 12, zinc, 0, Hc + 3.1, -7.6);
      [-w / 3, w / 3].forEach(function (cx) { bloc(Fi, M, 0.8, 1.8, 0.8, '#c8a888', cx, Hc + 4, -6); });
      return { M: M, w: w, Hc: Hc, nx: nx, nz: nz, mx: mx, mz: mz };
    }
    var IMM = null;
    [-1, 1].forEach(function (s) {
      for (var k = 0; k < 5; k++) {
        var spec = s > 0 && k === 2;                // l'immeuble « surprise » : deux fois plus large (0,4 π → 0,6 π)
        if (s > 0 && k === 3) continue;
        var a = surOeuf((0.2 + k * 0.1) * Math.PI), b = surOeuf((0.3 + k * 0.1 + (spec ? 0.1 : 0)) * Math.PI);
        var r = immeuble({ x: s * a.x, z: a.z }, { x: s * b.x, z: b.z }, spec ? { etages: 4, pierre: '#efe4cc', allume: 0.15 } : null);
        if (spec) IMM = r;
      }
      immeuble({ x: s * 21, z: -33 }, { x: s * 20.3, z: -47 }, { vers: { x: 0, z: -40 } });
    });
    // l'Esplanade : rangées de platanes et guirlandes
    var fee = [];
    [-17, -9, 9, 17].forEach(function (xa) {
      for (var za = 46; za < 140; za += 9) {
        forme(Fi, I, new THREE.CylinderGeometry(0.35, 0.5, 6, 6), '#6f6658', xa, 3, za);
        forme(Fi, I, new THREE.IcosahedronGeometry(1, 1), '#2c3a30', xa, 8.5, za, 0, rng() * 3, 4, 2.8, 4);
        for (var q = 0; q < 26; q++) { var aq = rng() * Math.PI * 2, rq = 3.6 + rng() * 0.6; fee.push(xa + Math.cos(aq) * rq, 7 + rng() * 3, za + Math.sin(aq) * rq); }
      }
    });
    for (var gx = -16; gx <= 16; gx += 0.6) fee.push(gx, 5.6 + Math.cos(gx * 0.4) * 0.5, 44); // guirlande à l'entrée
    var feeG = new THREE.BufferGeometry(); feeG.setAttribute('position', new THREE.Float32BufferAttribute(fee, 3));
    var feeP = new THREE.Points(feeG, new THREE.PointsMaterial({ color: '#ffe0a0', size: 0.32, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    G.add(feeP);
    // quelques immeubles au loin pour fermer l'horizon
    for (var bl = 0; bl < 60; bl++) {
      var ab = rng() * Math.PI * 2, rb = AV.entre(rng, 75, 200), xb = Math.sin(ab) * rb, zb = Math.cos(ab) * rb;
      if (Math.abs(xb) < 24 && zb > 30) continue;
      var hb = AV.entre(rng, 14, 24);
      bloc(Fi, I, AV.entre(rng, 12, 24), hb, AV.entre(rng, 12, 24), '#d8cbb0', xb, hb / 2, zb, 0, rng() * 3);
    }

    // ---------- La fontaine des Trois Grâces ----------
    var marbre = '#f2efe8';
    forme(Fi, I, new THREE.CylinderGeometry(FONT.r, FONT.r + 0.2, 0.7, 24), '#d6cdb8', FONT.x, 0.35, FONT.z);
    forme(Fi, I, new THREE.CylinderGeometry(1.2, 1.5, 2.6, 10), '#d6cdb8', FONT.x, 1.3, FONT.z);
    forme(Fi, I, new THREE.CylinderGeometry(1.0, 1.0, 0.3, 10), marbre, FONT.x, 2.75, FONT.z);
    for (var gr = 0; gr < 3; gr++) {
      var ag = gr / 3 * Math.PI * 2, gxg = FONT.x + Math.sin(ag) * 0.45, gzg = FONT.z + Math.cos(ag) * 0.45;
      forme(Fi, I, new THREE.CylinderGeometry(0.2, 0.3, 1.5, 7), marbre, gxg, 3.65, gzg);
      forme(Fi, I, new THREE.IcosahedronGeometry(0.17, 1), marbre, gxg, 4.6, gzg);
      forme(Fi, I, new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5), marbre, gxg + Math.sin(ag + 1.6) * 0.3, 4.15, gzg + Math.cos(ag + 1.6) * 0.3, 0.9, ag);
    }
    forme(Fi, I, new THREE.CylinderGeometry(0.9, 0.35, 0.5, 10), marbre, FONT.x, 5.1, FONT.z);
    var eauF = new THREE.Mesh(new THREE.CircleGeometry(FONT.r - 0.3, 28), new THREE.MeshPhongMaterial({ color: '#1d3350', shininess: 90, specular: '#ffffff', transparent: true, opacity: 0.9 }));
    eauF.rotation.x = -Math.PI / 2; eauF.position.set(FONT.x, 0.62, FONT.z); G.add(eauF);
    var jets = [];
    for (var je = 0; je < 6; je++) {
      var aj = je / 6 * Math.PI * 2, jm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.6, 5), new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.45, depthWrite: false }));
      jm.position.set(FONT.x + Math.sin(aj) * 2.3, 1.2, FONT.z + Math.cos(aj) * 2.3); jm.rotation.set(Math.cos(aj) * -0.35, 0, Math.sin(aj) * 0.35); G.add(jm); jets.push(jm);
    }
    mo.colliders.push({ x: FONT.x, z: FONT.z, r: FONT.r + 0.25 });
    mo.lumiere('#e8f0ff', 0.6, 12, FONT.x, 0.8, FONT.z + 3);

    // ---------- Candélabres autour de l'Œuf ----------
    var matLampe = new THREE.MeshBasicMaterial({ color: '#ffe2a0' });
    var lampes = new AV.Fusion();
    for (var lp = 0; lp < 22; lp++) {
      var tl = lp / 22 * Math.PI * 2, xl = (A - 4.5) * Math.sin(tl), zl = OZ + (B - 4.5) * Math.cos(tl);
      if (zl < -24) continue;
      forme(lampes, I, new THREE.CylinderGeometry(0.09, 0.16, 4.6, 6), '#26332f', xl, 2.3, zl);
      forme(lampes, I, new THREE.ConeGeometry(0.36, 0.35, 6), '#26332f', xl, 5.1, zl);
      var bu = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.36), matLampe); bu.position.set(xl, 4.7, zl); G.add(bu);
      mo.colliders.push({ x: xl, z: zl, r: 0.2 });
    }
    G.add(lampes.maille());
    var lumRue = [mo.lumiere('#ffc874', 0.9, 30, -18, 6, 12), mo.lumiere('#ffc874', 0.9, 30, 18, 6, 12), mo.lumiere('#ffc874', 0.8, 30, 0, 6, 30)];

    // ---------- Les rails et le tram bleu aux hirondelles ----------
    [-0.72, 0.72].forEach(function (dz) { bloc(Fi, I, 150, 0.05, 0.12, '#8a8f96', 0, 0.025, TRAM_Z + dz); });
    var tram = new THREE.Group(); G.add(tram);
    var mVitre = new THREE.MeshBasicMaterial({ color: '#ffe9b8' });
    for (var vc = 0; vc < 2; vc++) {
      var cx0 = (vc - 0.5) * 14.2, caisse = AV.maille(new THREE.BoxGeometry(13.8, 2.6, 2.6), '#2a5cb8'); caisse.position.set(cx0, 1.75, 0); tram.add(caisse);
      var toit = AV.maille(new THREE.BoxGeometry(13.4, 0.4, 2.3), '#e8ecf2'); toit.position.set(cx0, 3.25, 0); tram.add(toit);
      [-1, 1].forEach(function (c) {
        var vi = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.95, 0.05), mVitre); vi.position.set(cx0, 2.15, c * 1.31); tram.add(vi);
        for (var h = 0; h < 6; h++) { // hirondelles blanches
          var hx = cx0 - 5.4 + h * 2.1 + Math.sin(h * 2.3) * 0.4, hy = 1.05 + Math.cos(h * 1.7) * 0.2;
          [-1, 1].forEach(function (aile) { var ai = AV.maille(new THREE.BoxGeometry(0.42, 0.07, 0.03), '#ffffff', false); ai.position.set(hx + aile * 0.17, hy, c * 1.32); ai.rotation.z = aile * 0.45; tram.add(ai); });
        }
      });
    }
    [-1, 1].forEach(function (c) {
      var pb = AV.maille(new THREE.BoxGeometry(0.4, 2.2, 2.4), '#1d3a78'); pb.position.set(c * 14.35, 1.9, 0); tram.add(pb);
      var ph = AV.halo('#fff4d8', 1.4); ph.position.set(c * 14.6, 1.1, 0.8); tram.add(ph);
      var ph2 = AV.halo('#fff4d8', 1.4); ph2.position.set(c * 14.6, 1.1, -0.8); tram.add(ph2);
    });
    tram.position.set(-200, 0, TRAM_Z);
    var tramX = -200, tramSens = 1, tramAttente = 6;

    // ---------- Le marchand de châtaignes ----------
    var Fc = new AV.Fusion(), Mc = AV.matrice(CHAT.x, 0, CHAT.z, 0.6);
    bloc(Fc, Mc, 1.8, 0.9, 1.0, '#5a3424', 0, 0.9, 0); bloc(Fc, Mc, 1.9, 0.08, 1.1, '#3a2418', 0, 1.38, 0);
    [-0.7, 0.7].forEach(function (wx) { forme(Fc, Mc, new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), '#2a2a2a', wx, 0.42, 0.55, Math.PI / 2); });
    forme(Fc, Mc, new THREE.CylinderGeometry(0.12, 0.14, 1.2, 6), '#2a2a2a', 0.6, 2, -0.2);
    G.add(Fc.maille());
    var braise = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.12, 12), new THREE.MeshBasicMaterial({ color: '#ff7a2a' }));
    braise.position.set(CHAT.x, 1.45, CHAT.z); G.add(braise);
    mo.lumiere('#ff9040', 0.9, 7, CHAT.x, 2.2, CHAT.z, true);
    var vendeur = personne({ peau: '#d9a57a', cheveux: '#3a2a1a', haut: '#6a4a2a', bas: '#3a3a40', bonnet: '#2a2a30', echarpe: '#8a2a2a' });
    vendeur.groupe.position.set(CHAT.x - 0.6, 0, CHAT.z - 1.1); vendeur.groupe.rotation.y = 0.6 + Math.PI; G.add(vendeur.groupe);
    var panneauC = AV.texteSprite('🌰 Châtaignes chaudes', { fond: 'rgba(60,30,15,.88)', couleur: '#ffe2b0', largeur: 3, echelle: 0.36 });
    panneauC.position.set(CHAT.x, 3.2, CHAT.z); G.add(panneauC);
    mo.colliders.push({ x: CHAT.x, z: CHAT.z, r: 1.2 });

    var pierres = Fi.maille(); pierres.receiveShadow = true; G.add(pierres);
    mo.bloqueurs.push(pierres);
    G.add(FL.maille(new THREE.MeshBasicMaterial({ vertexColors: true })));

    // ---------- La place dorée devant les Trois Grâces ----------
    var anneau = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    anneau.rotation.x = -Math.PI / 2; anneau.position.set(SPOT.x, 0.04, SPOT.z); G.add(anneau);
    var etincelle = AV.texteSprite('✨', { largeur: 1.1 }); etincelle.position.set(SPOT.x, 2.4, SPOT.z); G.add(etincelle);

    // ---------- La foule ----------
    var gens = [];
    var peaux = ['#f2c9a0', '#eec29a', '#e0ad84', '#c98f62', '#8d5a3b', '#f6d3b0'], cheveux = ['#2b1d14', '#5a3420', '#8a5a2a', '#d9b26a', '#1a1a1a', '#a0a0a0', '#c46a3a'];
    var manteaux = ['#2b2b38', '#4a3a5a', '#6a2a2a', '#2f4a6a', '#3a4a3a', '#7a5a3a', '#1d1d24', '#5a5a6a', '#8a3a4a', '#c8b48a', '#e8e2d4', '#b0503a'];
    var bass = ['#2f3b52', '#3b3550', '#1d1d24', '#4a4a58', '#5a7ab0'], bonnets = ['#d94a4a', '#f3efe4', '#2f3b52', '#e0a030', '#3f8f6b', '#7a5ac8', '#1d1d24'];
    function libreFoule(x, z) {
      if (!dansOeuf(x, z, 4.2) || z < -24 || z > 31) return false;
      if (Math.hypot(x - FONT.x, z - FONT.z) < FONT.r + 1.4 || Math.hypot(x - SPOT.x, z - SPOT.z) < 2.7 || Math.hypot(x - CHAT.x, z - CHAT.z) < 3.2 || Math.hypot(x, z - 35) < 6) return false;
      if (z < SPOT.z && Math.abs(x) < 1.6) return false;                 // on garde la vue dégagée vers l'Opéra
      for (var i = 0; i < gens.length; i++) { var g = gens[i], dx = g.x - x, dz = g.z - z; if (dx * dx + dz * dz < 1.45 * 1.45) return false; }
      for (var c = 0; c < mo.colliders.length; c++) { var cc = mo.colliders[c]; if (!cc.rect && Math.hypot(cc.x - x, cc.z - z) < cc.r + 0.6) return false; }
      return true;
    }
    var essais = 0;
    while (gens.length < 105 && essais++ < 6000) {
      var xg = (rng() * 2 - 1) * (A - 4), zg = -24 + Math.pow(rng(), 1.5) * 55;
      if (!libreFoule(xg, zg)) continue;
      var femme = rng() < 0.5, enfant = rng() < 0.1;
      var o = { peau: AV.choisir(rng, peaux), cheveux: AV.choisir(rng, cheveux), haut: AV.choisir(rng, manteaux), bas: AV.choisir(rng, bass), longs: femme && rng() < 0.75,
        bonnet: rng() < 0.45 ? AV.choisir(rng, bonnets) : null, pompon: rng() < 0.5, echarpe: rng() < 0.55 ? AV.choisir(rng, bonnets) : null, tel: rng() < 0.4, enfant: enfant };
      var pe = personne(o), rot = Math.atan2(0 - xg, FZ - zg) + (rng() - 0.5) * 0.5;
      pe.groupe.position.set(xg, 0, zg); pe.groupe.rotation.y = rot; G.add(pe.groupe);
      mo.colliders.push({ x: xg, z: zg, r: enfant ? 0.22 : 0.3 });
      gens.push({ p: pe, x: xg, z: zg, rot: rot, phase: rng() * 10, o: o, filme: false });
    }
    var cibleRegard = new THREE.Vector3(0, 12, FZ), acclame = 0;

    // ---------- Axel ----------
    var lui = personne({ qui: 'axel', peau: '#e8b88f', cheveux: '#5a3a24', haut: '#2f3b5a', bas: '#3a3a48', echarpe: '#c8a060' });
    lui.groupe.scale.setScalar(1.06); G.add(lui.groupe);
    var L = { x: 1.8, z: 37, ang: Math.PI, etat: 'suit', but: null, ph: 0, regard: null };
    var LUI_SPOT = { x: SPOT.x - 0.95, z: SPOT.z + 0.25 };
    function luiVa(x, z, apres) { L.etat = 'va'; L.but = { x: x, z: z, apres: apres || 'stop', t: 0 }; }
    function majLui(dt, t, jp) {
      var v = 0;
      if (L.etat === 'suit' || L.etat === 'va') {
        var tx, tz, vmax;
        if (L.etat === 'suit') { var dx = jp.x - L.x, dz = jp.z - L.z, d = Math.hypot(dx, dz) || 1; tx = jp.x - dx / d * 1.6; tz = jp.z - dz / d * 1.6; vmax = d > 2.2 ? Math.min(7, (d - 1.6) * 2.5) : 0; }
        else { tx = L.but.x; tz = L.but.z; vmax = 3.6; L.but.t += dt; if (L.but.t > 7) { L.x = tx; L.z = tz; } }
        var ex = tx - L.x, ez = tz - L.z, el = Math.hypot(ex, ez);
        if (el > 0.06 && vmax > 0) { v = Math.min(vmax, el / dt); L.x += ex / el * v * dt; L.z += ez / el * v * dt; L.ang = AV.angleLerp(L.ang, Math.atan2(ex, ez), Math.min(1, dt * 8)); }
        else if (L.etat === 'va') { L.etat = L.but.apres; L.but = null; }
        if (L.etat === 'suit') for (var c = 0; c < mo.colliders.length; c++) {
          var cc = mo.colliders[c]; if (cc.rect) continue;
          var qx = L.x - cc.x, qz = L.z - cc.z, q = Math.hypot(qx, qz), mn = cc.r + 0.35;
          if (q < mn && q > 1e-4) { L.x = cc.x + qx / q * mn; L.z = cc.z + qz / q * mn; }
        }
      }
      var cible = L.regard || jp;
      if (v < 0.3 && L.etat !== 'calin') L.ang = AV.angleLerp(L.ang, Math.atan2(cible.x - L.x, cible.z - L.z), Math.min(1, dt * 3));
      L.ph += dt * (4 + v * 1.6);
      var s = Math.sin(L.ph), k = Math.min(1, v / 4);
      lui.groupe.position.set(L.x, Math.abs(Math.cos(L.ph)) * 0.05 * k, L.z); lui.groupe.rotation.y = L.ang;
      lui.jambes[0].rotation.x = s * 0.8 * k; lui.jambes[1].rotation.x = -s * 0.8 * k;
      if (L.etat === 'calin') { lui.bras[0].rotation.set(-1.25, 0, 0.5); lui.bras[1].rotation.set(-1.25, 0, -0.5); }
      else if (L.parle > 0) { L.parle -= dt; lui.bras[1].rotation.set(-0.6 + Math.sin(t * 7) * 0.3, 0, 0.1); lui.bras[0].rotation.set(-s * 0.7 * k, 0, -0.1); }
      else { lui.bras[0].rotation.set(-s * 0.7 * k, 0, -0.1); lui.bras[1].rotation.set(s * 0.7 * k, 0, 0.1); }
      if (L.pointe > 0) { L.pointe -= dt; lui.bras[1].rotation.set(-1.9, 0, 0); }
      var tr = Math.atan2(cibleRegard.x - L.x, cibleRegard.z - L.z) - L.ang;
      lui.tete.rotation.y = phase !== 'place' && phase !== 'fin' && L.etat !== 'calin' ? Math.max(-1.1, Math.min(1.1, AV.angleLerp(0, tr, 1))) : 0;
      lui.tete.rotation.x = phase !== 'place' && phase !== 'fin' ? -0.25 : 0;
    }

    // ---------- Bulles, cœurs, étincelles ----------
    var bulles = [], coeurs = [];
    function bulle(x, y, z, texte, vie) {
      var s = AV.bulleBD(texte);
      s.position.set(x, y, z); s.userData.vie = vie || 3.2; G.add(s); bulles.push(s);
    }
    var note = null;
    function dire(t, d) { note = { t: t, v: d || 3.5 }; }
    function luiDit(t, d) { bulle(L.x, 2.45, L.z, t, d || 3.4); dire('<b>' + nomLui + ' :</b> ' + t, d || 3.4); L.parle = d || 3.4; }
    function fouleDit(t) { // quelqu'un pas trop près de la caméra (sinon la bulle est énorme)
      for (var e = 0; e < 30; e++) {
        var g = gens[Math.floor(Math.random() * gens.length)], d = Math.hypot(g.x - SPOT.x, g.z - SPOT.z);
        if (d > 6 && d < 22) { bulle(g.x, g.o.enfant ? 1.6 : 2.4, g.z, t, 2.6); return; }
      }
    }
    function coeur(x, y, z) {
      var s = AV.texteSprite(auHasard(['❤️', '💕', '💗', '💖']), { largeur: 0.5 });
      s.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6); G.add(s); coeurs.push({ s: s, t: 0 });
    }
    var NE = 220, ePos = new Float32Array(NE * 3), eVit = [], eVie = new Float32Array(NE), ei = 0;
    for (var e0 = 0; e0 < NE; e0++) { ePos[e0 * 3 + 1] = -50; eVit.push(new THREE.Vector3()); }
    var eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    var etincelles = new THREE.Points(eGeo, new THREE.PointsMaterial({ color: '#ffe6b0', size: 0.35, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    etincelles.frustumCulled = false; G.add(etincelles);
    function gerbe(p, n, force) {
      for (var i = 0; i < n; i++) {
        var k = ei = (ei + 1) % NE; ePos[k * 3] = p.x; ePos[k * 3 + 1] = p.y; ePos[k * 3 + 2] = p.z;
        eVit[k].set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(force * (0.4 + Math.random())); eVie[k] = 1 + Math.random();
      }
    }

    // ---------- La comète et le cadre de lumière sur l'immeuble ----------
    var PY0 = 5.5, PY1 = IMM.Hc - 0.4, PXd = IMM.w / 2 - 1.2;
    function surImm(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(IMM.M); }
    var CENTRE_IMM = surImm(0, (PY0 + PY1) / 2, 0.9);
    var comete = new THREE.Group(); G.add(comete); comete.visible = false;
    var coeurC = AV.halo('#ffffff', 1.4), auraC = AV.halo('#ffd890', 4.2); comete.add(coeurC, auraC);
    var NT = 46, tPos = new Float32Array(NT * 3), tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    var traine = new THREE.Points(tGeo, new THREE.PointsMaterial({ color: '#ffcf80', size: 0.7, map: AV.textureRonde(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    traine.frustumCulled = false; traine.visible = false; G.add(traine);
    var C0 = new THREE.Vector3(0, 21, FZ + 2), C1 = new THREE.Vector3(16, 34, -24), C2 = CENTRE_IMM.clone();
    function bezier(k, out) { var a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k; return out.set(C0.x * a + C1.x * b + C2.x * c, C0.y * a + C1.y * b + C2.y * c, C0.z * a + C1.z * b + C2.z * c); }
    var cadre3D = [], h = IMM.Hc;
    [[-IMM.w / 2, 0, -IMM.w / 2, h], [IMM.w / 2, 0, IMM.w / 2, h], [-IMM.w / 2, 5, IMM.w / 2, 5], [-IMM.w / 2, h, IMM.w / 2, h],
     [-PXd, PY0, PXd, PY0], [-PXd, PY1, PXd, PY1], [-PXd, PY0, -PXd, PY1], [PXd, PY0, PXd, PY1],
     [-IMM.w / 2, h + 3.2, IMM.w / 2, h + 3.2], [-IMM.w / 2, h, -IMM.w / 2, h + 3.2], [IMM.w / 2, h, IMM.w / 2, h + 3.2]].forEach(function (sg, i) {
      var lx = sg[2] - sg[0], ly = sg[3] - sg[1], ln = Math.hypot(lx, ly);
      var m = new THREE.Mesh(new THREE.BoxGeometry(ln + 0.18, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: '#ffd890', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      var zz = i >= 8 ? -0.5 : 1.0;
      m.position.copy(surImm((sg[0] + sg[2]) / 2, (sg[1] + sg[3]) / 2, zz));
      m.rotation.order = 'YXZ'; m.rotation.set(0, Math.atan2(IMM.nx, IMM.nz), Math.atan2(ly, lx));
      m.visible = false; G.add(m); cadre3D.push(m);
    });

    // ---------- L'écran HTML (nos vidéos) ----------
    var medias = (cfg.medias || []).filter(function (s) { return typeof s === 'string' && s; });
    function estVideo(s) { return /\.(mp4|m4v|mov|webm)$/i.test(s); }
    var premiereVideo = null; medias.some(function (s) { if (estVideo(s)) { premiereVideo = s; return true; } return false; });
    var PW = 1200, PH = Math.round(1200 * (PY1 - PY0) / (2 * PXd));
    var styleEl = document.createElement('style'); styleEl.textContent = STYLE_ECRAN; document.head.appendChild(styleEl);
    var ecran = document.createElement('div'); ecran.className = 'c21-ecran'; ecran.style.width = PW + 'px'; ecran.style.height = PH + 'px';
    var contenu = document.createElement('div'); contenu.className = 'c21-contenu'; ecran.appendChild(contenu);
    var video = document.createElement('video'); video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', ''); video.preload = 'metadata'; video.style.opacity = '0';
    if (premiereVideo) video.src = premiereVideo;
    var img = document.createElement('img'); img.style.opacity = '0'; img.alt = '';
    var vide = document.createElement('div'); vide.className = 'c21-vide'; vide.style.display = 'none';
    vide.innerHTML = '✨ ' + nomElle + ' & ' + nomLui + ' ✨<small>Ajoute vos vidéos dans media/j21/<br>(jours.js → jour 21 → medias)</small>';
    var voile = document.createElement('div'); voile.className = 'c21-voile';
    contenu.appendChild(video); contenu.appendChild(img); contenu.appendChild(vide); contenu.appendChild(voile);
    var cadreH = document.createElement('div'); cadreH.className = 'c21-cadre'; ecran.appendChild(cadreH);
    document.body.appendChild(ecran);
    var idx = -1, mediaReste = 0, besoinSon = false, deverrouille = false, vivant = true, tPasser = 0;
    function geste() {
      if (!premiereVideo) return;
      if (besoinSon) { besoinSon = false; video.muted = false; var p = video.play(); if (p && p.catch) p.catch(function () { }); return; }
      if (!deverrouille && phase !== 'projection') {
        deverrouille = true; video.muted = false; // iPad : on « débloque » la vidéo pendant un geste
        var p2 = video.play(); if (p2 && p2.then) p2.then(function () { if (phase !== 'projection') { video.pause(); try { video.currentTime = 0; } catch (e) { } } }).catch(function () { deverrouille = false; });
      }
    }
    document.addEventListener('touchend', geste, true);
    document.addEventListener('click', geste, true);
    video.addEventListener('ended', function () { if (phase === 'projection') montrer(idx + 1); });
    video.addEventListener('error', function () { if (phase === 'projection' && estVideo(medias[idx] || '')) mediaReste = 1.2; });
    img.addEventListener('error', function () { if (phase === 'projection') mediaReste = 1.2; });
    function jouer() {
      var p = video.play();
      if (p && p.catch) p.catch(function (err) {
        if (phase !== 'projection') return;
        if (err && err.name === 'NotAllowedError') { video.muted = true; besoinSon = true; var p2 = video.play(); if (p2 && p2.catch) p2.catch(function () { mediaReste = 1.2; }); }
        else mediaReste = 1.2;
      });
    }
    function afficher(src) {
      if (estVideo(src)) {
        img.style.opacity = '0'; video.style.opacity = '1';
        if (video.getAttribute('src') !== src) video.src = src;
        video.muted = false; try { video.currentTime = 0; } catch (e) { }
        mediaReste = Infinity; jouer();
      } else {
        try { video.pause(); } catch (e) { } video.style.opacity = '0';
        img.style.transition = 'none'; img.style.transform = 'scale(1)'; img.src = src; img.style.opacity = '1';
        setTimeout(function () { img.style.transition = ''; img.style.transform = 'scale(1.08)'; }, 30);
        mediaReste = cfg.dureePhoto || 6;
      }
    }
    function balayer() { voile.classList.remove('passe'); void voile.offsetWidth; voile.classList.add('passe'); AV.audio.whoosh && AV.audio.whoosh(0.5); }
    function montrer(i) {
      idx = i; mediaReste = Infinity;
      if (!medias.length) {
        if (i === 0) { vide.style.display = 'flex'; mediaReste = 8; } else finProjection();
        return;
      }
      if (i >= medias.length) { finProjection(); return; }
      if (i > 0) { balayer(); gerbe(CENTRE_IMM, 40, 6); }
      setTimeout(function () { if (vivant && idx === i && phase === 'projection') afficher(medias[i]); }, i > 0 ? 500 : 0);
    }
    var vS = new THREE.Vector3(), vC = new THREE.Vector3();
    var COINS = [[-PXd, PY1], [PXd, PY1], [-PXd, PY0], [PXd, PY0]].map(function (c) { return surImm(c[0], c[1], 1.0); });
    function placerEcran(camera) {
      var w = window.innerWidth, hh = window.innerHeight, dst = [], ok = true;
      for (var i = 0; i < 4; i++) {
        vC.copy(COINS[i]).applyMatrix4(camera.matrixWorldInverse); if (vC.z > -0.5) { ok = false; break; }
        vS.copy(COINS[i]).project(camera); dst.push((vS.x + 1) / 2 * w, (1 - vS.y) / 2 * hh);
      }
      if (!ok) { ecran.style.visibility = 'hidden'; return; }
      ecran.style.visibility = 'visible';
      ecran.style.transform = 'matrix3d(' + homographie([0, 0, PW, 0, 0, PH, PW, PH], dst).join(',') + ')';
    }

    // ---------- Histoire ----------
    var api = null, J = null, cornet = null, marrons = false, phase = 'place', S = 0, tPhase = 0, tps = 0, dits = {}, regardT = 0, cometeT = -1, kLampe = 1, tramSonne = false;
    tramX = null; tram.position.x = -500;
    var vue = { lacet: 0, tangage: 0.12, viser: null };
    var TAB = [null, '🌅 Tableau 1 · L\'éveil de l\'Opéra', '🌈 Tableau 2 · Kaléidoscope', '🧩 Tableau 3 · Mille tuiles de lumière'];
    function sousTitre(s) { if (api) api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s); }
    function lacetVers(x, z) { return Math.atan2(-(x - SPOT.x), -(z - SPOT.z)); }
    function tangageVers(x, y, z) { return Math.atan2(y - 1.62, Math.hypot(x - SPOT.x, z - SPOT.z)); }
    function une(cle) { if (dits[cle]) return false; dits[cle] = true; return true; }

    var itLui = { x: 0, z: 0, rayon: 1.8, texte: '💬 ✋ Parler à ' + nomLui, fn: function () {
      if (phase === 'fin') luiDit(auHasard(['Meilleure soirée ❤', 'On revient l\'année prochaine ? ✨', 'T\'as vu ta tête quand on est apparus sur l\'immeuble ? 😄']));
      else if (marrons) luiDit(auHasard(['Tu me donnes une châtaigne ? 🌰🥺', 'Viens, on se met devant les Trois Grâces, on verra tout ! ✨', 'Ça commence bientôt, vite ! 😍']));
      else luiDit(auHasard(['Viens, on se met devant les Trois Grâces, on verra tout ! ✨', 'Ça sent les châtaignes grillées… 🌰😋', 'Il y a un monde fou ce soir ! 🤩']));
    } };
    var itChat = { x: CHAT.x, z: CHAT.z, rayon: 2.8, texte: '🌰 ✋ Un cornet de châtaignes chaudes', fn: function () {
      if (marrons) { bulle(CHAT.x - 0.6, 2.5, CHAT.z - 1.1, 'Bonne soirée les amoureux ! ✨', 3); return; }
      marrons = true; if (cornet) cornet.visible = true; AV.audio.ping(1);
      bulle(CHAT.x - 0.6, 2.5, CHAT.z - 1.1, 'Et voilà ! Attention, c\'est chaud 🔥', 3);
      itChat.texte = '🌰 Le marchand de châtaignes · ✋';
      setTimeout(function () { if (vivant && phase === 'place') luiDit('Mmh ça sent bon… tu partages hein ? 😇🌰'); }, 2600);
    } };
    var itSpot = { x: SPOT.x, z: SPOT.z, rayon: 1.5, texte: '✨ ✋ Se mettre ici pour le spectacle', fn: function () { commencer(); } };
    mo.interactifs.push(itSpot, itChat, itLui);
    mo.portailRetour(5.5, 36);
    var interBase = mo.interactifs.slice();

    function commencer() {
      if (phase !== 'place') return;
      phase = 'compte'; S = 0; tPhase = 0; mo.interactifs = [];
      J = J || (AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null);
      if (J) { J.position.set(SPOT.x, 0, SPOT.z); J.groupe.visible = false; J.ombre.visible = false; }
      vue.lacet = 0; vue.tangage = 0.14; vue.viser = null;
      mo.pilote = pilote; AV.controles.vider();
      luiVa(LUI_SPOT.x, LUI_SPOT.z, 'stop'); L.regard = { x: 0, z: FZ };
      tramX = null; tram.position.x = -500;          // pas de tram devant l'Opéra pendant le spectacle
      AV.audio.theme('lumieres');
      sousTitre('✨ Le spectacle va commencer…');
      if (api) api.eclairage(0.75);
    }
    function pilote(dt, e, appui, Jj, camera, o) {
      var r = (o && o.regard) || { dx: 0, dy: 0 };
      if (vue.viser) {
        var k = 1 - Math.exp(-dt * 2.2);
        vue.lacet = AV.angleLerp(vue.lacet, vue.viser.lacet, k); vue.tangage = AV.lerp(vue.tangage, vue.viser.tangage, k);
        if (vue.viser.lache && Math.abs(r.dx) + Math.abs(r.dy) > 2) vue.viser = null;
      } else {
        var s = 0.0042 * camera.fov / 62;
        vue.lacet += r.dx * s - (e.x || 0) * dt * 1.5; vue.tangage += r.dy * s + (e.y || 0) * dt * 1.2;
      }
      vue.tangage = Math.max(-0.35, Math.min(0.9, vue.tangage));
      if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
      camera.position.set(SPOT.x, 1.62, SPOT.z);
      camera.rotation.order = 'YXZ'; camera.rotation.set(vue.tangage, vue.lacet, 0);
      if (o && o.action) action();
    }
    function action() {
      if (phase === 'chercher' && cometeT > 4.5 && regardImm() > Math.cos(0.5)) declencher();
      else if (phase === 'projection' && tps - tPasser > 0.8) { tPasser = tps; montrer(idx + 1); }
    }
    var vDir = new THREE.Vector3(), vVers = new THREE.Vector3();
    function regardImm() {
      var cam = api && api.camera; if (!cam) return 0;
      cam.getWorldDirection(vDir); vVers.copy(CENTRE_IMM).sub(cam.position).normalize(); return vDir.dot(vVers);
    }
    function lancerComete() {
      if (phase !== 'spectacle') return;
      phase = 'chercher'; tPhase = 0; cometeT = 0; regardT = 0; comete.visible = true; traine.visible = true;
      bezier(0, comete.position);
      for (var i = 0; i < NT; i++) { tPos[i * 3] = C0.x; tPos[i * 3 + 1] = C0.y; tPos[i * 3 + 2] = C0.z; }
      gerbe(C0, 80, 6); AV.audio.whoosh(1);
      fouleDit('Oh !! Regardez !! 😮');
      L.regard = { x: CENTRE_IMM.x, z: CENTRE_IMM.z };
      sousTitre('😮 Une lumière s\'est échappée de l\'Opéra !');
    }
    function declencher() {
      if (phase !== 'chercher') return;
      phase = 'trace'; tPhase = 0; vue.viser = null;
      cibleRegard.copy(CENTRE_IMM);
      AV.audio.scintille();
      sousTitre('✨ L\'immeuble s\'illumine…');
    }
    function lancerProjection() {
      phase = 'projection'; tPhase = 0; idx = -1;
      comete.visible = false; traine.visible = false; gerbe(CENTRE_IMM, 120, 7);
      ecran.style.display = 'block'; if (api) placerEcran(api.camera);
      setTimeout(function () { if (!vivant) return; ecran.style.opacity = '1'; contenu.classList.add('ouvert'); }, 40);
      AV.audio.sourdine(true);
      montrer(0);
      luiDit('Surprise… ❤', 3);
      setTimeout(function () { if (vivant && phase === 'projection') fouleDit('Oh, c\'est qui eux ?? 😄'); }, 4000);
      setTimeout(function () { if (vivant && phase === 'projection') fouleDit('Trop mignons ❤'); }, 9000);
      sousTitre('🎬 Nos souvenirs en lumière ❤');
    }
    function finProjection() {
      if (phase !== 'projection') return;
      phase = 'final'; tPhase = 0;
      try { video.pause(); } catch (e) { }
      contenu.classList.remove('ouvert'); ecran.style.opacity = '0';
      setTimeout(function () { if (vivant && phase !== 'projection') ecran.style.display = 'none'; }, 1300);
      AV.audio.sourdine(false); besoinSon = false;
      gerbe(CENTRE_IMM, 160, 9);
      cibleRegard.set(0, 14, FZ); L.regard = { x: 0, z: FZ };
      vue.viser = { lacet: 0, tangage: 0.24, lache: true };
      AV.audio.acclamations(); acclame = 9;
      sousTitre('🎆 Le grand final !');
    }
    function terminer() {
      phase = 'fin'; mo.pilote = null; vue.viser = null;
      if (J) { J.groupe.visible = true; J.ombre.visible = true; }
      L.etat = 'calin'; L.x = SPOT.x - 0.62; L.z = SPOT.z + 0.05; L.ang = Math.atan2(SPOT.x - L.x, SPOT.z - L.z);
      if (AV.jeu) { AV.jeu.placer(SPOT.x, SPOT.z, Math.atan2(L.x - SPOT.x, L.z - SPOT.z)); AV.jeu.camera(0.45, 0.28, 5.2); }
      mo.interactifs = interBase.filter(function (i) { return i !== itSpot; });
      anneau.visible = false; etincelle.visible = false;
      for (var c = 0; c < 8; c++) coeur(SPOT.x - 0.3, 2.1 + c * 0.12, SPOT.z);
      AV.audio.bisou();
      AV.audio.theme('comedie');
      if (api) api.eclairage(1);
      setTimeout(function () { if (vivant) { L.etat = 'suit'; L.regard = null; } }, 6000);
      if (api) api.trouver();
    }
    mo.surTrouve = function (ctx) { ctx.fin(cfg.surprise ? cfg : null); };

    // ---------- Animation ----------
    mo.anime(function (dt, t, jp) {
      tps += dt;
      if (note) { note.v -= dt; if (note.v <= 0) note = null; }
      if (phase !== 'place') S += dt;
      tPhase += dt;
      var U = matMap.uniforms; U.uT.value = t;
      var mode = 0, k = 0, inten = 0.85, glitch = 0;
      if (phase === 'compte') {
        inten = Math.max(0, 1 - S / 3.5);
        if (S > 1 && une('c3')) { dire('3…', 1); AV.audio.ping(0.6); }
        if (S > 2 && une('c2')) { dire('2…', 1); AV.audio.ping(0.7); }
        if (S > 3 && une('c1')) { dire('1…', 1); AV.audio.ping(0.8); }
        if (S > 4) { phase = 'spectacle'; AV.audio.acclamations(); fouleDit('Ohhh 😍'); }
      } else if (phase === 'spectacle') {
        if (S < 20) { mode = 1; k = (S - 4) / 16; } else if (S < 36) { mode = 2; k = (S - 20) / 16; } else { mode = 3; k = (S - 36) / 12; glitch = lisse(46, 50, S); }
        inten = 1;
        if (une('tab' + mode)) sousTitre(TAB[mode]);
        if (S > 12 && une('w')) luiDit(auHasard(['Waouh… 😍', 'C\'est magnifique ✨']), 3);
        if (S > 21 && une('o1')) fouleDit('Ohhh ! 🌈');
        if (S > 27 && une('m')) luiDit(marrons ? 'Je peux te piquer une châtaigne ? 🌰😇' : 'On est trop bien placés 😊', 3.2);
        if (S > 38 && une('o2')) fouleDit('Magnifique ! 👏');
        if (S > 46.5 && une('bug')) { luiDit('Attends… il se passe quoi là ?? 😮', 3); AV.audio.erreur(); }
        if (S > 50) lancerComete();
      } else if (phase === 'chercher' || phase === 'trace') { mode = 4; inten = 1; glitch = phase === 'chercher' ? Math.max(0, 1 - tPhase * 2) : 0; }
      else if (phase === 'projection') { mode = 4; inten = 0.7; }
      else if (phase === 'final') { mode = 5; inten = 1; U.uTxt.value = lisse(1, 3, tPhase); }
      else if (phase === 'fin') { mode = 5; inten = 0.9; U.uTxt.value = 1; }
      U.uMode.value = mode; U.uK.value = Math.max(0, Math.min(1, k)); U.uGlitch.value = glitch;
      U.uInt.value = AV.lerp(U.uInt.value, inten, Math.min(1, dt * 3));
      // la façade éclaire un peu la place
      var cl = lumProj.color;
      if (mode === 0) cl.set('#ffd090'); else if (mode === 1) cl.set('#ffc070'); else if (mode === 2 || mode === 5) cl.setHSL((t * 0.12) % 1, 0.8, 0.6);
      else if (mode === 3) cl.setHSL(0.58 + Math.sin(t) * 0.08, 0.7, 0.6); else cl.set('#5070ff');
      lumProj.intensity = (mode === 0 ? 0.3 : mode === 4 ? 0.5 : 1.4) * U.uInt.value * (mode === 1 ? Math.min(1, k * 1.5) : 1);
      // les candélabres baissent pendant le spectacle
      kLampe = AV.lerp(kLampe, phase === 'place' || phase === 'fin' ? 1 : 0.3, Math.min(1, dt * 1.5));
      matLampe.color.set('#ffe2a0').multiplyScalar(0.25 + 0.75 * kLampe);
      lumRue[0].intensity = lumRue[1].intensity = 0.9 * kLampe; lumRue[2].intensity = 0.8 * kLampe;

      // la comète
      if (cometeT >= 0 && comete.visible) {
        cometeT += dt;
        var kc = Math.min(1, cometeT / 4.5), ke = kc * kc * (3 - 2 * kc);
        bezier(ke, comete.position);
        var pul = kc >= 1 ? 1 + Math.sin(t * 6) * 0.25 : 1;
        auraC.scale.setScalar(4.2 * pul); coeurC.scale.setScalar(1.4 * pul);
        for (var ti = NT - 1; ti > 0; ti--) { tPos[ti * 3] = tPos[(ti - 1) * 3]; tPos[ti * 3 + 1] = tPos[(ti - 1) * 3 + 1]; tPos[ti * 3 + 2] = tPos[(ti - 1) * 3 + 2]; }
        tPos[0] = comete.position.x; tPos[1] = comete.position.y; tPos[2] = comete.position.z;
        tGeo.attributes.position.needsUpdate = true;
        if (kc < 1 && Math.random() < 0.5) gerbe(comete.position, 2, 1.5);
        if (kc >= 1 && Math.random() < 0.15) gerbe(comete.position, 1, 1);
        if (phase === 'chercher') cibleRegard.copy(comete.position);
      }
      if (phase === 'chercher') {
        if (cometeT > 4.5 && regardImm() > Math.cos(0.3)) { regardT += dt; if (regardT > 0.6) declencher(); } else regardT = 0;
        if (tPhase > 7 && une('r1')) { luiDit('Regarde, la lumière ! Elle est partie par là 👉', 3.4); L.pointe = 3; }
        if (tPhase > 18 && une('r2')) { luiDit('Là !! Sur l\'immeuble, à droite ! 😮', 3.4); L.pointe = 3; }
        if (tPhase > 28 && une('r3')) vue.viser = { lacet: lacetVers(CENTRE_IMM.x, CENTRE_IMM.z), tangage: tangageVers(CENTRE_IMM.x, CENTRE_IMM.y, CENTRE_IMM.z) };
      }
      if (phase === 'trace') {
        cadre3D.forEach(function (m, i) { var a = lisse(i * 0.16, i * 0.16 + 0.4, tPhase); m.visible = a > 0.01; m.material.opacity = a; });
        if (tPhase > 2.6) lancerProjection();
      } else if (phase === 'projection' || phase === 'final') {
        cadre3D.forEach(function (m, i) {
          m.material.color.setHSL((t * 0.08 + i * 0.05) % 1, 0.8, 0.65);
          m.material.opacity = phase === 'projection' ? 0.55 + 0.3 * Math.sin(t * 2 + i) : Math.max(0, 1 - tPhase / 3);
          m.visible = m.material.opacity > 0.01;
        });
      }
      if (phase === 'projection') { mediaReste -= dt; if (mediaReste <= 0) montrer(idx + 1); }
      if (phase === 'final') {
        if (tPhase > 8.5 && une('f1')) { vue.viser = { lacet: lacetVers(L.x, L.z), tangage: tangageVers(L.x, 1.62, L.z) }; L.regard = { x: SPOT.x, z: SPOT.z }; cibleRegard.set(SPOT.x, 1.6, SPOT.z); }
        if (tPhase > 10 && une('f2')) { luiDit('Je t\'aime ❤', 3); for (var hc = 0; hc < 6; hc++) coeur(L.x, 1.9 + hc * 0.12, L.z); AV.audio.bisou(); }
        if (tPhase > 13.5) terminer();
      }

      // la foule
      for (var gi = 0; gi < gens.length; gi++) {
        var g = gens[gi], pe = g.p, ph = t * 0.9 + g.phase;
        var voulu = Math.atan2(cibleRegard.x - g.x, cibleRegard.z - g.z), dif = AV.angleLerp(0, voulu - g.rot, 1);
        if (Math.abs(dif) > 1.0 && phase !== 'place') { g.rot = AV.angleLerp(g.rot, voulu, Math.min(1, dt * 0.8)); dif = AV.angleLerp(0, voulu - g.rot, 1); }
        pe.groupe.rotation.y = g.rot;
        pe.tete.rotation.y = AV.lerp(pe.tete.rotation.y, Math.max(-1, Math.min(1, dif)), Math.min(1, dt * 3));
        pe.tete.rotation.x = phase === 'place' ? 0 : -0.22;
        pe.corps.rotation.z = Math.sin(ph) * 0.02;
        var filme = g.o.tel && phase !== 'place' && phase !== 'fin' && Math.sin(ph * 0.2 + gi) > -0.2;
        if (pe.tel) pe.tel.visible = filme;
        var kb = Math.min(1, dt * 4);
        if (acclame > 0 && !filme) {
          pe.bras[0].rotation.x = AV.lerp(pe.bras[0].rotation.x, -2.7 + Math.sin(ph * 5) * 0.2, kb);
          pe.bras[1].rotation.x = AV.lerp(pe.bras[1].rotation.x, -2.7 + Math.cos(ph * 5) * 0.2, kb);
        } else {
          pe.bras[0].rotation.x = AV.lerp(pe.bras[0].rotation.x, 0, kb);
          pe.bras[1].rotation.x = AV.lerp(pe.bras[1].rotation.x, filme ? -1.9 : 0, kb);
        }
        if (g.o.enfant) pe.groupe.position.y = acclame > 0 ? Math.abs(Math.sin(ph * 6)) * 0.2 : 0;
      }
      if (acclame > 0) acclame -= dt;

      // Axel, elle et ses châtaignes
      majLui(dt, t, jp);
      itLui.x = L.x; itLui.z = L.z;
      if (marrons && J && !mo.pilote) J.parts.brasD.rotation.x = -0.85;

      // le tram
      if (tramX == null) { if (phase === 'place') { tramAttente -= dt; if (tramAttente <= 0) { tramX = -tramSens * 90; tramSonne = false; } } }
      else {
        tramX += tramSens * 10 * dt; tram.position.x = tramX;
        if (!tramSonne && Math.abs(tramX) < 50) { tramSonne = true; AV.audio.tram(); }
        if (tramX * tramSens > 90) { tramX = null; tram.position.x = -500; tramAttente = 32; tramSens = -tramSens; }
      }

      // petits détails
      jets.forEach(function (j, i) { j.material.opacity = 0.35 + Math.sin(t * 9 + i * 2) * 0.1; });
      if (phase === 'place') { anneau.material.opacity = 0.55 + Math.sin(t * 3) * 0.25; etincelle.position.y = 2.4 + Math.sin(t * 2) * 0.15; }
      else { anneau.material.opacity = AV.lerp(anneau.material.opacity, 0, Math.min(1, dt * 3)); etincelle.visible = false; }
      for (var bI = bulles.length - 1; bI >= 0; bI--) {
        var sb = bulles[bI]; sb.userData.vie -= dt; sb.position.y += dt * 0.15; sb.material.opacity = Math.min(1, sb.userData.vie * 2);
        if (sb.userData.vie <= 0) { G.remove(sb); AV.detruire(sb); bulles.splice(bI, 1); }
      }
      for (var cI = coeurs.length - 1; cI >= 0; cI--) {
        var co = coeurs[cI]; co.t += dt; co.s.position.y += dt * 0.6; co.s.material.opacity = Math.max(0, 1 - co.t / 2.2);
        if (co.t > 2.2) { G.remove(co.s); AV.detruire(co.s); coeurs.splice(cI, 1); }
      }
      for (var ie = 0; ie < NE; ie++) {
        if (eVie[ie] <= 0) continue;
        eVie[ie] -= dt; eVit[ie].y -= 1.6 * dt; eVit[ie].multiplyScalar(1 - dt * 0.8);
        ePos[ie * 3] += eVit[ie].x * dt; ePos[ie * 3 + 1] += eVit[ie].y * dt; ePos[ie * 3 + 2] += eVit[ie].z * dt;
        if (eVie[ie] <= 0) ePos[ie * 3 + 1] = -50;
      }
      eGeo.attributes.position.needsUpdate = true;
    });
    mo.surCamera = function (camera) { if (ecran.style.display === 'block') placerEcran(camera); };

    // ---------- Début, conseils, nettoyage ----------
    mo.debut = function (a) {
      api = a;
      J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (J && !cornet) {
        cornet = new THREE.Group();
        var cp = AV.maille(new THREE.ConeGeometry(0.11, 0.3, 8), '#efe2c6', false); cp.rotation.x = Math.PI; cornet.add(cp);
        for (var m = 0; m < 4; m++) { var ma = AV.maille(new THREE.IcosahedronGeometry(0.045, 0), '#6a3a1a', false); ma.position.set((m % 2 - 0.5) * 0.07, 0.15 + (m > 1 ? 0.03 : 0), m > 1 ? 0.03 : -0.03); cornet.add(ma); }
        cornet.position.set(0, -0.7, 0.06); cornet.visible = false; J.parts.brasD.add(cornet);
      }
      sousTitre('✨ Cœur de Ville en Lumières · trouve une bonne place devant l\'Opéra');
      if (AV.jeu && AV.jeu.camera) AV.jeu.camera(0, 0.3, 6.5);
      setTimeout(function () { if (vivant && phase === 'place') luiDit('Waouh, il y a un monde fou ce soir ! 🤩'); }, 1500);
    };
    mo.astuce = function () {
      if (note) return note.t;
      if (phase === 'place') {
        if (Math.floor(tps / 8) % 3 === 1 && !marrons) return '🌰 Ça sent les châtaignes grillées… le marchand est sur la gauche';
        return '✨ Va te placer devant les Trois Grâces, dans le cercle doré, face à l\'Opéra';
      }
      if (phase === 'compte') return '✨ Le spectacle va commencer…';
      if (phase === 'spectacle') { var n = S < 20 ? 1 : S < 36 ? 2 : 3; return TAB[n] + (S - [0, 4, 20, 36][n] < 5 ? ' · glisse pour regarder autour' : ''); }
      if (phase === 'chercher') {
        if (cometeT < 4.5) return '😮 Une lumière s\'échappe de l\'Opéra !';
        var dl = AV.angleLerp(0, lacetVers(CENTRE_IMM.x, CENTRE_IMM.z) - vue.lacet, 1);
        return Math.abs(dl) < 0.5 ? '✨ Elle est là ! Regarde-la bien…' : dl < 0 ? '👉 Suis la lumière : elle est partie à droite !' : '👈 Suis la lumière : elle est partie à gauche !';
      }
      if (phase === 'trace') return '✨ …';
      if (phase === 'projection') return besoinSon ? '🔊 Touche l\'écran pour avoir le son' : medias.length > 1 ? '🎬 ' + (idx + 1) + ' / ' + medias.length + ' · ✋ suivante' : '🎬 ✋ passer';
      return null;
    };
    mo.nettoyer = function () {
      vivant = false;
      document.removeEventListener('touchend', geste, true); document.removeEventListener('click', geste, true);
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) { }
      if (ecran.parentNode) ecran.parentNode.removeChild(ecran);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (J) { J.groupe.visible = true; J.ombre.visible = true; if (cornet) { J.parts.brasD.remove(cornet); AV.detruire(cornet); cornet = null; } }
      AV.audio.sourdine(false);
    };
    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { phase: phase, S: +S.toFixed(1), tPhase: +tPhase.toFixed(1), idx: idx, medias: medias.length, marrons: marrons, regard: +regardImm().toFixed(2), lacet: +vue.lacet.toFixed(2), gens: gens.length, ecran: ecran.style.display + '/' + ecran.style.visibility }; },
      place: function () { if (AV.jeu) AV.jeu.placer(SPOT.x, SPOT.z + 0.5, Math.PI); },
      commencer: function () { commencer(); },
      aller: function (s) { S = s; },
      comete: function () { if (phase === 'compte' || phase === 'spectacle') { phase = 'spectacle'; S = 50.1; } },
      regarder: function () { vue.viser = null; vue.lacet = lacetVers(CENTRE_IMM.x, CENTRE_IMM.z); vue.tangage = tangageVers(CENTRE_IMM.x, CENTRE_IMM.y, CENTRE_IMM.z); },
      suivante: function () { montrer(idx + 1); },
      finir: function () { finProjection(); },
      chataignes: function () { itChat.fn(); }
    };
    return mo;
  };

})(window.AV);
