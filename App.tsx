import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Layers, Edit3 } from 'lucide-react';
import { ProductLine, SimulationParams, ChartDataPoint, KPI, DemandForecast } from './types';
import KPICards from './components/KPICards';
import CapacityChart from './components/CapacityChart';
import SimulationPanel from './components/SimulationPanel';
import DemandPlanningScreen from './components/DemandPlanningScreen';
import { analyzeCapacityRisks } from './services/geminiService';

const App: React.FC = () => {
  // --- View State ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'demand-planning'>('dashboard');

  // --- Data State ---
  const [selectedProduct, setSelectedProduct] = useState<ProductLine>(ProductLine.Standard);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Initial default params (will be updated by useEffect)
  const [params, setParams] = useState<SimulationParams>({
    productLine: ProductLine.Standard,
    devices: [
      { id: 1, name: 'Press Machine #1', shifts: 2, maintenanceDays: 1, overtimeDays: 0, baseCapacity: 250 },
      { id: 2, name: 'Firing Kiln A', shifts: 3, maintenanceDays: 0, overtimeDays: 0, baseCapacity: 280 },
      { id: 3, name: 'Assembly Line 1', shifts: 2, maintenanceDays: 1, overtimeDays: 2, baseCapacity: 220 }
    ]
  });

  const [demandData, setDemandData] = useState<DemandForecast[]>([]);
  // Cache for user-modified forecasts
  const [savedScenarios, setSavedScenarios] = useState<Record<string, DemandForecast[]>>({});
  // Cache for user-modified simulation params
  const [savedSimParams, setSavedSimParams] = useState<Record<string, SimulationParams>>({});

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // --- Helper: Get Default Params based on Product Line ---
  const getDefaultParams = useCallback((product: ProductLine): SimulationParams => {
    const difficultyFactor = product === ProductLine.Iridium ? 0.7 : 
                             product === ProductLine.Industrial ? 0.5 : 1.0;
    
    return {
      productLine: product,
      devices: [
        { id: 1, name: 'Press Machine #1', shifts: 2, maintenanceDays: 1, overtimeDays: 0, baseCapacity: Math.floor(250 * difficultyFactor) },
        { id: 2, name: 'Firing Kiln A', shifts: 3, maintenanceDays: 0, overtimeDays: 0, baseCapacity: Math.floor(280 * difficultyFactor) },
        { id: 3, name: 'Assembly Line 1', shifts: 2, maintenanceDays: 1, overtimeDays: 2, baseCapacity: Math.floor(220 * difficultyFactor) }
      ]
    };
  }, []);

  // --- 1. Load Data Effect (Demand & Params) ---
  useEffect(() => {
    const scenarioKey = `${selectedProduct}-${currentDate}`;

    // --- Load Demand Data ---
    if (savedScenarios[scenarioKey]) {
      setDemandData(savedScenarios[scenarioKey]);
    } else {
      // Generate fresh baseline
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startMonthIndex = parseInt(currentDate.split('-')[1]) - 1;
      
      let baseLoad = 40000; 
      if (selectedProduct === ProductLine.Iridium) baseLoad = 32000;
      if (selectedProduct === ProductLine.Industrial) baseLoad = 25000;
      
      const generatedDemand: DemandForecast[] = [];
      for (let i = 0; i < 4; i++) {
        const monthIndex = (startMonthIndex + i) % 12;
        const monthLabel = months[monthIndex];
        const isPeakSeason = [8, 9, 10].includes(monthIndex); 
        const seasonalFactor = isPeakSeason ? 1.25 : 0.95;
        const noise = 1 + (Math.sin(monthIndex * 132.1) * 0.1); 
        
        generatedDemand.push({
          month: `${monthLabel} N${i > 0 ? `+${i}` : ''}`,
          value: Math.floor(baseLoad * seasonalFactor * noise)
        });
      }
      setDemandData(generatedDemand);
    }

    // --- Load Simulation Params ---
    if (savedSimParams[scenarioKey]) {
      setParams(savedSimParams[scenarioKey]);
    } else {
      setParams(getDefaultParams(selectedProduct));
    }
    
    // Reset AI analysis on context switch
    setAiAnalysis(null);

  }, [selectedProduct, currentDate, savedScenarios, savedSimParams, getDefaultParams]);


  // --- 2. Dynamic Capacity Calculation ---
  const { chartData, kpi } = useMemo(() => {
    const standardWorkingDays = 22;
    const maxTheoreticalDays = 30;
    
    let processedData: ChartDataPoint[] = [];
    let totalAnnualTarget = 0;
    let totalOrderVolume = 0;
    let cumulativeGap = 0;
    let totalUtilization = 0;

    demandData.forEach((d) => {
      let monthlyActualCapacity = 0;
      let monthlyTheoreticalMax = 0;

      params.devices.forEach(device => {
        monthlyTheoreticalMax += (3 * maxTheoreticalDays * device.baseCapacity);
        const effectiveDays = Math.max(0, standardWorkingDays + device.overtimeDays - device.maintenanceDays);
        monthlyActualCapacity += (effectiveDays * device.shifts * device.baseCapacity);
      });
      
      const gap = monthlyActualCapacity - d.value;
      
      processedData.push({
        month: d.month,
        theoreticalMax: monthlyTheoreticalMax,
        actualCapacity: monthlyActualCapacity,
        demand: d.value,
        unusedCapacity: Math.max(0, monthlyTheoreticalMax - monthlyActualCapacity)
      });

      totalAnnualTarget += monthlyTheoreticalMax * 0.75; 
      totalOrderVolume += d.value;
      cumulativeGap += gap;
      totalUtilization += (d.value / (monthlyActualCapacity || 1));
    });

    return {
      chartData: processedData,
      kpi: {
        annualTarget: Math.floor(totalAnnualTarget * 3),
        currentOrderVolume: totalOrderVolume,
        capacityGap: cumulativeGap,
        utilizationRate: Math.min((totalUtilization / 4) * 100, 100)
      }
    };
  }, [params, demandData]);


  // --- Event Handlers ---
  const handleSimParamsChange = (newParams: SimulationParams) => {
    setParams(newParams);
    if (aiAnalysis) setAiAnalysis(null);
  };

  const handleSaveSimulation = () => {
    const scenarioKey = `${selectedProduct}-${currentDate}`;
    setSavedSimParams(prev => ({
      ...prev,
      [scenarioKey]: params
    }));
    // In a real app, you might show a toast notification here
    console.log("Simulation Configuration Saved for", scenarioKey);
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeCapacityRisks(chartData, params);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleDemandUpdate = (newDemandData: DemandForecast[]) => {
    setDemandData(newDemandData);
    const scenarioKey = `${selectedProduct}-${currentDate}`;
    setSavedScenarios(prev => ({
      ...prev,
      [scenarioKey]: newDemandData
    }));
  };

  // --- Render ---

  if (currentView === 'demand-planning') {
    return (
      <DemandPlanningScreen 
        productLine={selectedProduct}
        currentDate={currentDate}
        initialData={demandData}
        onSave={handleDemandUpdate}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800 font-sans">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navigation / Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Layers className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Production Capacity Planning</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">N+3 Rolling Forecast</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Product Filter */}
            <div className="relative">
              <select 
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value as ProductLine)}
                className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-sm"
              >
                {Object.values(ProductLine).map((line) => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            {/* Date Picker */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="month" 
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              />
            </div>

            {/* Manage Demand Button */}
            <button
              onClick={() => setCurrentView('demand-planning')}
              className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm"
              title="Edit Demand Forecast"
            >
              <Edit3 className="w-4 h-4 mr-2 text-indigo-600" />
              Manage Demand
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* KPI Section */}
          <KPICards kpi={kpi} />

          {/* Main Chart Section */}
          <div className="h-[500px] w-full">
            <CapacityChart data={chartData} />
          </div>

        </main>
      </div>

      {/* Right Sidebar - Simulation */}
      <aside className="shrink-0 h-screen sticky top-0 border-l border-slate-200 hidden lg:block">
        <SimulationPanel 
          params={params}
          onChange={handleSimParamsChange}
          onSave={handleSaveSimulation}
          onAIAnalyze={handleAIAnalyze}
          isAnalyzing={isAnalyzing}
          aiAnalysis={aiAnalysis}
        />
      </aside>

    </div>
  );
};

export default App;