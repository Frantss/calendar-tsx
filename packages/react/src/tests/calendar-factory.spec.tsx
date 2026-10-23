import { createRef } from 'react';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { calendarFactory_elements as calendar, calendarProps_merge } from '#calendar-factory';

it('merges props: later values win, handlers chain in order, classNames join, styles merge', async () => {
  const calls: string[] = [];
  const merged = calendarProps_merge(
    { id: 'a', className: 'part', style: { color: 'red', top: 1 }, onClick: () => calls.push('part') },
    { id: 'b', className: 'consumer', style: { top: 2 }, onClick: () => calls.push('consumer') },
    { title: undefined },
  );

  merged['onClick']();

  expect(merged).toMatchObject({ id: 'b', className: 'part consumer', style: { color: 'red', top: 2 } });
  expect(calls).toEqual(['part', 'consumer']);
  expect('title' in merged).toBe(true);
});

it('keeps an earlier value when a later source passes undefined', async () => {
  expect(calendarProps_merge({ id: 'a' }, { id: undefined })['id']).toBe('a');
});

const setup = async (element: React.ReactNode) => {
  await render(element);

  return { ui: { button: page.getByRole('button') } };
};

it('renders the default element with its props and ref when there is no render prop', async () => {
  const ref = createRef<HTMLButtonElement>();
  const { ui } = await setup(
    <calendar.button data-part='trigger' ref={ref}>
      Go
    </calendar.button>,
  );

  await expect.element(ui.button).toHaveAttribute('data-part', 'trigger');
  expect(ref.current?.tagName).toBe('BUTTON');
});

it('merges the part props into a render element, letting the element win and chaining handlers', async () => {
  const ref = createRef<HTMLButtonElement>();
  const onPartClick = vi.fn();
  const onElementClick = vi.fn();
  const { ui } = await setup(
    <calendar.button
      data-part='trigger'
      className='part'
      title='part'
      onClick={onPartClick}
      ref={ref}
      render={<button type='button' className='consumer' title='consumer' onClick={onElementClick} />}
    >
      Go
    </calendar.button>,
  );

  await ui.button.click();

  await expect.element(ui.button).toHaveAttribute('data-part', 'trigger');
  await expect.element(ui.button).toHaveAttribute('class', 'part consumer');
  await expect.element(ui.button).toHaveAttribute('title', 'consumer');
  await expect.element(ui.button).toHaveTextContent('Go');
  expect(onPartClick).toHaveBeenCalledOnce();
  expect(onElementClick).toHaveBeenCalledOnce();
  expect(ref.current?.className).toBe('part consumer');
});

it('hands the props and state to a render function and still composes the ref', async () => {
  const ref = createRef<HTMLButtonElement>();
  const renderFn = vi.fn((props: Record<string, unknown>, state: { count: number }) => <button {...props}>+{state.count}</button>);
  const { ui } = await setup(<calendar.button data-part='overflow' state={{ count: 3 }} ref={ref} render={renderFn} />);

  await expect.element(ui.button).toHaveTextContent('+3');
  await expect.element(ui.button).toHaveAttribute('data-part', 'overflow');
  expect(renderFn.mock.calls[0]?.[0]).not.toHaveProperty('ref');
  expect(ref.current?.tagName).toBe('BUTTON');
});

it('lets a render function return something other than an element', async () => {
  await render(<calendar.div render={() => 'plain text'} />);

  await expect.element(page.getByText('plain text')).toBeInTheDocument();
});
