import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, DollarSign, Box, TrendingUp } from 'lucide-react';
import { GlassCard, StatBox, SectionHeader } from './CyberUI';
import { GlobalStats, DailyStats } from '../types';
import { formatCurrency, formatNumber, formatChineseNumber, formatWan, toWan } from '../utils';

interface DashboardProps {
  globalStats: GlobalStats;
  dailyStats: DailyStats[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-cyber-panel border border-cyber-primary/50 p-3 shadow-neon-box">
        <p className="text-cyber-primary font-mono font-bold text-sm mb-2 border-b border-cyber-primary/30 pb-1">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-xs font-mono" style={{ color: p.stroke || p.fill }}>
            {p.name === 'Profit' ? '利润' : p.name === 'Inventory' ? '库存' : p.name}: {typeof p.value === 'number' ? formatChineseNumber(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ globalStats, dailyStats }) => {
  // Prepare chart data (last 30 days for better vis)
  const chartData = dailyStats.slice(-30);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="指挥中心 // 资产总览" icon={Activity} />
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox 
          label="当前总资产" 
          value={formatCurrency(globalStats.totalAssets)}
          subValue={`现金储备: ${formatCurrency(globalStats.currentCash)}`}
        />
        <StatBox 
          label="历史累计利润" 
          value={formatCurrency(globalStats.totalProfit)}
          subValue="累计盈亏"
        />
        <StatBox 
          label="当前库存" 
          value={formatWan(globalStats.currentInventory)}
          subValue={`市值 ${formatCurrency(globalStats.inventoryValue)}`}
        />
        <StatBox 
          label="平均成本" 
          value={formatCurrency(globalStats.avgCostPer1000)}
          subValue="每千万哈佛币"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <GlassCard className="h-[400px]">
          <h3 className="text-cyber-primary font-mono text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> 利润趋势分析
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickFormatter={(str) => str.substring(5)} fontFamily="Share Tech Mono" />
              <YAxis stroke="#6b7280" fontSize={12} fontFamily="Share Tech Mono" />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="profit" 
                name="Profit" 
                stroke="#00f3ff" 
                fillOpacity={1} 
                fill="url(#colorProfit)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="h-[400px]">
          <h3 className="text-cyber-secondary font-mono text-sm mb-4 flex items-center gap-2">
            <Box size={16} /> 库存波动分析
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickFormatter={(str) => str.substring(5)} fontFamily="Share Tech Mono" />
              <YAxis stroke="#6b7280" fontSize={12} fontFamily="Share Tech Mono" />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="stepAfter" 
                dataKey="inventoryAfter" 
                name="Inventory" 
                stroke="#ff003c" 
                strokeWidth={2} 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
};