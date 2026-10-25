import type { Calendar_Resource } from '#calendar/calendar.types';
import type { Calendar_ResourceNode } from '#resources/resource.types';

export const calendarResources_build = <T>(resources: Calendar_Resource<T>[]): Calendar_ResourceNode<T>[] => {
  const byId = new Map<string, Calendar_Resource<T>>();
  const children = new Map<string, Calendar_Resource<T>[]>();
  const roots: Calendar_Resource<T>[] = [];
  for (const resource of resources) {
    if (byId.has(resource.id)) throw new Error(`[calendar] duplicate resource id "${resource.id}"`);
    byId.set(resource.id, resource);
  }
  for (const resource of resources) {
    if (resource.parentId === undefined) roots.push(resource);
    else {
      if (!byId.has(resource.parentId))
        throw new Error(`[calendar] resource "${resource.id}" has missing parent "${resource.parentId}"`);
      const siblings = children.get(resource.parentId) ?? [];
      siblings.push(resource);
      children.set(resource.parentId, siblings);
    }
  }
  const visited = new Set<string>();
  for (const resource of resources) {
    const path = new Set<string>();
    let current: Calendar_Resource<T> | undefined = resource;
    while (current && !visited.has(current.id)) {
      if (path.has(current.id)) throw new Error(`[calendar] resource cycle at "${current.id}"`);
      path.add(current.id);
      current = current.parentId === undefined ? undefined : byId.get(current.parentId);
    }
    path.forEach(id => visited.add(id));
  }
  const nodes: Calendar_ResourceNode<T>[] = [];
  const stack = roots.map(resource => ({ resource, depth: 0 })).reverse();
  while (stack.length) {
    const node = stack.pop()!;
    const descendants = children.get(node.resource.id) ?? [];
    nodes.push({ ...node, hasChildren: descendants.length > 0, isExpanded: descendants.length > 0 });
    for (let index = descendants.length - 1; index >= 0; index--)
      stack.push({ resource: descendants[index]!, depth: node.depth + 1 });
  }
  return nodes;
};

export const calendarResources_visible = <T>(nodes: Calendar_ResourceNode<T>[]) => {
  let collapsedDepth = Infinity;
  return nodes.filter(node => {
    if (node.depth > collapsedDepth) return false;
    collapsedDepth = node.hasChildren && !node.isExpanded ? node.depth : Infinity;
    return true;
  });
};
