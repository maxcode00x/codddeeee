import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/schema';
import { Card } from '../../components/ui';
import logoMark from '../../assets/logo-mark.png';

// Число заданий тренажёра фиксировано в index.html (TASKS, уровни 1-4) —
// держим в синхроне вручную, как и остальные места, знающие об этой цифре.
const TRAINER_TOTAL_TASKS = 10;

// Тренажёр и приложение обслуживаются с одного origin (iframe грузится по
// относительному пути), поэтому localStorage у них общий и читается напрямую
// без моста — кроме Electron: file:// иногда даёт iframe отдельное хранилище
// в зависимости от версии Chromium, тогда счётчик тихо покажет 0, не упадёт.
function useTrainerProgress() {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem('plcTrainerCompleted');
      const done = raw ? (JSON.parse(raw) as number[]).length : 0;
      return Math.min(done, TRAINER_TOTAL_TASKS);
    } catch {
      return 0;
    }
  }, []);
}

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function MonthlyFaultChart({ createdAt }: { createdAt: number[] }) {
  const counts = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTH_LABELS[d.getMonth()], count: 0 });
    }
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
    for (const ts of createdAt) {
      if (ts < startMonth) continue;
      const d = new Date(ts);
      const idx = 11 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
      if (idx >= 0 && idx < 12) buckets[idx].count += 1;
    }
    return buckets;
  }, [createdAt]);

  const max = Math.max(1, ...counts.map((b) => b.count));
  const w = 300, h = 110, barW = w / counts.length;

  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label="Неисправности по месяцам">
      {counts.map((b, i) => {
        const barH = (b.count / max) * (h - 8);
        const x = i * barW + barW * 0.2;
        return (
          <g key={i}>
            <title>{`${b.label}: ${b.count}`}</title>
            <rect
              x={x}
              y={h - barH}
              width={barW * 0.6}
              height={barH}
              rx={2}
              className="fill-green-600 dark:fill-green-500"
            />
            <text x={x + barW * 0.3} y={h + 14} textAnchor="middle" fontSize="8" className="fill-slate-400">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardPage() {
  const faultLogs = useLiveQuery(() => db.faultLogs.toArray(), []) ?? [];
  const ioPoints = useLiveQuery(() => db.ioPoints.toArray(), []) ?? [];
  const punchList = useLiveQuery(() => db.punchList.toArray(), []) ?? [];
  const trainerDone = useTrainerProgress();

  const recentLogs = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return faultLogs.filter((l) => l.createdAt >= since).length;
  }, [faultLogs]);

  const ioChecked = ioPoints.filter((p) => p.status !== 'not_checked').length;
  const ioPct = ioPoints.length ? Math.round((ioChecked / ioPoints.length) * 100) : 0;
  const openPunch = punchList.filter((p) => p.status === 'open').length;

  const latestLogs = useMemo(
    () => [...faultLogs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [faultLogs],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Добро пожаловать!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Обзор состояния объекта и вашего прогресса в тренажёре.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Журнал за 30 дней"
          value={String(recentLogs)}
          hint={`всего записей: ${faultLogs.length}`}
          to="/"
          linkLabel="Перейти в журнал"
        />
        <StatCard
          label="Точки I/O проверено"
          value={ioPoints.length ? `${ioChecked} / ${ioPoints.length}` : '—'}
          hint={ioPoints.length ? `${ioPct}%` : 'нет точек'}
          to="/io"
          linkLabel="Открыть таблицу I/O"
        />
        <StatCard
          label="Заданий тренажёра"
          value={`${trainerDone} / ${TRAINER_TOTAL_TASKS}`}
          hint={trainerDone >= TRAINER_TOTAL_TASKS ? 'всё пройдено' : 'продолжайте обучение'}
          to="/trainer"
          linkLabel="Продолжить обучение"
        />
        <StatCard
          label="Замечаний в работе"
          value={String(openPunch)}
          hint="приоритеты A/B/C"
          to="/punch"
          linkLabel="Открыть замечания"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Неисправности по месяцам">
          {faultLogs.length === 0 ? (
            <p className="text-sm text-slate-400">Пока нет записей в журнале.</p>
          ) : (
            <MonthlyFaultChart createdAt={faultLogs.map((l) => l.createdAt)} />
          )}
        </Card>

        <Card title="Быстрый доступ">
          <div className="flex flex-col gap-2">
            <QuickLink to="/" emoji="🛠" label="Новая запись в журнал" />
            <QuickLink to="/io" emoji="🔌" label="Импорт CSV точек I/O" />
            <QuickLink to="/io" emoji="📄" label="Экспорт протокола I/O в PDF" />
            <QuickLink to="/punch" emoji="📋" label="Новое замечание" />
            <QuickLink to="/wizard" emoji="🧭" label="Мастер диагностики" />
          </div>
        </Card>
      </div>

      <Card title="Последние записи в журнале">
        {latestLogs.length === 0 ? (
          <p className="text-sm text-slate-400">Пока пусто.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {latestLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{l.symptom}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(l.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="О программе">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">ПЛК Помощник</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Офлайн-инструмент для наладчика промышленных ПЛК (IEC 61131-3). Версия 1.0.0.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, hint, to, linkLabel,
}: { label: string; value: string; hint: string; to: string; linkLabel: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
      <Link to={to} className="mt-2 block text-xs font-medium text-green-600 hover:underline dark:text-green-400">
        {linkLabel} →
      </Link>
    </div>
  );
}

function QuickLink({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-green-400 hover:bg-green-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <span>{emoji}</span>
      {label}
    </Link>
  );
}
