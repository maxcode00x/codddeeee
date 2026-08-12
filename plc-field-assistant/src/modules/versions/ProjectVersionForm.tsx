import { useState } from 'react';
import db, { newId, type ProjectVersion } from '../../db/schema';
import { Card, Field, PrimaryButton, TextInput } from '../../components/ui';
import { ObjectPicker } from '../objects/ObjectPicker';

export function ProjectVersionForm({ defaultObjectId, onDone }: { defaultObjectId: string | null; onDone: () => void }) {
  const [objectId, setObjectId] = useState<string | null>(defaultObjectId);
  const [version, setVersion] = useState('');
  const [devEnvVersion, setDevEnvVersion] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [changedBy, setChangedBy] = useState(() => localStorage.getItem('pfa-author') || '');
  const [checksum, setChecksum] = useState('');
  const [backupLocation, setBackupLocation] = useState('');
  const [isInController, setIsInController] = useState(true);

  async function save() {
    if (!objectId || !version.trim()) return;
    localStorage.setItem('pfa-author', changedBy);
    const record: ProjectVersion = {
      id: newId(),
      objectId,
      version: version.trim(),
      date: Date.now(),
      devEnvVersion: devEnvVersion.trim(),
      changeDescription: changeDescription.trim(),
      changedBy: changedBy.trim() || 'без имени',
      checksum: checksum.trim(),
      backupLocation: backupLocation.trim(),
      isInController,
      createdAt: Date.now(),
    };
    await db.projectVersions.add(record);
    onDone();
  }

  return (
    <Card title="Новая версия">
      <Field label="Объект"><ObjectPicker value={objectId} onChange={setObjectId} /></Field>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Версия проекта" hint="v1.3"><TextInput value={version} onChange={(e) => setVersion(e.target.value)} /></Field>
        <Field label="Версия среды разработки" hint="TIA Portal V18, CODESYS 3.5…"><TextInput value={devEnvVersion} onChange={(e) => setDevEnvVersion(e.target.value)} /></Field>
      </div>
      <Field label="Что изменено и почему"><TextInput value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Кто изменил"><TextInput value={changedBy} onChange={(e) => setChangedBy(e.target.value)} /></Field>
        <Field label="Контрольная сумма" hint="если известна"><TextInput value={checksum} onChange={(e) => setChecksum(e.target.value)} /></Field>
        <Field label="Где лежит архив"><TextInput value={backupLocation} onChange={(e) => setBackupLocation(e.target.value)} /></Field>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={isInController} onChange={(e) => setIsInController(e.target.checked)} className="h-4 w-4" />
        Эта версия сейчас в контроллере
      </label>
      <PrimaryButton onClick={save} disabled={!objectId || !version.trim()}>Сохранить</PrimaryButton>
    </Card>
  );
}
