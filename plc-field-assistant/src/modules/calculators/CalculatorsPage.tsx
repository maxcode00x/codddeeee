import { AnalogCalculator } from './AnalogCalculator';
import { ModbusCalculator } from './ModbusCalculator';
import { VoltageDropCalculator } from './VoltageDropCalculator';
import { ConveyorCalculator } from './ConveyorCalculator';
import { AccelerationCalculator } from './AccelerationCalculator';
import { SubnetCalculator } from './SubnetCalculator';
import { CycleTimeCalculator } from './CycleTimeCalculator';

export function CalculatorsPage() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <AnalogCalculator />
      <ModbusCalculator />
      <VoltageDropCalculator />
      <ConveyorCalculator />
      <AccelerationCalculator />
      <SubnetCalculator />
      <CycleTimeCalculator />
    </div>
  );
}
