import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, FileText, Clock, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { accountApi, rechargeApi } from '../api';
import { TenantAccount, MonthlyBill, RechargeRecord } from '../types';

interface BillingProps {
  tenantId: string;
  tenantName: string;
}

export const Billing: React.FC<BillingProps> = ({ tenantId, tenantName }) => {
  const [account, setAccount] = useState<TenantAccount | null>(null);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'recharges'>('overview');
  
  // 充值弹窗
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountRes, billsRes, rechargesRes] = await Promise.all([
        accountApi.get(tenantId),
        accountApi.getBills(tenantId),
        accountApi.getRecharges(tenantId)
      ]);
      
      if (accountRes.success) setAccount(accountRes.data);
      if (billsRes.success) setBills(billsRes.data || []);
      if (rechargesRes.success) setRecharges(rechargesRes.data || []);
    } catch (err) {
      console.error('加载账户数据失败:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

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

  // 计算试用期剩余天数
  const getTrialDaysLeft = () => {
    if (!account || account.status !== 'trial') return 0;
    const endDate = new Date(account.trialEndDate);
    const today = new Date();
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">试用中</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">正常</span>;
      case 'suspended':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">已暂停</span>;
      default:
        return null;
    }
  };

  const getBillStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1"><CheckCircle size={12} />已付款</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1"><Clock size={12} />待付款</span>;
      case 'overdue':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex items-center gap-1"><AlertCircle size={12} />逾期</span>;
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

  return (
    <div className="space-y-6">
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

        {/* 账户状态 */}
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-cyber-secondary" size={24} />
            <span className="text-gray-400 text-sm">账户状态</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {getStatusBadge(account?.status || 'trial')}
          </div>
          {account?.status === 'trial' && (
            <div className="text-sm text-gray-400 mt-2">
              试用期剩余 <span className="text-cyber-accent">{getTrialDaysLeft()}</span> 天
            </div>
          )}
          {account?.status === 'suspended' && (
            <div className="text-sm text-red-400 mt-2">
              账户已暂停，请充值后恢复
            </div>
          )}
        </div>

        {/* 费率信息 */}
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-cyber-accent" size={24} />
            <span className="text-gray-400 text-sm">费率信息</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">基础月费</span>
              <span className="text-white">¥{account?.basePrice || 50}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">免费窗口</span>
              <span className="text-white">{account?.freeWindows || 5} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">超出单价</span>
              <span className="text-white">¥{account?.pricePerWindow || 10}/窗口/月</span>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-4 border-b border-cyber-primary/30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'overview' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400 hover:text-white'}`}
        >
          概览
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'bills' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400 hover:text-white'}`}
        >
          账单记录
        </button>
        <button
          onClick={() => setActiveTab('recharges')}
          className={`px-4 py-2 text-sm font-mono transition-colors ${activeTab === 'recharges' ? 'text-cyber-primary border-b-2 border-cyber-primary' : 'text-gray-400 hover:text-white'}`}
        >
          充值记录
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'overview' && (
        <div className="bg-cyber-panel border border-cyber-primary/30 p-6">
          <h3 className="text-lg font-mono text-white mb-4">计费说明</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <p>• 每月1号自动生成上月账单，从账户余额扣款</p>
            <p>• 账单金额 = 基础月费 + (峰值窗口数 - 免费窗口数) × 超出单价</p>
            <p>• 峰值窗口数：当月每日窗口数的最大值</p>
            <p>• 余额不足时账户将被暂停，充值后自动恢复</p>
            <p>• 试用期内免费使用所有功能</p>
          </div>
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="bg-cyber-panel border border-cyber-primary/30">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无账单记录</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-sm">
                  <th className="p-4">月份</th>
                  <th className="p-4">窗口数</th>
                  <th className="p-4">基础费</th>
                  <th className="p-4">超出费</th>
                  <th className="p-4">总金额</th>
                  <th className="p-4">状态</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5">
                    <td className="p-4 font-mono">{bill.month}</td>
                    <td className="p-4">
                      {bill.peakWindowCount} 个
                      {bill.extraWindows > 0 && (
                        <span className="text-xs text-gray-500 ml-1">(超出{bill.extraWindows})</span>
                      )}
                    </td>
                    <td className="p-4">¥{bill.basePrice}</td>
                    <td className="p-4">¥{bill.extraPrice}</td>
                    <td className="p-4 text-cyber-accent font-mono">¥{bill.totalAmount}</td>
                    <td className="p-4">{getBillStatusBadge(bill.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'recharges' && (
        <div className="bg-cyber-panel border border-cyber-primary/30">
          {recharges.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无充值记录</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyber-primary/20 text-left text-gray-400 text-sm">
                  <th className="p-4">时间</th>
                  <th className="p-4">金额</th>
                  <th className="p-4">方式</th>
                  <th className="p-4">余额变化</th>
                  <th className="p-4">备注</th>
                </tr>
              </thead>
              <tbody>
                {recharges.map(record => (
                  <tr key={record.id} className="border-b border-cyber-primary/10 hover:bg-cyber-primary/5">
                    <td className="p-4 text-sm">{new Date(record.createdAt).toLocaleString()}</td>
                    <td className="p-4 text-green-400 font-mono">+¥{record.amount}</td>
                    <td className="p-4 text-sm">{record.method === 'wechat' ? '微信支付' : '手动充值'}</td>
                    <td className="p-4 text-sm text-gray-400">
                      ¥{record.balanceBefore} → ¥{record.balanceAfter}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{record.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 充值弹窗 */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <button
              onClick={() => {
                setShowRechargeModal(false);
                setQrCodeUrl('');
                setCurrentOrderId('');
              }}
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
                  {/* 这里需要用 QR 码库生成二维码，暂时显示链接 */}
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
    </div>
  );
};
