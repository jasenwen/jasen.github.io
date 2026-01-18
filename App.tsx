import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Layers, BarChart3, FileSpreadsheet, Settings, UserCircle, ChevronDown } from 'lucide-react';
import { ProductLine, SimulationParams, ChartDataPoint, KPI, DemandForecast, DeviceConfig } from './types';
import KPICards from './components/KPICards';
import CapacityChart from './components/CapacityChart';
import SimulationPanel from './components/SimulationPanel';
import DemandPlanningScreen from './components/DemandPlanningScreen';
import { analyzeCapacityRisks } from './services/geminiService';

const App: React.FC = () => {
  // --- View State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demand'>('dashboard');
  const [viewMode, setViewMode] = useState<'stacked' | 'split'>('stacked');

  // --- Data State ---
  const [selectedProduct, setSelectedProduct] = useState<ProductLine>(ProductLine.Standard);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // -- Simulation State (Per Month) --
  // Maps month string (e.g. "Jan N") -> DeviceConfig[]
  const [monthlyConfigs, setMonthlyConfigs] = useState<Record<string, DeviceConfig[]>>({});
  const [selectedSimMonth, setSelectedSimMonth] = useState<string>("");

  const [demandData, setDemandData] = useState<DemandForecast[]>([]);
  
  // Cache for user-modified forecasts
  const [savedScenarios, setSavedScenarios] = useState<Record<string, DemandForecast[]>>({});
  // Cache for user-modified simulation params: Key -> { "Month": Config[] }
  const [savedSimConfigs, setSavedSimConfigs] = useState<Record<string, Record<string, DeviceConfig[]>>>({});

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // --- Helper: Get Default Params based on Product Line ---
  const getDefaultDevices = useCallback((product: ProductLine): DeviceConfig[] => {
    const difficultyFactor = product === ProductLine.Iridium ? 0.7 : 
                             product === ProductLine.Industrial ? 0.5 : 1.0;
    
    return [
      { id: 1, name: 'Stamping Press 01', shifts: 2, maintenanceDays: 1, overtimeDays: 0, baseCapacity: Math.floor(250 * difficultyFactor) },
      { id: 2, name: 'Heat Treatment Unit', shifts: 3, maintenanceDays: 0, overtimeDays: 0, baseCapacity: Math.floor(280 * difficultyFactor) },
      { id: 3, name: 'Assembly Line 01', shifts: 2, maintenanceDays: 1, overtimeDays: 2, baseCapacity: Math.floor(220 * difficultyFactor) }
    ];
  }, []);

  // --- 1. Load Data Effect (Demand & Params) ---
  useEffect(() => {
    const scenarioKey = `${selectedProduct}-${currentDate}`;
    let loadedDemand: DemandForecast[] = [];

    // --- Load Demand Data ---
    if (savedScenarios[scenarioKey]) {
      loadedDemand = savedScenarios[scenarioKey];
      setDemandData(loadedDemand);
    } else {
      // Generate fresh baseline
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startMonthIndex = parseInt(currentDate.split('-')[1]) - 1;
      
      const generatedDemand: DemandForecast[] = [];
      
      // FIX: Master Data mapped to absolute month index (0=Jan, 1=Feb, etc.)
      const standardMasterData: Record<number, { v: number, b: number }> = {
         0: { v: 45000, b: 5000 },  // Jan
         1: { v: 47579, b: 1000 },  // Feb
         2: { v: 48614, b: 12000 }, // Mar
         3: { v: 39684, b: 4000 },  // Apr
         // Extended defaults
         4: { v: 42500, b: 2000 },  // May
         5: { v: 46100, b: 1500 },  // Jun
         6: { v: 44000, b: 3000 },  // Jul
         7: { v: 41500, b: 2500 },  // Aug
         8: { v: 49000, b: 5000 },  // Sep
         9: { v: 51200, b: 1200 },  // Oct
         10: { v: 45800, b: 3200 }, // Nov
         11: { v: 39000, b: 4500 }  // Dec
      };

      for (let i = 0; i < 4; i++) {
        const monthIndex = (startMonthIndex + i) % 12;
        const monthLabel = months[monthIndex];
        
        let value, backOrder;

        if (selectedProduct === ProductLine.Standard) {
          const data = standardMasterData[monthIndex];
          value = data.v;
          backOrder = data.b;
        } else {
          let baseLoad = 40000; 
          if (selectedProduct === ProductLine.Iridium) baseLoad = 32000;
          if (selectedProduct === ProductLine.Industrial) baseLoad = 25000;
          
          const isPeakSeason = [8, 9, 10].includes(monthIndex); 
          const seasonalFactor = isPeakSeason ? 1.25 : 0.95;
          const noise = 1 + (Math.sin(monthIndex * 132.1) * 0.1); 
          
          value = Math.floor(baseLoad * seasonalFactor * noise);
          backOrder = i === 0 ? Math.floor(baseLoad * 0.1) : 0;
        }

        generatedDemand.push({
          month: `${monthLabel} N${i > 0 ? `+${i}` : ''}`,
          value: value,
          backOrder: backOrder
        });
      }
      loadedDemand = generatedDemand;
      setDemandData(generatedDemand);
    }

    // --- Initialize or Load Monthly Configs ---
    if (savedSimConfigs[scenarioKey]) {
      setMonthlyConfigs(savedSimConfigs[scenarioKey]);
    } else {
      const initialConfigs: Record<string, DeviceConfig[]> = {};
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Override configs for Standard product line for specific months
      const standardConfigOverrides: Record<number, DeviceConfig[]> = {
        0: [ // Jan: High utilization
          { id: 1, name: 'Stamping Press 01', shifts: 3, maintenanceDays: 0, overtimeDays: 2, baseCapacity: 280 },
          { id: 2, name: 'Heat Treatment Unit', shifts: 3, maintenanceDays: 0, overtimeDays: 2, baseCapacity: 250 },
          { id: 3, name: 'Assembly Line 01', shifts: 3, maintenanceDays: 0, overtimeDays: 2, baseCapacity: 250 }
        ],
        1: [ // Feb: Maintenance heavy
          { id: 1, name: 'Stamping Press 01', shifts: 3, maintenanceDays: 2, overtimeDays: 0, baseCapacity: 250 },
          { id: 2, name: 'Heat Treatment Unit', shifts: 3, maintenanceDays: 2, overtimeDays: 0, baseCapacity: 280 },
          { id: 3, name: 'Assembly Line 01', shifts: 3, maintenanceDays: 2, overtimeDays: 0, baseCapacity: 220 }
        ],
        2: [ // Mar: Peak capacity attempt
          { id: 1, name: 'Stamping Press 01', shifts: 3, maintenanceDays: 1, overtimeDays: 2, baseCapacity: 300 },
          { id: 2, name: 'Heat Treatment Unit', shifts: 3, maintenanceDays: 1, overtimeDays: 2, baseCapacity: 300 },
          { id: 3, name: 'Assembly Line 01', shifts: 3, maintenanceDays: 1, overtimeDays: 2, baseCapacity: 250 }
        ],
        3: [ // Apr: Scaling down
          { id: 1, name: 'Stamping Press 01', shifts: 2, maintenanceDays: 1, overtimeDays: 0, baseCapacity: 250 },
          { id: 2, name: 'Heat Treatment Unit', shifts: 3, maintenanceDays: 0, overtimeDays: 0, baseCapacity: 280 },
          { id: 3, name: 'Assembly Line 01', shifts: 2, maintenanceDays: 1, overtimeDays: 2, baseCapacity: 220 }
        ]
      };

      loadedDemand.forEach(d => {
        // Parse "Jan" from "Jan N"
        const monthName = d.month.split(' ')[0];
        const monthIdx = monthsList.indexOf(monthName);
        
        if (selectedProduct === ProductLine.Standard && standardConfigOverrides[monthIdx]) {
           initialConfigs[d.month] = standardConfigOverrides[monthIdx];
        } else {
           initialConfigs[d.month] = getDefaultDevices(selectedProduct);
        }
      });
      setMonthlyConfigs(initialConfigs);
    }

    // Set active simulation month to the first one if not set or invalid
    if (loadedDemand.length > 0) {
      setSelectedSimMonth(loadedDemand[0].month);
    }
    
    // Reset AI analysis on context switch
    setAiAnalysis(null);

  }, [selectedProduct, currentDate, savedScenarios, savedSimConfigs, getDefaultDevices]);


  // --- 2. Dynamic Capacity Calculation (Uses Monthly Configs) ---
  const { chartData, kpi } = useMemo(() => {
    const standardWorkingDays = 22;
    const maxTheoreticalDays = 30;
    
    let processedData: ChartDataPoint[] = [];
    let totalAnnualTarget = 0;
    let totalOrderVolume = 0;
    let totalBacklogVolume = 0;
    let cumulativeGap = 0;
    let totalUtilization = 0;

    demandData.forEach((d) => {
      let monthlyActualCapacity = 0;
      let monthlyTheoreticalMax = 0;
      let monthlyCapOT0 = 0;
      let monthlyCapOT2 = 0;
      let monthlyCapOT4 = 0;

      // Get config for THIS specific month, fallback to defaults if missing (shouldn't happen)
      const currentDevices = monthlyConfigs[d.month] || getDefaultDevices(selectedProduct);

      currentDevices.forEach(device => {
        monthlyTheoreticalMax += (3 * maxTheoreticalDays * device.baseCapacity);
        
        // Actual Simulation
        const effectiveDays = Math.max(0, standardWorkingDays + device.overtimeDays - device.maintenanceDays);
        monthlyActualCapacity += (effectiveDays * device.shifts * device.baseCapacity);

        // Benchmark: OT+0 (No Overtime)
        const daysOT0 = Math.max(0, standardWorkingDays + 0 - device.maintenanceDays);
        monthlyCapOT0 += (daysOT0 * device.shifts * device.baseCapacity);

        // Benchmark: OT+2
        const daysOT2 = Math.max(0, standardWorkingDays + 2 - device.maintenanceDays);
        monthlyCapOT2 += (daysOT2 * device.shifts * device.baseCapacity);

        // Benchmark: OT+4
        const daysOT4 = Math.max(0, standardWorkingDays + 4 - device.maintenanceDays);
        monthlyCapOT4 += (daysOT4 * device.shifts * device.baseCapacity);
      });
      
      const totalRequirement = d.value + (d.backOrder || 0);
      
      // Gap calculation depends on View Mode
      // Stacked = Capacity - Total (Orders + Backlog)
      // Split = Capacity - Orders (Backlog ignored in gap KPI)
      const monthlyGap = viewMode === 'stacked' 
        ? monthlyActualCapacity - totalRequirement
        : monthlyActualCapacity - d.value;

      processedData.push({
        month: d.month,
        theoreticalMax: monthlyTheoreticalMax,
        actualCapacity: monthlyActualCapacity,
        capacityOT0: monthlyCapOT0,
        capacityOT2: monthlyCapOT2,
        capacityOT4: monthlyCapOT4,
        demand: d.value,
        backlog: d.backOrder || 0,
        totalRequirement: totalRequirement,
        unusedCapacity: Math.max(0, monthlyTheoreticalMax - monthlyActualCapacity)
      });

      totalAnnualTarget += monthlyTheoreticalMax * 0.75; 
      totalOrderVolume += d.value;
      totalBacklogVolume += (d.backOrder || 0);
      cumulativeGap += monthlyGap;
      
      // Resource Utilization = Actual Scheduled Capacity / Theoretical Max Capacity
      // This measures how "hard" the factory is being driven (Asset Utilization).
      // Adding shifts or overtime increases Actual Capacity, thus increasing Utilization.
      totalUtilization += (monthlyActualCapacity / (monthlyTheoreticalMax || 1));
    });

    return {
      chartData: processedData,
      kpi: {
        annualTarget: Math.floor(totalAnnualTarget * 3),
        currentOrderVolume: totalOrderVolume,
        totalBacklog: totalBacklogVolume,
        capacityGap: cumulativeGap,
        // Average utilization over the period
        utilizationRate: (totalUtilization / demandData.length) * 100
      }
    };
  }, [monthlyConfigs, demandData, selectedProduct, getDefaultDevices, viewMode]);


  // --- Event Handlers ---
  const handleSimParamsChange = (newDevices: DeviceConfig[]) => {
    // Update only the currently selected month
    setMonthlyConfigs(prev => ({
      ...prev,
      [selectedSimMonth]: newDevices
    }));
    if (aiAnalysis) setAiAnalysis(null);
  };

  const handleSaveSimulation = () => {
    const scenarioKey = `${selectedProduct}-${currentDate}`;
    setSavedSimConfigs(prev => ({
      ...prev,
      [scenarioKey]: monthlyConfigs
    }));
    console.log("Monthly Simulation Configurations Saved for", scenarioKey);
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    // We pass the calculated chart data which already includes the impact of variable monthly configs
    const result = await analyzeCapacityRisks(chartData, selectedProduct);
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
    
    // Ensure monthly configs exist for any new months (if demand length changed)
    setMonthlyConfigs(prev => {
      const updated = { ...prev };
      newDemandData.forEach(d => {
        if (!updated[d.month]) {
          updated[d.month] = getDefaultDevices(selectedProduct);
        }
      });
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* --- LEVEL 1: TOP NAVIGATION --- */}
      <nav className="bg-slate-900 text-white shrink-0 shadow-md z-30">
        <div className="px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Layers className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">Manufacturing S&OP</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Discrete Manufacturing Planner</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex h-full space-x-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-4 h-full border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'dashboard' 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Capacity Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('demand')}
              className={`flex items-center px-4 h-full border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'demand' 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Demand Forecast
            </button>
          </div>

          {/* User/Settings */}
          <div className="flex items-center space-x-4 pl-4 border-l border-slate-700">
            <button className="text-slate-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80">
              <UserCircle className="w-8 h-8 text-slate-300" />
              <div className="hidden md:block">
                <div className="text-xs font-medium text-white">Production Mgr</div>
                <div className="text-[10px] text-slate-400">Plant A</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- LEVEL 2: CONTEXT BAR --- */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 shadow-sm z-20 gap-3 md:gap-0">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Context: Product */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Line:</span>
            <div className="relative group">
              <select 
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value as ProductLine)}
                className="appearance-none bg-slate-50 border border-slate-300 hover:border-blue-400 text-slate-700 py-1.5 pl-3 pr-8 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-sm transition-all shadow-sm"
              >
                {Object.values(ProductLine).map((line) => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Context: Date */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Planning Month:</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input 
                type="month" 
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 hover:border-blue-400 text-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Status Indicators / Dynamic Context Info */}
        <div className="text-xs text-slate-500 flex items-center space-x-4">
           {activeTab === 'dashboard' && (
             <>
               <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> System Online</span>
               <span className="hidden md:inline text-slate-300">|</span>
               <span className="hidden md:inline">Last Sync: 2 mins ago</span>
             </>
           )}
           {activeTab === 'demand' && (
             <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded">Editing Mode Active</span>
           )}
        </div>
      </div>

      {/* --- MAIN CONTENT LAYOUT --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Central View Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' ? (
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
               <div className="mb-6">
                 <h2 className="text-2xl font-bold text-slate-800">Production Overview</h2>
                 <p className="text-slate-500 text-sm">Capacity utilization and gap analysis for N+3 rolling window.</p>
               </div>
               
               <KPICards 
                 kpi={kpi} 
                 gapLabel={viewMode === 'stacked' ? "Capacity Gap (Total)" : "Capacity Gap (Orders Only)"}
               />

               <div className="h-[500px] w-full mt-6">
                 <CapacityChart 
                   data={chartData} 
                   viewMode={viewMode}
                   onViewModeChange={setViewMode}
                 />
               </div>
            </div>
          ) : (
            <DemandPlanningScreen 
              productLine={selectedProduct}
              currentDate={currentDate}
              initialData={demandData}
              onSave={handleDemandUpdate}
              onBack={() => setActiveTab('dashboard')}
            />
          )}
        </main>

        {/* Right Sidebar - Simulation (Only visible on Dashboard) */}
        {activeTab === 'dashboard' && (
          <aside className="w-96 shrink-0 border-l border-slate-200 bg-white shadow-xl z-20 overflow-y-auto hidden xl:block">
            <SimulationPanel 
              productLine={selectedProduct}
              availableMonths={demandData.map(d => d.month)}
              selectedMonth={selectedSimMonth}
              onMonthChange={setSelectedSimMonth}
              devices={monthlyConfigs[selectedSimMonth] || getDefaultDevices(selectedProduct)}
              onChange={handleSimParamsChange}
              onSave={handleSaveSimulation}
              onAIAnalyze={handleAIAnalyze}
              isAnalyzing={isAnalyzing}
              aiAnalysis={aiAnalysis}
            />
          </aside>
        )}
      </div>

    </div>
  );
};

export default App;