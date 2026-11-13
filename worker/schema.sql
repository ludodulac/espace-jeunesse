-- A exécuter UNIQUEMENT sur la nouvelle D1 espace-jeunesse-db.
-- Ne jamais lancer sur une base Célébrations.
CREATE TABLE IF NOT EXISTS site_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  version INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media_uploads (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_limits (
  identifier TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  bucket INTEGER NOT NULL
);

-- Sélections explicites d'audios Espace Jeunesse à proposer dans Ludodio.
-- Aucune copie audio : les URL publiques pointent toujours vers le même objet R2.
CREATE TABLE IF NOT EXISTS ludodio_links (
  media_id TEXT PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
