# Web architecture

Disco owns browsing and saved views. Seerr owns accounts, metadata, requests, permissions,
and watchlists. Radarr, Sonarr, and Plex remain behind Seerr.

## Ownership boundaries

Routes parse URL input and delegate to features. Features own user-facing behaviour;
integrations own reusable external-service mechanics; platform code owns configuration,
persistence, and the Effect runtime. Use relative imports within a feature and `@/` across areas.

Validate external data once with Effect schemas. Loaders run Effect programs and return plain
discriminated results to React. The process shares one `ManagedRuntime`; it never stores user
identity. Loaders call `connection()` before Effect programs so clock access happens at request time.

## Authentication and caching

Disco carries Seerr's signed session in a host-only, HttpOnly `disco_session` cookie.
Seerr verifies sessions without an API key. Authenticated operations then supply the verified
user ID alongside the server-only API key. An expired session cannot fall back to the admin account.

Cached catalogue and title reads verify the session before entering the cache and include the
user ID in cache keys. Session and CSRF secrets never enter the Next.js cache. Sign-out invalidates
the upstream Seerr session before clearing Disco's cookie.

Saved views and preferences are instance-wide JSON files, validated on read and written atomically.
A missing file selects defaults. They are not per-user Seerr settings.

## Browse behaviour

Unfiltered media views use Seerr's trending and upcoming endpoints. Constrained views use TMDB
discover approximations based on popularity and release dates. TMDB popularity scores are not
comparable across media types, so mixed results interleave films and series instead of sorting
their scores together.

Each browse page fetches two Seerr pages and filters already-available titles locally.
Network views contain only series; studio views contain only films. View-defined genres and
languages stay fixed. Sort controls apply to one media type at a time.

The default language comes from instance preferences. URLs name a language only when it differs;
`lang=any` clears the default. Search encodes spaces as `%20` because Seerr rejects `+` spaces.

## Title data and requests

List endpoints omit runtime and season counts, so cards fetch and cache those facts separately.
Ratings with fewer than 10 votes stay hidden. Posters load directly from TMDB with unoptimised
Next.js images, matching Seerr's image delivery.

Request progress derives from Seerr's media status, requests, and download progress. Release dates
distinguish waiting for release from waiting for a download. Advanced request choices are checked
against Seerr's service profiles when submitted; omitted choices preserve Seerr's defaults.

Continuous results discard duplicate titles and preserve loaded results after a later-page error.
A refreshed server payload resets accumulated results so availability stays current.
