# Releases

[The release workflow](../.github/workflows/release.yml) runs on pushes to `main` and can be started manually
from GitHub Actions on `main`.

1. Pending changesets create or update the `chore: release packages` PR.
2. Merging that PR starts a build, package validation, lint, formatting, type checks and tests.
3. Changesets packs the validated packages into an artifact.
4. A separate job publishes those tarballs to npm using trusted publishing, then creates a GitHub tag and Release
   for each package version. Release notes come from each package's `CHANGELOG.md`.

Tags and release names use `@calendar-tsx/<package>@<version>`. Versions containing a hyphen become GitHub
prereleases. Packages keep independent versions. Private workspaces are not published.

Only the publish job has `id-token: write`. The workflow uses pnpm 12.5.1's native OIDC support, does not use npm
tokens, and does not restore dependency caches in release jobs. Changesets actions are pinned to v2.1.2's commit,
which supports the installed Changesets 3 CLI.

## npm setup

Configure trusted publishing separately for all four public packages:

- `@calendar-tsx/core`
- `@calendar-tsx/react`
- `@calendar-tsx/solid`
- `@calendar-tsx/themes`

In each package's **Settings → Trusted publishing**, add a GitHub Actions publisher with these values:

| Field                | Value               |
| -------------------- | ------------------- |
| Organization or user | `Frantss`           |
| Repository           | `calendar-tsx`      |
| Workflow filename    | `release.yml`       |
| Environment name     | Leave empty         |
| Allowed actions      | Allow `npm publish` |

Enter the filename only, without `.github/workflows/`. Direct publishing must be allowed; Changesets does not
support npm's staged publishing flow. No GitHub environment is configured in the workflow.

Complete the first trusted publish within two days of creating each publisher configuration. If it expires,
delete it and create it again. After verifying trusted publishing, npm's **Publishing access → Require two-factor
authentication and disallow tokens** setting can disable traditional publishing tokens while keeping OIDC working.

The package manifests include the repository URL and package directory required to associate published artifacts
with this repository. Public packages published from a public GitHub repository through trusted publishing receive
provenance automatically.

### Packages that do not exist on npm yet

Trusted publisher settings require an existing package. An owner of the `@calendar-tsx` npm scope must publish
each missing package once using an interactive login before configuring its trusted publisher. This is a manual
bootstrap step; no npm token needs to be added to GitHub.

Build and check the repository first:

```bash
pnpm run build
pnpm run check:all
pnpm run test
pnpm login
```

Publish only packages that are missing, starting with core. For the current experimental core version, for example:

```bash
pnpm --filter @calendar-tsx/core publish --access public --tag experimental
```

Repeat for React, Solid and themes as needed, choosing the npm dist-tag for each package. Review the version in
each manifest before publishing. A bootstrap publish does not create a GitHub Release; the workflow creates
releases for subsequent versions that it publishes.

## GitHub setup

1. In **Settings → Actions → General**, allow the actions used by the workflow: `actions/*`, `pnpm/action-setup`
   and `changesets/action` (including its sub-actions).
2. Enable **Allow GitHub Actions to create and approve pull requests**. The workflow declares the required
   `contents` and `pull-requests` write permissions itself and uses the built-in `GITHUB_TOKEN`.
3. Ensure repository or organization policies allow those permissions. Branch rules must allow the bot to update
   `changeset-release/main`; tag rules must allow it to create `@calendar-tsx/*` tags.
4. Merge the workflow into `main`. After npm setup, use **Actions → release → Run workflow**, selecting `main`,
   if a release run needs to be started without another push.

No `NPM_TOKEN`, `NODE_AUTH_TOKEN`, personal access token or GitHub environment is required.

GitHub puts PR workflow runs created by `GITHUB_TOKEN` in an approval-required state. On the release PR, a
maintainer with write access must select **Approve workflows to run** to start CI. A normal maintainer merge then
triggers release on `main`.

## Preparing a release

Add a changeset to a change that needs publishing:

```bash
pnpm run version:add
```

Select the affected packages, choose version bumps, and describe the consumer-visible changes. Commit the generated
`.changeset/*.md` file with the change. After merging to `main`, review the automated release PR and merge it when
ready to publish. `version:release` updates versions, changelogs and the lockfile, then formats the release files.
Changesets' own automatic commits are disabled because the GitHub action owns the release commit.

Before the first automated release, include all four public packages in changesets so their changelogs are
initialized. The workflow refuses to publish if a public package lacks a changelog entry for its current version.
This prevents publishing a version for which the action would silently omit its GitHub Release.

### Experimental releases

A prerelease version in `package.json` alone does not enable Changesets prerelease mode. The repository currently
has experimental core, React and Solid versions, but no `.changeset/pre.json`. Normal versioning uses normal
semantic version bumps, and publishing defaults to npm's `latest` dist-tag.

To keep future release PRs on the experimental channel, enter prerelease mode before adding and merging changesets:

```bash
pnpm exec changeset pre enter experimental
pnpm run version:add
```

Commit `.changeset/pre.json` together with the changeset. Review the release PR's versions before merging. Changesets
chooses npm dist-tags from its prerelease state; its first publish of a previously unpublished package can use
`latest`, even in prerelease mode. GitHub prerelease marking follows the version string independently.

To prepare normal versions later, run `pnpm exec changeset pre exit`, commit the state change and add a changeset
for the next release. The workflow does not enter or exit prerelease mode automatically.

## Failed runs

Read the failing job before retrying. npm versions cannot be overwritten. If npm accepted a version but GitHub
release creation failed, check npm, the package tag and GitHub Releases before retrying; do not bump or republish
the same version just to recreate its release notes. A missing GitHub Release may need to be created manually
from the existing tag and the matching changelog entry.

References: [Changesets automation](https://changesets.dev/guide/automating),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[pnpm publish](https://pnpm.io/cli/publish),
[GitHub workflow event suppression](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
