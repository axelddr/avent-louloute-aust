/* Contrôles : clavier + souris (PC), joystick virtuel + glisser caméra + boutons (iPad) */
window.AV = window.AV || {};
(function (AV) {
  'use strict';

  var etat = { x: 0, y: 0, course: false, actif: true };
  var saut = false, action = false, regardX = 0, regardY = 0, zoom = 0;
  var touches = {};
  var joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  var regards = {}; // pointeurs qui tournent la caméra
  var RAYON = 60;
  var toutRegard = false; // vue première personne : tous les doigts tournent la vue (pas de joystick)

  var elJoy, elBouton;

  function majClavier() {
    var x = 0, y = 0;
    if (touches.KeyA || touches.KeyQ || touches.ArrowLeft) x -= 1;
    if (touches.KeyD || touches.ArrowRight) x += 1;
    if (touches.KeyW || touches.KeyZ || touches.ArrowUp) y += 1;
    if (touches.KeyS || touches.ArrowDown) y -= 1;
    return { x: x, y: y };
  }

  function placerJoystick(x, y) {
    elJoy.style.left = x + 'px';
    elJoy.style.top = y + 'px';
  }

  function init() {
    elJoy = document.getElementById('joystick');
    elBouton = document.getElementById('joystick-bouton');
    var zone = document.getElementById('zone-tactile');

    window.addEventListener('keydown', function (e) {
      // e.code = position physique : ZQSD (AZERTY) et WASD (QWERTY) fonctionnent
      touches[e.code] = true;
      if (e.code === 'Space') { saut = true; e.preventDefault(); }
      if (e.code === 'KeyE' || e.code === 'Enter') action = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') etat.course = true;
    });
    window.addEventListener('keyup', function (e) {
      touches[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') etat.course = false;
    });
    window.addEventListener('blur', function () { touches = {}; etat.course = false; });

    zone.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (e.pointerType === 'touch') document.body.classList.add('tactile');
      var gauche = e.clientX < window.innerWidth * 0.45;
      if (e.pointerType !== 'mouse' && gauche && joy.id === null && !toutRegard) {
        joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
        placerJoystick(e.clientX, e.clientY);
        elJoy.classList.add('actif');
        elBouton.style.transform = 'translate(0,0)';
      } else {
        regards[e.pointerId] = { x: e.clientX, y: e.clientY };
      }
      try { zone.setPointerCapture(e.pointerId); } catch (er) { }
    });

    zone.addEventListener('pointermove', function (e) {
      if (e.pointerId === joy.id) {
        var dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
        var l = Math.sqrt(dx * dx + dy * dy);
        if (l > RAYON) { dx *= RAYON / l; dy *= RAYON / l; }
        joy.x = dx / RAYON; joy.y = -dy / RAYON;
        elBouton.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      } else if (regards[e.pointerId]) {
        var r = regards[e.pointerId];
        regardX += e.clientX - r.x; regardY += e.clientY - r.y;
        r.x = e.clientX; r.y = e.clientY;
      }
    });

    function fin(e) {
      if (e.pointerId === joy.id) {
        joy.id = null; joy.x = 0; joy.y = 0;
        elJoy.classList.remove('actif');
        elBouton.style.transform = 'translate(0,0)';
        placerJoystick(110, window.innerHeight - 120);
      }
      delete regards[e.pointerId];
    }
    zone.addEventListener('pointerup', fin);
    zone.addEventListener('pointercancel', fin);
    zone.addEventListener('wheel', function (e) { zoom += e.deltaY; e.preventDefault(); }, { passive: false });

    function bouton(id, quand) {
      var b = document.getElementById(id);
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('appuye'); quand(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { b.addEventListener(t, function () { b.classList.remove('appuye'); }); });
    }
    bouton('btn-saut', function () { saut = true; });
    bouton('btn-action', function () { action = true; });

    // Empêche le zoom / défilement de Safari iOS
    ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (t) {
      document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
    });
    document.addEventListener('touchmove', function (e) {
      if (!e.target.closest || !e.target.closest('#modal-boite')) e.preventDefault();
    }, { passive: false });
    window.addEventListener('resize', function () { if (joy.id === null) placerJoystick(110, window.innerHeight - 120); });
    placerJoystick(110, window.innerHeight - 120);
  }

  AV.controles = {
    init: init,
    etat: etat,
    lire: function () {
      if (!etat.actif) return { x: 0, y: 0, course: false };
      var k = majClavier();
      var x = k.x + joy.x, y = k.y + joy.y;
      var l = Math.sqrt(x * x + y * y);
      if (l > 1) { x /= l; y /= l; l = 1; }
      var courseTactile = joy.id !== null && l > 0.92;
      return { x: x, y: y, course: etat.course || courseTactile, intensite: l };
    },
    saut: function () { var s = saut && etat.actif; saut = false; return s; },
    action: function () { var a = action && etat.actif; action = false; return a; },
    regard: function () { var r = { dx: regardX, dy: regardY, zoom: zoom }; regardX = regardY = zoom = 0; return etat.actif ? r : { dx: 0, dy: 0, zoom: 0 }; },
    vider: function () { saut = action = false; regardX = regardY = zoom = 0; },
    toutRegard: function (on) { toutRegard = !!on; }
  };
})(window.AV);
