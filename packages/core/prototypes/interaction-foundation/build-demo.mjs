import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = await readFile(new URL('runtime.ts', import.meta.url), 'utf8');
const runtime = stripTypeScriptTypes(source)
  .replace(/^import .*;$/gm, '')
  .replace(/^export /gm, '');
const polyfill = await readFile(new URL('../../node_modules/temporal-polyfill/global.js', import.meta.url), 'utf8');
const license = await readFile(new URL('../../node_modules/temporal-polyfill/LICENSE', import.meta.url), 'utf8');
const code = `${polyfill}\n${runtime}\nglobalThis.InteractionPrototype = { createRuntime, idle, interactionFeature, dateSelectionFeature, eventMoveFeature, constraintsFeature, resolveClockTarget, validateRegistration };`;
const script = `<script src="data:text/javascript;base64,${Buffer.from(code).toString('base64')}"></script>`;
const template = await readFile(new URL('demo.template.html', import.meta.url), 'utf8');
await writeFile(
  new URL('demo.html', import.meta.url),
  template
    .replace('<!-- RUNTIME -->', script)
    .replace('<!-- LICENSE -->', `<!-- temporal-polyfill license\n${license}-->`),
);
console.log('Generated self-contained demo.html from runtime.ts; no network or server needed.');
