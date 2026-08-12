import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { newId, type Equipment, type EquipmentType } from '../../db/schema';
import { Card, Field, PrimaryButton, Select, TextInput } from '../../components/ui';
import { ObjectPicker } from '../objects/ObjectPicker';

const TYPE_LABEL: Record<EquipmentType, string> = {
  cpu: 'CPU',
  io_station: 'Станция I/O',
  vfd: 'Частотник',
  panel: 'Панель',
  switch: 'Коммутатор',
  other: 'Другое',
};

const EMPTY: Omit<Equipment, 'id' | 'createdAt' | 'objectId'> = {
  type: 'cpu', article: '', serialNumber: '', firmware: '', profinetName: '', profinetIp: '',
  profibusAddress: '', keyParams: '', backupLocation: '', photoIds: [], notes: '',
};

export function EquipmentForm({ defaultObjectId, onDone }: { defaultObjectId: string | null; onDone: () => void }) {
  const [objectId, setObjectId] = useState<string | null>(defaultObjectId);
  const [fields, setFields] = useState(EMPTY);
  const [cloneFrom, setCloneFrom] = useState('');

  const allEquipment = useLiveQuery(() => db.equipment.toArray(), []) ?? [];

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function applyClone(id: string) {
    setCloneFrom(id);
    const source = allEquipment.find((e) => e.id === id);
    if (!source) return;
    const { ...rest } = source;
    setFields({
      type: rest.type, article: rest.article, serialNumber: '', firmware: rest.firmware,
      profinetName: '', profinetIp: '', profibusAddress: '', keyParams: rest.keyParams,
      backupLocation: rest.backupLocation, photoIds: [], notes: rest.notes,
    });
  }

  async function save() {
    if (!objectId || !fields.article.trim()) return;
    const record: Equipment = { id: newId(), objectId, createdAt: Date.now(), ...fields };
    await db.equipment.add(record);
    onDone();
  }

  return (
    <Card title="Новое устройство">
      <Field label="Объект (шкаф/линия)"><ObjectPicker value={objectId} onChange={setObjectId} /></Field>

      {allEquipment.length > 0 && (
        <Field label="Скопировать конфигурацию похожего устройства" hint="заполнит тип, прошивку, параметры и место бэкапа">
          <Select value={cloneFrom} onChange={(e) => applyClone(e.target.value)}>
            <option value="">— не копировать —</option>
            {allEquipment.map((e) => (
              <option key={e.id} value={e.id}>{TYPE_LABEL[e.type]} · {e.article || '(без артикула)'}</option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Тип">
          <Select value={fields.type} onChange={(e) => set('type', e.target.value as EquipmentType)}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Артикул"><TextInput value={fields.article} onChange={(e) => set('article', e.target.value)} /></Field>
        <Field label="Серийный номер"><TextInput value={fields.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} /></Field>
        <Field label="Прошивка"><TextInput value={fields.firmware} onChange={(e) => set('firmware', e.target.value)} /></Field>
        <Field label="PROFINET имя устройства"><TextInput value={fields.profinetName} onChange={(e) => set('profinetName', e.target.value)} /></Field>
        <Field label="PROFINET IP"><TextInput value={fields.profinetIp} onChange={(e) => set('profinetIp', e.target.value)} /></Field>
        <Field label="PROFIBUS адрес"><TextInput value={fields.profibusAddress} onChange={(e) => set('profibusAddress', e.target.value)} /></Field>
        <Field label="Где лежит бэкап"><TextInput value={fields.backupLocation} onChange={(e) => set('backupLocation', e.target.value)} /></Field>
      </div>
      <Field label="Ключевые параметры" hint="для частотника — данные двигателя, времена разгона и т.п.">
        <TextInput value={fields.keyParams} onChange={(e) => set('keyParams', e.target.value)} />
      </Field>
      <Field label="Заметки"><TextInput value={fields.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

      <PrimaryButton onClick={save} disabled={!objectId || !fields.article.trim()}>Сохранить</PrimaryButton>
    </Card>
  );
}
