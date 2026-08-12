import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { newId, type FaultLog } from '../../db/schema';
import { createSearch, search } from '../../lib/search';
import { Card, Field, NumberInput, PrimaryButton, TextInput } from '../../components/ui';

export function FaultLogForm({ onDone }: { onDone: () => void }) {
  const [objectPath, setObjectPath] = useState('');
  const [symptom, setSymptom] = useState('');
  const [cause, setCause] = useState('');
  const [fix, setFix] = useState('');
  const [downtimeMin, setDowntimeMin] = useState(0);
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState(() => localStorage.getItem('pfa-author') || '');

  const allLogs = useLiveQuery(() => db.faultLogs.toArray(), []) ?? [];

  const similar = useMemo(() => {
    if (symptom.trim().length < 3 || allLogs.length === 0) return [];
    const fuse = createSearch(allLogs, ['symptom', 'cause']);
    return search(fuse, symptom).slice(0, 5);
  }, [symptom, allLogs]);

  async function save() {
    if (!symptom.trim()) return;
    localStorage.setItem('pfa-author', author);
    const record: FaultLog = {
      id: newId(),
      objectId: null,
      objectPath: objectPath.trim(),
      symptom: symptom.trim(),
      cause: cause.trim(),
      fix: fix.trim(),
      downtimeMin: downtimeMin || 0,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      photoIds: [],
      author: author.trim() || 'без имени',
      createdAt: Date.now(),
    };
    await db.faultLogs.add(record);
    onDone();
  }

  function useSimilar(item: FaultLog) {
    setCause(item.cause);
    setFix(item.fix);
  }

  return (
    <Card title="Новая запись">
      <Field label="Объект / линия / механизм"><TextInput value={objectPath} onChange={(e) => setObjectPath(e.target.value)} placeholder="Линия 2 / Конвейер 3" /></Field>
      <Field label="Симптом" hint="как это выглядело — «конвейер встал, на панели ошибка 47»">
        <TextInput value={symptom} onChange={(e) => setSymptom(e.target.value)} />
      </Field>

      {similar.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">Похожие случаи — возможно, уже было:</p>
          <ul className="space-y-1">
            {similar.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => useSimilar(s)}
                  className="text-left text-sm text-amber-900 underline decoration-dotted hover:text-amber-700 dark:text-amber-200"
                >
                  {s.symptom} — {s.cause || '(причина не указана)'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Что оказалось причиной"><TextInput value={cause} onChange={(e) => setCause(e.target.value)} /></Field>
      <Field label="Как устранено"><TextInput value={fix} onChange={(e) => setFix(e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Простой, мин"><NumberInput value={downtimeMin} onChange={(e) => setDowntimeMin(Number(e.target.value))} /></Field>
        <Field label="Автор"><TextInput value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
      </div>
      <Field label="Теги" hint="через запятую"><TextInput value={tags} onChange={(e) => setTags(e.target.value)} /></Field>

      <div className="flex gap-2">
        <PrimaryButton onClick={save} disabled={!symptom.trim()}>Сохранить</PrimaryButton>
      </div>
    </Card>
  );
}
