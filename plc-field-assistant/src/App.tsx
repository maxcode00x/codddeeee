import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db from './db/schema';
import { CalculatorsPage } from './modules/calculators/CalculatorsPage';
import { FaultLogPage } from './modules/faultlog/FaultLogPage';
import { IoTablePage } from './modules/io-table/IoTablePage';
import { ReferencePage } from './modules/reference/ReferencePage';
import { PunchListPage } from './modules/punchlist/PunchListPage';
import { EquipmentPage } from './modules/equipment/EquipmentPage';
import { ProjectVersionsPage } from './modules/versions/ProjectVersionsPage';

const NAV_ITEMS = [
  { to: '/', label: 'Журнал', emoji: '🛠' },
  { to: '/io', label: 'I/O', emoji: '🔌' },
  { to: '/punch', label: 'Замечания', emoji: '📋' },
  { to: '/calc', label: 'Калькуляторы', emoji: '🧮' },
  { to: '/equipment', label: 'Паспорт', emoji: '🗄' },
  { to: '/versions', label: 'Версии', emoji: '🗂' },
  { to: '/reference', label: 'Справочник', emoji: '📘' },
];

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('pfa-theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('pfa-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark] as const;
}

function useOpenACount() {
  const items = useLiveQuery(() => db.punchList.toArray(), []) ?? [];
  return items.filter((i) => i.priority === 'A' && i.status === 'open').length;
}

function NavBar({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const openACount = useOpenACount();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-none flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs font-medium sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
      isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  const items = (mobile: boolean) =>
    NAV_ITEMS.map((item) => (
      <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
        <span className={mobile ? 'text-lg' : ''}>{item.emoji}</span>
        <span>{item.label}</span>
        {item.to === '/punch' && openACount > 0 && (
          <span className="absolute -top-0.5 right-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white sm:static sm:ml-1">
            {openACount}
          </span>
        )}
      </NavLink>
    ));

  return (
    <>
      {/* верхняя панель — заголовок + тема, видна всегда */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">🛠 Помощник наладчика</span>
        <button
          onClick={() => setDark(!dark)}
          className="min-h-9 min-w-9 rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-600"
          aria-label="Переключить тему"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* десктоп/планшет: горизонтальные вкладки под шапкой */}
      <nav className="hidden overflow-x-auto border-b border-slate-200 bg-white sm:flex dark:border-slate-700 dark:bg-slate-800">
        {items(false)}
      </nav>

      {/* телефон: нижняя панель табов, прокручивается по горизонтали — все модули за один тап */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-slate-200 bg-white sm:hidden dark:border-slate-700 dark:bg-slate-800">
        {items(true)}
      </nav>
    </>
  );
}

function App() {
  const [dark, setDark] = useTheme();

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-900 sm:pb-0">
        <NavBar dark={dark} setDark={setDark} />
        <Routes>
          <Route path="/" element={<FaultLogPage />} />
          <Route path="/io" element={<IoTablePage />} />
          <Route path="/punch" element={<PunchListPage />} />
          <Route path="/calc" element={<CalculatorsPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/versions" element={<ProjectVersionsPage />} />
          <Route path="/reference" element={<ReferencePage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
