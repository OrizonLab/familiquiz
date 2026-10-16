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
- Le jeu ne contacte **aucun service extérieur** : pas de statistiques de visite, pas de publicité, et même la police d'écriture est hébergée avec le jeu. Seul l'hébergeur (GitHub) voit qu'un appareil télécharge le jeu, comme pour n'importe quel site.
- **Sur un même appareil, chaque navigateur a ses propres profils.** Sur iPad, l'icône de l'écran d'accueil et Safari sont séparés : jouez toujours depuis l'icône.
- **Effacer les données du navigateur efface les profils** : faites un export de temps en temps pour garder une sauvegarde.
- Ce qui est public : le code du jeu et les questions (dépôt GitHub). Rien de personnel.

**Faut-il un compte ?** Pas pour protéger les profils, puisqu'ils ne quittent jamais l'appareil. Un compte ne servirait qu'à **synchroniser** les profils entre plusieurs appareils, ce qui demanderait un serveur, une base de données et une authentification : beaucoup plus de risques à sécuriser pour un gain faible.

Pour **réserver l'accès au jeu lui-même** à la famille, la solution sûre est de ne pas programmer de mot de passe soi-même (un mot de passe dans une page web sans serveur se contourne facilement), mais de placer le site derrière un service d'accès professionnel, par exemple **Cloudflare Pages + Cloudflare Access** (gratuit jusqu'à 50 personnes) : seules les adresses e-mail autorisées reçoivent un code de connexion à usage unique.

## 📺 Jouer sur la télévision

Le jeu est une page web : il faut un appareil qui a un **navigateur web**, ou qui **recopie l'écran** d'un autre appareil sur la TV.

| Équipement | Possible ? | Comment |
|---|---|---|
| **Apple TV** | ✅ par recopie d'écran | L'Apple TV n'a **pas de navigateur web** : on ne peut pas y installer le jeu. Mais on peut jouer sur l'**iPad** (ou l'iPhone) et l'afficher sur la TV : *Centre de contrôle → Recopie de l'écran → Apple TV*. Le son passe aussi par la TV. **C'est la meilleure solution** : l'iPad sert de manette, toute la famille voit la TV. |
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

Après chaque réponse, la sélection se place sur « Question suivante » : un simple **OK** enchaîne. Les touches Retour des TV Samsung (Tizen), LG (webOS), Android TV et Fire TV sont reconnues. Sur certaines TV, la télécommande pilote une flèche-pointeur au lieu des flèches : on clique alors directement sur les boutons.

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
2. **Qui joue ?** On choisit les profils existants (ou on en crée un : prénom, âge, avatar, couleur).
3. **Mode de jeu** (à partir de 2 joueurs) : **chacun pour soi** ou **en équipes**.
4. **Thèmes** : nombre de thèmes + tirage au sort animé (ou choix manuel), et **5, 8 ou 10 questions** par thème et par joueur.
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

- L'âge est enregistré sous forme d'année de naissance : le niveau **évolue tout seul** quand l'enfant grandit.
- **Difficulté adaptative** (par thème) : un joueur qui réussit très bien reçoit quelques questions du niveau au-dessus (bonus 💪 *Défi* +25 pts), un joueur en difficulté quelques questions plus faciles. Objectif : ~70 % de réussite pour chacun.
- **Temps bonus** pour les plus jeunes (+5 s pour les 7-9 ans, +3 s pour les 10-12 ans).
- **Lecture à voix haute** des questions pour les 7-9 ans (réglable : personne / 7-9 ans / tout le monde), avec une **voix naturelle enregistrée** (voir plus bas).

## ⭐ Points

- Bonne réponse : **100**
- ⚡ Rapidité : jusqu'à **+50** (proportionnel au temps restant, donc équitable avec le temps bonus)
- 🔥 Série : **+10** par bonne réponse consécutive (max +50)
- 💪 Question défi : **+25** par niveau au-dessus de son âge
- Mauvaise réponse / temps écoulé : 0 (rien n'est retiré)

## 🏅 Badges et rangs

- Chaque partie rapporte de l'**expérience** (points ÷ 20 + 10, +20 en cas de victoire). 9 rangs : 🐣 Apprenti → 🔎 Curieux → 💡 Malin → 🦊 Futé → 📚 Savant → 🎓 Érudit → 🧠 Génie → 👑 Grand Maître → 🌟 Légende.
- **42 badges** à collectionner : participation, victoires (solo et en équipe), séries, sans-faute, réflexes, joker, questions défi, questions photo, un badge « expert » par thème, et quelques badges amusants (Couche-tard, Lève-tôt, Grande tablée…).
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
- Sur iPad, des voix d'appareil plus naturelles se téléchargent dans *Réglages iOS → Accessibilité → Contenu énoncé → Voix → Français* (« Premium » ou « Améliorée »).

**Regénérer les enregistrements** (après ajout ou modification de questions), sur le PC :

```bash
node tools/make-voice.js
```

Pour enregistrer aussi d'autres niveaux : `node tools/make-voice.js 1 2` (environ 20 Mo de plus par niveau). Le script ne génère que ce qui manque, supprime les enregistrements devenus inutiles et met à jour `data/voice.js`. Il a besoin, dans le dossier local `.voice/` (non publié), de Piper pour Windows, du modèle `fr_FR-siwis-medium` et de l'encodeur MP3 `lamejs` : voir l'en-tête de `tools/make-voice.js`.

## 🎵 Sons

Musique et bruitages **générés en direct** (Web Audio API, aucun fichier audio) : piano électrique, marimba, clochettes, nappes de cordes, basse ronde et percussions légères, avec réverbération. Musique douce à l’accueil, plus rythmée pendant la partie (et atténuée pendant les questions). On peut les écouter dans *Réglages*. Boutons 🎵 / 🔊 en haut à droite. Sur iPhone/iPad, le son fonctionne même en mode silencieux (iOS 16.4+).

## 🗂️ Structure

```
index.html              page du jeu
manifest.webmanifest    description de l'application installable
sw.js                   service worker (mode hors ligne) — généré par tools/build-sw.js
icons/                  icônes de l'application
fonts/                  police Fredoka (licence SIL OFL, fonts/OFL.txt), hébergée avec le jeu
css/style.css           styles
js/store.js             stockage local (joueurs, stats, historique, questions vues)
js/engine.js            niveaux d'âge, difficulté adaptative, tirage, score
js/badges.js            badges et rangs d'expérience
js/audio.js             musique, bruitages, lecture vocale
js/app.js               écrans et déroulement
data/categories.js      liste des thèmes (nom, icône, couleurs)
data/questions/*.js     questions texte (200 par thème)
data/photos/*.js        questions photo
img/<thème>/            images des questions photo
tools/validate.js       vérification des banques de questions
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
```
