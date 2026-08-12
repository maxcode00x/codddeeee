import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type FaultLog } from '../../db/schema';
import { createSearch, search } from '../../lib/search';
import { Card, PrimaryButton, ResultRow, TextInput } from '../../components/ui';
import { FaultLogForm } from './FaultLogForm';

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function FaultLogItem({ item }: { item: FaultLog }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.symptom}</span>
        <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(item.createdAt)}</span>
      </div>
      {item.objectPath && <p className="text-xs text-slate-500">{item.objectPath}</p>}
      {item.cause && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300"><b>Причина:</b> {item.cause}</p>}
      {item.fix && <p className="text-sm text-slate-600 dark:text-slate-300"><b>Устранено:</b> {item.fix}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {item.downtimeMin > 0 && <span>простой {item.downtimeMin} мин</span>}
        {item.tags.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">{t}</span>
        ))}
      </div>
    </div>
  );
}

function TopCauses({ logs }: { logs: FaultLog[] }) {
  const byCause = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const key = l.cause.trim() || l.symptom.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + l.downtimeMin);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);

  if (byCause.length === 0) return null;

  return (
    <Card title="Топ причин простоя">
      {byCause.map(([cause, min]) => (
        <ResultRow key={cause} label={cause} value={`${min} мин`} />
      ))}
    </Card>
  );
}

export function FaultLogPage() {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const logs = useLiveQuery(() => db.faultLogs.orderBy('createdAt').reverse().toArray(), []) ?? [];

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const fuse = createSearch(logs, ['symptom', 'cause', 'fix', 'objectPath', 'tags']);
    return search(fuse, query);
  }, [logs, query]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex gap-2">
        <TextInput
          placeholder="Поиск по симптому — «конвейер 2 не пускается»"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <PrimaryButton onClick={() => setShowForm((v) => !v)}>{showForm ? 'Отмена' : '+ Запись'}</PrimaryButton>
      </div>

      {showForm && <FaultLogForm onDone={() => setShowForm(false)} />}

      {!query && <TopCauses logs={logs} />}

      <Card title={query ? `Найдено: ${filtered.length}` : `Все записи: ${logs.length}`}>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">Пока пусто.</p>
        ) : (
          filtered.map((item) => <FaultLogItem key={item.id} item={item} />)
        )}
      </Card>
    </div>
  );
}
