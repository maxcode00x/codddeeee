import { useState } from 'react';
import db, { newId } from '../../db/schema';
import { Card, GhostButton, PrimaryButton } from '../../components/ui';
import { BRANCHES, FORCE_REMINDER, getNode, type WizardConclusion } from './wizardData';

export function WizardPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function startBranch(id: string) {
    const branch = BRANCHES.find((b) => b.id === id)!;
    setBranchId(id);
    setNodeId(branch.startId);
    setPath([branch.label]);
    setSaved(false);
  }

  function choose(label: string, next: string) {
    setPath((p) => [...p, label]);
    setNodeId(next);
    setSaved(false);
  }

  function restart() {
    setBranchId(null);
    setNodeId(null);
    setPath([]);
    setSaved(false);
  }

  async function saveToLog(c: WizardConclusion) {
    await db.faultLogs.add({
      id: newId(),
      objectId: null,
      objectPath: '',
      symptom: c.prefill.symptom,
      cause: c.prefill.cause,
      fix: c.prefill.fix,
      downtimeMin: 0,
      tags: ['мастер диагностики'],
      photoIds: [],
      author: localStorage.getItem('pfa-author') || 'без имени',
      createdAt: Date.now(),
    });
    setSaved(true);
  }

  const node = nodeId ? getNode(nodeId) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
        ⚠ {FORCE_REMINDER}
      </div>

      {!node ? (
        <Card title="С чего начать? Выбери, что происходит">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BRANCHES.map((b) => (
              <button
                key={b.id}
                onClick={() => startBranch(b.id)}
                className="min-h-14 rounded-lg border border-slate-300 px-4 text-left text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {b.label}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <p className="text-xs text-slate-400">{path.join(' → ')}</p>

          {node.type === 'question' ? (
            <Card title={node.text}>
              <div className="flex flex-col gap-2">
                {node.options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => choose(o.label, o.next)}
                    className="min-h-12 rounded-lg border border-slate-300 px-4 text-left text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Вывод">
              <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">{node.diagnosis}</p>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{node.recommendation}</p>
              {saved ? (
                <p className="text-sm text-green-700 dark:text-green-400">✓ Случай сохранён в журнал неисправностей.</p>
              ) : (
                <PrimaryButton onClick={() => saveToLog(node)}>Сохранить случай в журнал</PrimaryButton>
              )}
            </Card>
          )}

          <div className="flex gap-2">
            {branchId && <GhostButton onClick={() => startBranch(branchId)}>Начать ветку заново</GhostButton>}
            <GhostButton onClick={restart}>К выбору проблемы</GhostButton>
          </div>
        </>
      )}
    </div>
  );
}
