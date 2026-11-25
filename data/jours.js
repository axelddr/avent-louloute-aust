/* =====================================================================
   CONFIGURATION DU CALENDRIER : c'est le seul fichier à modifier.
   =====================================================================

   Pour chaque jour :
     jour      : 1 à 24 (débloqué le N décembre de CONFIG.annee)
     titre     : le nom du souvenir
     sousTitre : petite phrase affichée en haut de l'écran (optionnel)
     nom       : (optionnel) prénom de l'animal, ex. "Charlie"
     biome     : décor 3D. Biomes soignés : "cinema", "camargue", "rooftop", "lac_nuit", "plage", "foret_neige", "ville_nuit"
                 Biomes génériques (seront refaits à l'étape 2) :
                 "montagne", "desert", "lac", "campagne", "foret", "neige"
     ambiance  : (optionnel) { ciel: "jour" | "coucher" | "nuit" }
     animal    : "renard", "chat", "lapin", "hibou", "tortue", "pingouin",
                 "chien", "ecureuil", "ours", "kangourou", "quokka", "calopsite"
     cachette  : "auto" (une cachette du décor, toujours la même pour ce jour)
                 ou { x: 5, z: -3 } pour une position précise
     surprise  : voir les exemples ci-dessous
        { type: "photo", fichiers: ["media/jour01.jpg", ...], texte: "..." }
        { type: "video", fichiers: ["media/jour04.mp4"], texte: "..." }
        { type: "mot", texte: "...", signature: "..." }
        { type: "cadeau", texte: "...", fichiers: ["media/bon.jpg"] (optionnel) }
        { type: "jeu", jeu: "memory", fichiers: [4 à 8 photos] (sinon émojis), texte: "..." }
        { type: "jeu", jeu: "quiz", questions: [{ question, choix: [...], reponse: index }], texte: "..." }
        { type: "jeu", jeu: "puzzle", fichiers: ["media/photo.jpg"], texte: "..." }

   Les photos et vidéos vont dans le dossier media/.
   Vidéos : de préférence en .mp4 (H.264), pour que ça marche sur iPad.
   ===================================================================== */

window.CONFIG = {
  annee: 2026,
  titre: "Nos 24 souvenirs",
  sousTitre: "Un calendrier de l'Avent rien que pour toi",
  indiceApres: 120,      // secondes avant les premiers indices (étincelles + son)
  indiceChaudFroid: 240  // secondes avant l'indice « chaud / froid »
};

window.JOURS = [
  // Jour 1 : la salle de cinéma. Charlie se cache dans la cabine de projection ;
  // quand on toque à la vitre, il a peur, appuie sur le bouton… et le film démarre sur le grand écran.
  // → mets ta vidéo dans media/jour01.mp4 (le « texte » s'affiche à la fin du film, laisse "" pour rien).
  { jour: 1, titre: "Notre séance de cinéma", sousTitre: "Charlie le chat s'est caché quelque part dans la salle…",
    biome: "cinema", enseigne: "Pathé", animal: "chat", nom: "Charlie", cachette: "auto",
    // photo affichée quand on va dire bonjour au couple assis au milieu de la salle
    photoCouple: { fichiers: ["media/j1/207064ed-a902-49e8-ba10-5decbde2ed3e.jpg", "media/j1/fcb4d391-1e23-4659-a431-c22f91ed13ae.jpg"], titre: "Nous deux ❤", texte: "Toi, moi, un pop-corn et un bon film…" },
    surprise: { type: "video", fichiers: ["media/j1/film-cinema.mp4"], texte: "Merci pour toutes ces séances à tes côtés ❤", signature: "— Moi" } },

  // Jour 2 : balade en Camargue. Edith la calopsite se cache au milieu des flamants roses ;
  // ils sont trop serrés pour passer… il faut attendre qu'ils s'envolent et courir la chercher.
  // Elle tend alors un cadeau (texte ci-dessous, + une image optionnelle dans fichiers).
  { jour: 2, titre: "Balade en Camargue", sousTitre: "Edith s'est cachée parmi les flamants roses…",
    biome: "camargue", animal: "calopsite", nom: "Edith", cachette: "auto",
    surprise: { type: "cadeau", texte: "Edith a un cadeau pour toi : écris ici ce qu'il y a dedans 🎁", fichiers: [] } },

  // Jour 3 : le rooftop de l'Arbre Blanc à Montpellier, au coucher du soleil.
  // La loutre est barmaid derrière le comptoir : elle sert un verre de blanc… et la surprise ci-dessous.
  { jour: 3, titre: "Rooftop de l'Arbre Blanc", sousTitre: "Coucher de soleil sur Montpellier… mais qui tient le bar ?",
    biome: "rooftop", animal: "loutre", cachette: "auto",
    surprise: { type: "cadeau", texte: "Écris ici la surprise que la loutre t'offre avec ton verre de blanc 🥂",
      fichiers: ["media/JOUR3/1b144f04-78db-43e5-9c11-3154d2cfd763.jpg", "media/JOUR3/3e8ad604-1b33-45d9-ab20-6c68c5ae2581.jpg", "media/JOUR3/4dc7966f-29a7-4578-b799-824345622de1.jpg"] } },

  // Jour 4 : nuit étoilée au lac du Crès, vue à la première personne (allongée sur la serviette, lui à côté).
  // Il faut repérer « objectif » étoiles filantes en appuyant sur ✋ quand on en voit une ; ensuite il offre un cadeau.
  // copain : le prénom affiché quand il parle (sinon « Lui »).
  { jour: 4, titre: "Nuit étoilée au lac du Crès", sousTitre: "Allongée près de lui… repère 5 étoiles filantes 🌠",
    biome: "lac_nuit", objectif: 5, copain: "Axel", copine: "Océane",
    surprise: { type: "cadeau", texte: "Écris ici ce qu'il y a dans le cadeau qu'il t'offre sous les étoiles 🎁", fichiers: [] } },

  // Jour 5 : l'éclipse totale de l'été, promenade du Peyrou. Pas de lunettes ! Il faut se faufiler dans la foule
  // et demander aux gens ; le vieux monsieur à la canne prête sa paire → cinématique (lunettes, croissant, totalité).
  // surprise : tant que « fichiers » est vide, la cinématique de l'éclipse suffit (pas de fenêtre).
  // Ajoute tes photos (type "photo", plusieurs fichiers possibles) ou ta vidéo (type "video") pour qu'elles s'ouvrent pendant la totalité.
  { jour: 5, titre: "L'éclipse au Peyrou", sousTitre: "Pas de lunettes… et l'éclipse commence ! 😱",
    biome: "peyrou", copain: "Axel", copine: "Océane",
    surprise: { type: "photo", texte: "Notre éclipse ❤",
      fichiers: ["media/J5/0a2f97ba-ba5e-40b9-9da2-e8420572357e.jpg", "media/J5/f698fbd2-72f4-4e32-87f1-7c1450b15562.jpg",
                 "media/J5/5a372713-bb9d-42fc-8519-3b3caf9d521b.jpg", "media/J5/71839967-8494-4f48-acba-7bcdd111b740.jpg"] } },

  // Jour 6 : descente de trail à fond ! ← → pour se décaler, ⤒ (ou ✋) pour sauter.
  // Un obstacle percuté = les clés tombent : il faut passer dessus pour les ramasser, sinon retour à la dernière balise.
  // Il attend sous l'arche d'arrivée ; la surprise s'ouvre à l'arrivée.
  { jour: 6, titre: "Descente de trail", sousTitre: "À fond dans la descente… sans perdre les clés ! 🔑",
    biome: "trail", copain: "Axel", copine: "Océane",
    surprise: { type: "cadeau", texte: "Écris ici la surprise qui l'attend à l'arrivée 🏁", fichiers: [] } },

  // Jour 7 : le practice du Golf du Pic Saint-Loup (Saint-Gély-du-Fesc).
  // ← → pour viser, puis ✋ trois fois : démarrer la jauge, choisir la puissance (repères colorés = distance de chaque cible),
  // arrêter l'aiguille dans le vert. Il faut faire atterrir une balle sur les 3 greens (50, 90 et 135 m).
  // Ensuite il vient lui faire un gros câlin… et le petit mot ci-dessous s'ouvre.
  { jour: 7, titre: "Le practice du Pic Saint-Loup", sousTitre: "Trois cibles à toucher… ⛳",
    biome: "golf", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici le petit mot qu'il te glisse pour le jour 8 💌", signature: "— Moi ❤" } },

  // Jour 8 : lever de soleil depuis les ruines du château de Viviourès (falaise de l'Hortus), face au Pic Saint-Loup.
  // Elle fait décoller son drone et doit prendre 3 photos : vous deux, le lever de soleil, une chèvre (cachées sur le Pic).
  // Commandes : joystick (ZQSD) = avancer / tourner · glisser à droite (souris) = caméra · ⬆ ⬇ (Espace / C) = altitude · 📸 (E) = photo.
  // surprise : l'album des 3 photos prises par le drone s'ouvre à la fin ; les fichiers ajoutés ici s'affichent à la suite.
  { jour: 8, titre: "Lever de soleil à Viviourès", sousTitre: "L'aube sur le Pic Saint-Loup… et un drone 🚁",
    biome: "hortus", copain: "Axel", copine: "Océane",
    surprise: { type: "photo", texte: "Notre lever de soleil sur le Pic Saint-Loup ❤",
      fichiers: ["media/J8/68a024f0-1e2b-4645-97cb-6a3826ceb1a7.jpg", "media/J8/9d67a9fd-b766-4fc0-8c71-0c9e4ebb9c4a.jpg",
                 "media/J8/9a91dc76-fed2-4cd7-ad08-a2fd8009bee2.jpg", "media/J8/24d2dc3c-0a20-4357-931a-aac01938f0a3.jpg",
                 "media/J8/e5a82c24-ad9d-444b-b82c-895e480f8ba4.jpg", "media/J8/0a0e3605-f292-4928-b63d-0a48aa1d8910.jpg"] } },
  // Jour 9 : balade en paddle au lac du Crès avec lui ; trouver les 5 canards cachés autour de l'île (ils te suivent en file indienne).
  // Commandes : joystick (ZQSD) = pagayer / tourner · glisser à droite (souris) = caméra · ✋ (E) près d'un canard · ⤒ (Espace) = l'éclabousser.
  // surprise : remplace par une photo ("photo" + fichiers) ou un mot.
  { jour: 9, titre: "Paddle au lac du Crès", sousTitre: "Coin coin ! 🦆", biome: "paddle", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 9 💦", signature: "— Moi ❤" } },
  // Jour 10 : notre appartement (modélisé d'après media/appartement jour 10.png). 2 souvenirs à débloquer :
  //   🧩 s'asseoir sur le tabouret de la cuisine → puzzle de la photo · 📖 le livre sur la table basse → le livre à feuilleter
  // (la recette et le film sont pour le jour 20 : si on essaie, Axel a « de meilleures idées »)
  // missions possibles : "recette", "puzzle", "livre", "vlog" (on peut les répartir comme on veut entre les jours "appart")
  // Commandes : joystick (ZQSD) = marcher · glisser = caméra · ✋ (E) = action.
  { jour: 10, titre: "Chez nous", sousTitre: "Notre petit nid 🏠", biome: "appart", copain: "Axel",
    missions: ["puzzle", "livre"],
    // la photo du puzzle et le nombre de pièces (la grille s'adapte au format de la photo)
    puzzle: { fichiers: ["media/J10/9689eb49-731a-4217-8686-1ea9ae4cdbd2.jpg"], pieces: 50, texte: "" },
    // le livre scanné : mets les pages dans media/livre/ (page01.jpg, page02.jpg, …) et indique leur nombre
    // (la page 1 = la couverture) — ou donne la liste exacte dans pages: ["media/livre/xxx.jpg", ...]
    livre: { titre: "Notre livre 📖", dossier: "media/livre/", nombre: 0, extension: ".jpg", texte: "" } },
  // Jour 20 : soirée à la maison. 2 souvenirs : 👨‍🍳 parler à Axel qui cuisine → la recette ·
  //   🎬 s'allonger sur le canapé → il s'assoit à côté, le vlog passe à la télé
  // (le livre et le puzzle sont pour le jour 10 : Axel a « de meilleures idées »)
  { jour: 20, titre: "Soirée à la maison", sousTitre: "Le chef cuisine, et après… film 🎬", biome: "appart", copain: "Axel",
    missions: ["recette", "vlog"],
    // la recette du chef : ingrédients à cocher (l'émoji au début sert d'icône), étapes une par une
    // (une étape = un texte, ou { emoji, texte }), puis le four animé et la phrase de fin
    recette: {
      titre: "Filet mignon en croûte au fromage",
      personnes: "2 amoureux", temps: "15 min + 40 min de four",
      ingredients: ["🥩 1 filet mignon de porc", "🥐 1 pâte feuilletée", "🟡 De la moutarde", "🌿 Des herbes de Provence",
                    "🧀 Du fromage à croque-monsieur", "🐮 Des Vache qui rit", "🥚 1 jaune d'œuf"],
      etapes: [
        { emoji: "🥐", texte: "Badigeonner la pâte feuilletée de moutarde." },
        { emoji: "🥩", texte: "Badigeonner le filet mignon de moutarde et d'herbes de Provence." },
        { emoji: "🧀", texte: "Placer généreusement du fromage à croque-monsieur sur la pâte feuilletée." },
        { emoji: "🐮", texte: "Ajouter des bouts de Vache qui rit sur la pâte." },
        { emoji: "🌯", texte: "Déposer le filet mignon et l'emballer entièrement dans la pâte." },
        { emoji: "🥚", texte: "Badigeonner d'un jaune d'œuf." }
      ],
      four: { minutes: 40, temperature: "180 °C" },   // dernière étape : on enfourne (minuteur accéléré)
      fin: "Déguster chaud !",
      mot: "",                         // petit mot sous « Déguster chaud ! », ex. "Avec tout mon amour ❤"
      fichiers: []                     // une photo du plat (facultatif), ex. ["media/J20/plat.jpg"]
    },
    // le vlog des Dolomites (.mp4 H.264)
    vlog: { fichiers: ["media/jour10-dolomites.mp4"] } },
  // Jour 11 : le réveil dans notre appart. Elle somnole, il part au boulot avec un bisou sur le front,
  // 5 secondes de rêve, puis elle se lève et trouve un post-it sur le bar de la cuisine.
  // (✋ / E pendant l'intro = la passer)
  { jour: 11, titre: "Bonjour mon cœur", biome: "appart", scenario: "reveil", copain: "Axel", copine: "Océane",
    // le mot du post-it (retours à la ligne avec \n)
    surprise: { type: "postit", texte: "", signature: "" } },
  // Jour 12 : parapente depuis le sommet du Puy de Dôme. La surprise : lui, qui a le vertige, a réservé un biplace… et c'est toi qui pilotes !
  // 1) ✋ gonfle la voile, ← → pour la garder droite · 2) course d'élan : tape ✋ très vite (il prend peur à mi-pente !)
  // 3) vol : ← → tourner · ↑ accélérer · ↓ freiner · ⬇ maintenu (C / Espace) = les oreilles pour descendre · 🪂 ✋ (E) = arrondi près du sol
  // Objectif : se poser dans le cercle 🎯 en bas (il s'agrandit après chaque essai raté). Ensuite il embrasse la terre ferme… câlin… surprise.
  { jour: 12, titre: "Envol du Puy de Dôme", sousTitre: "Il a le vertige… et il t'a réservé un vol en parapente ! 🪂",
    biome: "puy_dome", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 12 🪂", signature: "— Moi ❤" } },
  // Jour 13 : le chalet de Camprieu. Lui sirote un verre sur la terrasse ; en bas du jardin, une slackline entre deux hêtres.
  // ✋ près du hêtre de gauche pour monter · ← → pour se rattraper (pousse du côté où tu penches) · ↑ avancer · ↓ reculer · ✋ sauter de la ligne.
  // Chaque chute calme un peu la ligne ; après 3 chutes, il descend te tenir la main. Au bout : câlin… et la surprise.
  { jour: 13, titre: "La slackline du chalet", sousTitre: "Camprieu, au pied de l'Aigoual… on joue les funambules ? 🤸",
    biome: "chalet", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 13 🏔️", signature: "— Moi ❤" } },
  // Jour 14 : pique-nique sur la plage au coucher du soleil. ✋ près du plaid pour déballer, puis 3 épreuves :
  // les mouettes (cours vers elles + ✋), les moustiques (✋ près de l'essaim), puis les deux. 3 vols ou 3 piqûres = on recommence.
  // À la fin, Edith arrive de la mer en volant avec un petit mot dans le bec : c'est ce mot qui s'affiche ci-dessous.
  { jour: 14, titre: "Pique-nique au coucher du soleil", sousTitre: "Un plaid, du rosé, la mer… et des mouettes bien gourmandes 🌅",
    biome: "plage_soir", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici le petit mot qu'Edith t'apporte 🕊️", signature: "— Moi ❤" } },
  // Jour 15 : atelier peinture sur céramique au château de Restinclières (Prades-le-Lez). Lui est déjà assis sous les platanes ;
  // ✋ sur la chaise en face → elle peint son mug (doigt sur le mug = peindre, glisser à côté = tourner, palette à gauche, outils à droite),
  // ✅ « J'ai fini » → on se tend les mugs (✋) → la surprise montre son mug à elle (avec un bouton pour te l'envoyer) + la photo du tien.
  // Ton mug : mets sa photo dans media/jour15-mug-lui.jpg (plusieurs photos possibles).
  // En 3D, ton mug porte un dessin par défaut (« Pour toi ❤ ») ; pour l'habiller avec ton vrai dessin, mets une image « déroulée »
  // (tout le tour du mug, format environ 3 × 1, anse au bord gauche/droit) dans mugLui.texture, ex. "media/jour15-mug-lui-deroule.jpg".
  { jour: 15, titre: "Atelier céramique à Restinclières", sousTitre: "Chacun peint son mug… et on se les échange ☕🎨",
    biome: "restinclieres", copain: "Axel", copine: "Océane",
    mugLui: { texture: "" },
    surprise: { type: "echange", fichiers: ["media/jour15-mug-lui.jpg"], texte: "Un mug chacun… pour penser à l'autre à chaque café ☕❤", signature: "— Moi ❤" } },
  // Jour 16 : le sommet du Lagazuoi (Dolomites, 2752 m). On sort du téléphérique, il te suit partout.
  // Loulou, la mini loutre, a chipé un krapfen à la vitrine du refuge : la serveuse (sur la terrasse) montre les traces de sucre glace.
  // Une fois trouvée, Loulou t'offre un krapfen à croquer… puis le mot et les photos ci-dessous.
  // Bonus : ✋ à la croix = selfie (photos « selfie ») · ✋ à la longue-vue = photos du panorama + noms des sommets.
  { jour: 16, titre: "Le Lagazuoi", sousTitre: "2752 m au-dessus des Dolomites… mais où est passée Loulou ? 🦦🍩",
    biome: "lagazuoi", animal: "loulou", nom: "Loulou", cachette: "auto", copain: "Axel", copine: "Océane",
    selfie: { titre: "Au sommet du Lagazuoi ❤", texte: "",
      fichiers: ["media/j16/1e91f814-d314-426c-8a0c-1f2c6444c389.jpg", "media/j16/6c1e4c78-7ef0-4b85-9e15-928766b2efd1.jpg"] },
    panorama: { titre: "La vue depuis le Lagazuoi 🔭", texte: "",
      fichiers: ["media/j16/77b27cc2-d117-4e07-8c26-f5d9cbc085ca.jpg", "media/j16/4fbe63cf-053a-4ff7-a533-a59583188b97.jpg",
                 "media/j16/c351ec72-4d3b-4af7-9558-70ff2489152e.jpg", "media/j16/96f1b87f-d397-4fbb-a83f-388305abb860.jpg",
                 "media/j16/9df354b0-bc92-411d-93a3-de7dc02fdea1.jpg", "media/j16/031edb2b-5732-48f3-8d34-0c2869e9dd05.jpg"] },
    surprise: { type: "krapfen", texte: "Écris ici ton petit mot du jour 16 🍩", signature: "— Moi ❤",
      fichiers: ["media/j16/424fd929-4a4e-47c6-8713-abc850f24862.jpg", "media/j16/9e771bb5-589a-4031-8ecf-c1591514b03c.jpg"] } },
  // Jour 17 : la chambre d'Océ, dans la coloc (d'après media/J17). Cette fois on joue LUI ! Océ est assise sur son lit.
  // Charlie est caché sous le lit et attaque les chevilles quand on passe trop près (⤒ pour esquiver quand ses yeux brillent 👀).
  // ✋ ouvrir l'armoire → la canne à plume · ✋ l'agiter près du lit → Charlie sort et suit la plume (marcher doucement !).
  // 3 bêtises : le bureau 💻, la douche 🚿, puis le lit 🛏️ (il allume la télé)… piège du ventre, ronrons, et la surprise.
  { jour: 17, titre: "La chambre d'Océ", sousTitre: "Charlie est sous le lit… et il a faim de chevilles 😼",
    biome: "chambre_oce", nom: "Charlie", copine: "Océ",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 17 🐱", signature: "— Moi ❤" } },
  // Jour 18 : notre première journée ensemble, au bord de l'Hérault à Laroque. On joue Océane (déjà en maillot).
  // ✋ serviettes aux gros rochers → Axel fait les sandwichs jambon-beurre-fromage (4 ✋), Océane juge, chips pour Axel
  // → baignade : ✋ l'éclabousser 3 fois → les cailloux plats sous le seuil du moulin : ✋ s'allonger, ✋ discuter 3 fois (nuage en cœur) → ✋ se tourner vers lui → bisou → surprise.
  { jour: 18, titre: "Notre première journée", sousTitre: "Laroque, au bord de l'Hérault ☀️🌊",
    biome: "laroque", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 18 ❤", signature: "— Moi ❤" } },
  // Jour 19 : soirée bowling, Océane contre Axel (5 frames). On joue Océane : se placer sur la piste, ✋ Lancer quand la flèche est verte.
  // Axel commence nul (0, 3, 4, 0) pendant qu'Océane enchaîne les spares… puis il se réveille : 3 strikes d'affilée (TURKEY 🦃) → surprise.
  { jour: 19, titre: "Soirée bowling", sousTitre: "Océane contre Axel… qui va gagner ? 🎳",
    biome: "bowling", copain: "Axel", copine: "Océane",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 19 🎳", signature: "— Moi ❤" } },
  // Jour 21 : Cœur de Ville en Lumières sur la place de la Comédie. On se place devant les Trois Grâces,
  // spectacle de vidéo-mapping sur l'Opéra… puis une lumière s'échappe et file sur un immeuble à droite :
  // il faut la suivre du regard (glisser) et NOS vidéos y sont projetées. ✋ = vidéo suivante.
  { jour: 21, titre: "Cœur de Ville en Lumières", sousTitre: "La Comédie s'illumine ✨", biome: "comedie", copain: "Axel", copine: "Océane",
    // vidéos (.mp4 H.264) et/ou photos (.jpg), projetées dans l'ordre sur l'immeuble. Vide = message d'attente.
    // ex. ["media/j21/video1.mp4", "media/j21/photo1.jpg", "media/j21/video2.mp4"]
    medias: [],
    dureePhoto: 6,                     // secondes par photo
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 21 ✨", signature: "— Moi ❤" } },
  { jour: 22, titre: "Le rougail piégé", sousTitre: "Un vrai piment antillais… qui a fondu dans la cocotte 🌶️", biome: "appart", scenario: "rougail", copain: "Axel", copine: "Océane",
    // qui tombe sur la cuillère piquante : "hasard" (par défaut), "oceane" ou "axel"
    victime: "hasard",
    surprise: { type: "mot", texte: "Écris ici ton petit mot du jour 22 🌶️", signature: "— Moi ❤" } },
  { jour: 23, titre: "Souvenir n°23", biome: "foret_neige", animal: "renard",   cachette: "auto", surprise: { type: "photo", fichiers: ["media/jour23.jpg"], texte: "" } },
  { jour: 24, titre: "Joyeux Noël ❤", biome: "foret_neige", animal: "pingouin", cachette: "auto",
    ambiance: { ciel: "nuit" },
    surprise: { type: "mot", texte: "Joyeux Noël mon amour.\nMerci pour ces 24 souvenirs… et pour tous ceux qui arrivent.", signature: "— Moi ❤" } }
];
