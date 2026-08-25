import { useEffect, useRef, useState, type RefObject } from 'react';
import type { TrainerSnapshot } from './types';

// Тренажёр (в iframe) сам, раз в 150мс, шлёт снимок своих тегов через
// postMessage (см. index.html — раздел «МОСТ ДЛЯ ВНЕШНЕГО КОНТРОЛЛЕРА»).
// postMessage выбран вместо прямого iframe.contentWindow, потому что под
// Electron внешняя страница и трейнер — два разных file:// документа
// (разное происхождение), и прямой доступ не гарантирован политикой
// same-origin, а postMessage работает независимо от происхождения.
export function useTrainerBridge(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const [snapshot, setSnapshot] = useState<TrainerSnapshot | null>(null);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const msg = ev.data;
      if (!msg || msg.source !== 'pfa-codesys-snapshot') return;
      windowRef.current = ev.source as Window;
      setSnapshot({ tags: msg.tags, values: msg.values, scanRunning: msg.scanRunning });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function send(type: string, payload?: Record<string, unknown>) {
    const target = iframeRef.current?.contentWindow ?? windowRef.current;
    target?.postMessage({ source: 'pfa-codesys-cmd', type, ...payload }, '*');
  }

  return {
    snapshot,
    pauseScan: () => send('pauseScan'),
    resumeScan: () => send('resumeScan'),
    setValues: (values: Record<string, boolean>) => send('setValues', { values }),
  };
}
