import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const devUrl = process.env.DOCS_DEV_URL ?? 'http://127.0.0.1:3000';
const pnpm = process.env.npm_execpath;
assert(pnpm, 'Run this check through pnpm run test:hmr in the docs package.');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const failures = new Set();
  page.on('response', response => {
    if (/\/packages\/(core|react)\/dist\//.test(response.url()) && response.status() >= 400)
      failures.add(`bundle ${response.status()}: ${new URL(response.url()).pathname}`);
  });
  page.on('pageerror', error => failures.add(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /CalendarProvider|Failed to reload/.test(message.text()))
      failures.add(message.text());
  });

  await page.goto(new URL('/docs/playground#view=month&date=2026-10-23', devUrl).href);
  const calendar = page
    .frameLocator('iframe[title="Calendar preview"]')
    .getByRole('region', { name: 'Calendar', exact: true });
  await calendar.waitFor({ timeout: 30_000 });
  console.log('Preview ready; rebuilding core and React.');
  for (const name of ['core', 'react'])
    await promisify(execFile)(pnpm, ['--filter', `@calendar-tsx/${name}`, 'run', 'build'], {
      cwd: root,
      timeout: 60_000,
    });

  // Build completion precedes the browser's asynchronous hot-update requests.
  await page.waitForTimeout(1500);
  try {
    await calendar.waitFor({ timeout: 10_000 });
  } catch {
    failures.add('calendar disappeared after rebuilding');
  }
  assert.equal(failures.size, 0, [...failures].join('\n'));
  console.log('PASS: preview survives package rebuilds without missing bundles or context errors.');
} finally {
  await browser.close();
}
