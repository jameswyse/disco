# Run Disco

Use a Seerr origin reachable from Disco, such as `https://request.example.com`, for `SEERR_URL`.
Find `SEERR_API_KEY` in Seerr under **Settings → General → API Key**.
Sign in with an existing Seerr account; create accounts and reset passwords in Seerr.

## Docker Compose

Save [compose.yaml](../compose.yaml) and [.env.example](../.env.example) in the same directory.
Copy `.env.example` to `.env` and set the Seerr values. Set `DISCO_PORT` if port 8785 is occupied.
Then run:

```sh
docker compose up --detach --pull always
```

Open [localhost:8785](http://localhost:8785), or your server's address and chosen port.
The image supports AMD64 and ARM64. See [why port 8785 was chosen](ports.md).

Saved views and preferences are shared by everyone on the instance. Preserve the `disco-data`
volume and the Compose directory or project name when replacing containers.

## Updates and rollback

Set `DISCO_VERSION` in `.env` to an existing [release](https://github.com/jameswyse/disco/releases):

- `latest` follows stable releases, including breaking upgrades.
- `1` follows minor and patch releases within major version 1.
- `1.1` follows patches within that series.
- `1.1.0` pins an exact release.

Rerun the Compose command to apply the selected version. A running container does not update
itself, even with `latest`; schedule the command from the installation directory for unattended updates.

Back up `/data` and read the release notes before upgrading. To roll back, select the previous
exact version and rerun the command. If storage changed incompatibly, restore its matching backup.

## Build from source

In a checkout, configure the root `.env` as above, then run:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build --detach
```

## Local development

Install [pnpm's standalone executable](https://pnpm.io/installation#using-a-standalone-script)
if needed. pnpm selects the toolchain declared in `package.json`. From the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
```

Set the Seerr values in `apps/web/.env`, run `pnpm dev`, and open
[localhost:3000](http://localhost:3000). Development reads `apps/web/.env`; Compose reads the root `.env`.
Local data defaults to `apps/web/data/`; set `DISCO_DATA_DIR` to isolate another instance.
See [development notes](development.md) before changing the app.

`/api/health` validates configuration, not connectivity to Seerr.
