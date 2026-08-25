import { useRef, useState } from 'react';
import { CodesysPanel } from '../codesys/CodesysPanel';

export function TrainerPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showCodesys, setShowCodesys] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        <iframe ref={iframeRef} title="Тренажёр ПЛК" src="trainer/index.html" className="h-full w-full border-0" />
        {isElectron && (
          <button
            onClick={() => setShowCodesys((v) => !v)}
            className="absolute right-3 top-3 min-h-9 rounded-lg border border-slate-300 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-white dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200"
          >
            ⚙ CODESYS
          </button>
        )}
      </div>
      {isElectron && showCodesys && (
        <div className="w-96 flex-none overflow-y-auto border-l border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <CodesysPanel iframeRef={iframeRef} />
        </div>
      )}
    </div>
  );
}
