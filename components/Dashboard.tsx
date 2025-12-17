import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Box, TrendingUp, Clock, CheckCircle, Pause, FileText, Trash2, Calendar } from 'lucide-react';
import { GlassCard, StatBox, SectionHeader, CyberInput, useCyberModal } from './CyberUI';
import { GlobalStats, DailyStats, OrderRecord, Staff } from '../types';
import { formatCurrency, formatChineseNumber, formatWan } from '../utils';

interface DashboardProps {
  globalStats: GlobalStats;
  dailyStats: DailyStats[];
  orders: OrderRecord[];
  staffList: Staff[];
  onDeleteOrder: (id: string) => void;
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

export const Dashboard: React.FC<DashboardProps> = ({ globalStats, dailyStats, orders, staffList, onDeleteOrder }) => {
  const chartData = dailyStats.slice(-30);
  const today = new Date().toISOString().split('T')[0];
  
  // 进行中订单的日期筛选
  const [pendingDateFilter, setPendingDateFilter] = useState('');
  // 订单记录的日期筛选（默认今天）
  const [recordDateFilter, setRecordDateFilter] = useState(today);
  // 删除确认
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  
  const { showSuccess, ModalComponent } = useCyberModal();
  
  // 获取员工名称
  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || '未知';
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
    return { total: pendingOrders.length, totalAmount };
  }, [pendingOrders]);

  // 按日期筛选的已完成订单
  const completedOrders = useMemo(() => {
    if (!recordDateFilter) return [];
    return orders.filter(o => o.date === recordDateFilter && o.status === 'completed');
  }, [orders, recordDateFilter]);

  // 已完成订单统计
  const completedStats = useMemo(() => {
    const totalAmount = completedOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = completedOrders.reduce((sum, o) => sum + (o.loss || 0), 0);
    return { total: completedOrders.length, totalAmount, totalLoss };
  }, [completedOrders]);

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
                总金额: <span className="text-cyber-accent font-mono">{pendingStats.totalAmount}</span> 万
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
              <input
                type="date"
                value={recordDateFilter}
                onChange={e => setRecordDateFilter(e.target.value)}
                className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-xs"
              />
              <span className="text-xs text-gray-400">
                共 <span className="text-green-400">{completedStats.total}</span> 单 | 
                <span className="text-cyber-accent ml-1">{completedStats.totalAmount}</span> 万
              </span>
            </div>
          </div>
          
          {/* 统计 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-500/10 border border-green-500/30 p-2 rounded text-center">
              <div className="text-xs text-green-400">完成订单</div>
              <div className="text-lg font-mono text-green-400">{completedStats.total}</div>
            </div>
            <div className="bg-cyber-accent/10 border border-cyber-accent/30 p-2 rounded text-center">
              <div className="text-xs text-cyber-accent">完成金额</div>
              <div className="text-lg font-mono text-cyber-accent">{completedStats.totalAmount} 万</div>
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
                      {order.loss > 0 && (
                        <span className="text-xs text-red-400 ml-2">(损耗 {order.loss} 万)</span>
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
              该日期暂无已完成订单
            </div>
          )}
        </GlassCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="h-[350px]">
          <h3 className="text-cyber-primary font-mono text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> 利润趋势分析
          </h3>
          <ResponsiveContainer width="100%" height="85%">
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
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#00f3ff" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="h-[350px]">
          <h3 className="text-cyber-secondary font-mono text-sm mb-4 flex items-center gap-2">
            <Box size={16} /> 库存波动分析
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickFormatter={(str) => str.substring(5)} fontFamily="Share Tech Mono" />
              <YAxis stroke="#6b7280" fontSize={12} fontFamily="Share Tech Mono" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="stepAfter" dataKey="inventoryAfter" name="Inventory" stroke="#ff003c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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
