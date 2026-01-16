import React, { useState, useEffect } from 'react';
import { DemandForecast, ProductLine } from '../types';
import { ArrowLeft, Save, TrendingUp, AlertCircle } from 'lucide-react';

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
  }, [initialData]);

  const handleValueChange = (index: number, newValue: string) => {
    const numValue = parseInt(newValue, 10);
    if (isNaN(numValue)) return;

    const updated = [...forecasts];
    updated[index].value = numValue;
    setForecasts(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(forecasts);
    onBack();
  };

  const totalDemand = forecasts.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Demand Management</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              {productLine} • {currentDate}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center px-6 py-2 rounded-lg font-medium shadow-sm transition-colors ${
              hasChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        
        {/* Summary Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 mb-8 flex items-start space-x-4">
          <div className="bg-indigo-100 p-2 rounded-full mt-1">
            <TrendingUp className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h3 className="text-indigo-900 font-semibold text-lg">N+3 Total Demand Volume</h3>
            <p className="text-indigo-700 mt-1">
              Adjusting these values will directly impact the Capacity Gap analysis and KPI calculations on the main dashboard.
            </p>
            <div className="mt-2 text-2xl font-bold text-indigo-800">
              {totalDemand.toLocaleString()} <span className="text-sm font-normal text-indigo-600">units</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Forecast Data Entry</h3>
            <span className="text-xs text-slate-400 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Values are in units
            </span>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Period
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Product Line
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Order Volume (Units)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {forecasts.map((item, index) => {
                const isEdited = item.value !== initialData[index].value;
                return (
                  <tr key={item.month} className={isEdited ? 'bg-blue-50/30' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {productLine}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="relative rounded-md shadow-sm max-w-[140px]">
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => handleValueChange(index, e.target.value)}
                          className={`block w-full rounded-md border-slate-300 pl-3 pr-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border ${isEdited ? 'border-blue-400 ring-1 ring-blue-400' : ''}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEdited ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Modified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          System Generated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default DemandPlanningScreen;