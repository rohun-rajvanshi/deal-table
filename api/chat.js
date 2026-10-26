import { db } from '../lib/db.js';

export const access = 'public';
export const methods = ['GET', 'POST', 'OPTIONS'];

// Only players holding a valid room token can read or post.
async function memberOf(code, token) {
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code) || !token) return null;
  const r = await db.query('SELECT players FROM game_rooms WHERE code = $1', [code]);
  if (!r.rows.length) return null;
  const players = Array.isArray(r.rows[0].players) ? r.rows[0].players : [];
  return players.find(p => p.token === token) || null;
}
const shape = m => ({ id: Number(m.id), name: m.name, body: m.body, at: m.created_at });

// The GitHub Pages copy sends JSON as text/plain (no CORS preflight), so accept a string body too.
function parseBody(b) {
  if (typeof b === 'string') { try { return JSON.parse(b) || {}; } catch (e) { return {}; } }
  return b || {};
}
export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  const src = req.method === 'GET' ? (req.query || {}) : parseBody(req.body);
  const code = String(src.code || '').trim().toUpperCase();
  const me = await memberOf(code, String(src.token || ''));
  if (!me) return res.status(403).json({ error: 'Join this room to chat.' });

  if (req.method === 'GET') {
    const after = Number(src.after) || 0;
    const r = await db.query(
      'SELECT id, name, body, created_at FROM room_messages WHERE code = $1 AND id > $2 ORDER BY id DESC LIMIT 60',
      [code, after]
    );
    return res.json({ messages: r.rows.reverse().map(shape) });
  }

  if (req.method === 'POST') {
    const body = String(src.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 240);
    if (!body) return res.status(400).json({ error: 'Type a message first.' });
    const recent = await db.query(
      "SELECT 1 FROM room_messages WHERE code = $1 AND name = $2 AND created_at > now() - interval '350 milliseconds'",
      [code, me.name]
    );
    if (recent.rows.length) return res.status(429).json({ error: 'Slow down a little.' });
    const r = await db.query(
      'INSERT INTO room_messages (code, name, body) VALUES ($1, $2, $3) RETURNING id, name, body, created_at',
      [code, me.name, body]
    );
    return res.status(201).json({ message: shape(r.rows[0]) });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
