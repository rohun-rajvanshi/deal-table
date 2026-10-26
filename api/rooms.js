import { db } from '../lib/db.js';

export const access = 'public';
export const methods = ['GET', 'POST', 'OPTIONS'];

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}
function makeToken() {
  return Array.from({length: 4}, () => Math.random().toString(36).slice(2, 10)).join('');
}
function publicRoom(row) {
  const players = Array.isArray(row.players) ? row.players : [];
  return {
    code: row.code,
    status: row.status,
    revision: row.revision,
    players: players.map(p => ({ id: p.id, name: p.name, isHost: !!p.isHost })),
    gameState: row.game_state || null,
    updatedAt: row.updated_at
  };
}
function cleanName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '').slice(0, 24);
}
// The GitHub Pages copy sends JSON as text/plain (no CORS preflight), so accept a string body too.
function parseBody(b) {
  if (typeof b === 'string') { try { return JSON.parse(b) || {}; } catch (e) { return {}; } }
  return b || {};
}
export default async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method === 'GET') {
    const code = String(req.query.code || '').trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return res.status(400).json({error:'Enter a valid 6-character room code.'});
    const found = await db.query('SELECT code, status, players, game_state, revision, updated_at FROM game_rooms WHERE code = $1', [code]);
    if (!found.rows.length) return res.status(404).json({error:'Room not found. Check the code and try again.'});
    const token = String(req.query.token || '');
    const players = Array.isArray(found.rows[0].players) ? found.rows[0].players : [];
    if (!players.some(p => p.token === token)) return res.status(403).json({error:'Join this room before viewing its game state.'});
    return res.json({room: publicRoom(found.rows[0])});
  }

  const body = parseBody(req.body);
  const action = String(body.action || '');
  if (action === 'create') {
    const name = cleanName(body.name);
    if (!name) return res.status(400).json({error:'Enter your name to create a room.'});
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = makeCode();
      const exists = await db.query('SELECT code FROM game_rooms WHERE code = $1', [code]);
      if (!exists.rows.length) break;
      code = '';
    }
    if (!code) return res.status(503).json({error:'Could not generate a room code. Try again.'});
    const token = makeToken();
    const players = [{id: token.slice(0, 12), token, name, isHost: true, joinedAt: Date.now()}];
    const created = await db.query(
      'INSERT INTO game_rooms (code, host_token, players, status, revision, updated_at) VALUES ($1, $2, $3::jsonb, $4, 0, now()) RETURNING code, status, players, game_state, revision, updated_at',
      [code, token, JSON.stringify(players), 'lobby']
    );
    return res.status(201).json({token, room: publicRoom(created.rows[0])});
  }

  const code = String(body.code || '').trim().toUpperCase();
  const token = String(body.token || '');
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return res.status(400).json({error:'Enter a valid 6-character room code.'});
  const found = await db.query('SELECT code, host_token, status, players, game_state, revision, updated_at FROM game_rooms WHERE code = $1', [code]);
  if (!found.rows.length) return res.status(404).json({error:'Room not found. Check the code and try again.'});
  const row = found.rows[0];
  let players = Array.isArray(row.players) ? row.players : [];

  if (action === 'join') {
    const name = cleanName(body.name);
    if (!name) return res.status(400).json({error:'Enter your name to join.'});
    if (row.status !== 'lobby') return res.status(409).json({error:'This game has already started.'});
    if (players.length >= 5) return res.status(409).json({error:'This room is full (5 players max).'});
    if (players.some(p => String(p.name).toLowerCase() === name.toLowerCase())) return res.status(409).json({error:'That name is already in this room. Choose another.'});
    const playerToken = makeToken();
    players.push({id: playerToken.slice(0, 12), token: playerToken, name, isHost: false, joinedAt: Date.now()});
    const updated = await db.query('UPDATE game_rooms SET players = $2::jsonb, updated_at = now() WHERE code = $1 AND status = $3 RETURNING code, status, players, game_state, revision, updated_at', [code, JSON.stringify(players), 'lobby']);
    if (!updated.rows.length) return res.status(409).json({error:'The room changed while you were joining. Try again.'});
    return res.status(200).json({token: playerToken, room: publicRoom(updated.rows[0])});
  }

  const player = players.find(p => p.token === token);
  if (!player) return res.status(403).json({error:'This room session is not valid. Join the room again.'});

  if (action === 'start') {
    if (row.host_token !== token) return res.status(403).json({error:'Only the room creator can start the game.'});
    if (players.length < 2) return res.status(409).json({error:'Invite at least one more player first.'});
    if (!body.gameState || typeof body.gameState !== 'object') return res.status(400).json({error:'Game state is missing.'});
    const started = await db.query('UPDATE game_rooms SET status = $2, game_state = $3::jsonb, revision = revision + 1, updated_at = now() WHERE code = $1 AND status = $4 RETURNING code, status, players, game_state, revision, updated_at', [code, 'playing', JSON.stringify(body.gameState), 'lobby']);
    if (!started.rows.length) return res.status(409).json({error:'This room has already started.'});
    return res.json({room: publicRoom(started.rows[0])});
  }

  if (action === 'save') {
    if (row.status !== 'playing') return res.status(409).json({error:'The game has not started yet.'});
    if (!body.gameState || typeof body.gameState !== 'object') return res.status(400).json({error:'Game state is missing.'});
    const expected = Number(body.revision);
    const saved = await db.query('UPDATE game_rooms SET game_state = $2::jsonb, revision = revision + 1, updated_at = now() WHERE code = $1 AND revision = $3 AND status = $4 RETURNING code, status, players, game_state, revision, updated_at', [code, JSON.stringify(body.gameState), expected, 'playing']);
    if (!saved.rows.length) {
      const latest = await db.query('SELECT code, status, players, game_state, revision, updated_at FROM game_rooms WHERE code = $1', [code]);
      return res.status(409).json({error:'A newer move arrived from another player.', room: latest.rows[0] ? publicRoom(latest.rows[0]) : null});
    }
    return res.json({room: publicRoom(saved.rows[0])});
  }

  if (action === 'leave') {
    if (row.status === 'lobby' && !player.isHost) {
      players = players.filter(p => p.token !== token);
      const updated = await db.query('UPDATE game_rooms SET players = $2::jsonb, updated_at = now() WHERE code = $1 RETURNING code, status, players, game_state, revision, updated_at', [code, JSON.stringify(players)]);
      return res.json({left: true, room: publicRoom(updated.rows[0])});
    }
    return res.json({left: true});
  }

  return res.status(400).json({error:'Unknown room action.'});
}
