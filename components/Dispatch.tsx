import React, { useState, useEffect, useMemo } from 'react';
import { Send, Check, Plus, Trash2, Circle, Pause, Play, ArrowRight } from 'lucide-react';
import { GlassCard, CyberInput, SectionHeader } from './CyberUI';
import { OrderRecord, Settings, Staff, CloudWindow, CloudMachine, WindowSnapshot } from '../types';
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
  onResumeOrder: (orderId: string, newStaffId?: string) => void;
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
  onResumeOrder
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [orderForm, setOrderForm] = useState({
    date: today,
    staffId: '',
    amount: '',
    feePercent: settings.defaultFeePercent.toString(),
    unitPrice: settings.orderUnitPrice.toString()
  });

  // 选中的窗口ID列表
  const [selectedWindowIds, setSelectedWindowIds] = useState<string[]>([]);
  
  // 显示分配窗口面板
  const [showAddWindow, setShowAddWindow] = useState(false);
  
  // 转派订单
  const [transferOrderId, setTransferOrderId] = useState<string | null>(null);
  const [transferStaffId, setTransferStaffId] = useState('');

  // 暂停中的订单
  const pausedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'paused');
  }, [orders]);

  // 获取员工名称
  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || '未知';
  };

  // 恢复订单给原员工
  const handleResumeToOriginal = (orderId: string) => {
    onResumeOrder(orderId);
  };

  // 转派订单给其他员工
  const handleTransferOrder = () => {
    if (!transferOrderId || !transferStaffId) return;
    onResumeOrder(transferOrderId, transferStaffId);
    setTransferOrderId(null);
    setTransferStaffId('');
  };

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
    if (currentCount >= 4) {
      alert('该员工已有4个窗口，无法继续添加');
      return;
    }
    onAssignWindow(windowId, orderForm.staffId);
  };

  // 删除窗口
  const handleDeleteWindow = (windowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确认删除该窗口？')) {
      onDeleteWindow(windowId);
      setSelectedWindowIds(selectedWindowIds.filter(id => id !== windowId));
    }
  };

  // 释放窗口（取消分配）
  const handleReleaseWindow = (windowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAssignWindow(windowId, null);
    setSelectedWindowIds(selectedWindowIds.filter(id => id !== windowId));
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.staffId) {
      alert("请选择一名员工");
      return;
    }
    
    if (selectedWindowIds.length === 0) {
      alert("请至少选择一个窗口");
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

    onAddOrder({
      date: orderForm.date,
      staffId: orderForm.staffId,
      amount: parseFloat(orderForm.amount),
      loss: 0,
      feePercent: parseFloat(orderForm.feePercent),
      unitPrice: parseFloat(orderForm.unitPrice),
      status: 'pending'
    }, windowSnapshots);
    
    setOrderForm({ ...orderForm, amount: '' });
    setSelectedWindowIds([]);
    alert("订单已派发，员工可在员工端完成订单");
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
                      onClick={() => handleResumeToOriginal(order.id)}
                      className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-sm hover:bg-green-500/30 flex items-center gap-1"
                    >
                      <Play size={14} /> 恢复
                    </button>
                    <button
                      onClick={() => setTransferOrderId(order.id)}
                      className="px-3 py-1 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm hover:bg-cyber-primary/30 flex items-center gap-1"
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
      
      <GlassCard className="relative overflow-hidden">
        {/* 发光效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyber-primary/5 via-cyber-accent/10 to-cyber-primary/5 animate-pulse pointer-events-none" />
        
        <form onSubmit={handleOrderSubmit} className="relative z-10 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              label="手续费 %"
              type="number"
              step="0.1"
              value={orderForm.feePercent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm({...orderForm, feePercent: e.target.value})}
            />
            <CyberInput
              label="单价 (元/千万)"
              type="number"
              step="0.01"
              value={orderForm.unitPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm({...orderForm, unitPrice: e.target.value})}
            />
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
                        onClick={() => toggleWindow(window.id)}
                        className={`p-3 border-2 rounded cursor-pointer transition-all relative group ${
                          isSelected
                            ? 'border-green-500 bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                            : 'border-gray-600 bg-black/30 hover:border-gray-500'
                        }`}
                      >
                        {/* 操作按钮 */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleReleaseWindow(window.id, e)}
                            className="p-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 rounded text-xs"
                            title="释放窗口"
                          >
                            释放
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWindow(window.id, e)}
                            className="p-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded"
                            title="删除窗口"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">#{window.windowNumber}</span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-green-500 bg-green-500' : 'border-gray-500'
                          }`}>
                            {isSelected && <Check size={14} className="text-black" />}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mb-1">{getMachineName(window.machineId)}</div>
                        <div className="text-cyber-accent font-mono">{formatWan(window.goldBalance)}</div>
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
    </div>
  );
};
