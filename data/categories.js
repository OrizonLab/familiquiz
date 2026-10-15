/* Famili'Quiz — thèmes et registre des questions.
 * Chaque fichier data/questions/<id>.js appelle QUIZ_DATA.add('<id>', [...]).
 * Format d'une question :
 *   l : niveau 1..4  (1 = 7-9 ans, 2 = 10-12 ans, 3 = 13-16 ans, 4 = adultes)
 *   q : texte de la question
 *   a : 3 ou 4 réponses, la PREMIÈRE est la bonne (mélangées à l'affichage)
 *   e : emoji(s) d'illustration
 *   f : anecdote « Le savais-tu ? » affichée après la réponse
 */
window.QUIZ_DATA = window.QUIZ_DATA || { categories: [], questions: {} };

QUIZ_DATA.categories = [
  { id: 'geo',      name: 'Géographie',          icon: '🌍', c1: '#1E88E5', c2: '#26C6DA' },
  { id: 'histoire', name: 'Histoire',            icon: '🏰', c1: '#8D6E63', c2: '#FFB74D' },
  { id: 'sport',    name: 'Sport',               icon: '⚽', c1: '#43A047', c2: '#C0CA33' },
  { id: 'animaux',  name: 'Monde animal',        icon: '🦁', c1: '#FB8C00', c2: '#FDD835' },
  { id: 'ecran',    name: 'Télé & Cinéma',       icon: '🎬', c1: '#E53935', c2: '#FF7043' },
  { id: 'sciences', name: 'Sciences',            icon: '🔬', c1: '#5E35B1', c2: '#42A5F5' },
  { id: 'espace',   name: 'Espace & Univers',    icon: '🚀', c1: '#283593', c2: '#7E57C2' },
  { id: 'musique',  name: 'Musique',             icon: '🎵', c1: '#D81B60', c2: '#AB47BC' },
  { id: 'cuisine',  name: 'Cuisine & Gourmandises', icon: '🍕', c1: '#F4511E', c2: '#FFCA28' },
  { id: 'arts',     name: 'Arts & Littérature',  icon: '🎨', c1: '#00897B', c2: '#9CCC65' },
  { id: 'jeux',     name: 'Jeux vidéo & BD',     icon: '🎮', c1: '#3949AB', c2: '#EC407A' },
  { id: 'nature',   name: 'Nature & Planète',    icon: '🌳', c1: '#2E7D32', c2: '#4DD0E1' }
];

QUIZ_DATA.add = function (catId, list) {
  QUIZ_DATA.questions[catId] = (QUIZ_DATA.questions[catId] || []).concat(list);
};
