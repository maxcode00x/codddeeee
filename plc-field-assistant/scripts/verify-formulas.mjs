// Проверка численной логики калькуляторов на известных примерах из ТЗ,
// до вкрутки в UI. Запуск: node --experimental-strip-types scripts/verify-formulas.mjs
import {
  analogFromSignal,
  analogFromPhysical,
  parseModbusAddress,
  formatModbusAddress,
  byteOrderVariants,
  voltageDrop,
  conveyorThroughputPerMin,
  conveyorTraverseTimeSec,
  accelerationTimeSec,
  subnetInfo,
  cycleTimeCheck,
} from '../src/modules/calculators/formulas.ts';

let passed = 0, failed = 0;
function approx(a, b, eps = 0.01) { return Math.abs(a - b) < eps; }
function test(name, fn) {
  try { fn(); passed++; console.log('OK   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' -> ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// --- Аналоговый сигнал: пример из тома 1 ---
// датчик 0-10 бар, пришло 12 мА -> 5 бар
test('analog: 12mA on 0-10bar -> 5 bar', () => {
  const r = analogFromSignal({ signalType: '4-20mA', adcFullScale: 27648, sensorMin: 0, sensorMax: 10 }, 12);
  assert(approx(r.physical, 5), `expected 5, got ${r.physical}`);
});

// обратная: нужно 7.5 бар -> 16 мА
test('analog: 7.5 bar -> 16mA', () => {
  const r = analogFromPhysical({ signalType: '4-20mA', adcFullScale: 27648, sensorMin: 0, sensorMax: 10 }, 7.5);
  assert(approx(r.signalValue, 16), `expected 16, got ${r.signalValue}`);
});

// пример из ТЗ: -20..+80°C, 8мА
test('analog: temperature -20..80, 8mA', () => {
  const r = analogFromSignal({ signalType: '4-20mA', adcFullScale: 27648, sensorMin: -20, sensorMax: 80 }, 8);
  // (8-4)/16 = 0.25 -> -20 + 0.25*100 = 5
  assert(approx(r.physical, 5), `expected 5, got ${r.physical}`);
});

test('analog: break detection below 3.6mA', () => {
  const r = analogFromSignal({ signalType: '4-20mA', adcFullScale: 27648, sensorMin: 0, sensorMax: 10 }, 2);
  assert(r.isBroken === true, 'expected isBroken true');
});

test('analog: raw ADC at full scale Siemens 27648', () => {
  const r = analogFromSignal({ signalType: '4-20mA', adcFullScale: 27648, sensorMin: 0, sensorMax: 10 }, 20);
  assert(r.raw === 27648, `expected 27648, got ${r.raw}`);
});

// --- Modbus ---
test('modbus: 40001 -> holding register 0', () => {
  const a = parseModbusAddress('40001');
  assert(a.refType === 'holding_register' && a.protocolAddress === 0, JSON.stringify(a));
});
test('modbus: 4x0001 -> holding register 0', () => {
  const a = parseModbusAddress('4x0001');
  assert(a.refType === 'holding_register' && a.protocolAddress === 0, JSON.stringify(a));
});
test('modbus: bare register 10 -> formats back to 40011', () => {
  const a = parseModbusAddress('10');
  const f = formatModbusAddress(a);
  assert(f.conventional === '40011', JSON.stringify(f));
});
test('modbus: round-trip 30005 (input register)', () => {
  const a = parseModbusAddress('30005');
  assert(a.refType === 'input_register' && a.protocolAddress === 4, JSON.stringify(a));
  const f = formatModbusAddress(a);
  assert(f.conventional === '30005', JSON.stringify(f));
});
test('modbus: byte order variants of 0x12345678', () => {
  const v = byteOrderVariants(0x12345678);
  assert(v.ABCD === '12345678', v.ABCD);
  assert(v.CDAB === '56781234', v.CDAB);
  assert(v.BADC === '34127856', v.BADC);
  assert(v.DCBA === '78563412', v.DCBA);
});

// --- Падение напряжения ---
// медь, 50м, 10А, 2.5мм2, однофазно, 230В: dU = 2*50*10*0.0175/2.5 = 7V
test('voltage drop: copper 50m 10A 2.5mm2', () => {
  const r = voltageDrop({ lengthM: 50, currentA: 10, crossSectionMm2: 2.5, material: 'copper', phaseMode: 'dc_or_1phase', nominalVoltage: 230 });
  assert(approx(r.dropV, 7, 0.05), `expected ~7V, got ${r.dropV}`);
});

// --- Конвейер ---
test('conveyor: 12 m/min belt, 100mm pitch -> 120 pcs/min', () => {
  const r = conveyorThroughputPerMin(12, 100);
  assert(approx(r, 120), `expected 120, got ${r}`);
});
test('conveyor: 10m section at 5 m/min -> 120s', () => {
  const r = conveyorTraverseTimeSec(10, 5);
  assert(approx(r, 120), `expected 120s, got ${r}`);
});

// --- Разгон привода ---
// J=0.5 kg*m2, deltaRpm=1500, M=10 Nm
test('acceleration time', () => {
  const r = accelerationTimeSec(0.5, 1500, 10);
  const expected = (0.5 * (2 * Math.PI * 1500 / 60)) / 10;
  assert(approx(r, expected), `expected ${expected}, got ${r}`);
});

// --- Подсеть ---
test('subnet: 192.168.1.10/24', () => {
  const r = subnetInfo('192.168.1.10', 24);
  assert(r.networkAddress === '192.168.1.0', r.networkAddress);
  assert(r.broadcastAddress === '192.168.1.255', r.broadcastAddress);
  assert(r.usableHosts === 254, String(r.usableHosts));
  assert(r.firstHost === '192.168.1.1', r.firstHost);
  assert(r.lastHost === '192.168.1.254', r.lastHost);
});
test('subnet: /30 point-to-point', () => {
  const r = subnetInfo('10.0.0.0', 30);
  assert(r.usableHosts === 2, String(r.usableHosts));
});

// --- Время цикла ---
test('cycle time: 100 ops * 0.5ms = 50ms, target 100ms -> ok', () => {
  const r = cycleTimeCheck(100, 0.5, 100);
  assert(r.totalMs === 50 && r.exceedsTarget === false, JSON.stringify(r));
});
test('cycle time: exceeds target', () => {
  const r = cycleTimeCheck(1000, 0.5, 100);
  assert(r.exceedsTarget === true, JSON.stringify(r));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
