# Release Disco

## GitHub setup

Require **CI / Required** before merging into `master`. Install the release GitHub App on this
repository with **Contents** and **Pull requests** set to **Read and write**. In repository
**Settings → Secrets and variables → Actions**, set:

- Variable `RELEASE_APP_CLIENT_ID` to the app's client ID.
- Secret `RELEASE_APP_PRIVATE_KEY` to its private key.

Keep default workflow permissions read-only. The app token lets version PRs trigger CI;
`GITHUB_TOKEN` publishes images and releases without a separate registry password.

After the first publication, make the [container package](https://github.com/users/jameswyse/packages/container/package/disco)
**Public** in its package settings. Repository visibility does not control package visibility.
Verify that anonymous users can pull it:

```sh
DOCKER_CONFIG="$(mktemp -d)" docker pull ghcr.io/jameswyse/disco:latest
```

## Publish a version

1. Add a changeset for each change that belongs in a release:

   ```sh
   pnpm changeset --patch @disco/web -m 'Describe the change users will notice.'
   ```

   Use `patch` for fixes, `minor` for compatible features, and `major` for breaking changes.
   Commit the changeset with the code. Changesets determines versions from these files,
   regardless of the conventional commit type.

2. Merge into `master`, then review the generated **chore(release): version packages** PR.
3. Once its checks pass, merge the version PR. The **Release** workflow publishes the image,
   then creates the Git tag and GitHub release.

Only stable versions are published. Exact image tags are immutable; base-image and dependency
updates need a new release. See [container update channels](setup.md#updates-and-rollback).
The root [changelog](../CHANGELOG.md) retains history from before Changesets; new entries live
with the application.

## Resume a failed publication

If **Release** fails before creating the GitHub release, rerun its failed jobs. If a code fix is
needed before the exact image exists, merge the fix without another changeset to retry that version.
Once an exact image exists, resume the original run so the source commit still matches.

For an existing GitHub release, open **Actions → Publish image → Run workflow** on `master`
and enter its tag, such as `v1.1.0`. An existing exact image is reused for unfinished channel updates.
Publishing an older release cannot move a newer channel backwards.

Retain `build-<run>-<architecture>` images while publication is unfinished. When cleaning registry
storage, preserve manifests referenced by released images.
