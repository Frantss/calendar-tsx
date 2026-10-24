import type { JSX } from 'solid-js';
import { render } from 'solid-js/web';
import { beforeEach } from 'vitest';

const mounted = new Set<() => void>();

// registered on import, as `vitest-browser-react` does, so every test starts from an empty body
beforeEach(() => {
  for (const unmount of mounted) unmount();
});

/** Mounts `ui` into a fresh container; `unmount` disposes the Solid root and removes the container. */
export const tests_render = (ui: () => JSX.Element) => {
  const container = document.body.appendChild(document.createElement('div'));
  const dispose = render(ui, container);
  const unmount = () => {
    if (!mounted.delete(unmount)) return;

    dispose();
    container.remove();
  };

  mounted.add(unmount);

  return { container, unmount };
};
