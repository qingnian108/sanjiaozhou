import React, { useState } from 'react';
import { PlusCircle, ShoppingCart, Truck } from 'lucide-react';
import { GlassCard, CyberInput, NeonButton, SectionHeader, useCyberModal } from './CyberUI';
import { PurchaseRecord, OrderRecord, Settings, Staff, CloudWindow, CloudMachine, WindowSnapshot } from '../types';
import { formatChineseNumber, formatWan } from '../utils';

interface DataEntryProps {
  onAddPurchase: (record: Omit<PurchaseRecord, 'id'>) => void;
  onAddOrder: (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => void;
  settings: Settings;
  staffList: Staff[];
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
}

export const DataEntry: React.FC<DataEntryProps> = ({ 
  onAddPurchase, 
  onAddOrder, 
  settings, 
  staffList,
  cloudWindows,
  cloudMachines
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'purchase' | 'order'>('order');
  const { showAlert, showSuccess, ModalComponent } = useCyberModal();

  const [purchaseForm, setPurchaseForm] = useState({
    date: today,
    amount: '',
    cost: ''
  });

  const [orderForm, setOrderForm] = useState({
    date: today,
    staffId: '',
    amount: '',
    feePercent: settings.defaultFeePercent.toString(),
    unitPrice: settings.orderUnitPrice.toString()
  });

  // 获取员工的窗口
  const getStaffWindows = (staffId: string) => {
    return cloudWindows.filter(w => w.userId === staffId);
  };

  // 获取云机名称
  const getMachineName = (machineId: string) => {
    const machine = cloudMachines.find(m => m.id === machineId);
    return machine ? `${machine.phone} (${machine.platform})` : '未知';
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPurchase({
      date: purchaseForm.date,
      amount: parseFloat(purchaseForm.amount),
      cost: parseFloat(purchaseForm.cost)
    });
    setPurchaseForm({ ...purchaseForm, amount: '', cost: '' });
    showSuccess("添加成功", "采购记录已添加");
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.staffId) {
      showAlert("请选择员工", "请选择一名员工");
      return;
    }
    
    const staffWindows = getStaffWindows(orderForm.staffId);
    if (staffWindows.length === 0) {
      showAlert("无法创建", "该员工没有分配窗口，无法创建订单");
      return;
    }

    // 创建窗口快照
    const windowSnapshots: WindowSnapshot[] = staffWindows.map(w => ({
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
    showSuccess("创建成功", "订单已创建，员工可在员工端完成订单");
  };

  // 获取选中员工的窗口信息
  const selectedStaffWindows = orderForm.staffId ? getStaffWindows(orderForm.staffId) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('order')}
          className={`flex-1 p-6 border-b-2 transition-all shadow-sm font-mono uppercase font-bold tracking-widest text-lg flex items-center justify-center gap-3
            ${activeTab === 'order' 
              ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
              : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}
        >
          <Truck size={24} /> 订单录入
        </button>
        <button 
          onClick={() => setActiveTab('purchase')}
          className={`flex-1 p-6 border-b-2 transition-all shadow-sm font-mono uppercase font-bold tracking-widest text-lg flex items-center justify-center gap-3
            ${activeTab === 'purchase' 
              ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
              : 'bg-black/30 border-gray-800 text-gray-600 hover:text-gray-400'}`}
        >
          <ShoppingCart size={24} /> 采购录入
        </button>
      </div>

      {activeTab === 'order' && (
        <GlassCard className="relative">
          <div className="absolute top-4 right-4 p-2 opacity-10">
            <Truck size={120} className="text-cyber-primary" />
          </div>
          <SectionHeader title="订单作业 // 流水录入" icon={Truck} />
          
          {staffList.length === 0 ? (
            <div className="text-center py-10 text-cyber-secondary font-mono bg-cyber-secondary/10 border border-cyber-secondary/30">
              ⚠ WARNING: NO STAFF DETECTED. PLEASE REGISTER PERSONNEL FIRST.
            </div>
          ) : (
            <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="md:col-span-2">
                <label className="block text-cyber-primary text-xs font-mono mb-1 tracking-widest opacity-80">
                  {`> 执行员工`}
                </label>
                <select 
                  value={orderForm.staffId}
                  onChange={(e) => setOrderForm({...orderForm, staffId: e.target.value})}
                  required
                  className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono font-bold px-4 py-2 focus:outline-none focus:border-cyber-primary focus:shadow-neon-cyan transition-all"
                >
                  <option value="">-- SELECT OPERATIVE --</option>
                  {staffList.map(s => {
                    const windowCount = getStaffWindows(s.id).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({windowCount} 窗口)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 显示选中员工的窗口 */}
              {selectedStaffWindows.length > 0 && (
                <div className="md:col-span-2 bg-black/30 p-4 border border-cyber-primary/20 rounded">
                  <div className="text-xs text-cyber-primary font-mono mb-2">员工窗口（订单开始时将记录当前余额）:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedStaffWindows.map(w => (
                      <div key={w.id} className="bg-cyber-panel/50 p-2 rounded border border-cyber-primary/10">
                        <div className="text-sm font-mono">{w.windowNumber}</div>
                        <div className="text-xs text-gray-400">{getMachineName(w.machineId)}</div>
                        <div className="text-cyber-accent font-mono">{formatWan(w.goldBalance)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CyberInput label="日期" type="date" value={orderForm.date} 
                onChange={(e: any) => setOrderForm({...orderForm, date: e.target.value})} required />
              <CyberInput label="订单单价 (元/千万)" type="number" step="0.01" value={orderForm.unitPrice} 
                onChange={(e: any) => setOrderForm({...orderForm, unitPrice: e.target.value})} required />
              <CyberInput label="订单金额 (万哈夫币)" type="number" step="0.01" placeholder="26000" value={orderForm.amount} 
                onChange={(e: any) => setOrderForm({...orderForm, amount: e.target.value})} required />
              <CyberInput label="手续费 (%)" type="number" step="0.1" value={orderForm.feePercent} 
                onChange={(e: any) => setOrderForm({...orderForm, feePercent: e.target.value})} required />

              <div className="md:col-span-2 mt-2 flex justify-end">
                <NeonButton variant="primary">
                  <span className="flex items-center gap-2"><PlusCircle size={16} /> 创建订单</span>
                </NeonButton>
              </div>
            </form>
          )}
        </GlassCard>
      )}

      {activeTab === 'purchase' && (
        <GlassCard className="relative">
          <div className="absolute top-4 right-4 p-2 opacity-10">
            <ShoppingCart size={120} className="text-cyber-accent" />
          </div>
          <SectionHeader title="供应链 // 采购入库" icon={ShoppingCart} />
          <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="md:col-span-2">
              <CyberInput label="采购日期" type="date" value={purchaseForm.date} 
                onChange={(e: any) => setPurchaseForm({...purchaseForm, date: e.target.value})} required />
            </div>
            <CyberInput label="采购哈夫币 (万)" type="number" step="0.01" placeholder="30000" value={purchaseForm.amount} 
              onChange={(e: any) => setPurchaseForm({...purchaseForm, amount: e.target.value})} required />
            <CyberInput label="总成本 (元)" type="number" step="0.01" placeholder="600" value={purchaseForm.cost} 
              onChange={(e: any) => setPurchaseForm({...purchaseForm, cost: e.target.value})} required />
            <div className="md:col-span-2 mt-4 flex justify-end">
              <NeonButton variant="primary">
                <span className="flex items-center gap-2"><PlusCircle size={16} /> 确认入库</span>
              </NeonButton>
            </div>
          </form>
        </GlassCard>
      )}
      <ModalComponent />
    </div>
  );
};
