import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

for (const framework of ['react', 'solid']) {
  const server = await createServer({
    configFile: fileURLToPath(
      new URL(`../../../../${framework}/prototypes/interaction-foundation/vite.config.ts`, import.meta.url),
    ),
  });
  await server.listen();
  console.log(
    `${framework}: http://127.0.0.1:${framework === 'react' ? 5177 : 5178}/prototypes/interaction-foundation/`,
  );
}
