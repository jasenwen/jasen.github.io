export interface ChartDataPoint {
  month: string;
  theoreticalMax: number;
  actualCapacity: number;
  demand: number;
  // For stacked visualization
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
  capacityGap: number;
  utilizationRate: number;
}

export interface DemandForecast {
  month: string;
  value: number;
  isLocked?: boolean; // To indicate manually edited values in future iterations
}

export enum ProductLine {
  Standard = 'Standard Spark Plugs',
  Iridium = 'Iridium High-Performance',
  Platinum = 'Platinum Long-Life',
  Industrial = 'Industrial Gas Engine'
}