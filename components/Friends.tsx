import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Check, X, Send, ArrowRightLeft, Trash2, Server } from 'lucide-react';
import { GlassCard, CyberButton, CyberInput, useCyberModal } from './CyberUI';
import { friendApi, transferApi, machineTransferApi } from '../api';
import { CloudWindow, CloudMachine } from '../types';
import { formatWan } from '../utils';

interface Friend {
  id: string;
  tenantId: string;
  name: string;
}

interface FriendRequest {
  _id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
}

interface TransferRequest {
  _id: string;
  fromTenantId: string;
  fromTenantName: string;
  toTenantId: string;
  toTenantName: string;
  windowId: string;
  windowInfo: any;
}

interface MachineTransferRequest {
  _id: string;
  fromTenantId: string;
  fromTenantName: string;
  toTenantId: string;
  toTenantName: string;
  machineId: string;
  machineInfo: any;
  windowIds: string[];
  windowsInfo: any[];
  price: number;
  totalGold: number;
}

interface Props {
  tenantId: string;
  tenantName: string;
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  purchases: { amount: number; cost: number }[];
  onRefresh: () => void;
}

export const Friends: React.FC<Props> = ({ tenantId, tenantName, cloudWindows, cloudMachines, purchases, onRefresh }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [sentTransfers, setSentTransfers] = useState<TransferRequest[]>([]);
  const [machineTransferRequests, setMachineTransferRequests] = useState<MachineTransferRequest[]>([]);
  const [sentMachineTransfers, setSentMachineTransfers] = useState<MachineTransferRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [selectedWindowId, setSelectedWindowId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [transferType, setTransferType] = useState<'window' | 'machine'>('window');
  const [showMachineTransferModal, setShowMachineTransferModal] = useState<Friend | null>(null);
  const [transferPrice, setTransferPrice] = useState('');
  const { showSuccess, showAlert, ModalComponent } = useCyberModal();

  const loadData = async () => {
    const [friendsRes, requestsRes, transferRes, sentRes, machineTransferRes, sentMachineRes] = await Promise.all([
      friendApi.list(tenantId),
      friendApi.getRequests(tenantId),
      transferApi.getRequests(tenantId),
      transferApi.getSent(tenantId),
      machineTransferApi.getRequests(tenantId),
      machineTransferApi.getSent(tenantId)
    ]);
    if (friendsRes.success) setFriends(friendsRes.data);
    if (requestsRes.success) setRequests(requestsRes.data);
    if (transferRes.success) setTransferRequests(transferRes.data);
    if (sentRes.success) setSentTransfers(sentRes.data);
    if (machineTransferRes.success) setMachineTransferRequests(machineTransferRes.data);
    if (sentMachineRes.success) setSentMachineTransfers(sentMachineRes.data);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const handleSearch = async () => {
    setSearchError('');
    setSearchResult(null);
    if (!searchUsername.trim()) return;
    
    const res = await friendApi.search(searchUsername.trim());
    if (res.success) {
      if (res.user.tenantId === tenantId) {
        setSearchError('不能添加自己');
      } else {
        setSearchResult(res.user);
      }
    } else {
      setSearchError(res.error || '用户不存在');
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    const res = await friendApi.sendRequest({
      fromId: tenantId,
      fromName: tenantName,
      toId: searchResult.tenantId,
      toName: searchResult.name
    });
    if (res.success) {
      showSuccess('发送成功', '好友请求已发送');
      setSearchResult(null);
      setSearchUsername('');
    } else {
      showAlert('发送失败', res.error);
    }
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    await friendApi.respond(requestId, accept);
    loadData();
    showSuccess(accept ? '已添加好友' : '已拒绝', '');
  };

  const handleDeleteFriend = async (id: string) => {
    await friendApi.delete(id);
    loadData();
    showSuccess('已删除', '好友已删除');
  };

  const handleRespondTransfer = async (transferId: string, accept: boolean) => {
    await transferApi.respond(transferId, accept);
    loadData();
    onRefresh();
    showSuccess(accept ? '已接收窗口' : '已拒绝', '');
  };

  const handleCancelTransfer = async (id: string) => {
    await transferApi.cancel(id);
    loadData();
    showSuccess('已取消', '转让请求已取消');
  };

  // 计算平均币价
  const avgCostPerGold = (() => {
    let totalAmount = 0;
    let totalCost = 0;
    purchases.forEach(p => {
      if (p.amount > 0) {
        totalAmount += p.amount;
        totalCost += p.cost;
      }
    });
    return totalAmount > 0 ? totalCost / totalAmount : 0;
  })();

  // 窗口转让
  const handleWindowTransfer = async () => {
    if (!showMachineTransferModal || !selectedWindowId) return;
    const window = cloudWindows.find(w => w.id === selectedWindowId);
    if (!window) return;
    
    const machine = cloudMachines.find(m => m.id === window.machineId);
    const totalGold = window.goldBalance;
    
    // 使用平均币价计算默认价格
    const price = parseFloat(transferPrice) || (totalGold * avgCostPerGold);
    
    const res = await machineTransferApi.request({
      fromTenantId: tenantId,
      fromTenantName: tenantName,
      toTenantId: showMachineTransferModal.tenantId,
      toTenantName: showMachineTransferModal.name,
      machineId: window.machineId,
      machineInfo: { phone: machine?.phone, platform: machine?.platform },
      windowIds: [window.id],
      windowsInfo: [{ windowNumber: window.windowNumber, goldBalance: window.goldBalance }],
      price: price,
      totalGold
    });
    
    if (res.success) {
      showSuccess('发送成功', '窗口转让请求已发送');
      setShowMachineTransferModal(null);
      setSelectedWindowId('');
      setTransferPrice('');
      loadData();
    } else {
      showAlert('发送失败', res.error);
    }
  };

  // 云机转让（转让整个云机及其所有窗口）
  const handleFullMachineTransfer = async () => {
    if (!showMachineTransferModal || !selectedMachineId) return;
    const machine = cloudMachines.find(m => m.id === selectedMachineId);
    if (!machine) return;
    
    // 获取该云机下所有未分配的窗口
    const machineWindows = cloudWindows.filter(w => w.machineId === selectedMachineId && !w.userId);
    if (machineWindows.length === 0) {
      showAlert('无法转让', '该云机下没有可转让的窗口（已分配给员工的窗口不能转让）');
      return;
    }
    
    const totalGold = machineWindows.reduce((sum, w) => sum + w.goldBalance, 0);
    const price = parseFloat(transferPrice) || (totalGold * avgCostPerGold);
    
    const res = await machineTransferApi.request({
      fromTenantId: tenantId,
      fromTenantName: tenantName,
      toTenantId: showMachineTransferModal.tenantId,
      toTenantName: showMachineTransferModal.name,
      machineId: selectedMachineId,
      machineInfo: { phone: machine.phone, platform: machine.platform, loginType: machine.loginType, loginPassword: machine.loginPassword },
      windowIds: machineWindows.map(w => w.id),
      windowsInfo: machineWindows.map(w => ({ windowNumber: w.windowNumber, goldBalance: w.goldBalance })),
      price: price,
      totalGold
    });
    
    if (res.success) {
      showSuccess('发送成功', '云机转让请求已发送');
      setShowMachineTransferModal(null);
      setSelectedMachineId('');
      setTransferPrice('');
      setTransferType('window');
      loadData();
    } else {
      showAlert('发送失败', res.error);
    }
  };

  // 统一的转让处理
  const handleTransfer = () => {
    if (transferType === 'window') {
      handleWindowTransfer();
    } else {
      handleFullMachineTransfer();
    }
  };

  const handleRespondMachineTransfer = async (transferId: string, accept: boolean) => {
    await machineTransferApi.respond(transferId, accept);
    loadData();
    onRefresh();
    showSuccess(accept ? '已接收云机' : '已拒绝', '');
  };

  const handleCancelMachineTransfer = async (id: string) => {
    await machineTransferApi.cancel(id);
    loadData();
    showSuccess('已取消', '云机转让请求已取消');
  };

  // 可转让的窗口（未分配给员工的）
  const transferableWindows = cloudWindows.filter(w => !w.userId);
  
  // 可转让的云机（至少有一个未分配窗口的云机）
  const transferableMachines = cloudMachines.filter(m => 
    cloudWindows.some(w => w.machineId === m.id && !w.userId)
  );

  return (
    <div className="space-y-6">
      {/* 搜索添加好友 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4 text-cyber-primary">
          <UserPlus size={20} />
          <h2 className="font-mono text-lg">添加好友</h2>
        </div>
        <div className="flex gap-3">
          <CyberInput
            placeholder="输入对方用户名（手机号）"
            value={searchUsername}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchUsername(e.target.value)}
            className="flex-1"
          />
          <CyberButton onClick={handleSearch}>
            <Search size={16} className="mr-1" /> 搜索
          </CyberButton>
        </div>
        {searchError && <p className="text-red-400 text-sm mt-2">{searchError}</p>}
        {searchResult && (
          <div className="mt-3 p-3 bg-black/30 rounded border border-cyber-primary/30 flex justify-between items-center">
            <div>
              <div className="font-mono">{searchResult.name}</div>
              <div className="text-sm text-gray-400">{searchResult.username}</div>
            </div>
            <CyberButton onClick={handleSendRequest}>
              <Send size={14} className="mr-1" /> 发送请求
            </CyberButton>
          </div>
        )}
      </GlassCard>

      {/* 好友请求 */}
      {requests.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-yellow-400">
            <UserPlus size={20} />
            <h2 className="font-mono text-lg">好友请求 ({requests.length})</h2>
          </div>
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req._id} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded flex justify-between items-center">
                <div>
                  <div className="font-mono">{req.fromName}</div>
                  <div className="text-sm text-gray-400">请求添加你为好友</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondRequest(req._id, true)} className="p-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleRespondRequest(req._id, false)} className="p-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 窗口转让请求 */}
      {transferRequests.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-cyber-accent">
            <ArrowRightLeft size={20} />
            <h2 className="font-mono text-lg">收到的窗口转让 ({transferRequests.length})</h2>
          </div>
          <div className="space-y-2">
            {transferRequests.map(req => (
              <div key={req._id} className="p-3 bg-cyber-accent/10 border border-cyber-accent/30 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono">{req.fromTenantName} 转让窗口给你</div>
                    <div className="text-sm text-gray-400">
                      窗口 #{req.windowInfo?.windowNumber} | 余额: {(req.windowInfo?.goldBalance / 10000).toFixed(2)} 万
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespondTransfer(req._id, true)} className="p-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30">
                      <Check size={16} />
                    </button>
                    <button onClick={() => handleRespondTransfer(req._id, false)} className="p-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 我发起的窗口转让 */}
      {sentTransfers.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <ArrowRightLeft size={20} />
            <h2 className="font-mono text-lg">等待对方接收窗口 ({sentTransfers.length})</h2>
          </div>
          <div className="space-y-2">
            {sentTransfers.map(req => (
              <div key={req._id} className="p-3 bg-black/30 border border-gray-600 rounded flex justify-between items-center">
                <div>
                  <div className="font-mono">转让给 {req.toTenantName}</div>
                  <div className="text-sm text-gray-400">窗口 #{req.windowInfo?.windowNumber}</div>
                </div>
                <button onClick={() => handleCancelTransfer(req._id)} className="p-2 text-gray-400 hover:text-red-400">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 云机转让请求（收到的） */}
      {machineTransferRequests.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-green-400">
            <Server size={20} />
            <h2 className="font-mono text-lg">收到的云机转让 ({machineTransferRequests.length})</h2>
          </div>
          <div className="space-y-2">
            {machineTransferRequests.map(req => (
              <div key={req._id} className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono">{req.fromTenantName} 转让云机给你</div>
                    <div className="text-sm text-gray-400">
                      云机: {req.machineInfo?.phone} ({req.machineInfo?.platform})
                    </div>
                    <div className="text-sm text-gray-400">
                      包含 {req.windowsInfo?.length || 0} 个窗口 | 总余额: {formatWan(req.totalGold)}
                    </div>
                    <div className="text-sm text-cyber-accent">
                      转让价格: ¥{req.price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespondMachineTransfer(req._id, true)} className="p-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30">
                      <Check size={16} />
                    </button>
                    <button onClick={() => handleRespondMachineTransfer(req._id, false)} className="p-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 我发起的云机转让 */}
      {sentMachineTransfers.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Server size={20} />
            <h2 className="font-mono text-lg">等待对方接收云机 ({sentMachineTransfers.length})</h2>
          </div>
          <div className="space-y-2">
            {sentMachineTransfers.map(req => (
              <div key={req._id} className="p-3 bg-black/30 border border-gray-600 rounded flex justify-between items-center">
                <div>
                  <div className="font-mono">转让给 {req.toTenantName}</div>
                  <div className="text-sm text-gray-400">
                    云机: {req.machineInfo?.phone} | {req.windowsInfo?.length || 0} 个窗口 | ¥{req.price?.toFixed(2)}
                  </div>
                </div>
                <button onClick={() => handleCancelMachineTransfer(req._id)} className="p-2 text-gray-400 hover:text-red-400">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 好友列表 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4 text-cyber-primary">
          <Users size={20} />
          <h2 className="font-mono text-lg">我的好友 ({friends.length})</h2>
        </div>
        {friends.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无好友</p>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => (
              <div key={friend.id} className="p-3 bg-black/30 rounded border border-cyber-primary/20 flex justify-between items-center">
                <div className="font-mono">{friend.name}</div>
                <div className="flex gap-2">
                  <CyberButton onClick={() => setShowMachineTransferModal(friend)} className="text-sm py-1">
                    <ArrowRightLeft size={14} className="mr-1" /> 转让窗口
                  </CyberButton>
                  <button onClick={() => handleDeleteFriend(friend.id)} className="p-2 text-gray-400 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 转让弹窗 */}
      {showMachineTransferModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-mono text-cyber-primary mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} /> 转让给 {showMachineTransferModal.name}
            </h3>
            
            {/* 转让类型选择 */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">转让类型</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTransferType('window'); setSelectedMachineId(''); }}
                  className={`flex-1 py-2 px-3 border font-mono text-sm ${transferType === 'window' ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary' : 'border-gray-600 text-gray-400'}`}
                >
                  转让窗口
                </button>
                <button
                  onClick={() => { setTransferType('machine'); setSelectedWindowId(''); }}
                  className={`flex-1 py-2 px-3 border font-mono text-sm ${transferType === 'machine' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-gray-600 text-gray-400'}`}
                >
                  <Server size={14} className="inline mr-1" /> 转让云机
                </button>
              </div>
            </div>

            {/* 窗口转让 */}
            {transferType === 'window' && (
              <>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">选择要转让的窗口</label>
                  <select
                    value={selectedWindowId}
                    onChange={e => {
                      setSelectedWindowId(e.target.value);
                      const w = cloudWindows.find(win => win.id === e.target.value);
                      if (w) {
                        const defaultPrice = (w.goldBalance * avgCostPerGold).toFixed(2);
                        setTransferPrice(defaultPrice);
                      }
                    }}
                    className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2"
                  >
                    <option value="">请选择窗口</option>
                    {transferableWindows.map(w => {
                      const machine = cloudMachines.find(m => m.id === w.machineId);
                      return (
                        <option key={w.id} value={w.id}>
                          #{w.windowNumber} - {machine?.phone} - {formatWan(w.goldBalance)}
                        </option>
                      );
                    })}
                  </select>
                  {transferableWindows.length === 0 && (
                    <p className="text-yellow-400 text-sm mt-2">没有可转让的窗口（已分配给员工的窗口不能转让）</p>
                  )}
                </div>
                {selectedWindowId && (
                  <div className="mb-4 p-3 bg-black/30 rounded border border-cyber-primary/20">
                    <div className="text-sm text-gray-400 mb-2">窗口详情:</div>
                    {(() => {
                      const window = cloudWindows.find(w => w.id === selectedWindowId);
                      const machine = cloudMachines.find(m => m.id === window?.machineId);
                      return (
                        <div className="text-sm">
                          <div>窗口号: #{window?.windowNumber}</div>
                          <div>云机: {machine?.phone} ({machine?.platform})</div>
                          <div className="text-cyber-accent">余额: {formatWan(window?.goldBalance || 0)}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {/* 云机转让 */}
            {transferType === 'machine' && (
              <>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">选择要转让的云机</label>
                  <select
                    value={selectedMachineId}
                    onChange={e => {
                      setSelectedMachineId(e.target.value);
                      if (e.target.value) {
                        const machineWindows = cloudWindows.filter(w => w.machineId === e.target.value && !w.userId);
                        const totalGold = machineWindows.reduce((sum, w) => sum + w.goldBalance, 0);
                        const defaultPrice = (totalGold * avgCostPerGold).toFixed(2);
                        setTransferPrice(defaultPrice);
                      }
                    }}
                    className="w-full bg-black/40 border border-green-500/30 text-cyber-text font-mono px-3 py-2"
                  >
                    <option value="">请选择云机</option>
                    {transferableMachines.map(m => {
                      const machineWindows = cloudWindows.filter(w => w.machineId === m.id && !w.userId);
                      const totalGold = machineWindows.reduce((sum, w) => sum + w.goldBalance, 0);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.phone} ({m.platform}) - {machineWindows.length}个窗口 - {formatWan(totalGold)}
                        </option>
                      );
                    })}
                  </select>
                  {transferableMachines.length === 0 && (
                    <p className="text-yellow-400 text-sm mt-2">没有可转让的云机</p>
                  )}
                </div>
                {selectedMachineId && (
                  <div className="mb-4 p-3 bg-black/30 rounded border border-green-500/20">
                    <div className="text-sm text-gray-400 mb-2">云机详情:</div>
                    {(() => {
                      const machine = cloudMachines.find(m => m.id === selectedMachineId);
                      const machineWindows = cloudWindows.filter(w => w.machineId === selectedMachineId && !w.userId);
                      const totalGold = machineWindows.reduce((sum, w) => sum + w.goldBalance, 0);
                      return (
                        <div className="text-sm">
                          <div>手机号: {machine?.phone}</div>
                          <div>平台: {machine?.platform}</div>
                          <div>登录方式: {machine?.loginType === 'password' ? `密码 (${machine?.loginPassword})` : '验证码'}</div>
                          <div className="text-green-400 mt-2">包含 {machineWindows.length} 个窗口:</div>
                          <div className="mt-1 max-h-32 overflow-y-auto">
                            {machineWindows.map(w => (
                              <div key={w.id} className="text-xs text-gray-400">
                                #{w.windowNumber} - {formatWan(w.goldBalance)}
                              </div>
                            ))}
                          </div>
                          <div className="text-cyber-accent mt-2">总余额: {formatWan(totalGold)}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">转让价格（元）</label>
              <input
                type="number"
                step="0.01"
                value={transferPrice}
                onChange={e => setTransferPrice(e.target.value)}
                placeholder="输入转让价格"
                className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">默认按平均币价计算，对方接收后会自动创建采购记录</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowMachineTransferModal(null); setSelectedWindowId(''); setSelectedMachineId(''); setTransferPrice(''); setTransferType('window'); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <CyberButton onClick={handleTransfer} disabled={transferType === 'window' ? !selectedWindowId : !selectedMachineId} className="flex-1">
                确认转让
              </CyberButton>
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  );
};
