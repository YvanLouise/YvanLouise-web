export function resolveFeaturedWorks<T extends { id: string }>(items: T[], featuredIds: string[] | undefined, limit = 6, fallbackCount = 3): T[] {
  const list = Array.isArray(items) ? items : [];
  const ids = Array.isArray(featuredIds) ? featuredIds.map((item) => String(item).trim()).filter(Boolean) : [];

  if (!list.length) {
    return [];
  }

  if (!ids.length) {
    return list.slice(0, fallbackCount);
  }

  const itemMap = new Map(list.map((item) => [item.id, item]));
  const selected = ids.map((id) => itemMap.get(id)).filter((item): item is T => Boolean(item));

  return selected.length ? selected.slice(0, limit) : list.slice(0, fallbackCount);
}
