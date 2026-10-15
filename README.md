# 🧠 Famili'Quiz

Le grand quiz de la famille : de 1 à 6 joueurs, de 7 ans à adulte, chacun reçoit des questions **adaptées à son âge** pour que tout le monde puisse gagner. En solo, chacun pour soi ou **Parents contre Enfants**.

## ▶️ Lancer le jeu

**Sur l'ordinateur :** double-cliquer sur `index.html` (Chrome, Edge ou Firefox).

**Sur une tablette, un téléphone ou la TV** (même Wi-Fi), depuis l'ordinateur :

```bash
node tools/serve.js
```

Puis ouvrir l'adresse « Sur le réseau » affichée (ex. `http://192.168.1.20:8080`) sur l'appareil.

> Les joueurs, statistiques, badges et l'historique sont enregistrés **dans le navigateur** de l'appareil utilisé.
> Pour les transférer : *Réglages → Exporter*, puis *Importer* sur l'autre appareil.

## 📱 Installer sur iPad / iPhone

Famili'Quiz est une **application web installable** : icône sur l'écran d'accueil, plein écran, et **fonctionne hors ligne** une fois installée.

Pour ça, le jeu doit être en ligne en **HTTPS** (exigence d'Apple pour le hors-ligne). Deux possibilités gratuites :

- **GitHub Pages** : déposer le dossier dans un dépôt GitHub et activer *Settings → Pages*.
- **Netlify / Cloudflare Pages** : glisser-déposer le dossier sur leur site.

Ensuite, sur l'iPad : ouvrir l'adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil**.

> Avec `node tools/serve.js` (adresse en `http://`), l'ajout à l'écran d'accueil marche aussi, mais seulement quand l'ordinateur est allumé et sans mode hors ligne.

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
- **Lecture à voix haute** des questions pour les 7-9 ans (réglable : personne / 7-9 ans / tout le monde).

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

## 🎵 Sons

Musique et bruitages **générés en direct** (Web Audio API, aucun fichier audio). Boutons 🎵 / 🔊 en haut à droite. Sur iPhone/iPad, le son fonctionne même en mode silencieux (iOS 16.4+).

## 🗂️ Structure

```
index.html              page du jeu
manifest.webmanifest    description de l'application installable
sw.js                   service worker (mode hors ligne) — généré par tools/build-sw.js
icons/                  icônes de l'application
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
