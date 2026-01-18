import React, { useState } from 'react';
import { DeviceConfig } from '../types';
import { Settings, Save, Wand2, Info, CheckCircle, CalendarDays } from 'lucide-react';

interface SimulationPanelProps {
  productLine: string;
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  devices: DeviceConfig[];
  onChange: (newDevices: DeviceConfig[]) => void;
  onSave: () => void;
  onAIAnalyze: () => void;
  isAnalyzing: boolean;
  aiAnalysis: string | null;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ 
  productLine,
  availableMonths,
  selectedMonth,
  onMonthChange,
  devices, 
  onChange, 
  onSave,
  onAIAnalyze,
  isAnalyzing,
  aiAnalysis
}) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  
  const handleDeviceChange = (id: number, field: keyof DeviceConfig, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    const newDevices = devices.map(d => {
      if (d.id === id) {
        return { ...d, [field]: numValue };
      }
      return d;
    });
    onChange(newDevices);
  };

  const handleSaveClick = () => {
    onSave();
    setSaveStatus('saved');
    
    // Reset back to idle after 2 seconds
    setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  };

  return (
    <div className="bg-white w-full lg:w-96 p-6 shadow-sm border-l border-slate-200 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center space-x-2 mb-6 text-slate-800">
        <Settings className="w-5 h-5" />
        <h2 className="font-bold text-lg">Simulation & Adjustment</h2>
      </div>

      {/* Month Selector */}
      <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Target Planning Period
        </label>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 text-sm border-slate-300 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm bg-white"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Parameters below apply ONLY to the selected month.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Device Parameters ({selectedMonth})</h3>
          <div className="group relative">
             <Info className="w-4 h-4 text-slate-400 cursor-help" />
             <div className="hidden group-hover:block absolute right-0 w-48 bg-slate-800 text-white text-xs p-2 rounded z-10">
               Adjust capacity drivers for {selectedMonth}. Changes update the chart immediately.
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Units per shift">Cap/Sft</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Shifts per day">Shft</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Maintenance Days">MNT</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Weekend Overtime Days">OT</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-slate-700">
                    {device.name}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap">
                    <input 
                      type="number" 
                      min="0"
                      className="w-14 text-center border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={device.baseCapacity}
                      onChange={(e) => handleDeviceChange(device.id, 'baseCapacity', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap">
                    <input 
                      type="number" 
                      min="0" max="3" 
                      className="w-10 text-center border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={device.shifts}
                      onChange={(e) => handleDeviceChange(device.id, 'shifts', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap">
                    <input 
                      type="number" 
                      min="0" max="30" 
                      className="w-10 text-center border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={device.maintenanceDays}
                      onChange={(e) => handleDeviceChange(device.id, 'maintenanceDays', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap">
                    <input 
                      type="number" 
                      min="0" max="8" 
                      className="w-10 text-center border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={device.overtimeDays}
                      onChange={(e) => handleDeviceChange(device.id, 'overtimeDays', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <button 
        onClick={handleSaveClick}
        disabled={saveStatus === 'saved'}
        className={`w-full font-medium py-3 rounded-lg shadow-sm transition-all duration-300 flex justify-center items-center mb-4 ${
          saveStatus === 'saved' 
            ? 'bg-green-600 text-white hover:bg-green-700 transform scale-[1.02]' 
            : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
        }`}
      >
        {saveStatus === 'saved' ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save All Periods
          </>
        )}
      </button>

      <div className="border-t border-slate-100 my-4 pt-4">
         <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
            <Wand2 className="w-4 h-4 mr-2 text-purple-600" />
            AI Assistant
         </h3>
         
         {!aiAnalysis ? (
           <button 
             onClick={onAIAnalyze}
             disabled={isAnalyzing}
             className="w-full bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 font-medium py-2 rounded-lg shadow-sm transition-colors text-sm"
           >
             {isAnalyzing ? 'Analyzing Scenario...' : 'Analyze Capacity Risks'}
           </button>
         ) : (
           <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-xs text-slate-700 leading-relaxed">
             <div className="font-semibold text-purple-800 mb-1">Gemini Insight:</div>
             {aiAnalysis}
             <button 
                onClick={onAIAnalyze} 
                className="mt-2 text-purple-600 underline text-xs w-full text-right"
             >
                Refresh Analysis
             </button>
           </div>
         )}
      </div>

      <div className="mt-auto pt-6 text-xs text-slate-400 text-center">
        S&OP Planner v2.4.4
      </div>
    </div>
  );
};

export default SimulationPanel;