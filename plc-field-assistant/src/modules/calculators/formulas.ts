// Чистые функции калькуляторов — модуль 4. Никакого React/DOM здесь,
// чтобы можно было проверить численную логику отдельным Node-скриптом
// до того, как она попадёт в UI (см. scripts/verify-formulas.mjs).

// ---------- 1. Аналоговый сигнал ----------

export type SignalType = '4-20mA' | '0-20mA' | '0-10V' | '-10-10V';

export const SIGNAL_RANGES: Record<SignalType, { min: number; max: number; unit: string; liveZero: boolean }> = {
  '4-20mA': { min: 4, max: 20, unit: 'мА', liveZero: true },
  '0-20mA': { min: 0, max: 20, unit: 'мА', liveZero: false },
  '0-10V': { min: 0, max: 10, unit: 'В', liveZero: false },
  '-10-10V': { min: -10, max: 10, unit: 'В', liveZero: false },
};

export interface AnalogInput {
  signalType: SignalType;
  adcFullScale: number; // напр. 27648
  sensorMin: number;
  sensorMax: number;
}

/** Возвращает физическую величину и сырое число АЦП по значению тока/напряжения. */
export function analogFromSignal(input: AnalogInput, signalValue: number) {
  const { min, max } = SIGNAL_RANGES[input.signalType];
  const fraction = (signalValue - min) / (max - min);
  const raw = Math.round(fraction * input.adcFullScale);
  const physical = input.sensorMin + fraction * (input.sensorMax - input.sensorMin);
  const isBroken = input.signalType === '4-20mA' && signalValue < 3.6;
  return { fraction, raw, physical, isBroken };
}

/** Обратная задача: по физической величине — сигнал и сырое число. */
export function analogFromPhysical(input: AnalogInput, physicalValue: number) {
  const fraction = (physicalValue - input.sensorMin) / (input.sensorMax - input.sensorMin);
  const { min, max } = SIGNAL_RANGES[input.signalType];
  const signalValue = min + fraction * (max - min);
  const raw = Math.round(fraction * input.adcFullScale);
  const isBroken = input.signalType === '4-20mA' && signalValue < 3.6;
  return { fraction, raw, signalValue, isBroken };
}

/** По сырому числу АЦП — сигнал и физическая величина. */
export function analogFromRaw(input: AnalogInput, raw: number) {
  const fraction = raw / input.adcFullScale;
  const { min, max } = SIGNAL_RANGES[input.signalType];
  const signalValue = min + fraction * (max - min);
  const physical = input.sensorMin + fraction * (input.sensorMax - input.sensorMin);
  const isBroken = input.signalType === '4-20mA' && signalValue < 3.6;
  return { fraction, signalValue, physical, isBroken };
}

// ---------- 2. Modbus: смещение адресов ----------

export type ModbusRefType = 'coil' | 'discrete_input' | 'input_register' | 'holding_register';

const MODBUS_PREFIX: Record<ModbusRefType, number> = {
  coil: 0,
  discrete_input: 1,
  input_register: 3,
  holding_register: 4,
};

export interface ModbusAddress {
  refType: ModbusRefType;
  protocolAddress: number; // 0-based адрес в самом протоколе
}

/** Разбирает "40001" / "4x0001" / голое число протокольного регистра. */
export function parseModbusAddress(raw: string): ModbusAddress {
  const s = raw.trim().toLowerCase();

  const xMatch = s.match(/^(\d)x0*(\d+)$/); // 4x0001
  if (xMatch) {
    const prefixDigit = Number(xMatch[1]);
    const conventional = Number(xMatch[2]);
    const refType = (Object.entries(MODBUS_PREFIX).find(([, p]) => p === prefixDigit)?.[0] ?? 'holding_register') as ModbusRefType;
    return { refType, protocolAddress: conventional - 1 };
  }

  const classic = s.match(/^(\d)(\d{4,5})$/); // 40001 / 400001
  if (classic) {
    const prefixDigit = Number(classic[1]);
    const conventional = Number(classic[2]);
    const known = Object.entries(MODBUS_PREFIX).find(([, p]) => p === prefixDigit);
    if (known) return { refType: known[0] as ModbusRefType, protocolAddress: conventional - 1 };
  }

  // голое число — считаем протокольным адресом holding register
  const bare = Number(s);
  return { refType: 'holding_register', protocolAddress: Number.isFinite(bare) ? bare : 0 };
}

export function formatModbusAddress(addr: ModbusAddress) {
  const prefix = MODBUS_PREFIX[addr.refType];
  const conventional = addr.protocolAddress + 1;
  return {
    conventional: `${prefix}${String(conventional).padStart(4, '0')}`,
    xNotation: `${prefix}x${String(conventional).padStart(4, '0')}`,
    protocolAddress: addr.protocolAddress,
    refType: addr.refType,
  };
}

export type ByteOrder = 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';

/** Представление 32-битного числа в четырёх вариантах порядка байт/регистров. */
export function byteOrderVariants(value: number): Record<ByteOrder, string> {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, value >>> 0, false); // big-endian A B C D
  const A = view.getUint8(0), B = view.getUint8(1), C = view.getUint8(2), D = view.getUint8(3);
  const hex = (...bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return {
    ABCD: hex(A, B, C, D),
    CDAB: hex(C, D, A, B),
    BADC: hex(B, A, D, C),
    DCBA: hex(D, C, B, A),
  };
}

// ---------- 3. Падение напряжения и сечение кабеля ----------

export type CableMaterial = 'copper' | 'aluminum';
export type PhaseMode = 'dc_or_1phase' | '3phase';

const RESISTIVITY: Record<CableMaterial, number> = {
  copper: 0.0175, // Ω·мм²/м при 20°C
  aluminum: 0.028,
};

export interface VoltageDropInput {
  lengthM: number;
  currentA: number;
  crossSectionMm2: number;
  material: CableMaterial;
  phaseMode: PhaseMode;
  nominalVoltage: number;
}

export function voltageDrop(input: VoltageDropInput) {
  const k = input.phaseMode === '3phase' ? Math.sqrt(3) : 2;
  const rho = RESISTIVITY[input.material];
  const dropV = (k * input.lengthM * input.currentA * rho) / input.crossSectionMm2;
  const dropPercent = (dropV / input.nominalVoltage) * 100;
  return { dropV, dropPercent };
}

/** Обратная задача: минимальное сечение под допустимое падение (в %). */
export function requiredCrossSection(input: Omit<VoltageDropInput, 'crossSectionMm2'> & { maxDropPercent: number }) {
  const k = input.phaseMode === '3phase' ? Math.sqrt(3) : 2;
  const rho = RESISTIVITY[input.material];
  const maxDropV = (input.maxDropPercent / 100) * input.nominalVoltage;
  return (k * input.lengthM * input.currentA * rho) / maxDropV;
}

// ---------- 4. Конвейер ----------

export function conveyorThroughputPerMin(beltSpeedMPerMin: number, itemPitchMm: number) {
  const speedMmPerMin = beltSpeedMPerMin * 1000;
  return speedMmPerMin / itemPitchMm;
}

export function conveyorTraverseTimeSec(sectionLengthM: number, beltSpeedMPerMin: number) {
  return (sectionLengthM / beltSpeedMPerMin) * 60;
}

// ---------- 5. Время разгона привода ----------

/** t = J·Δω / M, Δn в об/мин переводится в рад/с. */
export function accelerationTimeSec(inertiaKgM2: number, deltaRpm: number, torqueNm: number) {
  const deltaOmega = (2 * Math.PI * deltaRpm) / 60;
  return (inertiaKgM2 * deltaOmega) / torqueNm;
}

// ---------- 6. IP и подсеть ----------

export function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function subnetInfo(ip: string, prefix: number) {
  const ipInt = ipToInt(ip);
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipInt & maskInt;
  const broadcast = network | (~maskInt >>> 0);
  const totalHosts = 2 ** (32 - prefix);
  const usableHosts = prefix >= 31 ? 0 : totalHosts - 2;
  return {
    networkAddress: intToIp(network),
    broadcastAddress: intToIp(broadcast),
    subnetMask: intToIp(maskInt),
    firstHost: prefix >= 31 ? intToIp(network) : intToIp(network + 1),
    lastHost: prefix >= 31 ? intToIp(broadcast) : intToIp(broadcast - 1),
    usableHosts,
  };
}

// ---------- 7. Время цикла ----------

export function cycleTimeCheck(operationsCount: number, perOperationMs: number, targetScanMs: number) {
  const totalMs = operationsCount * perOperationMs;
  return { totalMs, exceedsTarget: totalMs > targetScanMs, marginMs: targetScanMs - totalMs };
}
