# Deploy to GitHub Pages

GitHub Pages hosts the game for free at `https://<your-username>.github.io/<repo>/`, straight from this repository. There's no build step and no workflow to set up.

- `index.html` at the top of the repository forwards visitors to the game in `public/`.
- `public/config.js` notices when the game is running on `*.github.io` and uses the API at `https://monopoly-deal-table.hatchable.site` for online rooms and chat. GitHub Pages can't run a server itself.
- Same-device games work without any server.

## 1. Put the code in your repository

**Option A: GitHub Desktop (recommended on Windows)**

1. In GitHub Desktop: **File → Clone repository → URL**, enter `<your-username>/<repo>` and click **Clone**.
2. **Repository → Show in Explorer**, then copy everything from the unzipped `deal-table` folder into it.
3. Back in GitHub Desktop, type a summary such as `Deal Table`, click **Commit to main**, then **Push origin**.

**Option B: with Git**

```bash
cd deal-table
git init -b main
git add .
git commit -m "Deal Table"
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

The github.com **Upload files** page can't add folders reliably, so use one of the options above.

## 2. Turn on GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Choose branch **main**, folder **/ (root)**, and click **Save**.

After a minute or two, the Pages screen shows your site address, for example `https://rohun-rajvanshi.github.io/deal-table/`.

Free GitHub Pages needs the repository to be **public**.

## Updating the site

Edit files in `public/`, then commit and push to `main`. GitHub Pages republishes automatically within a minute or two.

Browsers cache `app.js` and `table.css`. When you change them, bump the `?v=` number on their tags in `public/index.html` so everyone gets the new version.

## Using a different API server

If you host the API yourself (see [self-hosting.md](self-hosting.md)), edit `public/config.js` and replace the Hatchable address with yours, without a trailing slash:

```js
window.DEAL_TABLE_API = /\.github\.io$/i.test(location.hostname)
  ? "https://my-deal-table.azurewebsites.net"
  : "";
```

Your server must allow cross-site requests. The included `api/` files already send `Access-Control-Allow-Origin: *`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The site shows a 404 | Check **Settings → Pages** is set to **main / (root)**, and that `index.html` is at the top of the repository. Wait a couple of minutes after saving. |
| The game loads but has no styling | Hard-refresh with Ctrl+F5. `public/index.html` must use relative paths (`table.css`, not `/table.css`) because Pages serves the site from `/<repo>/`. |
| "Room service returned an unreadable response" or rooms don't load | The API server is down or unreachable. Open `<api address>/api/rooms?code=AAAAAA` in a browser; a JSON error message means it's up. |
| Online games started on the Hatchable site don't appear on Pages | They do, as long as both use the same API. Rejoin with the room code. |
