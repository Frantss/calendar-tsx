type Interval = { startMs: number; endMs: number };

/**
 * Lane assignment per overlap cluster: events that transitively overlap form a cluster, each takes
 * the lowest lane free at its start, and the whole cluster shares the cluster's lane count.
 * Touching intervals (one ends when the next starts) do not overlap.
 */
export const layoutLanes_assign = <T extends Interval>(items: T[]) => {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs || b.endMs - a.endMs);
  const result: (T & { lane: number; lanes: number })[] = [];
  let cluster: (T & { lane: number })[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map(item => item.lane + 1));

    for (const item of cluster) result.push({ ...item, lanes });
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
