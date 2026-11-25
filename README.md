# Turath — تراث

Carnet personnel de l'étudiant : mémorisation du Coran, hadiths, vidéos de savants classées par thème, bibliothèque avec résumés, et maisons d'édition avec leurs preuves.

Le design s'inspire des manuscrits arabes classiques : encre noire sur papier, titres à l'encre rouge, filets fins.

Application web **responsive** (téléphone, tablette, ordinateur), **installable** sur l'écran d'accueil et utilisable **hors ligne**. Aucun serveur ni compte : tout est en HTML, CSS et JavaScript.

## Fonctionnalités

- **Coran** : les 114 sourates avec un statut (non commencée, en cours, mémorisée), le dernier verset mémorisé, des notes, et la date de dernière révision. Les sourates sont signalées « à réviser » après X jours (réglable). Tu peux aussi enregistrer ton point d'arrêt, filtrer, chercher, et afficher dans l'ordre 114 → 1 (en commençant par Juz ʿAmma).
- **Hadiths** : le texte arabe, la traduction du sens, le rapporteur, la source (recueil et numéro), l'authenticité (ṣaḥīḥ, ḥasan, ḍaʿīf, mawḍūʿ, à vérifier) et qui l'a authentifié, avec un thème et une explication. Tu peux aussi suivre ceux que tu as appris et ceux qu'il faut réviser.
- **Savants** : un profil par savant avec ses vidéos **YouTube** (vidéos et Shorts) et **Instagram** (reels et posts), lisibles directement dans l'appli et classées par thème. Une vue « Par thème » regroupe les vidéos de tous les savants.
- **Bibliothèque → Livres** : livres lus, en cours ou à lire, avec résumé, bénéfices (fawāʾid), maison d'édition et la personne qui te l'a recommandé.
- **Bibliothèque → Maisons d'édition** : fiable, avec prudence ou à éviter, avec une explication et la liste des preuves et sources. Le badge de l'édition s'affiche automatiquement sur tes livres.
- **Accueil** : les dates grégorienne et hégirienne, ton point d'arrêt, la carte du Coran (114 cases qui se remplissent au fil de ta mémorisation), ce qu'il faut réviser (sourates et hadiths), ta série de jours d'affilée et tes lectures en cours.
- **Sauvegarde** : export et import en fichier `.json`, thème clair ou sombre.

## Mettre en ligne avec GitHub Pages (gratuit)

1. Crée un compte sur [github.com](https://github.com), puis un nouveau dépôt (**New repository**), par exemple `turath`.
2. Dans le dépôt, clique sur **Add file → Upload files** et dépose **tout le contenu** du dossier : `index.html`, `manifest.webmanifest`, `sw.js`, et les dossiers `css/`, `js/` et `icons/`. Valide avec **Commit changes**.
3. Va dans **Settings → Pages**. Sous *Build and deployment*, choisis **Deploy from a branch**, la branche **main** et le dossier **/ (root)**, puis **Save**.
4. Après une ou deux minutes, ton appli est en ligne à l'adresse `https://ton-pseudo.github.io/turath/`.

**L'installer sur ton téléphone :**
- Sur iPhone, ouvre le lien dans Safari, puis **Partager → Sur l'écran d'accueil**.
- Sur Android, ouvre le lien dans Chrome, puis **⋮ → Installer l'application**.

## Où sont mes données ?

Tes données sont enregistrées **uniquement dans le navigateur de ton appareil** (`localStorage`). Elles ne sont pas sur GitHub et personne d'autre ne les voit, même si le dépôt est public.

Ça veut aussi dire que :
- si tu vides les données du navigateur, elles sont perdues. **Exporte régulièrement** une sauvegarde depuis Réglages ;
- pour passer d'un appareil à un autre, exporte le fichier sur le premier et importe-le sur le second.

## Modifier l'appli

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page et menu |
| `css/style.css` | Apparence : couleurs (variables en haut du fichier), mise en page responsive |
| `js/app.js` | Toute la logique : écrans, formulaires, sauvegarde |
| `js/quran-data.js` | Noms des 114 sourates et nombre de versets |
| `sw.js` | Fonctionnement hors ligne |

Après une mise à jour, change `turath-v1` en `turath-v2` dans `sw.js` pour que les téléphones récupèrent bien la nouvelle version.

## Idées pour la suite

- Révision espacée intelligente : intervalles qui s'allongent quand une sourate est bien maîtrisée, et raccourcissent après des erreurs
- Suivi par juzʾ et par ḥizb, et programme de khatma (lecture complète) avec objectif quotidien
- Texte du Coran et récitation audio intégrés, avec un mode « cache-verset » pour s'auto-tester
- Recherche dans toutes les notes, résumés et vidéos
- Liste de lecture « à étudier » par savant, avec un ordre d'étude recommandé (mutūn)
- Synchronisation entre appareils et partage public, au moment où tu voudras ouvrir l'appli à d'autres
