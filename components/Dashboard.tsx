import React, { useState, useMemo } from 'react';
import { Activity, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { GlassCard, StatBox, SectionHeader, useCyberModal } from './CyberUI';
import { GlobalStats, DailyStats, OrderRecord, Staff, CloudWindow, PurchaseRecord, Settings } from '../types';
import { formatCurrency, formatWan } from '../utils';

interface DashboardProps {
  globalStats: GlobalStats;
  dailyStats: DailyStats[];
  orders: OrderRecord[];
  staffList: Staff[];
  cloudWindows: CloudWindow[];
  purchases: PurchaseRecord[];
  settings: Settings;
  onDeleteOrder: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ globalStats, dailyStats, orders, staffList, cloudWindows, purchases, settings, onDeleteOrder }) => {
  const today = new Date().toISOString().split('T')[0];
  
  // 计算实际库存（所有窗口余额总和）
  const actualInventory = useMemo(() => {
    return cloudWindows.reduce((sum, w) => sum + w.goldBalance, 0);
  }, [cloudWindows]);

  // 计算平均成本（从采购记录：总成本 / 总采购量千万数）
  const avgCost = useMemo(() => {
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0); // 总采购量
    const totalCost = purchases.reduce((sum, p) => sum + p.cost, 0); // 总成本（元）
    if (totalAmount === 0) return 0;
    return totalCost / (totalAmount / 10000000); // 元/千万
  }, [purchases]);

  // 计算累计利润（已完成订单的收入 - 成本）
  // order.amount 是万，order.loss 是实际数量
  const totalProfit = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    let profit = 0;
    completedOrders.forEach(order => {
      // 收入 = 订单金额 * 单价 / 1000
      const revenue = (order.amount / 1000) * order.unitPrice;
      // 损耗转换成万
      const lossInWan = (order.loss || 0) / 10000;
      // 成本 = (订单金额 + 损耗万) * 平均成本 / 1000 + 员工成本
      const cogs = ((order.amount + lossInWan) / 1000) * avgCost;
      const laborCost = (order.amount / 1000) * settings.employeeCostRate;
      profit += revenue - cogs - laborCost;
    });
    return profit;
  }, [orders, avgCost, settings.employeeCostRate]);
  
  // 进行中订单的日期筛选
  const [pendingDateFilter, setPendingDateFilter] = useState('');
  // 订单记录的周期筛选
  const [recordPeriod, setRecordPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  // 自定义日期范围
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  // 删除确认
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  
  // 获取周期的起始日期
  const getPeriodStartDate = (period: 'today' | 'week' | 'month' | 'all' | 'custom') => {
    const now = new Date();
    if (period === 'today') return today;
    if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    if (period === 'month') {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    if (period === 'custom') return customStartDate;
    return ''; // all
  };
  
  const getPeriodEndDate = (period: 'today' | 'week' | 'month' | 'all' | 'custom') => {
    if (period === 'custom') return customEndDate;
    return today;
  };
  
  const { showSuccess, ModalComponent } = useCyberModal();
  
  // 获取员工名称
  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || '未知';
  };

  // 计算订单收入（金额 * 单价 / 1000）
  const getOrderRevenue = (order: OrderRecord) => {
    return (order.amount / 1000) * order.unitPrice;
  };

  // 计算订单利润（收入 - 成本 - 员工成本）
  // order.amount 是万，order.loss 是实际数量，需要转换
  const getOrderProfit = (order: OrderRecord) => {
    const revenue = getOrderRevenue(order);
    const lossInWan = (order.loss || 0) / 10000; // 转换成万
    const cogs = ((order.amount + lossInWan) / 1000) * avgCost;
    const laborCost = (order.amount / 1000) * settings.employeeCostRate;
    return revenue - cogs - laborCost;
  };

  // 所有进行中的订单（pending + paused）
  const pendingOrders = useMemo(() => {
    let filtered = orders.filter(o => o.status === 'pending' || o.status === 'paused');
    if (pendingDateFilter) {
      filtered = filtered.filter(o => o.date === pendingDateFilter);
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, pendingDateFilter]);

  // 进行中订单统计
  const pendingStats = useMemo(() => {
    const totalAmount = pendingOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalRevenue = pendingOrders.reduce((sum, o) => sum + getOrderRevenue(o), 0);
    return { total: pendingOrders.length, totalAmount, totalRevenue };
  }, [pendingOrders]);

  // 按周期筛选的已完成订单
  const completedOrders = useMemo(() => {
    const startDate = getPeriodStartDate(recordPeriod);
    const endDate = getPeriodEndDate(recordPeriod);
    return orders.filter(o => {
      if (o.status !== 'completed') return false;
      if (recordPeriod === 'all') return true;
      return o.date >= startDate && o.date <= endDate;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, recordPeriod, today, customStartDate, customEndDate]);

  // 已完成订单统计
  const completedStats = useMemo(() => {
    const totalAmount = completedOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = completedOrders.reduce((sum, o) => sum + (o.loss || 0), 0);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + getOrderRevenue(o), 0);
    const totalProfit = completedOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);
    return { total: completedOrders.length, totalAmount, totalLoss, totalRevenue, totalProfit };
  }, [completedOrders, avgCost]);

  // 确认删除订单
  const handleDeleteOrder = () => {
    if (deleteOrderId) {
      onDeleteOrder(deleteOrderId);
      setDeleteOrderId(null);
      showSuccess('删除成功', '订单已删除');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="指挥中心 // 资产总览" icon={Activity} />
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox 
          label="历史累计利润" 
          value={formatCurrency(totalProfit)}
          subValue="累计盈亏"
        />
        <StatBox 
          label="当前库存" 
          value={formatWan(actualInventory)}
          subValue={`窗口余额总和`}
        />
        <StatBox 
          label="平均成本" 
          value={formatCurrency(avgCost)}
          subValue="每千万哈夫币"
        />
      </div>

      {/* 进行中订单 + 订单记录 并排 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 进行中订单 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-yellow-400 font-mono text-sm flex items-center gap-2">
              <Clock size={16} /> 进行中订单 ({pendingStats.total})
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                {pendingStats.totalAmount} 万 | <span className="text-green-400">¥{pendingStats.totalRevenue.toFixed(2)}</span>
              </span>
              <input
                type="date"
                value={pendingDateFilter}
                onChange={e => setPendingDateFilter(e.target.value)}
                className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-xs"
                placeholder="筛选日期"
              />
              {pendingDateFilter && (
                <button 
                  onClick={() => setPendingDateFilter('')}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  清除
                </button>
              )}
            </div>
          </div>
          
          {pendingOrders.length > 0 ? (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {pendingOrders.map(order => (
                <div 
                  key={order.id} 
                  className={`p-3 rounded border flex justify-between items-center ${
                    order.status === 'paused'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      order.status === 'paused' ? 'bg-orange-400' : 'bg-yellow-400 animate-pulse'
                    }`} />
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{order.date}</div>
                      <span className="font-mono text-white">{getStaffName(order.staffId)}</span>
                      <span className="text-gray-500 mx-2">|</span>
                      <span className="text-cyber-accent font-mono">{order.amount} 万</span>
                      <span className="text-green-400 font-mono ml-2">¥{getOrderRevenue(order).toFixed(2)}</span>
                      {order.status === 'paused' && (
                        <span className="text-xs text-orange-400 ml-2">
                          (已完成 {order.completedAmount || 0} 万)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      order.status === 'paused'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.status === 'paused' ? '暂停' : '进行中'}
                    </span>
                    <button
                      onClick={() => setDeleteOrderId(order.id)}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      title="删除订单"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {pendingDateFilter ? '该日期无进行中订单' : '暂无进行中订单'}
            </div>
          )}
        </GlassCard>

        {/* 已完成订单记录 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-green-400 font-mono text-sm flex items-center gap-2">
              <CheckCircle size={16} /> 已完成订单记录
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[
                  { key: 'today', label: '今天' },
                  { key: 'week', label: '本周' },
                  { key: 'month', label: '本月' },
                  { key: 'all', label: '全部' },
                  { key: 'custom', label: '自定义' }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setRecordPeriod(p.key as any)}
                    className={`px-2 py-1 text-xs font-mono border ${
                      recordPeriod === p.key
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'border-gray-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                共 <span className="text-green-400">{completedStats.total}</span> 单 | 
                <span className="text-cyber-accent ml-1">{completedStats.totalAmount}</span> 万
              </span>
            </div>
          </div>
          
          {/* 自定义日期范围 */}
          {recordPeriod === 'custom' && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-black/30 rounded border border-cyber-primary/20">
              <span className="text-xs text-gray-400">从</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-xs"
              />
              <span className="text-xs text-gray-400">到</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-xs"
              />
            </div>
          )}
          
          {/* 统计 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-green-500/10 border border-green-500/30 p-2 rounded text-center">
              <div className="text-xs text-green-400">订单</div>
              <div className="text-lg font-mono text-green-400">{completedStats.total}</div>
            </div>
            <div className="bg-cyber-accent/10 border border-cyber-accent/30 p-2 rounded text-center">
              <div className="text-xs text-cyber-accent">金额</div>
              <div className="text-lg font-mono text-cyber-accent">{completedStats.totalAmount}万</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded text-center">
              <div className="text-xs text-blue-400">收入</div>
              <div className="text-lg font-mono text-blue-400">¥{completedStats.totalRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded text-center">
              <div className="text-xs text-purple-400">利润</div>
              <div className={`text-lg font-mono ${completedStats.totalProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>¥{completedStats.totalProfit.toFixed(0)}</div>
            </div>
          </div>

          {completedOrders.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {completedOrders.map(order => (
                <div 
                  key={order.id} 
                  className="p-3 rounded border flex justify-between items-center bg-green-500/10 border-green-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <div>
                      <span className="font-mono text-white">{getStaffName(order.staffId)}</span>
                      <span className="text-gray-500 mx-2">|</span>
                      <span className="text-cyber-accent font-mono">{order.amount} 万</span>
                      <span className="text-blue-400 font-mono ml-2">¥{getOrderRevenue(order).toFixed(0)}</span>
                      <span className={`font-mono ml-2 ${getOrderProfit(order) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                        利润 ¥{getOrderProfit(order).toFixed(0)}
                      </span>
                      {order.loss > 0 && (
                        <span className="text-xs text-red-400 ml-2">(损耗 {(order.loss / 10000).toFixed(0)} 万)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                      已完成
                    </span>
                    <button
                      onClick={() => setDeleteOrderId(order.id)}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      title="删除订单"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              该周期暂无已完成订单
            </div>
          )}
        </GlassCard>
      </div>

      {/* 删除确认弹窗 */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-cyber-panel border border-red-500 p-6 max-w-md w-full relative">
            <div className="absolute top-0 left-0 w-16 h-[2px] bg-red-500"></div>
            <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-red-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border border-red-500 flex items-center justify-center text-red-400 font-mono text-lg">!</div>
              <h3 className="text-xl font-mono text-red-400 tracking-wider">确认删除</h3>
            </div>
            <p className="text-gray-300 mb-6 font-mono text-sm">确定要删除这个订单吗？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
              <button onClick={handleDeleteOrder} className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/40 font-mono text-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  );
};
