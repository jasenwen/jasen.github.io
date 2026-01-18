import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartDataPoint } from '../types';
import { Layers, LayoutList } from 'lucide-react';

interface CapacityChartProps {
  data: ChartDataPoint[];
  viewMode: 'stacked' | 'split';
  onViewModeChange: (mode: 'stacked' | 'split') => void;
}

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const isStacked = viewMode === 'stacked';
    
    // Dynamic Gap Calculation for Tooltip Display
    // Stacked: Capacity - (Orders + Backlog)
    // Split: Capacity - Orders
    const gapValue = isStacked 
      ? dataPoint.actualCapacity - dataPoint.totalRequirement
      : dataPoint.actualCapacity - dataPoint.demand;

    return (
      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg text-sm min-w-[240px]">
        <p className="font-bold text-slate-800 mb-3 text-base border-b border-slate-100 pb-2">{label}</p>
        
        {/* Capacity Section */}
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Current Simulation</p>
          <div className="flex justify-between items-center text-slate-500 text-xs">
             <span>Max Capacity:</span>
             <span className="font-mono font-medium">{dataPoint.theoreticalMax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-blue-600 font-bold">
            <span>Effective Output:</span>
            <span className="font-mono">{dataPoint.actualCapacity.toLocaleString()}</span>
          </div>
        </div>

        {/* Benchmarks Section */}
        <div className="mb-3 space-y-1 bg-slate-50 -mx-4 px-4 py-2 border-y border-slate-100">
           <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Scenarios (Fixed OT)</p>
           <div className="flex justify-between items-center text-emerald-600 text-xs">
              <span>OT+0 (Baseline):</span>
              <span className="font-mono font-medium">{dataPoint.capacityOT0.toLocaleString()}</span>
           </div>
           <div className="flex justify-between items-center text-amber-600 text-xs">
              <span>OT+2 (Moderate):</span>
              <span className="font-mono font-medium">{dataPoint.capacityOT2.toLocaleString()}</span>
           </div>
           <div className="flex justify-between items-center text-red-600 text-xs">
              <span>OT+4 (Max):</span>
              <span className="font-mono font-medium">{dataPoint.capacityOT4.toLocaleString()}</span>
           </div>
        </div>

        {/* Demand Section */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Demand Requirement</p>
          <div className="flex justify-between items-center text-indigo-600">
             <span>New Orders:</span>
             <span className="font-mono">{dataPoint.demand.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-amber-600">
             <span>Backlog:</span>
             <span className="font-mono">{dataPoint.backlog.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 mt-1 pt-1 font-bold text-slate-800">
             <span>Total Required:</span>
             <span className="font-mono">{dataPoint.totalRequirement.toLocaleString()}</span>
          </div>
        </div>

        {/* Dynamic Gap Indicator */}
        <div className={`mt-3 pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm ${gapValue < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
           <span>{isStacked ? "Gap (Net Total):" : "Gap (Orders Only):"}</span>
           <span className="font-mono">{gapValue > 0 ? '+' : ''}{gapValue.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CapacityChart: React.FC<CapacityChartProps> = ({ data, viewMode, onViewModeChange }) => {
  const isStacked = viewMode === 'stacked';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Capacity Scenarios vs. Demand</h2>
          <p className="text-xs text-slate-400">
             Lines represent fixed Overtime scenarios (0, 2, 4 days) based on current shift/machine config.
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-lg mt-3 sm:mt-0 self-start sm:self-auto">
          <button
            onClick={() => onViewModeChange('stacked')}
            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isStacked 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3 h-3 mr-1.5" />
            Stacked Demand
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !isStacked 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList className="w-3 h-3 mr-1.5" />
            Split Demand
          </button>
        </div>
      </div>

      {/* Chart Area */}
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
            barGap={4}
          >
            <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              label={{ value: 'Units', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
            />
            {/* Pass viewMode to Tooltip to enable dynamic gap logic in the popup */}
            <Tooltip content={<CustomTooltip viewMode={viewMode} />} cursor={{ fill: '#f8fafc' }} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="plain"
              formatter={(value, entry: any) => {
                 const isLine = entry.type === undefined || entry.type === 'line';
                 return <span className={`text-xs font-medium ${isLine ? 'text-slate-800' : 'text-slate-500'}`}>{value}</span>
              }}
            />
            
            {/* --- BENCHMARK LINES --- */}
            {/* OT+0: Green/Emerald */}
            <Line 
              type="monotone" 
              dataKey="capacityOT0" 
              name="Cap (OT+0)" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false}
              strokeDasharray="4 4"
            />
            {/* OT+2: Orange/Amber */}
            <Line 
              type="monotone" 
              dataKey="capacityOT2" 
              name="Cap (OT+2)" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={false}
              strokeDasharray="4 4"
            />
            {/* OT+4: Red */}
            <Line 
              type="monotone" 
              dataKey="capacityOT4" 
              name="Cap (OT+4)" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={false}
              strokeDasharray="4 4"
            />

            {/* --- ACTUAL BARS --- */}
            {/* GROUP 1: ACTUAL CAPACITY */}
            <Bar 
              dataKey="actualCapacity" 
              name="Effective Output" 
              stackId="a" 
              fill="#3b82f6" 
              barSize={isStacked ? 40 : 30}
              radius={[0, 0, 4, 4]} 
            />
            <Bar 
              dataKey="unusedCapacity" 
              name="Unused Potential" 
              stackId="a" 
              fill="#e2e8f0" 
              barSize={isStacked ? 40 : 30}
              radius={[4, 4, 0, 0]}
            />

            {/* GROUP 2: DEMAND */}
            <Bar 
              dataKey="demand" 
              name="New Orders" 
              stackId={isStacked ? "b" : "c"} 
              fill="#6366f1" 
              barSize={isStacked ? 40 : 30}
              radius={isStacked ? [0, 0, 4, 4] : [4, 4, 0, 0]}
            />
            <Bar 
              dataKey="backlog" 
              name="Backlog / Carry Over" 
              stackId={isStacked ? "b" : "d"} 
              fill="#f59e0b" 
              barSize={isStacked ? 40 : 30}
              radius={[4, 4, 0, 0]} 
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
         * "Unused Potential" represents the gap between 24/7 theoretical max and current shift configuration.
      </div>
    </div>
  );
};

export default CapacityChart;