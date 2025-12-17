import { useState, useEffect } from 'react';
import { db } from '../cloudbase';
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

  const generateId = () => crypto.randomUUID();

  // 通用更新函数
  const updateDocument = async (collection: string, id: string, data: any) => {
    try {
      console.log(`=== updateDocument: ${collection}/${id} ===`);
      console.log('Update data:', data);
      
      // 清理数据
      const cleanData: any = {};
      for (const key of Object.keys(data)) {
        if (!key.startsWith('_') && key !== 'id') {
          cleanData[key] = data[key];
        }
      }
      
      // 使用 doc().update()
      const result = await db.collection(collection).doc(id).update(cleanData);
      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error(`Update error:`, error);
      return { updated: 0, error };
    }
  };

  // 加载数据的函数 - 按 tenantId 过滤
  const loadData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    try {
      // 分开请求，避免某个集合不存在导致全部失败
      const [purchasesRes, ordersRes, staffRes, settingsRes, kookRes, machinesRes, windowsRes] = await Promise.all([
        db.collection('purchases').where({ tenantId }).get().catch(() => ({ data: [] })),
        db.collection('orders').where({ tenantId }).get().catch(() => ({ data: [] })),
        db.collection('staff').where({ tenantId }).get().catch(() => ({ data: [] })),
        db.collection('config').doc(`settings_${tenantId}`).get().catch(() => ({ data: [] })),
        db.collection('kookChannels').where({ tenantId }).get().catch(() => ({ data: [] })),
        db.collection('cloudMachines').where({ tenantId }).get().catch(() => ({ data: [] })),
        db.collection('cloudWindows').where({ tenantId }).get().catch(() => ({ data: [] }))
      ]);
      
      // windowRequests 单独请求，因为可能不存在
      let requestsRes = { data: [] };
      try {
        requestsRes = await db.collection('windowRequests').where({ tenantId }).get();
      } catch (e) {
        console.log('windowRequests collection may not exist');
      }

      setPurchases((purchasesRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setOrders((ordersRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setStaffList((staffRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setKookChannels((kookRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setCloudMachines((machinesRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setCloudWindows((windowsRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      setWindowRequests((requestsRes.data || []).map((d: any) => ({ id: d._id, ...d })));
      
      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0] as Settings);
      }
    } catch (error) {
      console.error('Load data failed:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  // Add purchase
  const addPurchase = async (record: Omit<PurchaseRecord, 'id'>) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('purchases').doc(id).set({ ...record, tenantId });
    await loadData();
  };

  // Add order
  const addOrder = async (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => {
    if (!tenantId) return;
    const id = generateId();
    await db.collection('orders').doc(id).set({
      ...record,
      id, // 保存 id 字段用于后续更新
      status: 'pending',
      windowSnapshots,
      tenantId
    });
    await loadData();
  };

  // Complete order - 记录最后执行者的执行历史
  const completeOrder = async (orderId: string, windowResults: WindowResult[]) => {
    const order = orders.find((o: OrderRecord) => o.id === orderId);
    if (!order || !order.windowSnapshots) return;

    const totalConsumed = windowResults.reduce((sum, r) => sum + r.consumed, 0);
    const loss = totalConsumed - order.amount;

    // 获取当前员工信息
    const currentStaff = staffList.find(s => s.id === order.staffId);
    const staffName = currentStaff?.name || '未知';

    // 计算本次执行的金额
    const previousCompleted = order.executionHistory?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const thisExecutionAmount = order.amount - previousCompleted;

    // 添加最后执行记录（如果有剩余金额）
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

    await updateDocument('orders', orderId, {
      status: 'completed',
      windowResults,
      totalConsumed,
      loss: loss > 0 ? loss : 0,
      executionHistory
    });

    for (const result of windowResults) {
      await updateDocument('cloudWindows', result.windowId, {
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

  // Update purchase
  const updatePurchase = async (id: string, data: Partial<PurchaseRecord>) => {
    await updateDocument('purchases', id, data);
    await loadData();
  };

  // Delete order
  const deleteOrder = async (id: string) => {
    await db.collection('orders').doc(id).remove();
    await loadData();
  };

  // Delete staff
  const deleteStaff = async (id: string) => {
    try {
      await db.collection('staff').doc(id).remove();
      await loadData();
    } catch (error) {
      console.error('Delete staff failed:', error);
    }
  };

  // Save settings
  const saveSettings = async (newSettings: Settings) => {
    if (!tenantId) return;
    await db.collection('config').doc(`settings_${tenantId}`).set({ ...newSettings, tenantId });
    setSettings(newSettings);
  };

  // Kook Channels
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

  // Cloud Machines
  const addCloudMachine = async (machine: Omit<CloudMachine, 'id'>) => {
    if (!tenantId) return '';
    const id = generateId();
    await db.collection('cloudMachines').doc(id).set({ ...machine, tenantId });
    await loadData();
    return id;
  };

  // 批量采购云机（一次性创建云机+窗口+采购记录，只刷新一次）
  const batchPurchase = async (
    machine: Omit<CloudMachine, 'id'>,
    windows: { windowNumber: string; goldBalance: number }[],
    purchase?: Omit<PurchaseRecord, 'id'>
  ) => {
    if (!tenantId) return '';
    
    // 创建云机
    const machineId = generateId();
    await db.collection('cloudMachines').doc(machineId).set({ ...machine, tenantId });
    
    // 创建窗口
    for (const w of windows) {
      const windowId = generateId();
      await db.collection('cloudWindows').doc(windowId).set({
        machineId,
        windowNumber: w.windowNumber,
        goldBalance: w.goldBalance,
        userId: null,
        tenantId
      });
    }
    
    // 记录采购
    if (purchase) {
      const purchaseId = generateId();
      await db.collection('purchases').doc(purchaseId).set({ ...purchase, tenantId });
    }
    
    // 只刷新一次
    await loadData();
    return machineId;
  };

  const deleteCloudMachine = async (id: string) => {
    await db.collection('cloudMachines').doc(id).remove();
    const windows = cloudWindows.filter((w: CloudWindow) => w.machineId === id);
    for (const w of windows) {
      await db.collection('cloudWindows').doc(w.id).remove();
    }
    await loadData();
  };

  const updateCloudMachine = async (id: string, data: Partial<CloudMachine>) => {
    await updateDocument('cloudMachines', id, data);
    await loadData();
  };

  // Cloud Windows
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
    await updateDocument('cloudWindows', windowId, { userId });
    await loadData();
  };

  const updateWindowGold = async (windowId: string, goldBalance: number) => {
    await updateDocument('cloudWindows', windowId, { goldBalance });
    await loadData();
  };

  // 暂停订单 - 记录当前员工的执行历史
  const pauseOrder = async (orderId: string, completedAmount: number): Promise<boolean> => {
    console.log('=== pauseOrder START ===');
    console.log('orderId:', orderId, 'completedAmount:', completedAmount);
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found');
      return false;
    }
    
    // 获取当前员工信息
    const currentStaff = staffList.find(s => s.id === order.staffId);
    const staffName = currentStaff?.name || '未知';
    
    // 计算本次执行的金额（当前完成 - 之前已完成）
    const previousCompleted = order.executionHistory?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const thisExecutionAmount = completedAmount - previousCompleted;
    
    // 添加执行记录
    const newExecution = {
      staffId: order.staffId,
      staffName,
      amount: thisExecutionAmount > 0 ? thisExecutionAmount : completedAmount,
      startTime: order.executionHistory?.length ? new Date().toISOString() : order.date,
      endTime: new Date().toISOString()
    };
    
    const executionHistory = [...(order.executionHistory || []), newExecution];
    
    try {
      const result = await updateDocument('orders', orderId, {
        status: 'paused',
        completedAmount,
        executionHistory
      });
      console.log('Pause order result:', result);
      
      if (result.updated > 0) {
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('pauseOrder error:', error);
      return false;
    }
  };

  // 恢复订单 - 转派时更新 staffId，保留执行历史
  const resumeOrder = async (orderId: string, newStaffId?: string): Promise<boolean> => {
    console.log('=== resumeOrder START ===');
    console.log('orderId:', orderId, 'newStaffId:', newStaffId);
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found');
      return false;
    }
    
    const updateData: any = { status: 'pending' };
    
    // 如果转派给新员工
    if (newStaffId && newStaffId !== order.staffId) {
      updateData.staffId = newStaffId;
      // 剩余金额 = 总金额 - 已完成金额
      updateData.remainingAmount = order.amount - (order.completedAmount || 0);
    }
    
    try {
      const result = await updateDocument('orders', orderId, updateData);
      console.log('Resume order result:', result);
      
      if (result.updated > 0) {
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('resumeOrder error:', error);
      return false;
    }
  };

  // 员工申请窗口
  const createWindowRequest = async (staffId: string, staffName: string, type: 'apply' | 'release', windowId?: string) => {
    if (!tenantId) return;
    const id = generateId();
    console.log('=== createWindowRequest ===');
    console.log('staffId:', staffId, 'staffName:', staffName, 'type:', type, 'windowId:', windowId);
    try {
      const result = await db.collection('windowRequests').doc(id).set({
        id, // 保存 id 字段
        staffId,
        staffName,
        type,
        windowId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        tenantId
      });
      console.log('Create request result:', result);
      await loadData();
    } catch (error) {
      console.error('Create request error:', error);
    }
  };

  // 管理员审批窗口申请
  const processWindowRequest = async (requestId: string, approved: boolean, adminId: string) => {
    const request = windowRequests.find((r: WindowRequest) => r.id === requestId);
    if (!request) return;

    await updateDocument('windowRequests', requestId, {
      status: approved ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: adminId
    });

    if (approved && request.windowId) {
      if (request.type === 'apply') {
        await updateDocument('cloudWindows', request.windowId, { userId: request.staffId });
      } else if (request.type === 'release') {
        await updateDocument('cloudWindows', request.windowId, { userId: null });
      }
    }
    await loadData();
  };

  // 窗口充值
  const rechargeWindow = async (windowId: string, amount: number, operatorId: string) => {
    if (!tenantId) return;
    const window = cloudWindows.find((w: CloudWindow) => w.id === windowId);
    if (!window) return;

    const balanceBefore = window.goldBalance;
    const balanceAfter = balanceBefore + amount;

    await updateDocument('cloudWindows', windowId, { goldBalance: balanceAfter });

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
