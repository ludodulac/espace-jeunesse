# Activer l'éditeur complet depuis un téléphone

Le site public est publié sur **GitHub Pages**. Pour que la sauvegarde des pages et les imports d'images, MP3 et PDF fonctionnent sur tous les appareils, il faut créer **de nouvelles** ressources Cloudflare. Cette action automatique travaille uniquement dans ce dépôt **Espace Jeunesse**.

## Une seule fois

1. Dans Cloudflare, crée un nouveau **API Token** limité à ton compte, avec les permissions nécessaires pour Workers Scripts (Edit), D1 (Edit), R2 (Edit) et Workers subdomain (Read). Garde la valeur privée.
2. Dans ce dépôt GitHub, ouvre **Settings → Secrets and variables → Actions**, puis ajoute trois **Repository secrets** :
   - `EJ_CLOUDFLARE_API_TOKEN` : ton nouveau jeton Cloudflare.
   - `EJ_CLOUDFLARE_ACCOUNT_ID` : l'identifiant de 32 caractères de ton compte Cloudflare.
   - `EJ_ADMIN_PASSWORD` : le mot de passe **nouveau**, d'au moins 12 caractères, pour entrer dans l'administration d'Espace Jeunesse.
3. Ouvre **Actions → Activer Cloudflare indépendant — Espace Jeunesse → Run workflow**.

La tâche crée ou retrouve **uniquement** les ressources portant ces trois noms :
- `espace-jeunesse-db` (base D1),
- `espace-jeunesse-media` (bucket R2),
- `espace-jeunesse-api` (Worker).

Elle charge les tables, déploie l'API, définit les secrets de manière privée, vérifie l'API, puis ajoute automatiquement son adresse dans `config.js`. Le site GitHub Pages est alors republié.

**Ne jamais fournir le mot de passe ou le jeton dans un chat ou un fichier du dépôt public.** Les secrets sont à saisir exclusivement dans les paramètres GitHub de **ce nouveau dépôt**.

**Important :** certaines options Cloudflare (activation du sous-domaine workers.dev, activation R2 et permissions du jeton) peuvent nécessiter une action sur ton compte. Si la tâche échoue, lire son message d'erreur dans les journaux GitHub Actions.

## Vérifier

Ouvre `https://ludodulac.github.io/espace-jeunesse/admin.html`, saisis ton nouveau mot de passe, crée une page, enregistre-la et ouvre le site public dans un autre appareil.

Le stockage et les modifications de Célébrations ne sont ni consultés, ni modifiés, ni transférés. L'utilisation du compte Cloudflare existant est possible, mais **jamais ses anciennes ressources**.
