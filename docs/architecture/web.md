# Web architecture

Disco owns browsing and instance-wide preferences. Seerr owns accounts, metadata, requests,
permissions, and watchlists. Radarr and Sonarr remain behind Seerr; Plex provides episode availability.

## Ownership boundaries

Routes parse URL input and delegate to features. Features own user-facing behaviour;
integrations own reusable external-service mechanics; platform code owns configuration,
persistence, and the Effect runtime. Use relative imports within a feature and `@/` across areas.

Loaders return plain discriminated results to React. The shared `ManagedRuntime` must never hold
user identity. Call `connection()` before request-time Effect programs so clock reads do not
run during prerendering.

Verify Seerr sessions before cached reads, include the verified user ID in cache keys, and keep
session and CSRF secrets out of the cache. An expired session must never fall back to admin access.
Sign-out must invalidate the upstream session before clearing Disco's cookie.

## Upstream constraints

- TMDB popularity scores are not comparable across films and series, so mixed results interleave
  them. Constrained views approximate trending and upcoming lists through TMDB discover.
- Search uses `%20` for spaces because Seerr rejects `+`.
- Originals use production identities, not availability providers. Disney+ has no film-studio
  mapping because Disney's studios also make theatrical releases.
- List endpoints omit runtime and season counts, requiring separate title reads.
- Plex episode checks assume Seerr and Plex use the same season and episode numbering. Preserve
  seasons Seerr confirms as complete because Plex may combine episode entries. Unavailable Plex
  data must not produce invented episode counts.

Plex discovery needs Seerr's administrator endpoints and therefore uses instance-level access.
Verify the connected server matches the configured ID before reading episode files. Ordinary Seerr
calls must retain the verified user's permissions; Plex tokens must stay out of client data and logs.

## Browser exceptions

The sign-in retry link requires a full reload to retry the failed server request, so it has a scoped
Next.js lint suppression. YouTube's player requires sandbox permission for scripts and its own
origin; the embedded origin must remain separate from Disco.
