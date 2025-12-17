import React, { useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, Database, BarChart3, Settings as SettingsIcon, Hexagon, Users, MessageSquare, Monitor, LogOut } from 'lucide-react';
import { calculateStats } from './utils';
import { useFirestore } from './hooks/useFirestore';
import { useAuth } from './hooks/useAuth';

// Pages
import { Dashboard } from './components/Dashboard';
import { Dispatch } from './components/Dispatch';
import { DataList } from './components/DataList';
import { Reports } from './components/Reports';
import { SettingsPage } from './components/Settings';
import { StaffManager } from './components/StaffManager';
import { KookChannels } from './components/KookChannels';
import { CloudMachines } from './components/CloudMachines';
import { Login } from './components/Login';
import { StaffPortal } from './components/StaffPortal';

const NAV_ITEMS = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/dispatch', label: '派单', icon: Send, glow: true },
  { path: '/cloud', label: '云机', icon: Monitor },
  { path: '/staff', label: '员工', icon: Users },
  { path: '/kook', label: 'Kook', icon: MessageSquare },
  { path: '/records', label: '明细', icon: Database },
  { path: '/reports', label: '分析', icon: BarChart3 },
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
  onLogout: () => void; 
  onCreateStaff: (username: string, password: string, name: string) => Promise<void>;
}> = ({ tenantId, onLogout, onCreateStaff }) => {
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
    deleteOrder,
    deleteStaff,
    saveSettings,
    addKookChannel,
    deleteKookChannel,
    addCloudMachine,
    deleteCloudMachine,
    addCloudWindow,
    deleteCloudWindow,
    assignWindow,
    updateWindowGold,
    resumeOrder,
    processWindowRequest,
    rechargeWindow,
    refreshData
  } = useFirestore(tenantId);

  // 包装创建员工函数，创建后刷新数据
  const handleCreateStaff = async (username: string, password: string, name: string) => {
    await onCreateStaff(username, password, name);
    await refreshData();
  };

  const stats = useMemo(() => {
    return calculateStats(purchases, orders, settings);
  }, [purchases, orders, settings]);

  const handleDeletePurchase = async (id: string) => {
    if (confirm('确认删除该记录？')) {
      await deletePurchase(id);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    console.log('handleDeleteStaff called with id:', id);
    if (confirm('确认删除员工？')) {
      console.log('User confirmed delete');
      await deleteStaff(id);
      console.log('deleteStaff completed');
    } else {
      console.log('User cancelled delete');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    await deleteOrder(id);
  };

  const handleDeleteKookChannel = async (id: string) => {
    if (confirm('确认删除该Kook频道？')) {
      await deleteKookChannel(id);
    }
  };

  const handleDeleteCloudMachine = async (id: string) => {
    if (confirm('确认删除该云机及其所有窗口？')) {
      await deleteCloudMachine(id);
    }
  };

  const handleDeleteCloudWindow = async (id: string) => {
    if (confirm('确认删除该窗口？')) {
      await deleteCloudWindow(id);
    }
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
                三角洲<span className="text-cyber-primary drop-shadow-[0_0_8px_#00f3ff]">员工系统</span>
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
            <Route path="/" element={<Dashboard globalStats={stats.globalStats} dailyStats={stats.dailyStats} />} />
            <Route path="/dispatch" element={<Dispatch onAddOrder={addOrder} settings={settings} staffList={staffList} cloudWindows={cloudWindows} cloudMachines={cloudMachines} orders={orders} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onResumeOrder={resumeOrder} />} />
            <Route path="/staff" element={<StaffManager staffList={staffList} orders={orders} settings={settings} onAddStaff={handleCreateStaff} onDeleteStaff={handleDeleteStaff} onDeleteOrder={handleDeleteOrder} />} />
            <Route path="/kook" element={<KookChannels channels={kookChannels} staffList={staffList} onAdd={addKookChannel} onDelete={handleDeleteKookChannel} />} />
            <Route path="/cloud" element={<CloudMachines machines={cloudMachines} windows={cloudWindows} staffList={staffList} windowRequests={windowRequests} adminId={tenantId} onAddMachine={addCloudMachine} onDeleteMachine={handleDeleteCloudMachine} onAddWindow={addCloudWindow} onDeleteWindow={handleDeleteCloudWindow} onAssignWindow={assignWindow} onUpdateWindowGold={updateWindowGold} onAddPurchase={addPurchase} onProcessRequest={processWindowRequest} onRechargeWindow={rechargeWindow} />} />
            <Route path="/records" element={<DataList purchases={purchases} dailyStats={stats.dailyStats} onDeletePurchase={handleDeletePurchase} onDeleteDaily={() => {}} />} />
            <Route path="/reports" element={<Reports dailyStats={stats.dailyStats} />} />
            <Route path="/settings" element={<SettingsPage settings={settings} onSave={saveSettings} />} />
          </Routes>
        </main>
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
    />
  );
};

const App: React.FC = () => {
  const { user, staffInfo, loading, login, registerAdmin, logout, createStaffAccount, isAdmin, getTenantId } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    await login(username, password);
  };

  const handleRegisterAdmin = async (username: string, password: string, name: string) => {
    await registerAdmin(username, password, name);
  };

  if (loading) {
    return (
      <div className="bg-cyber-bg h-screen w-screen flex items-center justify-center text-cyber-primary font-mono tracking-widest animate-pulse">
        SYSTEM INITIALIZING...
      </div>
    );
  }

  // 未登录显示登录页
  if (!user || !staffInfo) {
    return <Login onLogin={handleLogin} onRegisterAdmin={handleRegisterAdmin} />;
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
    return <AdminApp tenantId={staffInfo.tenantId} onLogout={logout} onCreateStaff={createStaffAccount} />;
  }

  // 员工显示员工端
  return <StaffApp staffInfo={staffInfo} tenantId={staffInfo.tenantId} onLogout={logout} />;
};

export default App;
