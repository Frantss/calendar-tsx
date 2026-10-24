# Release documentation

## Version description checked before committing: 2026-10-23

- **What:** the release guide describes the current core, React and Solid versions as experimental, while all four
  public manifests now declare `0.0.1`.
- **Where:** `docs/releases.md:110`; `packages/core/package.json:3`; `packages/react/package.json:3`;
  `packages/solid/package.json:3`; `packages/themes/package.json:3`.
- **Why it matters:** readers can mistake the current normal versions for prereleases when choosing publishing
  commands or npm dist-tags.
