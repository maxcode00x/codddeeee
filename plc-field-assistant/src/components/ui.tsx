import type { ReactNode } from 'react';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const controlClass =
  'w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" inputMode="decimal" className={controlClass} {...props} />;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={controlClass} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={controlClass} {...props} />;
}

export function ResultRow({ label, value, danger }: { label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 py-2 first:border-0 dark:border-slate-700">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-mono text-base font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </span>
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
      {...props}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg border border-slate-300 px-4 text-base font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      {...props}
    />
  );
}
