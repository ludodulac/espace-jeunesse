# Activer l'administration Cloudflare Espace Jeunesse

**Ne jamais réutiliser les ressources de Célébrations** (Worker, R2, D1, secrets, identifiants, domaines). Aucune commande de ce projet ne modifie Célébrations si les noms distincts ci-dessous sont respectés.

## Ressources nouvelles à créer

Préparer un environnement avec Node.js et l'accès au compte Cloudflare :

```bash
cd worker
npx wrangler login
npx wrangler d1 create espace-jeunesse-db
npx wrangler r2 bucket create espace-jeunesse-media
```

Copier l'identifiant de D1 obtenu dans `worker/wrangler.toml`, à la place de `REPLACE_WITH_NEW_D1_DATABASE_ID`.

Créer uniquement les tables du **nouveau** projet :

```bash
npx wrangler d1 execute espace-jeunesse-db --remote --file=schema.sql
```

Créer un **nouveau** mot de passe administrateur et un secret de session différent et aléatoire (minimum 32 caractères).

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Récupérer l'adresse de ce NOUVEAU Worker, normalement `https://espace-jeunesse-api.<compte>.workers.dev`, puis renseigner cette adresse dans `../config.js` (champ `apiBase`) et publier la modification GitHub.

## Accès et sauvegarde

- Site public : `https://ludodulac.github.io/espace-jeunesse/`
- Administration : `https://ludodulac.github.io/espace-jeunesse/admin.html`
- Site public hébergé par GitHub Pages, lectures et écritures par la nouvelle API Worker.
- Worker : mot de passe administrateur dans le secret Cloudflare uniquement; jeton de session de 12 h en mémoire de l'onglet; limite des essais de connexion.
- D1 : pages et références des fichiers; R2 : les octets des médias. Aucune synchronisation avec Célébrations.

Pour sauvegarder : export D1 `npx wrangler d1 export espace-jeunesse-db --remote --output=backup.sql` et copie/sauvegarde séparée du bucket R2. Conserver les sauvegardes hors du dépôt public.

## Vérifier après activation

1. Ouvrir l'administration dans un navigateur, se connecter.
2. Créer une nouvelle page brouillon puis l'enregistrer; elle ne doit pas apparaître publiquement.
3. Publier la page; vérifier le menu public.
4. Importer une image ou un MP3 dans **la nouvelle médiathèque**, l'ajouter à une page puis lire l'élément sur le site.
5. Vérifier l'onglet Inutilisés, les liens de bas de page et le mobile.
6. Confirmer que Célébrations n'a été modifié sur GitHub **ni** Cloudflare.

## Limites connues

- Import R2 découpé en parties de 8 Mio, jusqu'à 200 Mio par fichier. Un transfert interrompu nécessite de recommencer (pas encore de reprise persistante).
- Pas de partage de comptes : un seul administrateur.
- Les fichiers publiquement référencés par une page sont accessibles via leur URL. La médiathèque et son inventaire restent réservés à l'administration.
- Ne pas publier un contenu confidentiel dans une page publique.
- L'administration n'est active qu'après la création manuelle des ressources Cloudflare et le renseignement de `apiBase`; aucune ressource n'a été créée automatiquement.
