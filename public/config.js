// Where the online rooms & chat API lives.
// - On GitHub Pages (*.github.io) the game uses the Hatchable server.
// - Anywhere else (Hatchable itself, or the Node server in this repo) it uses the same site ("").
// To use your own server from GitHub Pages, replace the address below.
window.DEAL_TABLE_API = /\.github\.io$/i.test(location.hostname)
  ? "https://monopoly-deal-table.hatchable.site"
  : "";
