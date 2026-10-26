# Self-hosting (Azure, Docker, any Node host)

`server.js` runs the whole app on your own server: the site in `public/` plus the online rooms and chat API. It needs **Node.js 18+** and **PostgreSQL 13+**. The database tables are created automatically on first start from `migrations/`.

## Settings

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | For online play | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/dealtable` |
| `PORT` | No | Port to listen on (default 3000; most hosts set it for you) |
| `PGSSL` | No | `disable` to turn off TLS to the database (local databases only) |
| `PGPOOL_MAX` | No | Maximum database connections (default 10) |

Put them in a `.env` file (copy `.env.example`) or set them in your host's settings.

If `DATABASE_URL` is missing or wrong, the site still loads and same-device games work. Online rooms and chat show an error.

## Run locally

**Docker** (starts its own PostgreSQL):

```bash
docker compose up
# open http://localhost:8080
```

**Node** with your own PostgreSQL:

```bash
npm install
cp .env.example .env    # set DATABASE_URL (and PGSSL=disable for a local database)
npm start               # http://localhost:3000
```

## Azure

The simplest setup is **Azure App Service (Linux, Node 20)** plus **Azure Database for PostgreSQL – Flexible Server**. Run these from the project folder with the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), replacing `<...>`:

```bash
az login
az group create --name deal-table-rg --location centralindia

# Database (smallest tier)
az postgres flexible-server create \
  --resource-group deal-table-rg --name <your-db-name> \
  --admin-user dealadmin --admin-password '<a-strong-password>' \
  --tier Burstable --sku-name Standard_B1ms --version 16 \
  --public-access 0.0.0.0
az postgres flexible-server db create \
  --resource-group deal-table-rg --server-name <your-db-name> --database-name dealtable

# Web app: zips this folder, installs packages and deploys
az webapp up --resource-group deal-table-rg --name <your-app-name> \
  --runtime "NODE:20-lts" --sku B1

# Point the app at the database
az webapp config appsettings set --resource-group deal-table-rg --name <your-app-name> \
  --settings DATABASE_URL='postgres://dealadmin:<a-strong-password>@<your-db-name>.postgres.database.azure.com:5432/dealtable'
```

The site will be at `https://<your-app-name>.azurewebsites.net`.

- `--public-access 0.0.0.0` lets Azure services, including your web app, reach the database.
- URL-encode special characters in the password inside `DATABASE_URL`: `@` → `%40`, `#` → `%23`, `/` → `%2F`.
- If the site doesn't start, open the app in the Azure Portal → **Log stream**. "Applied migration" lines mean the database connected.
- Use **Linux** App Service. Windows App Service needs extra IIS setup.
- Both resources cost money. Check current Azure pricing and delete the resource group when you're done testing: `az group delete --name deal-table-rg`.

These commands are standard Azure CLI. If one complains, check it with `--help` or the [Azure PostgreSQL quickstart](https://learn.microsoft.com/azure/postgresql/flexible-server/quickstart-create-server).

To use your own server with the GitHub Pages copy, put its address in `public/config.js` (see [deploy-github-pages.md](deploy-github-pages.md)).

## Other hosts

Any host that runs Node and offers PostgreSQL works the same way: set `DATABASE_URL` and run `npm start`. Examples are Render, Railway, Fly.io, a VM, or the Docker image on Azure Container Apps.

## Hosting only the game

To offer just same-device play, upload the contents of `public/` to any static host, such as GitHub Pages, Netlify or Azure Static Web Apps. Set the API address in `config.js` if you want online rooms too.
