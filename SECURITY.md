# Security policy

## Supported versions

Security fixes target the latest stable release of Disco. Older releases do not receive
security backports. Upgrade to the [latest release](https://github.com/jameswyse/disco/releases/latest)
before checking whether an issue still occurs.

## Report a vulnerability

Report suspected vulnerabilities privately through
[GitHub's vulnerability reporting form](https://github.com/jameswyse/disco/security/advisories/new).
Do not include vulnerability details in public issues, discussions, or pull requests.

Include the following information where available:

- The affected Disco version, image tag, or commit.
- Steps to reproduce the issue and a minimal proof of concept.
- The expected and observed behaviour, including the potential security impact.
- Relevant deployment details, such as reverse proxy configuration and the Seerr version.
- Redacted logs or screenshots that help reproduce the issue.

Remove API keys, passwords, session cookies, tokens, and personal data from reports and attachments.
Test only on systems you own or have permission to assess.

Use the private report to discuss reproduction, fixes, and disclosure timing with the maintainer.
Please coordinate public disclosure until a fix or mitigation is available. Response and fix times
are not guaranteed.

## Scope

Report vulnerabilities in Disco's application, container images, and integration with Seerr here.
For issues confined to Seerr, Plex, Radarr, Sonarr, or another dependency, follow that project's
security reporting process. If you are unsure where the issue originates, report it privately here
and explain what you observed.

For installation and updates, see the [setup guide](docs/setup.md).
