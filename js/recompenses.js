/* Fenêtres de récompense : photo, vidéo, mot, cadeau, mini-jeux (memory, quiz, puzzle) + confettis */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var modal, boite, entete, contenu, surFermer = null;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function echapper(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function manquant(chemin, icone) {
    return el('div', 'manquant', '<div style="font-size:42px">' + (icone || '📷') + '</div><div>Ajoute ton fichier ici :</div><code>' + echapper(chemin) + '</code>');
  }
  function texte(t) { return t ? el('p', 'texte-souvenir', echapper(t)) : null; }
  function ajouter(parent, enfant) { if (enfant) parent.appendChild(enfant); }

  // ---------- Photo ----------
  function photo(s, zone) {
    var fichiers = (s.fichiers && s.fichiers.length) ? s.fichiers : ['media/photo.jpg'];
    var i = 0, gal = el('div', 'galerie');
    function montrer() {
      gal.innerHTML = '';
      var img = new Image();
      img.alt = '';
      img.onerror = function () { if (img.parentNode) img.parentNode.replaceChild(manquant(fichiers[i]), img); };
      img.src = fichiers[i];
      gal.appendChild(img);
      if (fichiers.length > 1) {
        var g = el('button', 'nav g', '‹'), d = el('button', 'nav d', '›');
        g.onclick = function () { i = (i - 1 + fichiers.length) % fichiers.length; AV.audio.clic(); montrer(); };
        d.onclick = function () { i = (i + 1) % fichiers.length; AV.audio.clic(); montrer(); };
        gal.appendChild(g); gal.appendChild(d);
        gal.appendChild(el('div', 'compteur', (i + 1) + ' / ' + fichiers.length));
      }
    }
    montrer();
    zone.appendChild(gal);
    ajouter(zone, texte(s.texte));
  }

  // ---------- Vidéo ----------
  function video(s, zone) {
    var f = (s.fichiers && s.fichiers[0]) || 'media/video.mp4';
    var v = document.createElement('video');
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.controls = true; v.preload = 'metadata'; v.src = f;
    v.onerror = function () { if (v.parentNode) v.parentNode.replaceChild(manquant(f, '🎬'), v); };
    zone.appendChild(v);
    ajouter(zone, texte(s.texte));
  }

  // ---------- Mot ----------
  function mot(s, zone) {
    var c = el('div', 'carte-mot', echapper(s.texte || ''));
    if (s.signature) c.appendChild(el('div', 'signature', echapper(s.signature)));
    zone.appendChild(c);
  }

  // ---------- Post-it ----------
  function postit(s, zone) {
    var vide = !s.texte;
    var p = el('div', 'postit', '<div class="scotch"></div>' + (vide
      ? '<div class="postit-texte">Écris ici le mot du post-it<br><small>(dans data/jours.js)</small></div>'
      : '<div class="postit-texte">' + echapper(s.texte).replace(/\n/g, '<br>') + '</div>'));
    if (s.signature) p.appendChild(el('div', 'postit-signature', echapper(s.signature)));
    zone.appendChild(p);
  }

  // ---------- Cadeau ----------
  function cadeau(s, zone) {
    var z = el('div', 'zone-cadeau');
    var c = el('div', 'cadeau', '<div class="boite"><div class="ruban-v"></div></div><div class="couvercle"><div class="ruban-v"></div><div class="noeud">🎀</div></div>');
    var ind = el('div', 'indication', 'Touche le cadeau pour l\'ouvrir');
    z.appendChild(c); z.appendChild(ind);
    c.onclick = function () {
      if (c.classList.contains('ouvert')) return;
      c.classList.add('ouvert'); AV.audio.victoire(); AV.confettis(80);
      setTimeout(function () {
        z.innerHTML = '';
        var r = el('div', 'revele centre');
        r.appendChild(el('div', '', '<div style="font-size:64px">🎁</div>'));
        if (s.fichiers && s.fichiers[0]) {
          var img = new Image(); img.src = s.fichiers[0]; img.style.maxWidth = '100%'; img.style.maxHeight = '45vh'; img.style.borderRadius = '14px';
          img.onerror = function () { if (img.parentNode) img.parentNode.replaceChild(manquant(s.fichiers[0]), img); };
          r.appendChild(img);
        }
        var t = el('div', 'carte-mot', echapper(s.texte || 'Surprise !'));
        t.style.marginTop = '14px';
        r.appendChild(t);
        z.appendChild(r);
      }, 650);
    };
    zone.appendChild(z);
  }

  // ---------- Krapfen (jour 16) : on croque 3 fois dedans, puis le mot + les photos ----------
  function krapfen(s, zone) {
    var z = el('div', 'zone-cadeau');
    var T = 300, c = document.createElement('canvas'); c.width = c.height = T;
    c.style.cssText = 'width:min(62vw,260px);height:min(62vw,260px);cursor:pointer;touch-action:manipulation;filter:drop-shadow(0 8px 10px rgba(60,30,10,.35));transition:transform .15s';
    var x = c.getContext('2d'), R = 118, C = T / 2;
    // le beignet vu de dessus : doré, ceinture claire, sucre glace
    var g = x.createRadialGradient(C - 25, C - 30, 10, C, C, R);
    g.addColorStop(0, '#e6a75c'); g.addColorStop(0.55, '#c98638'); g.addColorStop(0.82, '#a9682a'); g.addColorStop(0.9, '#f3e0b4'); g.addColorStop(0.97, '#ead2a0'); g.addColorStop(1, '#b8792f');
    x.fillStyle = g; x.beginPath(); x.arc(C, C, R, 0, Math.PI * 2); x.fill();
    for (var i = 0; i < 900; i++) {
      var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.78;
      x.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.random() * 0.6) + ')';
      x.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.5 + Math.random() * 2.5, 1.5 + Math.random() * 2.5);
    }
    var morsures = [[0.95, -0.35], [0.55, -0.95], [-0.3, -1.0], [-0.95, -0.4]], n = 0;
    function croquer() {
      if (n >= 3) return;
      var m = morsures[n], bx = C + m[0] * R, by = C + m[1] * R, rb = 46;
      var arcs = [[0, 0, 1], [-0.55, 0.35, 0.72], [0.55, -0.35, 0.72], [0.4, 0.5, 0.6], [-0.4, -0.5, 0.6]];
      x.save(); x.globalCompositeOperation = 'source-atop';
      x.fillStyle = '#f7e6be'; // la pâte, à l'intérieur
      arcs.forEach(function (q) { x.beginPath(); x.arc(bx + q[0] * rb, by + q[1] * rb, q[2] * rb + 9, 0, Math.PI * 2); x.fill(); });
      if (n === 0 || n === 2) { // la confiture d'abricot
        x.fillStyle = '#e8782a'; x.beginPath(); x.arc(AV.lerp(bx, C, 0.55), AV.lerp(by, C, 0.55), 20, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#f59a4a'; x.beginPath(); x.arc(AV.lerp(bx, C, 0.55) - 5, AV.lerp(by, C, 0.55) - 6, 7, 0, Math.PI * 2); x.fill();
      }
      x.globalCompositeOperation = 'destination-out';
      arcs.forEach(function (q) { x.beginPath(); x.arc(bx + q[0] * rb, by + q[1] * rb, q[2] * rb, 0, Math.PI * 2); x.fill(); });
      x.restore();
      n++;
      AV.audio.miam(1);
      c.style.transform = 'scale(.94) rotate(' + (n * 7) + 'deg)';
      setTimeout(function () { c.style.transform = 'rotate(' + (n * 7) + 'deg)'; }, 150);
      ind.textContent = ['Encore une bouchée ! 😋', 'La dernière… 🍑', ''][n - 1];
      if (n === 3) setTimeout(reveler, 700);
    }
    function reveler() {
      AV.audio.victoire(); AV.confettis(70);
      z.innerHTML = '';
      var r = el('div', 'revele centre');
      r.appendChild(el('div', '', '<div style="font-size:54px">😋🍩</div><div style="font-weight:900;font-size:20px;margin:4px 0 10px">Miam ! Le meilleur krapfen des Dolomites</div>'));
      var t = el('div', 'carte-mot', echapper(s.texte || 'Un krapfen rien que pour toi 🍩'));
      if (s.signature) t.appendChild(el('div', 'signature', echapper(s.signature)));
      r.appendChild(t);
      z.appendChild(r);
      if (s.fichiers && s.fichiers.length) { var p = el('div'); p.style.marginTop = '14px'; z.appendChild(p); photo({ fichiers: s.fichiers, texte: s.textePhotos || '' }, p); }
    }
    c.onclick = croquer;
    var ind = el('div', 'indication', 'Loulou t\'a gardé un krapfen : croque dedans ! 🍩');
    z.appendChild(c); z.appendChild(ind);
    zone.appendChild(z);
    AV.recompenses.__krapfen = { croquer: croquer }; // débogage
  }

  // ---------- Recette (fiche de cuisine) ----------
  // ---------- Fiche recette téléchargeable (image A4 portrait dessinée sur un canvas) ----------
  function ficheRecette(r, etapes) {
    var W = 1240, H = 1754, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var SANS = "'Nunito', 'Helvetica Neue', Arial, sans-serif", MAIN = "'Caveat', 'Bradley Hand', cursive";
    var BRUN = '#3b2a1e', OR = '#c98a2e', ROUGE = '#d9485a';
    function lignes(t, larg, police) {
      x.font = police; var mots = String(t).split(' '), res = [], l = '';
      mots.forEach(function (m) { var e = l ? l + ' ' + m : m; if (x.measureText(e).width > larg && l) { res.push(l); l = m; } else l = e; });
      if (l) res.push(l); return res;
    }
    function rond(px, py, w, h, r0) { x.beginPath(); x.moveTo(px + r0, py); x.arcTo(px + w, py, px + w, py + h, r0); x.arcTo(px + w, py + h, px, py + h, r0); x.arcTo(px, py + h, px, py, r0); x.arcTo(px, py, px + w, py, r0); x.closePath(); }
    // fond papier + cadre
    x.fillStyle = '#fbf3e4'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fffaf0'; rond(50, 50, W - 100, H - 100, 34); x.fill();
    x.strokeStyle = '#ecd9bb'; x.lineWidth = 4; x.stroke();
    x.setLineDash([10, 10]); x.strokeStyle = '#f0e2cc'; x.lineWidth = 3; rond(72, 72, W - 144, H - 144, 26); x.stroke(); x.setLineDash([]);
    var y = 150;
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = ROUGE; x.font = '700 46px ' + MAIN; x.fillText(r.de || 'La recette du chef 👨‍🍳', W / 2, y); y += 36;
    // titre surligné
    var tl = lignes(r.titre || 'Recette', W - 260, '700 96px ' + MAIN);
    tl.forEach(function (l) {
      y += 92; x.font = '700 96px ' + MAIN; var lw = x.measureText(l).width;
      x.fillStyle = '#fbe1a6'; rond(W / 2 - lw / 2 - 26, y - 40, lw + 52, 50, 14); x.fill();
      x.fillStyle = BRUN; x.fillText(l, W / 2, y);
    });
    y += 64;
    // pastilles
    var bad = [r.personnes && ('🍽️ ' + r.personnes), r.temps && ('⏱️ ' + r.temps), r.four && r.four.temperature && ('🔥 ' + r.four.temperature)].filter(Boolean);
    x.font = '800 30px ' + SANS;
    var lgs = bad.map(function (b) { return x.measureText(b).width + 44; }), tot = lgs.reduce(function (a, b) { return a + b; }, 0) + (bad.length - 1) * 16, bx = W / 2 - tot / 2;
    bad.forEach(function (b, i) { x.fillStyle = '#f6ead6'; rond(bx, y - 36, lgs[i], 52, 26); x.fill(); x.fillStyle = '#7a5530'; x.textAlign = 'left'; x.fillText(b, bx + 22, y); bx += lgs[i] + 16; });
    y += 70;
    // ingrédients sur deux colonnes
    x.textAlign = 'left'; x.fillStyle = OR; x.font = '900 32px ' + SANS; x.fillText('🛒  LES INGRÉDIENTS', 130, y); y += 22;
    x.strokeStyle = '#f0e2cc'; x.lineWidth = 3; x.beginPath(); x.moveTo(130, y); x.lineTo(W - 130, y); x.stroke(); y += 50;
    var ings = r.ingredients || [], col = Math.ceil(ings.length / 2), PI = '600 31px ' + SANS;
    for (var ri = 0; ri < col; ri++) { // une rangée = l'ingrédient de gauche et celui de droite, sur 1 ou 2 lignes
      var paire = [ings[ri], ings[ri + col]].map(function (t) { return t ? lignes(t, W / 2 - 190, PI) : []; });
      x.fillStyle = BRUN; x.font = PI;
      paire.forEach(function (ls, k) { ls.forEach(function (l, j) { x.fillText(l, (k ? W / 2 + 20 : 140) + (j ? 42 : 0), y + j * 40); }); });
      y += Math.max(paire[0].length, paire[1].length, 1) * 40 + 12;
    }
    y += 24;
    // préparation
    x.fillStyle = OR; x.font = '900 32px ' + SANS; x.fillText('👩‍🍳  LA PRÉPARATION', 130, y); y += 22;
    x.beginPath(); x.moveTo(130, y); x.lineTo(W - 130, y); x.stroke(); y += 58;
    var tout = etapes.slice();
    if (r.four) tout.push({ emoji: '🔥', texte: 'Enfourner pendant ' + (r.four.minutes || 40) + ' min' + (r.four.temperature ? ' à ' + r.four.temperature : '') + '.', fort: true });
    tout.forEach(function (e, i) {
      var PE = (e.fort ? '800 ' : '600 ') + '32px ' + SANS, ls = lignes(e.texte, W - 400, PE);
      if (e.fort) { x.fillStyle = '#fdeccb'; rond(120, y - 44, W - 240, ls.length * 43 + 26, 18); x.fill(); }
      x.fillStyle = OR; x.font = '900 38px ' + SANS; x.textAlign = 'right'; x.fillText((i + 1) + '.', 200, y);
      x.textAlign = 'left'; x.font = '38px ' + SANS; x.fillText(e.emoji || '•', 216, y);
      x.fillStyle = BRUN; x.font = PE;
      ls.forEach(function (l, k) { x.fillText(l, 280, y + k * 43); });
      y += ls.length * 43 + 26;
    });
    // fin : « Déguster chaud ! », le petit mot, puis le tampon en dessous à droite
    var reste = H - 110 - y, gros = Math.max(72, Math.min(104, reste * 0.45));
    y += Math.min(110, Math.max(gros, reste * 0.35));
    x.textAlign = 'center'; x.fillStyle = '#6a3a1a'; x.font = '700 ' + Math.round(gros) + 'px ' + MAIN; x.fillText(r.fin || 'Bon appétit !', W / 2, y);
    x.strokeStyle = OR; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(W / 2 - 170, y + 26); x.quadraticCurveTo(W / 2, y + 8, W / 2 + 170, y + 26); x.stroke();
    if (r.mot) { y += 80; x.fillStyle = ROUGE; x.font = '700 50px ' + MAIN; x.fillText(r.mot, W / 2, y); }
    // tampon
    x.save(); x.translate(W - 275, 150); x.rotate(0.12);
    x.strokeStyle = ROUGE; x.lineWidth = 5; rond(-150, -40, 300, 70, 14); x.stroke();
    x.fillStyle = ROUGE; x.font = '900 26px ' + SANS; x.textAlign = 'center'; x.fillText('VALIDÉ PAR LE CHEF ❤', 0, 5);
    x.restore();
    return cv.toDataURL('image/jpeg', 0.92);
  }

  // présentation : en-tête (titre surligné + pastilles), ingrédients à cocher, puis les étapes une par une
  // (grande carte avec émoji), le four avec un minuteur accéléré, et la carte finale « Déguster chaud ! »
  function recette(s, zone) {
    var r = s.recette || s;
    var etapes = (r.etapes || []).map(function (e) { return typeof e === 'string' ? { texte: e } : e; });
    var ings = r.ingredients || [];
    var vide = !ings.length && !etapes.length;
    var c = el('div', 'recette');
    var tete = el('div', 'rc-tete');
    tete.appendChild(el('div', 'recette-de', echapper(r.de || 'Ce soir au menu…')));
    tete.appendChild(el('h3', 'rc-titre', echapper(r.titre || (vide ? 'Recette mystère 🤫' : 'Recette'))));
    var badges = [r.personnes && ('🍽️ ' + r.personnes), r.temps && ('⏱️ ' + r.temps), r.four && r.four.temperature && ('🔥 ' + r.four.temperature), r.difficulte && ('⭐ ' + r.difficulte)].filter(Boolean);
    if (badges.length) { var bd = el('div', 'rc-badges'); badges.forEach(function (b) { bd.appendChild(el('span', 'rc-badge', echapper(b))); }); tete.appendChild(bd); }
    c.appendChild(tete);
    if (r.fichiers && r.fichiers[0]) {
      var img = new Image(); img.className = 'recette-photo'; img.alt = ''; img.src = r.fichiers[0];
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
      c.appendChild(img);
    }
    if (vide) {
      c.appendChild(el('p', 'recette-vide', 'La recette n\'est pas encore choisie…<br>Elle s\'écrit dans <code>data/jours.js</code> (champ <code>recette</code>) 😉'));
      if (r.mot) c.appendChild(el('div', 'recette-mot', echapper(r.mot)));
      zone.appendChild(c); ajouter(zone, texte(s.texte)); return;
    }
    // --- les ingrédients : étiquettes à cocher ---
    if (ings.length) {
      var bi = el('div', 'rc-bloc');
      bi.appendChild(el('h4', '', '🛒 Les ingrédients <small>· touche ce que tu as</small>'));
      var li = el('div', 'rc-ings'), pret = el('div', 'rc-pret', '');
      ings.forEach(function (t) {
        var k = t.indexOf(' '), tete2 = k > 0 ? t.slice(0, k) : '', ico = tete2 && !/[a-z0-9à-ÿ]/i.test(tete2) ? tete2 : '•';
        var txt = ico === '•' ? t : t.slice(k + 1);
        var b = el('button', 'rc-ing', '<span class="rc-ico">' + ico + '</span><span>' + echapper(txt) + '</span>');
        b.onclick = function () {
          b.classList.toggle('ok'); AV.audio.clic();
          var tout = li.querySelectorAll('.rc-ing.ok').length === ings.length;
          pret.textContent = tout ? 'Tout est prêt, au boulot ! 👌' : '';
          if (tout) AV.audio.ping(1);
        };
        li.appendChild(b);
      });
      bi.appendChild(li); bi.appendChild(pret); c.appendChild(bi);
    }
    // --- les étapes, une carte à la fois ---
    var be = el('div', 'rc-bloc');
    be.appendChild(el('h4', '', '👩‍🍳 En cuisine !'));
    var carte = el('div', 'rc-carte'), points = el('div', 'rc-points'), nav = el('div', 'rc-nav');
    var bPrec = el('button', 'rc-btn', '‹ Précédent'), bSuiv = el('button', 'rc-btn rc-btn-p', 'Suivant ›');
    nav.appendChild(bPrec); nav.appendChild(bSuiv);
    be.appendChild(carte); be.appendChild(points); be.appendChild(nav); c.appendChild(be);
    var four = r.four ? { minutes: r.four.minutes || 40, temperature: r.four.temperature || '' } : null;
    var N = etapes.length + (four ? 1 : 0) + 1, i = 0, vu = 0, cuit = !four, cuisson = 0;
    function numero(k) { return '<div class="rc-num">Étape ' + (k + 1) + ' / ' + (N - 1) + '</div>'; }
    function montrer() {
      vu = Math.max(vu, i);
      carte.classList.remove('rc-entre'); void carte.offsetWidth; carte.classList.add('rc-entre');
      if (i < etapes.length) {
        var e = etapes[i];
        carte.innerHTML = numero(i) + (e.emoji ? '<div class="rc-emoji">' + echapper(e.emoji) + '</div>' : '') + '<p class="rc-texte">' + echapper(e.texte) + '</p>';
      } else if (four && i === etapes.length) {
        carte.innerHTML = numero(i) + '<div class="rc-four' + (cuit ? ' chaud' : '') + '"><div class="rc-vitre"><span>' + (cuit ? '🥐' : '🌯') + '</span></div></div>' +
          '<p class="rc-texte">Enfourner pendant <b>' + four.minutes + ' min</b>' + (four.temperature ? ' à <b>' + echapper(four.temperature) + '</b>' : '') + '</p>' +
          '<div class="rc-minuteur"><div class="rc-barre"><i style="width:' + (cuit ? 100 : 0) + '%"></i></div><span class="rc-min">' + (cuit ? four.minutes : 0) + ' / ' + four.minutes + ' min</span></div>' +
          (cuit ? '<div class="rc-pret">C\'est cuit, ça sent trop bon ! 😋</div>' : '<button class="rc-btn rc-btn-p rc-go">🔥 Enfourner !</button>');
        var go = carte.querySelector('.rc-go');
        if (go) go.onclick = function () { enfourner(); };
      } else {
        carte.innerHTML = '<div class="rc-fin">' + echapper(r.fin || 'Bon appétit !') + '</div><div class="rc-tampon">Validé par le chef ❤</div>' +
          (r.mot ? '<div class="recette-mot">' + echapper(r.mot) + '</div>' : '') +
          '<div class="rc-dl"><button class="rc-btn rc-btn-p rc-tele">📥 Télécharger la fiche</button>' +
          (navigator.share ? '<button class="rc-btn rc-part">📤 Partager</button>' : '') + '</div>';
        var nomF = 'recette-' + String(r.titre || 'du-chef').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg';
        var image = null;
        var fabriquer = function () {
          if (image) return Promise.resolve(image);
          var polices = document.fonts && document.fonts.load ? Promise.all(['700 96px Caveat', '600 32px Nunito', '900 32px Nunito'].map(function (p) { return document.fonts.load(p).catch(function () { }); })) : Promise.resolve();
          return polices.then(function () { image = ficheRecette(r, etapes); return image; });
        };
        carte.querySelector('.rc-tele').onclick = function () { AV.audio.clic(); fabriquer().then(function (u) { telecharger(u, nomF); }); };
        var bp = carte.querySelector('.rc-part');
        if (bp) bp.onclick = function () { AV.audio.clic(); fabriquer().then(function (u) { partager(u, nomF, 'La recette du chef ❤', r.titre || 'Recette'); }); };
        AV.recompenses.__fiche = fabriquer;
        AV.audio.victoire(); AV.confettis(70);
      }
      points.innerHTML = '';
      for (var k = 0; k < N; k++) {
        var d = el('i', (k === i ? 'actif' : k <= vu ? 'fait' : ''));
        (function (kk) { d.onclick = function () { if (kk <= vu && (kk <= etapes.length || cuit)) { i = kk; AV.audio.clic(); montrer(); } }; })(k);
        points.appendChild(d);
      }
      bPrec.disabled = i === 0;
      bSuiv.classList.toggle('cache', i === N - 1);
      bSuiv.disabled = four && i === etapes.length && !cuit;
      bSuiv.textContent = i === N - 2 ? 'À table ! ›' : 'Suivant ›';
    }
    function enfourner() {
      var f = carte.querySelector('.rc-four'), barre = carte.querySelector('.rc-barre i'), txt = carte.querySelector('.rc-min'), go = carte.querySelector('.rc-go');
      if (!f || cuisson) return;
      f.classList.add('chaud'); if (go) go.disabled = true; AV.audio.clic();
      var t0 = performance.now(), duree = 4200;
      cuisson = 1;
      (function pas() {
        if (!carte.isConnected) return;
        var k = Math.min(1, (performance.now() - t0) / duree);
        barre.style.width = (k * 100) + '%'; txt.textContent = Math.round(k * four.minutes) + ' / ' + four.minutes + ' min';
        if (k < 1) { requestAnimationFrame(pas); return; }
        cuit = true; cuisson = 0; AV.audio.ping(1);
        if (i === etapes.length) montrer();
      })();
    }
    bPrec.onclick = function () { if (i > 0) { i--; AV.audio.clic(); montrer(); } };
    bSuiv.onclick = function () { if (i < N - 1 && !bSuiv.disabled) { i++; AV.audio.clic(); montrer(); } };
    montrer();
    zone.appendChild(c);
    ajouter(zone, texte(s.texte));
    AV.recompenses.__recette = { aller: function (k) { i = k; vu = Math.max(vu, k); montrer(); }, cuire: function () { cuit = true; montrer(); } };
  }

  // ---------- Livre (pages scannées, à feuilleter) ----------
  function pagesDuLivre(s) {
    if (s.pages && s.pages.length) return s.pages.slice();
    if (s.nombre) {
      var l = [], dos = s.dossier || 'media/livre/', ext = s.extension || '.jpg';
      for (var i = 1; i <= s.nombre; i++) l.push(dos + 'page' + (i < 10 ? '0' : '') + i + ext);
      return l;
    }
    return null;
  }
  function livre(s, zone) {
    var pages = pagesDuLivre(s), exemple = !pages;
    if (exemple) pages = ['', '', '', '', '', ''];
    var n = pages.length;
    // planche k : à gauche la page 2k-1, à droite la page 2k (la couverture seule à droite au début)
    var nbPlanches = Math.floor(n / 2) + 1, k = 0, anim = false;
    var boiteL = el('div', 'livre'), gauche = el('div', 'page g'), droite = el('div', 'page d');
    boiteL.appendChild(gauche); boiteL.appendChild(droite);
    var bg = el('button', 'nav g', '‹'), bd = el('button', 'nav d', '›'), cpt = el('div', 'compteur-livre');
    boiteL.appendChild(bg); boiteL.appendChild(bd);
    function contenuPage(i) {
      var d = el('div', 'contenu-page');
      if (i < 0 || i >= n) { d.classList.add('blanche'); return d; }
      if (exemple) {
        d.classList.add('exemple');
        d.innerHTML = i === 0 ? '<div class="titre-ex">📖 Notre livre</div><div>Scanne les pages et range-les dans<br><code>media/livre/</code><br>(page01.jpg, page02.jpg…)</div>'
          : '<div class="num-ex">Page ' + (i + 1) + '</div>';
        return d;
      }
      var img = new Image(); img.alt = ''; img.draggable = false; img.src = pages[i];
      img.onerror = function () { if (img.parentNode) img.parentNode.replaceChild(manquant(pages[i], '📄'), img); };
      d.appendChild(img);
      return d;
    }
    function remplir(p, i) { p.innerHTML = ''; p.appendChild(contenuPage(i)); p.classList.toggle('vide', i < 0 || i >= n); }
    function afficher() {
      remplir(gauche, 2 * k - 1); remplir(droite, 2 * k);
      boiteL.classList.toggle('ferme', k === 0); boiteL.classList.toggle('fin', 2 * k - 1 >= n - 1 && 2 * k >= n);
      bg.style.visibility = k > 0 ? 'visible' : 'hidden';
      bd.style.visibility = k < nbPlanches - 1 ? 'visible' : 'hidden';
      var a = Math.max(1, 2 * k), b = Math.min(n, 2 * k + 1);
      cpt.textContent = k === 0 ? 'Couverture · ' + n + ' pages' : (a === b ? 'Page ' + a : 'Pages ' + a + '–' + b) + ' / ' + n;
    }
    function tourner(sens) {
      if (anim) return;
      var k2 = k + sens;
      if (k2 < 0 || k2 >= nbPlanches) return;
      anim = true; AV.audio.page ? AV.audio.page() : AV.audio.clic();
      var f = el('div', 'feuille ' + (sens > 0 ? 'vers-g' : 'vers-d'));
      var recto = el('div', 'face recto'), verso = el('div', 'face verso');
      if (sens > 0) { recto.appendChild(contenuPage(2 * k)); verso.appendChild(contenuPage(2 * k2 - 1)); remplir(droite, 2 * k2); }
      else { recto.appendChild(contenuPage(2 * k - 1)); verso.appendChild(contenuPage(2 * k2)); remplir(gauche, 2 * k2 - 1); }
      f.appendChild(recto); f.appendChild(verso); boiteL.appendChild(f);
      boiteL.classList.remove('ferme', 'fin');
      requestAnimationFrame(function () { requestAnimationFrame(function () { f.classList.add('tourne'); }); });
      setTimeout(function () { k = k2; afficher(); if (f.parentNode) f.parentNode.removeChild(f); anim = false; }, 720);
    }
    bg.onclick = function (e) { e.stopPropagation(); tourner(-1); };
    bd.onclick = function (e) { e.stopPropagation(); tourner(1); };
    boiteL.onclick = function (e) { var r = boiteL.getBoundingClientRect(); tourner(e.clientX - r.left > r.width / 2 ? 1 : -1); };
    var x0 = null;
    boiteL.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    boiteL.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { e.preventDefault(); tourner(dx < 0 ? 1 : -1); }
    });
    function clavier(e) {
      if (!boiteL.isConnected) { window.removeEventListener('keydown', clavier); return; }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') tourner(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') tourner(-1);
    }
    window.addEventListener('keydown', clavier);
    afficher();
    zone.appendChild(boiteL);
    zone.appendChild(cpt);
    zone.appendChild(el('p', 'centre indication', 'Touche le bord d\'une page (ou glisse) pour la tourner'));
    ajouter(zone, texte(s.texte));
    AV.recompenses.__livre = { tourner: tourner, page: function () { return k; } }; // débogage
  }

  // ---------- Échange de mugs (jour 15) : son mug à elle (image fabriquée par le jeu) + la photo du sien ----------
  function versBlob(dataURL) {
    var p = dataURL.split(','), type = (p[0].match(/:(.*?);/) || [])[1] || 'image/jpeg', b = atob(p[1]), n = b.length, u = new Uint8Array(n);
    while (n--) u[n] = b.charCodeAt(n);
    return new Blob([u], { type: type });
  }
  function telecharger(dataURL, nom) {
    var a = document.createElement('a'), url = dataURL;
    try { url = URL.createObjectURL(versBlob(dataURL)); } catch (e) { }
    a.href = url; a.download = nom; a.target = '_blank'; document.body.appendChild(a); a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); if (url !== dataURL) URL.revokeObjectURL(url); }, 4000);
  }
  function partager(dataURL, nom, texteP, titreP) {
    var f = null;
    try { var bl = versBlob(dataURL); f = new File([bl], nom, { type: bl.type }); } catch (e) { }
    if (f && navigator.canShare && navigator.share && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: titreP || 'Mon mug 🎨', text: texteP }).catch(function () { });
    } else telecharger(dataURL, nom);
  }
  function echange(s, zone) {
    var g = el('div', 'echange-mugs');
    var c1 = el('div', 'echange-carte', '<h4>🎨 Ton mug</h4>');
    if (s.monMug) { var im = new Image(); im.src = s.monMug; im.alt = ''; c1.appendChild(im); }
    else c1.appendChild(el('div', 'manquant', '<div style="font-size:42px">☕</div><div>Peins ton mug à l\'atelier !</div>'));
    var c2 = el('div', 'echange-carte', '<h4>💝 Son mug</h4>');
    var fichiers = s.fichiers || [], i = 0, cadre = el('div', 'echange-photo');
    function montrer() {
      cadre.innerHTML = '';
      if (!fichiers.length) { cadre.appendChild(el('div', 'manquant', '<div style="font-size:42px">📸</div><div>La photo de son mug arrive bientôt…</div>')); return; }
      var img = new Image(); img.alt = '';
      img.onerror = function () { if (img.parentNode) img.parentNode.replaceChild(el('div', 'manquant', '<div style="font-size:42px">📸</div><div>La photo de son mug arrive bientôt…</div><code>' + echapper(fichiers[i]) + '</code>'), img); };
      img.src = fichiers[i]; cadre.appendChild(img);
      if (fichiers.length > 1) { img.onclick = function () { i = (i + 1) % fichiers.length; AV.audio.clic(); montrer(); }; img.style.cursor = 'pointer'; }
    }
    montrer(); c2.appendChild(cadre);
    g.appendChild(c1); g.appendChild(c2); zone.appendChild(g);
    ajouter(zone, texte(s.texte));
    if (s.signature) zone.appendChild(el('div', 'centre signature-echange', echapper(s.signature)));
    if (s.monMug) {
      var b = el('div', 'centre echange-boutons');
      var bEnv = el('button', 'btn-secondaire', '📤 Lui envoyer mon mug'), bSav = el('button', 'btn-secondaire', '💾 Enregistrer l\'image');
      var nom = s.nomFichier || 'mon-mug.jpg';
      bEnv.onclick = function () { AV.audio.clic(); partager(s.monMug, nom, 'Voilà le mug que je t\'ai peint ❤'); };
      bSav.onclick = function () { AV.audio.clic(); telecharger(s.monMug, nom); };
      b.appendChild(bEnv); b.appendChild(bSav); zone.appendChild(b);
    }
  }

  // ---------- Fin de mini-jeu ----------
  function gagne(zone, s, titre) {
    if (s.surGagne) try { s.surGagne(); } catch (e) { }
    AV.audio.victoire(); AV.confettis(120);
    setTimeout(function () {
      var r = el('div', 'revele centre');
      r.appendChild(el('h3', '', titre || 'Bravo ! 🎉'));
      ajouter(r, texte(s.texte));
      zone.appendChild(r);
      r.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 500);
  }

  // ---------- Memory ----------
  function memory(s, zone) {
    var faces = (s.fichiers || []).slice(0, 8).map(function (f) { return { img: f }; });
    var emo = ['❤️', '🎄', '⭐', '🦊', '🎁', '☕', '🌙', '❄️'];
    for (var k = 0; faces.length < 6; k++) faces.push({ txt: emo[k] });
    var cartes = [];
    faces.forEach(function (f, i) { cartes.push({ id: i, f: f }, { id: i, f: f }); });
    for (var i = cartes.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cartes[i]; cartes[i] = cartes[j]; cartes[j] = t; }
    var grille = el('div', 'memory');
    if (cartes.length > 12) grille.style.gridTemplateColumns = 'repeat(4, 1fr)';
    var ouvertes = [], trouvees = 0, bloque = false;
    cartes.forEach(function (c) {
      var d = el('div', 'carte');
      var avant = el('div', 'face avant');
      if (c.f.img) {
        var im = new Image(); im.src = c.f.img;
        im.onerror = function () { avant.textContent = emo[c.id % emo.length]; };
        avant.appendChild(im);
      } else avant.textContent = c.f.txt;
      d.appendChild(el('div', 'face dos', '❄'));
      d.appendChild(avant);
      d.onclick = function () {
        if (bloque || d.classList.contains('retournee') || d.classList.contains('trouvee')) return;
        d.classList.add('retournee'); AV.audio.clic();
        ouvertes.push({ d: d, c: c });
        if (ouvertes.length === 2) {
          bloque = true;
          var a = ouvertes[0], b = ouvertes[1];
          setTimeout(function () {
            if (a.c.id === b.c.id) {
              a.d.classList.add('trouvee'); b.d.classList.add('trouvee'); AV.audio.ping(1);
              trouvees++;
              if (trouvees === faces.length) gagne(zone, s, 'Toutes les paires ! 🎉');
            } else { a.d.classList.remove('retournee'); b.d.classList.remove('retournee'); }
            ouvertes = []; bloque = false;
          }, 750);
        }
      };
      grille.appendChild(d);
    });
    zone.appendChild(el('p', 'centre indication', 'Retrouve les paires !'));
    zone.appendChild(grille);
  }

  // ---------- Quiz ----------
  function quiz(s, zone) {
    var qs = s.questions && s.questions.length ? s.questions : [{ question: 'Ajoute tes questions dans data/jours.js', choix: ['OK !'], reponse: 0 }];
    var i = 0, score = 0, bloc = el('div');
    zone.appendChild(bloc);
    function poser() {
      bloc.innerHTML = '';
      if (i >= qs.length) {
        bloc.appendChild(el('div', 'quiz-question centre', score + ' / ' + qs.length + ' bonnes réponses'));
        gagne(zone, s, score === qs.length ? 'Sans faute ! 🏆' : 'Bien joué ! 🎉');
        return;
      }
      var q = qs[i];
      bloc.appendChild(el('div', 'quiz-avance', 'Question ' + (i + 1) + ' / ' + qs.length));
      bloc.appendChild(el('div', 'quiz-question', echapper(q.question)));
      var grille = el('div', 'quiz-choix'), fini = false;
      q.choix.forEach(function (c, k) {
        var b = el('button', '', echapper(c));
        b.onclick = function () {
          if (fini) return; fini = true;
          if (k === q.reponse) { b.classList.add('bon'); score++; AV.audio.ping(1); }
          else { b.classList.add('faux'); grille.children[q.reponse] && grille.children[q.reponse].classList.add('bon'); AV.audio.erreur(); }
          setTimeout(function () { i++; poser(); }, 1100);
        };
        grille.appendChild(b);
      });
      bloc.appendChild(grille);
    }
    poser();
  }

  // ---------- Puzzle (échange de pièces) ----------
  function imageSecours() {
    var c = document.createElement('canvas'); c.width = c.height = 600;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 600, 600);
    g.addColorStop(0, '#ff9a8b'); g.addColorStop(0.5, '#f3c34b'); g.addColorStop(1, '#5b5fb0');
    x.fillStyle = g; x.fillRect(0, 0, 600, 600);
    x.font = '320px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦊', 300, 290);
    x.font = '900 54px Nunito, sans-serif'; x.fillStyle = '#fff'; x.fillText('Ajoute ta photo !', 300, 530);
    return c.toDataURL();
  }
  // grille colonnes × lignes : exactement `n` pièces si possible, pièces les plus carrées possible
  function grillePuzzle(n, w, h) {
    var best = null, essais = [n];
    for (var d = 1; d <= 8; d++) essais.push(n - d, n + d);
    for (var q = 0; q < essais.length && !best; q++) {
      var t = essais[q]; if (t < 4) continue;
      for (var c = 2; c < t; c++) {
        if (t % c) continue;
        var r = t / c; if (r < 2) continue;
        var ecart = Math.abs(Math.log((w / c) / (h / r)));
        if (ecart < 0.45 && (!best || ecart < best.e)) best = { c: c, r: r, e: ecart };
      }
    }
    if (!best) { var cc = Math.max(2, Math.round(Math.sqrt(n * w / h))); best = { c: cc, r: Math.max(2, Math.round(n / cc)) }; }
    return best;
  }
  // ---------- Puzzle : vraies pièces découpées (tenons / creux), bac en bas où l'on pioche ----------
  // contour d'une pièce de cw × ch ; bords = [haut, droite, bas, gauche] : +1 tenon sortant, -1 creux, 0 bord droit
  function cheminPiece(x, cw, ch, S, bords) {
    var coins = [[0, 0], [cw, 0], [cw, ch], [0, ch]];
    x.beginPath(); x.moveTo(0, 0);
    for (var k = 0; k < 4; k++) {
      var a = coins[k], b = coins[(k + 1) % 4], amp = bords[k];
      if (!amp) { x.lineTo(b[0], b[1]); continue; }
      var L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L, nx = dy, ny = -dx, m = L / 2;
      var P = function (u, v) { return [a[0] + dx * u + nx * v * amp, a[1] + dy * u + ny * v * amp]; };
      var p = P(m - 0.12 * S, 0); x.lineTo(p[0], p[1]);
      var c1 = P(m - 0.04 * S, 0.1 * S), c2 = P(m - 0.27 * S, 0.31 * S), e = P(m, 0.31 * S);
      x.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
      c1 = P(m + 0.27 * S, 0.31 * S); c2 = P(m + 0.04 * S, 0.1 * S); e = P(m + 0.12 * S, 0);
      x.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
      x.lineTo(b[0], b[1]);
    }
    x.closePath();
  }
  function puzzle(s, zone) {
    var src = s.fichiers && s.fichiers[0];
    var nVoulu = Math.max(4, s.pieces || 9);
    boite.classList.add('large');
    zone.appendChild(el('p', 'centre indication', 'Pioche une pièce dans le bac et pose-la à sa place : glisse-la, ou touche-la puis touche sa place sur le plateau'));
    var barre = el('div', 'puzzle-barre');
    var compteur = el('span', 'puzzle-compteur', '');
    var outils = el('span', 'puzzle-outils');
    var bFant = el('button', 'puzzle-btn', '👻 Silhouette'), bModele = el('button', 'puzzle-btn', '👀 Modèle');
    outils.appendChild(bFant); outils.appendChild(bModele);
    barre.appendChild(compteur); barre.appendChild(outils);
    var plateau = el('div', 'pz-plateau'), fantome = el('div', 'pz-fantome'), modele = el('div', 'pz-modele');
    plateau.appendChild(fantome); plateau.appendChild(modele);
    var bacZone = el('div', 'pz-bac-zone'), bac = el('div', 'pz-bac'), bacG = el('button', 'pz-fleche', '‹'), bacD = el('button', 'pz-fleche', '›');
    bacZone.appendChild(bacG); bacZone.appendChild(bac); bacZone.appendChild(bacD);
    zone.appendChild(barre); zone.appendChild(plateau); zone.appendChild(bacZone);
    bacG.onclick = function () { bac.scrollBy({ left: -bac.clientWidth * 0.8, behavior: 'smooth' }); };
    bacD.onclick = function () { bac.scrollBy({ left: bac.clientWidth * 0.8, behavior: 'smooth' }); };
    bFant.onclick = function () { var on = plateau.classList.toggle('silhouette'); bFant.classList.toggle('actif', on); AV.audio.clic(); };
    bModele.onclick = function () { var on = modele.classList.toggle('visible'); bModele.textContent = on ? '🧩 Puzzle' : '👀 Modèle'; AV.audio.clic(); };

    function lancer(img, url) {
      var NW = img.naturalWidth || img.width || 600, NH = img.naturalHeight || img.height || 600;
      var g = grillePuzzle(nVoulu, NW, NH), C = g.c, R = g.r, N = C * R;
      var f = Math.min(1, 1400 / NW), W = NW * f, Hh = NH * f;       // résolution de travail
      var cw = W / C, ch = Hh / R, S = Math.min(cw, ch), M = Math.ceil(0.34 * S);
      plateau.style.aspectRatio = W + ' / ' + Hh;
      [plateau, barre, bacZone].forEach(function (e) { e.style.setProperty('--ar', (W / Hh).toFixed(4)); });
      fantome.style.backgroundImage = modele.style.backgroundImage = 'url("' + url + '")';
      // tenons / creux : tirés au hasard mais toujours les mêmes pour une photo donnée
      var graine = 7; for (var i = 0; i < url.length && i < 400; i++) graine = (graine * 31 + url.charCodeAt(i)) % 2147483647;
      function alea() { graine = (graine * 16807) % 2147483647; return graine / 2147483647; }
      var hs = [], vs = [];
      for (var r0 = 0; r0 < R; r0++) { hs.push([]); vs.push([]); for (var c0 = 0; c0 < C; c0++) { hs[r0].push(alea() < 0.5 ? 1 : -1); vs[r0].push(alea() < 0.5 ? 1 : -1); } }
      var pieces = [];
      for (var k = 0; k < N; k++) {
        var rr = Math.floor(k / C), cc = k % C;
        var bords = [rr ? -hs[rr - 1][cc] : 0, cc < C - 1 ? vs[rr][cc] : 0, rr < R - 1 ? hs[rr][cc] : 0, cc ? -vs[rr][cc - 1] : 0];
        var cv = document.createElement('canvas'), dpr = 1.5;
        cv.width = Math.ceil((cw + 2 * M) * dpr); cv.height = Math.ceil((ch + 2 * M) * dpr);
        var x = cv.getContext('2d'); x.scale(dpr, dpr); x.translate(M, M);
        cheminPiece(x, cw, ch, S, bords);
        x.save(); x.clip(); x.drawImage(img, -cc * cw, -rr * ch, W, Hh); x.restore();
        x.lineJoin = 'round';
        x.lineWidth = 1.8; x.strokeStyle = 'rgba(255,255,255,.5)'; x.stroke();
        x.lineWidth = 0.8; x.strokeStyle = 'rgba(0,0,0,.4)'; x.stroke();
        cv.className = 'pz-piece';
        pieces.push({ k: k, el: cv, r: rr, c: cc, place: false });
      }
      var cle = 'av_puzzle2_' + N + '_' + String(src || 'secours').slice(-60);
      var faits = {};
      try { (JSON.parse(localStorage.getItem(cle) || '[]') || []).forEach(function (kk) { faits[kk] = 1; }); } catch (e) { }
      var choisie = null, fini = false, drag = null;
      function nbPlaces() { return pieces.filter(function (p) { return p.place; }).length; }
      function maj() { compteur.textContent = nbPlaces() + ' / ' + N + ' pièces posées'; }
      function sauver() {
        try { if (fini) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(pieces.filter(function (p) { return p.place; }).map(function (p) { return p.k; }))); } catch (e) { }
      }
      function taillePx() { return (plateau.clientWidth || 600) * (cw + 2 * M) / W; }
      function largeurBac() { return Math.round(taillePx() * 0.72) + 'px'; }
      function versBac(p, avant) {
        p.el.classList.remove('posee', 'glisse', 'choisie');
        p.el.style.position = p.el.style.left = p.el.style.top = p.el.style.transform = '';
        p.el.style.width = largeurBac();
        if (avant && avant.parentNode === bac) bac.insertBefore(p.el, avant); else bac.appendChild(p.el);
      }
      function poser(p, anime) {
        p.place = true; if (choisie === p) choisie = null;
        p.el.classList.remove('choisie', 'glisse');
        p.el.style.position = 'absolute'; p.el.style.transform = '';
        p.el.style.width = ((cw + 2 * M) / W * 100) + '%';
        p.el.style.left = ((p.c * cw - M) / W * 100) + '%';
        p.el.style.top = ((p.r * ch - M) / Hh * 100) + '%';
        p.el.classList.add('posee'); plateau.insertBefore(p.el, modele);
        if (anime) { p.el.classList.add('clic'); setTimeout(function () { p.el.classList.remove('clic'); }, 400); }
      }
      function verifier() {
        maj(); sauver();
        if (fini || nbPlaces() < N) return;
        fini = true; sauver();
        plateau.classList.add('fini'); bacZone.classList.add('cache'); barre.classList.add('cache');
        setTimeout(function () { modele.classList.add('visible'); }, 300);
        gagne(zone, s, 'Puzzle terminé ! 🧩');
      }
      function bonnePlace(p) { AV.audio.ping(1); poser(p, true); verifier(); }
      function rate() { AV.audio.clic(); plateau.classList.remove('secoue'); void plateau.offsetWidth; plateau.classList.add('secoue'); }
      // la pièce lâchée (coin haut-gauche à l'écran) est-elle assez près de sa place ?
      function presDeSaPlace(p, gx, gy) {
        var b = plateau.getBoundingClientRect(), k = b.width / W;
        var tx = b.left + (p.c * cw - M) * k, ty = b.top + (p.r * ch - M) * k, tol = S * k * 0.45;
        return Math.abs(gx - tx) < tol && Math.abs(gy - ty) < tol;
      }
      // le bac : on mélange
      var ordre = pieces.slice();
      for (var j = ordre.length - 1; j > 0; j--) { var q = Math.floor(Math.random() * (j + 1)), t = ordre[j]; ordre[j] = ordre[q]; ordre[q] = t; }
      ordre.forEach(function (p) { if (faits[p.k]) poser(p); else versBac(p); });
      maj();
      requestAnimationFrame(function () { bac.querySelectorAll('.pz-piece').forEach(function (e) { e.style.width = largeurBac(); }); });

      bac.addEventListener('pointerdown', function (ev) {
        var p = pieces.filter(function (q2) { return q2.el === ev.target; })[0];
        if (!p || p.place || fini) return;
        ev.preventDefault();
        var r = p.el.getBoundingClientRect();
        drag = { p: p, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, bouge: false, fx: (ev.clientX - r.left) / r.width, fy: (ev.clientY - r.top) / r.height, suivant: p.el.nextSibling };
      });
      function bouger(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag, p = d.p;
        if (!d.bouge) {
          if ((ev.clientX - d.x0) * (ev.clientX - d.x0) + (ev.clientY - d.y0) * (ev.clientY - d.y0) < 64) return;
          d.bouge = true; if (choisie) { choisie.el.classList.remove('choisie'); choisie = null; }
          var w = taillePx(); d.w = w; d.h = w * p.el.height / p.el.width;
          p.el.style.width = w + 'px'; p.el.classList.add('glisse'); document.body.appendChild(p.el);
          AV.audio.clic();
        }
        ev.preventDefault();
        p.el.style.left = (ev.clientX - d.fx * d.w) + 'px'; p.el.style.top = (ev.clientY - d.fy * d.h) + 'px';
      }
      function lacher(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag, p = d.p; drag = null;
        if (!d.bouge) { // simple toucher : on sélectionne la pièce
          if (choisie === p) { p.el.classList.remove('choisie'); choisie = null; }
          else { if (choisie) choisie.el.classList.remove('choisie'); choisie = p; p.el.classList.add('choisie'); }
          AV.audio.clic(); return;
        }
        if (presDeSaPlace(p, ev.clientX - d.fx * d.w, ev.clientY - d.fy * d.h)) bonnePlace(p);
        else {
          var b = plateau.getBoundingClientRect();
          if (ev.clientX > b.left && ev.clientX < b.right && ev.clientY > b.top && ev.clientY < b.bottom) rate();
          versBac(p, d.suivant);
        }
      }
      function annuler(ev) { if (drag && ev.pointerId === drag.id) { var p = drag.p, sv = drag.suivant; drag = null; if (!p.place) versBac(p, sv); } }
      window.addEventListener('pointermove', bouger, { passive: false });
      window.addEventListener('pointerup', lacher);
      window.addEventListener('pointercancel', annuler);
      // toucher le plateau avec une pièce sélectionnée
      plateau.addEventListener('click', function (ev) {
        if (!choisie || fini) return;
        var b = plateau.getBoundingClientRect();
        var col = Math.floor((ev.clientX - b.left) / b.width * C), lig = Math.floor((ev.clientY - b.top) / b.height * R);
        if (col === choisie.c && lig === choisie.r) bonnePlace(choisie); else rate();
      });
      window.addEventListener('resize', function () { if (!fini) bac.querySelectorAll('.pz-piece').forEach(function (e) { e.style.width = largeurBac(); }); });
      if (AV.recompenses) AV.recompenses._puzzle = {
        grille: [C, R],
        resoudre: function () { pieces.forEach(function (p) { if (!p.place) poser(p); }); verifier(); },
        poserUne: function () { var p = pieces.filter(function (q3) { return !q3.place; })[0]; if (p) bonnePlace(p); },
        reste: function () { return N - nbPlaces(); },
        cible: function (e) { // centre écran de la place d'une pièce (tests)
          var p = pieces.filter(function (q4) { return q4.el === e; })[0], b = plateau.getBoundingClientRect(), k = b.width / W;
          return p ? { x: b.left + (p.c + 0.5) * cw * k, y: b.top + (p.r + 0.5) * ch * k } : null;
        }
      };
    }
    function charger(url, secours) {
      var im = new Image();
      im.onload = function () { lancer(im, url); };
      im.onerror = function () { if (secours) charger(imageSecours(), false); };
      im.src = url;
    }
    charger(src || imageSecours(), !!src);
  }

  // ---------- Coloriage magique (peinture par numéros) fabriqué à partir d'une photo ----------
  // s.fichier : la photo · s.couleurs : nombre de couleurs (12) · s.detail : finesse (1 = normal, 1.5 = plus de zones)
  // Dans le jeu : choisir une couleur, toucher les zones de ce numéro (🪄 = toutes d'un coup) ; tout colorié → la photo apparaît.
  // 🖨️ / 📥 : une feuille A4 à imprimer (zones vierges numérotées + légende des couleurs).
  function coloriageCalcul(img, K, detail) {
    var W = Math.round(380 * Math.sqrt(detail || 1)), H = Math.round(W * img.naturalHeight / img.naturalWidth), N = W * H;
    var c1 = document.createElement('canvas'); c1.width = W * 2; c1.height = H * 2; c1.getContext('2d').drawImage(img, 0, 0, W * 2, H * 2);
    var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); x.drawImage(c1, 0, 0, W, H); // réduction douce
    var d = x.getImageData(0, 0, W, H).data, i, j, k;
    // couleurs → Lab (plus fidèle à l'œil pour regrouper les teintes)
    var lin = new Float32Array(256); for (i = 0; i < 256; i++) { var v = i / 255; lin[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    var LL = new Float32Array(N), AA = new Float32Array(N), BB = new Float32Array(N);
    for (i = 0; i < N; i++) {
      var r = lin[d[i * 4]], g = lin[d[i * 4 + 1]], b = lin[d[i * 4 + 2]];
      var X = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.9505), Y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), Z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.089);
      LL[i] = 116 * Y - 16; AA[i] = 500 * (X - Y); BB[i] = 200 * (Y - Z);
    }
    // k-means (++), sur un échantillon, graine fixe → toujours le même coloriage
    var rng = AV.rng(4242), S = Math.min(N, 7000), ech = new Int32Array(S); for (i = 0; i < S; i++) ech[i] = Math.floor(rng() * N);
    var cL = [], cA = [], cB = [], dmin = new Float32Array(S).fill(1e9);
    function d2(p, q) { var a = LL[p] - cL[q], b2 = AA[p] - cA[q], e = BB[p] - cB[q]; return a * a + b2 * b2 + e * e; }
    var p0 = ech[0]; cL.push(LL[p0]); cA.push(AA[p0]); cB.push(BB[p0]);
    while (cL.length < K) {
      var tot = 0; for (i = 0; i < S; i++) { dmin[i] = Math.min(dmin[i], d2(ech[i], cL.length - 1)); tot += dmin[i]; }
      var t = rng() * tot, s2 = 0; for (i = 0; i < S; i++) { s2 += dmin[i]; if (s2 >= t) break; }
      var pp = ech[Math.min(i, S - 1)]; cL.push(LL[pp]); cA.push(AA[pp]); cB.push(BB[pp]);
    }
    var lab = new Uint8Array(N);
    function proche(p) { var bk = 0, bd = 1e12; for (var q = 0; q < K; q++) { var dd = d2(p, q); if (dd < bd) { bd = dd; bk = q; } } return bk; }
    for (var it = 0; it < 14; it++) {
      var sL = new Float64Array(K), sA = new Float64Array(K), sB = new Float64Array(K), n = new Float64Array(K);
      for (i = 0; i < S; i++) { var p = ech[i]; k = proche(p); sL[k] += LL[p]; sA[k] += AA[p]; sB[k] += BB[p]; n[k]++; }
      for (k = 0; k < K; k++) if (n[k]) { cL[k] = sL[k] / n[k]; cA[k] = sA[k] / n[k]; cB[k] = sB[k] / n[k]; }
    }
    for (i = 0; i < N; i++) lab[i] = proche(i);
    // lissage : filtre majoritaire 3×3 (deux passes)
    for (var pass = 0; pass < 1; pass++) {
      var nv = new Uint8Array(lab), cnt = new Uint8Array(K);
      for (j = 1; j < H - 1; j++) for (i = 1; i < W - 1; i++) {
        cnt.fill(0); var best = lab[j * W + i], bc = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var q2 = lab[(j + dy) * W + i + dx]; if (++cnt[q2] > bc) { bc = cnt[q2]; best = q2; } }
        if (bc >= 5) nv[j * W + i] = best;
      }
      lab = nv;
    }
    // zones (composantes connexes) ; les trop petites sont fondues dans leur voisine
    var reg = new Int32Array(N), pile = new Int32Array(N), tailles = [], minA = Math.max(10, Math.round(N / (9500 * (detail || 1))));
    function etiqueter() {
      reg.fill(-1); tailles = []; var nr = 0;
      for (var s0 = 0; s0 < N; s0++) {
        if (reg[s0] >= 0) continue;
        var h = 0, taille = 0, cl = lab[s0]; pile[h++] = s0; reg[s0] = nr;
        while (h) { var u = pile[--h]; taille++; var ux = u % W, uy = (u / W) | 0;
          if (ux > 0 && reg[u - 1] < 0 && lab[u - 1] === cl) { reg[u - 1] = nr; pile[h++] = u - 1; }
          if (ux < W - 1 && reg[u + 1] < 0 && lab[u + 1] === cl) { reg[u + 1] = nr; pile[h++] = u + 1; }
          if (uy > 0 && reg[u - W] < 0 && lab[u - W] === cl) { reg[u - W] = nr; pile[h++] = u - W; }
          if (uy < H - 1 && reg[u + W] < 0 && lab[u + W] === cl) { reg[u + W] = nr; pile[h++] = u + W; } }
        tailles.push(taille); nr++;
      }
      return nr;
    }
    for (var tour = 0; tour < 6; tour++) {
      var nr = etiqueter(), change = false, vois = {};
      for (i = 0; i < N; i++) {
        var rg = reg[i]; if (tailles[rg] >= minA) continue;
        var px = i % W, py = (i / W) | 0;
        [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]].forEach(function (q) {
          if (q[0] < 0 || q[1] < 0 || q[0] >= W || q[1] >= H) return; var qi = q[1] * W + q[0]; if (reg[qi] === rg) return;
          var m = vois[rg] || (vois[rg] = {}); m[qi] = 1;
        });
      }
      Object.keys(vois).forEach(function (rgs) { // la couleur voisine la plus présente le long du bord
        var cpt = {}, b0 = -1, bn = 0; Object.keys(vois[rgs]).forEach(function (qi) { var l2 = lab[qi]; cpt[l2] = (cpt[l2] || 0) + (tailles[reg[qi]] >= minA ? 3 : 1); if (cpt[l2] > bn) { bn = cpt[l2]; b0 = l2; } });
        if (b0 >= 0) { vois[rgs].cible = b0; change = true; }
      });
      if (!change) break;
      for (i = 0; i < N; i++) { var v2 = vois[reg[i]]; if (v2 && v2.cible != null && tailles[reg[i]] < minA) lab[i] = v2.cible; }
    }
    var NR = etiqueter();
    // distance au bord (chanfrein) → le numéro va là où la zone est la plus large
    var dist = new Float32Array(N);
    for (i = 0; i < N; i++) { var ix = i % W, iy = (i / W) | 0; dist[i] = (ix === 0 || iy === 0 || ix === W - 1 || iy === H - 1 || reg[i - 1] !== reg[i] || reg[i + 1] !== reg[i] || reg[i - W] !== reg[i] || reg[i + W] !== reg[i]) ? 0.5 : 1e9; }
    for (j = 1; j < H; j++) for (i = 1; i < W - 1; i++) { var a0 = j * W + i; dist[a0] = Math.min(dist[a0], dist[a0 - 1] + 1, dist[a0 - W] + 1, dist[a0 - W - 1] + 1.414, dist[a0 - W + 1] + 1.414); }
    for (j = H - 2; j >= 0; j--) for (i = W - 2; i > 0; i--) { var a1 = j * W + i; dist[a1] = Math.min(dist[a1], dist[a1 + 1] + 1, dist[a1 + W] + 1, dist[a1 + W + 1] + 1.414, dist[a1 + W - 1] + 1.414); }
    var zones = []; for (k = 0; k < NR; k++) zones.push({ x: 0, y: 0, r: -1, c: 0 });
    for (i = 0; i < N; i++) { var z = zones[reg[i]]; if (dist[i] > z.r) { z.r = dist[i]; z.x = i % W + 0.5; z.y = ((i / W) | 0) + 0.5; z.c = lab[i]; } }
    // palette : Lab → RGB, triée du plus clair au plus foncé (numéros 1…K)
    function rgbDe(k2) {
      var Y = (cL[k2] + 16) / 116, X = cA[k2] / 500 + Y, Z = Y - cB[k2] / 200;
      function fi(t) { return t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787; }
      X = fi(X) * 0.9505; Y = fi(Y); Z = fi(Z) * 1.089;
      var rr = X * 3.2406 - Y * 1.5372 - Z * 0.4986, gg = -X * 0.9689 + Y * 1.8758 + Z * 0.0415, bb = X * 0.0557 - Y * 0.2040 + Z * 1.0570;
      function g2(u) { u = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(u * 255))); }
      return [g2(rr), g2(gg), g2(bb)];
    }
    var ordre = []; for (k = 0; k < K; k++) ordre.push(k); ordre.sort(function (a, b) { return cL[b] - cL[a]; });
    var numero = new Int32Array(K); ordre.forEach(function (k3, idx) { numero[k3] = idx + 1; });
    var palette = ordre.map(function (k3) { return rgbDe(k3); });
    // contours : segments entre deux zones différentes (fusionnés en traits)
    var traits = [];
    for (j = 0; j < H; j++) { var deb = -1; for (i = 0; i <= W; i++) { var diff = i < W && j < H - 1 && reg[j * W + i] !== reg[(j + 1) * W + i]; if (diff && deb < 0) deb = i; if (!diff && deb >= 0) { traits.push([deb, j + 1, i, j + 1]); deb = -1; } } }
    for (i = 0; i < W - 1; i++) { var deb2 = -1; for (j = 0; j <= H; j++) { var diff2 = j < H && reg[j * W + i] !== reg[j * W + i + 1]; if (diff2 && deb2 < 0) deb2 = j; if (!diff2 && deb2 >= 0) { traits.push([i + 1, deb2, i + 1, j]); deb2 = -1; } } }
    zones.forEach(function (z) { z.n = numero[z.c]; });
    return { W: W, H: H, reg: reg, zones: zones, palette: palette, traits: traits, couleurDe: function (zi) { return palette[zones[zi].n - 1]; } };
  }
  function coloriageDessin(ctx, C, ox, oy, s, rempli, o) {
    o = o || {};
    var t = document.createElement('canvas'); t.width = C.W; t.height = C.H;
    var tx = t.getContext('2d'), im = tx.createImageData(C.W, C.H), d = im.data;
    for (var i = 0; i < C.W * C.H; i++) { var zi = C.reg[i], col = (o.modele || (rempli && rempli[zi])) ? C.palette[C.zones[zi].n - 1] : [255, 255, 255]; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
    tx.putImageData(im, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(t, ox, oy, C.W * s, C.H * s); ctx.restore();
    if (o.modele) return;
    ctx.save(); ctx.strokeStyle = o.trait || '#8c8c94'; ctx.lineWidth = o.epaisseur || Math.max(1, s * 0.22); ctx.lineCap = 'square'; ctx.beginPath();
    C.traits.forEach(function (l) { ctx.moveTo(ox + l[0] * s, oy + l[1] * s); ctx.lineTo(ox + l[2] * s, oy + l[3] * s); });
    ctx.stroke(); ctx.strokeRect(ox, oy, C.W * s, C.H * s); ctx.restore();
    ctx.save(); ctx.fillStyle = o.chiffres || '#6d6d78'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    C.zones.forEach(function (z, zi) {
      if (rempli && rempli[zi]) return;
      var fs = Math.max(o.minPolice || 7, Math.min(s * z.r * 1.15, s * 4.5, o.maxPolice || 40));
      ctx.font = '700 ' + fs.toFixed(1) + 'px Nunito, Arial, sans-serif'; ctx.fillText(String(z.n), ox + z.x * s, oy + z.y * s + fs * 0.05);
    });
    ctx.restore();
  }
  function coloriageA4(C, titre, sousTitre) {
    var Wp = 1654, Hp = 2339, m = 90, c = document.createElement('canvas'); c.width = Wp; c.height = Hp;
    var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, Wp, Hp);
    x.fillStyle = '#2b2340'; x.textAlign = 'center'; x.font = '700 92px Caveat, cursive'; x.fillText(titre || 'Coloriage magique ✨', Wp / 2, m + 60);
    x.font = '400 34px Nunito, sans-serif'; x.fillStyle = '#6a6478'; x.fillText(sousTitre || 'Colorie chaque zone avec la couleur de son numéro… et la magie opère ❤', Wp / 2, m + 118);
    var lignes = Math.ceil(C.palette.length / 8), hLeg = 70 + lignes * 120, haut = m + 160, dispoH = Hp - haut - hLeg - m, dispoW = Wp - 2 * m;
    var s = Math.min(dispoW / C.W, dispoH / C.H), ox = (Wp - C.W * s) / 2, oy = haut;
    coloriageDessin(x, C, ox, oy, s, null, { minPolice: 13, maxPolice: 34, epaisseur: 1.6, trait: '#9a9aa2', chiffres: '#7a7a84' });
    var ly = oy + C.H * s + 70, par = Math.min(8, C.palette.length), pas = (Wp - 2 * m) / par;
    C.palette.forEach(function (p, i) {
      var cx = m + pas * (i % par + 0.5), cy = ly + Math.floor(i / par) * 120 + 30;
      x.beginPath(); x.arc(cx, cy, 34, 0, 7); x.fillStyle = 'rgb(' + p.join(',') + ')'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#d8d4dc'; x.stroke();
      x.fillStyle = '#2b2340'; x.font = '800 34px Nunito, sans-serif'; x.fillText(String(i + 1), cx, cy + 74);
    });
    return c.toDataURL('image/png');
  }
  var colEtat = null;
  function coloriage(s, zone) {
    var src = s.fichier || (s.fichiers && s.fichiers[0]);
    var boite2 = el('div', 'coloriage'), inner = el('div'), zoom = 1;
    boite2.style.cssText = 'margin:0 auto 10px;max-width:560px;max-height:62vh;overflow:auto;-webkit-overflow-scrolling:touch;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.15);background:#fff';
    inner.style.cssText = 'position:relative;width:100%';
    var att = el('div', 'centre', '<div style="font-size:46px">🪄</div><div>La magie opère…</div>'); inner.appendChild(att);
    boite2.appendChild(inner); zone.appendChild(boite2);
    var barre = el('div', 'centre'); barre.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0';
    var pal = el('div'); pal.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 4px';
    var info = el('div', 'centre'); info.style.cssText = 'font-weight:800;color:#6a6478;margin:4px 0';
    zone.appendChild(pal); zone.appendChild(info); zone.appendChild(barre);
    ajouter(zone, texte(s.texte));
    if (s.signature) zone.appendChild(el('div', 'centre signature-echange', echapper(s.signature)));
    var img = new Image();
    img.onerror = function () { att.innerHTML = '<div style="font-size:42px">📸</div><div>La photo du coloriage est introuvable</div><code>' + echapper(src || '') + '</code>'; };
    img.onload = function () {
      setTimeout(function () {
        var C;
        try { C = coloriageCalcul(img, s.couleurs || 16, s.detail || 1); }
        catch (e) { att.innerHTML = '<div style="font-size:42px">🙈</div><div>Le coloriage ne peut pas se fabriquer ici (ouvre le site en ligne).</div>'; return; }
        inner.removeChild(att);
        var cle = 'av_coloriage_' + (src || '') + '_' + (s.couleurs || 16) + '_' + (s.detail || 1) + '_' + C.zones.length, rempli = {};
        try { rempli = JSON.parse(localStorage.getItem(cle)) || {}; } catch (e) { }
        // pas plus haut que l'écran (on zoome pour les petites zones)
        boite2.style.maxWidth = Math.min(560, Math.round(window.innerHeight * 0.62 * C.W / C.H)) + 'px';
        var cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.style.cssText = 'width:100%;display:block;touch-action:manipulation;cursor:pointer;background:#fff';
        inner.appendChild(cv);
        var photo = new Image(); photo.src = src; photo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 2.5s;pointer-events:none';
        inner.appendChild(photo);
        var choix = 1, total = C.zones.length;
        function nbFaites() { var n = 0; for (var k in rempli) if (rempli[k]) n++; return n; }
        function dessiner() {
          var w = inner.clientWidth || 520, sc = Math.min(w * dpr, 2600) / C.W;
          cv.width = Math.round(C.W * sc); cv.height = Math.round(C.H * sc);
          var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
          coloriageDessin(x, C, 0, 0, sc, rempli, { minPolice: 6 * dpr, maxPolice: 22 * dpr, epaisseur: Math.max(0.8, 0.9 * dpr) });
          var n = nbFaites(); info.textContent = n >= total ? '✨ Terminé ! ✨' : '🎨 ' + n + ' / ' + total + ' zones coloriées · couleur n°' + choix;
        }
        function sauver() { try { localStorage.setItem(cle, JSON.stringify(rempli)); } catch (e) { } }
        function verifierFin() {
          if (nbFaites() >= total && photo.style.opacity !== '1') {
            setTimeout(function () { photo.style.opacity = '1'; AV.audio.victoire(); AV.confettis(160); }, 600);
          }
        }
        C.palette.forEach(function (p, i) {
          var b = el('button'); b.textContent = String(i + 1);
          var clair = p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114 > 150;
          b.style.cssText = 'width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #d8d4dc;font:900 15px Nunito,sans-serif;cursor:pointer;touch-action:manipulation;background:rgb(' + p.join(',') + ');color:' + (clair ? '#2b2340' : '#fff');
          b.onclick = function () { choix = i + 1; AV.audio.clic(); Array.prototype.forEach.call(pal.children, function (c, j) { c.style.boxShadow = j === i ? '0 0 0 3px #2b2340' : '0 0 0 2px #d8d4dc'; }); dessiner(); };
          pal.appendChild(b);
        });
        pal.children[0].style.boxShadow = '0 0 0 3px #2b2340';
        cv.addEventListener('click', function (e) {
          var r = cv.getBoundingClientRect(), gx = Math.floor((e.clientX - r.left) / r.width * C.W), gy = Math.floor((e.clientY - r.top) / r.height * C.H);
          if (gx < 0 || gy < 0 || gx >= C.W || gy >= C.H) return;
          var zi = C.reg[gy * C.W + gx], z = C.zones[zi];
          if (rempli[zi]) return;
          if (z.n !== choix) { AV.audio.erreur(); info.textContent = '🙈 Cette zone, c\'est le n°' + z.n + ' !'; return; }
          rempli[zi] = 1; AV.audio.pinceau ? AV.audio.pinceau(1) : AV.audio.clic(); sauver(); dessiner(); verifierFin();
        });
        function bouton(txt, fn) { var b = el('button', 'btn-secondaire', txt); b.style.cssText = 'border:0;border-radius:999px;padding:9px 14px;font:800 15px Nunito,sans-serif;background:#efe9f6;color:#2b2340;cursor:pointer'; b.onclick = fn; barre.appendChild(b); return b; }
        bouton('🔍 Zoom', function () {
          var cxr = (boite2.scrollLeft + boite2.clientWidth / 2) / inner.clientWidth, cyr = (boite2.scrollTop + boite2.clientHeight / 2) / inner.clientHeight;
          zoom = zoom >= 3 ? 1 : zoom + 1; inner.style.width = (zoom * 100) + '%'; this.textContent = zoom >= 3 ? '🔍 Dézoomer' : '🔍 Zoom ×' + (zoom + 1);
          dessiner(); boite2.scrollLeft = cxr * inner.clientWidth - boite2.clientWidth / 2; boite2.scrollTop = cyr * inner.clientHeight - boite2.clientHeight / 2;
        });
        bouton('🪄 Tout le n° choisi', function () { C.zones.forEach(function (z, zi) { if (z.n === choix) rempli[zi] = 1; }); AV.audio.scintille ? AV.audio.scintille() : AV.audio.ping(1); sauver(); dessiner(); verifierFin(); });
        bouton('👀 Modèle', function () { photo.style.transition = 'opacity .4s'; photo.style.opacity = photo.style.opacity === '1' ? '0' : '1'; setTimeout(function () { photo.style.transition = 'opacity 2.5s'; }, 450); });
        bouton('🖨️ Imprimer / 📥 Télécharger', function () { AV.audio.clic(); partager(coloriageA4(C, s.titre, s.consigne), 'coloriage-magique.png', 'Mon coloriage magique ✨', 'Coloriage magique'); });
        bouton('↺ Recommencer', function () { rempli = {}; sauver(); photo.style.opacity = '0'; dessiner(); });
        dessiner(); if (nbFaites() >= total) photo.style.opacity = '1';
        colEtat = { C: C, finir: function () { C.zones.forEach(function (z, zi) { rempli[zi] = 1; }); sauver(); dessiner(); verifierFin(); }, a4: function () { return coloriageA4(C, s.titre, s.consigne); }, zones: total };
      }, 60);
    };
    img.src = src || '';
  }

  // ---------- API ----------
  AV.recompenses = {
    __coloriage: function () { return colEtat; },
    init: function () {
      modal = document.getElementById('modal');
      boite = document.getElementById('modal-boite');
      entete = document.getElementById('modal-entete');
      contenu = document.getElementById('modal-contenu');
      document.getElementById('modal-fermer').onclick = function () { AV.recompenses.fermer(); };
    },
    ouvert: function () { return !modal.classList.contains('cache'); },
    ouvrir: function (cfg, quandFerme) {
      surFermer = quandFerme || null;
      var s = cfg.surprise || { type: 'mot', texte: '' };
      entete.innerHTML = '<div class="jour">Jour ' + cfg.jour + '</div><h2>' + echapper(cfg.titre) + '</h2>';
      contenu.innerHTML = '';
      var types = { photo: photo, video: video, mot: mot, cadeau: cadeau, recette: recette, livre: livre, postit: postit, echange: echange, krapfen: krapfen, coloriage: coloriage };
      boite.classList.toggle('large', s.type === 'livre' || s.type === 'echange' || s.type === 'coloriage');
      if (s.type === 'jeu') ({ memory: memory, quiz: quiz, puzzle: puzzle }[s.jeu] || memory)(s, contenu);
      else (types[s.type] || mot)(s, contenu);
      var fin = el('div', 'centre');
      var b = el('button', 'btn-principal', 'Continuer ✨');
      b.onclick = function () { AV.recompenses.fermer(); };
      fin.appendChild(b); contenu.appendChild(fin);
      modal.classList.remove('cache');
      boite.scrollTop = 0;
    },
    fermer: function () {
      if (modal.classList.contains('cache')) return;
      modal.classList.add('cache');
      contenu.querySelectorAll('video').forEach(function (v) { v.pause(); });
      contenu.innerHTML = '';
      var f = surFermer; surFermer = null;
      if (f) f();
    }
  };

  // ---------- Confettis ----------
  var canvas, cx2, parts = [], anime = false;
  AV.confettis = function (n) {
    canvas = canvas || document.getElementById('confettis');
    cx2 = cx2 || canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var cols = ['#d94a4a', '#f3c34b', '#3f8f6b', '#5ab0ff', '#ff8af0', '#ffffff'];
    for (var i = 0; i < (n || 100); i++) {
      parts.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200, y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        c: cols[i % cols.length], l: 6 + Math.random() * 6, vie: 1
      });
    }
    if (!anime) { anime = true; requestAnimationFrame(boucle); }
  };
  function boucle() {
    cx2.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vie -= 0.007;
      cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.r); cx2.globalAlpha = Math.max(0, p.vie);
      cx2.fillStyle = p.c; cx2.fillRect(-p.l / 2, -p.l / 4, p.l, p.l / 2); cx2.restore();
      if (p.y > canvas.height + 20 || p.vie <= 0) parts.splice(i, 1);
    }
    if (parts.length) requestAnimationFrame(boucle);
    else { anime = false; cx2.clearRect(0, 0, canvas.width, canvas.height); }
  }
})(window.AV);
