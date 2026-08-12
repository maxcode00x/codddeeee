import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type PunchItem, type PunchPriority, type PunchStatus } from '../../db/schema';
import { exportPunchListPdf } from '../../lib/pdf';
import { Card, GhostButton, PrimaryButton, Select } from '../../components/ui';
import { PunchListForm } from './PunchListForm';
import { useObjectTree } from '../objects/useObjectTree';

const PRIORITY_META: Record<PunchPriority, { label: string; color: string }> = {
  A: { label: 'A · мешает пуску', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  B: { label: 'B · до приёмки', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  C: { label: 'C · косметика', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

function formatDate(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ru-RU');
}

export function PunchListPage() {
  const [showForm, setShowForm] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | PunchPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PunchStatus>('open');

  const items = useLiveQuery(() => db.punchList.toArray(), []) ?? [];
  const { pathById } = useObjectTree();

  const openACount = useMemo(() => items.filter((i) => i.priority === 'A' && i.status === 'open').length, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((i) => (priorityFilter === 'all' ? true : i.priority === priorityFilter))
      .filter((i) => (statusFilter === 'all' ? true : i.status === statusFilter))
      .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));
  }, [items, priorityFilter, statusFilter]);

  async function toggleStatus(item: PunchItem) {
    await db.punchList.update(item.id, { status: item.status === 'open' ? 'closed' : 'open' });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {openACount > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          ⚠ Открытых пунктов категории A: {openACount} — объект нельзя сдавать, пока их не закрыли.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | PunchPriority)} className="w-auto">
          <option value="all">Все приоритеты</option>
          <option value="A">Только A</option>
          <option value="B">Только B</option>
          <option value="C">Только C</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | PunchStatus)} className="w-auto">
          <option value="open">Открытые</option>
          <option value="closed">Закрытые</option>
          <option value="all">Все статусы</option>
        </Select>
        <div className="flex-1" />
        <GhostButton onClick={() => exportPunchListPdf(filtered, pathById, 'Список замечаний')}>PDF</GhostButton>
        <PrimaryButton onClick={() => setShowForm((v) => !v)}>{showForm ? 'Отмена' : '+ Замечание'}</PrimaryButton>
      </div>

      {showForm && <PunchListForm onDone={() => setShowForm(false)} />}

      <Card title={`Замечания: ${filtered.length}`}>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">Пусто.</p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="border-b border-slate-100 py-3 last:border-0 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_META[item.priority].color}`}>
                    {PRIORITY_META[item.priority].label}
                  </span>
                  <span className={item.status === 'closed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}>
                    {item.description}
                  </span>
                </div>
                <button
                  onClick={() => toggleStatus(item)}
                  className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${item.status === 'open' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}
                >
                  {item.status === 'open' ? 'Закрыть' : 'Открыть заново'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {[item.objectId && pathById.get(item.objectId), item.responsible, `срок: ${formatDate(item.deadline)}`].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
