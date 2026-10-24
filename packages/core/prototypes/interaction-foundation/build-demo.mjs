import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const modules = ['runtime.ts', 'interaction-feature.ts', 'operations.ts', 'third-party/priority.ts'];
const runtime = (
  await Promise.all(
    modules.map(async path => {
      const source = await readFile(new URL(path, import.meta.url), 'utf8');
      return stripTypeScriptTypes(source)
        .replace(/^import[\s\S]*?;$/gm, '')
        .replace(/^export \{[^}]*\} from [^;]+;$/gm, '')
        .replace(/^export /gm, '');
    }),
  )
).join('\n');
const polyfill = await readFile(new URL('../../node_modules/temporal-polyfill/global.js', import.meta.url), 'utf8');
const license = await readFile(new URL('../../node_modules/temporal-polyfill/LICENSE', import.meta.url), 'utf8');
const code = `${polyfill}\n${runtime}\nglobalThis.InteractionPrototype = { createRuntime, idle, interactionFeature, dateSelectionFeature, eventMoveFeature, eventResizeFeature, constraintsFeature, eventPriorityFeature, isBuiltinProposal, resolveClockTarget, validateRegistration };`;
const script = `<script src="data:text/javascript;base64,${Buffer.from(code).toString('base64')}"></script>`;
const template = await readFile(new URL('demo.template.html', import.meta.url), 'utf8');
await writeFile(
  new URL('demo.html', import.meta.url),
  template
    .replace('<!-- RUNTIME -->', script)
    .replace('<!-- LICENSE -->', `<!-- temporal-polyfill license\n${license}-->`),
);
console.log('Generated self-contained demo.html from runtime and operation modules; no network or server needed.');
