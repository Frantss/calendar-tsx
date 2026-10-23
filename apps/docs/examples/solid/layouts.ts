import { useCalendarSelector } from '@calendar-tsx/solid';

import type { State } from '../core/setup';

// #region narrow
type Layout = State['layout'];

/** The current layout when it is of `kind`, for `<Show when={…}>`. */
export const useLayout = <TKind extends Layout['kind']>(kind: TKind) => {
  const layout = useCalendarSelector((state: State) => state.layout);

  return () => {
    const current = layout();

    return current.kind === kind ? (current as Extract<Layout, { kind: TKind }>) : undefined;
  };
};
// #endregion narrow
