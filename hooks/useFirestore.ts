import { useState, useEffect } from 'react';
import { db } from '../cloudbase';
import { PurchaseRecord, OrderRecord, Staff, Settings, KookChannel, CloudMachine, CloudWindow, WindowSnapshot, WindowResult } from '../types';

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
      const [purchasesRes, ordersRes, staffRes, settingsRes, kookRes, machinesRes, windowsRes] = await Promise.all([
        db.collection('purchases').where({ tenantId }).get(),
        db.collection('orders').where({ tenantId }).get(),
        db.collection('staff').where({ tenantId }).get(),
        db.collection('config').doc(`settings_${tenantId}`).get(),
        db.collection('kookChannels').where({ tenantId }).get(),
        db.collection('cloudMachines').where({ tenantId }).get(),
        db.collection('cloudWindows').where({ tenantId }).get()
      ]);
      console.log('Data fetch complete');

      setPurchases(purchasesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setOrders(ordersRes.data.map((d: any) => ({ id: d._id, ...d })));
      setStaffList(staffRes.data.map((d: any) => ({ id: d._id, ...d })));
      setKookChannels(kookRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudMachines(machinesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudWindows(windowsRes.data.map((d: any) => ({ id: d._id, ...d })));
      
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
    if (tenantId) {
      loadData();
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
    await db.collection('staff').doc(id).remove();
    await loadData();
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

  return {
    purchases,
    orders,
    staffList,
    settings,
    kookChannels,
    cloudMachines,
    cloudWindows,
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
    refreshData: loadData
  };
}
