# Working in calendar-tsx

calendar-tsx is a TypeScript monorepo for a headless, framework-agnostic calendar
library with React bindings, using pnpm workspaces. Use pnpm for development.

Read `readme.md`, then the relevant package readme and code. This file defines how
to work; the guides below document the project.

## Before acting

- Read until the pattern is clear. Find how this repo already does the thing
  and match it. Over-reading beats a fast first edit.
- Anything checkable, including an API, version, configuration, or why a line
  exists, gets checked at the source: `package.json`, `pnpm-lock.yaml`, configuration
  files, source files, git history, and documentation matching the dependency
  version. Consult TypeScript, React, TanStack Store, Temporal, Vite+,
  Vitest, Playwright, and the Temporal proposal as relevant. Verify prerelease behavior
  against the installed version rather than assuming stable-release behavior.
- Anything not cheaply checkable: stop the dependent work and ask, and bring two
  or three concrete proposals for how to find out. Continue unaffected work.
- Read [the design spec](./docs/design.md) before changing behavior or the public
  API: it records the requirements and every design decision (`D1`…) with its
  reasoning.

## Deciding vs. asking

- Weigh blast radius. Small and reversible: proceed. Architectural,
  cross-cutting, or hard to undo: propose first, then wait, unless the user has
  already authorized that work.
- Ambiguity earns a question only when the readings lead to materially
  different work. Otherwise take the best reading, state the assumption, and
  keep going.
- Side effects, including commits, branches, installs, deletions, and servers,
  get the same test: how necessary, how reversible, and how much consent the
  ask already implies. Necessary, reversible, and implied: do it. Otherwise
  ask.

## Skills

- Check the available skills before settling on an approach. A skill that
  covers the task is the intended way to do it, not a suggestion.
- If `.agents/skills/` exists, read the matching project-local skill before
  acting. Follow it over instinct or a pattern borrowed from elsewhere.
- If a skill looks wrong for the case at hand, say so and wait. Do not deviate
  silently.

## Proposing solutions

- Give the viable options with their trade-offs. Recommend one, but make the
  alternatives real enough to choose from.
- Name what was considered and rejected, and why. The search space is part of
  the answer.
- Skip this for work with one obvious path. Do not manufacture alternatives.

## Scope

- Do the ask. Nothing adjacent.
- Bugs, dead code, and bad patterns found in passing are recorded as described
  below and left alone.
- Ship the whole ask. If part is blocked, finish the rest and say exactly what
  was left out and why. Narrowing scope belongs to the user.

## Recording what you find

- Findings go in `reports/<topic>.md`, one file per topic, appended to rather
  than rewritten. Create the directory when needed.
- Each finding states what it is, where it is (`path:line`), and why it matters.
  Do not include a fix, patch, or refactor.

## Commands

Run from the repo root unless a package directory is specified. Root scripts use
Vite+ (`vp`); lint and formatting use Oxlint and Oxfmt, not ESLint or Prettier.

```bash
pnpm run build           # build all workspaces
pnpm run build:dev       # watch mode
pnpm run check:types     # type-check all workspaces
pnpm run check:all       # lint, format, types, and package validation
pnpm run test            # run core and React tests once
pnpm run fix:all         # auto-fix lint and format
pnpm run fix:format AGENTS.md  # format a specific file

# Run a single test through the package's Vite+ script
cd packages/<name> && pnpm run test run src/tests/file.spec.ts
```

## Done

- For code or configuration changes, run `pnpm run build`, `pnpm run check:all`,
  and `pnpm run test`, unless a command is irrelevant or blocked. Build before
  package validation so it can inspect the generated exports.
- Run formatting before finishing. Limit formatting to files changed for the
  task; inspect the diff and preserve unrelated edits.
- Report faithfully. Failures include their output; skipped steps are named.
  Unverified work is never called done. Documentation-only work needs formatting
  and link checks; builds, type checks, tests, and browser verification are
  unnecessary unless the documentation change affects them.

## Git

- Inspect the branch, status, and remotes before Git operations. Preserve
  existing staged, unstaged, and untracked work.
- Use a conventional-commit prefix and lowercase subject (`feat:`, `chore:`,
  `docs:`). Keep the subject on one line; add a body only when the change needs
  explanation beyond its title.
- Use descriptive, hyphenated branch names with the `codex/` prefix, for example
  `codex/month-row-cap`, unless the user specifies another name.
- Check the current remote rather than assuming work is local-only or already
  backed up. Treat untracked and uncommitted files as unbacked-up; a remote does
  not preserve them.

## Talking to me

- Be terse and technical. Use no preamble, request restatement, or praise.
- Include reasoning when the decision was genuinely hard; leave it out when it
  was not.
- If you think the user is wrong, say so once in one or two sentences, then do
  it their way. If they repeat the request, it is settled.
- "I don't know" is a complete answer. A confident guess is not.
