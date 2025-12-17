import { useState, useEffect } from 'react';
import { db } from '../cloudbase';
import { PurchaseRecord, OrderRecord, Staff, Settings, KookChannel, CloudMachine, CloudWindow, WindowSnapshot, WindowResult, WindowRequest, WindowRecharge } from '../types';

const DEFAULT_SETTINGS: Settings = {
  employeeCostRate: 12,
  orderUnitPrice: 60,
  defaultFeePercent: 7,
  initialCapital: 10000
};

// 扩展类型，添加 tenantId
interface TenantData {
  tenantId: string;
}

export function useFirestore(tenantId: string | null) {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [kookChannels, setKookChannels] = useState<KookChannel[]>([]);
  const [cloudMachines, setCloudMachines] = useState<CloudMachine[]>([]);
  const [cloudWindows, setCloudWindows] = useState<CloudWindow[]>([]);
  const [windowRequests, setWindowRequests] = useState<WindowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载数据的函数 - 按 tenantId 过滤
  const loadData = async () => {
    console.log('loadData called, tenantId:', tenantId);
    if (!tenantId) {
      console.log('No tenantId, skipping load');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Starting data fetch...');
      const [purchasesRes, ordersRes, staffRes, settingsRes, kookRes, machinesRes, windowsRes, requestsRes] = await Promise.all([
        db.collection('purchases').where({ tenantId }).get(),
        db.collection('orders').where({ tenantId }).get(),
        db.collection('staff').where({ tenantId }).get(),
        db.collection('config').doc(`settings_${tenantId}`).get(),
        db.collection('kookChannels').where({ tenantId }).get(),
        db.collection('cloudMachines').where({ tenantId }).get(),
        db.collection('cloudWindows').where({ tenantId }).get(),
        db.collection('windowRequests').where({ tenantId }).get()
      ]);
      console.log('Data fetch complete');

      console.log('Staff data from DB:', staffRes.data);
      setPurchases(purchasesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setOrders(ordersRes.data.map((d: any) => ({ id: d._id, ...d })));
      const staffData = staffRes.data.map((d: any) => ({ id: d._id, ...d }));
      console.log('Processed staff data:', staffData);
      setStaffList(staffData);
      setKookChannels(kookRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudMachines(machinesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudWindows(windowsRes.data.map((d: any) => ({ id: d._id, ...d })));
      setWindowRequests(requestsRes.data.map((d: any) => ({ id: d._id, ...d })));
      
      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0] as Settings);
      }
      console.log('State updated');
    } catch (error) {
      console.error('Load data failed:', error);
    }
    setLoading(false);
    console.log('Loading set to false');
  };

  useEffect(() => {
    console.log('useFirestore useEffect triggered, tenantId:', tenantId);
    if (tenantId) {
      loadData();
    } else {
      console.log('No tenantId, setting loading to false');
      setLoading(false);
    }
  }, [tenantId]);

  const generateId = () => crypto.randomUUID();

  // Add purchase - 带 tenantId
  const addPurchase = async (record: Omit<PurchaseRecord, 'id'>) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('purchases').doc(id).set({ ...record, tenantId });
    await loadData();
  };

  // Add order - 带 tenantId
  const addOrder = async (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('orders').doc(id).set({
      ...record,
      status: 'pending',
      windowSnapshots,
      tenantId
    });
    await loadData();
  };

  // Complete order
  const completeOrder = async (orderId: string, windowResults: WindowResult[]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.windowSnapshots) return;

    const totalConsumed = windowResults.reduce((sum, r) => sum + r.consumed, 0);
    const loss = totalConsumed - order.amount;

    await db.collection('orders').doc(orderId).update({
      status: 'completed',
      windowResults,
      totalConsumed,
      loss: loss > 0 ? loss : 0
    });

    for (const result of windowResults) {
      await db.collection('cloudWindows').doc(result.windowId).update({
        goldBalance: result.endBalance
      });
    }
    await loadData();
  };

  // Delete purchase
  const deletePurchase = async (id: string) => {
    await db.collection('purchases').doc(id).remove();
    await loadData();
  };

  // Delete order
  const deleteOrder = async (id: string) => {
    await db.collection('orders').doc(id).remove();
    await loadData();
  };

  // Delete staff
  const deleteStaff = async (id: string) => {
    console.log('deleteStaff called with id:', id);
    try {
      const result = await db.collection('staff').doc(id).remove();
      console.log('Delete result:', result);
      await loadData();
      console.log('Data reloaded after delete');
    } catch (error) {
      console.error('Delete staff failed:', error);
    }
  };

  // Save settings - 按 tenantId 保存
  const saveSettings = async (newSettings: Settings) => {
    if (!tenantId) return;
    await db.collection('config').doc(`settings_${tenantId}`).set({ ...newSettings, tenantId });
    setSettings(newSettings);
  };

  // Kook Channels - 带 tenantId
  const addKookChannel = async (channel: Omit<KookChannel, 'id'>) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('kookChannels').doc(id).set({ ...channel, tenantId });
    await loadData();
  };

  const deleteKookChannel = async (id: string) => {
    await db.collection('kookChannels').doc(id).remove();
    await loadData();
  };

  // Cloud Machines - 带 tenantId
  const addCloudMachine = async (machine: Omit<CloudMachine, 'id'>) => {
    if (!tenantId) return '';
    const id = generateId();
    await db.collection('cloudMachines').doc(id).set({ ...machine, tenantId });
    await loadData();
    return id;
  };

  const deleteCloudMachine = async (id: string) => {
    await db.collection('cloudMachines').doc(id).remove();
    const windows = cloudWindows.filter(w => w.machineId === id);
    for (const w of windows) {
      await db.collection('cloudWindows').doc(w.id).remove();
    }
    await loadData();
  };

  const updateCloudMachine = async (id: string, data: Partial<CloudMachine>) => {
    await db.collection('cloudMachines').doc(id).update(data);
    await loadData();
  };

  // Cloud Windows - 带 tenantId
  const addCloudWindow = async (window: Omit<CloudWindow, 'id'>) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('cloudWindows').doc(id).set({ ...window, tenantId });
    await loadData();
  };

  const deleteCloudWindow = async (id: string) => {
    await db.collection('cloudWindows').doc(id).remove();
    await loadData();
  };

  const assignWindow = async (windowId: string, userId: string | null) => {
    await db.collection('cloudWindows').doc(windowId).update({ userId });
    await loadData();
  };

  const updateWindowGold = async (windowId: string, goldBalance: number) => {
    await db.collection('cloudWindows').doc(windowId).update({ goldBalance });
    await loadData();
  };

  // 暂停订单
  const pauseOrder = async (orderId: string, completedAmount: number) => {
    await db.collection('orders').doc(orderId).update({
      status: 'paused',
      completedAmount
    });
    await loadData();
  };

  // 恢复订单（给原员工或转派给其他员工）
  const resumeOrder = async (orderId: string, newStaffId?: string) => {
    const updateData: any = { status: 'pending' };
    if (newStaffId) {
      updateData.staffId = newStaffId;
    }
    await db.collection('orders').doc(orderId).update(updateData);
    await loadData();
  };

  // 员工申请窗口
  const createWindowRequest = async (staffId: string, staffName: string, type: 'apply' | 'release', windowId?: string) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('windowRequests').doc(id).set({
      staffId,
      staffName,
      type,
      windowId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId
    });
    await loadData();
  };

  // 管理员审批窗口申请
  const processWindowRequest = async (requestId: string, approved: boolean, adminId: string, windowId?: string) => {
    const request = windowRequests.find(r => r.id === requestId);
    if (!request) return;

    await db.collection('windowRequests').doc(requestId).update({
      status: approved ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: adminId
    });

    if (approved) {
      if (request.type === 'apply' && windowId) {
        // 分配窗口给员工
        await db.collection('cloudWindows').doc(windowId).update({ userId: request.staffId });
      } else if (request.type === 'release' && request.windowId) {
        // 释放窗口
        await db.collection('cloudWindows').doc(request.windowId).update({ userId: null });
      }
    }
    await loadData();
  };

  // 窗口充值（带记录）
  const rechargeWindow = async (windowId: string, amount: number, operatorId: string) => {
    if (!tenantId) return;
    const window = cloudWindows.find(w => w.id === windowId);
    if (!window) return;

    const balanceBefore = window.goldBalance;
    const balanceAfter = balanceBefore + amount;

    // 更新窗口余额
    await db.collection('cloudWindows').doc(windowId).update({ goldBalance: balanceAfter });

    // 记录充值历史
    const id = generateId();
    await db.collection('windowRecharges').doc(id).set({
      windowId,
      amount,
      balanceBefore,
      balanceAfter,
      createdAt: new Date().toISOString(),
      createdBy: operatorId,
      tenantId
    });
    await loadData();
  };

  return {
    purchases,
    orders,
    staffList,
    settings,
    kookChannels,
    cloudMachines,
    cloudWindows,
    windowRequests,
    loading,
    addPurchase,
    addOrder,
    completeOrder,
    deletePurchase,
    deleteOrder,
    deleteStaff,
    saveSettings,
    addKookChannel,
    deleteKookChannel,
    addCloudMachine,
    deleteCloudMachine,
    updateCloudMachine,
    addCloudWindow,
    deleteCloudWindow,
    assignWindow,
    updateWindowGold,
    pauseOrder,
    resumeOrder,
    createWindowRequest,
    processWindowRequest,
    rechargeWindow,
    refreshData: loadData
  };
}
