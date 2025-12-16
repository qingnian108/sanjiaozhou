import React, { useState } from 'react';
import { Plus, Trash2, Monitor, Server, Circle, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { CloudMachine, CloudWindow, Staff, PurchaseRecord } from '../types';
import { CyberCard, CyberInput, CyberButton } from './CyberUI';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface NewWindow {
  windowNumber: string;
  goldBalance: string;
}

interface Props {
  machines: CloudMachine[];
  windows: CloudWindow[];
  staffList: Staff[];
  onAddMachine: (machine: Omit<CloudMachine, 'id'>) => Promise<string>;
  onDeleteMachine: (id: string) => void;
  onAddWindow: (window: Omit<CloudWindow, 'id'>) => void;
  onDeleteWindow: (id: string) => void;
  onAssignWindow: (windowId: string, userId: string | null) => void;
  onUpdateWindowGold: (windowId: string, goldBalance: number) => void;
  onAddPurchase: (record: Omit<PurchaseRecord, 'id'>) => void;
}

export const CloudMachines: React.FC<Props> = ({
  machines,
  windows,
  staffList,
  onAddMachine,
  onDeleteMachine,
  onAddWindow,
  onDeleteWindow,
  onAssignWindow,
  onUpdateWindowGold,
  onAddPurchase
}) => {
  const [activeTab, setActiveTab] = useState<'machines' | 'purchase'>('machines');
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
  const [windowNumber, setWindowNumber] = useState('');
  const [windowGold, setWindowGold] = useState('');
  
  // 云机采购表单
  const today = new Date().toISOString().split('T')[0];
  const [purchasePhone, setPurchasePhone] = useState('');
  const [purchasePlatform, setPurchasePlatform] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseWindows, setPurchaseWindows] = useState<NewWindow[]>([{ windowNumber: '', goldBalance: '' }]);

  // 添加窗口行
  const addWindowRow = () => {
    setPurchaseWindows([...purchaseWindows, { windowNumber: '', goldBalance: '' }]);
  };

  // 删除窗口行
  const removeWindowRow = (index: number) => {
    if (purchaseWindows.length > 1) {
      setPurchaseWindows(purchaseWindows.filter((_, i) => i !== index));
    }
  };

  // 更新窗口行
  const updateWindowRow = (index: number, field: keyof NewWindow, value: string) => {
    const updated = [...purchaseWindows];
    updated[index][field] = value;
    setPurchaseWindows(updated);
  };

  // 计算总哈佛币
  const totalGoldInPurchase = purchaseWindows.reduce((sum, w) => sum + (parseFloat(w.goldBalance) || 0), 0);

  // 提交云机采购
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePhone || !purchasePlatform) {
      alert('请填写手机号和平台');
      return;
    }
    
    const validWindows = purchaseWindows.filter(w => w.windowNumber && w.goldBalance);
    if (validWindows.length === 0) {
      alert('请至少添加一个窗口');
      return;
    }

    // 创建云机
    const machineId = await onAddMachine({ phone: purchasePhone, platform: purchasePlatform });
    
    // 创建窗口
    for (const w of validWindows) {
      await onAddWindow({
        machineId,
        windowNumber: w.windowNumber,
        goldBalance: parseFloat(w.goldBalance) || 0,
        userId: null
      });
    }

    // 记录采购
    if (purchaseCost) {
      onAddPurchase({
        date: today,
        amount: totalGoldInPurchase,
        cost: parseFloat(purchaseCost) || 0
      });
    }

    // 重置表单
    setPurchasePhone('');
    setPurchasePlatform('');
    setPurchaseCost('');
    setPurchaseWindows([{ windowNumber: '', goldBalance: '' }]);
    setActiveTab('machines');
    alert('云机采购成功！');
  };

  const handleAddWindow = (machineId: string) => {
    if (!windowNumber) return;
    onAddWindow({ machineId, windowNumber, goldBalance: parseFloat(windowGold) || 0, userId: null });
    setWindowNumber('');
    setWindowGold('');
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return null;
    return staffList.find(s => s.id === staffId)?.name || '未知';
  };

  const getMachineWindows = (machineId: string) => windows.filter(w => w.machineId === machineId);
  const getMachineTotalGold = (machineId: string) => getMachineWindows(machineId).reduce((sum, w) => sum + w.goldBalance, 0);
  const getStaffWindowCount = (staffId: string) => windows.filter(w => w.userId === staffId).length;

  return (
    <div className="space-y-6">
      {/* Tab 切换 */}
      <div className="flex gap-4">
        <button onClick={() => setActiveTab('machines')}
          className={`flex-1 p-4 border-b-2 transition-all font-mono uppercase font-bold tracking-widest flex items-center justify-center gap-3
            ${activeTab === 'machines' ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary' : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
          <Monitor size={20} /> 云机管理
        </button>
        <button onClick={() => setActiveTab('purchase')}
          className={`flex-1 p-4 border-b-2 transition-all font-mono uppercase font-bold tracking-widest flex items-center justify-center gap-3
            ${activeTab === 'purchase' ? 'bg-cyber-accent/10 border-cyber-accent text-cyber-accent' : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
          <ShoppingCart size={20} /> 云机采购
        </button>
      </div>

      {/* 云机采购 */}
      {activeTab === 'purchase' && (
        <CyberCard title="云机采购" icon={<ShoppingCart size={20} />}>
          <form onSubmit={handlePurchaseSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CyberInput label="手机号" type="text" value={purchasePhone} placeholder="输入手机号"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePhone(e.target.value)} required />
              <CyberInput label="平台" type="text" value={purchasePlatform} placeholder="输入平台名称"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePlatform(e.target.value)} required />
              <CyberInput label="采购总价 (元)" type="number" step="0.01" value={purchaseCost} placeholder="输入总价"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchaseCost(e.target.value)} />
            </div>

            <div className="border border-cyber-accent/30 p-4 rounded">
              <div className="flex justify-between items-center mb-4">
                <div className="text-cyber-accent font-mono">窗口列表</div>
                <button type="button" onClick={addWindowRow} className="px-3 py-1 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent text-sm flex items-center gap-1">
                  <Plus size={14} /> 添加窗口
                </button>
              </div>
              
              <div className="space-y-3">
                {purchaseWindows.map((w, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-cyber-primary text-xs font-mono mb-1">窗口号</label>
                      <input type="text" value={w.windowNumber} placeholder={`窗口 ${index + 1}`}
                        onChange={e => updateWindowRow(index, 'windowNumber', e.target.value)}
                        className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-cyber-primary text-xs font-mono mb-1">哈佛币余额</label>
                      <input type="number" value={w.goldBalance} placeholder="输入哈佛币"
                        onChange={e => updateWindowRow(index, 'goldBalance', e.target.value)}
                        className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                    </div>
                    {purchaseWindows.length > 1 && (
                      <button type="button" onClick={() => removeWindowRow(index)} className="p-2 text-red-500 hover:text-red-400">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-cyber-accent/20 flex justify-between items-center">
                <div className="text-sm text-gray-400">共 {purchaseWindows.filter(w => w.windowNumber).length} 个窗口</div>
                <div className="text-cyber-accent font-mono text-lg">总哈佛币: {formatWan(totalGoldInPurchase)}</div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-cyber-accent/20 border-2 border-cyber-accent text-cyber-accent font-mono font-bold uppercase
                hover:bg-cyber-accent hover:text-black transition-all shadow-[0_0_15px_rgba(255,200,0,0.2)] flex items-center gap-2">
                <ShoppingCart size={18} /> 确认采购
              </button>
            </div>
          </form>
        </CyberCard>
      )}


      {/* 云机管理 */}
      {activeTab === 'machines' && (
        <CyberCard title="云机列表" icon={<Server size={20} />}>
          {machines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无云机，请先采购</p>
          ) : (
            <div className="space-y-4">
              {machines.map(machine => {
                const machineWindows = getMachineWindows(machine.id);
                const totalGold = getMachineTotalGold(machine.id);
                const occupiedCount = machineWindows.filter(w => w.userId).length;
                const isExpanded = expandedMachine === machine.id;

                return (
                  <div key={machine.id} className="border border-cyber-primary/20 rounded overflow-hidden">
                    <div className="flex justify-between items-center p-4 bg-cyber-panel/50 cursor-pointer hover:bg-cyber-panel/80"
                      onClick={() => setExpandedMachine(isExpanded ? null : machine.id)}>
                      <div className="flex items-center gap-4">
                        <Server className="text-cyber-primary" size={24} />
                        <div>
                          <div className="font-mono text-lg">{machine.phone}</div>
                          <div className="text-sm text-gray-400">{machine.platform}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-cyber-accent font-mono text-xl">{formatWan(totalGold)}</div>
                          <div className="text-xs text-gray-500">总哈佛币</div>
                        </div>
                        <div className="text-sm">
                          <span className="text-green-400">{machineWindows.length - occupiedCount}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-yellow-400">{occupiedCount}</span>
                          <div className="text-xs text-gray-500">空闲/占用</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteMachine(machine.id); }} className="text-red-500 hover:text-red-400 p-1">
                          <Trash2 size={18} />
                        </button>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-cyber-primary/20">
                        <div className="flex gap-4 mb-4 items-end">
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 窗口号`}</label>
                            <input type="text" value={windowNumber} onChange={e => setWindowNumber(e.target.value)} placeholder="输入窗口号"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 哈佛币余额`}</label>
                            <input type="number" value={windowGold} onChange={e => setWindowGold(e.target.value)} placeholder="输入哈佛币"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <button onClick={() => handleAddWindow(machine.id)} disabled={!windowNumber}
                            className="px-4 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm disabled:opacity-50">
                            <Plus size={16} />
                          </button>
                        </div>

                        {machineWindows.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">暂无窗口</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {machineWindows.map(window => (
                              <div key={window.id} className={`p-3 rounded border ${window.userId ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Circle size={8} className={window.userId ? 'text-yellow-400 fill-yellow-400' : 'text-green-400 fill-green-400'} />
                                    <span className="font-mono">#{window.windowNumber}</span>
                                  </div>
                                  <button onClick={() => onDeleteWindow(window.id)} className="text-red-500/60 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-gray-400">哈佛币:</span>
                                  <input type="number" value={window.goldBalance} onChange={e => onUpdateWindowGold(window.id, parseFloat(e.target.value) || 0)}
                                    className="flex-1 bg-black/40 border border-cyber-primary/30 text-cyber-accent font-mono px-2 py-1 text-sm w-20" />
                                </div>
                                {window.userId ? (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-yellow-300">{getStaffName(window.userId)}</span>
                                    <button onClick={() => onAssignWindow(window.id, null)} className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-600 rounded">释放</button>
                                  </div>
                                ) : (
                                  <select className="w-full bg-black/40 border border-cyber-primary/30 text-xs p-1 rounded" value=""
                                    onChange={e => { if (e.target.value) { const staffId = e.target.value; if (getStaffWindowCount(staffId) >= 4) { alert('该员工已使用4个窗口'); return; } onAssignWindow(window.id, staffId); } }}>
                                    <option value="">分配给...</option>
                                    {staffList.map(s => (<option key={s.id} value={s.id} disabled={getStaffWindowCount(s.id) >= 4}>{s.name} ({getStaffWindowCount(s.id)}/4)</option>))}
                                  </select>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CyberCard>
      )}
    </div>
  );
};
