import React, { useState, useMemo } from 'react';
import { Calendar, Search } from 'lucide-react';
import { GlassCard, SectionHeader, CyberInput, NeonButton, StatBox } from './CyberUI';
import { DailyStats } from '../types';
import { formatCurrency } from '../utils';

interface ReportsProps {
  dailyStats: DailyStats[];
}

export const Reports: React.FC<ReportsProps> = ({ dailyStats }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportData = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const filtered = dailyStats.filter(d => d.date >= startDate && d.date <= endDate);
    
    const totalRev = filtered.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalEmpCost = filtered.reduce((acc, curr) => acc + curr.employeeCost, 0);
    const totalCogs = filtered.reduce((acc, curr) => acc + curr.cogs, 0);
    const totalProfit = filtered.reduce((acc, curr) => acc + curr.profit, 0);
    
    return {
      totalRev,
      totalCost: totalEmpCost + totalCogs,
      totalProfit,
      count: filtered.length
    };
  }, [startDate, endDate, dailyStats]);

  return (
    <div className="space-y-6">
      <SectionHeader title="数据分析 // 区间查询" icon={Calendar} />
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full">
             <CyberInput 
              label="开始日期" 
              type="date" 
              value={startDate} 
              onChange={(e: any) => setStartDate(e.target.value)} 
            />
          </div>
          <div className="w-full">
             <CyberInput 
              label="结束日期" 
              type="date" 
              value={endDate} 
              onChange={(e: any) => setEndDate(e.target.value)} 
            />
          </div>
        </div>
      </GlassCard>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
           <StatBox 
              label="区间总收入" 
              value={formatCurrency(reportData.totalRev)}
              subValue={`共计 ${reportData.count} 天`}
            />
             <StatBox 
              label="区间总成本" 
              value={formatCurrency(reportData.totalCost)}
              subValue="员工成本 + 消耗成本"
            />
             <StatBox 
              label="区间净利润" 
              value={formatCurrency(reportData.totalProfit)}
              trend={reportData.totalProfit > 0 ? 'up' : 'down'}
            />
        </div>
      )}
    </div>
  );
};