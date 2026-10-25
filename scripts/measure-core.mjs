import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const ref = process.argv[2];
const packages = join(root, 'node_modules/.pnpm');
const parsers = readdirSync(packages).filter(name => /^acorn@8\./.test(name));
if (parsers.length !== 1) throw new Error('Expected one installed Acorn 8 version from the frozen pnpm lockfile');
const { parse, tokenizer } = await import(
  pathToFileURL(join(packages, parsers[0], 'node_modules/acorn/dist/acorn.mjs'))
);
const walk = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'tests') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith('.ts') ? [relative(root, path)] : [];
  });
const files = ref
  ? execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'packages/core/src'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(path => path.endsWith('.ts') && !path.split('/').includes('tests'))
  : walk(join(root, 'packages/core/src'));
const totals = { sourceLines: 0, implementationFileLines: 0, runtimeLines: 0, runtimeTokens: 0 };
for (const file of files) {
  const source = ref
    ? execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' })
    : readFileSync(resolve(root, file), 'utf8');
  const js = stripTypeScriptTypes(source, { mode: 'strip' });
  const options = { ecmaVersion: 'latest', sourceType: 'module', locations: true };
  const imports = parse(js, options).body.filter(node => node.type === 'ImportDeclaration');
  const tokens = [...tokenizer(js, options)].filter(
    token => token.type.label !== 'eof' && !imports.some(node => token.start >= node.start && token.end <= node.end),
  );
  const lines = new Set(
    tokens.flatMap(token =>
      Array.from({ length: token.loc.end.line - token.loc.start.line + 1 }, (_, index) => token.loc.start.line + index),
    ),
  );
  const physical = source.split('\n').length - Number(source.endsWith('\n'));
  totals.sourceLines += physical;
  if (!file.endsWith('.types.ts') && !file.endsWith('.feature-maps.ts')) totals.implementationFileLines += physical;
  totals.runtimeLines += lines.size;
  totals.runtimeTokens += tokens.length;
}
console.log(
  JSON.stringify({ ref: ref ?? 'working-tree', parser: parsers[0], files: files.length, ...totals }, null, 2),
);
