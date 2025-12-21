import React, { useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, Settings as SettingsIcon, Hexagon, Users, MessageSquare, Monitor, LogOut, UserPlus, Wallet } from 'lucide-react';
import { calculateStats } from './utils';
import { useFirestore } from './hooks/useFirestore';
import { useAuth } from './hooks/useAuth';

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

const Navigation = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 w-full md:w-32 md:h-screen md:top-0 bg-cyber-panel border-t md:border-t-0 md:border-r border-cyber-primary/20 z-50 flex md:flex-col justify-around md:justify-start py-2 md:py-6 backdrop-blur-md">
      <div className="hidden md:flex justify-center mb-8">
        <Hexagon className="text-cyber-primary animate-pulse-slow drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" size={48} />
      </div>
      {NAV_ITEMS.map(item => {
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
  onLogout: () => void; 
  onCreateStaff: (username: string, password: string, name: string) => Promise<void>;
  onSuperLogin?: (superUser: any) => void;
}> = ({ tenantId, tenantName, onLogout, onCreateStaff, onSuperLogin }) => {
  const {
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
    addCloudWindow,
    deleteCloudWindow,
    assignWindow,
    updateWindowGold,
    resumeOrder,
    processWindowRequest,
    rechargeWindow,
    refreshData,
    completeOrder,
    releaseOrderWindow,
    addWindowToOrder
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

  const handleDeleteCloudWindow = async (id: string) => {
    showConfirmModal('确认删除', '确认删除该窗口？', async () => {
      await deleteCloudWindow(id);
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

        <Navigation onLogout={onLogout} />

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
            <Route path="/" element={<Dashboard globalStats={stats.globalStats} dailyStats={stats.dailyStats} orders={orders} staffList={staffList} cloudWindows={cloudWindows} purchases={purchases} settings={settings} onDeleteOrder={handleDeleteOrder} />} />
            <Route path="/dispatch" element={<Dispatch onAddOrder={addOrder} settings={settings} staffList={staffList} cloudWindows={cloudWindows} cloudMachines={cloudMachines} orders={orders} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onResumeOrder={resumeOrder} onCompleteOrder={completeOrder} onReleaseOrderWindow={releaseOrderWindow} onAddWindowToOrder={addWindowToOrder} onDeleteOrder={handleDeleteOrder} />} />
            <Route path="/staff" element={<StaffManager staffList={staffList} orders={orders} settings={settings} cloudWindows={cloudWindows} cloudMachines={cloudMachines} onAddStaff={handleCreateStaff} onDeleteStaff={handleDeleteStaff} onDeleteOrder={handleDeleteOrder} onAssignWindow={assignWindow} onCompleteOrder={completeOrder} onAddWindowToOrder={addWindowToOrder} />} />
            <Route path="/kook" element={<KookChannels channels={kookChannels} staffList={staffList} onAdd={addKookChannel} onDelete={handleDeleteKookChannel} onUpdate={updateKookChannel} />} />
            <Route path="/cloud" element={<CloudMachines machines={cloudMachines} windows={cloudWindows} staffList={staffList} windowRequests={windowRequests} purchases={purchases} adminId={tenantId} onAddMachine={addCloudMachine} onBatchPurchase={batchPurchase} onDeleteMachine={handleDeleteCloudMachine} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onUpdateWindowGold={updateWindowGold} onAddPurchase={addPurchase} onDeletePurchase={handleDeletePurchase} onUpdatePurchase={updatePurchase} onProcessRequest={processWindowRequest} onRechargeWindow={rechargeWindow} />} />
            <Route path="/friends" element={<Friends tenantId={tenantId} tenantName={tenantName} cloudWindows={cloudWindows} cloudMachines={cloudMachines} purchases={purchases} onRefresh={refreshData} />} />
            <Route path="/billing" element={<Billing tenantId={tenantId} tenantName={tenantName} />} />
            <Route path="/settings" element={<SettingsPage settings={settings} onSave={saveSettings} tenantId={tenantId} onSuperLogin={onSuperLogin} />} />
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
    completeOrder,
    pauseOrder,
    createWindowRequest,
    releaseOrderWindow,
    deleteOrder,
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
      onLogout={onLogout}
      onCompleteOrder={completeOrder}
      onPauseOrder={pauseOrder}
      onRequestWindow={createWindowRequest}
      onReleaseOrderWindow={releaseOrderWindow}
      onDeleteOrder={deleteOrder}
    />
  );
};

const App: React.FC = () => {
  const { user, staffInfo, loading, login, registerAdmin, logout, createStaffAccount, changePassword, isAdmin, getTenantId } = useAuth();
  const [superAdmin, setSuperAdmin] = useState<any>(null);

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
    return <SuperAdmin onLogout={handleSuperLogout} />;
  }

  // 未登录显示登录页
  if (!user || !staffInfo) {
    return <Login onLogin={handleLogin} onRegisterAdmin={handleRegisterAdmin} onChangePassword={changePassword} onSuperLogin={handleSuperLogin} />;
  }

  if (!staffInfo.tenantId) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-red-500 font-mono">
        租户信息错误，请重新登录
      </div>
    );
  }

  // 管理员显示管理端
  if (isAdmin) {
    return <AdminApp tenantId={staffInfo.tenantId} tenantName={staffInfo.name} onLogout={logout} onCreateStaff={createStaffAccount} onSuperLogin={handleSuperLogin} />;
  }

  // 员工显示员工端
  return <StaffApp staffInfo={staffInfo} tenantId={staffInfo.tenantId} onLogout={logout} />;
};

export default App;
