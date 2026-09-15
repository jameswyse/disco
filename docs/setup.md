# Run Disco

Disco needs a running Seerr instance. Use its origin, such as `https://request.example.com`,
for `SEERR_URL`. Find `SEERR_API_KEY` in Seerr under **Settings → General → API Key**.
Keep the key server-only.

## Docker Compose

Copy the root `.env.example` to `.env` and set the Seerr values. Set `DISCO_PORT` if port 3000
is already in use, then run:

```sh
docker compose up --build --detach
```

Compose stores saved views and preferences in the `disco-data` volume at `/data`.
Preserve that volume when you replace the container.

## Local development

Use pnpm with the versions pinned in `package.json`. From the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
```

Set the Seerr values in `apps/web/.env`, then run `pnpm dev` and open
[localhost:3000](http://localhost:3000).

Local development reads `apps/web/.env`; Docker Compose reads the root `.env`.
Local saved views and preferences live in `apps/web/data/`. Set `DISCO_DATA_DIR` to use another
directory. Views and preferences are shared by everyone on the Disco instance.

## Sign in and check configuration

Sign in with an existing Seerr account. Disco offers Plex or email and password according to
Seerr's enabled login methods. Create accounts and reset passwords in Seerr.

`/api/health` reports `503 misconfigured` until the Seerr configuration parses.
A healthy response checks configuration, not connectivity to Seerr.

See [development notes](development.md) before changing the app.
