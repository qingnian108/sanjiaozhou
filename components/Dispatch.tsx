import React, { useState, useEffect, useMemo } from 'react';
import { Send, Check, Plus, Trash2, Circle, Pause, Play, ArrowRight, Clock, CheckCircle, Unlock } from 'lucide-react';
import { GlassCard, CyberInput, SectionHeader, CyberButton, useCyberModal } from './CyberUI';
import { OrderRecord, Settings, Staff, CloudWindow, CloudMachine, WindowSnapshot, WindowResult } from '../types';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface Props {
  onAddOrder: (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => void;
  settings: Settings;
  staffList: Staff[];
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  orders: OrderRecord[];
  onAddWindow: (window: Omit<CloudWindow, 'id'>) => void;
  onDeleteWindow: (id: string) => void;
  onAssignWindow: (windowId: string, userId: string | null) => void;
  onResumeOrder: (orderId: string, newStaffId?: string) => Promise<boolean>;
  onCompleteOrder: (orderId: string, windowResults: WindowResult[]) => void;
  onReleaseOrderWindow: (orderId: string, windowId: string, endBalance: number, staffId: string, staffName: string) => void;
  onAddWindowToOrder: (orderId: string, windowId: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => void;
}

export const Dispatch: React.FC<Props> = ({ 
  onAddOrder, 
  settings, 
  staffList,
  cloudWindows,
  cloudMachines,
  orders,
  onAddWindow,
  onDeleteWindow,
  onAssignWindow,
  onResumeOrder,
  onCompleteOrder,
  onReleaseOrderWindow,
  onAddWindowToOrder,
  onDeleteOrder
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [orderForm, setOrderForm] = useState({
    date: today,
    staffId: '',
    amount: '',
    totalPrice: '' // 总价（元）
  });

  // 选中的窗口ID列表
  const [selectedWindowIds, setSelectedWindowIds] = useState<string[]>([]);
  
  // 显示分配窗口面板
  const [showAddWindow, setShowAddWindow] = useState(false);
  
  // 转派订单
  const [transferOrderId, setTransferOrderId] = useState<string | null>(null);
  const [transferStaffId, setTransferStaffId] = useState('');

  // 完成订单相关状态
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderWindowBalances, setOrderWindowBalances] = useState<Record<string, Record<string, string>>>({});
  const [orderSavedWindows, setOrderSavedWindows] = useState<Record<string, Record<string, boolean>>>({});
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState<{ order: OrderRecord; results: WindowResult[] } | null>(null);
  
  // 释放窗口相关状态
  const [releaseWindowId, setReleaseWindowId] = useState<string | null>(null);
  const [releaseBalance, setReleaseBalance] = useState('');
  
  // 删除订单确认状态
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

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

  // 暂停中的订单
  const pausedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'paused');
  }, [orders]);

  // 进行中的订单
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pending');
  }, [orders]);

  // 当前查看的订单
  const activeOrder = pendingOrders.find(o => o.id === activeOrderId);

  // 当打开完成订单弹窗时，初始化窗口余额
  useEffect(() => {
    if (activeOrderId && activeOrder) {
      const staffWindows = cloudWindows.filter(w => w.userId === activeOrder.staffId);
      setOrderWindowBalances(prev => {
        const currentBalances = prev[activeOrderId] || {};
        const newBalances: Record<string, string> = {};
        // 为员工当前窗口初始化余额
        staffWindows.forEach(w => {
          newBalances[w.id] = currentBalances[w.id] || '';
        });
        return { ...prev, [activeOrderId]: newBalances };
      });
    }
  }, [activeOrderId, activeOrder?.staffId, cloudWindows]);

  // 获取员工名称
  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || '未知';
  };

  // 恢复订单给原员工
  const handleResumeToOriginal = async (orderId: string) => {
    console.log('handleResumeToOriginal called with orderId:', orderId);
    const success = await onResumeOrder(orderId);
    if (success) {
      showSuccess('操作成功', '订单已恢复，员工可继续处理');
    } else {
      showAlert('操作失败', '恢复订单失败，请重试');
    }
  };

  // 转派订单给其他员工
  const handleTransferOrder = async () => {
    if (!transferOrderId || !transferStaffId) return;
    const success = await onResumeOrder(transferOrderId, transferStaffId);
    if (success) {
      showSuccess('操作成功', '订单已转派给新员工');
    } else {
      showAlert('操作失败', '转派订单失败，请重试');
    }
    setTransferOrderId(null);
    setTransferStaffId('');
  };

  // 处理完成订单 - 使用员工当前窗口
  const handleCompleteOrder = (order: OrderRecord) => {
    // 获取员工当前窗口
    const staffWindows = cloudWindows.filter(w => w.userId === order.staffId);
    if (staffWindows.length === 0) {
      showAlert('无法完成', '该员工当前没有分配的窗口');
      return;
    }
    
    const results: WindowResult[] = staffWindows.map(window => {
      const endBalance = windowBalances[window.id] 
        ? parseFloat(windowBalances[window.id]) * 10000
        : window.goldBalance; // 不填则默认无消耗
      return {
        windowId: window.id,
        endBalance,
        consumed: window.goldBalance - endBalance
      };
    });

    const totalConsumed = results.reduce((sum, r) => sum + r.consumed, 0);
    if (totalConsumed < order.amount) {
      setPendingCompleteOrder({ order, results });
      return;
    }

    onCompleteOrder(order.id, results);
    setOrderWindowBalances(prev => { const n = {...prev}; delete n[order.id]; return n; });
    setOrderSavedWindows(prev => { const n = {...prev}; delete n[order.id]; return n; });
    setActiveOrderId(null);
    showSuccess('操作成功', '订单已完成');
  };

  // 确认完成订单（消耗不足时）
  const confirmCompleteOrder = () => {
    if (pendingCompleteOrder) {
      onCompleteOrder(pendingCompleteOrder.order.id, pendingCompleteOrder.results);
      setOrderWindowBalances(prev => { const n = {...prev}; delete n[pendingCompleteOrder.order.id]; return n; });
      setOrderSavedWindows(prev => { const n = {...prev}; delete n[pendingCompleteOrder.order.id]; return n; });
      setActiveOrderId(null);
      setPendingCompleteOrder(null);
      showSuccess('操作成功', '订单已完成');
    }
  };

  // 处理释放窗口
  const handleReleaseWindow = (windowId: string) => {
    const balance = windowBalances[windowId] || '';
    setReleaseWindowId(windowId);
    setReleaseBalance(balance);
  };

  // 确认释放窗口
  const confirmReleaseWindow = () => {
    if (!releaseWindowId || !activeOrder) return;
    
    const window = cloudWindows.find(w => w.id === releaseWindowId);
    if (!window) return;
    
    // 如果没有填写余额，使用当前余额（无消耗）
    const endBalance = releaseBalance ? parseFloat(releaseBalance) * 10000 : window.goldBalance;
    const staff = staffList.find(s => s.id === activeOrder.staffId);
    const staffName = staff?.name || '未知';
    
    onReleaseOrderWindow(activeOrder.id, releaseWindowId, endBalance, activeOrder.staffId, staffName);
    
    // 从当前窗口余额中移除
    const newBalances = { ...windowBalances };
    delete newBalances[releaseWindowId];
    setWindowBalances(newBalances);
    
    setReleaseWindowId(null);
    setReleaseBalance('');
    showSuccess('操作成功', '窗口已释放，消耗已记录');
  };

  const { showAlert, showSuccess, ModalComponent } = useCyberModal();

  const getStaffWindows = (staffId: string) => cloudWindows.filter(w => w.userId === staffId);
  
  // 获取所有空闲窗口
  const getFreeWindows = () => cloudWindows.filter(w => !w.userId);

  const getMachineName = (machineId: string) => {
    const machine = cloudMachines.find(m => m.id === machineId);
    return machine ? `${machine.phone} (${machine.platform})` : '未知';
  };

  // 当选择员工时，默认选中所有窗口
  useEffect(() => {
    if (orderForm.staffId) {
      const staffWindows = getStaffWindows(orderForm.staffId);
      setSelectedWindowIds(staffWindows.map(w => w.id));
    } else {
      setSelectedWindowIds([]);
    }
  }, [orderForm.staffId, cloudWindows]);

  // 切换窗口选择
  const toggleWindow = (windowId: string) => {
    if (selectedWindowIds.includes(windowId)) {
      setSelectedWindowIds(selectedWindowIds.filter(id => id !== windowId));
    } else {
      setSelectedWindowIds([...selectedWindowIds, windowId]);
    }
  };

  // 分配空闲窗口给当前员工
  const handleAssignFreeWindow = (windowId: string) => {
    const currentCount = getStaffWindows(orderForm.staffId).length;
    if (currentCount >= 10) {
      showAlert('无法添加', '该员工已有10个窗口，无法继续添加');
      return;
    }
    onAssignWindow(windowId, orderForm.staffId);
  };

  // 删除窗口
  const handleDeleteWindow = (windowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteWindow(windowId);
    setSelectedWindowIds(selectedWindowIds.filter(id => id !== windowId));
  };

  // 释放窗口（取消分配给员工）
  const handleUnassignWindow = (windowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAssignWindow(windowId, null);
    setSelectedWindowIds(selectedWindowIds.filter(id => id !== windowId));
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.staffId) {
      showAlert("请选择员工", "请选择一名员工");
      return;
    }
    
    // 检查员工是否已有进行中的订单（暂停中的订单不影响派单）
    const staffPendingOrders = orders.filter(o => o.staffId === orderForm.staffId && o.status === 'pending');
    if (staffPendingOrders.length > 0) {
      showAlert("无法派单", "该员工已有进行中的订单，请等待完成或暂停后再派新单");
      return;
    }
    
    if (selectedWindowIds.length === 0) {
      showAlert("请选择窗口", "请至少选择一个窗口");
      return;
    }

    const selectedWindows = cloudWindows.filter(w => selectedWindowIds.includes(w.id));
    const windowSnapshots: WindowSnapshot[] = selectedWindows.map(w => ({
      windowId: w.id,
      machineId: w.machineId,
      windowNumber: w.windowNumber,
      machineName: getMachineName(w.machineId),
      startBalance: w.goldBalance
    }));

    const amount = parseFloat(orderForm.amount);
    const totalPrice = parseFloat(orderForm.totalPrice);
    // 自动计算单价：总价 / (金额/1000) = 元/千万
    const unitPrice = totalPrice / (amount / 1000);

    onAddOrder({
      date: orderForm.date,
      staffId: orderForm.staffId,
      amount,
      loss: 0,
      feePercent: settings.defaultFeePercent, // 使用设置中的手续费
      unitPrice: isNaN(unitPrice) ? settings.orderUnitPrice : unitPrice,
      status: 'pending'
    }, windowSnapshots);
    
    setOrderForm({ ...orderForm, amount: '', totalPrice: '' });
    setSelectedWindowIds([]);
    showSuccess("派单成功", "订单已派发，员工可在员工端完成订单");
  };

  const staffWindows = orderForm.staffId ? getStaffWindows(orderForm.staffId) : [];
  const freeWindows = getFreeWindows();
  const totalSelectedGold = cloudWindows
    .filter(w => selectedWindowIds.includes(w.id))
    .reduce((sum, w) => sum + w.goldBalance, 0);
  
  // 当前员工所有窗口总额
  const totalStaffWindowsGold = staffWindows.reduce((sum, w) => sum + w.goldBalance, 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="派单中心" icon={Send} />

      {/* 暂停中的订单 */}
      {pausedOrders.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-orange-400">
            <Pause size={20} />
            <h2 className="font-mono text-lg">暂停中的订单 ({pausedOrders.length})</h2>
          </div>
          <div className="space-y-3">
            {pausedOrders.map(order => (
              <div key={order.id} className="bg-orange-500/10 border border-orange-500/30 p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-lg">{order.date}</div>
                    <div className="text-sm text-gray-400">
                      员工: <span className="text-white">{getStaffName(order.staffId)}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      总金额: <span className="text-cyber-accent">{order.amount}</span> 万 | 
                      已完成: <span className="text-green-400">{order.completedAmount || 0}</span> 万 | 
                      剩余: <span className="text-orange-400">{order.amount - (order.completedAmount || 0)}</span> 万
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleResumeToOriginal(order.id)}
                      className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-sm hover:bg-green-500/30 active:bg-green-500/50 flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={14} /> 恢复
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferOrderId(order.id)}
                      className="px-3 py-1 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm hover:bg-cyber-primary/30 active:bg-cyber-primary/50 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight size={14} /> 转派
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 转派弹窗 */}
      {transferOrderId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-mono text-cyber-primary mb-4">转派订单</h3>
            <p className="text-gray-400 text-sm mb-4">选择要接手的员工：</p>
            <select
              value={transferStaffId}
              onChange={e => setTransferStaffId(e.target.value)}
              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 mb-4"
            >
              <option value="">选择员工...</option>
              {staffList.filter(s => s.role === 'staff').map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setTransferOrderId(null); setTransferStaffId(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <button onClick={handleTransferOrder} disabled={!transferStaffId} className="flex-1 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 disabled:opacity-50">
                确认转派
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 进行中的订单 */}
      {pendingOrders.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-yellow-400">
            <Clock size={20} />
            <h2 className="font-mono text-lg">进行中的订单 ({pendingOrders.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingOrders.map(order => {
              const staffCurrentWindows = cloudWindows.filter(w => w.userId === order.staffId);
              return (
                <div key={order.id} className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-mono text-lg">{order.date}</div>
                      <div className="text-sm text-gray-400">
                        员工: <span className="text-white">{getStaffName(order.staffId)}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        订单金额: <span className="text-cyber-accent">{order.amount}</span> 万 | 
                        当前窗口数: <span className="text-cyber-primary">{staffCurrentWindows.length}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteOrderId(order.id)}
                        className="px-3 py-2 bg-red-500/20 border border-red-500/50 text-red-400 text-sm hover:bg-red-500/30 flex items-center gap-1"
                      >
                        <Trash2 size={14} /> 删除
                      </button>
                      <CyberButton onClick={() => {
                        setActiveOrderId(order.id);
                        // 初始化窗口余额为员工当前窗口
                        const balances: Record<string, string> = {};
                        staffCurrentWindows.forEach(w => {
                          balances[w.id] = '';
                        });
                        if (!orderWindowBalances[order.id]) {
                          setOrderWindowBalances(prev => ({ ...prev, [order.id]: balances }));
                        }
                      }}>
                        完成订单
                      </CyberButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 完成订单弹窗 - 使用员工当前窗口 */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-mono text-cyber-primary mb-4">完成订单 - {activeOrder.date}</h3>
            <div className="mb-4 p-3 bg-black/30 rounded flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">订单金额</div>
                <div className="text-2xl font-mono text-cyber-accent">{activeOrder.amount} 万</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">员工</div>
                <div className="text-lg font-mono text-white">{getStaffName(activeOrder.staffId)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">当前窗口数</div>
                <div className="text-lg font-mono text-cyber-primary">{cloudWindows.filter(w => w.userId === activeOrder.staffId).length}</div>
              </div>
            </div>

            {/* 已释放的窗口（partialResults） */}
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
              {/* 使用员工当前窗口而不是 windowSnapshots */}
              {cloudWindows.filter(w => w.userId === activeOrder.staffId).map(window => {
                const inputValue = windowBalances[window.id] || '';
                const startBalance = window.goldBalance; // 当前余额作为开始余额
                const endBalance = inputValue ? parseFloat(inputValue) * 10000 : startBalance;
                const consumed = startBalance - endBalance;
                return (
                  <div key={window.id} className={`bg-black/30 p-3 rounded border ${inputValue === '0' ? 'border-red-500/50' : 'border-cyber-primary/20'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-mono">#{window.windowNumber}</span>
                        <span className="text-xs text-gray-500 ml-2">{getMachineName(window.machineId)}</span>
                        {inputValue === '0' && <span className="text-xs text-red-400 ml-2">✓ 已消耗完</span>}
                      </div>
                      <div className="text-xs text-gray-400">当前余额: {formatWan(startBalance)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`${toWan(startBalance)} 万 (当前余额)`}
                        value={inputValue}
                        onChange={e => setWindowBalances({...windowBalances, [window.id]: e.target.value})}
                        className="flex-1 bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 placeholder:text-gray-600 placeholder:opacity-50"
                      />
                      <div className={`text-sm font-mono min-w-[70px] ${consumed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatWan(consumed)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const startBalanceWan = String(startBalance / 10000);
                          setWindowBalances({...windowBalances, [window.id]: startBalanceWan});
                        }}
                        className={`px-2 py-2 text-xs font-mono border ${
                          inputValue === String(startBalance / 10000)
                            ? 'bg-green-500/20 border-green-500 text-green-400' 
                            : 'border-green-500 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        未使用
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWindowBalances({...windowBalances, [window.id]: '0'});
                        }}
                        className={`px-2 py-2 text-xs font-mono border ${
                          inputValue === '0'
                            ? 'bg-red-500/20 border-red-500 text-red-400' 
                            : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                        }`}
                      >
                        消耗完
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReleaseWindow(window.id)}
                        className="px-2 py-2 text-xs font-mono border border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 flex items-center gap-1"
                      >
                        <Unlock size={12} /> 释放
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 汇总 - 使用员工当前窗口计算 */}
            <div className="mb-6 p-3 bg-cyber-primary/10 rounded border border-cyber-primary/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-400">总消耗 (万)</div>
                  <div className="font-mono text-lg">
                    {toWan(
                      (cloudWindows.filter(w => w.userId === activeOrder.staffId).reduce((sum, w) => {
                        const end = windowBalances[w.id] 
                          ? parseFloat(windowBalances[w.id]) * 10000
                          : w.goldBalance;
                        return sum + (w.goldBalance - end);
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
                      const currentConsumed = cloudWindows.filter(w => w.userId === activeOrder.staffId).reduce((sum, w) => {
                        const end = windowBalances[w.id] 
                          ? parseFloat(windowBalances[w.id]) * 10000
                          : w.goldBalance;
                        return sum + (w.goldBalance - end);
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
              <button type="button" onClick={() => setActiveOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <CyberButton onClick={() => handleCompleteOrder(activeOrder)} className="flex-1">
                <CheckCircle size={16} className="mr-2" /> 确认完成
              </CyberButton>
            </div>
          </div>
        </div>
      )}

      {/* 确认完成弹窗（消耗不足时） */}
      {pendingCompleteOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-cyber-panel border border-yellow-500/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-mono text-yellow-400 mb-4">确认完成</h3>
            <p className="text-gray-400 mb-4">
              总消耗量小于订单金额，确定要完成此订单吗？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingCompleteOrder(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <button onClick={confirmCompleteOrder} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30">
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 释放窗口确认弹窗 - 使用当前窗口信息 */}
      {releaseWindowId && activeOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-cyber-panel border border-yellow-500/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-mono text-yellow-400 mb-4 flex items-center gap-2">
              <Unlock size={20} /> 释放窗口
            </h3>
            {(() => {
              const window = cloudWindows.find(w => w.id === releaseWindowId);
              if (!window) return null;
              const endBalance = releaseBalance ? parseFloat(releaseBalance) * 10000 : window.goldBalance;
              const consumed = window.goldBalance - endBalance;
              return (
                <>
                  <div className="mb-4 p-3 bg-black/30 rounded">
                    <div className="text-sm text-gray-400">窗口: <span className="text-white">#{window.windowNumber}</span></div>
                    <div className="text-sm text-gray-400">当前余额: <span className="text-cyber-accent">{formatWan(window.goldBalance)}</span></div>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block">结束余额（万）</label>
                    <input
                      type="number"
                      value={releaseBalance}
                      onChange={e => setReleaseBalance(e.target.value)}
                      placeholder={`${toWan(window.goldBalance)} (不填则无消耗)`}
                      className="w-full bg-black/40 border border-yellow-500/30 text-cyber-text font-mono px-3 py-2"
                    />
                  </div>
                  <div className="mb-4 p-3 bg-yellow-500/10 rounded">
                    <div className="text-sm">
                      消耗: <span className={consumed > 0 ? 'text-red-400' : 'text-green-400'}>{formatWan(consumed)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      释放后窗口将变为空闲，消耗将记录到员工 {getStaffName(activeOrder.staffId)}
                    </div>
                  </div>
                </>
              );
            })()}
            <div className="flex gap-3">
              <button onClick={() => { setReleaseWindowId(null); setReleaseBalance(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <button onClick={confirmReleaseWindow} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30">
                确认释放
              </button>
            </div>
          </div>
        </div>
      )}
      
      <GlassCard className="relative overflow-hidden">
        {/* 发光效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyber-primary/5 via-cyber-accent/10 to-cyber-primary/5 animate-pulse pointer-events-none" />
        
        <form onSubmit={handleOrderSubmit} className="relative z-10 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CyberInput
              label="日期"
              type="date"
              value={orderForm.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm({...orderForm, date: e.target.value})}
            />
            <CyberInput
              label="订单金额 (万)"
              type="number"
              step="0.01"
              value={orderForm.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm({...orderForm, amount: e.target.value})}
              placeholder="输入金额"
              required
            />
            <CyberInput
              label="订单总价 (元)"
              type="number"
              step="0.01"
              value={orderForm.totalPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm({...orderForm, totalPrice: e.target.value})}
              placeholder="输入总价"
              required
            />
            {/* 自动计算的单价（只读） */}
            <div>
              <label className="block text-cyber-primary text-xs font-mono mb-2 uppercase tracking-wider">{`> 单价 (元/千万)`}</label>
              <div className="bg-black/40 border border-cyber-primary/30 text-cyber-accent font-mono px-3 py-2 h-[42px] flex items-center">
                {orderForm.amount && orderForm.totalPrice 
                  ? (parseFloat(orderForm.totalPrice) / (parseFloat(orderForm.amount) / 1000)).toFixed(2)
                  : '--'}
              </div>
            </div>
          </div>

          {/* 员工选择 */}
          <div>
            <label className="block text-cyber-primary text-xs font-mono mb-2 uppercase tracking-wider">{`> 选择员工`}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {staffList.filter(s => s.role === 'staff').map(staff => {
                const windows = getStaffWindows(staff.id);
                const windowsGold = windows.reduce((sum, w) => sum + w.goldBalance, 0);
                const isSelected = orderForm.staffId === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setOrderForm({...orderForm, staffId: isSelected ? '' : staff.id})}
                    className={`p-3 border-2 rounded transition-all ${
                      isSelected 
                        ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent shadow-[0_0_15px_rgba(255,200,0,0.3)]' 
                        : 'border-cyber-primary/30 bg-black/30 text-gray-400 hover:border-cyber-primary/60'
                    }`}
                  >
                    <div className="font-mono font-bold">{staff.name}</div>
                    <div className="text-xs mt-1">{windows.length} 个窗口</div>
                    <div className="text-xs text-cyber-accent">{formatWan(windowsGold)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 窗口管理区域 */}
          {orderForm.staffId && (
            <div className="border border-cyber-accent/30 rounded p-4">
              {/* 标题栏 */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-cyber-accent font-mono text-sm uppercase tracking-wider">
                    窗口管理
                  </div>
                  <div className="text-lg font-mono">
                    窗口总额: <span className="text-cyber-accent font-bold">{formatWan(totalStaffWindowsGold)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400">
                    已选 <span className="text-cyber-accent font-bold">{selectedWindowIds.length}</span> / {staffWindows.length} 个窗口
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddWindow(!showAddWindow)}
                    className="px-3 py-1 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm flex items-center gap-1 hover:bg-cyber-primary/30"
                  >
                    <Plus size={14} /> 分配窗口
                  </button>
                </div>
              </div>

              {/* 分配空闲窗口 */}
              {showAddWindow && (
                <div className="mb-4 p-4 bg-black/40 border border-cyber-primary/30 rounded">
                  <div className="text-sm text-cyber-primary mb-3">从空闲窗口中选择分配给该员工</div>
                  {freeWindows.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {freeWindows.map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleAssignFreeWindow(w.id)}
                          className="px-4 py-2 bg-green-500/10 border border-green-500/50 text-green-400 text-sm rounded hover:bg-green-500/20 flex items-center gap-2"
                        >
                          <Circle size={10} className="fill-green-400" />
                          <span className="font-bold">#{w.windowNumber}</span>
                          <span className="text-gray-400">-</span>
                          <span>{getMachineName(w.machineId)}</span>
                          <span className="text-cyber-accent font-mono">({formatWan(w.goldBalance)})</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      暂无空闲窗口，请先在"云机"页面添加窗口
                    </div>
                  )}
                </div>
              )}
              
              {/* 窗口列表 */}
              {staffWindows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {staffWindows.map(window => {
                    const isSelected = selectedWindowIds.includes(window.id);
                    return (
                      <div
                        key={window.id}
                        className={`p-3 border-2 rounded transition-all relative group ${
                          isSelected
                            ? 'border-green-500 bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                            : 'border-gray-600 bg-black/30 hover:border-gray-500'
                        }`}
                      >
                        {/* 顶部：窗口号和选择框 */}
                        <div 
                          className="flex items-center justify-between mb-2 cursor-pointer"
                          onClick={() => toggleWindow(window.id)}
                        >
                          <span className="font-mono text-sm">#{window.windowNumber}</span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-green-500 bg-green-500' : 'border-gray-500'
                          }`}>
                            {isSelected && <Check size={14} className="text-black" />}
                          </div>
                        </div>
                        {/* 中间：云机信息和余额 */}
                        <div 
                          className="cursor-pointer"
                          onClick={() => toggleWindow(window.id)}
                        >
                          <div className="text-xs text-gray-400 mb-1">{getMachineName(window.machineId)}</div>
                          <div className="text-cyber-accent font-mono mb-3">{formatWan(window.goldBalance)}</div>
                        </div>
                        {/* 底部：操作按钮 - 居中显示 */}
                        <div className="flex justify-center gap-2 pt-2 border-t border-gray-700">
                          <button
                            type="button"
                            onClick={(e) => handleUnassignWindow(window.id, e)}
                            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 rounded text-xs border border-yellow-500/50"
                          >
                            释放
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWindow(window.id, e)}
                            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded border border-red-500/50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-600 rounded">
                  该员工暂无窗口，请点击上方"添加窗口"按钮
                </div>
              )}

              {/* 底部统计 */}
              {staffWindows.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cyber-accent/20 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedWindowIds(staffWindows.map(w => w.id))}
                    className="text-xs text-cyber-primary hover:text-cyber-accent"
                  >
                    全选
                  </button>
                  <div className="text-cyber-accent font-mono">
                    已选: <span className="text-xl font-bold">{formatWan(totalSelectedGold)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedWindowIds([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!orderForm.staffId || selectedWindowIds.length === 0 || !orderForm.amount}
              className="px-8 py-4 bg-gradient-to-r from-cyber-primary/20 to-cyber-accent/20 
                border-2 border-cyber-accent text-cyber-accent font-mono font-bold uppercase text-lg
                hover:from-cyber-primary/30 hover:to-cyber-accent/30 
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-[0_0_20px_rgba(255,200,0,0.3)] hover:shadow-[0_0_30px_rgba(255,200,0,0.5)]
                flex items-center gap-3"
            >
              <Send size={20} />
              派发订单
            </button>
          </div>
        </form>
      </GlassCard>

      {/* 通用弹窗 */}
      <ModalComponent />

      {/* 删除订单确认弹窗 */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-cyber-panel border border-red-500/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-mono text-red-400 mb-4 flex items-center gap-2">
              <Trash2 size={20} /> 删除订单
            </h3>
            <p className="text-gray-400 mb-4">
              确定要删除这个订单吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <button 
                onClick={() => {
                  onDeleteOrder(deleteOrderId);
                  setDeleteOrderId(null);
                  showSuccess('操作成功', '订单已删除');
                }} 
                className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
