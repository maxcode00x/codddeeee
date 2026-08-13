import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/schema';
import { Card, ResultRow } from '../../components/ui';
import { useObjectTree } from '../objects/useObjectTree';

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function StatisticsPage() {
  const faultLogs = useLiveQuery(() => db.faultLogs.toArray(), []) ?? [];
  const ioPoints = useLiveQuery(() => db.ioPoints.toArray(), []) ?? [];
  const punchList = useLiveQuery(() => db.punchList.toArray(), []) ?? [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) ?? [];
  const { pathById } = useObjectTree();

  const totalDowntime = useMemo(() => faultLogs.reduce((sum, l) => sum + l.downtimeMin, 0), [faultLogs]);

  const byObject = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of faultLogs) {
      const key = (l.objectId && pathById.get(l.objectId)) || l.objectPath || 'Без объекта';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return topN(map, 5);
  }, [faultLogs, pathById]);

  const byTag = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of faultLogs) {
      for (const t of l.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return topN(map, 8);
  }, [faultLogs]);

  const ioStats = useMemo(() => {
    const total = ioPoints.length;
    const checked = ioPoints.filter((p) => p.status === 'checked').length;
    const defect = ioPoints.filter((p) => p.status === 'defect').length;
    const fixed = ioPoints.filter((p) => p.status === 'fixed').length;
    return { total, checked, defect, fixed, notChecked: total - checked - defect - fixed };
  }, [ioPoints]);

  const punchStats = useMemo(() => {
    const openA = punchList.filter((p) => p.priority === 'A' && p.status === 'open').length;
    const openB = punchList.filter((p) => p.priority === 'B' && p.status === 'open').length;
    const openC = punchList.filter((p) => p.priority === 'C' && p.status === 'open').length;
    const closed = punchList.filter((p) => p.status === 'closed').length;
    return { openA, openB, openC, closed, total: punchList.length };
  }, [punchList]);

  const equipmentByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of equipment) map.set(e.type, (map.get(e.type) ?? 0) + 1);
    return [...map.entries()];
  }, [equipment]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Card title="Общее">
        <ResultRow label="Всего записей в журнале" value={faultLogs.length} />
        <ResultRow label="Суммарный простой" value={`${totalDowntime} мин`} />
        <ResultRow label="Точек I/O" value={ioPoints.length} />
        <ResultRow label="Устройств в паспорте" value={equipment.length} />
      </Card>

      {byObject.length > 0 && (
        <Card title="Топ объектов по числу случаев">
          {byObject.map(([name, count]) => (
            <ResultRow key={name} label={name} value={count} />
          ))}
        </Card>
      )}

      {byTag.length > 0 && (
        <Card title="Частые теги">
          {byTag.map(([tag, count]) => (
            <ResultRow key={tag} label={tag} value={count} />
          ))}
        </Card>
      )}

      <Card title="Таблица I/O — статусы">
        <ResultRow label="Не проверено" value={ioStats.notChecked} />
        <ResultRow label="Проверено" value={ioStats.checked} />
        <ResultRow label="Неисправно" value={ioStats.defect} danger={ioStats.defect > 0} />
        <ResultRow label="Устранено" value={ioStats.fixed} />
      </Card>

      <Card title="Замечания">
        <ResultRow label="Открыто, приоритет A" value={punchStats.openA} danger={punchStats.openA > 0} />
        <ResultRow label="Открыто, приоритет B" value={punchStats.openB} />
        <ResultRow label="Открыто, приоритет C" value={punchStats.openC} />
        <ResultRow label="Закрыто" value={punchStats.closed} />
      </Card>

      {equipmentByType.length > 0 && (
        <Card title="Оборудование по типам">
          {equipmentByType.map(([type, count]) => (
            <ResultRow key={type} label={type} value={count} />
          ))}
        </Card>
      )}
    </div>
  );
}
