export interface ChartDataPoint {
  month: string;
  theoreticalMax: number;
  actualCapacity: number;
  capacityOT0: number; // Benchmark: 0 Overtime days
  capacityOT2: number; // Benchmark: 2 Overtime days
  capacityOT4: number; // Benchmark: 4 Overtime days
  demand: number;      // New Orders
  backlog: number;     // Back Orders
  totalRequirement: number; // demand + backlog
  unusedCapacity: number; 
}

export interface DeviceConfig {
  id: number;
  name: string;
  shifts: number;
  maintenanceDays: number;
  overtimeDays: number;
  baseCapacity: number; // Units per shift
}

export interface SimulationParams {
  productLine: string;
  devices: DeviceConfig[];
}

export interface KPI {
  annualTarget: number;
  currentOrderVolume: number;
  totalBacklog: number;
  capacityGap: number;
  utilizationRate: number;
}

export interface DemandForecast {
  month: string;
  value: number;     // New Orders
  backOrder: number; // Backlog/Carry Over
  isLocked?: boolean; 
}

export enum ProductLine {
  Standard = 'Standard Series',
  Iridium = 'Performance Series',
  Platinum = 'Premium Series',
  Industrial = 'Industrial Heavy-Duty'
}