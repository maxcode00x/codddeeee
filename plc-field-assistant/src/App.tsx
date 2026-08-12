import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { CalculatorsPage } from './modules/calculators/CalculatorsPage';
import { FaultLogPage } from './modules/faultlog/FaultLogPage';
import { IoTablePage } from './modules/io-table/IoTablePage';
import { ReferencePage } from './modules/reference/ReferencePage';

const NAV_ITEMS = [
  { to: '/', label: 'Журнал', emoji: '🛠' },
  { to: '/io', label: 'I/O', emoji: '🔌' },
  { to: '/calc', label: 'Калькуляторы', emoji: '🧮' },
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

function NavBar({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
      isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

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
      <nav className="hidden border-b border-slate-200 bg-white sm:flex dark:border-slate-700 dark:bg-slate-800">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* телефон: нижняя панель табов — одной рукой дотянуться проще */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white sm:hidden dark:border-slate-700 dark:bg-slate-800">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <span className="text-lg">{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
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
          <Route path="/calc" element={<CalculatorsPage />} />
          <Route path="/reference" element={<ReferencePage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
