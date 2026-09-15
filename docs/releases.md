# Release Disco

Disco has one application version and one image, `ghcr.io/jameswyse/disco`.
Release Please maintains a release PR from conventional commits on `master`.
Merging that PR creates the version tag and GitHub release, then starts image publication.

```text
Merge changes into master → release PR → merge release PR
  → Git tag and release → verify tagged commit → build and check AMD64 and ARM64
  → publish exact version → advance eligible image channels
```

## Prepare GitHub

1. In **Settings → Actions → General → Workflow permissions**, enable
   **Allow GitHub Actions to create and approve pull requests**. Keep the default token permissions
   read-only. Each workflow grants its jobs the permissions they need.
2. Require **CI / Required** before merging into `master`.
3. Merge the release configuration into `master` with a conventional commit such as
   `feat: publish versioned container releases`.

The workflows use the built-in `GITHUB_TOKEN`. No registry password or personal access token is needed.
GitHub may require you to approve CI runs on PRs created by that token. Approve the release PR's
workflow run before merging it. See [GitHub's token rules](https://docs.github.com/en/actions/concepts/security/github_token).
Image publication runs directly from the release workflow, so it does not depend on a bot-created
tag triggering another workflow.

## Publish a release

1. Merge conventional commits into `master`. Use `fix:` for patches, `feat:` for features,
   and `!` or a `BREAKING CHANGE:` footer for breaking changes.
2. Review the generated release PR, including its changelog and version updates.
   Both package manifests share the application version. Before version 1, features and breaking
   changes advance the minor version, while fixes advance the patch version.
3. Let the release PR's checks pass, then merge it.
4. Wait for the **Release** workflow's image publication to finish. A GitHub release can exist
   before its image is ready. The workflow summary lists the published version and updated channels.

The image workflow checks out the release's exact commit and reruns CI. Native AMD64 and ARM64
runners then build the images and start them through the installation Compose file.
Each container must become healthy before its architecture image is pushed.
The health endpoint validates configuration, not live Seerr connectivity. Browser tests use the
repository's Seerr fixture.

Only stable tags such as `v0.1.0` are accepted. Development commits and prereleases do not update
the stable image channels. Release Please manages Git tags. The following are container tags:

- `0.1.0` identifies an exact release and is never overwritten by the workflow.
- `0.1` follows the newest patch in that series.
- `1` follows the newest stable release within major version 1. There is no broad `0` channel.
- `latest` follows the highest published stable version.

Publishing an older version can update its own series, but cannot move a newer channel backwards.
Base-image or dependency updates go through another versioned release. Do not rebuild an existing
exact version tag to deliver them.

## Make the first image public

After the first successful image publication, open the
[Disco package](https://github.com/users/jameswyse/packages/container/package/disco) and its
**Package settings**. Change the package visibility to **Public**.
The container's visibility is separate from the repository's visibility. Making the repository public
does not replace this check. See [GitHub's package visibility documentation](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

Verify access without saved Docker credentials:

```sh
DOCKER_CONFIG="$(mktemp -d)" docker pull ghcr.io/jameswyse/disco:latest
```

Once the image is public, users need only `compose.yaml` and `.env`. They do not need GitHub credentials
or a source checkout. Before publication, use the [source build](setup.md#build-from-source).

## Resume a failed publication

Open **Actions → Publish image → Run workflow** on `master`, and enter the existing release tag,
such as `v0.1.0`. The workflow verifies that it is a published stable GitHub release, resolves its
commit, and repeats the checks before publication.

If the exact image version already exists, the workflow checks its source revision and uses that
original image for any unfinished channel updates. It does not overwrite the exact tag.
Concurrent publications share one workflow concurrency group.

Architecture images have `build-<run>-<architecture>` tags, so a failed job can reuse an architecture
that passed in an earlier attempt. Retain them while a publication
is unfinished. Do not remove manifests referenced by released images when cleaning up registry storage.
