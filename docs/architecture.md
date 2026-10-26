# Architecture

## Overview

```
┌──────────────── browser ────────────────┐        ┌──────── server ────────┐
│ public/index.html  layout               │  JSON  │ api/rooms.js           │
│ public/table.css   felt-table design    │ ─────► │ api/chat.js            │
│ public/app.js      rules engine + UI    │ ◄───── │   └─ PostgreSQL        │
│ public/config.js   API address          │ polling│      game_rooms        │
└─────────────────────────────────────────┘        │      room_messages     │
                                                    └────────────────────────┘
```

- **All game rules run in the browser** (`app.js`). The server stores and shares state; it doesn't judge moves.
- There's **no build step**. The files in `public/` are served as they are.
- The API runs on Hatchable (the `hatchable` SDK provides `db`) or on `server.js`, where `lib/db.js` provides the same `db.query` over `pg`.

## Game state

One JSON object describes the whole game:

```js
{
  v: 3,                       // state version; rooms from older versions are refused
  id, turnNo, current,        // whose turn (index into players)
  plays,                      // plays left this turn (3 at the start)
  deck: [card], discard: [card],
  players: [{ id, name, color, hand: [card], bank: [card], props: [card],
              builds: { red: { house: card, hotel: card } } }],
  pending: null | {...},      // an action waiting for responses (see below)
  winner: null | playerId,
  log: [{ t, text }]          // newest first, last 40
}
```

A **card** looks like `{ id, type, value, ... }`, where `type` is `money`, `property` (`color`), `wild` (`colors`, `color`, `any`), `rent` (`colors`, `any`) or `action` (`effect`).

**Sets** aren't stored. `stacksFor(player, color)` splits a player's cards of one colour into stacks of the set size. A full stack is a complete set, and the leftover cards form an incomplete set that can be stolen.

## Actions and Just Say No

Actions that affect other players create `game.pending`:

```js
{ kind: 'sly' | 'forced' | 'breaker' | 'rent' | 'debt' | 'birthday',
  from, targets: [playerId], ti,      // ti = index of the target being resolved
  stage: 'respond' | 'counter' | 'pay',
  chain,                              // Just Say Nos played in this exchange
  amount, color, takeId, giveId, stackColor, doubles }
```

`advance()` walks through the targets:

- **respond:** the target decides. With no Just Say No in hand they accept automatically.
- **counter:** after a Just Say No, the attacker decides whether to counter. With none they give up automatically.
- **pay:** the payer picks cards. If everything they own is worth no more than the debt, it's taken automatically.

Whoever must decide is the **responder**. Only that player can act until `pending` clears, then play returns to the current player.

## Who sees what

- **Same device:** the viewer is whoever must act. When that changes, a curtain hides the hands until the right player taps to reveal.
- **Online:** each browser is one player, matched by name in the room. Other players' hands are shown only as card counts.

## Online sync

The API is deliberately small:

| Call | Purpose |
| --- | --- |
| `POST /api/rooms {action:'create', name}` | New room. Returns a 6-letter `code` and a private `token`. |
| `POST /api/rooms {action:'join', code, name}` | Join a lobby (up to 5 players) |
| `POST /api/rooms {action:'start', code, token, gameState}` | Host starts the game |
| `POST /api/rooms {action:'save', code, token, revision, gameState}` | Save the new state if `revision` still matches |
| `GET /api/rooms?code&token` | Current room and state |
| `POST /api/rooms {action:'leave', code, token}` | Leave |
| `GET /api/chat?code&token&after=id` | Chat messages after `id` |
| `POST /api/chat {code, token, text}` | Send a message (max 240 characters) |

- Clients **poll** the room every 1.2 seconds and chat every 1.5 seconds.
- After each move the acting player **saves** the whole state. The save only succeeds if nobody else saved first; on a conflict the client loads the newer state.
- Only players holding the room `token` can read the state or chat.
- POST bodies are sent as `text/plain` JSON so browsers don't need a CORS preflight when the site and API are on different domains. The API sends `Access-Control-Allow-Origin: *`.

## Database

`migrations/0001_game_rooms.sql` creates `game_rooms (code, host_token, players jsonb, game_state jsonb, revision, status, timestamps)`.

`migrations/0002_room_chat.sql` creates `room_messages (id, code → game_rooms, name, body, created_at)`. Messages are deleted when their room is.

## Limits and trade-offs

- The browser is trusted to play by the rules, which suits friendly games. A determined player could edit their own game state.
- Polling keeps the server simple. Moves appear on other screens within about 1–2 seconds.
- Old rooms are never cleaned up automatically. A periodic `DELETE FROM game_rooms WHERE updated_at < now() - interval '7 days'` keeps the database small.
