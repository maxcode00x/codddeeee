import { useState } from 'react';
import db, { newId, type PunchItem, type PunchPriority } from '../../db/schema';
import { Card, Field, PrimaryButton, Select, TextInput } from '../../components/ui';
import { ObjectPicker } from '../objects/ObjectPicker';

export function PunchListForm({ onDone }: { onDone: () => void }) {
  const [objectId, setObjectId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PunchPriority>('B');
  const [responsible, setResponsible] = useState('');
  const [deadline, setDeadline] = useState('');

  async function save() {
    if (!description.trim()) return;
    const record: PunchItem = {
      id: newId(),
      objectId,
      description: description.trim(),
      priority,
      responsible: responsible.trim(),
      deadline: deadline ? new Date(deadline).getTime() : null,
      status: 'open',
      photoIds: [],
      createdAt: Date.now(),
    };
    await db.punchList.add(record);
    onDone();
  }

  return (
    <Card title="Новое замечание">
      <Field label="Объект"><ObjectPicker value={objectId} onChange={setObjectId} /></Field>
      <Field label="Описание"><TextInput value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Приоритет">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as PunchPriority)}>
            <option value="A">A — мешает пуску</option>
            <option value="B">B — до приёмки</option>
            <option value="C">C — косметика</option>
          </Select>
        </Field>
        <Field label="Ответственный"><TextInput value={responsible} onChange={(e) => setResponsible(e.target.value)} /></Field>
        <Field label="Срок"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" /></Field>
      </div>
      <PrimaryButton onClick={save} disabled={!description.trim()}>Сохранить</PrimaryButton>
    </Card>
  );
}
