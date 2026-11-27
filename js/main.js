/* Boucle principale : rendu, caméra 3ème personne, village, jours, recherche de l'animal, indices */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var params = new URLSearchParams(location.search);
  var TEST = params.get('test') === '1' || location.hash === '#test'; // #test : pour la version en ligne (claude.ai)
  var CONFIG = window.CONFIG || { annee: new Date().getFullYear(), titre: 'Louloute\'s Advent Calendar', indiceApres: 120, indiceChaudFroid: 240 };
  var JOURS = window.JOURS || [];

  var renderer, scene, camera, hemi, soleil, dirSoleil = new THREE.Vector3(0.5, 1, 0.3).normalize();
  var monde = null, joueur, animal = null, jourCfg = null;
  var cam = { lacet: 0, tangage: 0.38, dist: 6.5, actuelle: 6.5 };
  var horloge = new THREE.Clock(), temps = 0;
  var enJeu = false, transition = false;
  var recherche = 0, trouve = false, prochainIndice = 0;
  var raycaster = new THREE.Raycaster();
  var cible = null;
  var cinema = null; // caméra « séance » : { pos, cible, texte, quitter }
  var camCible = new THREE.Vector3();
  // vue à la première personne (décor qui fournit m.premierePersonne : { pos, lacet, tangage, tangMin, tangMax, champ, viser })
  var fp = null, fpVue = { lacet: 0, tangage: 0 }, fpAppui = false, fpClavier = null;
  var AIDE_3P = 'ZQSD / flèches : bouger · Maj : courir · Espace : sauter · E : action · glisser : caméra';
  var AIDE_FP = 'Glisser ou flèches : regarder · molette : zoom · E ou Espace : action';
  function nomDe(cfg) { return cfg.nom || AV.nomAnimal(cfg.animal); }
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Progression ----------
  var progression = (function () {
    try { var p = JSON.parse(localStorage.getItem('av_progression')); if (p && p.jours) return p; } catch (e) { }
    return { jours: {} };
  })();
  function sauver() { try { localStorage.setItem('av_progression', JSON.stringify(progression)); } catch (e) { } }
  function nbTrouves() { var n = 0; for (var k in progression.jours) if (progression.jours[k]) n++; return n; }

  function debloque(n) { return TEST || new Date() >= new Date(CONFIG.annee, 11, n); }
  function aujourdhui() {
    var d = new Date();
    return (d.getFullYear() === CONFIG.annee && d.getMonth() === 11 && d.getDate() <= 24) ? d.getDate() : 0;
  }
  function etats() {
    var r = [], a = aujourdhui();
    for (var n = 1; n <= 24; n++) r.push(progression.jours[n] ? 'fait' : !debloque(n) ? 'verrouille' : n === a ? 'aujourdhui' : 'ouvert');
    return r;
  }
  function cfgJour(n) {
    for (var i = 0; i < JOURS.length; i++) if (JOURS[i].jour === n) return JOURS[i];
    return { jour: n, titre: 'Jour ' + n, biome: 'campagne', animal: 'renard', surprise: { type: 'mot', texte: 'À compléter dans data/jours.js' } };
  }

  // ---------- Interface ----------
  function message(txt) { var m = $('hud-message'); if (txt) { m.innerHTML = txt; m.classList.add('visible'); } else m.classList.remove('visible'); }
  function indice(txt, couleur) { var e = $('hud-indice'); if (txt) { e.textContent = txt; e.style.background = couleur || ''; e.classList.add('visible'); } else e.classList.remove('visible'); }
  // dans un biome, l'encadré en haut à gauche s'efface après quelques secondes (immersion) ;
  // il réapparaît brièvement quand son texte change (progression), et reste affiché au village
  var hudMinuteur = null;
  function titreHud(t, s) {
    var tt = $('hud-titre'), st = $('hud-sous-titre'), boite = $('hud-haut-gauche');
    var change = tt.textContent !== t || st.textContent !== (s || '');
    tt.textContent = t; st.textContent = s || '';
    if (!jourCfg) { clearTimeout(hudMinuteur); boite.classList.remove('discret'); return; }
    if (!change) return;
    clearTimeout(hudMinuteur); boite.classList.remove('discret');
    hudMinuteur = setTimeout(function () { if (jourCfg) boite.classList.add('discret'); }, 4500);
  }
  function fondu(cb) {
    transition = true;
    $('fondu').classList.add('noir');
    setTimeout(function () {
      cb();
      setTimeout(function () { $('fondu').classList.remove('noir'); transition = false; }, 150);
    }, 520);
  }

  // ---------- Monde ----------
  function installer(m) {
    if (animal) { animal.nettoyer(scene); scene.remove(animal.groupe); AV.detruire(animal.groupe); animal = null; }
    if (monde) { if (monde.nettoyer) monde.nettoyer(); scene.remove(monde.groupe); AV.detruire(monde.groupe); }
    cinema = null;
    AV.audio.sourdine(false);
    monde = m;
    scene.add(m.groupe);
    var c = m.ciel;
    scene.background = new THREE.Color(c.bas);
    scene.fog = new THREE.Fog(c.brouillard, m.brouillard[0], m.brouillard[1]);
    fp = m.premierePersonne || null;
    joueur.groupe.visible = joueur.ombre.visible = !fp;
    document.body.classList.toggle('fpv', !!fp);
    AV.controles.toutRegard(!!fp);
    $('hud-aide-clavier').textContent = fp ? AIDE_FP : AIDE_3P;
    if (fp) { fpVue.lacet = fp.lacet || 0; fpVue.tangage = fp.tangage || 0; }
    camera.fov = fp ? (fp.champ || 62) : 60;
    camera.far = m.loin || 900; camera.updateProjectionMatrix(); // vue panoramique possible (rooftop)
    hemi.color.set(c.hemi[0]); hemi.groundColor.set(c.hemi[1]); hemi.intensity = c.hemi[2];
    soleil.color.set(c.soleil[0]); soleil.intensity = c.soleil[1];
    dirSoleil.set(c.soleil[2][0], c.soleil[2][1], c.soleil[2][2]).normalize();
    joueur.placer(m.depart.x, m.depart.z, m.depart.angle, m);
    cam.lacet = m.depart.angle + Math.PI;
    cam.tangage = 0.38; cam.actuelle = cam.dist;
    placerCamera(1);
    AV.audio.theme(m.theme);
    AV.audio.ambiance(m.ambiance);
    indice(null); message(null);
    AV.controles.vider();
  }

  function allerHub(depuisJour) {
    var m = AV.biomes.hub(etats());
    installer(m);
    if (AV.avatars) joueur.habiller(AV.avatars.tenue(null));
    jourCfg = null;
    if (depuisJour) {
      var p = m.portails[depuisJour - 1];
      var a = Math.atan2(p.x, p.z);
      joueur.placer(Math.sin(a) * 18.8, Math.cos(a) * 18.8, a + Math.PI, m);
      cam.lacet = a;
      placerCamera(1);
    }
    var a2 = aujourdhui(), n = nbTrouves(), s = (m.meteo ? m.meteo + ' · ' : '') + '⭐ ' + n + ' / 24 portes ouvertes';
    if (a2 && !progression.jours[a2]) s += ' · Aujourd\'hui : porte ' + a2 + ' ✨ suis la lumière';
    else if (!TEST && new Date() < new Date(CONFIG.annee, 11, 1)) s += ' · Rendez-vous le 1er décembre !';
    titreHud(CONFIG.titre, s);
    $('btn-village').classList.add('cache');
  }

  function allerJour(n) {
    var cfg = cfgJour(n);
    if (AV.avatars) joueur.habiller(AV.avatars.tenue(cfg)); // la tenue d'Océane du jour
    var m = AV.creerMonde(cfg);
    installer(m);
    jourCfg = cfg;
    trouve = false; recherche = 0; prochainIndice = 0;
    animal = null;
    if (cfg.animal && !m.sansAnimal) { // certains décors n'ont pas d'animal caché (ex. les étoiles filantes du lac)
      animal = new AV.Animal(cfg.animal);
      var spot;
      if (cfg.cachette && typeof cfg.cachette === 'object') spot = { x: cfg.cachette.x, z: cfg.cachette.z, y: cfg.cachette.y || 0 };
      else {
        var d = m.depart, R = m.rayon - 1.2;
        var ok = m.cachettes.filter(function (c) {
          var dx = c.x - d.x, dz = c.z - d.z;
          return dx * dx + dz * dz > 100 && c.x * c.x + c.z * c.z < R * R;
        });
        if (!ok.length) ok = m.cachettes;
        spot = ok[Math.floor(AV.rng(cfg.jour * 977 + 13)() * ok.length)];
      }
      animal.placer(spot.x, m.hauteur(spot.x, spot.z) + (spot.y || 0), spot.z, Math.random() * Math.PI * 2);
      scene.add(animal.groupe);
      var colAnimal = { x: spot.x, z: spot.z, r: 0.45 };
      m.colliders.push(colAnimal);
      if (m.surAnimal) m.surAnimal(animal, colAnimal); // le décor peut déplacer l'animal (ex. Edith qui vole)
    }
    var nom = nomDe(cfg);
    titreHud('Jour ' + n + ' · ' + cfg.titre, progression.jours[n] ? 'Déjà trouvé ✔ · tu peux le refaire' : (cfg.sousTitre || 'Trouve ' + nom + ' caché quelque part…'));
    if (m.debut) m.debut({
      titre: titreHud, message: message, trouver: trouverAnimal, test: TEST, scene: scene, camera: camera,
      eclairage: function (k) { hemi.intensity = monde.ciel.hemi[2] * k; soleil.intensity = monde.ciel.soleil[1] * k; }
    });
    $('btn-village').classList.remove('cache');
    AV.audio.portail();
  }

  function trouverAnimal() {
    if (trouve) return;
    trouve = true;
    indice(null); message(null);
    progression.jours[jourCfg.jour] = true;
    sauver();
    var cfg = jourCfg;
    function apresRecompense() {
      AV.controles.vider();
      titreHud('Jour ' + cfg.jour + ' · ' + cfg.titre, 'Bravo ! Le portail 🏠 te ramène au village');
    }
    // scénario propre au décor (ex. le cinéma : le chat lance le film)
    if (monde.surTrouve) {
      if (animal) animal.etat = 'peur';
      monde.surTrouve({
        cfg: cfg, animal: animal, scene: scene, camera: camera, joueur: joueur.position,
        message: message, titre: titreHud,
        eclairage: function (k) { hemi.intensity = monde.ciel.hemi[2] * k; soleil.intensity = monde.ciel.soleil[1] * k; },
        cinema: function (c) {
          if (c && !cinema) { camCible.copy(joueur.position); camCible.y += 1.5; }
          cinema = c;
        },
        fin: function (recompense) {
          if (jourCfg !== cfg) return;
          if (animal) { animal.m.corps.scale.set(1, 1, 1); animal.etat = 'trouve'; }
          AV.audio.victoire();
          AV.confettis(140);
          if (recompense) setTimeout(function () { if (jourCfg === cfg) AV.recompenses.ouvrir(recompense, apresRecompense); }, 1200);
          else apresRecompense();
        }
      });
      return;
    }
    if (animal) animal.etat = 'trouve';
    AV.audio.victoire();
    AV.confettis(140);
    setTimeout(function () {
      if (jourCfg !== cfg) return;
      AV.recompenses.ouvrir(cfg, apresRecompense);
    }, 1700);
  }

  // ---------- Interactions ----------
  function interactions() {
    cible = null;
    var p = joueur.position;
    if (cinema) {
      message(cinema.texte || null);
      $('btn-action').classList.toggle('pret', !!cinema.quitter);
      if (AV.controles.action() && cinema.quitter) { AV.audio.clic(); cinema.quitter(); }
      return;
    }
    if (fp) { // première personne : le bouton ✋ est confié au décor
      message((monde.astuce && monde.astuce(p)) || null);
      $('btn-action').classList.remove('pret');
      var appui = AV.controles.action() || fpAppui;
      if (appui && monde.surAction) monde.surAction();
      return;
    }
    if (animal && !trouve) {
      var za = monde.zoneAnimal;
      if (za) {
        // zone d'interaction définie par le décor (ex. devant la cabine de projection)
        var zx = za.x - p.x, zz = za.z - p.z;
        if (zx * zx + zz * zz < za.rayon * za.rayon && (za.yMin == null || p.y > za.yMin)) cible = { texte: za.texte, fn: trouverAnimal };
      } else {
        var dx = animal.groupe.position.x - p.x, dz = animal.groupe.position.z - p.z;
        if (dx * dx + dz * dz < 2.7 * 2.7) cible = { texte: '✋ Caresser ' + nomDe(jourCfg) + ' !', fn: trouverAnimal };
      }
    }
    if (!cible) {
      for (var i = 0; i < monde.interactifs.length; i++) {
        var it = monde.interactifs[i], ex = it.x - p.x, ez = it.z - p.z;
        if (ex * ex + ez * ez > it.rayon * it.rayon) continue;
        if (it.fn) cible = { texte: it.texte, fn: it.fn };
        else if (it.type === 'retour') cible = { texte: '🏠 Retour au village · ✋', fn: function () { var j = jourCfg.jour; fondu(function () { allerHub(j); }); } };
        else if (it.type === 'portail') {
          var c = cfgJour(it.jour);
          if (it.etat === 'verrouille') cible = { texte: '🔒 Porte ' + it.jour + ' · patience, elle s\'ouvre le ' + it.jour + ' décembre', fn: null };
          else cible = { // le nom du souvenir ne se dévoile qu'une fois la porte résolue
            texte: '<b>Jour ' + it.jour + '</b>' + (it.etat === 'fait' ? ' · ' + c.titre.replace(/</g, '&lt;') + ' ✔' : ' · 🎁 surprise…') + '<br>✋ pour entrer',
            fn: (function (n) { return function () { fondu(function () { allerJour(n); }); }; })(it.jour)
          };
        }
        break;
      }
    }
    // astuce contextuelle fournie par le décor (ex. « attends que les flamants s'envolent »)
    message(cible ? cible.texte : (!trouve && monde.astuce && monde.astuce(p)) || null);
    $('btn-action').classList.toggle('pret', !!(cible && cible.fn));
    if (AV.controles.action()) {
      if (cible && cible.fn) { AV.audio.clic(); cible.fn(); }
      else if (cible) AV.audio.erreur();
    }
  }

  // ---------- Indices ----------
  function etincelles() {
    for (var i = 0; i < 6; i++) {
      (function (k) { setTimeout(function () { if (animal && !trouve) animal.coeur(scene); }, k * 120); })(i);
    }
  }
  function majIndices(dt) {
    if (!animal || trouve || AV.recompenses.ouvert()) return;
    recherche += dt;
    var acc = TEST ? 4 : 1;
    var p = joueur.position, a = animal.groupe.position;
    var d = Math.sqrt((a.x - p.x) * (a.x - p.x) + (a.z - p.z) * (a.z - p.z));
    animal.etat = d < 8 ? 'alerte' : 'repos';
    if (recherche * acc > CONFIG.indiceApres) {
      prochainIndice -= dt;
      if (prochainIndice <= 0) {
        prochainIndice = 5;
        etincelles();
        AV.audio.indice(jourCfg.animal, Math.max(0.15, 1 - d / 40));
      }
    }
    if (recherche * acc > CONFIG.indiceChaudFroid) {
      if (d < 4) indice('🔥 Brûlant !', '#ffd0c0');
      else if (d < 8) indice('♨️ Chaud', '#ffe2c8');
      else if (d < 15) indice('🙂 Tiède', '#fff4d0');
      else if (d < 25) indice('❄️ Froid', '#dcecff');
      else indice('🧊 Glacial', '#cfe0ff');
    }
  }

  // ---------- Caméra ----------
  var vCible = new THREE.Vector3(), vDir = new THREE.Vector3(), vPos = new THREE.Vector3();
  function placerFP() {
    camera.position.copy(fp.pos);
    camera.position.y += Math.sin(temps * 1.3) * 0.004; // respiration
    camera.rotation.order = 'YXZ';
    camera.rotation.set(fpVue.tangage, fpVue.lacet, 0);
  }
  function majFP(dt, clav) {
    var r = AV.controles.regard();
    if (fp.viser) { // le décor oriente le regard (scène finale)
      var k = 1 - Math.exp(-dt * 2.2);
      fpVue.lacet = AV.angleLerp(fpVue.lacet, fp.viser.lacet, k);
      fpVue.tangage = AV.lerp(fpVue.tangage, fp.viser.tangage, k);
    } else {
      // on « attrape » le ciel : le décor suit le doigt
      var s = 0.0042 * camera.fov / 62;
      fpVue.lacet += r.dx * s - (clav ? clav.x : 0) * dt * 1.5;
      fpVue.tangage += r.dy * s + (clav ? clav.y : 0) * dt * 1.2;
      if (r.zoom) { camera.fov = Math.max(38, Math.min(75, camera.fov + r.zoom * 0.02)); camera.updateProjectionMatrix(); }
    }
    fpVue.tangage = Math.max(fp.tangMin == null ? -0.6 : fp.tangMin, Math.min(fp.tangMax == null ? 1.5 : fp.tangMax, fpVue.tangage));
    placerFP();
  }
  function placerCamera(lissage) {
    if (fp) { placerFP(); return; }
    var p = joueur.position;
    vCible.set(p.x, p.y + 1.5, p.z);
    var cp = Math.cos(cam.tangage);
    vDir.set(Math.sin(cam.lacet) * cp, Math.sin(cam.tangage), Math.cos(cam.lacet) * cp);
    var voulue = cam.dist;
    if (monde && monde.bloqueurs.length) {
      raycaster.set(vCible, vDir); raycaster.far = cam.dist; raycaster.camera = camera;
      var hits = raycaster.intersectObjects(monde.bloqueurs, true);
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object;
        if (o.isSprite || o.isPoints || (o.material && o.material.transparent)) continue;
        voulue = Math.max(1.3, hits[i].distance - 0.35);
        break;
      }
    }
    cam.actuelle = voulue < cam.actuelle ? voulue : AV.lerp(cam.actuelle, voulue, Math.min(1, lissage * 0.35));
    vPos.copy(vCible).addScaledVector(vDir, cam.actuelle);
    if (monde) { var sol = monde.hauteur(vPos.x, vPos.z) + 0.5; if (vPos.y < sol) vPos.y = sol; }
    camera.position.lerp(vPos, Math.min(1, lissage));
    camera.lookAt(vCible);
  }
  function majCamera(dt) {
    var r = AV.controles.regard();
    cam.lacet -= r.dx * 0.0065;
    cam.tangage = Math.max(0.05, Math.min(1.25, cam.tangage + r.dy * 0.0045));
    cam.dist = Math.max(3, Math.min(11, cam.dist + r.zoom * 0.01));
    placerCamera(1 - Math.exp(-dt * 14));
  }

  // ---------- Boucle ----------
  function boucle() {
    requestAnimationFrame(boucle);
    var dt = Math.min(horloge.getDelta(), 0.05);
    temps += dt;
    if (!enJeu || !monde) return;
    var modal = AV.recompenses.ouvert();
    AV.controles.etat.actif = !modal && !transition;
    var e = AV.controles.lire(), sauter = AV.controles.saut();
    if (cinema) { e = { x: 0, y: 0, course: false }; sauter = false; }
    fpAppui = false;
    if (fp) { fpClavier = e; fpAppui = sauter; e = { x: 0, y: 0, course: false }; sauter = false; }
    // décor « pilote » (ex. descente de trail) : il déplace lui-même le personnage et la caméra
    var pilote = monde.pilote && !cinema;
    if (pilote) {
      var act = AV.controles.action();
      var reg = AV.controles.regard(); // pas de caméra libre : les gestes sont confiés au décor (ex. le drone)
      monde.pilote(dt, e, sauter || act, joueur, camera, { saut: sauter, action: act, regard: reg });
    } else {
      if (monde.surfaceA) monde.surface = monde.surfaceA(joueur.position.x, joueur.position.z);
      joueur.maj(dt, e, sauter, cam.lacet, monde, temps);
    }
    monde.maj(dt, temps, joueur.position);
    if (animal) { majIndices(dt); animal.maj(dt, temps, joueur.position, scene); }
    if (!modal && !transition) interactions(); else { message(null); }
    if (cinema) {
      AV.controles.regard(); // on consomme les gestes de caméra
      var k = 1 - Math.exp(-dt * (cinema.vitesse || 1.6));
      camera.position.lerp(cinema.pos, k);
      camCible.lerp(cinema.cible, k);
      camera.lookAt(camCible);
    } else if (fp) majFP(dt, fpClavier);
    else if (!pilote) majCamera(dt);
    if (monde.surCamera) { camera.updateMatrixWorld(); monde.surCamera(camera, dt, temps); }
    soleil.position.copy(joueur.position).addScaledVector(dirSoleil, 45);
    soleil.target.position.copy(joueur.position);
    renderer.render(scene, camera);
  }

  // ---------- Démarrage ----------
  function pleinEcran() {
    var d = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var f = d.requestFullscreen || d.webkitRequestFullscreen;
        if (f) { var r = f.call(d); if (r && r.catch) r.catch(function () { }); }
      }
    } catch (e) { }
  }

  function commencer() {
    AV.audio.init();
    AV.audio.theme(monde ? monde.theme : 'hub');
    AV.audio.ambiance(monde ? monde.ambiance : null);
    $('ecran-titre').classList.add('cache');
    $('hud').classList.remove('cache');
    enJeu = true;
    horloge.getDelta();
    var j = parseInt(params.get('jour'), 10);
    if (j >= 1 && j <= 24 && debloque(j)) fondu(function () { allerJour(j); });
  }

  function init() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer = new THREE.WebGLRenderer({ antialias: dpr < 2, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    $('jeu').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
    hemi = new THREE.HemisphereLight('#ffffff', '#666666', 0.7); scene.add(hemi);
    soleil = new THREE.DirectionalLight('#ffffff', 0.8);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    var sc = soleil.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
    soleil.shadow.bias = -0.0008;
    scene.add(soleil); scene.add(soleil.target);

    joueur = new AV.Personnage();
    scene.add(joueur.groupe); scene.add(joueur.ombre);

    AV.controles.init();
    AV.recompenses.init();

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('keydown', function (e) { if (e.code === 'Escape') AV.recompenses.fermer(); });

    $('btn-village').onclick = function () { this.blur(); if (jourCfg && !transition) { var j = jourCfg.jour; AV.recompenses.fermer(); fondu(function () { allerHub(j); }); } };
    $('btn-musique').onclick = function () { this.blur(); AV.audio.init(); this.classList.toggle('off', !AV.audio.basculerMusique()); };
    $('btn-musique').classList.toggle('off', !AV.audio.musiqueActive());
    $('btn-plein-ecran').onclick = function () { this.blur(); pleinEcran(); };
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $('btn-plein-ecran').classList.add('cache');
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('tactile');

    $('titre-principal').textContent = CONFIG.titre || 'Louloute\'s Advent Calendar';
    $('titre-sous-titre').textContent = CONFIG.sousTitre || '';
    var n = nbTrouves();
    $('titre-progression').textContent = n ? '⭐ ' + n + ' / 24 portes déjà ouvertes' : '';
    if (TEST) $('titre-test').classList.remove('cache');
    $('btn-commencer').onclick = commencer;

    allerHub(0);
    requestAnimationFrame(boucle);
    if (params.get('demarrer') === '1') commencer();

    // accès pour le débogage dans la console
    AV.jeu = {
      camera: function (lacet, tangage, dist) { cam.lacet = lacet; if (tangage != null) cam.tangage = tangage; if (dist) cam.dist = dist; },
      placer: function (x, z, angle) { joueur.placer(x, z, angle || 0, monde); },
      trouver: function () { if (animal && !trouve) trouverAnimal(); },
      monde: function () { return monde; }, animal: function () { return animal; }, joueur: function () { return joueur; },
      versAnimal: function () { if (animal) { var a = animal.groupe.position; joueur.placer(a.x + 1.6, a.z + 1.6, 0, monde); cam.lacet = Math.PI / 4; } },
      allerJour: function (n) { fondu(function () { allerJour(n); }); }, allerHub: function () { fondu(function () { allerHub(0); }); }, reinitialiser: function () { progression = { jours: {} }; sauver(); location.reload(); } };
  }

  if (typeof THREE === 'undefined') {
    var e = $('erreur'); e.classList.remove('cache');
    e.textContent = 'Le moteur 3D n\'a pas pu se charger : il faut une connexion internet.';
  } else init();
})(window.AV);
