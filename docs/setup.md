# Run Disco

Disco needs a running Seerr instance. Use its origin, such as `https://request.example.com`,
for `SEERR_URL`. Find `SEERR_API_KEY` in Seerr under **Settings → General → API Key**.
Keep the key server-only.

## Docker Compose

Save the root `compose.yaml` and `.env.example` in the same directory. Copy `.env.example`
to `.env` and set the Seerr values. Set `DISCO_PORT` if port 8785 is already in use, then run:

```sh
docker compose up --detach --pull always
```

Open [localhost:8785](http://localhost:8785), or use your server's address and chosen port.
Compose pulls `ghcr.io/jameswyse/disco:latest`. The image supports AMD64 and ARM64.
See [the port selection](ports.md) for the default's rationale.

Compose stores saved views and preferences in the `disco-data` volume at `/data`.
Preserve that volume when you replace the container.

## Update or pin a version

Set `DISCO_VERSION` in `.env` to select your update policy:

- `latest` follows the newest stable release, including breaking upgrades.
- `0.1` follows patches within the `0.1` series.
- `0.1.0` pins that exact release.
- From version 1, `1` follows minor and patch releases within major version 1.

The numbered values above are examples. Choose an existing version from
[Releases](https://github.com/jameswyse/disco/releases).
Apply the selected version with:

```sh
docker compose up --detach --pull always
```

For unattended updates, schedule that command on your server, with the installation directory
as its working directory. For example, this cron entry checks the selected tag daily at 04:17:

```cron
17 4 * * * cd /opt/disco && docker compose up --detach --pull always >> /opt/disco/update.log 2>&1
```

Replace `/opt/disco` with your installation directory. The scheduled user needs Docker access.
A running container does not update until you run the command, even when its tag is `latest`.

To roll back, set `DISCO_VERSION` to the previous exact version and run the same command.
Before an upgrade, back up `/data` and read the release notes for storage changes.
If a release changes the stored format incompatibly, restore the matching backup before downgrading.
Keep the same Compose directory or project name so that Compose reuses the existing volume.

## Build from source

From a repository checkout, copy the root `.env.example` to `.env` and set the Seerr values.
Build and start the local image with:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build --detach
```

Use this command before the first image release is published, or to run local code changes.

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
