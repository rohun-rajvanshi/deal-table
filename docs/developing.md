# Developing

## Run it

```bash
docker compose up            # http://localhost:8080, with its own database
```

Or with Node and your own PostgreSQL:

```bash
npm install
cp .env.example .env         # set DATABASE_URL; PGSSL=disable for a local database
npm start                    # http://localhost:3000
```

To work on same-device play only, you don't need the server. Open `public/` with any static file server, for example `npx serve public` or `python -m http.server -d public`.

## Testing an online room by yourself

Open the site in a normal window and in an **Incognito/Private** window, or a second browser. Each window keeps its own room session. Create a room in one, join with the code in the other, and play both seats side by side.

Two normal tabs share saved room details. Refreshing one can make it take over the other player.

## Where things are in `public/app.js`

| Section | What it does |
| --- | --- |
| `COLORS`, `ACTIONS`, `buildDeck()` | Card data and the 106-card deck |
| Property helpers (`stacksFor`, `rentFor`, `payable`, `normalize`) | Sets, rent, what can pay a debt, moving orphaned buildings to the bank |
| Playing cards (`playProperty`, `bankCard`, `recolorWild`, …) | Moves that only affect the current player |
| Action resolution (`launchAction`, `advance`, `respondNo`, …) | Pending actions, Just Say No chains, payments, steals |
| `highlightInfo()` | Which cards, sets and players glow for the current targeting mode |
| Rendering (`render`, `seatHTML`, `stackHTML`, `renderPrompt`, …) | Builds the table and the action bar from state |
| Interaction (`onTableCard`, `onStack`, `onButton`, …) | Clicks, taps and confirm buttons |
| Online rooms | Room calls, polling, saving, rejoin |
| Room chat | Chat polling, sending, unread badge |

`render()` redraws the table from the state after every change, so state is the single source of truth.

## Making a change

1. Edit the files in `public/`. If you change `app.js` or `table.css`, bump `?v=` in `index.html`.
2. Test a same-device game and an online room (see above).
3. If you change the shape of the saved game state, raise `STATE_VERSION` in `app.js`. Rooms saved by older versions are then refused instead of breaking.
4. Database changes go in a new numbered file in `migrations/`. Files run once each, in name order. Don't edit old ones.
5. Commit to `main`. GitHub Pages republishes automatically.

The same `api/` files also run on Hatchable, where the only difference is `import { db } from 'hatchable'` instead of `'../lib/db.js'`.
