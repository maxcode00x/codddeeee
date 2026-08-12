import { useState } from 'react';
import { Card, Field, NumberInput, ResultRow } from '../../components/ui';
import { cycleTimeCheck } from './formulas';

export function CycleTimeCalculator() {
  const [operationsCount, setOperationsCount] = useState(100);
  const [perOperationMs, setPerOperationMs] = useState(0.5);
  const [targetScanMs, setTargetScanMs] = useState(100);

  const r = cycleTimeCheck(operationsCount, perOperationMs, targetScanMs);

  return (
    <Card title="Время цикла">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Число операций"><NumberInput value={operationsCount} onChange={(e) => setOperationsCount(Number(e.target.value))} /></Field>
        <Field label="Время на операцию, мс"><NumberInput value={perOperationMs} onChange={(e) => setPerOperationMs(Number(e.target.value))} /></Field>
        <Field label="Целевой такт сканирования, мс"><NumberInput value={targetScanMs} onChange={(e) => setTargetScanMs(Number(e.target.value))} /></Field>
      </div>
      <ResultRow label="Суммарное время" value={`${r.totalMs.toFixed(2)} мс`} danger={r.exceedsTarget} />
      <ResultRow
        label={r.exceedsTarget ? 'Превышение' : 'Запас'}
        value={`${Math.abs(r.marginMs).toFixed(2)} мс`}
        danger={r.exceedsTarget}
      />
    </Card>
  );
}
