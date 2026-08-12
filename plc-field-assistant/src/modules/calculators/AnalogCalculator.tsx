import { useState } from 'react';
import { Card, Field, NumberInput, Select, ResultRow } from '../../components/ui';
import { SIGNAL_RANGES, analogFromPhysical, analogFromSignal, type SignalType } from './formulas';

const ADC_PRESETS = [
  { label: 'Siemens 0…27648', value: 27648 },
  { label: '12 бит 0…4095', value: 4095 },
  { label: '0…32767', value: 32767 },
];

export function AnalogCalculator() {
  const [signalType, setSignalType] = useState<SignalType>('4-20mA');
  const [adcFullScale, setAdcFullScale] = useState(27648);
  const [sensorMin, setSensorMin] = useState(0);
  const [sensorMax, setSensorMax] = useState(10);
  const [signalValue, setSignalValue] = useState(12);

  const range = SIGNAL_RANGES[signalType];
  const bySignal = analogFromSignal({ signalType, adcFullScale, sensorMin, sensorMax }, signalValue);

  function onPhysicalChange(v: number) {
    const r = analogFromPhysical({ signalType, adcFullScale, sensorMin, sensorMax }, v);
    setSignalValue(r.signalValue);
  }
  function onRawChange(raw: number) {
    setSignalValue(range.min + (raw / adcFullScale) * (range.max - range.min));
  }

  return (
    <Card title="Аналоговый сигнал">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Тип сигнала">
          <Select value={signalType} onChange={(e) => setSignalType(e.target.value as SignalType)}>
            <option value="4-20mA">4–20 мА (живой ноль)</option>
            <option value="0-20mA">0–20 мА</option>
            <option value="0-10V">0–10 В</option>
            <option value="-10-10V">±10 В</option>
          </Select>
        </Field>
        <Field label="Диапазон АЦП (полная шкала)">
          <Select value={adcFullScale} onChange={(e) => setAdcFullScale(Number(e.target.value))}>
            {ADC_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Датчик: начало диапазона">
          <NumberInput value={sensorMin} onChange={(e) => setSensorMin(Number(e.target.value))} />
        </Field>
        <Field label="Датчик: конец диапазона">
          <NumberInput value={sensorMax} onChange={(e) => setSensorMax(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label={`Ток/напряжение (${range.unit})`}>
          <NumberInput
            value={Number(signalValue.toFixed(3))}
            onChange={(e) => setSignalValue(Number(e.target.value))}
            className={bySignal.isBroken ? 'ring-2 ring-red-400' : ''}
          />
        </Field>
        <Field label="Сырое значение АЦП">
          <NumberInput value={bySignal.raw} onChange={(e) => onRawChange(Number(e.target.value))} />
        </Field>
        <Field label="Физическая величина">
          <NumberInput value={Number(bySignal.physical.toFixed(3))} onChange={(e) => onPhysicalChange(Number(e.target.value))} />
        </Field>
      </div>

      {bySignal.isBroken && (
        <ResultRow danger label="Внимание" value="ниже 3,6 мА — обрыв, а не ноль" />
      )}
    </Card>
  );
}
