# Espace Jeunesse

Site indépendant de **Célébrations**, avec une seule structure : des **pages**.

- Accueil personnalisable, pages publiques, brouillons et pages masquées.
- Menu principal et liens de bas de page librement configurables.
- Editeur mobile : textes, titres, images, lecteurs audio, vidéos, PDF, liens et colonnes.
- Médiathèque **uniquement dans l'administration**, avec onglet « Inutilisés ».
- Données et médias isolés dans de **nouvelles** ressources Cloudflare D1, R2 et Worker.
- GitHub Pages pour le site public `https://ludodulac.github.io/espace-jeunesse/`.

## Etat

La partie publique possède un jeu de données de départ lisible sur GitHub Pages. L'administration peut fonctionner en **aperçu local uniquement** tant que le Worker Cloudflare indépendant n'est pas configuré. Les enregistrements locaux ne sont PAS publiés ni partagés entre appareils.

**NE JAMAIS** connecter ce projet aux ressources, buckets, bases ou secrets de Célébrations. Aucun identifiant ni média du site d'origine n'est présent ici.

## Mise en ligne

1. GitHub : Settings → Pages → Build and deployment → GitHub Actions. Le workflow `.github/workflows/pages.yml` publie les fichiers du dépôt.
2. Cloudflare : créer un **nouveau** bucket R2 `espace-jeunesse-media` et une **nouvelle** base D1 `espace-jeunesse-db`.
3. Exécuter `worker/schema.sql` dans cette nouvelle D1. Dans `worker/wrangler.toml`, remplacer `REPLACE_WITH_NEW_D1_DATABASE_ID` par l'ID de cette D1.
4. Depuis `worker/`, installer Wrangler et créer deux secrets **nouveaux** :
   `npx wrangler secret put ADMIN_PASSWORD` puis `npx wrangler secret put SESSION_SECRET` (secret aléatoire fort).
5. Déployer le Worker neuf avec `npx wrangler deploy`. Ne pas réutiliser un Worker existant.
6. Dans `config.js`, renseigner son URL HTTPS `apiBase`, puis publier ce fichier sur GitHub Pages. L'administration à `admin.html` proposera l'authentification et les publications serveur.

**Important** : sans les étapes 2–6, seule la démonstration locale de l'éditeur est disponible. Le dépôt n'effectue aucun provisionnement Cloudflare automatique ni migration de contenu.

## Modèle de publication

L'éditeur conserve un brouillon et un statut par page : `published`, `draft`, `hidden`. Seules les pages publiées sont exposées par l'API publique. Le menu et le pied de page sont calculés à partir de ces pages, sans médiathèque visiteur.

## Référence esthétique

Interface inspirée des principes de l'éditeur Célébrations : fond crème, navigation bleu ardoise, panneaux clairs et boutons terracotta. C'est un projet **séparé** avec une architecture simplifiée, pas une copie du système Célébrations complet.
