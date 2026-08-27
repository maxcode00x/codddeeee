import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type Equipment, type EquipmentType } from '../../db/schema';
import { exportEquipmentPdf } from '../../lib/pdf';
import { Card, GhostButton, PrimaryButton, TextInput } from '../../components/ui';
import { EquipmentForm } from './EquipmentForm';
import { useObjectTree } from '../objects/useObjectTree';

const TYPE_LABEL: Record<EquipmentType, string> = {
  cpu: 'CPU', io_station: 'Станция I/O', vfd: 'Частотник', panel: 'Панель', switch: 'Коммутатор', other: 'Другое',
};

function EquipmentCard({ item, path }: { item: Equipment; path: string }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-900 dark:text-slate-100">{TYPE_LABEL[item.type]} · {item.article || '(без артикула)'}</span>
        <span className="text-xs text-slate-400">{path}</span>
      </div>
      <p className="text-xs text-slate-500">
        {[item.serialNumber && `S/N ${item.serialNumber}`, item.firmware && `FW ${item.firmware}`].filter(Boolean).join(' · ')}
      </p>
      {(item.profinetName || item.profinetIp) && (
        <p className="text-xs text-slate-500">PROFINET: {item.profinetName} {item.profinetIp && `(${item.profinetIp})`}</p>
      )}
      {item.profibusAddress && <p className="text-xs text-slate-500">PROFIBUS: {item.profibusAddress}</p>}
      {item.keyParams && <p className="text-xs text-slate-500">{item.keyParams}</p>}
      {item.backupLocation && <p className="text-xs text-slate-400">Бэкап: {item.backupLocation}</p>}
    </div>
  );
}

export function EquipmentPage() {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const equipment = useLiveQuery(() => db.equipment.toArray(), []) ?? [];
  const { flat, pathById } = useObjectTree();

  const filtered = useMemo(() => {
    let list = equipment;
    if (selectedObjectId) list = list.filter((e) => e.objectId === selectedObjectId);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => e.article.toLowerCase().includes(q) || e.profinetName.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q));
    }
    return list;
  }, [equipment, selectedObjectId, query]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex gap-2">
        <TextInput placeholder="Поиск по артикулу или имени устройства" value={query} onChange={(e) => setQuery(e.target.value)} />
        <PrimaryButton onClick={() => setShowForm((v) => !v)}>{showForm ? 'Отмена' : '+ Устройство'}</PrimaryButton>
      </div>

      {showForm && <EquipmentForm defaultObjectId={selectedObjectId} onDone={() => setShowForm(false)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
        <Card title="Объекты">
          <button
            onClick={() => setSelectedObjectId(null)}
            className={`mb-1 block w-full rounded-md px-2 py-1.5 text-left text-sm ${!selectedObjectId ? 'bg-green-50 font-medium text-green-700 dark:bg-green-950 dark:text-green-300' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Все объекты
          </button>
          {flat.map((n) => (
            <button
              key={n.object.id}
              onClick={() => setSelectedObjectId(n.object.id)}
              style={{ paddingLeft: `${8 + n.depth * 12}px` }}
              className={`block w-full rounded-md py-1.5 pr-2 text-left text-sm ${selectedObjectId === n.object.id ? 'bg-green-50 font-medium text-green-700 dark:bg-green-950 dark:text-green-300' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {n.object.name}
            </button>
          ))}
          {flat.length === 0 && <p className="text-xs text-slate-400">Пока нет объектов — добавь при создании устройства.</p>}
        </Card>

        <Card title={`Устройства: ${filtered.length}`}>
          <div className="mb-2">
            <GhostButton onClick={() => exportEquipmentPdf(filtered, pathById, 'Паспорт оборудования')}>Экспорт в PDF</GhostButton>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400">Ничего нет.</p>
          ) : (
            filtered.map((item) => (
              <EquipmentCard key={item.id} item={item} path={(item.objectId && pathById.get(item.objectId)) || ''} />
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
