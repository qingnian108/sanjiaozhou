import { useState, useEffect } from 'react';
import { db } from '../cloudbase';
import { PurchaseRecord, OrderRecord, Staff, Settings, KookChannel, CloudMachine, CloudWindow, WindowSnapshot, WindowResult } from '../types';

const DEFAULT_SETTINGS: Settings = {
  employeeCostRate: 12,
  orderUnitPrice: 60,
  defaultFeePercent: 7,
  initialCapital: 10000
};

export function useFirestore() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [kookChannels, setKookChannels] = useState<KookChannel[]>([]);
  const [cloudMachines, setCloudMachines] = useState<CloudMachine[]>([]);
  const [cloudWindows, setCloudWindows] = useState<CloudWindow[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载数据的函数
  const loadData = async () => {
    try {
      const [purchasesRes, ordersRes, staffRes, settingsRes, kookRes, machinesRes, windowsRes] = await Promise.all([
        db.collection('purchases').get(),
        db.collection('orders').get(),
        db.collection('staff').get(),
        db.collection('config').doc('settings').get(),
        db.collection('kookChannels').get(),
        db.collection('cloudMachines').get(),
        db.collection('cloudWindows').get()
      ]);

      setPurchases(purchasesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setOrders(ordersRes.data.map((d: any) => ({ id: d._id, ...d })));
      setStaffList(staffRes.data.map((d: any) => ({ id: d._id, ...d })));
      setKookChannels(kookRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudMachines(machinesRes.data.map((d: any) => ({ id: d._id, ...d })));
      setCloudWindows(windowsRes.data.map((d: any) => ({ id: d._id, ...d })));
      
      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0] as Settings);
      }
    } catch (error) {
      console.error('Load data failed:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // CloudBase 实时监听
    const watchers: any[] = [];

    watchers.push(
      db.collection('purchases').watch({
        onChange: (snapshot: any) => {
          setPurchases(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch purchases error:', err)
      })
    );

    watchers.push(
      db.collection('orders').watch({
        onChange: (snapshot: any) => {
          setOrders(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch orders error:', err)
      })
    );

    watchers.push(
      db.collection('staff').watch({
        onChange: (snapshot: any) => {
          setStaffList(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch staff error:', err)
      })
    );

    watchers.push(
      db.collection('kookChannels').watch({
        onChange: (snapshot: any) => {
          setKookChannels(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch kookChannels error:', err)
      })
    );

    watchers.push(
      db.collection('cloudMachines').watch({
        onChange: (snapshot: any) => {
          setCloudMachines(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch cloudMachines error:', err)
      })
    );

    watchers.push(
      db.collection('cloudWindows').watch({
        onChange: (snapshot: any) => {
          setCloudWindows(snapshot.docs.map((d: any) => ({ id: d._id, ...d })));
        },
        onError: (err: any) => console.error('Watch cloudWindows error:', err)
      })
    );

    return () => {
      watchers.forEach(w => w.close());
    };
  }, []);

  // 生成唯一ID
  const generateId = () => crypto.randomUUID();

  // Add purchase
  const addPurchase = async (record: Omit<PurchaseRecord, 'id'>) => {
    const id = generateId();
    await db.collection('purchases').doc(id).set(record);
    await loadData();
  };

  // Add order
  const addOrder = async (record: Omit<OrderRecord, 'id'>, windowSnapshots: WindowSnapshot[]) => {
    const id = generateId();
    await db.collection('orders').doc(id).set({
      ...record,
      status: 'pending',
      windowSnapshots
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

    // 更新每个窗口的哈佛币余额
    for (const result of windowResults) {
      await db.collection('cloudWindows').doc(result.windowId).update({
        goldBalance: result.endBalance
      });
    }
    await loadData();
  };

  // Add staff
  const addStaff = async (name: string) => {
    const id = generateId();
    await db.collection('staff').doc(id).set({
      name,
      joinedDate: new Date().toISOString().split('T')[0]
    });
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

  // Save settings
  const saveSettings = async (newSettings: Settings) => {
    await db.collection('config').doc('settings').set(newSettings);
    setSettings(newSettings);
  };

  // Kook Channels
  const addKookChannel = async (channel: Omit<KookChannel, 'id'>) => {
    const id = generateId();
    await db.collection('kookChannels').doc(id).set(channel);
    await loadData();
  };

  const deleteKookChannel = async (id: string) => {
    await db.collection('kookChannels').doc(id).remove();
    await loadData();
  };

  // Cloud Machines
  const addCloudMachine = async (machine: Omit<CloudMachine, 'id'>) => {
    const id = generateId();
    await db.collection('cloudMachines').doc(id).set(machine);
    await loadData();
    return id;
  };

  const deleteCloudMachine = async (id: string) => {
    await db.collection('cloudMachines').doc(id).remove();
    // 删除该云机的所有窗口
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

  // Cloud Windows
  const addCloudWindow = async (window: Omit<CloudWindow, 'id'>) => {
    const id = generateId();
    await db.collection('cloudWindows').doc(id).set(window);
    await loadData();
  };

  const deleteCloudWindow = async (id: string) => {
    await db.collection('cloudWindows').doc(id).remove();
    await loadData();
  };

  const assignWindow = async (windowId: string, oderId: string | null) => {
    await db.collection('cloudWindows').doc(windowId).update({ userId: oderId });
    await loadData();
  };

  const updateWindowGold = async (windowId: string, goldBalance: number) => {
    await db.collection('cloudWindows').doc(windowId).update({ goldBalance });
    await loadData();
  };

  // Migrate from localStorage
  const migrateFromLocalStorage = async () => {
    const localPurchases = localStorage.getItem('purchases');
    if (localPurchases) {
      const items = JSON.parse(localPurchases) as PurchaseRecord[];
      for (const item of items) {
        await db.collection('purchases').doc(item.id).set({
          date: item.date,
          amount: item.amount,
          cost: item.cost
        });
      }
    }

    const localOrders = localStorage.getItem('orders');
    if (localOrders) {
      const items = JSON.parse(localOrders) as OrderRecord[];
      for (const item of items) {
        await db.collection('orders').doc(item.id).set({
          date: item.date,
          staffId: item.staffId,
          amount: item.amount,
          loss: item.loss,
          feePercent: item.feePercent,
          unitPrice: item.unitPrice
        });
      }
    }

    const localStaff = localStorage.getItem('staffList');
    if (localStaff) {
      const items = JSON.parse(localStaff) as Staff[];
      for (const item of items) {
        await db.collection('staff').doc(item.id).set({
          name: item.name,
          joinedDate: item.joinedDate
        });
      }
    }

    const localSettings = localStorage.getItem('settings');
    if (localSettings) {
      await db.collection('config').doc('settings').set(JSON.parse(localSettings));
    }

    // Clear localStorage
    localStorage.removeItem('purchases');
    localStorage.removeItem('orders');
    localStorage.removeItem('staffList');
    localStorage.removeItem('settings');

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
    addStaff,
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
    migrateFromLocalStorage,
    refreshData: loadData
  };
}
