# calendar-tsx docs

The documentation site uses TanStack Start and Fumadocs. Each framework has the same structure under
`content/docs/core`, `content/docs/react` and `content/docs/solid`:

- `index.mdx`: installation and the first calendar example.
- `guide/`: concepts, behavior, integration and extension guides.
- `api/`: options, instance, state and framework binding contracts.
- `recipes/`: view rendering and styling examples.

Update each section's `meta.json` when adding or moving pages. The framework root lists the overview, Guide, API
and Recipes in that order. Shared content stays in `content/shared`; MDX includes reuse it across frameworks.
Code includes point to the compiled examples in `examples/`.

## Run and verify

Run from the repository root:

```bash
pnpm install
pnpm run build
pnpm --filter @calendar-tsx/docs run dev
```

Open [localhost:3000](http://localhost:3000). After editing documentation, run:

```bash
pnpm --filter @calendar-tsx/docs run build
pnpm --filter @calendar-tsx/docs run check:types
pnpm exec vp fmt --check apps/docs/content apps/docs/README.md
```

The docs build compiles MDX and prerenders the site. Check links, navigation and included example paths after
moving pages. Keep `src/routeTree.gen.ts` generated.
