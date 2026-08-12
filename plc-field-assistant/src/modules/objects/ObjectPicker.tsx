import { useState } from 'react';
import db, { newId } from '../../db/schema';
import { Select, TextInput, GhostButton } from '../../components/ui';
import { useObjectTree } from './useObjectTree';

export function ObjectPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { flat } = useObjectTree();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState<string>('');

  async function createObject() {
    if (!newName.trim()) return;
    const id = newId();
    await db.objects.add({ id, name: newName.trim(), parentId: newParent || null, createdAt: Date.now() });
    setNewName('');
    setCreating(false);
    onChange(id);
  }

  if (creating) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="w-auto">
          <option value="">— без родителя (линия) —</option>
          {flat.map((n) => (
            <option key={n.object.id} value={n.object.id}>{'—'.repeat(n.depth)} {n.object.name}</option>
          ))}
        </Select>
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название (Линия 2, Шкаф 3…)"
          className="w-auto flex-1"
        />
        <GhostButton onClick={createObject}>Добавить</GhostButton>
        <GhostButton onClick={() => setCreating(false)}>Отмена</GhostButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="w-auto flex-1">
        <option value="">— не привязано —</option>
        {flat.map((n) => (
          <option key={n.object.id} value={n.object.id}>{'—'.repeat(n.depth)} {n.object.name}</option>
        ))}
      </Select>
      <GhostButton onClick={() => setCreating(true)}>+ Новый объект</GhostButton>
    </div>
  );
}
