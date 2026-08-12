import { useState } from 'react';
import { Card, Field, NumberInput, ResultRow, Select } from '../../components/ui';
import { requiredCrossSection, voltageDrop, type CableMaterial, type PhaseMode } from './formulas';

export function VoltageDropCalculator() {
  const [lengthM, setLengthM] = useState(50);
  const [currentA, setCurrentA] = useState(10);
  const [crossSectionMm2, setCrossSectionMm2] = useState(2.5);
  const [material, setMaterial] = useState<CableMaterial>('copper');
  const [phaseMode, setPhaseMode] = useState<PhaseMode>('dc_or_1phase');
  const [nominalVoltage, setNominalVoltage] = useState(230);
  const [maxDropPercent, setMaxDropPercent] = useState(3);

  const result = voltageDrop({ lengthM, currentA, crossSectionMm2, material, phaseMode, nominalVoltage });
  const minSection = requiredCrossSection({ lengthM, currentA, material, phaseMode, nominalVoltage, maxDropPercent });

  return (
    <Card title="Падение напряжения и сечение кабеля">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Длина, м"><NumberInput value={lengthM} onChange={(e) => setLengthM(Number(e.target.value))} /></Field>
        <Field label="Ток, А"><NumberInput value={currentA} onChange={(e) => setCurrentA(Number(e.target.value))} /></Field>
        <Field label="Сечение, мм²"><NumberInput value={crossSectionMm2} onChange={(e) => setCrossSectionMm2(Number(e.target.value))} /></Field>
        <Field label="Материал">
          <Select value={material} onChange={(e) => setMaterial(e.target.value as CableMaterial)}>
            <option value="copper">Медь</option>
            <option value="aluminum">Алюминий</option>
          </Select>
        </Field>
        <Field label="Схема">
          <Select value={phaseMode} onChange={(e) => setPhaseMode(e.target.value as PhaseMode)}>
            <option value="dc_or_1phase">DC / однофазная</option>
            <option value="3phase">Трёхфазная</option>
          </Select>
        </Field>
        <Field label="Номинальное напряжение, В"><NumberInput value={nominalVoltage} onChange={(e) => setNominalVoltage(Number(e.target.value))} /></Field>
      </div>

      <ResultRow label="Падение напряжения" value={`${result.dropV.toFixed(2)} В`} danger={result.dropPercent > 5} />
      <ResultRow label="Падение, %" value={`${result.dropPercent.toFixed(2)} %`} danger={result.dropPercent > 5} />

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
        <Field label="Допустимое падение, % (для расчёта мин. сечения)">
          <NumberInput value={maxDropPercent} onChange={(e) => setMaxDropPercent(Number(e.target.value))} />
        </Field>
        <ResultRow label="Минимальное сечение" value={`${minSection.toFixed(2)} мм²`} />
      </div>
    </Card>
  );
}
