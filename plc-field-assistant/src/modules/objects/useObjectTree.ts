import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type PlcObject } from '../../db/schema';

export interface FlatObjectNode {
  object: PlcObject;
  depth: number;
  path: string;
}

/** Строит плоский список дерева объектов (линия → шкаф → …) для выпадающих списков. */
export function useObjectTree() {
  const objects = useLiveQuery(() => db.objects.toArray(), []) ?? [];

  return useMemo(() => {
    const byParent = new Map<string | null, PlcObject[]>();
    for (const o of objects) {
      const list = byParent.get(o.parentId) ?? [];
      list.push(o);
      byParent.set(o.parentId, list);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    const flat: FlatObjectNode[] = [];
    function walk(parentId: string | null, depth: number, prefix: string) {
      for (const obj of byParent.get(parentId) ?? []) {
        const path = prefix ? `${prefix} / ${obj.name}` : obj.name;
        flat.push({ object: obj, depth, path });
        walk(obj.id, depth + 1, path);
      }
    }
    walk(null, 0, '');

    const pathById = new Map(flat.map((n) => [n.object.id, n.path]));
    return { objects, flat, pathById };
  }, [objects]);
}
