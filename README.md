# Espace Jeunesse

Site indépendant de **Célébrations**, avec une seule structure : des **pages**.

- Accueil personnalisable, pages publiques, brouillons et pages masquées.
- Menu principal et liens de bas de page librement configurables.
- Editeur mobile : textes, titres, images, lecteurs audio, vidéos, PDF, liens et colonnes.
- Médiathèque **uniquement dans l'administration**, avec liens publics directs, références de pages colorées et sélection d'audios pour Ludodio.
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

## Fidélité à Célébrations (révision visuelle)

Les feuilles CSS des pages publiques et de l'administration proviennent **directement des modules canoniques** de `ludodulac/Celebrations`, sans reproduire les couleurs à l'approximation. Les gabarits utilisent les mêmes structures : `site-menu-bar`, `general-navigation`, `site-paper`, `footer-pages`, `shell stage-editor`, `rail`, `canvas-wrap`, `canvas`, `block`, `tools` et `ed`. Le champ visuel permet de modifier directement les textes, de déplacer, dupliquer et supprimer des blocs, et d'insérer entre les blocs.

Le **moteur métier** reste volontairement limité aux pages : aucune célébration, compte de membre, catégorie ou outil de traduction n'est repris. Le catalogue de la médiathèque reste réservé à l’administration, mais chaque fichier possède une URL publique directe, même hors des pages et après leur suppression. Un fichier non référencé affiche « N’apparaît nulle part ». Les pages liées sont indiquées en vert (publiée), orange (brouillon) ou gris (masquée). Les MP3 proposés à Ludodio sont liés sans nouvelle copie R2 et sans mélanger les sons privés du Studio.

Aucune donnée, ressource Cloudflare ou identifiant de Célébrations n'est copié. La sauvegarde commune via Cloudflare reste à activer séparément.


## Médiathèque et Ludodio — novembre 2026

- L’inventaire D1/R2 est indépendant des pages. Les fichiers restent listés après masquage, passage en brouillon ou suppression d’une page.
- Chaque image, PDF ou audio possède un lien direct `https://espace-jeunesse-api.rondes.workers.dev/media/<uuid>` ouvrable sans connexion : **ne pas y placer de données confidentielles**.
- Les badges de page mènent au site pour les pages publiées et à l’administration pour les brouillons/pages masquées.
- « Proposer à Ludodio » place uniquement l’ID dans `ludodio_links`; l’administration Ludodio peut alors choisir ce fichier pour un conte sans le dupliquer. Les sons/effets/projets du Studio restent entièrement indépendants.
- « Supprimer » demande une confirmation simple, enlève les références dans les pages et les sélections Ludodio, puis supprime le fichier du R2. Une histoire Ludodio liée à ce fichier devra alors être réassociée.
- Les anciennes données et les ressources Célébrations ne sont ni migrées ni modifiées.

## Boutique — vitrine affiliée indépendante (novembre 2026)

- Adresse publique : `boutique.html`, accessible depuis le menu de l'Espace Jeunesse.
- Dans l'administration existante : `admin.html?shop=1`, entrée « Boutique » dans le menu de gauche.
- Trois listes éditables : produits, collections, artisans ; chaque produit a une fiche automatique distincte des pages ordinaires.
- Visibilité `published` / `draft` / `hidden` ; les produits cachés et leurs catégories masquées ne sortent jamais de l'API publique.
- Aucun panier, aucun paiement, aucune vente enregistrée sur l'Espace Jeunesse.
- Le lien produit peut être une URL d'affiliation ; cocher « Lien d'affiliation » seulement après convention. Les visiteurs en sont informés sur la fiche.
- Les fiches fournisseurs ne prétendent pas qu'un partenariat existe sans preuve ; le champ « Partenariat conclu » est explicite.
- L'adresse e-mail des artisans est stockée dans D1, mais jamais renvoyée par `GET /api/shop`.
- Les images peuvent être choisies dans la médiathèque existante ; si des photos de vendeurs tiers sont utilisées, vérifier leurs droits de reproduction.
- Catalogue stocké dans une table D1 `shop_state` isolée des pages ; mises à jour avec version pour éviter l'écrasement concurrent.
- API publique : `GET /api/shop`. API administrateur : `GET/PUT /api/admin/shop` avec le même jeton que les pages.
- La première collection reprend 21 liens de peluches ; ce sont des sélections éditoriales, pas des partenariats rémunérés acquis.
- La page historique « Boutique peluches » reste accessible directement, mais son lien automatique est retiré du menu pour éviter deux boutiques.

## Présentation neutre de la boutique aux créateurs (14 novembre 2026)

- La vitrine et les fiches produits ne contiennent plus de lien vers Biblaw, de références aux psaumes, ni d'explications religieuses ou symboliques.
- La collection initiale s'intitule « Peluches artisanales ». Son identifiant interne est inchangé pour préserver les liens entre produits et collections ; son URL publique porte désormais `peluches-artisanales`.
- Les anciennes pages de présentation « Peluches totem » et « Boutique peluches » sont archivées côté visiteur, sans suppression de leurs contenus enregistrés dans l'administration.
- Le catalogue D1 est nettoyé de ses champs `symbolism` et `biblawRef` par une migration ciblée, avec contrôle de version : les noms, images, liens et fiches créateurs restent intacts.

## Pages réservées à l'administrateur (14 novembre 2026)

Dans l'administration existante, le menu « Visibilité » d'une page propose
désormais quatre choix : **Publiée**, **Brouillon**, **Masquée** et
**Privée — moi seul** (pastille violette).

- Une page **Publiée** est consultable par tous. **Brouillon** et **Masquée**
  ne sont pas visibles sur le site visiteur.
- Une page **Privée — moi seul** est consultable dans le site visiteur uniquement
  après une authentification administrateur validée par le Worker
  `espace-jeunesse-api`. Elle figure alors dans le menu ou en bas de page
  selon son emplacement, avec un cadenas. Sans cette session, ni son titre
  ni son contenu ne sont renvoyés dans `GET /api/site`.
- `GET /api/admin/visitor-site` renvoie seulement les pages publiques et
  privées (pas les brouillons), uniquement après validation du jeton
  administrateur. Cela évite de se fier à un simple masquage HTML.
- La connexion dans l'administration est réutilisée dans les autres onglets
  **du même navigateur et du même profil**. Le jeton reste en stockage local
  jusqu'à sa déconnexion ou à son expiration (12 heures au maximum).
  Sur un autre navigateur ou appareil, il faut se connecter séparément.
- Le nouveau bouton « Se déconnecter » efface le jeton dans ce navigateur.
  Une page déjà ouverte doit être rechargée pour refléter une déconnexion.
- La fonctionnalité nécessite **aussi le déploiement de la nouvelle version
  de `worker/src/index.js`** : publier les fichiers statiques seuls ne suffit pas.
  Aucun changement de base D1 n'est nécessaire.

**Attention aux fichiers joints :** la médiathèque conserve la règle décidée
auparavant : chaque URL `/media/<uuid>` reste accessible publiquement à
quiconque la connaît. La protection concerne le texte et l'accès à la page,
mais ne rend pas ses images, PDF ou MP3 confidentiels. Pour des documents
sensibles, il faudra une autorisation sur l'accès aux médias également.

Les pages de contenu codées en dur dans les fichiers JavaScript publics de
GitHub Pages restent publiquement inspectables. La confidentialité ne couvre
que les pages dont le contenu est enregistré dans D1 et servi par le Worker.
