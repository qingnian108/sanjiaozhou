import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, FileText, Clock, CheckCircle, AlertCircle, RefreshCw, X, ShoppingCart, Monitor, User, Key, Gift, Copy, Users } from 'lucide-react';
import { accountApi, rechargeApi, authApi, referralApi } from '../api';

interface AccountData {
  balance: number;
  basePrice: number;
  pricePerWindow: number;
  accountExpireDate: string | null;
  windowCount: number;
  windowExpireDate: string | null;
  status: 'trial' | 'active' | 'expired' | 'suspended';
  trialEndDate: string | null;
}

interface PurchaseRecord {
  _id: string;
  type: 'base' | 'window';
  amount: number;
  quantity?: number;
  months: number;
  expireDate: string;
  createdAt: string;
}

interface ReferralInfo {
  inviteCode: string;
  inviteLink: string;
  commissionRate: number;
  stats: {
    inviteeCount: number;
    totalCommission: number;
  };
}

interface Invitee {
  username: string;
  createdAt: string;
}

interface CommissionRecord {
  inviteeUsername: string;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
}

interface BillingProps {
  tenantId: string;
  tenantName: string;
  username?: string;
}

export const Billing: React.FC<BillingProps> = ({ tenantId, tenantName, username }) => {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'referral'>('overview');
  
  // 邀请相关
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 充值弹窗
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  // 购买弹窗
  const [showBuyModal, setShowBuyModal] = useState<'base' | 'window' | null>(null);
  const [buyMonths, setBuyMonths] = useState(1);
  const [buyWindowCount, setBuyWindowCount] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  
  // 修改密码
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountRes, purchasesRes, referralRes] = await Promise.all([
        accountApi.get(tenantId),
        accountApi.getPurchases(tenantId),
        referralApi.getInfo(tenantId)
      ]);
      
      if (accountRes.success) setAccount(accountRes.data);
      if (purchasesRes.success) setPurchases(purchasesRes.data || []);
      if (referralRes.success) setReferralInfo(referralRes.data);
    } catch (err) {
      console.error('加载账户数据失败:', err);
    }
    setLoading(false);
  };

  // 加载邀请详情
  const loadReferralDetails = async () => {
    try {
      const [inviteesRes, commissionsRes] = await Promise.all([
        referralApi.getInvitees(tenantId),
        referralApi.getCommissions(tenantId)
      ]);
      if (inviteesRes.success) setInvitees(inviteesRes.data || []);
      if (commissionsRes.success) setCommissions(commissionsRes.data || []);
    } catch (err) {
      console.error('加载邀请详情失败:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'referral') {
      loadReferralDetails();
    }
  }, [activeTab]);

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // 创建充值订单
  const handleCreateRecharge = async () => {
    setRechargeLoading(true);
    try {
      const res = await rechargeApi.create({ tenantId, tenantName, amount: rechargeAmount });
      if (res.success) {
        setQrCodeUrl(res.data.codeUrl);
        setCurrentOrderId(res.data.orderId);
      } else {
        alert(res.error || '创建充值订单失败');
      }
    } catch (err) {
      alert('创建充值订单失败');
    }
    setRechargeLoading(false);
  };

  // 检查支付状态
  const checkPaymentStatus = async () => {
    if (!currentOrderId) return;
    setCheckingPayment(true);
    try {
      const res = await rechargeApi.query(currentOrderId);
      if (res.success && res.data.status === 'paid') {
        alert('充值成功！');
        setShowRechargeModal(false);
        setQrCodeUrl('');
        setCurrentOrderId('');
        loadData();
      } else {
        alert('支付尚未完成，请完成支付后再试');
      }
    } catch (err) {
      alert('查询支付状态失败');
    }
    setCheckingPayment(false);
  };

  // 购买基础月费
  const handleBuyBase = async () => {
    setBuyLoading(true);
    try {
      const res = await accountApi.buyBase(tenantId, buyMonths);
      if (res.success) {
        alert(res.message || '购买成功');
        setShowBuyModal(null);
        loadData();
      } else {
        alert(res.error || '购买失败');
      }
    } catch (err) {
      alert('购买失败');
    }
    setBuyLoading(false);
  };

  // 购买窗口
  const handleBuyWindows = async () => {
    setBuyLoading(true);
    try {
      const res = await accountApi.buyWindows(tenantId, buyWindowCount, buyMonths);
      if (res.success) {
        alert(res.message || '购买成功');
        setShowBuyModal(null);
        loadData();
      } else {
        alert(res.error || '购买失败');
      }
    } catch (err) {
      alert('购买失败');
    }
    setBuyLoading(false);
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!username) return;
    
    setPasswordError('');
    setPasswordSuccess(false);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await authApi.changePassword(username, oldPassword, newPassword);
      setPasswordSuccess(true);
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 计算剩余天数
  const getDaysLeft = (expireDate: string | null) => {
    if (!expireDate) return 0;
    const end = new Date(expireDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">试用中</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">正常</span>;
      case 'expired':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">已过期</span>;
      case 'suspended':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">已暂停</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-cyber-primary">
        <RefreshCw className="animate-spin mr-2" /> 加载中...
      </div>
    );
  }

  const baseCost = (account?.basePrice || 50) * buyMonths;
  const windowCost = (account?.pricePerWindow || 10) * buyWindowCount * buyMonths;

  return (
    <div className="space-y-6">
      {/* 账号信息 */}
      <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="text-cyber-primary" size={20} />
            <span className="text-lg font-mono text-cyber-primary">账号信息</span>
          </div>
          {passwordSuccess && (
            <span className="text-green-400 text-sm">密码修改成功</span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-gray-500 text-sm">账号：</span>
            <span className="text-white font-mono ml-2">{username || tenantName}</span>
          </div>
          
          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="text-cyber-accent hover:text-cyber-primary text-sm font-mono transition-colors flex items-center gap-1"
            >
              <Key size={14} /> 修改密码
            </button>
          ) : (
            <div className="flex-1 min-w-[300px] p-4 border border-cyber-primary/30 bg-cyber-primary/5 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="当前密码"
                  className="bg-cyber-bg border border-cyber-primary/50 p-2 text-white text-sm focus:border-cyber-primary outline-none"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="新密码（至少6位）"
                  className="bg-cyber-bg border border-cyber-primary/50 p-2 text-white text-sm focus:border-cyber-primary outline-none"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="确认新密码"
                  className="bg-cyber-bg border border-cyber-primary/50 p-2 text-white text-sm focus:border-cyber-primary outline-none"
                />
              </div>
              {passwordError && (
                <div className="text-red-500 text-xs mb-2">{passwordError}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { 
                    setShowChangePassword(false); 
                    setOldPassword(''); 
                    setNewPassword(''); 
                    setConfirmPassword(''); 
                    setPasswordError(''); 
                  }}
                  className="px-3 py-1 border border-gray-600 text-gray-400 hover:bg-gray-800 text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="px-3 py-1 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/40 text-sm disabled:opacity-50"
                >
                  {passwordLoading ? '修改中...' : '确认修改'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 租户ID - 小字放底部 */}
        <div className="mt-4 pt-3 border-t border-cyber-primary/10">
          <span className="text-gray-600 text-xs">id: {tenantId}</span>
        </div>
      </div>

      {/* 账户概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 余额 */}
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyber-primary/5 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="text-cyber-primary" size={24} />
            <span className="text-gray-400 text-sm">账户余额</span>
          </div>
          <div className="text-3xl font-mono text-white">¥{account?.balance?.toFixed(2) || '0.00'}</div>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="mt-4 px-4 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/40 text-sm"
          >
            立即充值
          </button>
        </div>

        {/* 基础服务 */}
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-cyber-secondary" size={24} />
            <span className="text-gray-400 text-sm">基础服务</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {getStatusBadge(account?.status || 'trial')}
          </div>
          {account?.status === 'trial' && account.trialEndDate && (
            <div className="text-sm text-gray-400 mt-2">
              试用期剩余 <span className="text-cyber-accent">{getDaysLeft(account.trialEndDate)}</span> 天
            </div>
          )}
          {account?.status === 'active' && account.accountExpireDate && (
            <div className="text-sm text-gray-400 mt-2">
              有效期至 <span className="text-green-400">{account.accountExpireDate}</span>
              <span className="text-gray-500 ml-1">({getDaysLeft(account.accountExpireDate)}天)</span>
            </div>
          )}
          {(account?.status === 'expired' || account?.status === 'trial') && (
            <button
              onClick={() => { setShowBuyModal('base'); setBuyMonths(1); }}
              className="mt-3 px-4 py-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/40 text-sm w-full"
            >
              购买基础服务 ¥{account?.basePrice || 50}/月
            </button>
          )}
          {account?.status === 'active' && (
            <button
              onClick={() => { setShowBuyModal('base'); setBuyMonths(1); }}
              className="mt-3 px-3 py-1 border border-cyber-primary/50 text-cyber-primary hover:bg-cyber-primary/20 text-xs"
            >
              续费
            </button>
          )}
        </div>

        {/* 窗口服务 */}
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-cyber-accent" size={24} />
            <span className="text-gray-400 text-sm">窗口服务</span>
          </div>
          <div className="text-2xl font-mono text-white mb-1">
            {account?.windowCount || 0} <span className="text-sm text-gray-400">个窗口</span>
          </div>
          {account?.windowExpireDate && (
            <div className="text-sm text-gray-400">
              有效期至 <span className="text-cyber-accent">{account.windowExpireDate}</span>
              <span className="text-gray-500 ml-1">({getDaysLeft(account.windowExpireDate)}天)</span>
            </div>
          )}
          <button
            onClick={() => { setShowBuyModal('window'); setBuyWindowCount(1); setBuyMonths(1); }}
            className="mt-3 px-4 py-2 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent hover:bg-cyber-accent/40 text-sm w-full"
          >
            购买窗口 ¥{account?.pricePerWindow || 10}/个/月
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-4 border-b border-cyber-primary/30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'overview' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400 hover:text-white'}`}
        >
          计费说明
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'purchases' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400 hover:text-white'}`}
        >
          购买记录
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`px-4 py-2 text-sm font-mono transition-colors flex items-center gap-1 ${activeTab === 'referral' ? 'text-cyber-accent border-b-2 border-cyber-accent' : 'text-gray-400 hover:text-white'}`}
        >
          <Gift size={14} /> 邀请返佣
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'overview' && (
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <h3 className="text-lg font-mono text-white mb-4">计费说明</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <p>• <strong className="text-cyber-primary">预付费模式</strong>：先充值余额，再购买服务</p>
            <p>• <strong className="text-green-400">基础服务</strong>：购买后账户生效，按月计费（¥{account?.basePrice || 50}/月）</p>
            <p>• <strong className="text-cyber-accent">窗口服务</strong>：每个窗口单独计费（¥{account?.pricePerWindow || 10}/个/月）</p>
            <p>• 基础服务到期后，即使窗口未到期也无法使用，需先续费基础服务</p>
            <p>• 窗口到期后，该窗口不可用，需单独续费</p>
            <p>• 试用期内免费使用所有功能</p>
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="bg-cyber-panel border border-cyber-primary/30">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无购买记录</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-sm">
                  <th className="p-4">时间</th>
                  <th className="p-4">类型</th>
                  <th className="p-4">数量</th>
                  <th className="p-4">时长</th>
                  <th className="p-4">金额</th>
                  <th className="p-4">有效期至</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(record => (
                  <tr key={record._id} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5">
                    <td className="p-4 text-sm">{new Date(record.createdAt).toLocaleString()}</td>
                    <td className="p-4">
                      {record.type === 'base' ? (
                        <span className="text-green-400">基础服务</span>
                      ) : (
                        <span className="text-cyber-accent">窗口服务</span>
                      )}
                    </td>
                    <td className="p-4">{record.type === 'window' ? `${record.quantity} 个` : '-'}</td>
                    <td className="p-4">{record.months} 个月</td>
                    <td className="p-4 text-cyber-accent font-mono">¥{record.amount}</td>
                    <td className="p-4 text-sm">{record.expireDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'referral' && referralInfo && (
        <div className="space-y-6">
          {/* 邀请码和链接 */}
          <div className="bg-cyber-panel border border-cyber-accent/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="text-cyber-accent" size={20} />
              <h3 className="text-lg font-mono text-cyber-accent">我的邀请码</h3>
              {copySuccess && <span className="text-green-400 text-xs ml-2">已复制!</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">邀请码</label>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-lg">{referralInfo.inviteCode}</span>
                  <button
                    onClick={() => copyToClipboard(referralInfo.inviteCode)}
                    className="p-1 text-gray-400 hover:text-cyber-accent"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">邀请链接</label>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm truncate max-w-[200px]">{referralInfo.inviteLink}</span>
                  <button
                    onClick={() => copyToClipboard(referralInfo.inviteLink)}
                    className="p-1 text-gray-400 hover:text-cyber-accent"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-cyber-accent/10 border border-cyber-accent/30 text-sm text-gray-300">
              <p>分享邀请码给朋友，他们注册时填写您的邀请码，每次充值您可获得 <span className="text-cyber-accent font-bold">{(referralInfo.commissionRate * 100).toFixed(0)}%</span> 返佣</p>
            </div>
          </div>

          {/* 邀请统计 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cyber-panel border border-cyber-primary/30 p-6 text-center">
              <Users className="text-cyber-primary mx-auto mb-2" size={24} />
              <div className="text-3xl font-mono text-white">{referralInfo.stats.inviteeCount}</div>
              <div className="text-gray-500 text-sm">邀请人数</div>
            </div>
            <div className="bg-cyber-panel border border-green-500/30 p-6 text-center">
              <Wallet className="text-green-400 mx-auto mb-2" size={24} />
              <div className="text-3xl font-mono text-green-400">¥{referralInfo.stats.totalCommission.toFixed(2)}</div>
              <div className="text-gray-500 text-sm">累计返佣</div>
            </div>
          </div>

          {/* 被邀请人列表 */}
          {invitees.length > 0 && (
            <div className="bg-cyber-panel border border-cyber-primary/30">
              <div className="p-4 border-b border-cyber-primary/20">
                <h4 className="font-mono text-white">邀请的用户</h4>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {invitees.map((inv, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border-b border-cyber-primary/10 last:border-0">
                    <span className="text-gray-300">{inv.username}</span>
                    <span className="text-gray-500 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 返佣记录 */}
          {commissions.length > 0 && (
            <div className="bg-cyber-panel border border-cyber-primary/30">
              <div className="p-4 border-b border-cyber-primary/20">
                <h4 className="font-mono text-white">返佣记录</h4>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-xs">
                    <th className="p-3">时间</th>
                    <th className="p-3">用户</th>
                    <th className="p-3">充值金额</th>
                    <th className="p-3">返佣比例</th>
                    <th className="p-3">返佣金额</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm, idx) => (
                    <tr key={idx} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5 text-sm">
                      <td className="p-3 text-gray-400">{new Date(comm.createdAt).toLocaleString()}</td>
                      <td className="p-3">{comm.inviteeUsername}</td>
                      <td className="p-3">¥{comm.rechargeAmount}</td>
                      <td className="p-3">{(comm.commissionRate * 100).toFixed(0)}%</td>
                      <td className="p-3 text-green-400 font-mono">+¥{comm.commissionAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invitees.length === 0 && commissions.length === 0 && (
            <div className="bg-cyber-panel border border-cyber-primary/30 p-8 text-center text-gray-500">
              还没有邀请记录，快分享邀请码给朋友吧！
            </div>
          )}
        </div>
      )}

      {/* 充值弹窗 */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <button
              onClick={() => { setShowRechargeModal(false); setQrCodeUrl(''); setCurrentOrderId(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-mono text-cyber-primary mb-6">账户充值</h3>
            
            {!qrCodeUrl ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">选择充值金额</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 200, 500].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setRechargeAmount(amount)}
                        className={`py-3 border text-center transition-colors ${
                          rechargeAmount === amount
                            ? 'border-cyber-primary bg-cyber-primary/20 text-cyber-primary'
                            : 'border-gray-600 text-gray-400 hover:border-gray-400'
                        }`}
                      >
                        ¥{amount}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">自定义金额</label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={e => setRechargeAmount(Number(e.target.value))}
                    min={1}
                    className="w-full bg-cyber-bg border border-cyber-primary/50 p-3 text-white focus:border-cyber-primary outline-none"
                  />
                </div>
                
                <button
                  onClick={handleCreateRecharge}
                  disabled={rechargeLoading || rechargeAmount < 1}
                  className="w-full py-3 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/40 disabled:opacity-50"
                >
                  {rechargeLoading ? '生成中...' : `确认充值 ¥${rechargeAmount}`}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-4">请使用微信扫描下方二维码完成支付</p>
                <div className="bg-white p-4 inline-block mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="支付二维码"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-cyber-accent text-2xl font-mono mb-4">¥{rechargeAmount}</p>
                <button
                  onClick={checkPaymentStatus}
                  disabled={checkingPayment}
                  className="w-full py-3 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/40 disabled:opacity-50"
                >
                  {checkingPayment ? '查询中...' : '我已完成支付'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 购买基础服务弹窗 */}
      {showBuyModal === 'base' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-green-500 p-6 max-w-md w-full relative">
            <button onClick={() => setShowBuyModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-mono text-green-400 mb-6">购买基础服务</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">购买时长</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setBuyMonths(m)}
                    className={`py-3 border text-center transition-colors ${
                      buyMonths === m
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {m}个月
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-cyber-bg p-4 mb-6 border border-gray-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">单价</span>
                <span className="text-white">¥{account?.basePrice || 50}/月</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">时长</span>
                <span className="text-white">{buyMonths} 个月</span>
              </div>
              <div className="flex justify-between text-lg border-t border-gray-700 pt-2 mt-2">
                <span className="text-gray-400">合计</span>
                <span className="text-green-400 font-mono">¥{baseCost}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                当前余额: ¥{account?.balance?.toFixed(2)}
                {(account?.balance || 0) < baseCost && (
                  <span className="text-red-400 ml-2">余额不足</span>
                )}
              </div>
            </div>
            
            <button
              onClick={handleBuyBase}
              disabled={buyLoading || (account?.balance || 0) < baseCost}
              className="w-full py-3 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/40 disabled:opacity-50"
            >
              {buyLoading ? '购买中...' : `确认购买 ¥${baseCost}`}
            </button>
          </div>
        </div>
      )}

      {/* 购买窗口弹窗 */}
      {showBuyModal === 'window' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-accent p-6 max-w-md w-full relative">
            <button onClick={() => setShowBuyModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-mono text-cyber-accent mb-6">购买窗口</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">窗口数量</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBuyWindowCount(Math.max(1, buyWindowCount - 1))}
                  className="w-10 h-10 border border-gray-600 text-gray-400 hover:border-gray-400"
                >
                  -
                </button>
                <input
                  type="number"
                  value={buyWindowCount}
                  onChange={e => setBuyWindowCount(Math.max(1, Number(e.target.value)))}
                  min={1}
                  className="flex-1 bg-cyber-bg border border-cyber-accent/50 p-2 text-white text-center"
                />
                <button
                  onClick={() => setBuyWindowCount(buyWindowCount + 1)}
                  className="w-10 h-10 border border-gray-600 text-gray-400 hover:border-gray-400"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">购买时长</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setBuyMonths(m)}
                    className={`py-3 border text-center transition-colors ${
                      buyMonths === m
                        ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {m}个月
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-cyber-bg p-4 mb-6 border border-gray-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">单价</span>
                <span className="text-white">¥{account?.pricePerWindow || 10}/个/月</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">数量</span>
                <span className="text-white">{buyWindowCount} 个</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">时长</span>
                <span className="text-white">{buyMonths} 个月</span>
              </div>
              <div className="flex justify-between text-lg border-t border-gray-700 pt-2 mt-2">
                <span className="text-gray-400">合计</span>
                <span className="text-cyber-accent font-mono">¥{windowCost}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                当前余额: ¥{account?.balance?.toFixed(2)}
                {(account?.balance || 0) < windowCost && (
                  <span className="text-red-400 ml-2">余额不足</span>
                )}
              </div>
            </div>
            
            <button
              onClick={handleBuyWindows}
              disabled={buyLoading || (account?.balance || 0) < windowCost}
              className="w-full py-3 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent hover:bg-cyber-accent/40 disabled:opacity-50"
            >
              {buyLoading ? '购买中...' : `确认购买 ¥${windowCost}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
