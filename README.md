# 🧠 Famili'Quiz

Le grand quiz de la famille : de 1 à 6 joueurs, de 7 ans à adulte, chacun reçoit des questions **adaptées à son âge** pour que tout le monde puisse gagner. En solo, chacun pour soi ou **Parents contre Enfants**.

**▶️ Jouer en ligne : https://orizonlab.github.io/familiquiz/** (sur iPad : Safari → Partager → *Sur l'écran d'accueil*)

## ▶️ Lancer le jeu

**Le plus simple :** ouvrir https://orizonlab.github.io/familiquiz/ dans le navigateur de n'importe quel appareil (ordinateur, tablette, téléphone).

**Sans Internet, sur l'ordinateur :** double-cliquer sur `index.html` (Chrome, Edge ou Firefox).

**Sans Internet, sur les appareils de la maison** (même Wi-Fi), depuis l'ordinateur :

```bash
node tools/serve.js
```

Puis ouvrir l'adresse « Sur le réseau » affichée (ex. `http://192.168.1.20:8080`) sur l'appareil.

## 🔒 Confidentialité : où sont les profils ?

**Les profils ne sont pas partagés avec le monde entier.** Le site en ligne ne contient que le jeu (le programme, les questions, les images). Il n'a ni serveur ni base de données : il ne peut **rien recevoir ni stocker**.

- Les joueurs, statistiques, badges et l'historique sont enregistrés **uniquement dans le navigateur de l'appareil** sur lequel on joue (l'iPad de la maison, par exemple). Ils ne sont jamais envoyés sur Internet.
- Quelqu'un d'autre qui ouvre l'adresse du jeu obtient un jeu **vide**, avec ses propres profils sur son appareil. Il ne voit jamais les vôtres.
- Chaque appareil a donc ses propres profils. Pour les copier d'un appareil à l'autre : *Réglages → Exporter* (un fichier `.json` que vous gardez), puis *Importer* sur l'autre appareil.
- Le jeu ne contacte **aucun service extérieur** : pas de statistiques de visite, pas de publicité, et même la police d'écriture est hébergée avec le jeu. Seul l'hébergeur (GitHub) voit qu'un appareil télécharge le jeu, comme pour n'importe quel site. Deux exceptions, **uniquement si vous les activez** : la voix premium ElevenLabs et les téléphones-manettes (détails dans leurs sections).
- **Sur un même appareil, chaque navigateur a ses propres profils.** Sur iPad, l'icône de l'écran d'accueil et Safari sont séparés : jouez toujours depuis l'icône.
- **Effacer les données du navigateur efface les profils** : faites un export de temps en temps pour garder une sauvegarde.
- Ce qui est public : le code du jeu et les questions (dépôt GitHub). Rien de personnel.

**Faut-il un compte ?** Pas pour protéger les profils, puisqu'ils ne quittent jamais l'appareil. Un compte ne servirait qu'à **synchroniser** les profils entre plusieurs appareils, ce qui demanderait un serveur, une base de données et une authentification : beaucoup plus de risques à sécuriser pour un gain faible.

Pour **réserver l'accès au jeu lui-même** à la famille, la solution sûre est de ne pas programmer de mot de passe soi-même (un mot de passe dans une page web sans serveur se contourne facilement), mais de placer le site derrière un service d'accès professionnel, par exemple **Cloudflare Pages + Cloudflare Access** (gratuit jusqu'à 50 personnes) : seules les adresses e-mail autorisées reçoivent un code de connexion à usage unique.

## 📺 Jouer sur la télévision

Le jeu est une page web : il faut un appareil qui a un **navigateur web**, ou qui **recopie l'écran** d'un autre appareil sur la TV.

| Équipement | Possible ? | Comment |
|---|---|---|
| **Apple TV** | ✅ par recopie d'écran | L'Apple TV n'a **pas de navigateur web** : on ne peut pas y installer le jeu. Mais on peut jouer sur l'**iPad** (ou l'iPhone) et l'afficher sur la TV : *Centre de contrôle → Recopie de l'écran → Apple TV*. Le son passe aussi par la TV. ⚠️ La télécommande de l'Apple TV ne pilote **pas** l'iPad : on joue sur la tablette, avec une **manette Bluetooth** appairée à l'iPad, ou avec les **téléphones-manettes** (voir ci-dessous). |
| **TV compatible AirPlay** (Samsung, LG, Sony, Philips récentes) | ✅ par recopie d'écran | Même principe qu'avec l'Apple TV, depuis l'iPad ou l'iPhone. |
| **Chromecast / Google TV** | ✅ par diffusion | Depuis un **téléphone Android** : *Caster l'écran*. Depuis un **ordinateur** avec Chrome : menu ⋮ → *Caster…* → *Caster l'onglet*. |
| **Android TV / Google TV** (jeu directement sur la TV) | ⚠️ possible mais moins pratique | Pas de navigateur fourni : il faut en installer un (ex. *TV Bro* depuis le Play Store). On joue avec la télécommande en mode « pointeur ». |
| **TV connectée Samsung (Tizen) / LG (webOS)** | ⚠️ possible | Ouvrir l'adresse dans le navigateur intégré de la TV. Pratique avec la télécommande-pointeur LG (Magic Remote) ; plus lent avec les flèches. Les performances varient selon les modèles. |
| **Fire TV (Amazon)** | ⚠️ possible | Navigateur *Silk*, avec un pointeur à la télécommande. |
| **Ordinateur relié à la TV** | ✅ | Câble **HDMI** (ou adaptateur USB-C/HDMI pour l'iPad), ou recopie sans fil depuis Windows (*Windows + K*) vers les TV compatibles Miracast. |

> Quand le jeu tourne **directement sur la TV**, les profils sont enregistrés **dans la TV** (pas sur l'iPad). Avec la recopie d'écran, ils restent sur l'iPad.

**Jouer à la télécommande** (navigateur de la TV, Fire TV, ou clavier d'ordinateur) :

| Touche | Action |
|---|---|
| Flèches ⬆️⬇️⬅️➡️ | déplacer la sélection (contour doré) vers le bouton voisin |
| **OK** / Entrée | valider le bouton sélectionné (réponse, « Suivant »…) |
| **Retour** | revenir à l'écran précédent ; pendant une question : **pause** (Retour à nouveau pour reprendre) |
| Lecture/Pause | mettre la partie en pause |

**🎮 Manette de jeu Bluetooth** (Xbox, PlayStation, ou manette « MFi ») appairée à l'iPad dans *Réglages iOS → Bluetooth* : croix ou stick gauche pour choisir, **A / Croix** pour valider, **B / Rond** pour revenir, **Start / Options** pour la pause. Idéal avec la recopie d'écran sur Apple TV : tout se pilote depuis le canapé. (Touchez une fois l'écran au lancement pour activer le son.)

Après chaque réponse, la sélection se place sur « Question suivante » : un simple **OK** enchaîne. Les touches Retour des TV Samsung (Tizen), LG (webOS), Android TV et Fire TV sont reconnues. Sur certaines TV, la télécommande pilote une flèche-pointeur au lieu des flèches : on clique alors directement sur les boutons.

## 📲 Téléphones-manettes

Le jeu s'affiche sur la TV (iPad en recopie d'écran, ordinateur, navigateur de la TV…) et **chacun répond sur son propre téléphone**. Rien à installer sur les téléphones : une simple page web.

1. Sur le jeu : accueil → **📱 Téléphones-manettes**. Un **QR code** et un code (ex. `VSZ5-6YB8`) s'affichent.
2. Sur chaque téléphone : viser le QR code avec l'appareil photo (ou ouvrir `…/manette.html` et taper le code).
3. Choisir **son prénom** : quand c'est son tour, le téléphone vibre, affiche « Je suis prêt », puis la question, les réponses A/B/C/D, le chrono, le joker et la pause. Pendant le tour des autres, il affiche « regarde la télé ».
4. Ou choisir **« Juste télécommande »** : des flèches + OK pour piloter les menus (comme une télécommande), et répondre pour les joueurs qui n'ont pas de téléphone.

Règles : un téléphone ne peut répondre **qu'à ses propres questions** (ou à celles d'un joueur sans téléphone s'il est télécommande). Un même joueur ne peut être tenu que par un téléphone à la fois : si un autre le choisit, le premier en est averti et redevient télécommande. Jusqu'à 8 téléphones. Si un téléphone perd la connexion, il se reconnecte tout seul et retrouve son joueur. L'écran du jeu liste les téléphones connectés et permet d'en **déconnecter** un (✖). Le code change à chaque ouverture ; « Arrêter les manettes » coupe tout.

**🔒 Confidentialité et sécurité**

- **Mise en relation** : le service gratuit **PeerJS** (`0.peerjs.com`, logiciel libre) sert uniquement à « présenter » le téléphone au jeu à partir du code. Il voit les adresses IP des appareils et le code de session, **jamais le contenu du jeu**.
- **Ensuite, les appareils se parlent directement** (WebRTC), avec un chiffrement de bout en bout obligatoire (DTLS) : questions, réponses et scores ne passent par aucun serveur. Pour trouver le chemin direct, le navigateur interroge un serveur **STUN** (Google) qui ne voit que l'adresse IP publique. Si les réseaux bloquent la connexion directe (rare à la maison), un relais **TURN** de PeerJS transmet les données, **toujours chiffrées** : il ne peut pas les lire.
- Seuls passent : la liste des prénoms et avatars (pour choisir « qui es-tu ? »), les questions, les commandes (flèches, réponse A/B/C/D…) et le classement. **Jamais** les statistiques, l'historique, les réglages ni la clé ElevenLabs.
- Les messages des téléphones sont traités comme non fiables : format vérifié, limite de 25 messages par seconde, et le téléphone n'affiche que du texte (jamais de code).
- Le code de session (8 caractères, 31⁸ ≈ 850 milliards de combinaisons, tiré au hasard par le générateur cryptographique du navigateur) n'est valable que tant que l'écran du jeu reste ouvert. Une personne qui le connaîtrait pourrait au pire rejoindre la partie : elle apparaîtrait alors dans la liste des téléphones, où on la déconnecte d'un geste.
- Sans Internet, cette fonction ne marche pas (le reste du jeu, si).

## 📱 Installer sur iPad / iPhone

Famili'Quiz est une **application web installable** : icône sur l'écran d'accueil, plein écran, et **fonctionne hors ligne** une fois installée.

Sur l'iPad : ouvrir https://orizonlab.github.io/familiquiz/ dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil**. Lancer le jeu une première fois avec le Wi-Fi pour qu'il se mette en cache.

> L'installation hors ligne exige une adresse en **HTTPS** (c'est le cas de GitHub Pages). Avec `node tools/serve.js` (adresse en `http://`), l'ajout à l'écran d'accueil marche aussi, mais seulement quand l'ordinateur est allumé et sans mode hors ligne.

Avant chaque mise en ligne, régénérer la liste des fichiers pour le mode hors ligne :

```bash
node tools/build-sw.js
```

## 🎮 Déroulement d'une partie

1. **Nombre de joueurs** (1 = entraînement solo, jusqu'à 6).
2. **Qui joue ?** On choisit les profils existants (ou on en crée un : prénom, mois et année de naissance, avatar, couleur).
3. **Mode de jeu** (à partir de 2 joueurs) : **chacun pour soi** ou **en équipes**.
4. **Thèmes** : classement (équitable ou classique), nombre de thèmes + tirage au sort animé (ou choix manuel), et **5, 8 ou 10 questions** par thème et par joueur.
5. Pour chaque thème, chaque joueur joue **sa série** à tour de rôle : compte à rebours, 3 ou 4 réponses, joker 50/50, anecdote « Le savais-tu ? ».
6. Classement après chaque thème, puis **podium final**, trophées, **badges gagnés** et **détail des scores par thème**.

## 🤝 Mode équipes

- Le jeu propose automatiquement **Les Parents contre Les Enfants** (adultes contre moins de 17 ans). S'il n'y a que des adultes ou que des enfants, il forme deux équipes équilibrées par âge.
- On touche un joueur pour le changer d'équipe, et on peut renommer les équipes.
- Les joueurs passent **en alternance** (un de chaque équipe).
- **Score d'équipe = moyenne des points de ses joueurs** : une équipe de 2 peut battre une équipe de 3.

## 🎂 Adaptation à l'âge

| Niveau | Âge |
|---|---|
| 🐣 Petit curieux | 7-9 ans |
| 🧭 Explorateur | 10-12 ans |
| 🚀 Aventurier | 13-16 ans |
| 🎓 Expert | adultes |

- L'âge est calculé à partir du **mois et de l'année de naissance** : le niveau **évolue tout seul** le mois de l'anniversaire (sans le mois, au 1er janvier).
- **Difficulté adaptative** (par thème) : un joueur qui réussit très bien reçoit quelques questions du niveau au-dessus (bonus 💪 *Défi* +25 pts), un joueur en difficulté quelques questions plus faciles. Objectif : ~70 % de réussite pour chacun.
- **Temps bonus** pour les plus jeunes (+5 s pour les 7-9 ans, +3 s pour les 10-12 ans).
- **Lecture à voix haute** des questions pour les 7-9 ans (réglable : personne / 7-9 ans / tout le monde), avec une **voix naturelle enregistrée** (voir plus bas).

## ⭐ Points

### ⚖️ Classement équitable (par défaut)

Le jeu estime en continu la **vraie force** de chaque joueur dans chaque thème, sans plafond lié à l'âge (un adulte très fort dépasse le niveau maximum des questions, un enfant en difficulté peut descendre sous le niveau 1). Pour chaque question, il calcule la chance de réussite attendue **pour ce joueur** :

- une bonne réponse vaut **environ 100 points** pour une question « à sa mesure » (70 % de chances), **plus** si elle était difficile pour lui, **moins** si elle était facile ;
- la rapidité (jusqu'à +50) est pondérée de la même façon ;
- en simulation, un enfant en difficulté, un enfant très fort, un adulte moyen et un adulte très fort gagnent tous **88 à 89 points par question en moyenne** (contre 42 à 167 en classement classique).

C'est donc la performance **par rapport à son propre niveau** qui fait gagner, pas l'âge.

### ⭐ Classement classique (au choix)

- Bonne réponse : **100**
- ⚡ Rapidité : jusqu'à **+50** (proportionnel au temps restant, donc équitable avec le temps bonus)
- 🔥 Série : **+10** par bonne réponse consécutive (max +50)
- 💪 Question défi : **+25** par niveau au-dessus de son âge
- Mauvaise réponse / temps écoulé : 0 (rien n'est retiré)

## 🏅 Progression : badges, rangs, défis et objectifs

- Chaque partie rapporte de l'**expérience** (points ÷ 20 + 10, +20 en cas de victoire). 9 rangs : 🐣 Apprenti → 🔎 Curieux → 💡 Malin → 🦊 Futé → 📚 Savant → 🎓 Érudit → 🧠 Génie → 👑 Grand Maître → 🌟 Légende.
- **46 badges** à collectionner : participation, victoires (solo et en équipe), séries, sans-faute, réflexes, joker, questions défi, questions photo, défis de la semaine, objectifs atteints, un badge « expert » par thème, et quelques badges amusants (Couche-tard, Lève-tôt, Grande tablée…).
- **🗓️ Défis familiaux de la semaine** (sur l'écran d'accueil) : 3 défis tirés au sort chaque lundi, les mêmes sur tous les appareils (ex. « Réussir 80 bonnes réponses tous ensemble », « Jouer 6 thèmes différents »). Toutes les parties de la semaine les font avancer ; chaque défi réussi rapporte **+50 XP** à chaque joueur de la partie et un **trophée de famille**.
- **🎯 Objectif personnel** (dans le profil) : chaque joueur choisit un défi parmi des propositions adaptées à son profil (son thème le plus faible, une série un peu plus longue que son record…). Il avance tout seul en jouant ; une fois atteint : **+100 XP**.
- **🎁 Récompenses à débloquer** : 15 **avatars spéciaux** (🦔 🦦 🦒 🦓 🦩 🦚 🧝 🧞 🧜 🦹 🐉 👸 🤴 👑 🌟) et des **cadres d'avatar** (argent, or, arc-en-ciel animé) gagnés en montant de rang.
- La collection (obtenus en doré, à débloquer en grisé avec la condition) est dans le **profil** de chaque joueur.

## 📷 Questions photo

- Environ 200 questions photo (drapeaux, monuments, animaux, tableaux, instruments, planètes, plats…) dans 10 thèmes. Pas de photos pour *Télé & Cinéma* et *Jeux vidéo & BD* (images protégées par le droit d'auteur).
- Toutes les images viennent de **Wikimedia Commons** sous licence libre (domaine public, CC0, CC BY, CC BY-SA). Auteur et licence s'affichent après chaque question photo, et la liste complète est dans *Règles → Crédits des photos*.
- Toucher la photo l'agrandit. Le chrono démarre une fois l'image affichée.

## 🔁 Anti-répétition

Chaque question vue est mémorisée (par joueur et pour toute la famille). Le tirage choisit dans l'ordre : jamais vue par personne → jamais vue par ce joueur → vue il y a le plus longtemps. Une même question n'est jamais posée deux fois dans une partie, et les doublons entre thèmes ont été retirés (`tools/audit.js`).

## 🎙️ Voix de lecture

- **Voix naturelle intégrée** : les questions des 7-9 ans (et leurs réponses) sont **enregistrées** avec la voix libre « siwis » du logiciel [Piper](https://github.com/rhasspy/piper) (corpus SIWIS de l'Université d'Édimbourg, licence CC BY 4.0). Les fichiers sont livrés avec le jeu : **aucun compte, aucune clé, fonctionne hors ligne**. Les réponses sont lues dans l'ordre où elles s'affichent.
- **Voix de l'appareil** : pour les questions non enregistrées (niveaux 10 ans et plus), ou si on la préfère, le jeu utilise la voix de synthèse de l'appareil. Choix de la voix, bouton **Tester** et **vitesse de lecture** dans *Réglages*.
- **ElevenLabs (optionnel, compte payant conseillé)** : *Réglages → Voix → ElevenLabs*, puis coller sa clé API, choisir une voix et un modèle (*Qualité* = Multilingual v2, *Économique* = Flash v2.5). Toutes les questions sont alors lues avec cette voix, à la vitesse réglée.
  - Chaque lecture reçue est **gardée sur l'appareil** : un même texte n'est payé qu'une fois. Compter environ 140 caractères la première fois qu'une question est lue (≈ 90 000 caractères pour lire une fois toutes les questions des 7-9 ans).
  - Si ElevenLabs ne répond pas (crédits épuisés, clé refusée, pas d'Internet), un message s'affiche et **la voix intégrée prend le relais**.

### 🔐 Sécurité de la clé ElevenLabs

- La clé est enregistrée **uniquement sur l'appareil** où on la saisit, à part des réglages : elle n'est **jamais exportée** dans les sauvegardes, jamais publiée sur GitHub, et n'est affichée que masquée (`•••• 1a2b`).
- Elle est vérifiée auprès d'ElevenLabs avant d'être gardée ; une clé refusée est effacée aussitôt. « Supprimer la clé » ou « Tout réinitialiser » l'effacent de l'appareil.
- La page applique une **politique de sécurité (CSP)** : elle ne peut contacter **aucun autre serveur** qu'`api.elevenlabs.io`, ce qui empêche toute fuite de la clé vers un tiers.
- Seuls les **textes des questions et réponses** partent chez ElevenLabs : jamais de prénom, d'âge ni de score.
- **Conseillé** : dans ElevenLabs (*Developers → API Keys*), créer une clé dédiée au jeu, limitée à **Text to Speech** (avec **Voices** et **User** en lecture seule pour la liste des voix et l'affichage des crédits), avec un **plafond de crédits**. Même si quelqu'un récupérait la clé sur l'iPad, il ne pourrait que générer de la voix dans la limite fixée.
- Sur iPad, des voix d'appareil plus naturelles se téléchargent dans *Réglages iOS → Accessibilité → Contenu énoncé → Voix → Français* (« Premium » ou « Améliorée »).

**Regénérer les enregistrements** (après ajout ou modification de questions), sur le PC :

```bash
node tools/make-voice.js
```

Pour enregistrer aussi d'autres niveaux : `node tools/make-voice.js 1 2` (environ 20 Mo de plus par niveau). Pour changer de voix : `--voix=siwis` (femme, par défaut), `--voix=pierre` ou `--voix=tom` (hommes) ; tout est alors réenregistré. Le script ne génère que ce qui manque, supprime les enregistrements devenus inutiles et met à jour `data/voice.js`. Il a besoin, dans le dossier local `.voice/` (non publié), de Piper pour Windows, du modèle `fr_FR-siwis-medium` et de l'encodeur MP3 `lamejs` : voir l'en-tête de `tools/make-voice.js`.

## 🎵 Sons

Musique et bruitages **générés en direct** (Web Audio API, aucun fichier audio) : piano électrique, marimba, clochettes, nappes de cordes, basse ronde et percussions légères, avec réverbération. Musique douce à l’accueil, plus rythmée pendant la partie (et atténuée pendant les questions). On peut les écouter dans *Réglages*. Boutons 🎵 / 🔊 en haut à droite. Sur iPhone/iPad, le son fonctionne même en mode silencieux (iOS 16.4+).

## 🗂️ Structure

```
index.html              page du jeu
manette.html            page des téléphones-manettes
manifest.webmanifest    description de l'application installable
sw.js                   service worker (mode hors ligne) — généré par tools/build-sw.js
icons/                  icônes de l'application
fonts/                  police Fredoka (licence SIL OFL, fonts/OFL.txt), hébergée avec le jeu
css/style.css           styles
js/store.js             stockage local (joueurs, stats, historique, questions vues)
js/engine.js            niveaux d'âge, difficulté adaptative, tirage, score
js/badges.js            badges et rangs d'expérience
js/progress.js          défis de la semaine et objectifs personnels
js/eleven.js            voix premium ElevenLabs (optionnelle)
js/audio.js             musique, bruitages, lecture vocale
js/app.js               écrans et déroulement
js/remote.js            téléphones-manettes, côté jeu (session PeerJS, droits de chaque téléphone)
js/manette.js           téléphones-manettes, côté téléphone (css/manette.css)
js/vendor/              PeerJS 1.5.4 et qrcode-generator 1.4.4 (licences MIT, js/vendor/LICENCES.txt)
data/categories.js      liste des thèmes (nom, icône, couleurs)
data/questions/*.js     questions texte (200 par thème)
data/photos/*.js        questions photo
img/<thème>/            images des questions photo
tools/validate.js       vérification des banques de questions
tools/test-store.js     tests automatiques : import de sauvegardes abîmées ou piégées, coupure d'écriture, âge
tools/audit.js          détection des doublons et du biais « bonne réponse la plus longue »
tools/build-sw.js       génération du service worker
tools/make-icons.js     génération des icônes PNG
tools/serve.js          serveur local pour jouer en réseau
tools/make-voice.js     génération des lectures enregistrées (voix Piper)
audio/voix/             lectures enregistrées (MP3) · data/voice.js : leur liste
```

## ➕ Ajouter des questions

Question texte, dans `data/questions/<theme>.js` :

```js
{ l: 2, q: "Quel est le plus long fleuve de France ?", a: ["La Loire", "La Seine", "Le Rhône", "La Garonne"], e: "🌊🗺️", f: "La Loire mesure environ 1 000 km." },
```

Question photo, dans `data/photos/<theme>.js` :

```js
{ l: 1, q: "À quel pays appartient ce drapeau ?", a: ["L’Italie", "La France", "L’Irlande"], img: "img/geo/drapeau-italie.png", cr: "Domaine public", src: "https://commons.wikimedia.org/wiki/File:Flag_of_Italy.svg", f: "…" },
```

- `l` : niveau 1 (7-9 ans) à 4 (adultes) · `q` : question · `a` : 3 ou 4 réponses, **la première est la bonne** (mélangées à l'affichage)
- `e` : emoji(s) d'illustration (pas de drapeaux emoji : mal affichés sous Windows) · `f` : anecdote
- photo : `img` (chemin), `cr` (auteur — licence), `src` (page Wikimedia Commons)

Puis vérifier :

```bash
node tools/validate.js
node tools/audit.js
node tools/test-store.js
```
