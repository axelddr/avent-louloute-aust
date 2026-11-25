/* Jour 22 : le rougail saucisse piégé.
   Axel a cuisiné un rougail avec un VRAI piment antillais… qui s'est désagrégé dans la cocotte-minute.
   On joue Océane : à tour de rôle avec Axel, on pioche une cuillère dans la cocotte. L'une d'elles est une bombe 🌶️.
   - si c'est Océane : lait (frigo) + pain de mie (plan de travail) en vitesse, Axel rit et filme ;
   - si c'est Axel : il court partout dans le séjour, Océane lui rapporte le lait et le pain de mie.
   Scénario greffé sur l'appartement (biome-appart.js → AV.scenariosAppart.rougail(X)). */
window.AV = window.AV || {};
(function (AV) {
  'use strict';
  AV.scenariosAppart = AV.scenariosAppart || {};

  var STYLE = [
    '.rg-feu{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,140,0,0) 30%,rgba(255,80,0,.42) 66%,rgba(210,0,0,.85) 100%);animation:rgPulse .5s ease-in-out infinite alternate}',
    '@keyframes rgPulse{from{transform:scale(1)}to{transform:scale(1.06)}}',
    '.rg-jauge{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 74px);z-index:5;pointer-events:none;display:none;background:rgba(40,10,8,.78);color:#fff;border-radius:18px;padding:9px 15px;font:800 16px Nunito,sans-serif;text-align:center;min-width:230px;box-shadow:0 4px 18px rgba(0,0,0,.35)}',
    '.rg-jauge .barre{height:12px;border-radius:6px;background:rgba(255,255,255,.18);margin:7px 0 5px;overflow:hidden}',
    '.rg-jauge .barre i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ffc400,#ff6a00,#e00000);border-radius:6px;transition:width .25s}',
    '.rg-jauge .items{font-size:16px;letter-spacing:.5px}',
    '.rg-choix{position:fixed;inset:0;z-index:3;pointer-events:none}',
    '.rg-choix button{position:absolute;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;border:3px solid rgba(255,255,255,.92);background:rgba(255,236,200,.25);font-size:23px;line-height:1;padding:0;pointer-events:auto;cursor:pointer;box-shadow:0 0 14px rgba(255,190,90,.75);transition:transform .15s,background .15s,opacity .3s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '.rg-choix button.sel{transform:scale(1.22);background:rgba(255,200,90,.6);border-color:#ffd36a}',
    '.rg-choix.off button{opacity:0;pointer-events:none}'
  ].join('\n');

  function emojiTex(e) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'); x.font = '96px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72);
    return new THREE.CanvasTexture(c);
  }
  function div(cl) { var d = document.createElement('div'); d.className = cl; document.body.appendChild(d); return d; }

  AV.scenariosAppart.rougail = function (X) {
    var mo = X.mo, G = X.G, cfg = X.cfg, lui = X.lui, L = X.L, cK = X.cK, cW = X.cW;
    var nomLui = X.nomLui, nomElle = cfg.copine || 'Océane';
    var bx = X.bx, cyl = X.cyl, angleVers = X.angleVers, lerp = AV.lerp;
    var TAB = X.TAB, HBAR = X.HBAR, HPLAN = X.HPLAN, D0 = X.D0, PROF = X.PROF;
    var NP = 7; // cuillères dans la cocotte
    var api = null, J = null, posJ = null, tps = 0;
    var R = {
      etape: 'accueil', t2: 0, t3: 0, tour: 'elle', phase: null, pris: 0, sel: 0, victime: null, force: null,
      feu: 0, cibleFeu: 0, rouge: 0, lait: false, pain: false, chrono: 0, ligne: -1, tl: 0, couv: 0, remue: false,
      tBulle: 5, tCoc: 1, tFlamme: 0, tCri: 0, tRire: 2, phi: 0, brasElle: 0, brasLui: 0, mache: null
    };
    var vT = new THREE.Vector3(), vT2 = new THREE.Vector3(), vT3 = new THREE.Vector3(), vC = new THREE.Vector3(), vM = new THREE.Vector3(), vE = new THREE.Vector3();

    // ---------- repères (cadre de la cuisine : s le long du mur, d vers le séjour) ----------
    var A0 = cK.pt(0, 0);
    function sd(p) { var dx = p.x - A0.x, dz = p.z - A0.z; return { s: dx * cK.u.x + dz * cK.u.z, d: dx * cK.n.x + dz * cK.n.z }; }
    var FACE = angleVers(-cK.n.x, -cK.n.z);              // assis au bar, face à la cuisine
    var S_A = TAB.s - 0.95, S_POT = (TAB.s + S_A) / 2;    // tabouret d'Axel, cocotte entre les deux
    var SEAT_O = X.TABW, SEAT_A = cK.pt(S_A, TAB.d);
    var POS_FEU = cK.pt(X.S_CUIS - 0.15, D0 + 0.45), POS_BAR = cK.pt(S_POT, X.BAR_D0 + 0.38);
    var CAMJ = cK.pt(S_POT, X.BAR_D0 - 0.7), VISEJ = cK.pt(S_POT, X.BAR_D1 - 0.15);
    var S_PAIN = 0.62, FRIGO = cK.pt((X.S_FRIGO0 + X.S_FRIGO1) / 2, D0 + PROF + 0.55), PAINW = cK.pt(S_PAIN + 0.15, D0 + PROF + 0.55);
    var LEVE_O = cK.pt(TAB.s + 0.7, TAB.d + 0.35);
    var Y_ASSIS_O = TAB.h + 0.04 - 0.62, Y_ASSIS_A = TAB.h + 0.04 - 0.64;
    // boucle de course d'Axel autour des tables basses
    function boucle(phi) { return X.versMonde(cW, X.S_CANAPE, X.D_CANAPE, -0.8 + 1.45 * Math.cos(phi), 2.95 + 1.3 * Math.sin(phi)); }
    var CENTRE = X.versMonde(cW, X.S_CANAPE, X.D_CANAPE, -0.8, 2.95);
    // chemin qui contourne le bar par son bout libre
    function chemin(de, vers) {
      var a = sd(de), b = sd(vers), mid = (X.BAR_D0 + X.BAR_D1) / 2, res = [];
      var bout1 = cK.pt(X.BAR_S1 + 0.55, D0 + PROF + 0.6), bout2 = cK.pt(X.BAR_S1 + 0.6, X.BAR_D1 + 0.7);
      if ((a.d < mid) !== (b.d < mid) && (a.s < X.BAR_S1 + 0.3 || b.s < X.BAR_S1 + 0.3)) {
        if (a.d < mid) res.push(bout1, bout2); else res.push(bout2, bout1);
      }
      res.push({ x: vers.x, z: vers.z });
      return res;
    }

    // ---------- ce soir : une cocotte-minute à la place de la poêle ----------
    X.poele.visible = false; X.casserole.visible = false; X.garniture.visible = false;
    (X.fruits || []).forEach(function (o) { o.visible = false; }); // la coupe de fruits laisse la place à la cocotte
    var acier = new THREE.MeshPhongMaterial({ color: '#c5cad1', shininess: 80, specular: '#ffffff', side: THREE.DoubleSide });
    var RC = 0.34, HC = 0.3;
    var coc = new THREE.Group(); coc.position.set(POS_FEU.x, HPLAN + 0.02, POS_FEU.z); G.add(coc);
    var cuve = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC - 0.02, HC, 26, 1, true), acier); cuve.position.y = HC / 2; cuve.castShadow = true; coc.add(cuve);
    var fondC = new THREE.Mesh(new THREE.CircleGeometry(RC - 0.02, 26), acier); fondC.rotation.x = -Math.PI / 2; fondC.position.y = 0.005; coc.add(fondC);
    var levre = new THREE.Mesh(new THREE.TorusGeometry(RC, 0.014, 5, 26), acier); levre.rotation.x = Math.PI / 2; levre.position.y = HC; coc.add(levre);
    [-1, 1].forEach(function (k) { coc.add(bx(0.13, 0.04, 0.08, '#1d1d1f', k * (RC + 0.06), HC - 0.04, 0)); });
    var couv = new THREE.Group(); couv.position.y = HC; coc.add(couv);
    var dessus = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.01, RC + 0.015, 0.035, 26), acier); dessus.position.y = 0.017; couv.add(dessus);
    couv.add(bx(0.72, 0.05, 0.08, '#1d1d1f', 0, 0.075, 0));                          // poignée
    var soupape = cyl(0.028, 0.034, 0.06, '#c23a2a', 0.08, 0.13, 0, 8); couv.add(soupape);
    // le rougail : sauce tomate, saucisses… et des éclats de piment fondu partout (impossible de deviner où il est 😈)
    coc.add(cyl(RC - 0.025, RC - 0.025, 0.02, '#a8401c', 0, HC - 0.07, 0, 26));
    for (var ib = 0; ib < 46; ib++) {
      var ab = Math.random() * 6.283, rb = Math.sqrt(Math.random()) * (RC - 0.05);
      var bt = AV.maille(new THREE.BoxGeometry(0.02, 0.008, 0.012), ib % 3 ? '#d9582a' : '#f0a23a', false); bt.position.set(Math.cos(ab) * rb, HC - 0.057, Math.sin(ab) * rb); bt.rotation.y = ab; coc.add(bt);
    }
    var portions = [], YP = HC - 0.056;
    for (var ip = 0; ip < NP; ip++) {
      var ap = ip / (NP - 1) * Math.PI * 2 + 0.5, rp = ip < NP - 1 ? 0.2 : 0, gp = new THREE.Group();
      gp.position.set(Math.cos(ap) * rp, YP, Math.sin(ap) * rp); coc.add(gp);
      [[-0.035, -0.02, 0.3], [0.035, 0.022, -0.25]].forEach(function (q) {
        var s = cyl(0.04, 0.04, 0.03, '#7b2f1b', q[0], 0.012, q[1], 10); s.rotation.set(q[2], 0, q[2] * 0.6); gp.add(s);
        var c = cyl(0.03, 0.03, 0.032, '#c0704a', q[0], 0.012, q[1], 10); c.rotation.copy(s.rotation); gp.add(c);
      });
      var tom = AV.maille(new THREE.IcosahedronGeometry(0.022, 0), '#d8452a'); tom.position.set(0, 0.016, 0.05); gp.add(tom);
      portions.push({ g: gp, pris: false });
    }
    var anneau = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.098, 24), new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    anneau.rotation.x = -Math.PI / 2; coc.add(anneau);

    // second tabouret (Axel), assiettes de riz
    var tab2 = X.tabouret.clone(); X.placer(tab2, cK, S_A, TAB.d, 0); G.add(tab2);
    mo.colliders.push({ x: SEAT_A.x, z: SEAT_A.z, r: 0.28 });
    function assiette(s) {
      var p = cK.pt(s, X.BAR_D1 - 0.2), g = new THREE.Group(); g.position.set(p.x, HBAR + 0.036, p.z); G.add(g);
      g.add(cyl(0.16, 0.12, 0.025, '#fbfaf6', 0, 0.012, 0, 18));
      var riz = AV.maille(new THREE.SphereGeometry(0.085, 10, 6), '#f6f3ea'); riz.scale.y = 0.45; riz.position.set(-0.035, 0.03, 0); g.add(riz);
      var sc = AV.maille(new THREE.SphereGeometry(0.06, 8, 5), '#a8401c'); sc.scale.y = 0.35; sc.position.set(0.06, 0.03, 0.02); g.add(sc);
      g.visible = false; return g;
    }
    var assO = assiette(TAB.s), assA = assiette(S_A);

    // le lait (dans le frigo) et le pain de mie (sur la planche)
    var brique = new THREE.Group();
    brique.add(bx(0.11, 0.22, 0.11, '#f7f7f2', 0, 0, 0)); brique.add(bx(0.114, 0.07, 0.114, '#2f6fd1', 0, -0.03, 0));
    var toitB = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.078, 0.05, 4), AV.mat('#f7f7f2')); toitB.rotation.y = Math.PI / 4; toitB.position.y = 0.135; brique.add(toitB);
    brique.visible = false; G.add(brique);
    var pain = new THREE.Group();
    pain.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.17, 0.17), new THREE.MeshPhongMaterial({ color: '#f1dcae', transparent: true, opacity: 0.93, shininess: 60 })));
    pain.add(bx(0.365, 0.045, 0.175, '#d23b2f', 0, 0.02, 0));
    var pp = cK.pt(S_PAIN, D0 + 0.45); pain.position.set(pp.x, HPLAN + 0.115, pp.z); pain.rotation.y = cK.rot; G.add(pain);
    var PAIN0 = pain.position.clone();
    var tranche = new THREE.Group(); tranche.add(bx(0.15, 0.15, 0.022, '#c98b4a', 0, 0, 0)); tranche.add(bx(0.13, 0.13, 0.024, '#f6e7c4', 0, 0, 0));
    tranche.visible = false; G.add(tranche);
    // balises lumineuses (pendant le sauvetage)
    function balise(p, y, emoji) {
      var g = new THREE.Group(); g.position.set(p.x, y, p.z);
      var h = new THREE.Sprite(new THREE.SpriteMaterial({ map: AV.textureRonde(), color: '#ffe680', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      h.scale.set(1.5, 1.5, 1); g.add(h); g.halo = h;
      var e = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(emoji), transparent: true, depthWrite: false, depthTest: false })); e.scale.set(0.7, 0.7, 1); e.position.y = 0.8; e.renderOrder = 6; g.add(e);
      g.visible = false; G.add(g); return g;
    }
    var baliseLait = balise(cK.pt((X.S_FRIGO0 + X.S_FRIGO1) / 2, D0 + PROF + 0.12), 1.7, '🥛'), balisePain = balise(pp, HPLAN + 0.25, '🍞');
    // le téléphone d'Axel (il filme…)
    var tel = bx(0.1, 0.17, 0.02, '#15151a', 0, -0.66, 0.1); tel.visible = false; lui.brasD.add(tel);

    // cuillères
    var acierC = new THREE.MeshPhongMaterial({ color: '#d4d8de', shininess: 90, specular: '#ffffff' });
    function cuillere() {
      var g = new THREE.Group();
      var manche = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.3), acierC); manche.position.z = 0.17; g.add(manche);
      var creux = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), acierC); creux.scale.set(0.8, 0.35, 1.1); g.add(creux);
      var b = cyl(0.033, 0.033, 0.022, '#8a3219', 0, 0.012, 0, 8); g.add(b); g.bouchee = b;
      g.visible = false; G.add(g); return g;
    }
    var cuilElle = cuillere(), cuilLui = cuillere();

    // ---------- particules emoji (flammes, fumée, larmes, cœurs) ----------
    var TX = { feu: emojiTex('🔥'), fumee: emojiTex('💨'), larme: emojiTex('💧'), coeur: emojiTex('❤️') };
    var parts = [];
    function particule(type, p, vx, vy, vz, vie, taille) {
      if (parts.length > 80) return;
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX[type], transparent: true, depthWrite: false }));
      var t = taille || 0.22; s.position.copy(p); s.scale.set(t, t, 1); s.renderOrder = 5;
      s.userData = { vx: vx, vy: vy, vz: vz, vie: vie, vie0: vie, t: t, type: type }; G.add(s); parts.push(s);
    }
    function majParticules(dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var s = parts[i], u = s.userData; u.vie -= dt;
        if (u.type === 'larme') u.vy -= 5 * dt;
        s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
        var k = Math.max(0, u.vie / u.vie0), sc = u.t * (u.type === 'feu' ? 0.6 + (1 - k) * 0.9 : u.type === 'fumee' ? 0.7 + (1 - k) * 1.3 : 1);
        s.material.opacity = Math.min(1, k * 2.2); s.scale.set(sc, sc, 1);
        if (u.vie <= 0) { G.remove(s); s.material.dispose(); parts.splice(i, 1); }
      }
    }
    function rnd(a) { return (Math.random() - 0.5) * 2 * a; }

    // ---------- visage qui rougit ----------
    var ROUGE = new THREE.Color('#ff3524'), visages = [];
    function rougir(tete, k) {
      var m = tete.children[0]; if (!m || !m.material) return;
      if (!m.userData.matOrig) { m.userData.matOrig = m.material; m.material = m.material.clone(); visages.push(m); }
      m.material.color.copy(m.userData.matOrig.color).lerp(ROUGE, Math.max(0, Math.min(1, k)));
    }

    // ---------- calques HTML ----------
    var styleEl = document.createElement('style'); styleEl.textContent = STYLE; document.head.appendChild(styleEl);
    var feuEl = div('rg-feu'), jaugeEl = div('rg-jauge'), choixEl = div('rg-choix off');
    jaugeEl.innerHTML = '<div class="titre"></div><div class="barre"><i></i></div><div class="items"></div>';
    var jTitre = jaugeEl.querySelector('.titre'), jBarre = jaugeEl.querySelector('i'), jItems = jaugeEl.querySelector('.items');
    var boutons = portions.map(function (p, i) {
      var b = document.createElement('button'); b.textContent = '🥄';
      function choisir(ev) { ev.preventDefault(); ev.stopPropagation(); if (R.etape === 'jeu' && R.tour === 'elle' && R.phase === 'choix' && !portions[i].pris) { R.sel = i; prendre(i); } }
      b.addEventListener('pointerdown', choisir); b.addEventListener('touchstart', function (ev) { ev.stopPropagation(); }, { passive: true });
      choixEl.appendChild(b); return b;
    });

    // ---------- petites aides ----------
    function bulleElle(t, vie) { if (!J) return; J.parts.tete.getWorldPosition(vT3); X.bulle(t, vT3.x, vT3.y + 0.85, vT3.z, vie || 2.6); }
    function bulleCoc(t, vie) { X.bulle(t, coc.position.x, coc.position.y + 1.0, coc.position.z, vie || 2); }
    function effacerBulles() { X.bulles.forEach(function (b) { b.userData.vie = Math.min(b.userData.vie, 0.12); }); }
    function bouche(qui, out) { var t = qui === 'lui' ? lui.tete : J.parts.tete; return t.localToWorld(out.set(0, -0.08, 0.36)); }
    function portionMonde(i, out) { return portions[i].g.getWorldPosition(out); }
    function orienter(sp, qui) { (qui === 'lui' ? lui.tete : J.parts.tete).getWorldPosition(vC); vC.y -= 0.6; sp.lookAt(vC); }
    function regardVers(tete, angCorps, x, z, px, pz, k) { // tourne la tête vers (px, pz)
      var a = AV.angleLerp(0, angleVers(px - x, pz - z) - angCorps, 1);
      tete.rotation.y = lerp(tete.rotation.y, Math.max(-1, Math.min(1, a)), k);
    }
    function fondu(cb) {
      var f = document.getElementById('fondu'); f.classList.add('noir');
      setTimeout(function () { cb(); setTimeout(function () { f.classList.remove('noir'); }, 300); }, 560);
    }
    function libres() { var l = []; portions.forEach(function (p, i) { if (!p.pris) l.push(i); }); return l; }
    function premiereLibre() { var l = libres(); return l.length ? l[Math.floor(Math.random() * l.length)] : 0; }

    // ---------- interactifs ----------
    var AXEL_INT = { x: X.CUIS.x, z: X.CUIS.z, rayon: 1.8, texte: '✋ Mmmh, ça sent bon ! 😋', fn: function () { ouvrir(); } };
    var LAIT_INT = { x: FRIGO.x, z: FRIGO.z, rayon: 0, texte: '✋ Le lait ! 🥛', fn: function () { attraper('lait'); } };
    var PAIN_INT = { x: PAINW.x, z: PAINW.z, rayon: 0, texte: '✋ Le pain de mie ! 🍞', fn: function () { attraper('pain'); } };
    mo.interactifs.push(AXEL_INT, LAIT_INT, PAIN_INT);
    var BASE_INTS = [X.INT.livre, X.INT.canape, X.INT.tabouret, X.INT.retour];
    BASE_INTS.forEach(function (i) { i.__r0 = i.rayon; });
    function ints(on) { // rayon 0 ne suffit pas si on est pile dessus (assise sur le tabouret) : on éloigne le point
      BASE_INTS.forEach(function (i) {
        if (on) { if (i.__x != null) { i.x = i.__x; i.__x = null; } i.rayon = i.__r0; }
        else { if (i.__x == null) i.__x = i.x; i.x = 1e6; i.rayon = 0; }
      });
      AXEL_INT.rayon = on && R.etape === 'accueil' ? 1.8 : 0;
    }
    X.INT.lui.rayon = 0;
    // les souvenirs des autres soirs : Axel a d'autres plans
    var REM = {
      livre: ['Le livre ? Pas ce soir… le rougail est prêt ! 🌶️', 'Range ce livre, ça va refroidir 😏'],
      canape: ['Le canapé attendra, viens goûter ! 😋', 'Pas de sieste, j\'ai cuisiné ! 👨‍🍳'],
      tabouret: ['Pas encore à table… viens d\'abord voir la cocotte 😏']
    };
    var tRem = -9;
    function remarque(k) {
      if (tps - tRem < 2.5) return; tRem = tps;
      if (R.etape === 'fin') { X.bulleLui(AV.choisir(Math.random, ['Après ce piment ? Je digère 😮‍💨', 'Assez d\'émotions pour ce soir 😂']), 3); return; }
      X.bulleLui(AV.choisir(Math.random, REM[k]), 3);
      X.dire('👨‍🍳 ' + nomLui + ' a de meilleures idées… va le voir en cuisine !', 4);
    }
    ['livre', 'canape', 'tabouret'].forEach(function (k) { X.INT[k].fn = function () { remarque(k); }; });

    function sousTitre() {
      if (!api) return;
      var s, e = R.etape;
      if (e === 'accueil' || e === 'ouverture' || e === 'installation') s = '🍲 Rougail saucisse… avec un vrai piment antillais 🌶️';
      else if (e === 'jeu') s = '🥄 ' + (NP - R.pris) + ' cuillères · une seule est piégée 🌶️ · ' + (R.tour === 'elle' ? 'à toi !' : 'au tour de ' + nomLui);
      else if (e === 'brule' || e === 'secours' || e === 'mange') s = R.victime === 'elle' ? '🔥🔥🔥 ÇA BRÛLE !!! 🥛🍞 VITE !' : '🔥 ' + nomLui + ' est tombé sur la cuillère piégée ! 🥛🍞';
      else if (e === 'sauve' || e === 'apaise') s = '😮‍💨 Ouf…';
      else s = '🌶️ Plus jamais de piment antillais… ou pas 😏';
      api.titre('Jour ' + cfg.jour + ' · ' + cfg.titre, s);
    }

    // ---------- 1. ouverture de la cocotte ----------
    var LIGNES = [
      { d: 2.8, f: function () { X.bulleLui('Rougail saucisse maison ! 😋', 2.6); } },
      { d: 3.0, f: function () { X.bulleLui('Avec un VRAI piment antillais 🌶️', 2.8); } },
      { d: 2.6, f: function () { AV.audio.cocotte(true); R.jet = 2.2; R.levier = 1; bulleCoc('PSCHHHHHH 💨', 2.2); } },
      { d: 2.4, f: function () { R.levier = 0; R.ouvre = true; X.bulleLui('Et voilà… 😍', 2.2); } },
      { d: 3.0, f: function () { R.remue = true; X.bulleLui('Attends… il est où le piment ? 🤨', 2.8); } },
      { d: 3.2, f: function () { X.bulleLui('Il a FONDU dans la cocotte… 😳', 3.0); } },
      { d: 3.4, f: function () { R.remue = false; X.bulleLui('Une des cuillères est une BOMBE 🔥', 3.2); } },
      { d: 3.4, f: function () { X.bulleLui('On joue ? Chacun son tour… 😈', 3.2); } }
    ];
    function ouvrir() {
      if (R.etape !== 'accueil') return;
      R.etape = 'ouverture'; R.t2 = 0; R.ligne = -1; R.tl = 0.7; ints(false); X.resetCam(); effacerBulles();
      mo.pilote = piloteOuverture; AV.controles.vider();
    }
    function piloteOuverture(dt, e, appui, Jj, camera, x) {
      J = Jj; x = x || {}; R.t2 += dt;
      var cible = cK.pt(X.S_CUIS + 1.1, D0 + PROF + 0.62);
      X.allerVers(Jj, R, cible.x, cible.z, dt, angleVers(POS_FEU.x - cible.x, POS_FEU.z - cible.z));
      L.regard = (R.ligne < 2 || R.ligne >= 5) ? { x: Jj.position.x, z: Jj.position.z } : null;
      var mx = (Jj.position.x + L.x) / 2, mz = (Jj.position.z + L.z) / 2;
      X.cameraVers(camera, mx + cK.n.x * 3.0 + cK.u.x * 0.5, 2.85, mz + cK.n.z * 3.0 + cK.u.z * 0.5, POS_FEU.x, HPLAN + 0.5, POS_FEU.z, dt);
      if (R.etape !== 'ouverture') return;
      R.tl -= dt;
      if (x.action && R.ligne >= 0 && R.tl < LIGNES[R.ligne].d - 0.5) R.tl = 0; // ✋ : réplique suivante
      if (R.tl <= 0) {
        R.ligne++;
        if (R.ligne >= LIGNES.length) { installer(); return; }
        effacerBulles(); LIGNES[R.ligne].f(); R.tl = LIGNES[R.ligne].d;
      }
    }
    function piloteAttente(dt, e, a, Jj) { J = Jj; }

    // ---------- 2. à table : la roulette du piment ----------
    function installer() {
      R.etape = 'installation'; mo.pilote = piloteAttente; L.regard = null;
      fondu(function () {
        coc.position.set(POS_BAR.x, HBAR + 0.036, POS_BAR.z); couv.visible = false; R.remue = false;
        assO.visible = assA.visible = true;
        L.etat = 'tabouret'; L.x = SEAT_A.x; L.z = SEAT_A.z; L.ang = FACE;
        R.etape = 'jeu'; R.tour = 'elle'; R.phase = 'choix'; R.t3 = 0; R.sel = premiereLibre(); X.resetCam();
        mo.pilote = piloteJeu; sousTitre(); effacerBulles();
        setTimeout(function () { if (R.etape === 'jeu') X.bulleLui('Les dames d\'abord 😏', 2.8); }, 700);
      });
    }
    function assiseElle(Jj, kb) {
      Jj.position.set(SEAT_O.x, Y_ASSIS_O, SEAT_O.z); Jj.groupe.rotation.y = FACE; X.poseAssise(Jj, 1); Jj.ombre.visible = false;
      Jj.parts.brasG.rotation.set(-1.2, 0, 0.1); Jj.parts.brasD.rotation.set(-1.2 - 0.95 * kb, 0, -0.1 - 0.35 * kb);
    }
    var dxAvant = 0;
    function piloteJeu(dt, e, appui, Jj, camera, x) {
      J = Jj; x = x || {};
      assiseElle(Jj, R.brasElle);
      var tete = Jj.parts.tete;
      if (R.mache === 'elle') tete.rotation.x = Math.sin(tps * 14) * 0.07;
      else tete.rotation.x = lerp(tete.rotation.x, R.phase === 'choix' && R.tour === 'elle' ? 0.35 : 0.1, Math.min(1, dt * 5));
      if (R.tour === 'lui' && R.phase !== 'mache') regardVers(tete, FACE, SEAT_O.x, SEAT_O.z, L.x, L.z, Math.min(1, dt * 4));
      else tete.rotation.y = lerp(tete.rotation.y, 0, Math.min(1, dt * 4));
      X.cameraVers(camera, CAMJ.x, 3.05, CAMJ.z, VISEJ.x, HBAR + 0.45, VISEJ.z, dt, 3);
      if (R.etape === 'jeu' && R.tour === 'elle' && R.phase === 'choix') {
        var dx = e && e.x > 0.5 ? 1 : e && e.x < -0.5 ? -1 : 0;
        if (dx && !dxAvant) { var l = libres(), k = l.indexOf(R.sel); R.sel = l[(k + dx + l.length) % l.length]; AV.audio.clic(); }
        dxAvant = dx;
        if (x.action) prendre(R.sel);
      }
      majJeu(dt);
      placerBoutons(camera);
    }
    function prendre(i) {
      if (R.etape !== 'jeu' || R.phase !== 'choix' || R.tour !== 'elle' || portions[i].pris) return;
      lancerCuillere('elle', i);
    }
    function lancerCuillere(qui, i) {
      R.qui = qui; R.cible = i; R.phase = 'cuillere'; R.t3 = 0; R.cueilli = false;
      portions[i].pris = true; R.pris++;
      var sp = qui === 'elle' ? cuilElle : cuilLui; sp.visible = true; sp.bouchee.visible = false;
      AV.audio.cuillere(); sousTitre();
    }
    function hesitation() {
      var l = libres().sort(function () { return Math.random() - 0.5; }), fin = l[0];
      var h = l.slice(1, 3); h.push(fin); return h;
    }
    // la cuillère piégée : jamais dans les deux premières (sinon c'est trop court), puis au hasard
    function chaud(qui) {
      if (R.force) return qui === R.force;
      var reste = NP - R.pris + 1; // en comptant celle-ci
      if (reste <= 1) return true;
      var v = cfg.victime === 'oceane' ? 'elle' : cfg.victime === 'axel' ? 'lui' : null;
      if (v) return qui === v && R.pris >= 3;
      if (R.pris <= 2) return false;
      return Math.random() < 1 / reste;
    }
    function majJeu(dt) {
      if (R.etape !== 'jeu') return;
      R.t3 += dt;
      var bras = { elle: 0, lui: 0 };
      if (R.phase === 'choix') {
        if (R.t3 > 14 && !R.relance) { R.relance = true; X.bulleLui(AV.choisir(Math.random, ['Alors, tu te dégonfles ? 😏', 'Allez, choisis ! 😈']), 2.8); }
      } else if (R.phase === 'reflechit') {
        var k = R.t3 / 2.4, idx = R.hesite[Math.min(R.hesite.length - 1, Math.floor(k * R.hesite.length))];
        portionMonde(idx, vT); vT.y += 0.2 + Math.sin(R.t3 * 6) * 0.02;
        cuilLui.visible = true; cuilLui.bouchee.visible = false;
        if (R.t3 < dt * 1.5) cuilLui.position.copy(vT); else cuilLui.position.lerp(vT, Math.min(1, dt * 6));
        orienter(cuilLui, 'lui'); bras.lui = 0.55;
        if (R.t3 > 2.4) lancerCuillere('lui', R.hesite[R.hesite.length - 1]);
      } else if (R.phase === 'cuillere') {
        var sp = R.qui === 'elle' ? cuilElle : cuilLui, p0 = portionMonde(R.cible, vT), m = bouche(R.qui, vT2);
        if (R.t3 < 0.4) { var a = R.t3 / 0.4; sp.position.set(p0.x, p0.y + 0.2 - Math.sin(a * Math.PI) * 0.2, p0.z); }
        else {
          if (!R.cueilli) { R.cueilli = true; portions[R.cible].g.visible = false; sp.bouchee.visible = true; }
          var b = Math.min(1, (R.t3 - 0.4) / 0.8), be = b * b * (3 - 2 * b);
          sp.position.set(lerp(p0.x, m.x, be), lerp(p0.y + 0.2, m.y, be) + Math.sin(be * Math.PI) * 0.22, lerp(p0.z, m.z, be));
        }
        orienter(sp, R.qui); bras[R.qui] = Math.min(1, R.t3 / 0.6);
        if (R.t3 > 1.25) { R.phase = 'mache'; R.t3 = 0; AV.audio.roulement(1.5); }
      } else if (R.phase === 'mache') {
        var sp2 = R.qui === 'elle' ? cuilElle : cuilLui;
        if (R.t3 > 0.3) sp2.visible = false;
        bras[R.qui] = R.t3 < 0.3 ? 1 : Math.max(0, 1 - (R.t3 - 0.3) * 3);
        R.mache = R.qui;
        if (R.t3 > 0.35 && !R.points) { R.points = true; if (R.qui === 'elle') bulleElle('…', 1.3); else X.bulleLui('…', 1.3); }
        if (R.t3 > 1.75) { R.mache = null; R.points = false; if (chaud(R.qui)) bruler(R.qui); else ouf(R.qui); }
      } else if (R.phase === 'ouf') {
        if (R.t3 > 2.5) {
          R.tour = R.tour === 'elle' ? 'lui' : 'elle'; R.t3 = 0; R.relance = false;
          if (R.tour === 'elle') { R.phase = 'choix'; R.sel = premiereLibre(); }
          else { R.phase = 'reflechit'; R.hesite = hesitation(); X.bulleLui(AV.choisir(Math.random, ['Hmmm… 🤔', 'Celle-là ? Non… 🤔', 'Je le sens pas… 😬']), 2.2); }
          sousTitre();
        }
      }
      R.brasElle = lerp(R.brasElle, bras.elle, Math.min(1, dt * 10));
      R.brasLui = lerp(R.brasLui, bras.lui, Math.min(1, dt * 10));
    }
    function ouf(qui) {
      R.phase = 'ouf'; R.t3 = 0; AV.audio.ping(0.6); sousTitre();
      var reste = NP - R.pris;
      if (qui === 'elle') {
        bulleElle(AV.choisir(Math.random, ['Mmmh 😋 Rien du tout !', 'Ouf… 😮‍💨', 'Trop bon… et pas piquant 😏']), 1.4);
        setTimeout(function () { if (R.etape === 'jeu') X.bulleLui(AV.choisir(Math.random, ['Gloups… à moi 😬', 'Pfff, chanceuse 😒', 'Plus que ' + reste + '… 😰']), 1.2); }, 1250);
      } else {
        X.bulleLui(AV.choisir(Math.random, ['Hé hé… rien ! 😎', 'Ouf 😅 À toi mon cœur', 'Même pas peur 💪']), 1.4);
        setTimeout(function () { if (R.etape === 'jeu') X.bulleLui('Plus que ' + reste + ' cuillères… 😈', 1.2); }, 1250);
      }
    }
    var vB = new THREE.Vector3();
    function placerBoutons(camera) {
      var actif = R.etape === 'jeu' && R.tour === 'elle' && R.phase === 'choix';
      choixEl.classList.toggle('off', !actif);
      anneau.material.opacity = actif ? 0.65 + Math.sin(tps * 6) * 0.25 : 0;
      if (actif) { var ps = portions[R.sel].g.position; anneau.position.set(ps.x, YP + 0.035, ps.z); }
      if (!actif) return;
      camera.updateMatrixWorld();
      var w = window.innerWidth, h = window.innerHeight;
      portions.forEach(function (p, i) {
        var b = boutons[i];
        if (p.pris) { b.style.display = 'none'; return; }
        b.style.display = 'block';
        p.g.getWorldPosition(vB); vB.y += 0.04; vB.project(camera);
        b.style.left = ((vB.x + 1) / 2 * w).toFixed(1) + 'px'; b.style.top = ((1 - vB.y) / 2 * h).toFixed(1) + 'px';
        b.classList.toggle('sel', i === R.sel);
      });
    }

    // ---------- 3. la cuillère piégée ----------
    function bruler(qui) {
      R.etape = 'brule'; R.victime = qui; R.t2 = 0; R.phase = null; R.feu = 1; R.cibleFeu = 1; R.rouge = 0; R.b1 = R.b2 = R.b3 = false;
      AV.audio.flammes(); AV.audio.sourdine(true);
      choixEl.classList.add('off'); anneau.material.opacity = 0; effacerBulles();
      mo.pilote = piloteBrule; sousTitre();
    }
    function piloteBrule(dt, e, a, Jj, camera) {
      J = Jj; R.t2 += dt; var t = R.t2, v = R.victime;
      R.rouge = Math.min(1, t / 0.7);
      assiseElle(Jj, 0);
      var tete = Jj.parts.tete;
      if (v === 'elle') {
        tete.rotation.set(-0.15, Math.sin(t * 9) * 0.25 * R.rouge, Math.sin(t * 38) * 0.1 * R.rouge);
        Jj.parts.brasG.rotation.set(-2.5 + Math.sin(t * 21) * 0.35, 0, 0.35); Jj.parts.brasD.rotation.set(-2.5 + Math.cos(t * 21) * 0.35, 0, -0.35);
      } else {
        regardVers(tete, FACE, SEAT_O.x, SEAT_O.z, L.x, L.z, Math.min(1, dt * 5)); tete.rotation.x = 0;
        if (t > 1.5) { Jj.parts.brasD.rotation.set(-2.0, 0, -0.5); tete.rotation.z = Math.sin(t * 16) * 0.08; } // elle se tient les côtes 😂
      }
      X.cameraVers(camera, CAMJ.x, 3.05, CAMJ.z, VISEJ.x, HBAR + 0.5, VISEJ.z, dt, 3);
      var sec = (v === 'elle' ? 0.06 : 0.025) * R.rouge * (t < 2.5 ? 1 : 0.4);
      camera.position.x += rnd(sec); camera.position.y += rnd(sec);
      feuEl.style.opacity = (v === 'elle' ? 0.95 : 0.3) * R.rouge;
      if (!R.b1 && t > 0.35) { R.b1 = true; if (v === 'elle') bulleElle('🔥 AAAAAAAH !!! 🔥', 2.2); else X.bulleLui('🔥 AAAAAAAH !!! 🔥', 2.2); AV.audio.cri(); }
      if (v === 'elle') {
        if (!R.b2 && t > 1.7) { R.b2 = true; X.bulleLui('AHAHAHAHA 😂😂😂', 1.8); }
        if (!R.b3 && t > 3.3) { R.b3 = true; X.bulleLui('Vite ! Lait et pain de mie !! 🥛🍞', 2.4); }
        if (t > 4.5) secours();
      } else {
        if (t > 1.3 && L.etat === 'tabouret') { // il bondit de son tabouret et part en courant
          L.etat = 'marche'; L.vitesse = 3.6; L.chemin = [cK.pt(S_A, TAB.d + 0.9), boucle(0)]; L.ensuite = 'feu'; R.phi = 0; X.colLui.r = 0; R.tCri = 0.9;
        }
        if (!R.b2 && t > 1.8) { R.b2 = true; bulleElle('😂😂😂', 1.6); }
        if (t > 3.6) secours();
      }
    }
    function secours() {
      R.etape = 'secours'; R.chrono = 0; R.t2 = 0; AV.audio.sourdine(false);
      var Jj = J; Jj.position.set(LEVE_O.x, 0, LEVE_O.z); X.poseDebout(Jj);
      Jj.parts.tete.rotation.set(0, 0, 0);
      Jj.groupe.rotation.y = angleVers(cK.u.x, cK.u.z); Jj.angle = Jj.groupe.rotation.y; Jj.vitesse.set(0, 0, 0); Jj.vy = 0;
      mo.pilote = null; AV.controles.vider();
      if (AV.jeu && AV.jeu.camera) AV.jeu.camera(Jj.angle + Math.PI, 0.62, 6.4);
      LAIT_INT.rayon = 1.4; PAIN_INT.rayon = 1.3; baliseLait.visible = balisePain.visible = true;
      LAIT_INT.texte = R.victime === 'elle' ? '✋ Boire du lait 🥛' : '✋ Prendre le lait 🥛';
      PAIN_INT.texte = R.victime === 'elle' ? '✋ Manger du pain de mie 🍞' : '✋ Prendre le pain de mie 🍞';
      jaugeEl.style.display = 'block'; majJauge(); sousTitre();
    }
    function majJauge() {
      var qui = R.victime === 'elle' ? nomElle : nomLui;
      var t = '🌶️ ' + qui + (R.feu > 0.01 ? ' brûle !' : ' est sauvé' + (R.victime === 'elle' ? 'e' : '') + ' !') + ' · ⏱ ' + R.chrono.toFixed(1) + ' s';
      if (jTitre.textContent !== t) jTitre.textContent = t;
      jBarre.style.width = Math.round(R.feu * 100) + '%';
      var it = (R.lait ? '🥛 ✔' : '🥛 …') + '    ' + (R.pain ? '🍞 ✔' : '🍞 …');
      if (jItems.textContent !== it) jItems.textContent = it;
    }
    function attraper(quoi) {
      if (R.etape !== 'secours' || R[quoi]) return;
      R[quoi] = true;
      (quoi === 'lait' ? baliseLait : balisePain).visible = false;
      var it = quoi === 'lait' ? LAIT_INT : PAIN_INT; it.rayon = 0; it.x = 1e6;
      if (quoi === 'lait') AV.audio.porte(false); else AV.audio.page();
      if (R.victime === 'elle') {
        R.cibleFeu = R.lait && R.pain ? 0 : 0.5;
        R.etape = 'mange'; R.quoi = quoi; R.t2 = 0; R.son = false;
        if (quoi === 'pain') pain.visible = false;
        mo.pilote = piloteMange;
      } else {
        if (quoi === 'pain') pain.visible = false;
        X.bulleLui(quoi === 'lait' ? 'LE LAIT !!! DONNE !!! 🥛' : 'DU PAIN !!! VITE !!! 🍞', 2); R.tCri = 2.4;
        if (R.lait && R.pain) { L.etat = 'rejoint'; R.route = null; R.tRoute = 0; X.dire('🏃 ' + nomLui + ' arrive en courant…', 3); }
      }
      majJauge();
    }
    // elle boit / mange sur place
    function piloteMange(dt, e, a, Jj) {
      J = Jj; R.t2 += dt; var t = R.t2;
      Jj.vitesse.set(0, 0, 0); X.marcheJambes(Jj, 0, 0);
      var obj = R.quoi === 'lait' ? brique : tranche; obj.visible = true;
      bouche('elle', vT); obj.position.copy(vT);
      obj.rotation.set(0, Jj.groupe.rotation.y, 0);
      if (R.quoi === 'lait') { obj.position.y += 0.05; obj.rotateX(Math.min(1, t * 2.5) * 2.0); }
      else { obj.rotateX(-0.2); var s = Math.max(0.25, 1 - Math.max(0, t - 0.5) * 0.5); obj.scale.set(s, s, 1); }
      Jj.parts.brasD.rotation.set(-2.3, 0, -0.25); Jj.parts.brasG.rotation.set(-1.5, 0, 0.35);
      Jj.parts.tete.rotation.x = R.quoi === 'lait' ? -0.35 * Math.min(1, t * 2.5) : Math.sin(t * 14) * 0.06;
      if (!R.son) { R.son = true; if (R.quoi === 'lait') { AV.audio.gloups(); bulleElle('Glou glou glou 🥛', 1.7); } else { AV.audio.miam(1); setTimeout(function () { AV.audio.miam(0.8); }, 650); bulleElle('Miam miam 🍞', 1.7); } }
      R.feu = Math.max(R.cibleFeu, R.feu - dt * 0.35);
      if (t > 1.9) {
        obj.visible = false; obj.scale.set(1, 1, 1); Jj.parts.tete.rotation.x = 0; X.poseDebout(Jj); Jj.angle = Jj.groupe.rotation.y;
        R.etape = 'secours'; mo.pilote = null; AV.controles.vider();
        if (R.lait && R.pain) apaiser();
        else bulleElle(R.lait ? 'Ça brûle encore !! 🍞 Le pain !' : 'Encore !!! 🥛 Le lait !', 2);
      }
    }

    // ---------- 4a. c'était elle : il vient s'excuser (après avoir tout filmé…) ----------
    function apaiser() {
      R.etape = 'apaise'; R.t2 = 0; R.t3 = 0; R.cibleFeu = 0; R.arrive = false; R.lg = -1; R.camSgn = null; mo.pilote = piloteFinal; X.resetCam(); tel.visible = false;
      var p = J.position, a = sd(p), dev;
      if (a.d < X.BAR_D0 - 0.1) dev = cK.pt(a.s + (a.s > X.BAR_S1 ? -1.0 : 1.0), a.d); // dans la cuisine : à côté d'elle, le long du plan
      else { var dx = L.x - p.x, dz = L.z - p.z, d = Math.hypot(dx, dz) || 1; dev = { x: p.x + dx / d * 1.0, z: p.z + dz / d * 1.0 }; }
      L.etat = 'marche'; L.vitesse = 2.4; L.chemin = chemin({ x: L.x, z: L.z }, dev); L.ensuite = 'debout';
      R.finLignes = [
        [0.3, 'lui', 'Ça va mon cœur ? 😅', 2.4],
        [2.9, 'lui', 'Pardon… la prochaine fois je l\'enlève de la cocotte 🌶️', 3.0],
        [6.1, 'elle', 'Attends… tu m\'as FILMÉE ?! 😤', 2.4],
        [8.7, 'lui', '…Peut-être 😇 Je t\'aime ❤', 2.4],
        [11.2, 'calin'], [13.4, 'fin']
      ];
      sousTitre(); majJauge();
    }
    // ---------- 4b. c'était lui : elle le sauve ----------
    function sauver() {
      R.etape = 'sauve'; R.t2 = 0; R.t3 = 0; R.lg = -1; R.arrive = true; R.camSgn = null; L.etat = 'boit'; R.sv = 'lait'; mo.pilote = piloteFinal; X.resetCam();
      R.finLignes = [
        [0.1, 'lait'], [2.5, 'pain'], [4.6, 'lui', '…😮‍💨', 1.2],
        [5.6, 'lui', 'Plus jamais de piment antillais… 😭', 2.6],
        [8.4, 'lui', 'Merci mon cœur… tu m\'as sauvé la vie ❤', 2.6],
        [11.2, 'lui', '…mais avoue, il était trop bon ce rougail 😋', 2.6],
        [13.9, 'calin'], [16.0, 'fin']
      ];
      sousTitre();
    }
    function piloteFinal(dt, e, a, Jj, camera, x) {
      J = Jj; x = x || {}; R.t2 += dt;
      Jj.vitesse.set(0, 0, 0); X.marcheJambes(Jj, 0, 0);
      var dx = L.x - Jj.position.x, dz = L.z - Jj.position.z, d = Math.hypot(dx, dz) || 1;
      if (R.etape === 'apaise' && !R.arrive) {
        if (L.etat === 'debout' || R.t2 > 9) { R.arrive = true; if (L.etat !== 'debout') { L.etat = 'debout'; L.chemin = null; } }
      }
      if (d < 3) Jj.groupe.rotation.y = AV.angleLerp(Jj.groupe.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
      // caméra de côté
      var mx = (L.x + Jj.position.x) / 2, mz = (L.z + Jj.position.z) / 2, px = -dz / d, pz = dx / d;
      // du côté du séjour (pas derrière une cloison), sans basculer d'un côté à l'autre
      var dot = (CENTRE.x - mx) * px + (CENTRE.z - mz) * pz;
      if (R.camSgn == null) R.camSgn = dot >= 0 ? 1 : -1; else if (dot * R.camSgn < -0.5) R.camSgn = -R.camSgn;
      px *= R.camSgn; pz *= R.camSgn;
      X.cameraVers(camera, mx + px * 3.0, 2.6, mz + pz * 3.0, mx, 1.75, mz, dt, 2.2);
      if (!R.arrive) return;
      R.t3 += dt;
      var Ls = R.finLignes;
      // ✋ : réplique suivante
      if (x.action && R.lg >= 0 && R.lg + 1 < Ls.length && Ls[R.lg][1] !== 'calin' && Ls[R.lg + 1][1] !== 'fin' && Ls[R.lg][1] !== 'lait' && Ls[R.lg][1] !== 'pain') { R.t3 = Ls[R.lg + 1][0]; }
      while (R.lg + 1 < Ls.length && R.t3 >= Ls[R.lg + 1][0]) {
        R.lg++; var l = Ls[R.lg];
        if (l[1] === 'lui') { effacerBulles(); X.bulleLui(l[2], l[3]); }
        else if (l[1] === 'elle') { effacerBulles(); bulleElle(l[2], l[3]); }
        else if (l[1] === 'lait') { R.sv = 'lait'; AV.audio.gloups(); bulleElle('Tiens !! 🥛', 1.4); }
        else if (l[1] === 'pain') { R.sv = 'pain'; AV.audio.miam(1); setTimeout(function () { AV.audio.miam(1); }, 700); R.cibleFeu = 0; }
        else if (l[1] === 'calin') { L.etat = 'calin'; AV.audio.bisou(); R.calin = 0; }
        else if (l[1] === 'fin') { terminer(); return; }
      }
      // lui boit tout le lait d'un trait, puis engloutit le paquet de pain de mie
      if (R.etape === 'sauve' && (R.sv === 'lait' || R.sv === 'pain') && R.lg <= 1) {
        var obj = R.sv === 'lait' ? brique : pain; obj.visible = true; bouche('lui', vT); obj.position.copy(vT); obj.rotation.set(0, L.ang, 0);
        if (R.sv === 'lait') { obj.position.y += 0.05; obj.rotateX(2.1); R.feu = Math.max(0.5, R.feu - dt * 0.3); }
        else { brique.visible = false; obj.rotateY(Math.PI / 2); var s = Math.max(0.15, 1 - (R.t3 - 2.5) * 0.45); obj.scale.set(s, s, s); R.feu = Math.max(0, R.feu - dt * 0.4); }
        Jj.parts.brasD.rotation.set(-0.2, 0, 0.15);
      } else if (R.etape === 'sauve' && R.lg >= 2) { brique.visible = false; pain.visible = false; if (L.etat === 'boit') L.etat = 'debout'; }
      if (R.etape === 'sauve' && R.lg >= 2 && R.lg <= 4 && Math.random() < dt * 5) { lui.tete.getWorldPosition(vT); var sd2 = Math.random() < 0.5 ? -1 : 1; lui.tete.localToWorld(vT.set(sd2 * 0.13, 0.03, 0.27)); particule('larme', vT, rnd(0.3), 0.6, rnd(0.3), 0.7, 0.12); }
      if (R.etape === 'apaise') R.feu = Math.max(0, R.feu - dt * 0.5);
      if (L.etat === 'calin') {
        R.calin += dt;
        var cible = 0.72; if (d > cible) { var k = Math.min(1, dt * 3); L.x -= dx / d * (d - cible) * k; L.z -= dz / d * (d - cible) * k; }
        Jj.parts.brasG.rotation.set(-1.3, 0, 0.5); Jj.parts.brasD.rotation.set(-1.3, 0, -0.5);
        if (Math.random() < dt * 4) { Jj.parts.tete.getWorldPosition(vT); vT.lerp(lui.tete.getWorldPosition(vT2), 0.5); vT.y += 0.4; particule('coeur', vT, rnd(0.25), 0.7, rnd(0.25), 1.4, 0.2); }
      } else if (!(R.etape === 'sauve' && R.lg <= 1)) { Jj.parts.brasG.rotation.set(0, 0, -0.15); Jj.parts.brasD.rotation.set(0, 0, 0.15); }
    }
    function terminer() {
      R.etape = 'fin'; mo.pilote = null; L.etat = 'debout'; X.poseDebout(J); J.angle = J.groupe.rotation.y; AV.controles.vider();
      R.feu = 0; feuEl.style.opacity = '0'; brique.visible = false; tel.visible = false; X.colLui.r = 0.42;
      jaugeEl.style.display = 'none';
      ints(true); sousTitre();
      if (api) api.trouver();
    }

    // ---------- animation : Axel, la cocotte, les flammes ----------
    var cris = ['AAAAH ÇA BRÛLE 🔥', 'DU LAIT !!! 🥛', 'POURQUOI J\'AI MIS CE PIMENT 😭', 'DU PAIN DE MIE !!! 🍞', 'JE VAIS MOURIR 😵'], iCri = 0;
    var rires = ['Je filme hein 📱😂', 'Respire mon cœur 😂', 'Le lait est dans le frigo !! 🥛', 'Le pain de mie, à côté de l\'évier ! 🍞', 'AHAHAHA 😂'], iRire = 0;
    mo.anime(function (dt, t, joueur) {
      tps += dt; posJ = joueur;
      var lg = lui.groupe, lh = lui.haut;
      // la vapeur suit la cocotte (jet puissant quand on lâche la pression)
      X.poele.position.set(coc.position.x, coc.position.y + HC - 0.1 + (couv.visible ? 0.12 : 0), coc.position.z);
      X.vapeur.material.opacity = R.jet > 0 ? 0.7 : 0.35; X.vapeur.material.size = R.jet > 0 ? 0.4 : 0.22;
      if (R.jet > 0) R.jet -= dt;
      // le couvercle se soulève et part sur le côté
      if (R.ouvre && R.couv < 1) { R.couv = Math.min(1, R.couv + dt * 1.2); }
      var kc = R.couv * R.couv * (3 - 2 * R.couv);
      couv.position.set(-0.55 * Math.max(0, kc * 2 - 1), HC + Math.sin(kc * Math.PI) * 0.35 + (kc > 0.5 ? -0.25 * (kc - 0.5) * 2 : 0), 0);
      couv.rotation.z = Math.sin(kc * Math.PI) * 0.5;
      soupape.rotation.y += dt * (R.etape === 'accueil' ? 6 : R.jet > 0 ? 25 : 0);

      if (L.etat === 'cocotte') {
        L.x = X.CUIS.x; L.z = X.CUIS.z;
        var dj = Math.hypot(joueur.x - L.x, joueur.z - L.z);
        var ang = L.regard ? angleVers(L.regard.x - L.x, L.regard.z - L.z) : X.angCuis;
        if (!L.regard && dj < 3.2 && Math.sin(t * 0.6) > 0.3) ang = X.angCuis + Math.max(-1.2, Math.min(1.2, AV.angleLerp(0, angleVers(joueur.x - L.x, joueur.z - L.z) - X.angCuis, 1)));
        L.ang = AV.angleLerp(L.ang, ang, Math.min(1, dt * 4)); lg.position.set(L.x, 0, L.z); lg.rotation.y = L.ang;
        var re = R.remue;
        lui.spatule.visible = re;
        lui.brasD.rotation.set(re ? -1.1 + Math.sin(t * 5) * 0.25 : R.levier ? -1.35 : -0.25, re ? Math.cos(t * 5) * 0.3 : 0, re ? 0.1 : 0.2);
        lui.brasG.rotation.set(R.levier ? -0.6 : -0.25, 0, -0.2);
        lui.jambeG.rotation.set(0, 0, 0); lui.jambeD.rotation.set(0, 0, 0);
        lh.rotation.set(re ? 0.15 : 0, 0, 0); lh.position.y = 0.62;
        lui.tete.rotation.set(re ? 0.3 : 0, 0, Math.sin(t * 1.3) * 0.06);
        AXEL_INT.x = L.x; AXEL_INT.z = L.z;
        if (R.etape === 'accueil') {
          R.tBulle -= dt;
          if (R.tBulle <= 0 && dj < 4.2) { R.tBulle = 8; X.bulleLui(AV.choisir(Math.random, ['Ça mijote… 😏', 'Viens voir ce que je nous ai fait ! 🌶️', 'Pas touche à la soupape 😬', 'Ça sent les îles hein ? 🏝️']), 3); }
          R.tCoc -= dt; if (R.tCoc <= 0) { R.tCoc = 1.6; AV.audio.cocotte(false); }
        }
      } else if (L.etat === 'tabouret') {
        L.x = SEAT_A.x; L.z = SEAT_A.z; L.ang = FACE;
        lg.position.set(L.x, Y_ASSIS_A, L.z); lg.rotation.y = FACE;
        lui.jambeG.rotation.set(-1.45, 0, -0.04); lui.jambeD.rotation.set(-1.45, 0, 0.04);
        lui.spatule.visible = false; lh.position.y = 0.62;
        var filme = R.victime === 'elle' && (R.etape === 'secours' || R.etape === 'mange' || R.etape === 'brule' && R.t2 > 2);
        tel.visible = filme;
        if (filme) {
          lui.brasD.rotation.set(-1.75, 0.2, 0.25); lui.brasG.rotation.set(-0.5, 0, -0.1);
          lh.rotation.set(-0.08, 0, 0); lh.position.y = 0.62 + Math.abs(Math.sin(t * 11)) * 0.035; // il rit
          regardVers(lui.tete, FACE, L.x, L.z, joueur.x, joueur.z, Math.min(1, dt * 5)); lui.tete.rotation.x = -0.15;
          R.tRire -= dt;
          if (R.etape !== 'brule' && R.tRire <= 0) { R.tRire = 3.4; X.bulleLui(rires[iRire++ % rires.length], 2.6); }
        } else {
          var kb = R.brasLui;
          lui.brasG.rotation.set(-1.2, 0, 0.1); lui.brasD.rotation.set(-1.2 - 0.95 * kb, 0, -0.1 - 0.35 * kb);
          lh.rotation.set(0.04, 0, 0);
          if (R.mache === 'lui') { lui.tete.rotation.x = Math.sin(t * 14) * 0.07; }
          else if (R.etape === 'jeu' && R.tour === 'elle') { regardVers(lui.tete, FACE, L.x, L.z, SEAT_O.x, SEAT_O.z, Math.min(1, dt * 4)); lui.tete.rotation.x = 0.05; }
          else if (R.etape === 'brule' && R.victime === 'lui') { lui.tete.rotation.set(-0.2, Math.sin(t * 9) * 0.3, Math.sin(t * 38) * 0.1); lui.brasG.rotation.set(-2.5 + Math.sin(t * 21) * 0.35, 0, -0.35); lui.brasD.rotation.set(-2.5 + Math.cos(t * 21) * 0.35, 0, 0.35); }
          else { lui.tete.rotation.y = lerp(lui.tete.rotation.y, 0, Math.min(1, dt * 4)); lui.tete.rotation.x = lerp(lui.tete.rotation.x, 0.3, Math.min(1, dt * 4)); }
        }
      } else if (L.etat === 'feu' || L.etat === 'rejoint') {
        var px = L.x, pz = L.z;
        if (L.etat === 'feu') { R.phi += dt * 3.4 / 1.38; var q = boucle(R.phi); L.x = q.x; L.z = q.z; }
        else {
          R.tRoute -= dt;
          if (R.tRoute <= 0 || !R.route || !R.route.length) { R.tRoute = 0.4; R.route = chemin({ x: L.x, z: L.z }, joueur); }
          var cr = R.route[0], ddx = cr.x - L.x, ddz = cr.z - L.z, dd = Math.hypot(ddx, ddz), pas = Math.min(dd, dt * 3.4);
          if (dd > 0.001) { L.x += ddx / dd * pas; L.z += ddz / dd * pas; }
          if (dd < 0.08) R.route.shift();
          if (R.etape === 'secours' && Math.hypot(joueur.x - L.x, joueur.z - L.z) < 1.15) sauver();
        }
        if (Math.abs(L.x - px) + Math.abs(L.z - pz) > 1e-4) L.ang = AV.angleLerp(L.ang, Math.atan2(L.x - px, L.z - pz), Math.min(1, dt * 12));
        lg.position.set(L.x, Math.abs(Math.sin(t * 11)) * 0.12, L.z); lg.rotation.y = L.ang;
      } else if (L.etat === 'boit' || L.etat === 'debout' || L.etat === 'calin') {
        lg.position.set(L.x, 0, L.z);
        L.ang = AV.angleLerp(L.ang, angleVers(joueur.x - L.x, joueur.z - L.z), Math.min(1, dt * 6)); lg.rotation.y = L.ang;
        lui.jambeG.rotation.set(0, 0, 0); lui.jambeD.rotation.set(0, 0, 0); lh.position.y = 0.62; lui.spatule.visible = false;
        if (L.etat === 'boit') {
          var lait = R.sv === 'lait';
          lui.brasD.rotation.set(-2.6, 0, 0.2); lui.brasG.rotation.set(lait ? -0.3 : -2.3, 0, -0.2);
          lui.tete.rotation.set(lait ? -0.55 : Math.sin(t * 14) * 0.07, 0, 0); lh.rotation.set(lait ? -0.15 : 0.05, 0, 0);
        } else if (L.etat === 'calin') {
          lui.brasD.rotation.set(-1.35, 0, 0.55); lui.brasG.rotation.set(-1.35, 0, -0.55); lh.rotation.set(0.12, 0, 0); lui.tete.rotation.set(0.15, 0, 0.15);
        } else {
          lui.brasD.rotation.set(-0.15, 0, 0.15); lui.brasG.rotation.set(-0.15, 0, -0.15); lh.rotation.set(0, 0, 0); lui.tete.rotation.set(0, 0, Math.sin(t * 1.3) * 0.06);
        }
      }
      // en feu : il agite les bras en courant et hurle
      if (R.victime === 'lui' && (L.etat === 'feu' || L.etat === 'rejoint' || (L.etat === 'marche' && R.feu > 0.3))) {
        lui.brasG.rotation.set(-2.7 + Math.sin(t * 17) * 0.5, 0, -0.4); lui.brasD.rotation.set(-2.7 + Math.cos(t * 17) * 0.5, 0, 0.4);
        lui.tete.rotation.set(-0.15, 0, Math.sin(t * 9) * 0.12); lui.spatule.visible = false;
        if (L.etat !== 'marche') { var s = Math.sin(t * 15); lui.jambeG.rotation.set(s * 0.9, 0, 0); lui.jambeD.rotation.set(-s * 0.9, 0, 0); }
        R.tCri -= dt;
        if (R.tCri <= 0 && R.etape === 'secours') { R.tCri = 2.7; X.bulleLui(cris[iCri++ % cris.length], 2.4); }
      }
      // le feu : visage rouge, flammes par la bouche, fumée par les oreilles
      if (R.etape !== 'mange' && R.etape !== 'sauve' && R.etape !== 'apaise') R.feu = Math.max(R.cibleFeu, R.feu);
      if (R.victime) {
        var tt = R.victime === 'lui' ? lui.tete : (J && J.parts.tete);
        var kr = R.rouge * Math.min(1, R.feu * 1.6);
        if (tt) rougir(tt, kr);
        if (tt && R.feu > 0.08 && R.etape !== 'jeu') {
          R.tFlamme -= dt;
          if (R.tFlamme <= 0) {
            R.tFlamme = 0.06 / Math.max(0.3, R.feu);
            tt.getWorldPosition(vC); tt.localToWorld(vM.set(0, -0.08, 0.36));
            var fx = vM.x - vC.x, fz = vM.z - vC.z, n = Math.hypot(fx, fz) || 1;
            particule('feu', vM, fx / n * 1.7 + rnd(0.3), 0.4 + Math.random() * 0.5, fz / n * 1.7 + rnd(0.3), 0.5, 0.24 * (0.6 + R.feu * 0.6));
            if (Math.random() < 0.3) { var cote = Math.random() < 0.5 ? -1 : 1; tt.localToWorld(vE.set(cote * 0.34, 0.05, 0)); particule('fumee', vE, (vE.x - vC.x) * 3, 0.9, (vE.z - vC.z) * 3, 0.8, 0.2); }
          }
          R.tSon = (R.tSon || 0) - dt; if (R.tSon <= 0 && R.feu > 0.4) { R.tSon = 1.4; AV.audio.flammes(); }
        }
      }
      if (R.etape === 'secours' || R.etape === 'mange' || R.etape === 'apaise' || R.etape === 'sauve') {
        if (R.etape === 'secours' || R.etape === 'mange') R.chrono += dt;
        feuEl.style.opacity = (R.victime === 'elle' ? 0.85 : 0.18) * Math.min(1, R.feu * 1.4);
        majJauge();
        if ((R.etape === 'apaise' || R.etape === 'sauve') && R.feu <= 0.01 && !R.tJauge) R.tJauge = tps;
        if (R.tJauge && tps - R.tJauge > 4) jaugeEl.style.display = 'none';
      }
      // balises
      [baliseLait, balisePain].forEach(function (b, i) { if (b.visible) { b.halo.material.opacity = 0.35 + Math.sin(t * 4 + i) * 0.2; b.children[1].position.y = 0.6 + Math.sin(t * 3 + i) * 0.06; } });
      majParticules(dt);
    });
    // en vue libre, la caméra tremble quand elle a la bouche en feu
    var surCamBase = mo.surCamera;
    mo.surCamera = function (camera, dt, t) {
      if (surCamBase) surCamBase(camera, dt, t);
      if (R.victime === 'elle' && R.etape === 'secours' && R.feu > 0.05) camera.rotateZ(Math.sin(t * 31) * 0.012 * R.feu);
    };

    // ---------- début, conseils, fin ----------
    L.etat = 'cocotte'; L.regard = null;
    mo.debut = function (a) {
      api = a; sousTitre();
      if (AV.jeu && AV.jeu.camera) AV.jeu.camera(mo.depart.angle + Math.PI, 0.72, 6.2);
      document.getElementById('hud-aide-clavier').textContent = 'ZQSD / flèches : bouger · glisser : caméra · E : ✋ action · ← → : choisir une cuillère';
      setTimeout(function () { if (R.etape === 'accueil') X.bulleLui('Viens voir ce que je nous ai préparé ! 🌶️', 3.2); }, 1200);
    };
    mo.astuce = function () {
      var n = X.note(); if (n) return n.t;
      switch (R.etape) {
        case 'accueil': return '👨‍🍳 Ça sent le rougail… va voir ' + nomLui + ' en cuisine !';
        case 'ouverture': return '✋ réplique suivante';
        case 'jeu':
          if (R.tour === 'elle' && R.phase === 'choix') return '🥄 À toi ! Touche une cuillère dans la cocotte (ou ← → puis ✋)';
          if (R.phase === 'reflechit') return '🤔 ' + nomLui + ' choisit sa cuillère…';
          return null;
        case 'secours':
          if (R.victime === 'elle') return R.lait ? '🍞 Le pain de mie, sur la planche près de l\'évier ! VITE !' : R.pain ? '🥛 Le lait est dans le frigo ! VITE !' : '🥛 Le lait est dans le frigo · 🍞 le pain de mie près de l\'évier · VITE !';
          if (R.lait && R.pain) return '🏃 ' + nomLui + ' arrive en courant…';
          return '🥛🍞 Rapporte du lait (frigo) et du pain de mie (près de l\'évier) à ' + nomLui + ' !';
        case 'sauve': case 'apaise': return R.arrive ? '✋ réplique suivante' : null;
        case 'fin': return '🌶️ Bon appétit ! La porte d\'entrée te ramène au village';
      }
      return null;
    };
    mo.surTrouve = function (ctx) { ctx.fin(cfg.surprise ? cfg : null); };
    var nettoyerBase = mo.nettoyer;
    mo.nettoyer = function () {
      nettoyerBase();
      [feuEl, jaugeEl, choixEl, styleEl].forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
      visages.forEach(function (m) { if (m.userData.matOrig) { m.material.dispose(); m.material = m.userData.matOrig; delete m.userData.matOrig; } });
      if (J) { J.groupe.visible = true; if (J.ombre) J.ombre.visible = true; J.parts.tete.rotation.set(0, 0, 0); }
      var f = document.getElementById('fondu'); if (f) f.classList.remove('noir');
    };
    // débogage : AV.jeu.monde().debug
    mo.debug = {
      etat: function () { return { etape: R.etape, tour: R.tour, phase: R.phase, pris: R.pris, sel: R.sel, victime: R.victime, feu: +R.feu.toFixed(2), lait: R.lait, pain: R.pain, lui: L.etat, lx: +L.x.toFixed(2), lz: +L.z.toFixed(2), chrono: +R.chrono.toFixed(1), lg: R.lg }; },
      ouvrir: function () { ouvrir(); },
      jouer: function () { if (R.etape === 'accueil') { R.etape = 'ouverture'; ints(false); } installer(); },
      forcer: function (qui) { R.force = qui === 'axel' || qui === 'lui' ? 'lui' : 'elle'; },
      prendre: function (i) { prendre(i == null ? R.sel : i); },
      attraper: function (q) { attraper(q); },
      rejoindre: function () { if (posJ) { L.x = posJ.x + 1.0; L.z = posJ.z; } },
      points: function () { return { frigo: [FRIGO.x, FRIGO.z], pain: [PAINW.x, PAINW.z], siegeO: [SEAT_O.x, SEAT_O.z], siegeA: [SEAT_A.x, SEAT_A.z], boucle: [0, 1, 2, 3, 4, 5].map(function (k) { var q = boucle(k * Math.PI / 3); return [+q.x.toFixed(2), +q.z.toFixed(2)]; }) }; },
      teleporter: function (x, z) { var j = AV.jeu.joueur(); if (j) { j.position.x = x; j.position.z = z; } }
    };
  };
})(window.AV);
