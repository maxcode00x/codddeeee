import { useState } from 'react';
import { Card, Field, NumberInput, ResultRow } from '../../components/ui';
import { accelerationTimeSec } from './formulas';

export function AccelerationCalculator() {
  const [inertia, setInertia] = useState(0.5);
  const [deltaRpm, setDeltaRpm] = useState(1500);
  const [torque, setTorque] = useState(10);

  const t = accelerationTimeSec(inertia, deltaRpm, torque);

  return (
    <Card title="Время разгона привода">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Момент инерции J, кг·м²"><NumberInput value={inertia} onChange={(e) => setInertia(Number(e.target.value))} /></Field>
        <Field label="Изменение скорости Δn, об/мин"><NumberInput value={deltaRpm} onChange={(e) => setDeltaRpm(Number(e.target.value))} /></Field>
        <Field label="Разгонный момент M, Н·м"><NumberInput value={torque} onChange={(e) => setTorque(Number(e.target.value))} /></Field>
      </div>
      <ResultRow label="Время разгона" value={`${t.toFixed(3)} с`} />
    </Card>
  );
}
