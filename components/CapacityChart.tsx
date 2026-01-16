import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ChartDataPoint } from '../types';

interface CapacityChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-md text-sm">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-indigo-600 font-semibold">
            Actual Capacity: {payload.find((p: any) => p.dataKey === 'actualCapacity')?.value.toLocaleString()}
          </p>
          <p className="text-slate-400">
            Max Potential: {(payload.find((p: any) => p.dataKey === 'actualCapacity')?.payload.theoreticalMax).toLocaleString()}
          </p>
          <p className="text-red-600 font-bold border-t border-slate-100 pt-1 mt-1">
            Order Demand: {payload.find((p: any) => p.dataKey === 'demand')?.value.toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CapacityChart: React.FC<CapacityChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Capacity vs. Demand (N to N+3)</h2>
      <div className="flex-grow min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#64748b' }} 
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              label={{ value: 'Units', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            
            {/* 
              Stacked approach to show Theoretical Max as background 
              Bottom Stack: Actual Capacity (Blue)
              Top Stack: Unused Capacity (Gray)
              Sum = Theoretical Max
            */}
            <Bar 
              dataKey="actualCapacity" 
              name="Calculated Capacity" 
              stackId="a" 
              fill="#3b82f6" 
              barSize={60}
              radius={[0, 0, 4, 4]} 
            />
            <Bar 
              dataKey="unusedCapacity" 
              name="Theoretical Max Gap" 
              stackId="a" 
              fill="#e2e8f0" 
              barSize={60}
              radius={[4, 4, 0, 0]}
            />

            <Line 
              type="monotone" 
              dataKey="demand" 
              name="Order Demand" 
              stroke="#ef4444" 
              strokeWidth={3} 
              dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-slate-500">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          <span>Effective Output</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-slate-200 rounded-full mr-2"></span>
          <span>Unused Potential (Loss due to Maint/Labor)</span>
        </div>
        <div className="flex items-center">
          <span className="w-8 h-1 bg-red-500 rounded-full mr-2"></span>
          <span>Customer Demand</span>
        </div>
      </div>
    </div>
  );
};

export default CapacityChart;
