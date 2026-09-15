# Disco's default port

Docker Compose publishes Disco on host port **8785**, mapped to port **3000** inside the container.
Only the host port competes with other containers. Local Next.js development still uses port 3000.

Port 8785 is a practical default for a media server. It avoids common web development ports and
the following documented media-app defaults, checked on 15/09/2026:

| Application | Default web port | Source                                                                            |
| ----------- | ---------------- | --------------------------------------------------------------------------------- |
| Sonarr      | 8989             | [Container documentation](https://docs.linuxserver.io/images/docker-sonarr/)      |
| Radarr      | 7878             | [Container documentation](https://docs.linuxserver.io/images/docker-radarr/)      |
| Lidarr      | 8686             | [Container documentation](https://docs.linuxserver.io/images/docker-lidarr/)      |
| Prowlarr    | 9696             | [Container documentation](https://docs.linuxserver.io/images/docker-prowlarr/)    |
| Bazarr      | 6767             | [Container documentation](https://docs.linuxserver.io/images/docker-bazarr/)      |
| Readarr     | 8787             | [Published container documentation](https://hub.docker.com/r/linuxserver/readarr) |
| Seerr       | 5055             | [Getting started](https://docs.seerr.dev/getting-started/)                        |

The [IANA port registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.csv)
lists 8779–8785 as unassigned. Port 8785 is also below the dynamic/private range of 49152–65535.
An unassigned port is not reserved for Disco, and another service can still use it.
Set `DISCO_PORT` in `.env` to choose a different host port.

Port 8780 was also considered, but [Nextcloud HaRP](https://github.com/nextcloud/HaRP)
uses it for its ExApps frontend.
