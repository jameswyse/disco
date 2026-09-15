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

You need a running Seerr instance and an existing Seerr account. To run Disco with Docker Compose:

```sh
cp .env.example .env
```

Set `SEERR_URL` to your Seerr address and `SEERR_API_KEY` to the key in **Settings → General**.
Then start Disco:

```sh
docker compose up --build --detach
```

Open [localhost:3000](http://localhost:3000) and sign in. See the [setup guide](docs/setup.md)
for local development and storage configuration.

## Licence

Disco is available under the [MIT licence](LICENSE).
