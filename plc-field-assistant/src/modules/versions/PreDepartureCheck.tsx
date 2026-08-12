import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/schema';
import { Card, Field, Select, TextInput } from '../../components/ui';
import { useObjectTree } from '../objects/useObjectTree';

const STALE_DAYS = 30;

export function PreDepartureCheck() {
  const { flat } = useObjectTree();
  const [objectId, setObjectId] = useState('');
  const [myEnv, setMyEnv] = useState(() => localStorage.getItem('pfa-my-env') || '');

  const versions = useLiveQuery(() => db.projectVersions.where({ objectId }).toArray(), [objectId]) ?? [];

  const latest = useMemo(() => {
    if (versions.length === 0) return null;
    return [...versions].sort((a, b) => b.date - a.date)[0];
  }, [versions]);

  function updateMyEnv(v: string) {
    setMyEnv(v);
    localStorage.setItem('pfa-my-env', v);
  }

  const daysSinceBackup = latest ? Math.floor((Date.now() - latest.date) / (1000 * 60 * 60 * 24)) : null;
  const envMismatch = latest && myEnv.trim() && latest.devEnvVersion.trim().toLowerCase() !== myEnv.trim().toLowerCase();

  return (
    <Card title="Проверка перед выездом на объект">
      <Field label="Объект">
        <Select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
          <option value="">— выбери объект —</option>
          {flat.map((n) => <option key={n.object.id} value={n.object.id}>{n.path}</option>)}
        </Select>
      </Field>
      <Field label="Версия среды разработки у меня сейчас" hint="сохраняется, чтобы не вводить каждый раз">
        <TextInput value={myEnv} onChange={(e) => updateMyEnv(e.target.value)} placeholder="TIA Portal V18" />
      </Field>

      {!objectId && <p className="text-sm text-slate-400">Выбери объект, чтобы проверить.</p>}

      {objectId && !latest && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
          По этому объекту нет ни одной записи о версии — данных для сверки нет.
        </div>
      )}

      {latest && (
        <div className="space-y-2">
          <div className={`rounded-lg border p-3 text-sm ${envMismatch ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300' : 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300'}`}>
            {envMismatch ? (
              <>⚠ На объекте зафиксирована среда «{latest.devEnvVersion}», а у тебя «{myEnv}» — старая версия может не открыть проект. Проверь перед выездом.</>
            ) : myEnv.trim() ? (
              <>✓ Версии среды совпадают ({latest.devEnvVersion || 'не указана'}).</>
            ) : (
              <>Последняя зафиксированная среда на объекте: {latest.devEnvVersion || 'не указана'}.</>
            )}
          </div>
          {daysSinceBackup !== null && daysSinceBackup > STALE_DAYS && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
              ⚠ Последняя запись о бэкапе — {daysSinceBackup} дн. назад ({new Date(latest.date).toLocaleDateString('ru-RU')}). Стоит уточнить актуальность.
            </div>
          )}
          <p className="text-xs text-slate-500">
            Текущая версия проекта: <b>{latest.version}</b>{latest.isInController ? ' (в контроллере)' : ''}, архив: {latest.backupLocation || 'не указано'}.
          </p>
        </div>
      )}
    </Card>
  );
}
