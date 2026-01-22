import React, { useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, Settings as SettingsIcon, Hexagon, Users, MessageSquare, Monitor, LogOut, UserPlus, Wallet, Phone } from 'lucide-react';
import { calculateStats } from './utils';
import { useFirestore } from './hooks/useFirestore';
import { CloudWindow } from './types';
import { useAuth } from './hooks/useAuth';
import { contactApi } from './api';

// Pages
import { Dashboard } from './components/Dashboard';
import { Dispatch } from './components/Dispatch';
import { SettingsPage } from './components/Settings';
import { StaffManager } from './components/StaffManager';
import { KookChannels } from './components/KookChannels';
import { CloudMachines } from './components/CloudMachines';
import { Login } from './components/Login';
import { StaffPortal } from './components/StaffPortal';
import { Friends } from './components/Friends';
import { Billing } from './components/Billing';
import { SuperAdmin } from './components/SuperAdmin';

const NAV_ITEMS = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/dispatch', label: '派单', icon: Send, glow: true },
  { path: '/cloud', label: '云机', icon: Monitor },
  { path: '/staff', label: '员工', icon: Users },
  { path: '/friends', label: '好友', icon: UserPlus },
  { path: '/kook', label: 'Kook', icon: MessageSquare },
  { path: '/billing', label: '账户', icon: Wallet },
  { path: '/settings', label: '设置', icon: SettingsIcon },
];

// 客服导航项（隐藏敏感页面）
const DISPATCHER_NAV_ITEMS = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/dispatch', label: '派单', icon: Send, glow: true },
  { path: '/cloud', label: '云机', icon: Monitor },
  { path: '/staff', label: '员工', icon: Users },
  { path: '/kook', label: 'Kook', icon: MessageSquare },
];

const Navigation = ({ 
  onLogout, 
  isDispatcher = false,
  tenantId,
  tenantName,
  onShowContact
}: { 
  onLogout: () => void; 
  isDispatcher?: boolean;
  tenantId?: string;
  tenantName?: string;
  onShowContact?: () => void;
}) => {
  const location = useLocation();
  const navItems = isDispatcher ? DISPATCHER_NAV_ITEMS : NAV_ITEMS;
  
  return (
    <nav className="fixed bottom-0 left-0 w-full md:w-32 md:h-screen md:top-0 bg-cyber-panel border-t md:border-t-0 md:border-r border-cyber-primary/20 z-50 flex md:flex-col justify-around md:justify-start py-2 md:py-6 backdrop-blur-md">
      <div className="hidden md:flex justify-center mb-8">
        <Hexagon className="text-cyber-primary animate-pulse-slow drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" size={48} />
      </div>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        const hasGlow = (item as any).glow;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center justify-center p-3 md:py-5 transition-all duration-300 relative group
              ${isActive ? 'text-cyber-primary' : hasGlow ? 'text-cyber-accent hover:text-cyber-primary' : 'text-gray-500 hover:text-gray-300'}
              ${hasGlow && !isActive ? 'animate-pulse' : ''}`}
          >
            <div className={`relative ${isActive ? 'drop-shadow-[0_0_12px_rgba(0,243,255,0.8)]' : hasGlow ? 'drop-shadow-[0_0_15px_rgba(255,200,0,0.8)]' : ''}`}>
              <Icon size={32} className={`mb-2 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            </div>
            <span className={`text-sm font-bold tracking-wide hidden md:block ${hasGlow && !isActive ? 'text-cyber-accent' : ''}`}>{item.label}</span>
            {isActive && <div className="absolute top-0 right-0 w-1 h-full bg-cyber-primary shadow-[0_0_15px_#00f3ff] hidden md:block"></div>}
            {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-cyber-primary shadow-[0_0_15px_#00f3ff] md:hidden"></div>}
          </Link>
        );
      })}
      {/* 联系定制按钮 */}
      {onShowContact && (
        <button
          onClick={onShowContact}
          className="flex flex-col items-center justify-center p-3 md:py-5 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Phone size={32} className="mb-2" />
          <span className="text-sm font-bold tracking-wide hidden md:block">定制</span>
        </button>
      )}
      <button
        onClick={onLogout}
        className="flex flex-col items-center justify-center p-3 md:py-5 md:mt-auto text-gray-500 hover:text-red-400 transition-colors"
      >
        <LogOut size={32} className="mb-2" />
        <span className="text-sm font-bold tracking-wide hidden md:block">退出</span>
      </button>
    </nav>
  );
};

const AdminApp: React.FC<{ 
  tenantId: string;
  tenantName: string;
  username: string;
  onLogout: () => void; 
  onCreateStaff: (username: string, password: string, name: string) => Promise<void>;
  onSuperLogin?: (superUser: any) => void;
  onLoginAsStaff?: (staffId: string, staffName: string) => void;
}> = ({ tenantId, tenantName, username, onLogout, onCreateStaff, onSuperLogin, onLoginAsStaff }) => {
  const {
    purchases,
    orders,
    staffList,
    settings,
    kookChannels,
    cloudMachines,
    cloudWindows,
    windowRequests,
    clockRecords,
    loading,
    addPurchase,
    addOrder,
    deletePurchase,
    updatePurchase,
    deleteOrder,
    deleteStaff,
    saveSettings,
    addKookChannel,
    deleteKookChannel,
    updateKookChannel,
    addCloudMachine,
    batchPurchase,
    deleteCloudMachine,
    updateCloudMachine,
    addCloudWindow,
    deleteCloudWindow,
    assignWindow,
    updateWindowGold,
    updateWindowNumber,
    resumeOrder,
    processWindowRequest,
    rechargeWindow,
    refreshData,
    completeOrder,
    completePartialOrder,
    releaseOrderWindow,
    addWindowToOrder,
    revertOrder
  } = useFirestore(tenantId);

  // 包装创建员工函数，创建后刷新数据
  const handleCreateStaff = async (username: string, password: string, name: string) => {
    await onCreateStaff(username, password, name);
    await refreshData();
  };

  const stats = useMemo(() => {
    return calculateStats(purchases, orders, settings);
  }, [purchases, orders, settings]);

  // 确认弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // 联系定制弹窗状态
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ contact: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const handleSubmitContact = async () => {
    if (!contactForm.contact.trim()) return;
    setContactSubmitting(true);
    try {
      await contactApi.submit({
        tenantId,
        tenantName,
        contact: contactForm.contact,
        message: contactForm.message
      });
      setShowContactModal(false);
      setContactForm({ contact: '', message: '' });
      alert('提交成功！我们会尽快与您联系。');
    } catch (err) {
      alert('提交失败，请稍后重试');
    }
    setContactSubmitting(false);
  };

  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const handleDeletePurchase = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该采购记录？', async () => {
      await deletePurchase(id);
    });
  };

  const handleDeleteStaff = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该员工？', async () => {
      await deleteStaff(id);
    });
  };

  const handleDeleteOrder = async (id: string) => {
    await deleteOrder(id);
  };

  const handleDeleteKookChannel = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该Kook频道？', async () => {
      await deleteKookChannel(id);
    });
  };

  const handleDeleteCloudMachine = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该云机及其所有窗口？此操作不可恢复。', async () => {
      await deleteCloudMachine(id);
    });
  };

  const handleDeleteCloudWindow = async (id: string, windowData?: CloudWindow) => {
    showConfirmModal('确认删除', '确认删除该窗口？', async () => {
      await deleteCloudWindow(id, windowData);
    });
  };

  if (loading) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-cyber-primary font-mono tracking-widest animate-pulse">
        LOADING DATA...
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-cyber-bg text-cyber-text font-sans pb-24 md:pb-0 md:pl-32 relative overflow-hidden bg-cyber-grid bg-[length:30px_30px]">
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Navigation onLogout={onLogout} tenantId={tenantId} tenantName={tenantName} onShowContact={() => setShowContactModal(true)} />

        {/* 联系定制弹窗 */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-purple-500/30 p-6 max-w-md w-full">
              <h3 className="text-xl font-mono text-purple-400 mb-4">联系定制</h3>
              <p className="text-gray-400 text-sm mb-4">
                需要定制专属管理系统？留下您的联系方式，我们会尽快与您联系！
              </p>
              <p className="text-gray-500 text-xs mb-4">
                支持定制：员工管理系统、订单管理系统、库存管理系统、财务管理系统等
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-purple-400 text-sm font-mono mb-1">联系方式 *</label>
                  <input
                    type="text"
                    placeholder="手机号 / 微信 / QQ"
                    value={contactForm.contact}
                    onChange={e => setContactForm({ ...contactForm, contact: e.target.value })}
                    className="w-full bg-black/40 border border-purple-500/30 text-cyber-text font-mono px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-purple-400 text-sm font-mono mb-1">需求描述</label>
                  <textarea
                    placeholder="请简单描述您的定制需求..."
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={3}
                    className="w-full bg-black/40 border border-purple-500/30 text-cyber-text font-mono px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitContact}
                  disabled={!contactForm.contact.trim() || contactSubmitting}
                  className="flex-1 py-2 bg-purple-500/20 border border-purple-500 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                >
                  {contactSubmitting ? '提交中...' : '提交'}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-10">
          <header className="mb-8 flex justify-between items-end border-b border-cyber-primary/30 pb-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter font-mono text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                三角洲<span className="text-cyber-primary drop-shadow-[0_0_8px_#00f3ff]">撞车系统</span>
              </h1>
              <p className="text-cyber-primary/60 font-mono text-xs tracking-[0.4em] mt-2 ml-1">
                ADMIN PANEL // CLOUD_SYNC
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-right">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">SYSTEM TIME</div>
                <div className="text-cyber-accent font-mono text-lg">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard globalStats={stats.globalStats} dailyStats={stats.dailyStats} orders={orders} staffList={staffList} cloudWindows={cloudWindows} purchases={purchases} settings={settings} onDeleteOrder={handleDeleteOrder} onRevertOrder={revertOrder} />} />
            <Route path="/dispatch" element={<Dispatch onAddOrder={addOrder} settings={settings} staffList={staffList} cloudWindows={cloudWindows} cloudMachines={cloudMachines} orders={orders} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onResumeOrder={resumeOrder} onCompleteOrder={completeOrder} onCompletePartialOrder={completePartialOrder} onReleaseOrderWindow={releaseOrderWindow} onAddWindowToOrder={addWindowToOrder} onDeleteOrder={handleDeleteOrder} />} />
            <Route path="/staff" element={<StaffManager staffList={staffList} orders={orders} settings={settings} cloudWindows={cloudWindows} cloudMachines={cloudMachines} onAddStaff={handleCreateStaff} onDeleteStaff={handleDeleteStaff} onDeleteOrder={handleDeleteOrder} onAssignWindow={assignWindow} onCompleteOrder={completeOrder} onAddWindowToOrder={addWindowToOrder} onLoginAsStaff={onLoginAsStaff} />} />
            <Route path="/kook" element={<KookChannels channels={kookChannels} staffList={staffList} clockRecords={clockRecords} onAdd={addKookChannel} onDelete={handleDeleteKookChannel} onUpdate={updateKookChannel} />} />
            <Route path="/cloud" element={<CloudMachines machines={cloudMachines} windows={cloudWindows} staffList={staffList} windowRequests={windowRequests} purchases={purchases} adminId={tenantId} onAddMachine={addCloudMachine} onBatchPurchase={batchPurchase} onDeleteMachine={handleDeleteCloudMachine} onUpdateMachine={updateCloudMachine} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onUpdateWindowGold={updateWindowGold} onUpdateWindowNumber={updateWindowNumber} onAddPurchase={addPurchase} onDeletePurchase={handleDeletePurchase} onUpdatePurchase={updatePurchase} onProcessRequest={processWindowRequest} onRechargeWindow={rechargeWindow} />} />
            <Route path="/friends" element={<Friends tenantId={tenantId} tenantName={tenantName} cloudWindows={cloudWindows} cloudMachines={cloudMachines} purchases={purchases} onRefresh={refreshData} />} />
            <Route path="/billing" element={<Billing tenantId={tenantId} tenantName={tenantName} username={username} />} />
            <Route path="/settings" element={<SettingsPage settings={settings} onSave={saveSettings} tenantId={tenantId} username={username} onSuperLogin={onSuperLogin} />} />
          </Routes>
        </main>

        {/* 确认弹窗 */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-red-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border border-red-500 flex items-center justify-center text-red-400 font-mono text-lg">!</div>
                <h3 className="text-xl font-mono text-red-400 tracking-wider">{confirmModal.title}</h3>
              </div>
              <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/40 font-mono text-sm">确认</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HashRouter>
  );
};

const StaffApp: React.FC<{ staffInfo: any; tenantId: string; onLogout: () => void }> = ({ staffInfo, tenantId, onLogout }) => {
  const {
    orders,
    settings,
    kookChannels,
    cloudMachines,
    cloudWindows,
    windowRequests,
    clockRecords,
    staffList,
    completeOrder,
    completePartialOrder,
    createWindowRequest,
    releaseOrderWindow,
    deleteOrder,
    clockIn,
    clockOut,
    loading
  } = useFirestore(tenantId);

  if (loading) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-cyber-primary font-mono tracking-widest animate-pulse">
        LOADING DATA...
      </div>
    );
  }

  return (
    <StaffPortal
      staff={staffInfo}
      orders={orders}
      kookChannels={kookChannels}
      cloudWindows={cloudWindows}
      cloudMachines={cloudMachines}
      settings={settings}
      windowRequests={windowRequests}
      clockRecords={clockRecords}
      staffList={staffList}
      onLogout={onLogout}
      onCompleteOrder={completeOrder}
      onCompletePartialOrder={completePartialOrder}
      onRequestWindow={createWindowRequest}
      onReleaseOrderWindow={releaseOrderWindow}
      onDeleteOrder={deleteOrder}
      onClockIn={clockIn}
      onClockOut={clockOut}
    />
  );
};

// 客服视图 - 基于管理端但隐藏敏感数据
const DispatcherApp: React.FC<{ 
  tenantId: string;
  tenantName: string;
  username: string;
  onLogout: () => void;
  onLoginAsStaff?: (staffId: string, staffName: string) => void;
}> = ({ tenantId, tenantName, username, onLogout, onLoginAsStaff }) => {
  const {
    orders,
    staffList,
    settings,
    kookChannels,
    cloudMachines,
    cloudWindows,
    windowRequests,
    clockRecords,
    loading,
    addOrder,
    deleteOrder,
    addKookChannel,
    deleteKookChannel,
    updateKookChannel,
    addCloudMachine,
    batchPurchase,
    deleteCloudMachine,
    updateCloudMachine,
    addCloudWindow,
    deleteCloudWindow,
    assignWindow,
    updateWindowGold,
    updateWindowNumber,
    resumeOrder,
    processWindowRequest,
    completeOrder,
    completePartialOrder,
    releaseOrderWindow,
    addWindowToOrder
  } = useFirestore(tenantId);

  // 确认弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // 联系定制弹窗状态
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ contact: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const handleSubmitContact = async () => {
    if (!contactForm.contact.trim()) return;
    setContactSubmitting(true);
    try {
      await contactApi.submit({
        tenantId,
        tenantName,
        contact: contactForm.contact,
        message: contactForm.message
      });
      setShowContactModal(false);
      setContactForm({ contact: '', message: '' });
      alert('提交成功！我们会尽快与您联系。');
    } catch (err) {
      alert('提交失败，请稍后重试');
    }
    setContactSubmitting(false);
  };

  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const handleDeleteOrder = async (id: string) => {
    await deleteOrder(id);
  };

  const handleDeleteKookChannel = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该Kook频道？', async () => {
      await deleteKookChannel(id);
    });
  };

  const handleDeleteCloudWindow = async (id: string, windowData?: CloudWindow) => {
    showConfirmModal('确认删除', '确认删除该窗口？', async () => {
      await deleteCloudWindow(id, windowData);
    });
  };

  const handleDeleteCloudMachine = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该云机及其所有窗口？', async () => {
      await deleteCloudMachine(id);
    });
  };

  if (loading) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-cyber-primary font-mono tracking-widest animate-pulse">
        LOADING DATA...
      </div>
    );
  }

  // 客服看到的统计数据（隐藏金额）
  const dispatcherStats = {
    globalStats: {
      totalOrders: orders.filter(o => o.status === 'completed').length,
      totalAmount: 0, // 隐藏
      totalPurchase: 0, // 隐藏
      totalProfit: 0, // 隐藏
      avgCostPerGold: 0, // 隐藏
      totalGoldPurchased: 0, // 隐藏
      totalGoldConsumed: orders.reduce((sum, o) => sum + (o.totalConsumed || 0), 0),
    },
    dailyStats: []
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-cyber-bg text-cyber-text font-sans pb-24 md:pb-0 md:pl-32 relative overflow-hidden bg-cyber-grid bg-[length:30px_30px]">
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <Navigation onLogout={onLogout} isDispatcher={true} tenantId={tenantId} tenantName={tenantName} onShowContact={() => setShowContactModal(true)} />

        {/* 联系定制弹窗 */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-purple-500/30 p-6 max-w-md w-full">
              <h3 className="text-xl font-mono text-purple-400 mb-4">联系定制</h3>
              <p className="text-gray-400 text-sm mb-4">
                需要定制专属管理系统？留下您的联系方式，我们会尽快与您联系！
              </p>
              <p className="text-gray-500 text-xs mb-4">
                支持定制：员工管理系统、订单管理系统、库存管理系统、财务管理系统等
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-purple-400 text-sm font-mono mb-1">联系方式 *</label>
                  <input
                    type="text"
                    placeholder="手机号 / 微信 / QQ"
                    value={contactForm.contact}
                    onChange={e => setContactForm({ ...contactForm, contact: e.target.value })}
                    className="w-full bg-black/40 border border-purple-500/30 text-cyber-text font-mono px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-purple-400 text-sm font-mono mb-1">需求描述</label>
                  <textarea
                    placeholder="请简单描述您的定制需求..."
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={3}
                    className="w-full bg-black/40 border border-purple-500/30 text-cyber-text font-mono px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitContact}
                  disabled={!contactForm.contact.trim() || contactSubmitting}
                  className="flex-1 py-2 bg-purple-500/20 border border-purple-500 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                >
                  {contactSubmitting ? '提交中...' : '提交'}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-10">
          <header className="mb-8 flex justify-between items-end border-b border-cyber-primary/30 pb-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter font-mono text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                三角洲<span className="text-cyber-primary drop-shadow-[0_0_8px_#00f3ff]">撞车系统</span>
              </h1>
              <p className="text-cyber-accent/60 font-mono text-xs tracking-[0.4em] mt-2 ml-1">
                DISPATCHER PANEL // {username}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-right">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">SYSTEM TIME</div>
                <div className="text-cyber-accent font-mono text-lg">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard globalStats={dispatcherStats.globalStats} dailyStats={dispatcherStats.dailyStats} orders={orders} staffList={staffList} cloudWindows={cloudWindows} purchases={[]} settings={settings} onDeleteOrder={handleDeleteOrder} isDispatcher={true} />} />
            <Route path="/dispatch" element={<Dispatch onAddOrder={addOrder} settings={settings} staffList={staffList} cloudWindows={cloudWindows} cloudMachines={cloudMachines} orders={orders} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onResumeOrder={resumeOrder} onCompleteOrder={completeOrder} onCompletePartialOrder={completePartialOrder} onReleaseOrderWindow={releaseOrderWindow} onAddWindowToOrder={addWindowToOrder} onDeleteOrder={handleDeleteOrder} />} />
            <Route path="/staff" element={<StaffManager staffList={staffList} orders={orders} settings={settings} cloudWindows={cloudWindows} cloudMachines={cloudMachines} onAddStaff={async () => {}} onDeleteStaff={() => {}} onDeleteOrder={handleDeleteOrder} onAssignWindow={assignWindow} onCompleteOrder={completeOrder} onAddWindowToOrder={addWindowToOrder} onLoginAsStaff={onLoginAsStaff} isDispatcher={true} />} />
            <Route path="/kook" element={<KookChannels channels={kookChannels} staffList={staffList} clockRecords={clockRecords} onAdd={addKookChannel} onDelete={handleDeleteKookChannel} onUpdate={updateKookChannel} />} />
            <Route path="/cloud" element={<CloudMachines machines={cloudMachines} windows={cloudWindows} staffList={staffList} windowRequests={windowRequests} purchases={[]} adminId={tenantId} onAddMachine={addCloudMachine} onBatchPurchase={batchPurchase} onDeleteMachine={handleDeleteCloudMachine} onUpdateMachine={updateCloudMachine} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onUpdateWindowGold={updateWindowGold} onUpdateWindowNumber={updateWindowNumber} onAddPurchase={async () => {}} onDeletePurchase={async () => {}} onUpdatePurchase={async () => {}} onProcessRequest={processWindowRequest} onRechargeWindow={async () => {}} isDispatcher={true} />} />
          </Routes>
        </main>

        {/* 确认弹窗 */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-cyber-panel border border-red-500 p-6 max-w-md w-full relative">
              <div className="absolute top-0 left-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 border border-red-500 flex items-center justify-center text-red-400 font-mono text-lg">!</div>
                <h3 className="text-xl font-mono text-red-400 tracking-wider">{confirmModal.title}</h3>
              </div>
              <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/40 font-mono text-sm">确认</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  const { user, staffInfo, loading, login, registerAdmin, logout, createStaffAccount, changePassword, isAdmin, isDispatcher, getTenantId } = useAuth();
  const [superAdmin, setSuperAdmin] = useState<any>(null);
  const [impersonatedTenant, setImpersonatedTenant] = useState<{ tenantId: string; username: string } | null>(null);
  const [impersonatedStaff, setImpersonatedStaff] = useState<{ staffId: string; staffName: string } | null>(null);

  const handleLogin = async (username: string, password: string) => {
    await login(username, password);
  };

  const handleRegisterAdmin = async (username: string, password: string, name: string) => {
    await registerAdmin(username, password, name);
  };

  const handleSuperLogin = (superUser: any) => {
    setSuperAdmin(superUser);
  };

  const handleSuperLogout = () => {
    setSuperAdmin(null);
    setImpersonatedTenant(null);
  };

  const handleLoginAsTenant = (tenantId: string, username: string) => {
    setImpersonatedTenant({ tenantId, username });
  };

  const handleBackToSuperAdmin = () => {
    setImpersonatedTenant(null);
  };

  const handleLoginAsStaff = (staffId: string, staffName: string) => {
    setImpersonatedStaff({ staffId, staffName });
  };

  const handleBackFromStaff = () => {
    setImpersonatedStaff(null);
  };

  if (loading) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-cyber-primary font-mono tracking-widest animate-pulse">
        SYSTEM INITIALIZING...
      </div>
    );
  }

  // 超管已登录
  if (superAdmin) {
    // 如果正在模拟租户
    if (impersonatedTenant) {
      return (
        <div>
          {/* 超管顶部提示条 */}
          <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white py-2 px-4 flex justify-between items-center z-[100]">
            <span className="font-mono text-sm">
              🔐 超管模式 - 正在查看: <strong>{impersonatedTenant.username}</strong>
            </span>
            <button
              onClick={handleBackToSuperAdmin}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
            >
              返回超管后台
            </button>
          </div>
          <div className="pt-10">
            <AdminApp 
              tenantId={impersonatedTenant.tenantId} 
              tenantName={impersonatedTenant.username} 
              username={impersonatedTenant.username}
              onLogout={handleBackToSuperAdmin} 
              onCreateStaff={async () => {}} 
            />
          </div>
        </div>
      );
    }
    return <SuperAdmin onLogout={handleSuperLogout} onLoginAsTenant={handleLoginAsTenant} />;
  }

  // 未登录显示登录页
  if (!user || !staffInfo) {
    return <Login onLogin={handleLogin} onRegisterAdmin={handleRegisterAdmin} onChangePassword={changePassword} onSuperLogin={handleSuperLogin} />;
  }

  // 调试日志
  console.log('staffInfo:', staffInfo);

  // 如果是超管通过普通登录进来，自动切换到超管模式
  if (staffInfo.role === 'super') {
    return <SuperAdmin onLogout={logout} onLoginAsTenant={handleLoginAsTenant} />;
  }

  if (!staffInfo.tenantId) {
    // 自动清除无效的登录状态并重新登录
    localStorage.removeItem('user');
    return (
      <div className="bg-cyber-bg h-screen w-screen flex flex-col items-center justify-center text-red-500 font-mono gap-4">
        <div>租户信息错误，请重新登录</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/20"
        >
          刷新页面
        </button>
      </div>
    );
  }

  // 管理员显示管理端
  if (isAdmin) {
    // 如果正在以员工身份查看
    if (impersonatedStaff) {
      const fakeStaffInfo = {
        id: impersonatedStaff.staffId,
        name: impersonatedStaff.staffName,
        role: 'staff',
        tenantId: staffInfo.tenantId
      };
      return (
        <div>
          {/* 顶部提示条 */}
          <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white py-2 px-4 flex justify-between items-center z-[100]">
            <span className="font-mono text-sm">
              👁️ 员工视角 - 正在查看: <strong>{impersonatedStaff.staffName}</strong>
            </span>
            <button
              onClick={handleBackFromStaff}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
            >
              返回管理后台
            </button>
          </div>
          <div className="pt-10">
            <StaffApp staffInfo={fakeStaffInfo} tenantId={staffInfo.tenantId} onLogout={handleBackFromStaff} />
          </div>
        </div>
      );
    }
    return <AdminApp tenantId={staffInfo.tenantId} tenantName={staffInfo.name} username={staffInfo.username} onLogout={logout} onCreateStaff={createStaffAccount} onSuperLogin={handleSuperLogin} onLoginAsStaff={handleLoginAsStaff} />;
  }

  // 客服显示客服端
  if (isDispatcher) {
    // 如果正在以员工身份查看
    if (impersonatedStaff) {
      const fakeStaffInfo = {
        id: impersonatedStaff.staffId,
        name: impersonatedStaff.staffName,
        role: 'staff',
        tenantId: staffInfo.tenantId
      };
      return (
        <div>
          {/* 顶部提示条 */}
          <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white py-2 px-4 flex justify-between items-center z-[100]">
            <span className="font-mono text-sm">
              👁️ 员工视角 - 正在查看: <strong>{impersonatedStaff.staffName}</strong>
            </span>
            <button
              onClick={handleBackFromStaff}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
            >
              返回客服后台
            </button>
          </div>
          <div className="pt-10">
            <StaffApp staffInfo={fakeStaffInfo} tenantId={staffInfo.tenantId} onLogout={handleBackFromStaff} />
          </div>
        </div>
      );
    }
    return <DispatcherApp tenantId={staffInfo.tenantId} tenantName={staffInfo.name} username={staffInfo.username} onLogout={logout} onLoginAsStaff={handleLoginAsStaff} />;
  }

  // 员工显示员工端
  return <StaffApp staffInfo={staffInfo} tenantId={staffInfo.tenantId} onLogout={logout} />;
};

export default App;
