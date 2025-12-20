import React, { useState, useMemo } from 'react';
import { User, Monitor, FileText, LogOut, Coins, Clock, CheckCircle, Filter, Pause, Plus, Server, Unlock, Trash2 } from 'lucide-react';
import { Staff, OrderRecord, KookChannel, CloudWindow, CloudMachine, Settings, WindowResult, WindowRequest } from '../types';
import { GlassCard, StatBox, CyberButton, useCyberModal } from './CyberUI';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface Props {
  staff: Staff;
  orders: OrderRecord[];
  kookChannels: KookChannel[];
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  settings: Settings;
  windowRequests: WindowRequest[];
  onLogout: () => void;
  onCompleteOrder: (orderId: string, windowResults: WindowResult[]) => void;
  onPauseOrder: (orderId: string, completedAmount: number) => Promise<boolean>;
  onRequestWindow: (staffId: string, staffName: string, type: 'apply' | 'release', windowId?: string) => void;
  onReleaseOrderWindow?: (orderId: string, windowId: string, endBalance: number, staffId: string, staffName: string) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const StaffPortal: React.FC<Props> = ({
  staff,
  orders,
  kookChannels,
  cloudWindows,
  cloudMachines,
  settings,
  windowRequests,
  onLogout,
  onCompleteOrder,
  onPauseOrder,
  onRequestWindow,
  onReleaseOrderWindow,
  onDeleteOrder
}) => {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  // 按订单ID存储窗口余额和保存状态，关闭弹窗后保留数据
  const [orderWindowBalances, setOrderWindowBalances] = useState<Record<string, Record<string, string>>>({});
  const [orderSavedWindows, setOrderSavedWindows] = useState<Record<string, Record<string, boolean>>>({});
  
  // 释放窗口相关状态
  const [releaseWindowId, setReleaseWindowId] = useState<string | null>(null);
  const [releaseBalance, setReleaseBalance] = useState('');
  
  // 当前订单的窗口余额和保存状态
  const windowBalances = activeOrderId ? (orderWindowBalances[activeOrderId] || {}) : {};
  const savedWindows = activeOrderId ? (orderSavedWindows[activeOrderId] || {}) : {};
  
  const setWindowBalances = (balances: Record<string, string>) => {
    if (activeOrderId) {
      setOrderWindowBalances(prev => ({ ...prev, [activeOrderId]: balances }));
    }
  };
  
  const setSavedWindows = (saved: Record<string, boolean>) => {
    if (activeOrderId) {
      setOrderSavedWindows(prev => ({ ...prev, [activeOrderId]: saved }));
    }
  };
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [pauseAmount, setPauseAmount] = useState('');
  const [showPauseModal, setShowPauseModal] = useState<string | null>(null);
  const [showWindowSelectModal, setShowWindowSelectModal] = useState(false);
  const [selectedWindowId, setSelectedWindowId] = useState('');
  const [releaseMyWindowId, setReleaseMyWindowId] = useState<string | null>(null);
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState<{ order: OrderRecord; results: WindowResult[] } | null>(null);
  
  // 释放订单窗口相关状态
  const [releaseOrderWindowId, setReleaseOrderWindowId] = useState<string | null>(null);
  const [releaseOrderBalance, setReleaseOrderBalance] = useState('');
  
  // 删除订单确认状态
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  
  const { showAlert, showSuccess, ModalComponent } = useCyberModal();

  // 我的订单
  const myOrders = useMemo(() => {
    return orders.filter(o => o.staffId === staff.id);
  }, [orders, staff.id]);

  // 进行中的订单
  const pendingOrders = useMemo(() => {
    return myOrders.filter(o => o.status === 'pending');
  }, [myOrders]);

  // 暂停中的订单
  const pausedOrders = useMemo(() => {
    return myOrders.filter(o => o.status === 'paused');
  }, [myOrders]);

  // 我的窗口申请
  const myRequests = useMemo(() => {
    return windowRequests.filter(r => r.staffId === staff.id);
  }, [windowRequests, staff.id]);

  // 已完成的订单
  const completedOrders = useMemo(() => {
    let completed = myOrders.filter(o => o.status === 'completed');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (periodFilter === 'today') {
      completed = completed.filter(o => o.date === todayStr);
    } else if (periodFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      completed = completed.filter(o => o.date >= weekAgoStr);
    } else if (periodFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      completed = completed.filter(o => o.date >= monthAgoStr);
    } else if (periodFilter === 'custom' && customStartDate && customEndDate) {
      completed = completed.filter(o => o.date >= customStartDate && o.date <= customEndDate);
    }
    return completed.sort((a, b) => b.date.localeCompare(a.date));
  }, [myOrders, periodFilter, customStartDate, customEndDate]);
  
  // 筛选后的统计
  const filteredStats = useMemo(() => {
    const totalAmount = completedOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = completedOrders.reduce((sum, o) => sum + (o.loss || 0), 0);
    const totalConsumed = completedOrders.reduce((sum, o) => sum + (o.totalConsumed || o.amount * 10000), 0);
    const income = totalAmount * settings.employeeCostRate / 1000;
    return { totalAmount, totalLoss, totalConsumed, income, count: completedOrders.length };
  }, [completedOrders, settings.employeeCostRate]);

  // 今日统计
  const myStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCompleted = myOrders.filter(o => o.status === 'completed' && o.date === today);
    const orderCount = todayCompleted.length;
    const totalAmount = todayCompleted.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = todayCompleted.reduce((sum, o) => sum + (o.loss || 0), 0);
    const todayIncome = totalAmount * settings.employeeCostRate / 1000;
    
    return { orderCount, totalAmount, totalLoss, todayIncome };
  }, [myOrders, settings.employeeCostRate]);

  // 我的云机窗口
  const myWindows = useMemo(() => cloudWindows.filter(w => w.userId === staff.id), [cloudWindows, staff.id]);

  // 空闲窗口（可申请的）
  const freeWindows = useMemo(() => cloudWindows.filter(w => !w.userId), [cloudWindows]);

  // 我的 Kook 频道
  const myKook = useMemo(() => kookChannels.find(k => k.userId === staff.id), [kookChannels, staff.id]);

  const getMachine = (machineId: string) => {
    return cloudMachines.find(m => m.id === machineId);
  };
  
  const getMachineName = (machineId: string) => {
    const machine = getMachine(machineId);
    return machine ? `${machine.phone} (${machine.platform})` : '未知';
  };
  
  const getMachineLoginInfo = (machineId: string) => {
    const machine = getMachine(machineId);
    if (!machine) return null;
    return machine.loginType === 'password' 
      ? `密码: ${machine.loginPassword || ''}` 
      : '验证码登录';
  };

  // 处理暂停订单
  const handlePauseOrder = async (orderId: string) => {
    const amount = parseFloat(pauseAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('输入错误', '请输入有效的已完成金额');
      return;
    }
    const success = await onPauseOrder(orderId, amount);
    if (success) {
      showSuccess('操作成功', '订单已暂停');
    } else {
      showAlert('操作失败', '暂停订单失败，请重试');
    }
    setShowPauseModal(null);
    setPauseAmount('');
  };

  // 处理申请窗口
  const handleRequestWindow = () => {
    if (!selectedWindowId) {
      showAlert('提示', '请选择要申请的窗口');
      return;
    }
    onRequestWindow(staff.id, staff.name, 'apply', selectedWindowId);
    setShowWindowSelectModal(false);
    setSelectedWindowId('');
    showSuccess('申请已提交', '窗口申请已提交，请等待管理员审批');
  };

  // 处理释放我的窗口（申请释放）
  const handleReleaseMyWindow = (windowId: string) => {
    setReleaseMyWindowId(windowId);
  };

  // 确认释放我的窗口
  const confirmReleaseMyWindow = () => {
    if (releaseMyWindowId) {
      onRequestWindow(staff.id, staff.name, 'release', releaseMyWindowId);
      setReleaseMyWindowId(null);
      showSuccess('申请已提交', '释放申请已提交，请等待管理员审批');
    }
  };

  // 处理完成订单
  const handleCompleteOrder = (order: OrderRecord) => {
    if (!order.windowSnapshots) return;
    
    const results: WindowResult[] = order.windowSnapshots.map(snap => {
      // 用户输入的是万，需要转换成实际数量（* 10000）
      // 如果用户没有填写，默认使用开始余额（即没有消耗）
      const endBalance = windowBalances[snap.windowId] 
        ? parseFloat(windowBalances[snap.windowId]) * 10000
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
      // 需要确认
      setPendingCompleteOrder({ order, results });
      return;
    }

    onCompleteOrder(order.id, results);
    // 完成后清空该订单的临时数据
    setOrderWindowBalances(prev => { const n = {...prev}; delete n[order.id]; return n; });
    setOrderSavedWindows(prev => { const n = {...prev}; delete n[order.id]; return n; });
    setActiveOrderId(null);
  };

  // 确认完成订单（消耗不足时）
  const confirmCompleteOrder = () => {
    if (pendingCompleteOrder) {
      onCompleteOrder(pendingCompleteOrder.order.id, pendingCompleteOrder.results);
      // 完成后清空该订单的临时数据
      setOrderWindowBalances(prev => { const n = {...prev}; delete n[pendingCompleteOrder.order.id]; return n; });
      setOrderSavedWindows(prev => { const n = {...prev}; delete n[pendingCompleteOrder.order.id]; return n; });
      setActiveOrderId(null);
      setPendingCompleteOrder(null);
    }
  };

  // 处理释放订单窗口
  const handleReleaseOrderWindow = (windowId: string) => {
    const balance = windowBalances[windowId] || '';
    setReleaseOrderWindowId(windowId);
    setReleaseOrderBalance(balance);
  };

  // 确认释放订单窗口
  const confirmReleaseOrderWindow = () => {
    if (!releaseOrderWindowId || !activeOrder || !onReleaseOrderWindow) return;
    
    const snapshot = activeOrder.windowSnapshots?.find(s => s.windowId === releaseOrderWindowId);
    if (!snapshot) return;
    
    const endBalance = releaseOrderBalance ? parseFloat(releaseOrderBalance) * 10000 : snapshot.startBalance;
    
    onReleaseOrderWindow(activeOrder.id, releaseOrderWindowId, endBalance, staff.id, staff.name);
    
    // 从当前窗口余额中移除
    const newBalances = { ...windowBalances };
    delete newBalances[releaseOrderWindowId];
    setWindowBalances(newBalances);
    
    setReleaseOrderWindowId(null);
    setReleaseOrderBalance('');
    showSuccess('操作成功', '窗口已释放，消耗已记录');
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPauseModal(order.id)}
                        className="px-3 py-2 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 flex items-center gap-1 text-sm"
                      >
                        <Pause size={14} /> 暂停
                      </button>
                      <CyberButton onClick={() => {
                        setActiveOrderId(order.id);
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
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* 暂停订单弹窗 */}
        {showPauseModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-panel border border-yellow-500/30 p-6 max-w-md w-full">
              <h3 className="text-xl font-mono text-yellow-400 mb-4">暂停订单</h3>
              <p className="text-gray-400 text-sm mb-4">请输入已完成的金额（万），剩余部分可以稍后继续或转给其他员工</p>
              <input
                type="number"
                placeholder="已完成金额（万）"
                value={pauseAmount}
                onChange={e => setPauseAmount(e.target.value)}
                className="w-full bg-black/40 border border-yellow-500/30 text-cyber-text font-mono px-3 py-2 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowPauseModal(null); setPauseAmount(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                  取消
                </button>
                <button onClick={() => handlePauseOrder(showPauseModal)} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30">
                  确认暂停
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 暂停中的订单 */}
        {pausedOrders.length > 0 && (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-2 mb-4 text-orange-400">
              <Pause size={20} />
              <h2 className="font-mono text-lg">暂停中的订单 ({pausedOrders.length})</h2>
            </div>
            <div className="space-y-3">
              {pausedOrders.map(order => (
                <div key={order.id} className="bg-orange-500/10 border border-orange-500/30 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-mono text-lg">{order.date}</div>
                      <div className="text-sm text-gray-400">
                        总金额: <span className="text-cyber-accent">{order.amount}</span> 万 | 
                        已完成: <span className="text-green-400">{order.completedAmount || 0}</span> 万 | 
                        剩余: <span className="text-orange-400">{order.amount - (order.completedAmount || 0)}</span> 万
                      </div>
                    </div>
                    <span className="text-orange-400 text-sm">等待恢复</span>
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

              {/* 已释放的窗口 */}
              {activeOrder.partialResults && activeOrder.partialResults.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <div className="text-sm text-yellow-400 font-mono mb-2">已释放的窗口:</div>
                  {activeOrder.partialResults.map((pr, idx) => (
                    <div key={idx} className="text-xs text-gray-400 flex justify-between">
                      <span>#{pr.windowNumber} - {pr.staffName}</span>
                      <span>消耗: <span className="text-red-400">{formatWan(pr.consumed)}</span></span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-sm text-cyber-primary font-mono mb-2">请填写每个窗口的剩余哈夫币（万）(不填则默认无消耗):</div>
              <div className="space-y-3 mb-6">
                {activeOrder.windowSnapshots?.map(snap => {
                  const inputValue = windowBalances[snap.windowId] || '';
                  const endBalance = inputValue ? parseFloat(inputValue) * 10000 : snap.startBalance;
                  const consumed = snap.startBalance - endBalance;
                  return (
                    <div key={snap.windowId} className={`bg-black/30 p-3 rounded border ${inputValue === '0' ? 'border-red-500/50' : 'border-cyber-primary/20'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-mono">#{snap.windowNumber}</span>
                          <span className="text-xs text-gray-500 ml-2">{snap.machineName}</span>
                          {inputValue === '0' && <span className="text-xs text-red-400 ml-2">✓ 已消耗完</span>}
                        </div>
                        <div className="text-xs text-gray-400">开始: {formatWan(snap.startBalance)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={`${toWan(snap.startBalance)} 万 (当前余额)`}
                          value={inputValue}
                          onChange={e => setWindowBalances({...windowBalances, [snap.windowId]: e.target.value})}
                          className="flex-1 bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 placeholder:text-gray-600 placeholder:opacity-50"
                        />
                        <div className={`text-sm font-mono min-w-[70px] ${consumed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatWan(consumed)}
                        </div>
                        <button
                          onClick={() => {
                            const startBalanceWan = String(snap.startBalance / 10000);
                            setWindowBalances({...windowBalances, [snap.windowId]: startBalanceWan});
                            setSavedWindows({...savedWindows, [snap.windowId]: true});
                          }}
                          className={`px-2 py-2 text-xs font-mono border ${
                            inputValue === String(snap.startBalance / 10000)
                              ? 'bg-green-500/20 border-green-500 text-green-400' 
                              : 'border-green-500 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          未使用
                        </button>
                        <button
                          onClick={() => {
                            setWindowBalances({...windowBalances, [snap.windowId]: '0'});
                            setSavedWindows({...savedWindows, [snap.windowId]: true});
                          }}
                          className={`px-2 py-2 text-xs font-mono border ${
                            inputValue === '0'
                              ? 'bg-red-500/20 border-red-500 text-red-400' 
                              : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                          }`}
                        >
                          消耗完
                        </button>
                        {onReleaseOrderWindow && (
                          <button
                            onClick={() => handleReleaseOrderWindow(snap.windowId)}
                            className="px-2 py-2 text-xs font-mono border border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 flex items-center gap-1"
                          >
                            <Unlock size={12} /> 释放
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 汇总 - 包含已释放窗口的消耗 */}
              <div className="mb-6 p-3 bg-cyber-primary/10 rounded border border-cyber-primary/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-400">总消耗 (万)</div>
                    <div className="font-mono text-lg">
                      {toWan(
                        (activeOrder.windowSnapshots?.reduce((sum, snap) => {
                          const end = windowBalances[snap.windowId] 
                            ? parseFloat(windowBalances[snap.windowId]) * 10000
                            : snap.startBalance;
                          return sum + (snap.startBalance - end);
                        }, 0) || 0) +
                        (activeOrder.partialResults?.reduce((sum, pr) => sum + pr.consumed, 0) || 0)
                      )}
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
                        const currentConsumed = activeOrder.windowSnapshots?.reduce((sum, snap) => {
                          const end = windowBalances[snap.windowId] 
                            ? parseFloat(windowBalances[snap.windowId]) * 10000
                            : snap.startBalance;
                          return sum + (snap.startBalance - end);
                        }, 0) || 0;
                        const partialConsumed = activeOrder.partialResults?.reduce((sum, pr) => sum + pr.consumed, 0) || 0;
                        const totalConsumed = currentConsumed + partialConsumed;
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


        {/* 今日统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="今日订单" value={myStats.orderCount.toString()} />
          <StatBox label="今日金额(万)" value={myStats.totalAmount.toString()} />
          <StatBox label="今日损耗(万)" value={toWan(myStats.totalLoss)} trend="down" />
          <StatBox label="今日收入(¥)" value={myStats.todayIncome.toFixed(2)} trend="up" />
        </div>

        {/* 我的云机窗口 */}
        <GlassCard className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyber-primary">
              <Monitor size={20} />
              <h2 className="font-mono text-lg">我的云机窗口</h2>
              {myKook && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                  Kook: {myKook.phone} ({myKook.nickname || '无昵称'})
                </span>
              )}
            </div>
            <button
              onClick={() => setShowWindowSelectModal(true)}
              className="px-3 py-1 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm flex items-center gap-1 hover:bg-cyber-primary/30"
            >
              <Plus size={14} /> 申请窗口
            </button>
          </div>
          {myWindows.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无分配</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myWindows.map(window => {
                // 查找该窗口关联的进行中订单
                const windowOrder = pendingOrders.find(o => 
                  o.windowSnapshots?.some(s => s.windowId === window.id)
                );
                return (
                  <div key={window.id} className="p-3 bg-black/30 rounded border border-cyber-primary/20 group">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-mono">窗口 #{window.windowNumber}</div>
                        <div className="text-sm text-gray-400">{getMachineName(window.machineId)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-mono flex items-center gap-1 ${window.goldBalance < 1000000 ? 'text-red-400' : 'text-cyber-accent'}`}>
                          <Coins size={14} />
                          {formatWan(window.goldBalance)}
                          {window.goldBalance < 1000000 && <span className="text-xs">(低)</span>}
                        </div>
                        <button
                          onClick={() => handleReleaseMyWindow(window.id)}
                          className="px-3 py-1 text-xs bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 hover:border-yellow-500 rounded transition-all"
                        >
                          释放窗口
                        </button>
                      </div>
                    </div>
                    {getMachineLoginInfo(window.machineId) && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs">
                        <span className="text-gray-500">登录方式: </span>
                        <span className="text-cyber-primary">{getMachineLoginInfo(window.machineId)}</span>
                      </div>
                    )}
                    {/* 显示该窗口关联的进行中订单 */}
                    {windowOrder && (
                      <div className="mt-3 pt-3 border-t border-yellow-500/30 bg-yellow-500/5 -mx-3 -mb-3 px-3 pb-3 rounded-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-yellow-400 font-mono flex items-center gap-1">
                              <Clock size={12} /> 进行中订单
                            </div>
                            <div className="text-sm text-gray-300">
                              {windowOrder.date} · <span className="text-cyber-accent">{windowOrder.amount}</span> 万
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {onDeleteOrder && (
                              <button
                                onClick={() => setDeleteOrderId(windowOrder.id)}
                                className="px-2 py-1 text-xs bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 rounded flex items-center gap-1"
                              >
                                <Trash2 size={10} /> 删除
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveOrderId(windowOrder.id);
                                const balances: Record<string, string> = {};
                                windowOrder.windowSnapshots?.forEach(snap => {
                                  balances[snap.windowId] = '';
                                });
                                setWindowBalances(balances);
                              }}
                              className="px-2 py-1 text-xs bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 rounded flex items-center gap-1"
                            >
                              <CheckCircle size={10} /> 完成
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* 待审批的申请 */}
          {myRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">待审批申请:</div>
              {myRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded mb-1">
                  {req.type === 'apply' ? '申请新窗口' : '申请释放窗口'} - 等待审批中...
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* 申请窗口弹窗 */}
        {showWindowSelectModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-mono text-cyber-primary mb-4 flex items-center gap-2">
                <Monitor size={20} /> 选择要申请的窗口
              </h3>
              {freeWindows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无可申请的空闲窗口</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {cloudMachines.map(machine => {
                    const machineWindows = freeWindows.filter(w => w.machineId === machine.id);
                    if (machineWindows.length === 0) return null;
                    return (
                      <div key={machine.id} className="border border-cyber-primary/20 rounded overflow-hidden">
                        <div className="bg-cyber-panel/50 p-3 flex items-center gap-3">
                          <Server className="text-cyber-primary" size={18} />
                          <span className="font-mono">{machine.phone}</span>
                          <span className="text-sm text-gray-400">({machine.platform})</span>
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {machineWindows.map(window => (
                            <label
                              key={window.id}
                              className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-all
                                ${selectedWindowId === window.id 
                                  ? 'border-cyber-primary bg-cyber-primary/20' 
                                  : 'border-gray-700 bg-black/30 hover:border-gray-500'}`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="windowSelect"
                                  value={window.id}
                                  checked={selectedWindowId === window.id}
                                  onChange={e => setSelectedWindowId(e.target.value)}
                                  className="accent-cyber-primary"
                                />
                                <span className="font-mono">#{window.windowNumber}</span>
                              </div>
                              <div className={`font-mono text-sm flex items-center gap-1 ${window.goldBalance < 1000000 ? 'text-red-400' : 'text-cyber-accent'}`}>
                                <Coins size={12} />
                                {formatWan(window.goldBalance)}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowWindowSelectModal(false); setSelectedWindowId(''); }} 
                  className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  取消
                </button>
                <button 
                  onClick={handleRequestWindow}
                  disabled={!selectedWindowId}
                  className="flex-1 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交申请
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 已完成订单 */}
        <GlassCard>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-primary">
                <FileText size={20} />
                <h2 className="font-mono text-lg">已完成订单</h2>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={periodFilter}
                  onChange={e => setPeriodFilter(e.target.value as any)}
                  className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm"
                >
                  <option value="today">今天</option>
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="all">全部</option>
                  <option value="custom">自定义</option>
                </select>
                {periodFilter === 'custom' && (
                  <>
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                      className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                    <span className="text-gray-500">-</span>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                      className="bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                  </>
                )}
              </div>
            </div>
            {/* 统计汇总 */}
            <div className="grid grid-cols-4 gap-3 p-3 bg-black/30 rounded border border-cyber-primary/20">
              <div className="text-center">
                <div className="text-xs text-gray-400">订单数</div>
                <div className="font-mono text-lg text-white">{filteredStats.count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">总金额(万)</div>
                <div className="font-mono text-lg text-cyber-accent">{filteredStats.totalAmount}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">总损耗(万)</div>
                <div className="font-mono text-lg text-red-400">{toWan(filteredStats.totalLoss)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">收入(¥)</div>
                <div className="font-mono text-lg text-green-400">{filteredStats.income.toFixed(2)}</div>
              </div>
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
                    <th className="py-2 px-2 text-cyber-primary font-mono">损耗比</th>
                    <th className="py-2 px-2 text-cyber-primary font-mono">收入(¥)</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map(order => {
                    const consumed = order.totalConsumed || order.amount * 10000;
                    const lossRatio = consumed > 0 ? ((order.loss || 0) / consumed * 100).toFixed(2) : '0';
                    const income = order.amount * settings.employeeCostRate / 1000;
                    return (
                    <tr key={order.id} className="border-b border-gray-800">
                      <td className="py-2 px-2 font-mono">{order.date}</td>
                      <td className="py-2 px-2 text-cyber-accent">{order.amount}</td>
                      <td className="py-2 px-2">{toWan(consumed)}</td>
                      <td className="py-2 px-2 text-red-400">{order.loss > 0 ? toWan(order.loss) : '-'}</td>
                      <td className="py-2 px-2">{lossRatio}%</td>
                      <td className="py-2 px-2 text-green-400">{income.toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* 释放我的窗口确认弹窗 */}
        {releaseMyWindowId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-yellow-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border border-yellow-500 flex items-center justify-center text-yellow-400 font-mono text-lg">?</div>
                <h3 className="text-xl font-mono text-yellow-400 tracking-wider">确认释放</h3>
              </div>
              <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">确定要申请释放这个窗口吗？释放后需要等待管理员审批。</p>
              <div className="flex gap-3">
                <button onClick={() => setReleaseMyWindowId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button onClick={confirmReleaseMyWindow} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/40 font-mono text-sm">确认释放</button>
              </div>
            </div>
          </div>
        )}

        {/* 释放订单窗口确认弹窗 */}
        {releaseOrderWindowId && activeOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-yellow-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <h3 className="text-xl font-mono text-yellow-400 mb-4 flex items-center gap-2">
                <Unlock size={20} /> 释放窗口
              </h3>
              {(() => {
                const snap = activeOrder.windowSnapshots?.find(s => s.windowId === releaseOrderWindowId);
                if (!snap) return null;
                const endBalance = releaseOrderBalance ? parseFloat(releaseOrderBalance) * 10000 : snap.startBalance;
                const consumed = snap.startBalance - endBalance;
                return (
                  <>
                    <div className="mb-4 p-3 bg-black/30 rounded">
                      <div className="text-sm text-gray-400">窗口: <span className="text-white">#{snap.windowNumber}</span></div>
                      <div className="text-sm text-gray-400">开始余额: <span className="text-cyber-accent">{formatWan(snap.startBalance)}</span></div>
                    </div>
                    <div className="mb-4">
                      <label className="text-sm text-gray-400 mb-2 block">当前余额（万）</label>
                      <input
                        type="number"
                        value={releaseOrderBalance}
                        onChange={e => setReleaseOrderBalance(e.target.value)}
                        placeholder={`${toWan(snap.startBalance)} (不填则无消耗)`}
                        className="w-full bg-black/40 border border-yellow-500/30 text-cyber-text font-mono px-3 py-2"
                      />
                    </div>
                    <div className="mb-4 p-3 bg-yellow-500/10 rounded">
                      <div className="text-sm">
                        消耗: <span className={consumed > 0 ? 'text-red-400' : 'text-green-400'}>{formatWan(consumed)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        释放后窗口将变为空闲，消耗将记录到您的账户
                      </div>
                    </div>
                  </>
                );
              })()}
              <div className="flex gap-3">
                <button onClick={() => { setReleaseOrderWindowId(null); setReleaseOrderBalance(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button onClick={confirmReleaseOrderWindow} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/40 font-mono text-sm">确认释放</button>
              </div>
            </div>
          </div>
        )}

        {/* 完成订单确认弹窗（消耗不足时） */}
        {pendingCompleteOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-yellow-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-yellow-500 shadow-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border border-yellow-500 flex items-center justify-center text-yellow-400 font-mono text-lg">⚠</div>
                <h3 className="text-xl font-mono text-yellow-400 tracking-wider">消耗不足</h3>
              </div>
              <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">
                总消耗 <span className="text-red-400">{toWan(pendingCompleteOrder.results.reduce((sum, r) => sum + r.consumed, 0))}</span> 小于订单金额 <span className="text-cyber-accent">{pendingCompleteOrder.order.amount}</span> 万，确定提交吗？
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPendingCompleteOrder(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button onClick={confirmCompleteOrder} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/40 font-mono text-sm">确认提交</button>
              </div>
            </div>
          </div>
        )}

        {/* 通用弹窗 */}
        <ModalComponent />

        {/* 删除订单确认弹窗 */}
        {deleteOrderId && onDeleteOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-red-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border border-red-500 flex items-center justify-center text-red-400 font-mono text-lg">!</div>
                <h3 className="text-xl font-mono text-red-400 tracking-wider">删除订单</h3>
              </div>
              <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">确定要删除这个订单吗？此操作不可恢复。</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button 
                  onClick={() => {
                    onDeleteOrder(deleteOrderId);
                    setDeleteOrderId(null);
                    showSuccess('操作成功', '订单已删除');
                  }} 
                  className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/40 font-mono text-sm"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
