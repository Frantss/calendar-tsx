import type { Calendar_TimeGridOverlap } from '#layouts/time-grid/time-grid.types';

type Interval = { startMs: number; endMs: number };

const overlaps = (a: Interval, b: Interval) => a.startMs < b.endMs && b.startMs < a.endMs;

/**
 * Lane assignment per overlap cluster: events that transitively overlap form a cluster, each takes
 * the lowest lane free at its start, and the whole cluster shares the cluster's lane count.
 * Touching intervals (one ends when the next starts) do not overlap.
 *
 * Horizontal geometry (D38): an event spans from its lane up to the first later lane holding an
 * event it overlaps, or to the column's edge, so it expands into free lanes. `'cascade'` doubles that
 * width, capped at the edge, so later lanes cover at most half of it.
 */
export const layoutLanes_assign = <T extends Interval>(items: T[], overlap: Calendar_TimeGridOverlap) => {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs || b.endMs - a.endMs);
  const result: (T & { lane: number; lanes: number; inlineStart: number; inlineSize: number })[] = [];
  let cluster: (T & { lane: number })[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map(item => item.lane + 1));

    for (const item of cluster) {
      const next = Math.min(
        lanes,
        ...cluster.filter(other => other.lane > item.lane && overlaps(other, item)).map(other => other.lane),
      );
      const inlineStart = item.lane / lanes;
      const sideBySide = (next - item.lane) / lanes;

      result.push({
        ...item,
        lanes,
        inlineStart,
        inlineSize: overlap === 'cascade' ? Math.min(2 * sideBySide, 1 - inlineStart) : sideBySide,
      });
    }

    cluster = [];
  };

  for (const item of sorted) {
    if (item.startMs >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }

    const taken = new Set(cluster.filter(other => other.endMs > item.startMs).map(other => other.lane));
    let lane = 0;

    while (taken.has(lane)) lane++;

    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd, item.endMs);
  }

  flush();

  return result;
};
