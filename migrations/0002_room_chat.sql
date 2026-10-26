CREATE TABLE IF NOT EXISTS room_messages (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL REFERENCES game_rooms(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_messages_code_id ON room_messages(code, id);
