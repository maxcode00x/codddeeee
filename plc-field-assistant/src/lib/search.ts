import Fuse, { type IFuseOptions } from 'fuse.js';

/**
 * Общая обёртка нечёткого полнотекстового поиска — используется и
 * журналом неисправностей (поиск по симптому), и справочником
 * (поиск по главам). Толерантность к опечаткам через threshold Fuse.
 */
export function createSearch<T>(items: T[], keys: (keyof T | string)[], options?: IFuseOptions<T>) {
  return new Fuse(items, {
    keys: keys as string[],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    ...options,
  });
}

export function search<T>(fuse: Fuse<T>, query: string): T[] {
  const q = query.trim();
  if (!q) return [];
  return fuse.search(q).map((r) => r.item);
}
