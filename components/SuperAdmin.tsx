import React, { useState, useEffect } from 'react';
import { Users, FileText, BarChart3, RefreshCw, DollarSign, Settings, Play, Pause, LogOut, X, Calendar } from 'lucide-react';
import { superApi, cronApi } from '../api';

interface Tenant {
  id: string;
  username: string;
  name: string;
  tenantId: string;
  createdAt: string;
  windowCount: number;
  account: {
    balance: number;
    basePrice: number;
    freeWindows: number;
    pricePerWindow: number;
    trialEndDate: string;
    status: 'trial' | 'active' | 'suspended';
  } | null;
}

interface Bill {
  _id: string;
  tenantId: string;
  tenantName: string;
  month: string;
  peakWindowCount: number;
  freeWindows: number;
  extraWindows: number;
  basePrice: number;
  extraPrice: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: string;
  paidAt?: string;
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalWindows: number;
  totalRevenue: number;
  totalBilled: number;
}

interface SuperAdminProps {
  onLogout: () => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'bills' | 'stats'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // 弹窗状态
  const [chargeModal, setChargeModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [chargeAmount, setChargeAmount] = useState(100);
  const [chargeNote, setChargeNote] = useState('');
  
  const [settingsModal, setSettingsModal] = useState<{ open: boolean; tenant: Tenant | null }>({ open: false, tenant: null });
  const [settingsForm, setSettingsForm] = useState({ basePrice: 50, freeWindows: 5, pricePerWindow: 10 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, billsRes, statsRes] = await Promise.all([
        superApi.getTenants(),
        superApi.getBills(),
        superApi.getStats()
      ]);
      
      if (tenantsRes.success) setTenants(tenantsRes.data || []);
      if (billsRes.success) setBills(billsRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 手动充值
  const handleCharge = async () => {
    if (!chargeModal.tenant) return;
    try {
      const res = await superApi.chargeTenant(chargeModal.tenant.tenantId, chargeAmount, chargeNote);
      if (res.success) {
        alert('充值成功');
        setChargeModal({ open: false, tenant: null });
        setChargeAmount(100);
        setChargeNote('');
        loadData();
      } else {
        alert(res.error || '充值失败');
      }
    } catch (err) {
      alert('充值失败');
    }
  };

  // 暂停/恢复账户
  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      const isActive = tenant.account?.status !== 'suspended';
      const res = isActive 
        ? await superApi.suspendTenant(tenant.tenantId)
        : await superApi.activateTenant(tenant.tenantId);
      
      if (res.success) {
        loadData();
      } else {
        alert(res.error || '操作失败');
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  // 修改费率
  const handleUpdateSettings = async () => {
    if (!settingsModal.tenant) return;
    try {
      const res = await superApi.updateTenantSettings(settingsModal.tenant.tenantId, settingsForm);
      if (res.success) {
        alert('设置已更新');
        setSettingsModal({ open: false, tenant: null });
        loadData();
      } else {
        alert(res.error || '更新失败');
      }
    } catch (err) {
      alert('更新失败');
    }
  };

  // 标记账单已付
  const handlePayBill = async (billId: string) => {
    if (!confirm('确认标记此账单为已付款？')) return;
    try {
      const res = await superApi.payBill(billId);
      if (res.success) {
        loadData();
      } else {
        alert(res.error || '操作失败');
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  // 执行定时任务
  const handleCronTask = async (task: 'snapshot' | 'bill' | 'trial') => {
    try {
      let res;
      switch (task) {
        case 'snapshot':
          res = await cronApi.dailySnapshot();
          break;
        case 'bill':
          res = await cronApi.monthlyBill();
          break;
        case 'trial':
          res = await cronApi.checkTrial();
          break;
      }
      if (res?.success) {
        alert(res.message || '执行成功');
        loadData();
      } else {
        alert(res?.error || '执行失败');
      }
    } catch (err) {
      alert('执行失败');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'trial':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">试用</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">正常</span>;
      case 'suspended':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">暂停</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">未知</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <RefreshCw className="animate-spin text-cyber-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-text p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-mono text-white">
            超级管理<span className="text-cyber-primary">后台</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">SUPER ADMIN PANEL</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadData()}
            className="px-4 py-2 border border-cyber-primary/50 text-cyber-primary hover:bg-cyber-primary/20 flex items-center gap-2"
          >
            <RefreshCw size={16} /> 刷新
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/20 flex items-center gap-2"
          >
            <LogOut size={16} /> 退出
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-cyber-panel border border-cyber-primary/30 p-4">
            <div className="text-gray-400 text-sm mb-1">总租户数</div>
            <div className="text-2xl font-mono text-white">{stats.totalTenants}</div>
          </div>
          <div className="bg-cyber-panel border border-cyber-primary/30 p-4">
            <div className="text-gray-400 text-sm mb-1">活跃租户</div>
            <div className="text-2xl font-mono text-green-400">{stats.activeTenants}</div>
          </div>
          <div className="bg-cyber-panel border border-cyber-primary/30 p-4">
            <div className="text-gray-400 text-sm mb-1">总窗口数</div>
            <div className="text-2xl font-mono text-cyber-primary">{stats.totalWindows}</div>
          </div>
          <div className="bg-cyber-panel border border-cyber-primary/30 p-4">
            <div className="text-gray-400 text-sm mb-1">总充值</div>
            <div className="text-2xl font-mono text-cyber-accent">¥{stats.totalRevenue}</div>
          </div>
          <div className="bg-cyber-panel border border-cyber-primary/30 p-4">
            <div className="text-gray-400 text-sm mb-1">总账单</div>
            <div className="text-2xl font-mono text-cyber-secondary">¥{stats.totalBilled}</div>
          </div>
        </div>
      )}

      {/* 定时任务按钮 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleCronTask('snapshot')}
          className="px-4 py-2 bg-cyber-panel border border-cyber-primary/50 text-sm hover:bg-cyber-primary/20 flex items-center gap-2"
        >
          <Calendar size={16} /> 执行每日快照
        </button>
        <button
          onClick={() => handleCronTask('bill')}
          className="px-4 py-2 bg-cyber-panel border border-cyber-accent/50 text-cyber-accent text-sm hover:bg-cyber-accent/20 flex items-center gap-2"
        >
          <FileText size={16} /> 生成月度账单
        </button>
        <button
          onClick={() => handleCronTask('trial')}
          className="px-4 py-2 bg-cyber-panel border border-cyber-secondary/50 text-cyber-secondary text-sm hover:bg-cyber-secondary/20 flex items-center gap-2"
        >
          <Users size={16} /> 检查试用期
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex gap-4 border-b border-cyber-primary/30 mb-6">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'tenants' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400'}`}
        >
          <Users size={18} /> 租户管理
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'bills' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400'}`}
        >
          <FileText size={18} /> 账单管理
        </button>
      </div>

      {/* 租户列表 */}
      {activeTab === 'tenants' && (
        <div className="bg-cyber-panel border border-cyber-primary/30 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-sm">
                <th className="p-4">用户名</th>
                <th className="p-4">名称</th>
                <th className="p-4">状态</th>
                <th className="p-4">余额</th>
                <th className="p-4">窗口数</th>
                <th className="p-4">费率</th>
                <th className="p-4">注册时间</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.id} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5">
                  <td className="p-4 font-mono">{tenant.username}</td>
                  <td className="p-4">{tenant.name}</td>
                  <td className="p-4">{getStatusBadge(tenant.account?.status)}</td>
                  <td className="p-4 font-mono text-cyber-accent">¥{tenant.account?.balance?.toFixed(2) || '0.00'}</td>
                  <td className="p-4">{tenant.windowCount} 个</td>
                  <td className="p-4 text-sm text-gray-400">
                    ¥{tenant.account?.basePrice || 50} + ¥{tenant.account?.pricePerWindow || 10}/窗口
                  </td>
                  <td className="p-4 text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setChargeModal({ open: true, tenant });
                          setChargeAmount(100);
                          setChargeNote('');
                        }}
                        className="px-2 py-1 text-xs border border-green-500/50 text-green-400 hover:bg-green-500/20"
                      >
                        充值
                      </button>
                      <button
                        onClick={() => {
                          setSettingsModal({ open: true, tenant });
                          setSettingsForm({
                            basePrice: tenant.account?.basePrice || 50,
                            freeWindows: tenant.account?.freeWindows || 5,
                            pricePerWindow: tenant.account?.pricePerWindow || 10
                          });
                        }}
                        className="px-2 py-1 text-xs border border-cyber-primary/50 text-cyber-primary hover:bg-cyber-primary/20"
                      >
                        费率
                      </button>
                      <button
                        onClick={() => handleToggleStatus(tenant)}
                        className={`px-2 py-1 text-xs border ${
                          tenant.account?.status === 'suspended'
                            ? 'border-green-500/50 text-green-400 hover:bg-green-500/20'
                            : 'border-red-500/50 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {tenant.account?.status === 'suspended' ? '恢复' : '暂停'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 账单列表 */}
      {activeTab === 'bills' && (
        <div className="bg-cyber-panel border border-cyber-primary/30 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-sm">
                <th className="p-4">租户</th>
                <th className="p-4">月份</th>
                <th className="p-4">窗口数</th>
                <th className="p-4">基础费</th>
                <th className="p-4">超出费</th>
                <th className="p-4">总金额</th>
                <th className="p-4">状态</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill._id} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5">
                  <td className="p-4">{bill.tenantName}</td>
                  <td className="p-4 font-mono">{bill.month}</td>
                  <td className="p-4">{bill.peakWindowCount} 个</td>
                  <td className="p-4">¥{bill.basePrice}</td>
                  <td className="p-4">¥{bill.extraPrice}</td>
                  <td className="p-4 font-mono text-cyber-accent">¥{bill.totalAmount}</td>
                  <td className="p-4">
                    {bill.status === 'paid' && <span className="text-green-400 text-sm">已付款</span>}
                    {bill.status === 'pending' && <span className="text-yellow-400 text-sm">待付款</span>}
                    {bill.status === 'overdue' && <span className="text-red-400 text-sm">逾期</span>}
                  </td>
                  <td className="p-4">
                    {bill.status !== 'paid' && (
                      <button
                        onClick={() => handlePayBill(bill._id)}
                        className="px-2 py-1 text-xs border border-green-500/50 text-green-400 hover:bg-green-500/20"
                      >
                        标记已付
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 充值弹窗 */}
      {chargeModal.open && chargeModal.tenant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <button onClick={() => setChargeModal({ open: false, tenant: null })} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-mono text-cyber-primary mb-4">手动充值</h3>
            <p className="text-gray-400 mb-4">为 <span className="text-white">{chargeModal.tenant.name}</span> 充值</p>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">充值金额</label>
              <input
                type="number"
                value={chargeAmount}
                onChange={e => setChargeAmount(Number(e.target.value))}
                className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">备注</label>
              <input
                type="text"
                value={chargeNote}
                onChange={e => setChargeNote(e.target.value)}
                placeholder="可选"
                className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white"
              />
            </div>
            
            <button
              onClick={handleCharge}
              className="w-full py-3 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/40"
            >
              确认充值 ¥{chargeAmount}
            </button>
          </div>
        </div>
      )}

      {/* 费率设置弹窗 */}
      {settingsModal.open && settingsModal.tenant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <button onClick={() => setSettingsModal({ open: false, tenant: null })} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-mono text-cyber-primary mb-4">费率设置</h3>
            <p className="text-gray-400 mb-4">设置 <span className="text-white">{settingsModal.tenant.name}</span> 的费率</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">基础月费 (元)</label>
                <input
                  type="number"
                  value={settingsForm.basePrice}
                  onChange={e => setSettingsForm({ ...settingsForm, basePrice: Number(e.target.value) })}
                  className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">免费窗口数</label>
                <input
                  type="number"
                  value={settingsForm.freeWindows}
                  onChange={e => setSettingsForm({ ...settingsForm, freeWindows: Number(e.target.value) })}
                  className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">超出单价 (元/窗口/月)</label>
                <input
                  type="number"
                  value={settingsForm.pricePerWindow}
                  onChange={e => setSettingsForm({ ...settingsForm, pricePerWindow: Number(e.target.value) })}
                  className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white"
                />
              </div>
            </div>
            
            <button
              onClick={handleUpdateSettings}
              className="w-full py-3 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/40"
            >
              保存设置
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
