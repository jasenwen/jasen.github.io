import React from 'react';
import { KPI } from '../types';
import { TrendingUp, AlertTriangle, Target, Activity } from 'lucide-react';

interface KPICardsProps {
  kpi: KPI;
}

const KPICards: React.FC<KPICardsProps> = ({ kpi }) => {
  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const cards = [
    {
      title: "Annual Forecast Target",
      value: `${formatNumber(kpi.annualTarget)} units`,
      icon: <Target className="w-5 h-5 text-blue-600" />,
      subtext: "Year-to-Date target based on SOP",
      alert: false
    },
    {
      title: "Current N+3 Order Volume",
      value: `${formatNumber(kpi.currentOrderVolume)} units`,
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
      subtext: "Committed orders (N to N+3)",
      alert: false
    },
    {
      title: "Capacity Gap (Cumulative)",
      value: `${formatNumber(kpi.capacityGap)} units`,
      icon: <AlertTriangle className={`w-5 h-5 ${kpi.capacityGap < 0 ? 'text-red-600' : 'text-green-600'}`} />,
      subtext: kpi.capacityGap < 0 ? "Critical shortage detected" : "Surplus capacity available",
      alert: kpi.capacityGap < 0,
      textColor: kpi.capacityGap < 0 ? 'text-red-700' : 'text-green-700'
    },
    {
      title: "Resource Utilization Rate",
      value: `${kpi.utilizationRate.toFixed(1)}%`,
      icon: <Activity className="w-5 h-5 text-slate-600" />,
      subtext: "Average over next 4 months",
      alert: kpi.utilizationRate > 95, // Alert if too high
      textColor: kpi.utilizationRate > 95 ? 'text-orange-600' : 'text-slate-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`bg-white rounded-lg p-5 shadow-sm border ${card.alert ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
            <div className={`p-2 rounded-full ${card.alert ? 'bg-red-100' : 'bg-slate-50'}`}>
              {card.icon}
            </div>
          </div>
          <div className={`text-2xl font-bold mb-1 ${card.textColor || 'text-slate-900'}`}>
            {card.value}
          </div>
          <div className="text-xs text-slate-400">
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;
