import React, { useState, useMemo } from 'react';
import { User, Monitor, MessageSquare, FileText, LogOut, Coins, Clock, CheckCircle, Filter } from 'lucide-react';
import { Staff, OrderRecord, KookChannel, CloudWindow, CloudMachine, Settings, WindowResult } from '../types';
import { GlassCard, StatBox, CyberButton } from './CyberUI';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface Props {
  staff: Staff;
  orders: OrderRecord[];
  kookChannels: KookChannel[];
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  settings: Settings;
  onLogout: () => void;
  onCompleteOrder: (orderId: string, windowResults: WindowResult[]) => void;
}

export const StaffPortal: React.FC<Props> = ({
  staff,
  orders,
  kookChannels,
  cloudWindows,
  cloudMachines,
  settings,
  onLogout,
  onCompleteOrder
}) => {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [windowBalances, setWindowBalances] = useState<Record<string, string>>({});
  const [dateFilter, setDateFilter] = useState('');

  // 我的订单
  const myOrders = useMemo(() => {
    return orders.filter(o => o.staffId === staff.id);
  }, [orders, staff.id]);

  // 进行中的订单
  const pendingOrders = useMemo(() => {
    return myOrders.filter(o => o.status === 'pending');
  }, [myOrders]);

  // 已完成的订单
  const completedOrders = useMemo(() => {
    let completed = myOrders.filter(o => o.status === 'completed');
    if (dateFilter) {
      completed = completed.filter(o => o.date === dateFilter);
    }
    return completed.sort((a, b) => b.date.localeCompare(a.date));
  }, [myOrders, dateFilter]);

  // 我的统计
  const myStats = useMemo(() => {
    const completed = myOrders.filter(o => o.status === 'completed');
    const totalAmount = completed.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = completed.reduce((sum, o) => sum + (o.loss || 0), 0);
    const totalConsumed = completed.reduce((sum, o) => sum + (o.totalConsumed || o.amount), 0);
    const laborCost = totalAmount * settings.employeeCostRate / 1000;
    return { orderCount: completed.length, totalAmount, totalLoss, totalConsumed, laborCost };
  }, [myOrders, settings.employeeCostRate]);

  // 我的 Kook 频道
  const myKookChannels = useMemo(() => kookChannels.filter(k => k.userId === staff.id), [kookChannels, staff.id]);

  // 我的云机窗口
  const myWindows = useMemo(() => cloudWindows.filter(w => w.userId === staff.id), [cloudWindows, staff.id]);

  const getMachineName = (machineId: string) => {
    const machine = cloudMachines.find(m => m.id === machineId);
    return machine ? `${machine.phone} (${machine.platform})` : '未知';
  };

  // 处理完成订单
  const handleCompleteOrder = (order: OrderRecord) => {
    if (!order.windowSnapshots) return;
    
    const results: WindowResult[] = order.windowSnapshots.map(snap => {
      // 如果用户没有填写，默认使用开始余额（即没有消耗）
      const endBalance = windowBalances[snap.windowId] 
        ? parseFloat(windowBalances[snap.windowId]) 
        : snap.startBalance;
      return {
        windowId: snap.windowId,
        endBalance,
        consumed: snap.startBalance - endBalance
      };
    });

    // 验证
    const totalConsumed = results.reduce((sum, r) => sum + r.consumed, 0);
    if (totalConsumed < order.amount) {
      if (!confirm(`总消耗 ${totalConsumed} 小于订单金额 ${order.amount}，确定提交吗？`)) return;
    }

    onCompleteOrder(order.id, results);
    setActiveOrderId(null);
    setWindowBalances({});
  };

  // 当前查看的订单
  const activeOrder = pendingOrders.find(o => o.id === activeOrderId);

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-text p-4 md:p-8 bg-cyber-grid bg-[length:30px_30px]">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* 头部 */}
        <header className="flex justify-between items-center mb-8 border-b border-cyber-primary/30 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyber-primary/20 border border-cyber-primary flex items-center justify-center">
              <User className="text-cyber-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-mono text-white">{staff.name}</h1>
              <p className="text-cyber-primary/60 text-sm font-mono">员工端</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors">
            <LogOut size={16} /> 退出
          </button>
        </header>

        {/* 进行中的订单 */}
        {pendingOrders.length > 0 && (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-2 mb-4 text-yellow-400">
              <Clock size={20} />
              <h2 className="font-mono text-lg">进行中的订单 ({pendingOrders.length})</h2>
            </div>
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-mono text-lg">{order.date}</div>
                      <div className="text-sm text-gray-400">订单金额: <span className="text-cyber-accent">{formatChineseNumber(order.amount)}</span> 万</div>
                    </div>
                    <CyberButton onClick={() => {
                      setActiveOrderId(order.id);
                      // 初始化窗口余额输入
                      const balances: Record<string, string> = {};
                      order.windowSnapshots?.forEach(snap => {
                        balances[snap.windowId] = '';
                      });
                      setWindowBalances(balances);
                    }}>
                      填写结果
                    </CyberButton>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* 订单完成弹窗 */}
        {activeOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-mono text-cyber-primary mb-4">完成订单 - {activeOrder.date}</h3>
              <div className="mb-4 p-3 bg-black/30 rounded">
                <div className="text-sm text-gray-400">订单金额</div>
                <div className="text-2xl font-mono text-cyber-accent">{activeOrder.amount} 万</div>
              </div>
              
              <div className="text-sm text-cyber-primary font-mono mb-2">请填写每个窗口的剩余哈佛币 (不填则默认无消耗):</div>
              <div className="space-y-3 mb-6">
                {activeOrder.windowSnapshots?.map(snap => {
                  const inputValue = windowBalances[snap.windowId] || '';
                  const endBalance = inputValue ? parseFloat(inputValue) : snap.startBalance;
                  const consumed = snap.startBalance - endBalance;
                  return (
                    <div key={snap.windowId} className="bg-black/30 p-3 rounded border border-cyber-primary/20">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-mono">#{snap.windowNumber}</span>
                          <span className="text-xs text-gray-500 ml-2">{snap.machineName}</span>
                        </div>
                        <div className="text-xs text-gray-400">开始: {formatWan(snap.startBalance)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          placeholder={`${toWan(snap.startBalance)} 万 (当前余额)`}
                          value={inputValue}
                          onChange={e => setWindowBalances({...windowBalances, [snap.windowId]: e.target.value})}
                          className="flex-1 bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 placeholder:text-gray-600 placeholder:opacity-50"
                        />
                        <div className={`text-sm font-mono min-w-[100px] ${consumed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          消耗: {formatWan(consumed)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 汇总 - 始终显示，未填写的默认无消耗 */}
              <div className="mb-6 p-3 bg-cyber-primary/10 rounded border border-cyber-primary/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-400">总消耗 (万)</div>
                    <div className="font-mono text-lg">
                      {toWan(activeOrder.windowSnapshots?.reduce((sum, snap) => {
                        const end = windowBalances[snap.windowId] 
                          ? parseFloat(windowBalances[snap.windowId]) 
                          : snap.startBalance;
                        return sum + (snap.startBalance - end);
                      }, 0) || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">订单金额 (万)</div>
                    <div className="font-mono text-lg text-cyber-accent">{activeOrder.amount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">损耗 (万)</div>
                    <div className="font-mono text-lg text-red-400">
                      {(() => {
                        const totalConsumed = activeOrder.windowSnapshots?.reduce((sum, snap) => {
                          const end = windowBalances[snap.windowId] 
                            ? parseFloat(windowBalances[snap.windowId]) 
                            : snap.startBalance;
                          return sum + (snap.startBalance - end);
                        }, 0) || 0;
                        const orderAmountInCoins = activeOrder.amount * 10000;
                        const loss = totalConsumed - orderAmountInCoins;
                        return loss > 0 ? toWan(loss) : '0';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setActiveOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                  取消
                </button>
                <CyberButton onClick={() => handleCompleteOrder(activeOrder)} className="flex-1">
                  <CheckCircle size={16} className="mr-2" /> 确认完成
                </CyberButton>
              </div>
            </div>
          </div>
        )}


        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="完成订单" value={myStats.orderCount.toString()} />
          <StatBox label="总金额(万)" value={myStats.totalAmount.toString()} />
          <StatBox label="总损耗(万)" value={toWan(myStats.totalLoss)} trend="down" />
          <StatBox label="劳动收入(¥)" value={myStats.laborCost.toFixed(2)} trend="up" />
        </div>

        {/* 我的资源 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <GlassCard>
            <div className="flex items-center gap-2 mb-4 text-cyber-primary">
              <MessageSquare size={20} />
              <h2 className="font-mono text-lg">我的 Kook 频道</h2>
            </div>
            {myKookChannels.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无分配</p>
            ) : (
              <div className="space-y-2">
                {myKookChannels.map(channel => (
                  <div key={channel.id} className="flex justify-between items-center p-3 bg-black/30 rounded border border-cyber-primary/20">
                    <div>
                      <div className="font-mono">{channel.phone}</div>
                      <div className="text-sm text-gray-400">{channel.nickname || '无昵称'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-4 text-cyber-primary">
              <Monitor size={20} />
              <h2 className="font-mono text-lg">我的云机窗口</h2>
            </div>
            {myWindows.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无分配</p>
            ) : (
              <div className="space-y-2">
                {myWindows.map(window => (
                  <div key={window.id} className="flex justify-between items-center p-3 bg-black/30 rounded border border-cyber-primary/20">
                    <div>
                      <div className="font-mono">窗口 #{window.windowNumber}</div>
                      <div className="text-sm text-gray-400">{getMachineName(window.machineId)}</div>
                    </div>
                    <div className="text-cyber-accent font-mono flex items-center gap-1">
                      <Coins size={14} />
                      {formatWan(window.goldBalance)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* 已完成订单 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyber-primary">
              <FileText size={20} />
              <h2 className="font-mono text-lg">已完成订单</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="text-xs text-gray-400 hover:text-white">清除</button>
              )}
            </div>
          </div>
          {completedOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无订单</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyber-primary/30 text-left">
                    <th className="py-2 px-2 text-cyber-primary font-mono">日期</th>
                    <th className="py-2 px-2 text-cyber-primary font-mono">金额(万)</th>
                    <th className="py-2 px-2 text-cyber-primary font-mono">消耗(万)</th>
                    <th className="py-2 px-2 text-cyber-primary font-mono">损耗(万)</th>
                    <th className="py-2 px-2 text-cyber-primary font-mono">手续费</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-800">
                      <td className="py-2 px-2 font-mono">{order.date}</td>
                      <td className="py-2 px-2 text-cyber-accent">{order.amount}</td>
                      <td className="py-2 px-2">{toWan(order.totalConsumed || order.amount * 10000)}</td>
                      <td className="py-2 px-2 text-red-400">{order.loss > 0 ? toWan(order.loss) : '-'}</td>
                      <td className="py-2 px-2">{order.feePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
