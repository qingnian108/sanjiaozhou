import React, { useState, useEffect } from 'react';
import { Send, Check, Plus, Trash2, Circle } from 'lucide-react';
import { GlassCard, CyberInput, SectionHeader } from './CyberUI';
import { OrderRecord, Settings, Staff, CloudWindow, CloudMachine, WindowSnapshot } from '../types';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface Props {
  onAddOrder: (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => void;
  settings: Settings;
  staffList: Staff[];
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  onAddWindow: (window: Omit<CloudWindow, 'id'>) => void;
  onDeleteWindow: (id: string) => void;
  onAssignWindow: (windowId: string, userId: string | null) => void;
}

export const Dispatch: React.FC<Props> = ({ 
  onAddOrder, 
  settings, 
  staffList,
  cloudWindows,
  cloudMachines,
  onAddWindow,
  onDeleteWindow,
  onAssignWindow
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
  
  // 添加窗口表单
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [newWindowMachineId, setNewWindowMachineId] = useState('');
  const [newWindowNumber, setNewWindowNumber] = useState('');
  const [newWindowGold, setNewWindowGold] = useState('');

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

  // 添加窗口给当前员工
  const handleAddWindowToStaff = () => {
    if (!newWindowMachineId || !newWindowNumber) {
      alert('请选择云机并填写窗口号');
      return;
    }
    
    // 检查员工窗口数量限制
    const currentCount = getStaffWindows(orderForm.staffId).length;
    if (currentCount >= 4) {
      alert('该员工已有4个窗口，无法继续添加');
      return;
    }

    onAddWindow({
      machineId: newWindowMachineId,
      windowNumber: newWindowNumber,
      goldBalance: parseFloat(newWindowGold) || 0,
      userId: orderForm.staffId
    });

    setNewWindowMachineId('');
    setNewWindowNumber('');
    setNewWindowGold('');
    setShowAddWindow(false);
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
                    <Plus size={14} /> 添加窗口
                  </button>
                </div>
              </div>

              {/* 添加窗口表单 */}
              {showAddWindow && (
                <div className="mb-4 p-4 bg-black/40 border border-cyber-primary/30 rounded">
                  <div className="text-sm text-cyber-primary mb-3">添加新窗口给该员工</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">选择云机</label>
                      <select
                        value={newWindowMachineId}
                        onChange={e => setNewWindowMachineId(e.target.value)}
                        className="w-full bg-black/60 border border-cyber-primary/30 text-cyber-text px-3 py-2 text-sm"
                      >
                        <option value="">选择云机...</option>
                        {cloudMachines.map(m => (
                          <option key={m.id} value={m.id}>{m.phone} ({m.platform})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">窗口号</label>
                      <input
                        type="text"
                        value={newWindowNumber}
                        onChange={e => setNewWindowNumber(e.target.value)}
                        placeholder="输入窗口号"
                        className="w-full bg-black/60 border border-cyber-primary/30 text-cyber-text px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">哈佛币余额</label>
                      <input
                        type="number"
                        value={newWindowGold}
                        onChange={e => setNewWindowGold(e.target.value)}
                        placeholder="输入哈佛币"
                        className="w-full bg-black/60 border border-cyber-primary/30 text-cyber-text px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWindowToStaff}
                      className="px-4 py-2 bg-green-500/20 border border-green-500 text-green-400 text-sm hover:bg-green-500/30"
                    >
                      确认添加
                    </button>
                  </div>
                  
                  {/* 空闲窗口快速分配 */}
                  {freeWindows.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-3">或从空闲窗口中选择:</div>
                      <div className="flex flex-wrap gap-3">
                        {freeWindows.slice(0, 8).map(w => (
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
                        {freeWindows.length > 8 && (
                          <span className="text-sm text-gray-500 self-center">还有 {freeWindows.length - 8} 个...</span>
                        )}
                      </div>
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
