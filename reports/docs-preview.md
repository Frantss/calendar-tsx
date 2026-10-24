# Docs preview

- 2026-10-24: The built docs return HTTP 404 for the browser's `/favicon.ico` request. `apps/docs/src/routes/__root.tsx:7` defines the document head without an icon link, and the docs app has no public favicon asset. This adds a console error on initial navigation; calendar rendering is unaffected.

- 2026-10-23: Rebuilding workspace packages while the docs dev server is open can leave the preview in an error boundary. `packages/core/vite.config.ts:15` and `packages/react/vite.config.ts:31` enable clean builds, while `packages/core/package.json:21` exports the generated JavaScript. Browser logs showed temporary 404s for the core bundle during rebuilding, followed by a CalendarProvider context error during hot reload, even though the completed build and a fresh page load succeeded.
