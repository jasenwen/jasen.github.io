import React, { useState, useEffect } from 'react';
import { DemandForecast, ProductLine } from '../types';
import { Save, TrendingUp, AlertCircle, RefreshCw, History } from 'lucide-react';

interface DemandPlanningScreenProps {
  productLine: ProductLine;
  currentDate: string;
  initialData: DemandForecast[];
  onSave: (newData: DemandForecast[]) => void;
  onBack: () => void;
}

const DemandPlanningScreen: React.FC<DemandPlanningScreenProps> = ({
  productLine,
  currentDate,
  initialData,
  onSave,
  onBack,
}) => {
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Deep copy to avoid mutating props directly
    setForecasts(initialData.map(d => ({ ...d })));
    setHasChanges(false);
  }, [initialData]);

  const handleValueChange = (index: number, field: keyof DemandForecast, newValue: string) => {
    const numValue = parseInt(newValue, 10);
    if (isNaN(numValue)) return;

    const updated = [...forecasts];
    // @ts-ignore - we know field is value or backOrder which are numbers
    updated[index][field] = numValue;
    setForecasts(updated);
    setHasChanges(true);
  };

  const handleReset = () => {
    setForecasts(initialData.map(d => ({ ...d })));
    setHasChanges(false);
  };

  const handleSave = () => {
    onSave(forecasts);
    setHasChanges(false); // Reset change state after save
  };

  const totalNewOrders = forecasts.reduce((acc, curr) => acc + curr.value, 0);
  const totalBacklog = forecasts.reduce((acc, curr) => acc + (curr.backOrder || 0), 0);
  const totalDemand = totalNewOrders + totalBacklog;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Local Toolbar for Demand Planning */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
           <h2 className="text-xl font-bold text-slate-800">Demand Forecast Adjustment</h2>
           <p className="text-xs text-slate-500">Edit New Orders and Backlog Recovery Plans.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={`px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center text-sm ${!hasChanges ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center px-5 py-2 rounded-lg font-medium shadow-sm transition-all duration-200 text-sm ${
              hasChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white translate-y-0' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-8 max-w-5xl mx-auto w-full">
        
        {/* Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
               <div className="bg-blue-50 p-3 rounded-full">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Total New Orders</div>
                  <div className="text-2xl font-bold text-slate-800">{totalNewOrders.toLocaleString()}</div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
               <div className="bg-orange-50 p-3 rounded-full">
                  <History className="w-5 h-5 text-orange-600" />
               </div>
               <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Total Backlog</div>
                  <div className="text-2xl font-bold text-slate-800">{totalBacklog.toLocaleString()}</div>
               </div>
            </div>

            <div className="bg-indigo-600 border border-indigo-700 rounded-lg p-5 shadow-sm flex items-center space-x-4 text-white">
               <div className="bg-indigo-500/50 p-3 rounded-full">
                  <AlertCircle className="w-5 h-5 text-white" />
               </div>
               <div>
                  <div className="text-xs text-indigo-100 uppercase font-semibold">Total Requirement</div>
                  <div className="text-2xl font-bold">{totalDemand.toLocaleString()}</div>
               </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              Forecast Data Entry
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase">
                {productLine}
              </span>
            </h3>
            <span className="text-xs text-slate-500 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Total = Orders + Backlog
            </span>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Planning Period
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  New Orders
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Backlog / Carry Over
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Required
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {forecasts.map((item, index) => {
                const originalItem = initialData[index];
                const isEdited = item.value !== originalItem.value || item.backOrder !== originalItem.backOrder;
                const totalReq = item.value + (item.backOrder || 0);
                
                return (
                  <tr key={item.month} className={`transition-colors ${isEdited ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="relative rounded-md shadow-sm max-w-[140px]">
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => handleValueChange(index, 'value', e.target.value)}
                          className="block w-full rounded-md border-slate-300 pl-3 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="relative rounded-md shadow-sm max-w-[140px]">
                        <input
                          type="number"
                          value={item.backOrder || 0}
                          onChange={(e) => handleValueChange(index, 'backOrder', e.target.value)}
                          className="block w-full rounded-md border-slate-300 pl-3 pr-3 py-2 text-sm focus:border-orange-500 focus:ring-orange-500 border"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       <span className="font-bold text-slate-800">{totalReq.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEdited ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Modified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Saved
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DemandPlanningScreen;