import React, { useState } from 'react';
import { Trash2, Database, Download } from 'lucide-react';
import { GlassCard, SectionHeader } from './CyberUI';
import { PurchaseRecord, DailyStats } from '../types';
import { formatCurrency, formatNumber, formatWan } from '../utils';

interface DataListProps {
  purchases: PurchaseRecord[];
  dailyStats: DailyStats[];
  onDeletePurchase: (id: string) => void;
  onDeleteDaily: (id: string) => void; 
}

export const DataList: React.FC<DataListProps> = ({ purchases, dailyStats, onDeletePurchase, onDeleteDaily }) => {
  const [view, setView] = useState<'daily' | 'purchases'>('daily');

  const exportCSV = () => {
    let headers, rows, filename;

    if (view === 'daily') {
      headers = ['日期', '收入', '员工成本', '消耗成本', '利润', '剩余库存', '订单总额', '订单数', '总损耗'];
      rows = dailyStats.map(d => [
        d.date, d.revenue, d.employeeCost, d.cogs, d.profit, d.inventoryAfter, d.orderAmount, d.orderCount, d.lossAmount
      ].join(','));
      filename = 'daily_summary_report.csv';
    } else {
      headers = ['日期', '采购数量', '成本'];
      rows = purchases.map(p => [p.date, p.amount, p.cost].join(','));
      filename = 'purchase_report.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedDaily = [...dailyStats].reverse();
  const sortedPurchases = [...purchases].reverse();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionHeader title="数据库 // 汇总记录" icon={Database} />
        <div className="flex gap-2">
          <button 
            onClick={() => setView('daily')} 
            className={`px-4 py-2 font-mono font-bold text-sm transition-all ${view === 'daily' ? 'bg-cyber-primary text-black shadow-neon-cyan' : 'bg-transparent text-gray-500 border border-gray-700 hover:border-cyber-primary hover:text-cyber-primary'}`}
          >
            日报汇总
          </button>
          <button 
            onClick={() => setView('purchases')} 
            className={`px-4 py-2 font-mono font-bold text-sm transition-all ${view === 'purchases' ? 'bg-cyber-primary text-black shadow-neon-cyan' : 'bg-transparent text-gray-500 border border-gray-700 hover:border-cyber-primary hover:text-cyber-primary'}`}
          >
            采购记录
          </button>
           <button 
            onClick={exportCSV} 
            className="px-4 py-2 font-mono font-bold text-sm border border-cyber-accent text-cyber-accent bg-transparent hover:bg-cyber-accent/10 flex items-center gap-2"
          >
            <Download size={14} /> 导出CSV
          </button>
        </div>
      </div>

      <GlassCard className="overflow-x-auto p-0 border border-cyber-primary/20">
        <table className="w-full text-left font-mono text-sm border-collapse">
          <thead>
            <tr className="bg-cyber-primary/10 text-cyber-primary border-b border-cyber-primary/30 uppercase tracking-wider">
              <th className="p-4">日期</th>
              {view === 'daily' ? (
                <>
                  <th className="p-4">收入</th>
                  <th className="p-4 text-cyber-secondary">员工成本</th>
                  <th className="p-4 text-cyber-secondary">消耗成本</th>
                  <th className="p-4 text-cyber-accent">利润</th>
                  <th className="p-4">剩余库存</th>
                  <th className="p-4 text-gray-500">单数</th>
                </>
              ) : (
                <>
                  <th className="p-4">数量 (万)</th>
                  <th className="p-4">成本 (元)</th>
                </>
              )}
              {view === 'purchases' && <th className="p-4 text-right">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {view === 'daily' ? sortedDaily.map(record => (
              <tr key={record.id} className="hover:bg-cyber-primary/5 transition-colors group">
                <td className="p-4 font-bold text-white group-hover:text-cyber-primary">{record.date}</td>
                <td className="p-4 text-green-400">{formatCurrency(record.revenue)}</td>
                <td className="p-4 text-cyber-secondary/80">{formatCurrency(record.employeeCost)}</td>
                <td className="p-4 text-cyber-secondary/80">{formatCurrency(record.cogs)}</td>
                <td className={`p-4 font-bold ${record.profit >= 0 ? 'text-cyber-primary drop-shadow-[0_0_3px_#00f3ff]' : 'text-red-500'}`}>
                  {formatCurrency(record.profit)}
                </td>
                <td className="p-4 text-white">{formatWan(record.inventoryAfter)}</td>
                <td className="p-4 text-gray-600">{record.orderCount}</td>
              </tr>
            )) : sortedPurchases.map(record => (
              <tr key={record.id} className="hover:bg-cyber-primary/5 transition-colors">
                <td className="p-4 font-bold text-white">{record.date}</td>
                <td className="p-4 text-cyber-primary">{formatWan(record.amount)}</td>
                <td className="p-4 text-cyber-secondary">{formatCurrency(record.cost)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => onDeletePurchase(record.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            
            {(view === 'daily' && sortedDaily.length === 0) && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-600">暂无数据</td></tr>
            )}
             {(view === 'purchases' && sortedPurchases.length === 0) && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-600">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
};