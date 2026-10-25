# Releases

[The release workflow](../.github/workflows/release.yml) runs on pushes to `main`, or manually from Actions on
`main`.

1. Add a changeset to each change that needs publishing (`pnpm run version:add`) and commit the generated
   `.changeset/*.md`.
2. On `main`, pending changesets open or update the `chore: release packages` PR. GitHub holds its CI until a
   maintainer selects **Approve workflows to run**.
3. Merging that PR builds, validates, packs and publishes the packages to npm through trusted publishing (OIDC, no
   tokens), then creates a tag and GitHub Release per version (`@calendar-tsx/<package>@<version>`) from its
   `CHANGELOG.md`. The workflow refuses to publish a version with no changelog entry.

Packages version independently; versions containing a hyphen become GitHub prereleases. For an npm prerelease
channel, run `pnpm exec changeset pre enter <tag>` and commit `.changeset/pre.json`; `changeset pre exit` leaves it.

## Setup

- **npm:** each public package has a trusted publisher: user `Frantss`, repository `calendar-tsx`, workflow
  `release.yml`, no environment. A package that does not exist on npm yet must be published once by hand
  (`pnpm --filter <name> publish --access public`) before a publisher can be added.
- **GitHub:** Actions may run `actions/*`, `pnpm/action-setup` and `changesets/action`, and may create and approve
  pull requests. Rules must let the bot push `changeset-release/main` and create `@calendar-tsx/*` tags.

## Failed runs

npm versions cannot be overwritten. If npm accepted a version but the GitHub Release failed, create the release by
hand from the existing tag and changelog entry instead of bumping.
