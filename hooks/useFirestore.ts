import { useState, useEffect, useCallback } from 'react';
import { dataApi, staffApi, settingsApi } from '../api';
import { PurchaseRecord, OrderRecord, Staff, Settings, KookChannel, CloudMachine, CloudWindow, WindowSnapshot, WindowResult, WindowRequest } from '../types';

const DEFAULT_SETTINGS: Settings = {
  employeeCostRate: 12,
  orderUnitPrice: 60,
  defaultFeePercent: 5,
  initialCapital: 10000
};

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

  const loadData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      const [purchasesRes, ordersRes, staffRes, settingsRes, kookRes, machinesRes, windowsRes, requestsRes] = await Promise.all([
        dataApi.list('purchases', tenantId),
        dataApi.list('orders', tenantId),
        staffApi.list(tenantId),
        settingsApi.get(tenantId),
        dataApi.list('kookChannels', tenantId),
        dataApi.list('cloudMachines', tenantId),
        dataApi.list('cloudWindows', tenantId),
        dataApi.list('windowRequests', tenantId)
      ]);

      if (purchasesRes.success) setPurchases(purchasesRes.data || []);
      if (ordersRes.success) setOrders(ordersRes.data || []);
      if (staffRes.success) setStaffList(staffRes.data || []);
      if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
      if (kookRes.success) setKookChannels(kookRes.data || []);
      if (machinesRes.success) setCloudMachines(machinesRes.data || []);
      if (windowsRes.success) setCloudWindows(windowsRes.data || []);
      if (requestsRes.success) setWindowRequests(requestsRes.data || []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadData();
    // 轮询刷新数据（简单的实时同步替代方案）
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 采购记录
  const addPurchase = async (record: Omit<PurchaseRecord, 'id'>) => {
    if (!tenantId) return;
    await dataApi.add('purchases', { ...record, tenantId });
    await loadData();
  };

  const deletePurchase = async (id: string) => {
    await dataApi.delete('purchases', id);
    await loadData();
  };

  const updatePurchase = async (id: string, data: Partial<PurchaseRecord>) => {
    await dataApi.update('purchases', id, data);
    await loadData();
  };

  // 订单
  const addOrder = async (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => {
    if (!tenantId) return;
    await dataApi.add('orders', { ...record, status: 'pending', windowSnapshots, tenantId });
    await loadData();
  };

  const completeOrder = async (orderId: string, windowResults: WindowResult[]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.windowSnapshots) return;

    const totalConsumed = windowResults.reduce((sum, r) => sum + r.consumed, 0);
    const orderAmountInCoins = order.amount * 10000;
    const loss = totalConsumed - orderAmountInCoins;

    const currentStaff = staffList.find(s => s.id === order.staffId);
    const staffName = currentStaff?.name || '未知';
    const previousCompleted = order.executionHistory?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const thisExecutionAmount = order.amount - previousCompleted;

    let executionHistory = order.executionHistory || [];
    if (thisExecutionAmount > 0) {
      executionHistory = [...executionHistory, {
        staffId: order.staffId,
        staffName,
        amount: thisExecutionAmount,
        startTime: order.executionHistory?.length ? new Date().toISOString() : order.date,
        endTime: new Date().toISOString()
      }];
    }

    await dataApi.update('orders', orderId, {
      ...order,
      status: 'completed',
      windowResults,
      totalConsumed,
      loss: loss > 0 ? loss : 0,
      executionHistory
    });

    for (const result of windowResults) {
      const window = cloudWindows.find(w => w.id === result.windowId);
      if (window) {
        await dataApi.update('cloudWindows', result.windowId, { ...window, goldBalance: result.endBalance });
      }
    }
    await loadData();
  };

  const deleteOrder = async (id: string) => {
    await dataApi.delete('orders', id);
    await loadData();
  };

  const pauseOrder = async (orderId: string, completedAmount: number): Promise<boolean> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const currentStaff = staffList.find(s => s.id === order.staffId);
    const staffName = currentStaff?.name || '未知';
    const previousCompleted = order.executionHistory?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const thisExecutionAmount = completedAmount - previousCompleted;

    const newExecution = {
      staffId: order.staffId,
      staffName,
      amount: thisExecutionAmount > 0 ? thisExecutionAmount : completedAmount,
      startTime: order.executionHistory?.length ? new Date().toISOString() : order.date,
      endTime: new Date().toISOString()
    };

    const executionHistory = [...(order.executionHistory || []), newExecution];

    await dataApi.update('orders', orderId, { ...order, status: 'paused', completedAmount, executionHistory });
    await loadData();
    return true;
  };

  const resumeOrder = async (orderId: string, newStaffId?: string): Promise<boolean> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const updateData: any = { ...order, status: 'pending' };
    if (newStaffId && newStaffId !== order.staffId) {
      updateData.staffId = newStaffId;
      updateData.remainingAmount = order.amount - (order.completedAmount || 0);
    }

    await dataApi.update('orders', orderId, updateData);
    await loadData();
    return true;
  };

  // 员工
  const deleteStaff = async (id: string) => {
    await staffApi.delete(id);
    await loadData();
  };

  // 设置
  const saveSettings = async (newSettings: Settings) => {
    if (!tenantId) return;
    await settingsApi.save(tenantId, newSettings);
    setSettings(newSettings);
  };

  // Kook 频道
  const addKookChannel = async (channel: Omit<KookChannel, 'id'>) => {
    if (!tenantId) return;
    await dataApi.add('kookChannels', { ...channel, tenantId });
    await loadData();
  };

  const deleteKookChannel = async (id: string) => {
    await dataApi.delete('kookChannels', id);
    await loadData();
  };

  // 云机
  const addCloudMachine = async (machine: Omit<CloudMachine, 'id'>) => {
    if (!tenantId) return '';
    const res = await dataApi.add('cloudMachines', { ...machine, tenantId });
    await loadData();
    return res.id || '';
  };

  const batchPurchase = async (
    machine: Omit<CloudMachine, 'id'>,
    windows: { windowNumber: string; goldBalance: number }[],
    purchase?: Omit<PurchaseRecord, 'id'>
  ) => {
    if (!tenantId) return '';
    
    const machineRes = await dataApi.add('cloudMachines', { ...machine, tenantId });
    const machineId = machineRes.id;

    for (const w of windows) {
      await dataApi.add('cloudWindows', {
        machineId,
        windowNumber: w.windowNumber,
        goldBalance: w.goldBalance,
        userId: null,
        tenantId
      });
    }

    if (purchase) {
      await dataApi.add('purchases', { ...purchase, tenantId });
    }

    await loadData();
    return machineId;
  };

  const deleteCloudMachine = async (id: string) => {
    await dataApi.delete('cloudMachines', id);
    const windows = cloudWindows.filter(w => w.machineId === id);
    for (const w of windows) {
      await dataApi.delete('cloudWindows', w.id);
    }
    await loadData();
  };

  const updateCloudMachine = async (id: string, data: Partial<CloudMachine>) => {
    const machine = cloudMachines.find(m => m.id === id);
    if (machine) {
      await dataApi.update('cloudMachines', id, { ...machine, ...data });
      await loadData();
    }
  };

  // 云窗口
  const addCloudWindow = async (window: Omit<CloudWindow, 'id'>) => {
    if (!tenantId) return;
    await dataApi.add('cloudWindows', { ...window, tenantId });
    await loadData();
  };

  const deleteCloudWindow = async (id: string) => {
    await dataApi.delete('cloudWindows', id);
    await loadData();
  };

  const assignWindow = async (windowId: string, userId: string | null) => {
    const window = cloudWindows.find(w => w.id === windowId);
    if (window) {
      await dataApi.update('cloudWindows', windowId, { ...window, userId });
      await loadData();
    }
  };

  const updateWindowGold = async (windowId: string, goldBalance: number) => {
    const window = cloudWindows.find(w => w.id === windowId);
    if (window) {
      await dataApi.update('cloudWindows', windowId, { ...window, goldBalance });
      await loadData();
    }
  };

  // 窗口申请
  const createWindowRequest = async (staffId: string, staffName: string, type: 'apply' | 'release', windowId?: string) => {
    if (!tenantId) return;
    await dataApi.add('windowRequests', {
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

  const processWindowRequest = async (requestId: string, approved: boolean, adminId: string) => {
    const request = windowRequests.find(r => r.id === requestId);
    if (!request) return;

    await dataApi.update('windowRequests', requestId, {
      ...request,
      status: approved ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: adminId
    });

    if (approved && request.windowId) {
      const window = cloudWindows.find(w => w.id === request.windowId);
      if (window) {
        if (request.type === 'apply') {
          await dataApi.update('cloudWindows', request.windowId, { ...window, userId: request.staffId });
        } else if (request.type === 'release') {
          await dataApi.update('cloudWindows', request.windowId, { ...window, userId: null });
        }
      }
    }
    await loadData();
  };

  const rechargeWindow = async (windowId: string, amount: number, operatorId: string, cost?: number) => {
    if (!tenantId) return;
    const window = cloudWindows.find(w => w.id === windowId);
    if (!window) return;

    const balanceAfter = window.goldBalance + amount;
    await dataApi.update('cloudWindows', windowId, { ...window, goldBalance: balanceAfter });
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
    updatePurchase,
    deleteOrder,
    deleteStaff,
    saveSettings,
    addKookChannel,
    deleteKookChannel,
    addCloudMachine,
    batchPurchase,
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
