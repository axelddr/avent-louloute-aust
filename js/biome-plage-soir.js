/* Biome « plage_soir » : pique-nique en amoureux sur la plage, au coucher du soleil (Méditerranée, mer au sud = +z).
   Lui est assis sur le plaid. ✋ près du plaid pour déballer le pique-nique, puis 3 épreuves :
   1) les mouettes viennent voler la nourriture → cours vers elles et ✋ pour les chasser ;
   2) le soleil se couche, les moustiques arrivent des dunes → ✋ près d'un essaim pour le claquer ;
   3) les deux à la fois.
   3 vols (ou 3 piqûres) = on recommence l'épreuve, un peu plus lente. Ensuite Edith arrive de la mer en volant
   avec un petit mot dans le bec : ✋ pour le prendre → surprise de jours.js. */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var CIEL = { haut: '#5b8fd0', bas: '#ffcf8a', brouillard: '#f6c99a', hemi: ['#ffe0b8', '#c9a070', 0.85], soleil: ['#ffc890', 1.0, [-0.55, 0.22, 0.8]] };
  var PIC = { x: 0, z: 1.5 };                 // centre du plaid
  var YEAU = -0.42;
  function lisse(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function varier(hex, x, z, amp) { return AV.outils.varier(hex, x, z, amp); }
  function auHasard(l) { return l[Math.floor(Math.random() * l.length)]; }
  var cA = new THREE.Color(), cB = new THREE.Color();
  function degrade(l, k, out) { // 3 couleurs, k 0..1
    if (k < 0.5) { cA.set(l[0]); cB.set(l[1]); out.copy(cA).lerp(cB, k * 2); }
    else { cA.set(l[1]); cB.set(l[2]); out.copy(cA).lerp(cB, (k - 0.5) * 2); }
    return out;
  }

  // ---------- Relief ----------
  function sol(x, z) {
    var h;
    if (z <= 5) h = 0.03 * Math.sin(x * 0.7 + z * 0.4) * Math.sin(z * 0.9 - x * 0.3);
    else if (z <= 40) h = -(z - 5) * 0.075;
    else h = -2.6 - (z - 40) * 0.03;
    // les dunes derrière la plage
    var d = lisse(-7, -16, z);
    h += d * (2.2 + 0.6 * Math.sin(x * 0.13) + 0.4 * Math.sin(x * 0.31 + 1) * Math.cos(z * 0.2));
    h -= lisse(-24, -40, z) * 0.8;
    h += lisse(-150, -500, z) * 40 * (0.6 + 0.4 * Math.sin(x * 0.006));
    // le mont Saint-Clair au loin à l'ouest, posé sur la mer
    var ax = x + 950, az = z - 60; h += 150 * Math.exp(-(ax * ax + az * az) / (240 * 240));
    return h;
  }
  function couleurSol(x, y, z, ny) {
    if (y > 8) return varier(ny < 0.85 ? '#7f8a5a' : '#6f8a4a', x, z, 0.1);
    if (y < YEAU - 0.1) return varier('#b89a72', x, z, 0.05);
    if (z > 8.5 && z < 12) return varier('#c9ab80', x, z, 0.05); // sable mouillé
    if (z < -9) { var k = hash(Math.floor(x / 2), Math.floor(z / 2)); return varier(k > 0.55 ? '#a8a86a' : '#e0c690', x, z, 0.06); }
    return varier('#ead2a2', x, z, 0.05);
  }
  function terrainZone(cx, cz, lx, lz, sx, sz, puits) {
    var geo = new THREE.PlaneGeometry(lx, lz, sx, sz); geo.rotateX(-Math.PI / 2);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i) + cx, z = p.getZ(i) + cz;
      p.setX(i, x); p.setZ(i, z); p.setY(i, sol(x, z) - (puits ? puits(x, z) : 0));
    }
    var g = geo.toNonIndexed(); g.computeVertexNormals();
    var pa = g.attributes.position, no = g.attributes.normal, cols = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (var f = 0; f < pa.count; f += 3) {
      var mx = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, mz = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
      c.copy(couleurSol(mx, my, mz, no.getY(f)));
      for (var k = 0; k < 3; k++) { cols[(f + k) * 3] = c.r; cols[(f + k) * 3 + 1] = c.g; cols[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    return m;
  }
  function puitsDans(x0, x1, z0, z1, marge, prof) {
    return function (x, z) { var d = Math.min(x - x0, x1 - x, z - z0, z1 - z); return d <= 0 ? 0 : lisse(0, marge, d) * prof; };
  }

  // ---------- Petits outils ----------
  var matT = new THREE.MeshLambertMaterial();
  function forme(F, geo, col, x, y, z, ry, sx, sy, sz, rx, rz) {
    var o = new THREE.Mesh(AV.facettes(geo), matT);
    matT.color.set(col); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx) o.scale.set(sx, sy, sz);
    F.ajouter(o); o.geometry.dispose();
  }
  function boite(F, l, h, p, col, x, y, z, ry) { forme(F, new THREE.BoxGeometry(l, h, p), col, x, y, z, ry || 0, 1, 1, 1); }
  function bm(l, h, p, c, x, y, z) { var m = AV.maille(new THREE.BoxGeometry(l, h, p), c); m.position.set(x, y, z); return m; }

  // ---------- Lui (chemise de lin, short) ----------
  function fabriquerLui() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var jambes = [];
    [-1, 1].forEach(function (c) {
      var j = new THREE.Group(); j.position.set(c * 0.1, 0.8, 0); g.add(j);
      j.add(bm(0.17, 0.4, 0.19, '#4a6a8a', 0, -0.2, 0));
      j.add(bm(0.13, 0.4, 0.14, '#eec29a', 0, -0.58, 0));
      j.add(bm(0.15, 0.06, 0.25, '#3a3a3a', 0, -0.8, 0.05));
      jambes.push(j);
    });
    var t = AV.maille(new THREE.CylinderGeometry(0.21, 0.25, 0.64, 8), '#f2ede0'); t.position.y = 1.11; corps.add(t);
    var tete = new THREE.Group(); tete.position.y = 1.62; corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.17, 1), '#eec29a'));
    var ch = AV.maille(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), '#4a3426'); ch.position.set(0, 0.03, -0.01); tete.add(ch);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.025, 5, 4), '#2b2340', false); o.position.set(c * 0.06, 0.0, 0.152); tete.add(o); });
    var bouche = AV.maille(new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI), '#8a4a3a', false); bouche.position.set(0, -0.06, 0.155); bouche.rotation.z = Math.PI; tete.add(bouche);
    AV.avatars.coiffer(tete, 'axel', { retirer: '#4a3426' });
    var bras = [];
    [-1, 1].forEach(function (c) {
      var b = new THREE.Group(); b.position.set(c * 0.29, 1.38, 0); b.rotation.z = c * 0.1; corps.add(b);
      var m = AV.maille(new THREE.CylinderGeometry(0.07, 0.065, 0.55, 6), '#eec29a'); m.position.y = -0.28; b.add(m);
      var manche = AV.maille(new THREE.CylinderGeometry(0.085, 0.08, 0.3, 6), '#f2ede0'); manche.position.y = -0.12; b.add(manche);
      var mn = AV.maille(new THREE.IcosahedronGeometry(0.06, 0), '#eec29a'); mn.position.y = -0.6; b.add(mn);
      bras.push(b);
    });
    var verre = new THREE.Group();
    var vv = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.12, 8), new THREE.MeshLambertMaterial({ color: '#d8ecf2', transparent: true, opacity: 0.6 })); vv.position.y = 0.1; verre.add(vv);
    var vin = AV.maille(new THREE.CylinderGeometry(0.042, 0.033, 0.06, 8), '#f7a8a0', false); vin.position.y = 0.07; verre.add(vin);
    verre.position.y = -0.64; bras[1].add(verre);
    return { groupe: g, corps: corps, bras: bras, tete: tete, jambes: jambes, verre: verre };
  }

  // ---------- Mouette ----------
  function fabriquerMouette() {
    var g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
    var b = AV.maille(new THREE.IcosahedronGeometry(0.16, 1), '#f7f7f4'); b.scale.set(0.85, 0.8, 1.6); b.position.set(0, 0.3, 0); corps.add(b);
    var dos = AV.maille(new THREE.IcosahedronGeometry(0.13, 1), '#a9b0b8'); dos.scale.set(0.95, 0.5, 1.5); dos.position.set(0, 0.37, -0.04); corps.add(dos);
    var tete = new THREE.Group(); tete.position.set(0, 0.46, 0.2); corps.add(tete);
    tete.add(AV.maille(new THREE.IcosahedronGeometry(0.09, 1), '#ffffff'));
    var bec = AV.maille(new THREE.ConeGeometry(0.025, 0.12, 5), '#f2c230'); bec.rotation.x = Math.PI / 2; bec.position.set(0, -0.01, 0.13); tete.add(bec);
    var pt = AV.maille(new THREE.IcosahedronGeometry(0.014, 0), '#d8342a', false); pt.position.set(0, -0.025, 0.15); tete.add(pt);
    [-1, 1].forEach(function (c) { var o = AV.maille(new THREE.SphereGeometry(0.016, 5, 4), '#1a1a1a', false); o.position.set(c * 0.06, 0.02, 0.05); tete.add(o); });
    var q = AV.maille(new THREE.ConeGeometry(0.07, 0.18, 4), '#ffffff'); q.rotation.x = -Math.PI / 2; q.position.set(0, 0.32, -0.3); corps.add(q);
    var ailes = [], pattes = [];
    [-1, 1].forEach(function (c) {
      var pv = new THREE.Group(); pv.position.set(c * 0.11, 0.37, 0); corps.add(pv);
      var a = AV.maille(new THREE.BoxGeometry(0.55, 0.02, 0.2), '#a9b0b8'); a.position.set(c * 0.27, 0, 0); pv.add(a);
      var bout = AV.maille(new THREE.BoxGeometry(0.13, 0.022, 0.16), '#2a2a2a'); bout.position.set(c * 0.5, 0, -0.02); pv.add(bout);
      ailes.push(pv);
      var p = AV.maille(new THREE.CylinderGeometry(0.013, 0.013, 0.18, 4), '#e8963a', false); p.position.set(c * 0.05, 0.09, 0); corps.add(p); pattes.push(p);
    });
    g.scale.setScalar(1.25);
    return { groupe: g, corps: corps, tete: tete, ailes: ailes, pattes: pattes };
  }

  // =====================================================================
  AV.biomes.plage_soir = function (cfg) {
    var rng = AV.rng(1414 + cfg.jour);
    var nomLui = cfg.copain || 'Axel';
    var mo = new AV.Monde({
      rayon: 26, hauteur: sol, surface: 'sable', ciel: CIEL, brouillard: [90, 1700],
      depart: { x: 0.6, z: -4.5, angle: 0 }, theme: 'plage_soir', ambiance: 'vagues'
    });
    mo.loin = 3200;
    mo.sansAnimal = true;
    var G = mo.groupe, col = mo.colliders;

    // ---------- Ciel : dégradé + lueur du soleil, qui évolue avec le coucher ----------
    var uCiel = {
      haut: { value: new THREE.Color(CIEL.haut) }, bas: { value: new THREE.Color(CIEL.bas) },
      sd: { value: new THREE.Vector3(-0.55, 0.12, 0.8).normalize() }, sc: { value: new THREE.Color('#ffd9a0') }
    };
    var cielM = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
      uniforms: uCiel, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 haut; uniform vec3 bas; uniform vec3 sd; uniform vec3 sc; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.8 + 0.08, 0.0, 1.0); vec3 c = mix(bas, haut, pow(h, 0.6)); float d = max(dot(vP, sd), 0.0); c += sc * (pow(d, 6.0) * 0.45 + pow(d, 60.0) * 0.5) * (1.0 - h * 0.6); gl_FragColor = vec4(c, 1.0); }'
    }));
    cielM.renderOrder = -10; cielM.frustumCulled = false; G.add(cielM);
    var etoiles = AV.etoiles(500, 380); etoiles.material.opacity = 0; etoiles.renderOrder = -9; G.add(etoiles);
    var disque = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshBasicMaterial({ color: '#ffe0a0', fog: false }));
    disque.renderOrder = -8; G.add(disque);
    var haloS = AV.halo('#ffb070', 140); haloS.material.fog = false; haloS.material.opacity = 0.5; G.add(haloS);

    // ---------- Terrain, mer ----------
    G.add(terrainZone(0, -8, 150, 80, 100, 60, null));
    G.add(terrainZone(0, 0, 3200, 3200, 140, 140, puitsDans(-75, 75, -48, 32, 6, 3)));
    var eau = AV.eau(280, 130, 56, 26, '#3c7fa6', 0.86); eau.position.set(0, YEAU, 75); G.add(eau);
    var merLoin = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshPhongMaterial({ color: '#3c7fa6', shininess: 60, specular: '#ffffff' }));
    merLoin.rotation.x = -Math.PI / 2; merLoin.position.set(0, YEAU - 0.2, 3512); G.add(merLoin);
    // reflet du soleil sur l'eau
    var reflet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffb46a', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    reflet.rotation.x = -Math.PI / 2; G.add(reflet);
    // l'écume qui va et vient
    var ecume = new THREE.Mesh(new THREE.PlaneGeometry(300, 1.4, 60, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
    ecume.rotation.x = -Math.PI / 2; G.add(ecume);
    mo.anime(function (dt, t) { eau.userData.maj(dt, t); });
    mo.colliders.push({ rect: true, x: 0, z: 12.6, hx: 80, hz: 1, a: 0 }); // on ne part pas à la nage

    // ---------- Décor : dunes, ganivelles, caillebotis, poste de secours, jetée et phare ----------
    var D = new AV.Fusion();
    for (var n = 0; n < 420; n++) { // oyats
      var ox = AV.entre(rng, -70, 70), oz = AV.entre(rng, -40, -8.5);
      if (Math.abs(ox - 5) < 1.4 && oz > -24) continue;
      var oy = sol(ox, oz), oh = AV.entre(rng, 0.4, 0.9);
      forme(D, new THREE.ConeGeometry(0.25, oh, 4), AV.choisir(rng, ['#b8b070', '#a6a862', '#c9c07e']), ox, oy + oh / 2, oz, rng() * 3, 1, 1, 1);
    }
    for (var gx = -60; gx <= 60; gx += 0.45) { // ganivelles
      if (gx > 3.8 && gx < 6.2) continue;
      var gz = -8.6 + Math.sin(gx * 0.08) * 0.4, gy = sol(gx, gz);
      boite(D, 0.07, 0.9 + hash(gx, 1) * 0.15, 0.04, '#a88a62', gx, gy + 0.45, gz, rng() * 0.2);
      if (Math.round(gx / 0.45) % 6 === 0) boite(D, 0.08, 1.1, 0.08, '#8a6e4a', gx, gy + 0.55, gz);
    }
    for (var cz = -24; cz < -2; cz += 0.36) boite(D, 1.4, 0.05, 0.28, '#b89468', 5, sol(5, cz) + 0.05, cz); // caillebotis
    // poste de secours sur pilotis
    var PS = { x: 15, z: -3 }, yPS = sol(PS.x, PS.z);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) { boite(D, 0.14, 2.2, 0.14, '#d8d8d8', PS.x + p[0] * 1.1, yPS + 1.1, PS.z + p[1] * 1.1); });
    boite(D, 2.8, 0.15, 2.8, '#c9c9c9', PS.x, yPS + 2.25, PS.z);
    boite(D, 2.4, 1.8, 2.4, '#3a78b8', PS.x, yPS + 3.2, PS.z);
    boite(D, 2.42, 0.4, 2.42, '#ffffff', PS.x, yPS + 3.7, PS.z);
    boite(D, 2.9, 0.15, 2.9, '#e8e8e8', PS.x, yPS + 4.2, PS.z);
    boite(D, 1.2, 0.7, 0.05, '#bfe0f0', PS.x, yPS + 3.2, PS.z + 1.22);
    for (var e = 0; e < 8; e++) boite(D, 0.6, 0.06, 0.3, '#c9c9c9', PS.x - 1.6, yPS + 0.2 + e * 0.27, PS.z + 0.6 - e * 0.25);
    boite(D, 0.05, 2.5, 0.05, '#e0e0e0', PS.x + 1.3, yPS + 5.4, PS.z + 1.3);
    col.push({ rect: true, x: PS.x, z: PS.z, hx: 1.3, hz: 1.3, a: 0 });
    // la jetée en enrochement et son phare
    for (var j = 0; j < 70; j++) {
      var jz = 4 + j * 0.5, jx = -34 + AV.entre(rng, -0.8, 0.8), js = AV.entre(rng, 0.7, 1.2);
      forme(D, new THREE.DodecahedronGeometry(js, 0), AV.choisir(rng, ['#8e8a84', '#7d7a74', '#a19c94']), jx, Math.max(sol(jx, jz), YEAU) + js * 0.3, jz, rng() * 3, 1, AV.entre(rng, 0.6, 0.9), 1);
    }
    col.push({ rect: true, x: -34, z: 13, hx: 1.6, hz: 9, a: 0 });
    var yPh = -0.2;
    forme(D, new THREE.CylinderGeometry(1.0, 1.25, 8, 10), '#f4f4f4', -34, yPh + 4, 38.5, 0, 1, 1, 1);
    forme(D, new THREE.CylinderGeometry(1.02, 1.1, 1.6, 10), '#d33a30', -34, yPh + 5.5, 38.5, 0, 1, 1, 1);
    forme(D, new THREE.CylinderGeometry(0.75, 0.75, 1.1, 10), '#3a3a3a', -34, yPh + 8.6, 38.5, 0, 1, 1, 1);
    forme(D, new THREE.ConeGeometry(0.95, 0.9, 10), '#d33a30', -34, yPh + 9.6, 38.5, 0, 1, 1, 1);
    // au loin vers l'est : les pyramides de la côte
    [[620, -14, 30], [680, -24, 42], [745, -10, 26], [800, -30, 36]].forEach(function (p) { var yb = sol(p[0], p[1]); forme(D, new THREE.ConeGeometry(p[2] * 0.7, p[2], 4), '#e8e0d0', p[0], yb + p[2] / 2, p[1], Math.PI / 4, 1, 1, 0.6); });
    // la pinède derrière les dunes
    for (var pp = 0; pp < 260; pp++) {
      var px = AV.entre(rng, -400, 400), pz = AV.entre(rng, -260, -48), py = sol(px, pz), ph = AV.entre(rng, 6, 10);
      forme(D, new THREE.CylinderGeometry(0.2, 0.3, ph, 5), '#7a5238', px, py + ph / 2, pz, 0, 1, 1, 1);
      forme(D, new THREE.IcosahedronGeometry(1, 0), AV.choisir(rng, ['#4a6a3a', '#3f5e33']), px, py + ph, pz, rng() * 3, ph * 0.32, ph * 0.16, ph * 0.32);
    }
    // affaires de plage : parasol replié, serviette, château de sable, coquillages, bois flotté
    boite(D, 0.05, 2.0, 0.05, '#ffffff', 2.3, 1.0, 0.2); forme(D, new THREE.ConeGeometry(0.18, 1.2, 8), '#3a8ad0', 2.3, 1.55, 0.2, 0, 1, 1, 1);
    boite(D, 0.9, 0.02, 1.8, '#f0c040', 2.0, 0.02, 2.3, 0.15); for (var r2 = 0; r2 < 4; r2++) boite(D, 0.9, 0.021, 0.12, '#e0503a', 2.0 + Math.sin(0.15) * (r2 * 0.45 - 0.7), 0.025, 2.3 + Math.cos(0.15) * (r2 * 0.45 - 0.7), 0.15);
    var cx2 = 3.6, cz2 = 5.2;
    forme(D, new THREE.CylinderGeometry(0.5, 0.6, 0.35, 8), '#d9bc88', cx2, 0.17, cz2, 0, 1, 1, 1);
    [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(function (p) { forme(D, new THREE.CylinderGeometry(0.13, 0.16, 0.6, 6), '#d4b682', cx2 + p[0], 0.3, cz2 + p[1], 0, 1, 1, 1); forme(D, new THREE.ConeGeometry(0.14, 0.2, 6), '#d4b682', cx2 + p[0], 0.7, cz2 + p[1], 0, 1, 1, 1); });
    forme(D, new THREE.CylinderGeometry(0.2, 0.25, 0.75, 7), '#d9bc88', cx2, 0.55, cz2, 0, 1, 1, 1);
    boite(D, 0.01, 0.12, 0.08, '#e83a4a', cx2, 1.05, cz2); boite(D, 0.01, 0.3, 0.01, '#8a6a4a', cx2, 0.98, cz2 - 0.04);
    col.push({ x: cx2, z: cz2, r: 0.75 });
    for (var co = 0; co < 60; co++) { var sx = AV.entre(rng, -25, 25), sz = AV.entre(rng, -6, 10); forme(D, new THREE.IcosahedronGeometry(0.05, 0), AV.choisir(rng, ['#fff4e8', '#f0c8b0', '#e8dccc', '#c8a8a0']), sx, sol(sx, sz) + 0.02, sz, rng() * 3, 1, 0.5, 1.2); }
    forme(D, new THREE.CylinderGeometry(0.09, 0.12, 2.4, 5), '#b8a88e', -6, sol(-6, 7) + 0.08, 7, 0.6, 1, 1, 1, 0, Math.PI / 2);
    var decor = D.maille(); decor.castShadow = true; decor.receiveShadow = true; G.add(decor);
    var lampePhare = AV.halo('#fff2b0', 6); lampePhare.position.set(-34, yPh + 8.6, 38.5); lampePhare.material.opacity = 0; G.add(lampePhare);

    // ---------- Le pique-nique ----------
    var P = new AV.Fusion();
    for (var ix = 0; ix < 8; ix++) for (var iz = 0; iz < 6; iz++) boite(P, 0.3, 0.02, 0.3, (ix + iz) % 2 ? '#d8423a' : '#f6efe6', PIC.x - 1.05 + ix * 0.3, 0.03, PIC.z - 0.75 + iz * 0.3);
    // panier
    boite(P, 0.55, 0.32, 0.38, '#b0804a', -0.95, 0.2, 2.15); boite(P, 0.57, 0.04, 0.4, '#8a5e34', -0.95, 0.37, 2.15);
    forme(P, new THREE.TorusGeometry(0.2, 0.025, 4, 10, Math.PI), '#8a5e34', -0.95, 0.38, 2.15, 0, 1, 1, 1);
    // rosé + verre d'elle, bougie à la citronnelle
    forme(P, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), '#f4a8a0', -0.3, 0.19, 1.05, 0, 1, 1, 1);
    forme(P, new THREE.CylinderGeometry(0.02, 0.025, 0.1, 6), '#2a5a3a', -0.3, 0.39, 1.05, 0, 1, 1, 1);
    forme(P, new THREE.CylinderGeometry(0.045, 0.03, 0.12, 8), '#f7c0b8', 0.6, 0.1, 0.75, 0, 1, 1, 1);
    forme(P, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), '#e8d870', -0.55, 0.09, 2.2, 0, 1, 1, 1);
    var pique = P.maille(); pique.receiveShadow = true; G.add(pique);
    col.push({ x: -0.95, z: 2.15, r: 0.35 });
    var flamme = AV.halo('#ffcf70', 0.6); flamme.position.set(-0.55, 0.22, 2.2); flamme.material.opacity = 0; G.add(flamme);
    // la nourriture (ce que les mouettes convoitent)
    var ALIMENTS = [];
    function aliment(nom, emoji, x, z, fab) {
      var g = new THREE.Group(); fab(g); g.position.set(x, 0.04, z); G.add(g);
      var a = { nom: nom, emoji: emoji, g: g, home: new THREE.Vector3(x, 0.04, z), vole: false, pris: false };
      ALIMENTS.push(a); return a;
    }
    aliment('la baguette', '🥖', 0.55, 1.0, function (g) { var b = AV.maille(new THREE.CylinderGeometry(0.05, 0.06, 0.62, 7), '#d99a4e'); b.rotation.z = Math.PI / 2; b.rotation.y = 0.5; b.position.y = 0.05; g.add(b); });
    aliment('le fromage', '🧀', 0.12, 1.3, function (g) { var f = AV.maille(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 3), '#f2d36a'); f.position.y = 0.045; g.add(f); var p = AV.maille(new THREE.BoxGeometry(0.3, 0.02, 0.24), '#a8784a'); p.position.y = 0.0; g.add(p); });
    aliment('le raisin', '🍇', 0.85, 1.6, function (g) { for (var i = 0; i < 9; i++) { var r = AV.maille(new THREE.IcosahedronGeometry(0.035, 0), '#7a3a8a'); r.position.set((i % 3 - 1) * 0.05, 0.04 + Math.floor(i / 3) * 0.04, (i % 2) * 0.03 - Math.floor(i / 3) * 0.03); g.add(r); } });
    aliment('les fraises', '🍓', 0.35, 1.9, function (g) { var bol = AV.maille(new THREE.CylinderGeometry(0.13, 0.09, 0.08, 10), '#ffffff'); bol.position.y = 0.04; g.add(bol); for (var i = 0; i < 6; i++) { var f = AV.maille(new THREE.ConeGeometry(0.03, 0.05, 6), '#e0303a'); f.rotation.x = Math.PI; f.position.set(Math.cos(i) * 0.06, 0.1, Math.sin(i) * 0.06); g.add(f); } });
    aliment('la pastèque', '🍉', -0.15, 2.0, function (g) { for (var i = 0; i < 3; i++) { var s = AV.maille(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8, 1, false, 0, Math.PI), '#e8484a'); s.rotation.x = Math.PI / 2; s.position.set(i * 0.1 - 0.1, 0.12, 0); s.rotation.z = 0; g.add(s); var c = AV.maille(new THREE.BoxGeometry(0.24, 0.025, 0.045), '#3a7a3a'); c.position.set(i * 0.1 - 0.1, 0.0, 0); c.rotation.y = Math.PI / 2; g.add(c); } });
    aliment('les tomates', '🍅', 0.8, 2.15, function (g) { for (var i = 0; i < 4; i++) { var t = AV.maille(new THREE.IcosahedronGeometry(0.045, 1), '#e8402a'); t.position.set((i % 2) * 0.09 - 0.045, 0.045, Math.floor(i / 2) * 0.09 - 0.045); g.add(t); } });

    // ---------- Lui, assis sur le plaid ----------
    var lui = fabriquerLui(); G.add(lui.groupe);
    var LUI = { x: -0.72, z: 0.95 };
    function luiAssis() {
      lui.groupe.position.set(LUI.x, 0.14 - 0.8, LUI.z); lui.groupe.rotation.set(0, 0.25, 0);
      lui.jambes[0].rotation.set(-1.5, 0, 0.06); lui.jambes[1].rotation.set(-1.4, 0, -0.04);
      lui.corps.rotation.set(-0.18, 0, 0);
      lui.bras[0].rotation.set(0.55, 0, 0.25); lui.bras[1].rotation.set(-0.9, 0, -0.1);
    }
    luiAssis();
    col.push({ x: LUI.x, z: LUI.z + 0.3, r: 0.45 });

    // ---------- État ----------
    var VAGUES = [
      { nom: 'Les mouettes', mouettes: 5, moustiques: 0, simult: 2, ciel: [0.08, 0.3] },
      { nom: 'Les moustiques', mouettes: 0, moustiques: 6, simult: 2, ciel: [0.45, 0.62] },
      { nom: 'Mouettes et moustiques !', mouettes: 3, moustiques: 4, simult: 3, ciel: [0.68, 0.85] }
    ];
    var etat = 'attente', tEtat = 0, api = null, iV = 0, resteM = 0, resteQ = 0, vols = 0, piqures = 0, echecs = 0, tSpawn = 0, alterne = 0;
    var kCiel = 0, kCible = 0, parole = null, tGeste = 0, tBla = 6, edith = null, lettre = null, tEdith = 0, fini = false;
    var mouettes = [], essaims = [], vPos = new THREE.Vector3(), joueurP = new THREE.Vector3(0.6, 0, -4.5);
    function dire(t, d) { parole = { texte: t, t: d || 3 }; }
    function fac() { return Math.max(0.6, 1 - 0.14 * echecs); }
    function V() { return VAGUES[Math.min(iV, VAGUES.length - 1)]; }

    // ---------- Interface ----------
    var ui = null;
    function construireUI() {
      ui = document.createElement('div');
      ui.style.cssText = 'position:fixed;right:max(16px, env(safe-area-inset-right));top:calc(max(16px, env(safe-area-inset-top)) + 62px);z-index:3;pointer-events:none;font-family:Nunito,sans-serif;color:#fff;text-align:right;opacity:0;transition:opacity .4s;background:rgba(40,20,40,.45);border-radius:16px;padding:6px 16px 8px;text-shadow:0 2px 4px rgba(0,0,0,.45)';
      document.body.appendChild(ui);
    }
    var uiTxt = '';
    function majUI() {
      if (!ui) return;
      var vis = etat === 'vague' || etat === 'pause' || etat === 'rate';
      ui.style.opacity = vis ? '1' : '0';
      if (!vis) return;
      var v = V(), plats = ALIMENTS.map(function (a) { return '<span style="opacity:' + (a.vole || a.pris ? 0.22 : 1) + '">' + a.emoji + '</span>'; }).join('');
      var actM = mouettes.filter(function (m) { return m.compte; }).length, actQ = essaims.filter(function (s) { return s.compte; }).length;
      var l2 = [];
      if (v.mouettes) l2.push('🐦 ' + (resteM + actM));
      if (v.moustiques) l2.push('🦟 ' + (resteQ + actQ));
      var coeurs = ''; for (var i = 0; i < 3; i++) coeurs += i < piqures ? '🔴' : '⚪';
      var txt = '<div style="font-weight:900;font-size:16px">Épreuve ' + (iV + 1) + '/3 · ' + v.nom + '</div>' +
        '<div style="font-size:20px;letter-spacing:2px;margin-top:2px">' + plats + '</div>' +
        '<div style="font-size:14px;font-weight:700;margin-top:2px">' + l2.join(' · ') + ' à chasser' + (v.moustiques ? ' · piqûres ' + coeurs : '') + (v.mouettes ? ' · volés ' + vols + '/3' : '') + '</div>';
      if (txt !== uiTxt) { ui.innerHTML = txt; uiTxt = txt; }
    }
    function sousTitre() {
      if (!api) return;
      var st = cfg.sousTitre || '';
      if (etat === 'vague' || etat === 'pause' || etat === 'rate') st = '🧺 Protège le pique-nique · épreuve ' + (iV + 1) + '/3';
      if (etat === 'edith' || etat === 'pose') st = '🕊️ Quelqu\'un arrive de la mer…';
      if (etat === 'fini') st = '💌 Le mot d\'Edith ❤';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, st);
    }

    // ---------- Les mouettes ----------
    function nouvelleMouette() {
      var m = fabriquerMouette(), a = AV.entre(rng, -1.2, 1.2), d = AV.entre(rng, 4.2, 6.5);
      var cible = ALIMENTS.filter(function (x) { return !x.vole && !x.pris; });
      var ob = {
        m: m, g: m.groupe, etat: 'arrive', t: 0, compte: true, item: null,
        cible: cible.length ? auHasard(cible) : null,
        pos: new THREE.Vector3(PIC.x + AV.entre(rng, -30, 30), 9 + rng() * 4, 38 + rng() * 10),
        sol: new THREE.Vector3(PIC.x + Math.sin(a) * d, 0, PIC.z + Math.cos(a) * d * 0.9 + (Math.cos(a) < 0 ? -1 : 0.5)),
        v: 0.55 * fac() + (iV ? 0.08 : 0), cap: 0, ph: rng() * 6
      };
      ob.sol.y = sol(ob.sol.x, ob.sol.z);
      G.add(ob.g); ob.g.position.copy(ob.pos);
      mouettes.push(ob);
      AV.audio.mouette(borne(ob.pos.x / 30, -1, 1));
    }
    function borne(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function chasserMouette(ob) {
      if (ob.etat === 'fuit' || ob.etat === 'emporte') return;
      ob.etat = 'fuit'; ob.t = 0; ob.compte = false;
      AV.audio.mouette(0); if (ob.item) { relacher(ob.item); ob.item = null; }
    }
    function relacher(a) { G.add(a.g); a.g.position.copy(a.home); a.g.scale.setScalar(1); a.pris = false; }
    function poseVol(ob, dt, battement) {
      ob.m.ailes.forEach(function (w, i) { var c = i ? 1 : -1; w.rotation.set(0, 0, c * Math.sin(ob.ph) * battement); });
      ob.m.pattes.forEach(function (p) { p.visible = false; });
      ob.m.corps.rotation.x = 0.1;
    }
    function poseSol(ob) {
      ob.m.ailes.forEach(function (w, i) { var c = i ? 1 : -1; w.rotation.set(0, c * 1.35, -c * 0.12); });
      ob.m.pattes.forEach(function (p) { p.visible = true; });
    }
    function majMouette(ob, dt, t) {
      ob.t += dt; ob.ph += dt * 13;
      var g = ob.g;
      if (ob.etat === 'arrive') {
        vPos.copy(ob.sol).sub(ob.pos); var dist = vPos.length();
        var vit = Math.min(7, 1.2 + dist * 0.9);
        if (dist < 0.15) { ob.etat = 'marche'; ob.t = 0; poseSol(ob); }
        else { vPos.multiplyScalar(Math.min(dist, vit * dt) / dist); ob.pos.add(vPos); ob.cap = Math.atan2(vPos.x, vPos.z); poseVol(ob, dt, dist < 2 ? 0.9 : 0.55); }
      } else if (ob.etat === 'marche') {
        if (!ob.cible || ob.cible.vole || ob.cible.pris) { var c2 = ALIMENTS.filter(function (x) { return !x.vole && !x.pris; }); ob.cible = c2.length ? auHasard(c2) : null; }
        if (!ob.cible) { chasserMouette(ob); return; }
        var h = ob.cible.home, dx = h.x - ob.pos.x, dz = h.z - ob.pos.z, dd = Math.sqrt(dx * dx + dz * dz);
        var pause = Math.sin(ob.t * 1.3 + ob.ph * 0.01) > 0.75; // elle s'arrête, regarde autour
        if (dd < 0.3) { ob.etat = 'picore'; ob.t = 0; }
        else if (!pause) { ob.pos.x += dx / dd * ob.v * dt; ob.pos.z += dz / dd * ob.v * dt; ob.cap = AV.angleLerp(ob.cap, Math.atan2(dx, dz), Math.min(1, dt * 6)); }
        ob.pos.y = Math.max(sol(ob.pos.x, ob.pos.z), Math.abs(ob.pos.x - PIC.x) < 1.2 && Math.abs(ob.pos.z - PIC.z) < 0.9 ? 0.03 : -9);
        ob.m.corps.rotation.z = pause ? 0 : Math.sin(ob.t * 12) * 0.08;
        ob.m.tete.rotation.set(pause ? 0 : Math.sin(ob.t * 12) * 0.12, pause ? Math.sin(ob.t * 3) * 0.8 : 0, 0);
        ob.m.pattes.forEach(function (p, i) { p.rotation.x = pause ? 0 : Math.sin(ob.t * 12 + i * Math.PI) * 0.4; });
        if (dd < 1.6 && !ob.alerte) { ob.alerte = true; if (Math.random() < 0.7) dire('<b>' + nomLui + ' :</b> ' + auHasard(['Elle vise ' + ob.cible.nom + ' ! 😱', 'Ouste ! Pas touche à ' + ob.cible.nom + ' !', 'Vite, chasse-la ! 🐦']), 2); }
      } else if (ob.etat === 'picore') {
        ob.m.tete.rotation.x = 0.6 + Math.abs(Math.sin(ob.t * 9)) * 0.4;
        if (ob.t > 1.1 * (1 + 0.25 * echecs)) { // elle l'emporte
          var a = ob.cible; a.pris = true; ob.item = a; ob.g.add(a.g); a.g.position.set(0, 0.42, 0.46); a.g.scale.setScalar(0.55);
          ob.etat = 'emporte'; ob.t = 0; ob.compte = false; vols++;
          AV.audio.mouette(0); AV.audio.erreur();
          dire('<b>' + nomLui + ' :</b> ' + auHasard(['Nooon, ' + a.nom + ' ! 😭', 'Elle est partie avec ' + a.nom + ' !! 🐦', 'Adieu ' + a.nom + '… 😩']), 2.5);
        }
      } else { // fuit / emporte : elle s'envole vers la mer
        var dir = ob.etat === 'fuit' ? Math.atan2(ob.pos.x - joueurP.x, ob.pos.z - joueurP.z) * 0.4 : 0;
        ob.cap = AV.angleLerp(ob.cap, dir, Math.min(1, dt * 3));
        var vv = Math.min(8, 2 + ob.t * 4);
        ob.pos.x += Math.sin(ob.cap) * vv * dt; ob.pos.z += Math.cos(ob.cap) * vv * dt; ob.pos.y += (3.2 - ob.t * 0.5 > 0.6 ? 3.2 - ob.t * 0.5 : 0.6) * dt;
        poseVol(ob, dt, 0.9);
        if (ob.t > 0.05 && ob.etat === 'fuit' && ob.t < 0.1) ob.m.corps.rotation.z = 0;
        if (ob.pos.z > 60 || ob.t > 10) {
          if (ob.item) { ob.item.vole = true; ob.item.pris = false; ob.g.remove(ob.item.g); ob.item = null; }
          ob.mort = true;
        }
      }
      g.position.copy(ob.pos); g.rotation.set(0, ob.cap, 0);
    }

    // ---------- Les moustiques ----------
    var texRonde = AV.textureRonde();
    function nouvelEssaim() {
      var n = 12, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#141414', size: 0.07, map: texRonde, transparent: true, depthWrite: false }));
      pts.frustumCulled = false;
      var em = AV.texteSprite('🦟', { largeur: 0.42 });
      var a = AV.entre(rng, -2.4, 2.4), d = AV.entre(rng, 10, 14);
      var s = {
        pts: pts, em: em, n: n, ph: [], etat: 'vole', t: 0, compte: true,
        pos: new THREE.Vector3(PIC.x + Math.sin(a) * d, 1.6 + rng(), PIC.z - Math.abs(Math.cos(a)) * d),
        cible: Math.random() < 0.55 ? 'lui' : 'elle', v: (0.85 + (iV ? 0.1 : 0)) * fac(), bz: rng() * 1.5
      };
      for (var i = 0; i < n; i++) s.ph.push([rng() * 6, rng() * 6, rng() * 6, 0.15 + rng() * 0.2]);
      G.add(pts); G.add(em); essaims.push(s);
    }
    var vC = new THREE.Vector3();
    function cibleEssaim(s) {
      if (s.cible === 'lui') return vC.set(LUI.x, 0.95, LUI.z + 0.1);
      return vC.set(joueurP.x, joueurP.y + 1.45, joueurP.z);
    }
    function claquer(s) {
      if (s.etat !== 'vole') return;
      s.etat = 'mort'; s.t = 0; s.compte = false;
    }
    function majEssaim(s, dt, t) {
      s.t += dt;
      var a = s.pts.geometry.attributes.position.array, k = 1;
      if (s.etat === 'vole') {
        var c = cibleEssaim(s); vPos.copy(c).sub(s.pos); var dist = vPos.length();
        if (dist < 0.45) { // piqûre !
          piqures++; s.etat = 'part'; s.t = 0; s.compte = false;
          AV.audio.impact(0.15);
          var pq = AV.texteSprite('💢', { largeur: 0.5 }); pq.position.copy(c); pq.position.y += 0.35; G.add(pq); bulles.push({ s: pq, t: 0 });
          if (s.cible === 'lui') dire('<b>' + nomLui + ' :</b> ' + auHasard(['Aïe ! Il m\'a piqué 😩', 'Ça gratte !! 🦟', 'Aïe aïe aïe… 😖']), 2.2);
          else dire(auHasard(['Aïe ! Piquée 😖', 'Grrr, ça gratte ! 🦟']), 2);
        } else {
          vPos.multiplyScalar(s.v * dt / dist);
          s.pos.add(vPos);
          s.pos.x += Math.sin(t * 2.3 + s.bz) * 0.5 * dt; s.pos.y += Math.sin(t * 3.1 + s.bz) * 0.3 * dt;
        }
        s.bz -= dt;
        if (s.bz <= 0) { s.bz = 1.1 + Math.random() * 0.6; var dj = s.pos.distanceTo(joueurP); if (dj < 14) AV.audio.bzz(Math.max(0.15, 1 - dj / 14), borne((s.pos.x - joueurP.x) / 6, -1, 1)); }
      } else if (s.etat === 'part') { s.pos.y += dt * 1.2; s.pos.z -= dt * 2.5; k = Math.max(0, 1 - s.t / 2); if (s.t > 2) s.mortFin = true; }
      else if (s.etat === 'mort') { k = Math.max(0, 1 - s.t / 0.7); if (s.t > 0.7) s.mortFin = true; }
      for (var i = 0; i < s.n; i++) {
        var p = s.ph[i], r = s.etat === 'mort' ? p[3] + s.t * 2.5 : p[3];
        a[i * 3] = s.pos.x + Math.sin(t * 7 + p[0]) * r; a[i * 3 + 1] = s.pos.y + Math.sin(t * 9 + p[1]) * r * 0.7 - (s.etat === 'mort' ? s.t * s.t * 2 : 0); a[i * 3 + 2] = s.pos.z + Math.cos(t * 8 + p[2]) * r;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = k;
      s.em.position.set(s.pos.x, s.pos.y + 0.32, s.pos.z); s.em.material.opacity = s.etat === 'vole' ? 0.95 : k * 0.6;
    }
    var bulles = [];

    // ---------- Les épreuves ----------
    function lancerVague() {
      var v = V();
      etat = 'vague'; tEtat = 0; resteM = v.mouettes; resteQ = v.moustiques; vols = 0; piqures = 0; tSpawn = 1.2; alterne = 0;
      kCible = v.ciel[0];
      sousTitre();
      dire('🎯 <b>Épreuve ' + (iV + 1) + ' : ' + v.nom + '</b>' + (iV === 0 ? ' · cours vers elles et ✋ pour les chasser !' : iV === 1 ? ' · ✋ près d\'un essaim pour le claquer !' : ' · courage, c\'est la dernière !'), 3.8);
    }
    function toutChasser() {
      mouettes.forEach(function (m) { if (m.etat !== 'emporte') chasserMouette(m); });
      essaims.forEach(function (s) { if (s.etat === 'vole') { s.etat = 'part'; s.t = 0; s.compte = false; } });
    }
    function rater(raison) {
      etat = 'rate'; tEtat = 0; echecs++;
      toutChasser();
      AV.audio.erreur();
      dire(raison, 3.2);
    }
    function reussir() {
      AV.audio.bravo(); AV.audio.ping(1);
      echecs = Math.max(0, echecs - 1);
      if (iV >= VAGUES.length - 1) { etat = 'final'; tEtat = 0; kCible = 1; dire('<b>' + nomLui + ' :</b> Trop forte ! Le pique-nique est sauvé 🥂', 3.2); sousTitre(); return; }
      etat = 'pause'; tEtat = 0; kCible = VAGUES[iV].ciel[1] + 0.06;
      dire('<b>' + nomLui + ' :</b> ' + (iV === 0 ? 'Bravo ! Plus une mouette… 😎 Par contre le soleil se couche, gare aux moustiques…' : 'Ouf ! Oh non… les mouettes reviennent, et les moustiques aussi 😅'), 4.2);
      if (iV === 0) flammeOn = true;
    }
    var flammeOn = false;
    function majVague(dt) {
      var v = V();
      if (vols >= 3) { rater('😩 Les mouettes ont pillé le pique-nique… on recommence l\'épreuve (elles seront plus lentes) !'); return; }
      if (piqures >= 3) { rater('😖 Trop de piqûres ! On recommence l\'épreuve (les moustiques seront plus lents)'); return; }
      kCible = AV.lerp(v.ciel[0], v.ciel[1], 1 - (resteM + resteQ) / Math.max(1, v.mouettes + v.moustiques));
      var actifs = mouettes.filter(function (m) { return m.compte; }).length + essaims.filter(function (s) { return s.compte; }).length;
      tSpawn -= dt;
      if (tSpawn <= 0 && actifs < v.simult && resteM + resteQ > 0) {
        var typeM = resteM > 0 && (resteQ === 0 || alterne % 2 === 0); alterne++;
        if (typeM) { resteM--; nouvelleMouette(); } else { resteQ--; nouvelEssaim(); }
        tSpawn = AV.entre(rng, 2.2, 3.8) / fac();
      }
      if (resteM + resteQ === 0 && actifs === 0 && !mouettes.some(function (m) { return m.etat === 'emporte'; })) reussir();
    }

    // ---------- Edith ----------
    var E0 = new THREE.Vector3(-22, 13, 55), E1 = new THREE.Vector3(14, 8, 18), E2 = new THREE.Vector3(0.75, 0.04, 0.45);
    function lancerEdith() {
      etat = 'edith'; tEtat = 0; tEdith = 0; sousTitre();
      edith = new AV.Animal('calopsite'); edith.vole = true; G.add(edith.groupe);
      edith.base.copy(E0); edith.groupe.position.copy(E0);
      lettre = new THREE.Group();
      var env = AV.maille(new THREE.BoxGeometry(0.36, 0.02, 0.25), '#fffaf0'); lettre.add(env);
      var cc = AV.maille(new THREE.IcosahedronGeometry(0.05, 0), '#e8384f', false); cc.position.y = 0.015; cc.scale.y = 0.4; lettre.add(cc);
      lettre.position.set(0, -0.12, 0.33); lettre.rotation.x = 1.1;
      edith.m.tete.add(lettre);
      dire('<b>' + nomLui + ' :</b> Attends… regarde au-dessus de la mer… c\'est EDITH ?! 😍', 4.5);
      AV.audio.etoile();
    }
    function bezier(u, out) { var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return out.set(E0.x * a + E1.x * b + E2.x * c, E0.y * a + E1.y * b + E2.y * c, E0.z * a + E1.z * b + E2.z * c); }
    var vB = new THREE.Vector3();
    function majEdith(dt, t) {
      if (!edith) return;
      if (etat === 'edith') {
        tEdith += dt;
        var u = lisse(0, 8, tEdith), u2 = lisse(0, 8, tEdith + 0.1);
        bezier(u, edith.base); bezier(u2, vB);
        if (vB.distanceToSquared(edith.base) > 1e-6) edith.cible = Math.atan2(vB.x - edith.base.x, vB.z - edith.base.z);
        if (tEdith >= 8) {
          edith.vole = false; etat = 'pose'; tEtat = 0; edith.etat = 'repos';
          edith.m.corps.rotation.x = 0;
          edith.cible = Math.atan2(joueurP.x - E2.x, joueurP.z - E2.z);
          mo.interactifs.unshift(itEdith);
          dire('💌 Edith s\'est posée sur le plaid avec un petit mot dans le bec…', 4);
          AV.audio.clochette(0.8);
        }
      } else if (etat === 'pose') {
        edith.cible = Math.atan2(joueurP.x - E2.x, joueurP.z - E2.z);
      }
      edith.maj(dt, t, joueurP, api ? api.scene : null);
    }
    var itEdith = {
      x: E2.x, z: E2.z, rayon: 2.6, texte: '💌 ✋ Prendre le mot d\'Edith', fn: function () {
        if (fini) return; fini = true;
        if (lettre && lettre.parent) lettre.parent.remove(lettre);
        edith.etat = 'trouve'; etat = 'fini'; sousTitre();
        mo.interactifs = mo.interactifs.filter(function (i) { return i !== itEdith; });
        lui.bras[0].rotation.set(-2.6, 0, 0.3); lui.bras[1].rotation.set(-2.4, 0, -0.3);
        dire('<b>' + nomLui + ' :</b> Elle a traversé la mer pour toi… ❤', 3);
        if (api) api.trouver();
      }
    };

    // ---------- Interactions ----------
    var itChasse = { x: 9999, z: 9999, rayon: 0.5, texte: '', fn: function () { chasser(); } };
    var itPique = { x: PIC.x + 0.4, z: PIC.z - 1.2, rayon: 2.4, texte: '🧺 ✋ Déballer le pique-nique', fn: function () { mo.interactifs = mo.interactifs.filter(function (i) { return i !== itPique; }); AV.audio.clic(); iV = 0; lancerVague(); } };
    var PAROLES = ['Le coucher de soleil, le rosé, toi… la soirée parfaite 🌅', 'Méfie-toi des mouettes, elles volent tout ici 😏', 'Je te sers un petit verre ? 🥂', 'Tu crois qu\'Edith nous voit d\'où elle est ? 🕊️'];
    var iParole = 0;
    var itLui = { x: LUI.x - 0.1, z: LUI.z - 0.9, rayon: 1.5, texte: '💬 ✋ Parler à ' + nomLui, fn: function () { dire('<b>' + nomLui + ' :</b> ' + PAROLES[iParole % PAROLES.length], 3.2); iParole++; } };
    mo.interactifs.push(itChasse, itPique, itLui);
    function ciblesProches() {
      var l = [];
      mouettes.forEach(function (m) {
        if (!(m.etat === 'marche' || m.etat === 'picore' || (m.etat === 'arrive' && m.pos.y < 2.6))) return;
        var dx = m.pos.x - joueurP.x, dz = m.pos.z - joueurP.z; if (dx * dx + dz * dz < 2.5 * 2.5) l.push({ m: m });
      });
      essaims.forEach(function (s) {
        if (s.etat !== 'vole') return;
        var dx = s.pos.x - joueurP.x, dz = s.pos.z - joueurP.z; if (dx * dx + dz * dz < 2.4 * 2.4) l.push({ s: s });
      });
      return l;
    }
    function chasser() {
      var l = ciblesProches(); tGeste = 0.6;
      l.forEach(function (c) { if (c.m) chasserMouette(c.m); else claquer(c.s); });
      if (l.some(function (c) { return c.s; })) AV.audio.claque(); else AV.audio.saut();
      var r = l.length > 1 ? 'Doublé ! 💪' : null;
      if (r) dire(r, 1.4);
    }
    mo.astuce = function (p) {
      if (parole && parole.t > 0) return parole.texte;
      if (etat === 'attente') return '🧺 Rejoins ' + nomLui + ' sur le plaid pour déballer le pique-nique';
      if (etat === 'vague') {
        var v = V();
        return v.mouettes && !v.moustiques ? '🐦 Repère les mouettes qui marchent vers le plaid · cours et ✋' : v.moustiques && !v.mouettes ? '🦟 Écoute le bzzz… va vers l\'essaim et ✋ pour claquer' : '🐦🦟 Chasse tout ce qui approche du plaid !';
      }
      if (etat === 'pose') return '💌 Approche-toi d\'Edith sur le plaid';
      return null;
    };

    // ---------- Boucle ----------
    var cS = new THREE.Color(), vS = new THREE.Vector3(), hemiL = null, solL = null;
    function majCiel(dt) {
      kCiel = AV.lerp(kCiel, kCible, Math.min(1, dt * 0.35));
      var k = kCiel, el = AV.lerp(0.13, -0.075, k);
      uCiel.sd.value.set(-0.55, el, 0.8).normalize();
      degrade(['#5b8fd0', '#4a5aa0', '#1c2250'], k, uCiel.haut.value);
      degrade(['#ffcf8a', '#ff9a6a', '#d0607a'], k, uCiel.bas.value);
      degrade(['#ffe0a0', '#ff9a50', '#ff6a5a'], k, uCiel.sc.value);
      disque.material.color.copy(degrade(['#fff0c0', '#ffb060', '#ff6a3a'], k, cS));
      haloS.material.color.copy(cS); haloS.material.opacity = 0.55 * (1 - lisse(0.75, 1, k));
      etoiles.material.opacity = lisse(0.7, 1, k) * 0.9;
      if (api && api.scene.fog) { degrade(['#f6c99a', '#e89a86', '#8a6a8e'], k, api.scene.fog.color); if (api.scene.background && api.scene.background.isColor) api.scene.background.copy(api.scene.fog.color); }
      if (hemiL) { degrade(['#ffe0b8', '#ffc0a8', '#b0a0d8'], k, hemiL.color); degrade(['#c9a070', '#a87868', '#6a5a78'], k, hemiL.groundColor); }
      if (solL) degrade(['#ffc890', '#ff9a60', '#c07090'], k, solL.color);
      if (api) api.eclairage(AV.lerp(1, 0.72, k));
      eau.material.color.copy(degrade(['#3c7fa6', '#5a6a9a', '#2a3060'], k, cS)); merLoin.material.color.copy(cS);
      lampePhare.material.opacity = lisse(0.55, 0.85, k) * (0.6 + 0.4 * Math.max(0, Math.sin(performance.now() / 600)));
    }
    mo.anime(function (dt, t, centre) {
      if (centre) joueurP.copy(centre);
      tEtat += dt;
      if (parole) parole.t -= dt;
      majCiel(dt);
      // écume
      var ez = 10.2 + Math.sin(t * 0.55) * 0.7;
      ecume.position.set(0, sol(0, ez) + 0.03, ez); ecume.material.opacity = 0.25 + 0.3 * Math.max(0, Math.cos(t * 0.55));
      flamme.material.opacity = flammeOn ? 0.75 + Math.sin(t * 13) * 0.15 : 0;
      // états
      if (etat === 'vague') majVague(dt);
      else if (etat === 'pause' && tEtat > 5) { iV++; lancerVague(); }
      else if (etat === 'rate' && tEtat > 3.6) {
        mouettes.forEach(function (m) { if (m.item) { relacher(m.item); m.item = null; } });
        ALIMENTS.forEach(function (a) { if (a.vole) { a.vole = false; relacher(a); } });
        dire('<b>' + nomLui + ' :</b> ' + auHasard(['Pas grave, j\'avais tout prévu en double 😅', 'On s\'y remet ! 💪', 'Allez, cette fois on les aura !']), 2.6);
        lancerVague();
      } else if (etat === 'final' && tEtat > 3.5) lancerEdith();
      for (var i = mouettes.length - 1; i >= 0; i--) { majMouette(mouettes[i], dt, t); if (mouettes[i].mort) { G.remove(mouettes[i].g); AV.detruire(mouettes[i].g); mouettes.splice(i, 1); } }
      for (var j = essaims.length - 1; j >= 0; j--) { majEssaim(essaims[j], dt, t); if (essaims[j].mortFin) { G.remove(essaims[j].pts); G.remove(essaims[j].em); AV.detruire(essaims[j].pts); AV.detruire(essaims[j].em); essaims.splice(j, 1); } }
      for (var b = bulles.length - 1; b >= 0; b--) { var bu = bulles[b]; bu.t += dt; bu.s.position.y += dt * 0.4; bu.s.material.opacity = Math.max(0, 1 - bu.t / 1.4); if (bu.t > 1.4) { G.remove(bu.s); AV.detruire(bu.s); bulles.splice(b, 1); } }
      majEdith(dt, t);
      // ✋ : la cible la plus proche
      var l = (etat === 'vague' || etat === 'rate') ? ciblesProches() : [];
      if (l.length) { itChasse.x = joueurP.x; itChasse.z = joueurP.z; itChasse.rayon = 0.5; itChasse.texte = l.some(function (c) { return c.s; }) ? '👏 ✋ Claquer les moustiques !' : '🐦 ✋ Chasser la mouette !'; }
      else itChasse.x = 9999;
      // le geste (elle agite les bras)
      var J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (J && J.parts) {
        if (tGeste > 0) {
          tGeste -= dt; var w = Math.sin(tGeste * 30);
          J.parts.brasG.rotation.set(-0.4, 0, -2.4 - w * 0.4); J.parts.brasD.rotation.set(-0.4, 0, 2.4 + w * 0.4);
          if (tGeste <= 0) { J.parts.brasG.rotation.set(0, 0, -0.15); J.parts.brasD.rotation.set(0, 0, 0.15); }
        }
      }
      // lui : regarde l'action, bavarde
      if (etat !== 'fini') {
        var cible2 = mouettes.find(function (m) { return m.compte; }) || essaims.find(function (s) { return s.compte; });
        var tx = cible2 ? cible2.pos.x : joueurP.x, tz = cible2 ? cible2.pos.z : joueurP.z;
        lui.tete.rotation.y = AV.lerp(lui.tete.rotation.y, borne(Math.atan2(tx - LUI.x, tz - LUI.z) - 0.25, -1.2, 1.2), 0.08);
        lui.bras[1].rotation.x = -0.9 + Math.max(0, Math.sin(t * 0.3)) * -0.5;
        if (etat === 'attente') { tBla -= dt; if (tBla <= 0) { tBla = 14; } }
      }
      majUI();
    });
    mo.surCamera = function (camera) {
      cielM.position.copy(camera.position);
      etoiles.position.copy(camera.position);
      vS.copy(uCiel.sd.value);
      disque.position.copy(camera.position).addScaledVector(vS, 370); disque.lookAt(camera.position);
      haloS.position.copy(camera.position).addScaledVector(vS, 360);
      // reflet : une traînée sur l'eau, du rivage vers le soleil
      var hx = vS.x, hz = vS.z, hl = Math.sqrt(hx * hx + hz * hz); hx /= hl; hz /= hl;
      var L = 260, x0 = camera.position.x + hx * 14, z0 = Math.max(camera.position.z + hz * 14, 12);
      reflet.position.set(x0 + hx * L / 2, YEAU + 0.26, z0 + hz * L / 2);
      reflet.rotation.set(-Math.PI / 2, 0, Math.atan2(hx, hz)); reflet.scale.set(9 + kCiel * 6, L, 1);
      reflet.material.opacity = 0.4 * (1 - lisse(0.75, 1, kCiel));
    };
    mo.debut = function (a) {
      api = a; construireUI(); sousTitre();
      a.scene.traverse(function (o) { if (o.isHemisphereLight) hemiL = o; if (o.isDirectionalLight) solL = o; });
      dire('🌅 Le soleil descend sur la mer… ' + nomLui + ' t\'attend sur le plaid', 4.5);
    };
    mo.nettoyer = function () {
      etat = 'parti';
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui); ui = null;
      var J = AV.jeu && AV.jeu.joueur ? AV.jeu.joueur() : null;
      if (J && J.parts) { J.parts.brasG.rotation.set(0, 0, -0.15); J.parts.brasD.rotation.set(0, 0, 0.15); }
    };
    mo.debug = {
      etat: function () { return { etat: etat, vague: iV, vols: vols, piqures: piqures, echecs: echecs, resteM: resteM, resteQ: resteQ, mouettes: mouettes.length, essaims: essaims.length, k: Math.round(kCiel * 100) / 100 }; },
      commencer: function () { itPique.fn(); },
      cible: function () { var best = null, bd = 1e9; mouettes.forEach(function (m) { if (m.compte && m.etat !== 'arrive') { var d = m.pos.distanceTo(joueurP); if (d < bd) { bd = d; best = { x: m.pos.x, z: m.pos.z, t: 'm' }; } } }); essaims.forEach(function (s) { if (s.etat === 'vole') { var d = s.pos.distanceTo(joueurP); if (d < bd) { bd = d; best = { x: s.pos.x, z: s.pos.z, t: 's' }; } } }); return best; },
      vague: function (n) { iV = n; kCiel = kCible = VAGUES[n].ciel[0]; lancerVague(); },
      edith: function () { kCible = 1; lancerEdith(); },
      edithPos: function () { return E2; }
    };
    return mo;
  };
})(window.AV);
