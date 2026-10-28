import type { JSX } from '@solidjs/web';
import { render } from '@solidjs/web';
import { flush } from 'solid-js';
import { afterEach } from 'vitest';

const disposers = new Set<() => void>();
afterEach(() => {
  for (const dispose of disposers) dispose();
});

export const tests_render = (ui: () => JSX.Element) => {
  const container = document.body.appendChild(document.createElement('div'));
  const dispose = render(ui, container);
  flush();
  const unmount = () => {
    if (!disposers.delete(unmount)) return;
    dispose();
    container.remove();
  };
  disposers.add(unmount);
  return { container, unmount };
};
