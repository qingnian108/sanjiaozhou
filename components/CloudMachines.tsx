import React, { useState } from 'react';
import { Plus, Trash2, Monitor, Server, Circle, ChevronDown, ChevronUp, ShoppingCart, Bell, Coins, FileText, Edit2, Save, X } from 'lucide-react';
import { CloudMachine, CloudWindow, Staff, PurchaseRecord, WindowRequest } from '../types';
import { CyberCard, CyberInput, CyberButton, useCyberModal } from './CyberUI';
import { formatChineseNumber, formatWan, toWan } from '../utils';

interface NewWindow {
  windowNumber: string;
  goldBalance: string;
}

interface Props {
  machines: CloudMachine[];
  windows: CloudWindow[];
  staffList: Staff[];
  windowRequests: WindowRequest[];
  purchases: PurchaseRecord[];
  adminId: string;
  onAddMachine: (machine: Omit<CloudMachine, 'id'>) => Promise<string>;
  onBatchPurchase: (machine: Omit<CloudMachine, 'id'>, windows: { windowNumber: string; goldBalance: number }[], purchase?: Omit<PurchaseRecord, 'id'>) => Promise<string>;
  onDeleteMachine: (id: string) => void;
  onUpdateMachine: (id: string, data: Partial<CloudMachine>) => void;
  onAddWindow: (window: Omit<CloudWindow, 'id'>) => void;
  onDeleteWindow: (id: string) => void;
  onAssignWindow: (windowId: string, userId: string | null) => void;
  onUpdateWindowGold: (windowId: string, goldBalance: number) => void;
  onUpdateWindowNumber: (windowId: string, windowNumber: string) => void;
  onAddPurchase: (record: Omit<PurchaseRecord, 'id'>) => void;
  onDeletePurchase: (id: string) => void;
  onUpdatePurchase: (id: string, data: Partial<PurchaseRecord>) => void;
  onProcessRequest: (requestId: string, approved: boolean, adminId: string) => void;
  onRechargeWindow: (windowId: string, amount: number, operatorId: string, cost?: number) => void;
  isDispatcher?: boolean;
}

export const CloudMachines: React.FC<Props> = ({
  machines,
  windows,
  staffList,
  windowRequests,
  purchases,
  adminId,
  onAddMachine,
  onBatchPurchase,
  onDeleteMachine,
  onUpdateMachine,
  onAddWindow,
  onDeleteWindow,
  onAssignWindow,
  onUpdateWindowGold,
  onUpdateWindowNumber,
  onAddPurchase,
  onDeletePurchase,
  onUpdatePurchase,
  onProcessRequest,
  onRechargeWindow,
  isDispatcher = false
}) => {
  const [activeTab, setActiveTab] = useState<'machines' | 'purchase' | 'requests' | 'records'>('machines');
  const [rechargeWindowId, setRechargeWindowId] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeCost, setRechargeCost] = useState('');
  const [editingPurchase, setEditingPurchase] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', amount: '', cost: '' });
  const [transferWindowId, setTransferWindowId] = useState<string | null>(null);
  const [transferTargetStaffId, setTransferTargetStaffId] = useState('');
  const [editingWindowId, setEditingWindowId] = useState<string | null>(null);
  const [editWindowNumber, setEditWindowNumber] = useState('');
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [editMachinePhone, setEditMachinePhone] = useState('');
  const [editMachinePlatform, setEditMachinePlatform] = useState('');
  const [editMachineLoginType, setEditMachineLoginType] = useState<'password' | 'code'>('code');
  const [editMachineLoginPassword, setEditMachineLoginPassword] = useState('');
  const { showAlert, showSuccess, ModalComponent } = useCyberModal();

  // 待审批的申请
  const pendingRequests = windowRequests.filter(r => r.status === 'pending');

  // 处理充值
  const handleRecharge = () => {
    if (!rechargeWindowId || !rechargeAmount) return;
    const amount = parseFloat(rechargeAmount) * 10000; // 转换为实际金币
    const cost = rechargeCost ? parseFloat(rechargeCost) : 0;
    onRechargeWindow(rechargeWindowId, amount, adminId, cost);
    // 如果有成本，同时添加采购记录
    if (cost > 0) {
      onAddPurchase({
        date: new Date().toISOString().split('T')[0],
        amount: amount,
        cost: cost
      });
    }
    showSuccess('充值成功', `已充值 ${rechargeAmount} 万哈夫币${cost > 0 ? `，采购成本 ${cost} 元` : ''}`);
    setRechargeWindowId(null);
    setRechargeAmount('');
    setRechargeCost('');
  };

  // 处理审批申请
  const handleApproveRequest = (requestId: string) => {
    onProcessRequest(requestId, true, adminId);
  };

  const handleRejectRequest = (requestId: string) => {
    onProcessRequest(requestId, false, adminId);
  };

  // 默认折叠所有云机
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());
  const [windowNumber, setWindowNumber] = useState('');
  const [windowGold, setWindowGold] = useState('');
  const [windowCost, setWindowCost] = useState(''); // 添加窗口时的采购成本
  const [windowUnitPrice, setWindowUnitPrice] = useState(''); // 单价（元/千万）
  
  // 云机管理中的批量添加
  const [machBatchNames, setMachBatchNames] = useState('');
  const [machBatchGold, setMachBatchGold] = useState('');
  const [machBatchCost, setMachBatchCost] = useState('');
  const [machBatchUnitPrice, setMachBatchUnitPrice] = useState(''); // 单价（元/千万）
  
  // 云机采购表单
  const today = new Date().toISOString().split('T')[0];
  const [purchasePhone, setPurchasePhone] = useState('');
  const [purchasePlatform, setPurchasePlatform] = useState('');
  const [purchaseLoginType, setPurchaseLoginType] = useState<'password' | 'code'>('code');
  const [purchaseLoginPassword, setPurchaseLoginPassword] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState(''); // 单价（元/千万）
  const [purchaseWindows, setPurchaseWindows] = useState<NewWindow[]>([{ windowNumber: '', goldBalance: '' }]);
  
  // 批量添加窗口
  const [batchWindowNames, setBatchWindowNames] = useState('');
  const [batchWindowGold, setBatchWindowGold] = useState('');

  // 添加窗口行
  const addWindowRow = () => {
    setPurchaseWindows([...purchaseWindows, { windowNumber: '', goldBalance: '' }]);
  };
  
  // 批量添加窗口
  const handleBatchAddWindows = () => {
    if (!batchWindowNames.trim() || !batchWindowGold.trim()) return;
    // 支持逗号、空格、换行分隔
    const names = batchWindowNames.split(/[,，\s\n]+/).filter(n => n.trim());
    if (names.length === 0) return;
    
    const newWindows = names.map(name => ({
      windowNumber: name.trim(),
      goldBalance: batchWindowGold
    }));
    
    // 如果当前只有一个空窗口，替换它；否则追加
    if (purchaseWindows.length === 1 && !purchaseWindows[0].windowNumber && !purchaseWindows[0].goldBalance) {
      setPurchaseWindows(newWindows);
    } else {
      setPurchaseWindows([...purchaseWindows, ...newWindows]);
    }
    
    setBatchWindowNames('');
    setBatchWindowGold('');
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

  // 计算总哈夫币
  const totalGoldInPurchase = purchaseWindows.reduce((sum, w) => sum + (parseFloat(w.goldBalance) || 0), 0);
  
  // 云机采购 - 总价变化时计算单价
  const handlePurchaseCostChange = (value: string) => {
    setPurchaseCost(value);
    const totalGoldWan = totalGoldInPurchase;
    const cost = parseFloat(value) || 0;
    if (totalGoldWan > 0 && cost > 0) {
      const unitPrice = cost / (totalGoldWan / 1000); // 元/千万
      setPurchaseUnitPrice(unitPrice.toFixed(2));
    }
  };
  
  // 云机采购 - 单价变化时计算总价
  const handlePurchaseUnitPriceChange = (value: string) => {
    setPurchaseUnitPrice(value);
    const totalGoldWan = totalGoldInPurchase;
    const unitPrice = parseFloat(value) || 0;
    if (totalGoldWan > 0 && unitPrice > 0) {
      const cost = unitPrice * (totalGoldWan / 1000); // 总价
      setPurchaseCost(cost.toFixed(2));
    }
  };

  // 提交云机采购
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePhone || !purchasePlatform) {
      showAlert('信息不完整', '请填写手机号和平台');
      return;
    }
    
    const validWindows = purchaseWindows.filter(w => w.windowNumber && w.goldBalance);
    if (validWindows.length === 0) {
      showAlert('信息不完整', '请至少添加一个窗口');
      return;
    }

    // 批量创建云机+窗口+采购记录（一次性完成，只刷新一次）
    const windowsData = validWindows.map(w => ({
      windowNumber: w.windowNumber,
      goldBalance: (parseFloat(w.goldBalance) || 0) * 10000 // 输入的是万，转成原始值
    }));
    
    const purchaseData = purchaseCost ? {
      date: today,
      amount: totalGoldInPurchase * 10000, // 输入的是万，转成原始值
      cost: parseFloat(purchaseCost) || 0
    } : undefined;
    
    await onBatchPurchase(
      { 
        phone: purchasePhone, 
        platform: purchasePlatform,
        loginType: purchaseLoginType,
        loginPassword: purchaseLoginType === 'password' ? purchaseLoginPassword : undefined
      },
      windowsData,
      purchaseData
    );

    // 重置表单
    setPurchasePhone('');
    setPurchasePlatform('');
    setPurchaseLoginType('code');
    setPurchaseLoginPassword('');
    setPurchaseCost('');
    setPurchaseUnitPrice('');
    setPurchaseWindows([{ windowNumber: '', goldBalance: '' }]);
    setActiveTab('machines');
    showSuccess('采购成功', '云机采购成功！');
  };

  const handleAddWindow = (machineId: string) => {
    if (!windowNumber) return;
    const goldBalanceWan = parseFloat(windowGold) || 0;
    const goldBalance = goldBalanceWan * 10000; // 输入的是万，转成原始值
    onAddWindow({ machineId, windowNumber, goldBalance, userId: null });
    // 如果有成本，同时添加采购记录
    if (windowCost && parseFloat(windowCost) > 0) {
      onAddPurchase({
        date: today,
        amount: goldBalance,
        cost: parseFloat(windowCost)
      });
    }
    setWindowNumber('');
    setWindowGold('');
    setWindowCost('');
    setWindowUnitPrice('');
  };
  
  // 单个窗口添加 - 总价变化时计算单价
  const handleWindowCostChange = (value: string) => {
    setWindowCost(value);
    const goldWan = parseFloat(windowGold) || 0;
    const cost = parseFloat(value) || 0;
    if (goldWan > 0 && cost > 0) {
      const unitPrice = cost / (goldWan / 1000); // 元/千万
      setWindowUnitPrice(unitPrice.toFixed(2));
    }
  };
  
  // 单个窗口添加 - 单价变化时计算总价
  const handleWindowUnitPriceChange = (value: string) => {
    setWindowUnitPrice(value);
    const goldWan = parseFloat(windowGold) || 0;
    const unitPrice = parseFloat(value) || 0;
    if (goldWan > 0 && unitPrice > 0) {
      const cost = unitPrice * (goldWan / 1000); // 总价
      setWindowCost(cost.toFixed(2));
    }
  };
  
  // 批量添加窗口到已有云机
  const handleBatchAddToMachine = async (machineId: string) => {
    if (!machBatchNames.trim() || !machBatchGold.trim()) return;
    const names = machBatchNames.split(/[,，\s\n]+/).filter(n => n.trim());
    if (names.length === 0) return;
    
    const goldBalance = parseFloat(machBatchGold) || 0;
    const totalGold = goldBalance * names.length;
    
    // 添加所有窗口
    for (const name of names) {
      onAddWindow({ machineId, windowNumber: name.trim(), goldBalance, userId: null });
    }
    
    // 如果有成本，添加采购记录
    if (machBatchCost && parseFloat(machBatchCost) > 0) {
      onAddPurchase({
        date: today,
        amount: totalGold,
        cost: parseFloat(machBatchCost)
      });
    }
    
    setMachBatchNames('');
    setMachBatchGold('');
    setMachBatchCost('');
    setMachBatchUnitPrice('');
    showSuccess('添加成功', `已添加 ${names.length} 个窗口`);
  };
  
  // 批量添加 - 总价变化时计算单价
  const handleBatchCostChange = (value: string) => {
    setMachBatchCost(value);
    const goldWan = parseFloat(machBatchGold) || 0;
    const names = machBatchNames.split(/[,，\s\n]+/).filter(n => n.trim());
    const totalGoldWan = goldWan * names.length;
    const cost = parseFloat(value) || 0;
    if (totalGoldWan > 0 && cost > 0) {
      const unitPrice = cost / (totalGoldWan / 1000); // 元/千万
      setMachBatchUnitPrice(unitPrice.toFixed(2));
    }
  };
  
  // 批量添加 - 单价变化时计算总价
  const handleBatchUnitPriceChange = (value: string) => {
    setMachBatchUnitPrice(value);
    const goldWan = parseFloat(machBatchGold) || 0;
    const names = machBatchNames.split(/[,，\s\n]+/).filter(n => n.trim());
    const totalGoldWan = goldWan * names.length;
    const unitPrice = parseFloat(value) || 0;
    if (totalGoldWan > 0 && unitPrice > 0) {
      const cost = unitPrice * (totalGoldWan / 1000); // 总价
      setMachBatchCost(cost.toFixed(2));
    }
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return null;
    return staffList.find(s => s.id === staffId)?.name || '未知';
  };

  // 员工颜色列表
  const staffColors = [
    'text-cyan-400', 'text-pink-400', 'text-green-400', 'text-purple-400',
    'text-orange-400', 'text-blue-400', 'text-red-400', 'text-teal-400'
  ];
  
  // 员工背景色列表（与文字颜色对应）
  const staffBgColors = [
    'bg-cyan-500/10', 'bg-pink-500/10', 'bg-green-500/10', 'bg-purple-500/10',
    'bg-orange-500/10', 'bg-blue-500/10', 'bg-red-500/10', 'bg-teal-500/10'
  ];
  
  // 员工边框色列表（与文字颜色对应）
  const staffBorderColors = [
    'border-cyan-500/50', 'border-pink-500/50', 'border-green-500/50', 'border-purple-500/50',
    'border-orange-500/50', 'border-blue-500/50', 'border-red-500/50', 'border-teal-500/50'
  ];
  
  const getStaffColor = (staffId: string | null) => {
    if (!staffId) return 'text-gray-400';
    const index = staffList.findIndex(s => s.id === staffId);
    return staffColors[index % staffColors.length];
  };
  
  const getStaffBgColor = (staffId: string | null) => {
    if (!staffId) return 'bg-white/5';
    const index = staffList.findIndex(s => s.id === staffId);
    return staffBgColors[index % staffBgColors.length];
  };
  
  const getStaffBorderColor = (staffId: string | null) => {
    if (!staffId) return 'border-white/30';
    const index = staffList.findIndex(s => s.id === staffId);
    return staffBorderColors[index % staffBorderColors.length];
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
        <button onClick={() => setActiveTab('requests')}
          className={`flex-1 p-4 border-b-2 transition-all font-mono uppercase font-bold tracking-widest flex items-center justify-center gap-3 relative
            ${activeTab === 'requests' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
          <Bell size={20} /> 窗口申请
          {pendingRequests.length > 0 && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
        {!isDispatcher && (
          <button onClick={() => setActiveTab('records')}
            className={`flex-1 p-4 border-b-2 transition-all font-mono uppercase font-bold tracking-widest flex items-center justify-center gap-3
              ${activeTab === 'records' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
            <FileText size={20} /> 采购记录
          </button>
        )}
      </div>

      {/* 云机采购 */}
      {activeTab === 'purchase' && (
        <CyberCard title="云机采购" icon={<ShoppingCart size={20} />}>
          <form onSubmit={handlePurchaseSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <CyberInput label="手机号" type="text" value={purchasePhone} placeholder="输入手机号"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePhone(e.target.value)} required />
              <CyberInput label="平台" type="text" value={purchasePlatform} placeholder="输入平台名称"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePlatform(e.target.value)} required />
              <div className="mb-4">
                <label className="block text-cyber-primary text-xs font-mono mb-2 uppercase tracking-wider">{`> 登录方式`}</label>
                <select
                  value={purchaseLoginType}
                  onChange={(e) => setPurchaseLoginType(e.target.value as 'password' | 'code')}
                  className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2"
                >
                  <option value="code">验证码登录</option>
                  <option value="password">密码登录</option>
                </select>
              </div>
              {purchaseLoginType === 'password' && (
                <CyberInput label="登录密码" type="text" value={purchaseLoginPassword} placeholder="输入密码"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchaseLoginPassword(e.target.value)} />
              )}
              <CyberInput label="采购总价 (元)" type="number" step="0.01" value={purchaseCost} placeholder="输入总价"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseCostChange(e.target.value)} />
              <CyberInput label="单价 (元/千万)" type="number" step="0.01" value={purchaseUnitPrice} placeholder="输入单价"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseUnitPriceChange(e.target.value)} />
            </div>

            <div className="border border-cyber-accent/30 p-4 rounded">
              <div className="flex justify-between items-center mb-4">
                <div className="text-cyber-accent font-mono">窗口列表</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={addWindowRow} className="px-3 py-1 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent text-sm flex items-center gap-1">
                    <Plus size={14} /> 添加窗口
                  </button>
                </div>
              </div>
              
              {/* 批量添加 */}
              <div className="mb-4 p-3 bg-black/30 rounded border border-cyber-primary/20">
                <div className="text-xs text-cyber-primary font-mono mb-2">批量添加（窗口名用逗号或空格分隔）</div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input type="text" value={batchWindowNames} placeholder="如: 1,2,3,4,5 或 窗口1 窗口2 窗口3"
                      onChange={e => setBatchWindowNames(e.target.value)}
                      className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                  </div>
                  <div className="w-32">
                    <input type="number" value={batchWindowGold} placeholder="统一余额"
                      onChange={e => setBatchWindowGold(e.target.value)}
                      className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                  </div>
                  <button type="button" onClick={handleBatchAddWindows} 
                    disabled={!batchWindowNames.trim() || !batchWindowGold.trim()}
                    className="px-3 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm disabled:opacity-50">
                    批量添加
                  </button>
                </div>
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
                      <label className="block text-cyber-primary text-xs font-mono mb-1">哈夫币余额(万)</label>
                      <input type="number" value={w.goldBalance} placeholder="输入哈夫币"
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
                <div className="text-cyber-accent font-mono text-lg">总哈夫币: {totalGoldInPurchase.toLocaleString()} 万</div>
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
                const isExpanded = expandedMachines.has(machine.id);
                const isEditing = editingMachineId === machine.id;

                return (
                  <div key={machine.id} className="border border-cyber-primary/20 rounded overflow-hidden">
                    <div className="flex justify-between items-center p-4 bg-cyber-panel/50 cursor-pointer hover:bg-cyber-panel/80"
                      onClick={() => {
                        if (isEditing) return;
                        const newSet = new Set(expandedMachines);
                        if (isExpanded) newSet.delete(machine.id);
                        else newSet.add(machine.id);
                        setExpandedMachines(newSet);
                      }}>
                      <div className="flex items-center gap-4">
                        <Server className="text-cyber-primary" size={28} />
                        {isEditing ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editMachinePhone}
                              onChange={e => setEditMachinePhone(e.target.value)}
                              placeholder="手机号"
                              className="bg-black/40 border border-cyber-primary/50 text-cyber-text font-mono px-2 py-1 text-lg w-40"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editMachinePlatform}
                                onChange={e => setEditMachinePlatform(e.target.value)}
                                placeholder="平台"
                                className="bg-black/40 border border-cyber-primary/50 text-cyber-text font-mono px-2 py-1 text-sm w-24"
                              />
                              <select
                                value={editMachineLoginType}
                                onChange={e => setEditMachineLoginType(e.target.value as 'password' | 'code')}
                                className="bg-black/40 border border-cyber-primary/50 text-cyber-text font-mono px-2 py-1 text-sm"
                              >
                                <option value="code">验证码</option>
                                <option value="password">密码</option>
                              </select>
                              {editMachineLoginType === 'password' && (
                                <input
                                  type="text"
                                  value={editMachineLoginPassword}
                                  onChange={e => setEditMachineLoginPassword(e.target.value)}
                                  placeholder="密码"
                                  className="bg-black/40 border border-cyber-primary/50 text-cyber-text font-mono px-2 py-1 text-sm w-24"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono text-xl">{machine.phone}</div>
                            <div className="flex items-center gap-2 text-base text-gray-400">
                              <span>{machine.platform}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${machine.loginType === 'password' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                {machine.loginType === 'password' ? `密码: ${machine.loginPassword || ''}` : '验证码'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-cyber-accent font-mono text-2xl">{formatWan(totalGold)}</div>
                          <div className="text-sm text-gray-500">总哈夫币</div>
                        </div>
                        <div className="text-base">
                          <span className="text-green-400 text-lg">{machineWindows.length - occupiedCount}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-yellow-400 text-lg">{occupiedCount}</span>
                          <div className="text-sm text-gray-500">空闲/占用</div>
                        </div>
                        {isEditing ? (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => {
                              onUpdateMachine(machine.id, {
                                phone: editMachinePhone,
                                platform: editMachinePlatform,
                                loginType: editMachineLoginType,
                                loginPassword: editMachineLoginType === 'password' ? editMachineLoginPassword : undefined
                              });
                              setEditingMachineId(null);
                              showSuccess('修改成功', '云机信息已更新');
                            }} className="text-green-400 hover:text-green-300 p-2">
                              <Save size={18} />
                            </button>
                            <button onClick={() => setEditingMachineId(null)} className="text-gray-400 hover:text-white p-2">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => {
                            e.stopPropagation();
                            setEditingMachineId(machine.id);
                            setEditMachinePhone(machine.phone);
                            setEditMachinePlatform(machine.platform);
                            setEditMachineLoginType(machine.loginType || 'code');
                            setEditMachineLoginPassword(machine.loginPassword || '');
                          }} className="text-cyber-primary/60 hover:text-cyber-primary p-2">
                            <Edit2 size={18} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDeleteMachine(machine.id); }} className="text-red-500 hover:text-red-400 p-1">
                          <Trash2 size={18} />
                        </button>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-cyber-primary/20">
                        {/* 单个添加 */}
                        <div className="flex gap-4 mb-4 items-end">
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 窗口号`}</label>
                            <input type="text" value={windowNumber} onChange={e => setWindowNumber(e.target.value)} placeholder="输入窗口号"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 哈夫币余额(万)`}</label>
                            <input type="number" value={windowGold} onChange={e => setWindowGold(e.target.value)} placeholder="输入哈夫币"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 采购成本 (元)`}</label>
                            <input type="number" step="0.01" value={windowCost} onChange={e => handleWindowCostChange(e.target.value)} placeholder="输入成本"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-cyber-primary text-xs font-mono mb-1">{`> 单价 (元/千万)`}</label>
                            <input type="number" step="0.01" value={windowUnitPrice} onChange={e => handleWindowUnitPriceChange(e.target.value)} placeholder="输入单价"
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                          </div>
                          <button onClick={() => handleAddWindow(machine.id)} disabled={!windowNumber}
                            className="px-4 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary text-sm disabled:opacity-50">
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        {/* 批量添加 */}
                        <div className="mb-4 p-3 bg-black/30 rounded border border-cyber-accent/20">
                          <div className="text-xs text-cyber-accent font-mono mb-2">批量添加（窗口名用逗号或空格分隔）</div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <input type="text" value={machBatchNames} placeholder="如: 1,2,3,4,5"
                                onChange={e => setMachBatchNames(e.target.value)}
                                className="w-full bg-black/40 border border-cyber-accent/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                            </div>
                            <div className="w-24">
                              <input type="number" value={machBatchGold} placeholder="统一余额"
                                onChange={e => setMachBatchGold(e.target.value)}
                                className="w-full bg-black/40 border border-cyber-accent/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                            </div>
                            <div className="w-24">
                              <input type="number" step="0.01" value={machBatchCost} placeholder="总成本"
                                onChange={e => handleBatchCostChange(e.target.value)}
                                className="w-full bg-black/40 border border-cyber-accent/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                            </div>
                            <div className="w-24">
                              <input type="number" step="0.01" value={machBatchUnitPrice} placeholder="单价/千万"
                                onChange={e => handleBatchUnitPriceChange(e.target.value)}
                                className="w-full bg-black/40 border border-cyber-accent/30 text-cyber-text font-mono px-3 py-2 text-sm" />
                            </div>
                            <button onClick={() => handleBatchAddToMachine(machine.id)} 
                              disabled={!machBatchNames.trim() || !machBatchGold.trim()}
                              className="px-3 py-2 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent text-sm disabled:opacity-50">
                              批量添加
                            </button>
                          </div>
                        </div>

                        {machineWindows.length === 0 ? (
                          <p className="text-gray-500 text-base text-center py-4">暂无窗口</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {machineWindows.map(window => (
                              <div key={window.id} className={`p-4 rounded border ${getStaffBorderColor(window.userId)} ${getStaffBgColor(window.userId)}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Circle size={10} className={window.userId ? `${getStaffColor(window.userId)} fill-current` : 'text-white/60 fill-white/60'} />
                                    {editingWindowId === window.id ? (
                                      <input
                                        type="text"
                                        value={editWindowNumber}
                                        onChange={e => setEditWindowNumber(e.target.value)}
                                        className="bg-black/40 border border-cyber-primary/50 text-cyber-text font-mono px-2 py-1 text-lg w-24"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="font-mono text-lg">{window.windowNumber}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {editingWindowId === window.id ? (
                                      <>
                                        <button onClick={() => { onUpdateWindowNumber(window.id, editWindowNumber); setEditingWindowId(null); showSuccess('修改成功', '窗口号已更新'); }} className="text-green-400 hover:text-green-300 p-1"><Save size={14} /></button>
                                        <button onClick={() => setEditingWindowId(null)} className="text-gray-400 hover:text-white p-1"><X size={14} /></button>
                                      </>
                                    ) : (
                                      <button onClick={() => { setEditingWindowId(window.id); setEditWindowNumber(window.windowNumber); }} className="text-cyber-primary/60 hover:text-cyber-primary p-1"><Edit2 size={14} /></button>
                                    )}
                                    <button onClick={() => onDeleteWindow(window.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">哈夫币:</span>
                                    <span className={`font-mono text-lg ${window.goldBalance < 1000000 ? 'text-red-400' : 'text-cyber-accent'}`}>
                                      {formatWan(window.goldBalance)}
                                      {window.goldBalance < 1000000 && <span className="text-sm ml-1">(低)</span>}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => setRechargeWindowId(window.id)}
                                    className="text-xs text-green-400 hover:text-green-300 px-2 py-1 border border-green-500/30 rounded flex items-center gap-1"
                                  >
                                    <Coins size={12} /> 充值
                                  </button>
                                </div>
                                {window.userId ? (
                                  <div className="flex items-center justify-between">
                                    <span className={`text-base font-bold ${getStaffColor(window.userId)}`}>{getStaffName(window.userId)}</span>
                                    <div className="flex gap-2">
                                      <button onClick={() => setTransferWindowId(window.id)} className="text-sm text-cyber-primary hover:text-cyber-accent px-3 py-1 border border-cyber-primary/30 rounded">转让</button>
                                      <button onClick={() => onAssignWindow(window.id, null)} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-600 rounded">释放</button>
                                    </div>
                                  </div>
                                ) : (
                                  <select className="w-full bg-black/40 border border-cyber-primary/30 text-sm p-2 rounded" value=""
                                    onChange={e => { if (e.target.value) { onAssignWindow(window.id, e.target.value); } }}>
                                    <option value="">分配给...</option>
                                    {staffList.map(s => (<option key={s.id} value={s.id}>{s.name} ({getStaffWindowCount(s.id)}个)</option>))}
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

      {/* 窗口申请审批 */}
      {activeTab === 'requests' && (
        <CyberCard title="窗口申请审批" icon={<Bell size={20} />}>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无待审批的申请</div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => {
                const requestWindow = request.windowId ? windows.find(w => w.id === request.windowId) : null;
                const requestMachine = requestWindow ? machines.find(m => m.id === requestWindow.machineId) : null;
                return (
                  <div key={request.id} className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-lg text-white">{request.staffName}</div>
                        <div className="text-sm text-gray-400">
                          {request.type === 'apply' ? '申请窗口' : '申请释放窗口'}
                        </div>
                        {requestWindow && (
                          <div className="mt-2 p-2 bg-black/30 rounded border border-cyber-primary/20">
                            <div className="text-sm text-cyber-primary">
                              窗口 {requestWindow.windowNumber}
                            </div>
                            <div className="text-xs text-gray-400">
                              {requestMachine?.phone} ({requestMachine?.platform})
                            </div>
                            <div className="text-xs text-cyber-accent mt-1">
                              余额: {formatWan(requestWindow.goldBalance)}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(request.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-sm hover:bg-green-500/30"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-3 py-1 bg-red-500/20 border border-red-500 text-red-400 text-sm hover:bg-red-500/30"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CyberCard>
      )}

      {/* 采购记录 - 客服隐藏 */}
      {activeTab === 'records' && !isDispatcher && (
        <CyberCard title="采购记录" icon={<FileText size={20} />}>
          {purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无采购记录</div>
          ) : (
            <div className="space-y-3">
              {/* 统计 */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-black/30 rounded border border-cyber-primary/20">
                <div className="text-center">
                  <div className="text-xs text-gray-400">采购次数</div>
                  <div className="text-xl font-mono text-cyber-primary">{purchases.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">总采购量</div>
                  <div className="text-xl font-mono text-cyber-accent">{formatWan(purchases.reduce((s, p) => s + p.amount, 0))}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">总成本</div>
                  <div className="text-xl font-mono text-green-400">¥{purchases.reduce((s, p) => s + p.cost, 0).toFixed(2)}</div>
                </div>
              </div>
              
              {/* 记录列表 */}
              {purchases.map(p => (
                <div key={p.id} className="p-4 bg-green-500/10 border border-green-500/30 rounded">
                  {editingPurchase === p.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">日期</label>
                          <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})}
                            className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">采购量</label>
                          <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})}
                            className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">成本 (元)</label>
                          <input type="number" step="0.01" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})}
                            className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingPurchase(null)} className="px-3 py-1 border border-gray-600 text-gray-400 text-sm flex items-center gap-1">
                          <X size={14} /> 取消
                        </button>
                        <button onClick={() => {
                          onUpdatePurchase(p.id, { date: editForm.date, amount: parseFloat(editForm.amount), cost: parseFloat(editForm.cost) });
                          setEditingPurchase(null);
                          showSuccess('修改成功', '采购记录已更新');
                        }} className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-sm flex items-center gap-1">
                          <Save size={14} /> 保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className="text-sm text-gray-400">{p.date}</div>
                        {(p as any).type === 'transfer_out' ? (
                          <>
                            <div className="font-mono text-orange-400">{formatWan(Math.abs(p.amount))} (转出)</div>
                            <div className="font-mono text-cyan-400">+¥{Math.abs(p.cost).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{(p as any).note}</div>
                          </>
                        ) : (p as any).type === 'transfer_in' ? (
                          <>
                            <div className="font-mono text-green-400">{formatWan(p.amount)} (转入)</div>
                            <div className="font-mono text-red-400">-¥{p.cost.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{(p as any).note}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-cyber-accent">{formatWan(p.amount)}</div>
                            <div className="font-mono text-green-400">¥{p.cost.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              单价: ¥{p.amount > 0 ? (p.cost / (p.amount / 10000000)).toFixed(2) : '0'}/千万
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!(p as any).type && (
                          <button onClick={() => { setEditingPurchase(p.id); setEditForm({ date: p.date, amount: String(p.amount), cost: String(p.cost) }); }}
                            className="p-1 text-cyber-primary hover:text-cyber-accent">
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button onClick={() => onDeletePurchase(p.id)} className="p-1 text-red-500 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CyberCard>
      )}

      {/* 充值弹窗 */}
      {rechargeWindowId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-green-500 p-6 max-w-md w-full relative">
            <div className="absolute top-0 left-0 w-16 h-[2px] bg-green-500 shadow-lg"></div>
            <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-green-500 shadow-lg"></div>
            <h3 className="text-xl font-mono text-green-400 mb-4 flex items-center gap-2">
              <Coins size={20} /> 窗口充值
            </h3>
            {(() => {
              const win = windows.find(w => w.id === rechargeWindowId);
              const machine = win ? machines.find(m => m.id === win.machineId) : null;
              return win ? (
                <div className="mb-4 p-3 bg-black/30 rounded border border-green-500/20">
                  <div className="text-sm text-gray-400">窗口: <span className="text-white font-mono">{win.windowNumber}</span></div>
                  <div className="text-sm text-gray-400">云机: <span className="text-white">{machine?.phone} ({machine?.platform})</span></div>
                  <div className="text-sm text-gray-400">当前余额: <span className="text-cyber-accent font-mono">{formatWan(win.goldBalance)}</span></div>
                </div>
              ) : null;
            })()}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">充值金额（万）</label>
              <input
                type="number"
                placeholder="输入充值金额"
                value={rechargeAmount}
                onChange={e => setRechargeAmount(e.target.value)}
                className="w-full bg-black/40 border border-green-500/30 text-cyber-text font-mono px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">采购成本（元）</label>
              <input
                type="number"
                step="0.01"
                placeholder="输入采购成本"
                value={rechargeCost}
                onChange={e => setRechargeCost(e.target.value)}
                className="w-full bg-black/40 border border-green-500/30 text-cyber-text font-mono px-3 py-2"
              />
              <div className="text-xs text-gray-500 mt-1">填写成本后会自动添加采购记录</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRechargeWindowId(null); setRechargeAmount(''); setRechargeCost(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">
                取消
              </button>
              <button 
                onClick={handleRecharge} 
                disabled={!rechargeAmount}
                className="flex-1 py-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 font-mono text-sm disabled:opacity-50"
              >
                确认充值
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 转让弹窗 */}
      {transferWindowId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <div className="absolute top-0 left-0 w-16 h-[2px] bg-cyber-primary shadow-lg"></div>
            <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-cyber-primary shadow-lg"></div>
            <h3 className="text-xl font-mono text-cyber-primary mb-4 flex items-center gap-2">
              转让窗口
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              当前窗口: {windows.find(w => w.id === transferWindowId)?.windowNumber} - 
              {getStaffName(windows.find(w => w.id === transferWindowId)?.userId || null)}
            </p>
            <select
              value={transferTargetStaffId}
              onChange={e => setTransferTargetStaffId(e.target.value)}
              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 mb-4"
            >
              <option value="">选择目标员工...</option>
              {staffList.filter(s => s.id !== windows.find(w => w.id === transferWindowId)?.userId).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({getStaffWindowCount(s.id)}个)
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setTransferWindowId(null); setTransferTargetStaffId(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">
                取消
              </button>
              <button 
                onClick={() => {
                  if (transferTargetStaffId && getStaffWindowCount(transferTargetStaffId) < 10) {
                    onAssignWindow(transferWindowId, transferTargetStaffId);
                    showSuccess('转让成功', '窗口已转让给新员工');
                    setTransferWindowId(null);
                    setTransferTargetStaffId('');
                  } else {
                    showAlert('无法转让', '目标员工窗口已满');
                  }
                }}
                disabled={!transferTargetStaffId}
                className="flex-1 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 font-mono text-sm disabled:opacity-50"
              >
                确认转让
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通用弹窗 */}
      <ModalComponent />
    </div>
  );
};
