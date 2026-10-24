# Docs preview

- 2026-10-24: The built docs return HTTP 404 for the browser's `/favicon.ico` request. `apps/docs/src/routes/__root.tsx:7` defines the document head without an icon link, and the docs app has no public favicon asset. This adds a console error on initial navigation; calendar rendering is unaffected.
