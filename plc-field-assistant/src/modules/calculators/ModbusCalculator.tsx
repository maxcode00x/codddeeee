import { useMemo, useState } from 'react';
import { Card, Field, NumberInput, ResultRow, TextInput } from '../../components/ui';
import { byteOrderVariants, formatModbusAddress, parseModbusAddress } from './formulas';

const REF_LABEL: Record<string, string> = {
  coil: 'Coil (0x)',
  discrete_input: 'Discrete input (1x)',
  input_register: 'Input register (3x)',
  holding_register: 'Holding register (4x)',
};

export function ModbusCalculator() {
  const [raw, setRaw] = useState('40001');
  const [swapValue, setSwapValue] = useState(0x12345678);

  const parsed = useMemo(() => {
    try {
      return formatModbusAddress(parseModbusAddress(raw));
    } catch {
      return null;
    }
  }, [raw]);

  const orders = useMemo(() => byteOrderVariants(swapValue >>> 0), [swapValue]);

  return (
    <Card title="Modbus: смещение адресов">
      <Field label="Адрес в любом формате" hint="40001, 4x0001 или голый номер регистра">
        <TextInput value={raw} onChange={(e) => setRaw(e.target.value)} />
      </Field>
      {parsed ? (
        <div className="mb-4">
          <ResultRow label="Тип" value={REF_LABEL[parsed.refType]} />
          <ResultRow label="Классический (40001)" value={parsed.conventional} />
          <ResultRow label="С разделителем (4x0001)" value={parsed.xNotation} />
          <ResultRow label="Протокольный адрес (0-based)" value={parsed.protocolAddress} />
        </div>
      ) : (
        <p className="mb-4 text-sm text-red-600">Не удалось разобрать адрес</p>
      )}

      <Field label="Порядок байт" hint="32-битное число в двух регистрах — как оно выглядит в четырёх вариантах">
        <NumberInput value={swapValue} onChange={(e) => setSwapValue(Number(e.target.value))} />
      </Field>
      <ResultRow label="ABCD (big-endian)" value={orders.ABCD} />
      <ResultRow label="CDAB (word swap)" value={orders.CDAB} />
      <ResultRow label="BADC (byte swap)" value={orders.BADC} />
      <ResultRow label="DCBA (little-endian)" value={orders.DCBA} />
    </Card>
  );
}
