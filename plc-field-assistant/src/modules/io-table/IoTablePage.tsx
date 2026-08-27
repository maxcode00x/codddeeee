import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { newId, type IoPoint, type IoStatus } from '../../db/schema';
import { parseIoCsv, type CsvImportError } from '../../lib/csv';
import { exportIoProtocolPdf } from '../../lib/pdf';
import { Card, GhostButton, PrimaryButton, Select } from '../../components/ui';

const STATUS_META: Record<IoStatus, { label: string; color: string }> = {
  not_checked: { label: 'не проверено', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  checked: { label: 'проверено', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  defect: { label: 'дефект', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  fixed: { label: 'исправлено', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
};

function ProgressBar({ points }: { points: IoPoint[] }) {
  const total = points.length;
  const done = points.filter((p) => p.status !== 'not_checked').length;
  const defects = points.filter((p) => p.status === 'defect').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{done}/{total} проверено{defects > 0 && `, дефектов: ${defects}`}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function IoTablePage() {
  const [filter, setFilter] = useState<'all' | IoStatus>('all');
  const [cabinetFilter, setCabinetFilter] = useState('');
  const [importErrors, setImportErrors] = useState<CsvImportError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const points = useLiveQuery(() => db.ioPoints.toArray(), []) ?? [];

  const cabinets = useMemo(() => [...new Set(points.map((p) => p.cabinet).filter(Boolean))], [points]);

  const filtered = useMemo(() => {
    return points.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (cabinetFilter && p.cabinet !== cabinetFilter) return false;
      return true;
    });
  }, [points, filter, cabinetFilter]);

  async function handleFile(file: File) {
    const text = await file.text();
    const { rows, errors } = parseIoCsv(text);
    setImportErrors(errors);
    if (rows.length === 0) return;
    const records: IoPoint[] = rows.map((r) => ({
      id: newId(),
      objectId: null,
      address: r.address,
      tagName: r.tagName,
      type: r.type,
      contactType: r.contactType,
      description: r.description,
      cable: r.cable,
      cabinet: r.cabinet,
      status: 'not_checked',
      note: '',
      photoId: null,
      checkedAt: null,
    }));
    await db.ioPoints.bulkAdd(records);
  }

  async function setStatus(id: string, status: IoStatus) {
    await db.ioPoints.update(id, { status, checkedAt: Date.now() });
  }

  async function clearAll() {
    await db.ioPoints.clear();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Card title="Импорт таблицы I/O">
        <p className="mb-2 text-sm text-slate-500">
          CSV с колонками: Адрес, Имя тега, Тип (DI/DO/AI/AO), Контакт (NO/NC), Описание, Кабель, Шкаф.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <PrimaryButton onClick={() => fileInputRef.current?.click()}>Загрузить CSV</PrimaryButton>
          <GhostButton onClick={() => exportIoProtocolPdf(filtered, 'Протокол прозвонки I/O')}>Экспорт в PDF</GhostButton>
          {points.length > 0 && <GhostButton onClick={clearAll}>Очистить таблицу</GhostButton>}
        </div>
        {importErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">Проблемы при импорте:</p>
            <ul className="list-inside list-disc">
              {importErrors.map((e, i) => (
                <li key={i}>{e.row > 0 ? `Строка ${e.row}: ` : ''}{e.message}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Точки ввода-вывода">
        <ProgressBar points={points} />
        <div className="mb-3 flex flex-wrap gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | IoStatus)} className="w-auto">
            <option value="all">Все статусы</option>
            <option value="not_checked">Только непроверенные</option>
            <option value="defect">Только дефекты</option>
            <option value="checked">Проверенные</option>
            <option value="fixed">Исправленные</option>
          </Select>
          {cabinets.length > 0 && (
            <Select value={cabinetFilter} onChange={(e) => setCabinetFilter(e.target.value)} className="w-auto">
              <option value="">Все шкафы</option>
              {cabinets.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">Нет точек — импортируй CSV или список пуст по фильтру.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-100 p-2 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{p.address}</span>
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">{p.tagName}</span>
                    {p.contactType && (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-bold ${p.contactType === 'NC' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
                        {p.contactType}
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[p.status].color}`}>
                    {STATUS_META[p.status].label}
                  </span>
                </div>
                {(p.description || p.cabinet || p.cable) && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[p.type, p.cabinet, p.cable, p.description].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex gap-1">
                  {(['not_checked', 'checked', 'defect', 'fixed'] as IoStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(p.id, s)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${p.status === s ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
