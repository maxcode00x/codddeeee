import { useEffect, useRef, useState, type RefObject } from 'react';
import { Card, Field, GhostButton, PrimaryButton, TextInput } from '../../components/ui';
import { useTrainerBridge } from './useTrainerBridge';
import type { CodesysConfig } from './types';

const CONFIG_KEY = 'pfa-codesys-config';
const SYNC_INTERVAL_MS = 250;

function loadConfig(): CodesysConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // повреждённая запись — начинаем с чистого листа
  }
  return { endpointUrl: 'opc.tcp://localhost:4840', mappings: {} };
}

export function CodesysPanel({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const bridge = useTrainerBridge(iframeRef);
  const [config, setConfig] = useState<CodesysConfig>(loadConfig);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const syncTimer = useRef<number | null>(null);

  // setInterval захватывает функцию из того рендера, в котором был вызван
  // startSync — без рефов он бы навсегда видел снапшот/конфиг на момент
  // запуска синхронизации и игнорировал всё, что пришло позже (классическое
  // устаревшее замыкание). runSyncTick ниже читает именно эти рефы, а не
  // state напрямую.
  const snapshotRef = useRef(bridge.snapshot);
  snapshotRef.current = bridge.snapshot;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  function pushLog(line: string) {
    setLog((l) => [`${new Date().toLocaleTimeString('ru-RU')} — ${line}`, ...l].slice(0, 30));
  }

  async function connect() {
    if (!window.electronAPI) return;
    setConnecting(true);
    setError('');
    try {
      const status = await window.electronAPI.codesys.connect(config.endpointUrl);
      setConnected(status.connected);
      pushLog(status.connected ? `Подключено: ${status.endpointUrl}` : 'Не удалось подключиться');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.electronAPI) return;
    stopSync();
    await window.electronAPI.codesys.disconnect();
    setConnected(false);
    pushLog('Отключено');
  }

  function startSync() {
    if (!window.electronAPI || !connected) return;
    bridge.pauseScan(); // теперь тегами управляет CODESYS, а не встроенный интерпретатор
    setSyncing(true);
    pushLog('Синхронизация запущена — встроенный интерпретатор остановлен');
    syncTimer.current = window.setInterval(runSyncTick, SYNC_INTERVAL_MS);
  }

  function stopSync() {
    if (syncTimer.current !== null) { window.clearInterval(syncTimer.current); syncTimer.current = null; }
    if (syncing) { bridge.resumeScan(); pushLog('Синхронизация остановлена — интерпретатор снова работает'); }
    setSyncing(false);
  }

  async function runSyncTick() {
    const snapshot = snapshotRef.current;
    const cfg = configRef.current;
    if (!window.electronAPI || !snapshot) return;
    const { tags, values } = snapshot;
    const outTags = tags.filter((t) => t.dir === 'OUT' && cfg.mappings[t.key]); // CODESYS -> сцена
    const inTags = tags.filter((t) => t.dir === 'IN' && cfg.mappings[t.key]); // сцена -> CODESYS

    try {
      if (outTags.length > 0) {
        const nodeIds = outTags.map((t) => cfg.mappings[t.key]);
        const read = await window.electronAPI.codesys.read(nodeIds);
        const toApply: Record<string, boolean> = {};
        outTags.forEach((t) => {
          const v = read[cfg.mappings[t.key]];
          if (v !== null && v !== undefined) toApply[t.key] = v;
        });
        if (Object.keys(toApply).length > 0) bridge.setValues(toApply);
      }
      if (inTags.length > 0) {
        const writes = inTags.map((t) => ({ nodeId: cfg.mappings[t.key], value: !!values[t.key] }));
        await window.electronAPI.codesys.write(writes);
      }
    } catch (e) {
      pushLog('Ошибка синхронизации: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  useEffect(() => () => { if (syncTimer.current !== null) window.clearInterval(syncTimer.current); }, []);

  function setMapping(key: string, nodeId: string) {
    setConfig((c) => ({ ...c, mappings: { ...c.mappings, [key]: nodeId } }));
  }

  if (!window.electronAPI) {
    return (
      <Card title="Связь с CODESYS">
        <p className="text-sm text-slate-400">
          Доступно только в Windows-приложении (Electron) — браузер не умеет открывать OPC UA соединения напрямую.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card title="Связь с CODESYS (OPC UA)">
        <Field label="Endpoint" hint="адрес OPC UA сервера, который публикует CODESYS">
          <TextInput
            value={config.endpointUrl}
            onChange={(e) => setConfig((c) => ({ ...c, endpointUrl: e.target.value }))}
            placeholder="opc.tcp://localhost:4840"
            disabled={connected}
          />
        </Field>
        <div className="flex items-center gap-2">
          {connected ? (
            <GhostButton onClick={disconnect}>Отключиться</GhostButton>
          ) : (
            <PrimaryButton onClick={connect} disabled={connecting}>
              {connecting ? 'Подключаюсь…' : 'Подключиться'}
            </PrimaryButton>
          )}
          <span className={`text-sm ${connected ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
            {connected ? '● подключено' : '○ не подключено'}
          </span>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      {connected && bridge.snapshot && (
        <Card title={`Теги сцены: ${bridge.snapshot.tags.length}`}>
          <p className="mb-2 text-xs text-slate-400">
            Впиши NodeId у нужных тегов — только они участвуют в синхронизации. OUT — CODESYS управляет прибором
            (мотор, лампа, ворота…), IN — сцена сообщает CODESYS о своём состоянии (датчик, кнопка…).
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {bridge.snapshot.tags.map((t) => (
              <div key={t.key} className="grid grid-cols-[1fr_auto_2fr] items-center gap-2 border-b border-slate-100 py-1 text-sm dark:border-slate-700">
                <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300" title={t.key}>{t.key}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.dir === 'OUT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>
                  {t.dir}
                </span>
                <input
                  className="min-h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={config.mappings[t.key] || ''}
                  onChange={(e) => setMapping(t.key, e.target.value)}
                  placeholder="ns=4;s=GVL.Motor1"
                  disabled={syncing}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {syncing ? (
              <GhostButton onClick={stopSync}>Остановить синхронизацию</GhostButton>
            ) : (
              <PrimaryButton onClick={startSync}>Запустить синхронизацию</PrimaryButton>
            )}
            <span className="text-xs text-slate-400">каждые {SYNC_INTERVAL_MS} мс</span>
          </div>
        </Card>
      )}

      {log.length > 0 && (
        <Card title="Журнал">
          <div className="max-h-40 overflow-y-auto text-xs text-slate-500 dark:text-slate-400">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </Card>
      )}
    </div>
  );
}
