<p align="center">
  <img src="docs/assets/disco.svg" alt="" width="96" height="96">
</p>

<h1 align="center">Disco</h1>

<p align="center">
  <strong>Find your next film or series.</strong><br>
  A personal media browser for your Seerr and Plex setup.
</p>

<p align="center">
  <a href="docs/setup.md">Get started</a> ·
  <a href="docs/development.md">Development</a> ·
  <a href="LICENSE">MIT licence</a>
</p>

![Disco's browse page with saved views, filters, and live film results.](docs/assets/browse.png)

Disco puts you in control of what you browse. Build a sidebar around your favourite streaming
services, studios, genres, and languages, then find something worth watching. Your existing
[Seerr](https://github.com/seerr-team/seerr) instance handles accounts, metadata, and requests
through to Radarr, Sonarr, and Plex.

## Features

- Save and reorder views for the services, networks, studios, and genres you follow.
- Browse upcoming, recently released, trending, and popular titles with filters for your tastes.
- Hide titles already in Plex and check availability at a glance.
- Explore ratings, cast, seasons, and where to watch in your region.
- Request films or individual seasons, follow their progress, and manage your Seerr watchlist.

## Get started

You need a running Seerr instance and an existing Seerr account. Save
[`compose.yaml`](compose.yaml) and [`.env.example`](.env.example) in the same directory,
then run:

```sh
cp .env.example .env
```

Set `SEERR_URL` to your Seerr address and `SEERR_API_KEY` to the key in **Settings → General**.
Then start Disco:

```sh
docker compose up --detach --pull always
```

Open [localhost:8785](http://localhost:8785) and sign in. The image supports AMD64 and ARM64.
Set `DISCO_VERSION` in `.env` to `latest`, a minor series such as `0.1`, or an exact release such
as `0.1.0`. Run the same command to update within the selected series.

See the [setup guide](docs/setup.md) for updates, storage, and building from source.
See [release instructions](docs/releases.md) for publishing a new version.

## Licence

Disco is available under the [MIT licence](LICENSE).
