import { useState } from 'react';
import { Card, Field, NumberInput, ResultRow } from '../../components/ui';
import { conveyorThroughputPerMin, conveyorTraverseTimeSec } from './formulas';

export function ConveyorCalculator() {
  const [beltSpeed, setBeltSpeed] = useState(12);
  const [itemPitchMm, setItemPitchMm] = useState(100);
  const [sectionLengthM, setSectionLengthM] = useState(10);

  const throughput = conveyorThroughputPerMin(beltSpeed, itemPitchMm);
  const traverseTime = conveyorTraverseTimeSec(sectionLengthM, beltSpeed);

  return (
    <Card title="Конвейер">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Скорость ленты, м/мин"><NumberInput value={beltSpeed} onChange={(e) => setBeltSpeed(Number(e.target.value))} /></Field>
        <Field label="Шаг между деталями, мм"><NumberInput value={itemPitchMm} onChange={(e) => setItemPitchMm(Number(e.target.value))} /></Field>
        <Field label="Длина участка, м"><NumberInput value={sectionLengthM} onChange={(e) => setSectionLengthM(Number(e.target.value))} /></Field>
      </div>
      <ResultRow label="Производительность" value={`${throughput.toFixed(1)} шт/мин`} />
      <ResultRow label="Время прохождения участка" value={`${traverseTime.toFixed(1)} с`} />
    </Card>
  );
}
