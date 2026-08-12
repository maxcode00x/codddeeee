import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/schema';
import { Card, PrimaryButton } from '../../components/ui';
import { ProjectVersionForm } from './ProjectVersionForm';
import { PreDepartureCheck } from './PreDepartureCheck';
import { useObjectTree } from '../objects/useObjectTree';

export function ProjectVersionsPage() {
  const [tab, setTab] = useState<'history' | 'check'>('history');
  const [showForm, setShowForm] = useState(false);

  const versions = useLiveQuery(() => db.projectVersions.orderBy('date').reverse().toArray(), []) ?? [];
  const { pathById } = useObjectTree();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof versions>();
    for (const v of versions) {
      const key = v.objectId;
      const list = map.get(key) ?? [];
      list.push(v);
      map.set(key, list);
    }
    return map;
  }, [versions]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('history')} className={`min-h-10 rounded-lg px-3 text-sm font-medium ${tab === 'history' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>История</button>
        <button onClick={() => setTab('check')} className={`min-h-10 rounded-lg px-3 text-sm font-medium ${tab === 'check' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>Проверка перед объектом</button>
        <div className="flex-1" />
        {tab === 'history' && <PrimaryButton onClick={() => setShowForm((v) => !v)}>{showForm ? 'Отмена' : '+ Версия'}</PrimaryButton>}
      </div>

      {tab === 'check' ? (
        <PreDepartureCheck />
      ) : (
        <>
          {showForm && <ProjectVersionForm defaultObjectId={null} onDone={() => setShowForm(false)} />}
          {[...grouped.entries()].length === 0 ? (
            <Card title="История"><p className="text-sm text-slate-400">Пока нет записей.</p></Card>
          ) : (
            [...grouped.entries()].map(([objectId, list]) => (
              <Card key={objectId} title={pathById.get(objectId) || 'Без объекта'}>
                {list.map((v) => (
                  <div key={v.id} className="border-b border-slate-100 py-2 last:border-0 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {v.version} {v.isInController && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">в контроллере</span>}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(v.date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    {v.devEnvVersion && <p className="text-xs text-slate-500">Среда: {v.devEnvVersion}</p>}
                    {v.changeDescription && <p className="text-sm text-slate-600 dark:text-slate-300">{v.changeDescription}</p>}
                    <p className="text-xs text-slate-400">
                      {[v.changedBy, v.backupLocation && `архив: ${v.backupLocation}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ))}
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
