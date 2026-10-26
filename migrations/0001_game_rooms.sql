CREATE TABLE IF NOT EXISTS game_rooms (
  code TEXT PRIMARY KEY,
  host_token TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state JSONB,
  revision INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'lobby',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_rooms_updated_at ON game_rooms(updated_at);
