# Storybook

## 2026-10-24: optional Vite+ peer range

`apps/storybook/package.json:24` selects Storybook 10.6.3. Its published manifest declares the optional
`vite-plus` peer as `^0.1.15 || ^0.2.0`, while `package.json:39` installs Vite+ 1.0.0. `pnpm peers check`
reports that mismatch. The Storybook build and browser tests pass with the installed versions, but the peer
declaration does not cover this combination, so dependency installation emits a warning.

## 2026-10-24: static iframe favicon request

Opening the generated `apps/storybook/storybook-static/iframe.html:1` directly requests `/favicon.ico`, which the
static output does not contain. The browser reports a 404 in its console. The isolated calendar preview renders,
but console-error checks must distinguish this missing optional asset from story failures.
