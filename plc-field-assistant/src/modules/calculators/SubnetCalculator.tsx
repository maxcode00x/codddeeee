import { useMemo, useState } from 'react';
import { Card, Field, NumberInput, ResultRow, TextInput } from '../../components/ui';
import { subnetInfo } from './formulas';

export function SubnetCalculator() {
  const [ip, setIp] = useState('192.168.1.10');
  const [prefix, setPrefix] = useState(24);

  const info = useMemo(() => {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return null;
    try { return subnetInfo(ip, prefix); } catch { return null; }
  }, [ip, prefix]);

  return (
    <Card title="IP и подсеть">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="IP-адрес"><TextInput value={ip} onChange={(e) => setIp(e.target.value)} /></Field>
        <Field label="Префикс (CIDR)"><NumberInput min={0} max={32} value={prefix} onChange={(e) => setPrefix(Number(e.target.value))} /></Field>
      </div>
      {info ? (
        <div>
          <ResultRow label="Маска подсети" value={info.subnetMask} />
          <ResultRow label="Адрес сети" value={info.networkAddress} />
          <ResultRow label="Широковещательный" value={info.broadcastAddress} />
          <ResultRow label="Диапазон хостов" value={`${info.firstHost} — ${info.lastHost}`} />
          <ResultRow label="Доступно устройств" value={info.usableHosts} />
        </div>
      ) : (
        <p className="text-sm text-red-600">Некорректный IP-адрес</p>
      )}
    </Card>
  );
}
