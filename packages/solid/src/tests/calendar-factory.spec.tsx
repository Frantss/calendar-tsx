import { createSignal } from 'solid-js';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';
import { tests_render } from '#tests/utils/render';

it('merges props: later values win, handlers chain in order, classes join, styles merge', async () => {
  const calls: string[] = [];
  const merged = calendarProps_merge(
    { id: 'a', class: 'part', style: { color: 'red', top: '1px' }, onClick: () => calls.push('part') },
    { id: 'b', class: 'consumer', style: { top: '2px' }, onClick: () => calls.push('consumer') },
    { title: undefined },
  );

  merged['onClick']();

  expect(merged).toMatchObject({ id: 'b', class: 'part consumer', style: { color: 'red', top: '2px' } });
  expect(calls).toEqual(['part', 'consumer']);
  expect('title' in merged).toBe(true);
});

it('keeps an earlier value when a later source passes undefined', async () => {
  expect(calendarProps_merge({ id: 'a' }, { id: undefined })['id']).toBe('a');
});

it('reads function sources lazily, so the merged props follow signals', async () => {
  const [id, setId] = createSignal('a');
  const merged = calendarProps_merge(() => ({ id: id() }));

  setId('b');

  expect(merged['id']).toBe('b');
});

it('renders the default element with its props and ref when there is no render prop', async () => {
  let ref: HTMLButtonElement | undefined;

  tests_render(() => (
    <calendar.button data-part='trigger' ref={node => (ref = node)}>
      Go
    </calendar.button>
  ));

  await expect.element(page.getByRole('button')).toHaveAttribute('data-part', 'trigger');
  expect(ref?.tagName).toBe('BUTTON');
});

it('hands a props function and the state to render, merging user props and composing refs', async () => {
  let partRef: HTMLButtonElement | undefined;
  let userRef: HTMLButtonElement | undefined;
  const onPartClick = vi.fn();
  const onUserClick = vi.fn();

  tests_render(() => (
    <calendar.button
      data-part='overflow'
      class='part'
      title='part'
      onClick={onPartClick}
      state={{ count: 3 }}
      ref={(node: HTMLButtonElement) => (partRef = node)}
      render={(props, state) => (
        <button {...props({ class: 'consumer', title: 'consumer', onClick: onUserClick, ref: (node: HTMLButtonElement) => (userRef = node) })}>
          +{(state() as { count: number }).count}
        </button>
      )}
    />
  ));

  const button = page.getByRole('button');

  await button.click();

  await expect.element(button).toHaveTextContent('+3');
  await expect.element(button).toHaveAttribute('data-part', 'overflow');
  await expect.element(button).toHaveAttribute('class', 'part consumer');
  await expect.element(button).toHaveAttribute('title', 'consumer');
  expect(onPartClick).toHaveBeenCalledOnce();
  expect(onUserClick).toHaveBeenCalledOnce();
  expect(partRef?.tagName).toBe('BUTTON');
  expect(userRef).toBe(partRef);
});

it('lets a render function return something other than an element', async () => {
  tests_render(() => <calendar.div render={() => 'plain text'} />);

  await expect.element(page.getByText('plain text')).toBeInTheDocument();
});
