import React, { useState, useMemo, useEffect } from 'react';
import { Users, UserPlus, Trash2, Search, Crosshair, Monitor, X, ArrowRight, Clock, CheckCircle, Unlock, Plus, ExternalLink } from 'lucide-react';
import { GlassCard, CyberInput, NeonButton, SectionHeader, StatBox, CyberButton, useCyberModal } from './CyberUI';
import { Staff, OrderRecord, Settings, CloudWindow, CloudMachine, WindowResult } from '../types';
import { calculateStaffStats, formatCurrency, formatNumber, formatChineseNumber, formatWan, toWan } from '../utils';

interface StaffManagerProps {
  staffList: Staff[];
  orders: OrderRecord[];
  settings: Settings;
  cloudWindows: CloudWindow[];
  cloudMachines: CloudMachine[];
  onAddStaff: (email: string, password: string, name: string) => Promise<void>;
  onDeleteStaff: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onAssignWindow: (windowId: string, userId: string | null) => void;
  onCompleteOrder?: (orderId: string, windowResults: WindowResult[], bossEndBalance?: number) => void;
  onAddWindowToOrder?: (orderId: string, windowId: string) => Promise<void>;
  onLoginAsStaff?: (staffId: string, staffName: string) => void;
  isDispatcher?: boolean;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ staffList, orders, settings, cloudWindows, cloudMachines, onAddStaff, onDeleteStaff, onDeleteOrder, onAssignWindow, onCompleteOrder, onAddWindowToOrder, onLoginAsStaff, isDispatcher = false }) => {
  console.log('StaffManager received staffList:', staffList);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [filterName, setFilterName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [transferWindowId, setTransferWindowId] = useState<string | null>(null);
  const [transferTargetStaffId, setTransferTargetStaffId] = useState('');
  
  // 完成订单相关状态
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderWindowBalances, setOrderWindowBalances] = useState<Record<string, Record<string, string>>>({});
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState<{ order: OrderRecord; results: WindowResult[] } | null>(null);
  
  const { showAlert, showSuccess, ModalComponent } = useCyberModal();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUsername.trim() || !newStaffPassword.trim()) {
      setError('请填写完整信息');
      return;
    }
    if (newStaffPassword.length < 6) {
      setError('密码至少6位');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onAddStaff(newStaffUsername, newStaffPassword, newStaffName);
      setNewStaffName('');
      setNewStaffUsername('');
      setNewStaffPassword('');
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 只显示普通员工，不显示管理员
  const nonAdminStaffList = staffList.filter(s => s.role !== 'admin');
  const staffStats = useMemo(() => calculateStaffStats(orders, nonAdminStaffList, settings), [orders, nonAdminStaffList, settings]);

  const filteredStats = staffStats.filter(s => s.staff.name.toLowerCase().includes(filterName.toLowerCase()));

  const selectedStaffDetail = selectedStaffId 
    ? {
        stats: staffStats.find(s => s.staff.id === selectedStaffId),
        records: orders.filter(o => o.staffId === selectedStaffId).sort((a,b) => b.date.localeCompare(a.date))
      }
    : null;

  // 获取员工的窗口
  const getStaffWindows = (staffId: string) => cloudWindows.filter(w => w.userId === staffId);
  
  // 获取云机名称
  const getMachineName = (machineId: string) => {
    const machine = cloudMachines.find(m => m.id === machineId);
    return machine ? `${machine.phone} (${machine.platform})` : '未知';
  };

  // 释放窗口
  const handleReleaseWindow = (windowId: string) => {
    onAssignWindow(windowId, null);
  };

  // 获取员工窗口数量
  const getStaffWindowCount = (staffId: string) => cloudWindows.filter(w => w.userId === staffId).length;

  // 获取员工进行中的订单
  const getStaffPendingOrders = (staffId: string) => orders.filter(o => o.staffId === staffId && o.status === 'pending');

  // 当前订单的窗口余额
  const windowBalances = activeOrderId ? (orderWindowBalances[activeOrderId] || {}) : {};
  
  const setWindowBalances = (balances: Record<string, string>) => {
    if (activeOrderId) {
      setOrderWindowBalances(prev => ({ ...prev, [activeOrderId]: balances }));
    }
  };

  // 当前查看的订单
  const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;

  // 当打开完成订单弹窗时，初始化窗口余额为员工当前窗口
  useEffect(() => {
    if (activeOrderId && activeOrder) {
      const staffWindows = cloudWindows.filter(w => w.userId === activeOrder.staffId);
      setOrderWindowBalances(prev => {
        const currentBalances = prev[activeOrderId] || {};
        const newBalances: Record<string, string> = {};
        // 为员工当前窗口初始化余额
        staffWindows.forEach(w => {
          newBalances[w.id] = currentBalances[w.id] || '';
        });
        return { ...prev, [activeOrderId]: newBalances };
      });
    }
  }, [activeOrderId, activeOrder?.staffId, cloudWindows]);

  // 处理完成订单 - 使用员工当前窗口
  const handleCompleteOrder = (order: OrderRecord) => {
    if (!onCompleteOrder) return;
    
    // 获取员工当前窗口
    const staffWindows = cloudWindows.filter(w => w.userId === order.staffId);
    if (staffWindows.length === 0) {
      showAlert('无法完成', '该员工当前没有分配的窗口');
      return;
    }

    // 检查是否所有窗口都填写了余额
    const missingBalances = staffWindows.filter(w => !windowBalances[w.id] && windowBalances[w.id] !== '0');
    if (missingBalances.length > 0) {
      showAlert('请填写完整', `请填写所有窗口的剩余余额（还有 ${missingBalances.length} 个窗口未填写）`);
      return;
    }
    
    const results: WindowResult[] = staffWindows.map(window => {
      const endBalance = parseFloat(windowBalances[window.id]) * 10000;
      return {
        windowId: window.id,
        endBalance,
        consumed: window.goldBalance - endBalance
      };
    });

    const totalConsumed = results.reduce((sum, r) => sum + r.consumed, 0);
    if (totalConsumed < order.amount) {
      setPendingCompleteOrder({ order, results });
      return;
    }

    onCompleteOrder(order.id, results);
    setOrderWindowBalances(prev => { const n = {...prev}; delete n[order.id]; return n; });
    setActiveOrderId(null);
    showSuccess('操作成功', '订单已完成');
  };

  // 确认完成订单（消耗不足时）
  const confirmCompleteOrder = () => {
    if (pendingCompleteOrder && onCompleteOrder) {
      onCompleteOrder(pendingCompleteOrder.order.id, pendingCompleteOrder.results);
      setOrderWindowBalances(prev => { const n = {...prev}; delete n[pendingCompleteOrder.order.id]; return n; });
      setActiveOrderId(null);
      setPendingCompleteOrder(null);
      showSuccess('操作成功', '订单已完成');
    }
  };

  // 处理转让
  const handleTransfer = () => {
    if (!transferWindowId || !transferTargetStaffId) return;
    onAssignWindow(transferWindowId, transferTargetStaffId);
    showSuccess('转让成功', '窗口已转让给新员工');
    setTransferWindowId(null);
    setTransferTargetStaffId('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Add Staff Section - 客服隐藏 */}
      {!isDispatcher && (
        <GlassCard>
          <SectionHeader title="人事档案 // 创建员工账号" icon={Users} />
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <CyberInput 
              label="员工姓名" 
              placeholder="输入姓名..."
              value={newStaffName} 
              onChange={(e: any) => setNewStaffName(e.target.value)} 
            />
            <CyberInput 
              label="登录用户名" 
              type="text"
              placeholder="输入用户名..."
              value={newStaffUsername} 
              onChange={(e: any) => setNewStaffUsername(e.target.value)} 
            />
            <CyberInput 
              label="登录密码" 
              type="password"
              placeholder="至少6位..."
              value={newStaffPassword} 
              onChange={(e: any) => setNewStaffPassword(e.target.value)} 
            />
            <div className="mb-4">
              <NeonButton type="submit">
                <span className="flex items-center gap-2">
                  {loading ? '创建中...' : <><UserPlus size={16} /> 创建账号</>}
                </span>
              </NeonButton>
            </div>
          </form>
          {error && (
            <div className="text-red-500 text-sm font-mono bg-red-500/10 border border-red-500/30 p-2 mt-2">
              {error}
            </div>
          )}
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Staff List / Filter */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
             <input
              type="text"
              placeholder="搜索员工..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 text-cyber-text font-mono px-4 py-2 pl-10 focus:outline-none focus:border-cyber-primary focus:shadow-neon-cyan transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredStats.map((stat) => (
              <div 
                key={stat.staff.id}
                onClick={() => setSelectedStaffId(stat.staff.id)}
                className={`p-4 border-l-2 cursor-pointer transition-all hover:bg-cyber-primary/10 relative overflow-hidden group shadow-sm bg-cyber-panel
                  ${selectedStaffId === stat.staff.id ? 'border-l-cyber-primary bg-cyber-primary/5' : 'border-l-gray-700'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-cyber-primary">{stat.staff.name}</div>
                    {stat.staff.username && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        @{stat.staff.username}
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      {stat.staff.role === 'admin' ? '管理员' : '员工'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onLoginAsStaff && stat.staff.role !== 'admin' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onLoginAsStaff(stat.staff.id, stat.staff.name); }}
                        className="text-purple-400 hover:text-purple-300 z-10 p-1"
                        title="进入员工后台"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteStaff(stat.staff.id); }}
                      className="text-gray-600 hover:text-red-500 z-10 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-500 font-bold">
                  <div>总单量: <span className="text-gray-300">{stat.totalOrders}</span></div>
                  <div>总业绩: <span className="text-cyber-primary">{formatNumber(stat.totalAmount)}</span></div>
                </div>
              </div>
            ))}
            {filteredStats.length === 0 && <div className="text-gray-600 text-center py-4 font-mono">未找到匹配员工</div>}
          </div>
        </div>

        {/* 3. Detailed View */}
        <div className="lg:col-span-2">
          {selectedStaffDetail && selectedStaffDetail.stats ? (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatBox 
                  label="累计单量" 
                  value={selectedStaffDetail.stats.totalOrders.toString()}
                  subValue="历史接单数"
                />
                <StatBox 
                  label="累计产出金额" 
                  value={`${formatChineseNumber(selectedStaffDetail.stats.totalAmount)} 万`}
                  subValue="总流水"
                />
                <StatBox 
                  label="累计额外损耗" 
                  value={`${toWan(selectedStaffDetail.stats.totalLoss)} 万`}
                  subValue="总损耗"
                  trend="down"
                />
                <StatBox 
                  label="损耗比" 
                  value={selectedStaffDetail.stats.totalAmount > 0 
                    ? `${((selectedStaffDetail.stats.totalLoss / 10000 / selectedStaffDetail.stats.totalAmount) * 100).toFixed(2)}%`
                    : '0%'}
                  subValue="损耗/产出"
                  trend="down"
                />
              </div>

              {/* 员工窗口 */}
              <GlassCard>
                <h3 className="text-cyber-primary font-mono text-sm mb-4 flex items-center gap-2 border-b border-gray-800 pb-2 font-bold uppercase tracking-wider">
                  <Monitor size={16} className="text-cyber-primary" /> {selectedStaffDetail.stats.staff.name} // 使用中的窗口
                </h3>
                {(() => {
                  const staffWindows = getStaffWindows(selectedStaffId!);
                  const totalGold = staffWindows.reduce((sum, w) => sum + w.goldBalance, 0);
                  return staffWindows.length > 0 ? (
                    <div>
                      <div className="mb-3 text-sm text-gray-400">
                        共 <span className="text-cyber-accent font-bold">{staffWindows.length}</span> 个窗口，
                        总余额 <span className="text-cyber-accent font-bold">{formatWan(totalGold)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {staffWindows.map(window => (
                          <div key={window.id} className="p-3 bg-cyber-primary/10 border border-cyber-primary/30 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-bold text-white">{window.windowNumber}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setTransferWindowId(window.id)}
                                  className="text-cyber-primary hover:text-cyber-accent p-1"
                                  title="转让窗口"
                                >
                                  <ArrowRight size={14} />
                                </button>
                                <button
                                  onClick={() => handleReleaseWindow(window.id)}
                                  className="text-yellow-500 hover:text-yellow-400 p-1"
                                  title="释放窗口"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mb-1">{getMachineName(window.machineId)}</div>
                            <div className="text-cyber-accent font-mono">{formatWan(window.goldBalance)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">该员工暂无分配的窗口</div>
                  );
                })()}
              </GlassCard>

              {/* 员工进行中的订单 */}
              {(() => {
                const pendingOrders = getStaffPendingOrders(selectedStaffId!);
                if (pendingOrders.length === 0) return null;
                return (
                  <GlassCard>
                    <h3 className="text-yellow-400 font-mono text-sm mb-4 flex items-center gap-2 border-b border-gray-800 pb-2 font-bold uppercase tracking-wider">
                      <Clock size={16} className="text-yellow-400" /> {selectedStaffDetail.stats.staff.name} // 进行中的订单
                    </h3>
                    <div className="space-y-3">
                      {pendingOrders.map(order => (
                        <div key={order.id} className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-mono text-lg text-white">{order.date}</div>
                              <div className="text-sm text-gray-400">
                                订单金额: <span className="text-cyber-accent">{order.amount}</span> 万 | 
                                窗口数: <span className="text-cyber-primary">{order.windowSnapshots?.length || 0}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDeleteOrderId(order.id)}
                                className="px-3 py-2 bg-red-500/20 border border-red-500/50 text-red-400 text-sm hover:bg-red-500/30 flex items-center gap-1"
                              >
                                <Trash2 size={14} /> 删除
                              </button>
                              {onCompleteOrder && (
                                <CyberButton onClick={() => {
                                  setActiveOrderId(order.id);
                                  // 初始化窗口余额为员工当前窗口
                                  const staffWindows = cloudWindows.filter(w => w.userId === order.staffId);
                                  const balances: Record<string, string> = {};
                                  staffWindows.forEach(w => {
                                    balances[w.id] = '';
                                  });
                                  if (!orderWindowBalances[order.id]) {
                                    setOrderWindowBalances(prev => ({ ...prev, [order.id]: balances }));
                                  }
                                }}>
                                  完成订单
                                </CyberButton>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                );
              })()}

              <GlassCard>
                <h3 className="text-cyber-secondary font-mono text-sm mb-4 flex items-center gap-2 border-b border-gray-800 pb-2 font-bold uppercase tracking-wider">
                  <Crosshair size={16} className="text-cyber-secondary" /> {selectedStaffDetail.stats.staff.name} // 作业记录明细
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800 uppercase text-xs">
                        <th className="p-3">日期</th>
                        <th className="p-3">单价</th>
                        <th className="p-3">订单金额 (万)</th>
                        <th className="p-3 text-red-500">损耗 (万)</th>
                        <th className="p-3 text-yellow-500">损耗比 (%)</th>
                        <th className="p-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {selectedStaffDetail.records.map(r => {
                        const lossInWan = (r.loss || 0) / 10000;
                        const lossRatio = r.amount > 0 ? (lossInWan / r.amount * 100).toFixed(2) : '0';
                        return (
                          <tr key={r.id} className="hover:bg-cyber-primary/5">
                            <td className="p-3 text-white font-bold">{r.date}</td>
                            <td className="p-3 text-cyber-accent font-bold">{r.unitPrice ?? settings.orderUnitPrice}</td>
                            <td className="p-3 text-cyber-primary font-bold">{formatNumber(r.amount)}</td>
                            <td className="p-3 text-red-500">{r.loss > 0 ? toWan(r.loss) : '-'}</td>
                            <td className="p-3 text-yellow-500">{r.loss > 0 ? `${lossRatio}%` : '-'}</td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => setDeleteOrderId(r.id)}
                                className="text-gray-600 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-cyber-primary/50 bg-cyber-primary/10 font-bold">
                        <td className="p-3 text-cyber-primary">合计</td>
                        <td className="p-3">-</td>
                        <td className="p-3 text-cyber-primary">{formatNumber(selectedStaffDetail.stats.totalAmount)}</td>
                        <td className="p-3 text-red-500">{toWan(selectedStaffDetail.stats.totalLoss)}</td>
                        <td className="p-3 text-yellow-500">
                          {selectedStaffDetail.stats.totalAmount > 0 
                            ? ((selectedStaffDetail.stats.totalLoss / 10000 / selectedStaffDetail.stats.totalAmount) * 100).toFixed(2)
                            : '0'}%
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </GlassCard>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-gray-700 text-gray-600 font-mono p-10 bg-cyber-panel/50">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>请选择一名员工查看详细数据</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 删除订单确认弹窗 */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-cyber-panel border border-red-500 p-6 max-w-md w-full relative">
            <div className="absolute top-0 left-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
            <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-red-500 shadow-lg"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border border-red-500 flex items-center justify-center text-red-400 font-mono text-lg">!</div>
              <h3 className="text-xl font-mono text-red-400 tracking-wider">确认删除</h3>
            </div>
            <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">确认删除该订单？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
              <button onClick={() => { onDeleteOrder(deleteOrderId); setDeleteOrderId(null); }} className="flex-1 py-2 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/40 font-mono text-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 转让窗口弹窗 */}
      {transferWindowId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-cyber-panel border border-cyber-primary p-6 max-w-md w-full relative">
            <div className="absolute top-0 left-0 w-16 h-[2px] bg-cyber-primary shadow-lg"></div>
            <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-cyber-primary shadow-lg"></div>
            <h3 className="text-xl font-mono text-cyber-primary mb-4">转让窗口</h3>
            <p className="text-sm text-gray-400 mb-4">
              窗口 {cloudWindows.find(w => w.id === transferWindowId)?.windowNumber} 
              → 选择目标员工
            </p>
            <select
              value={transferTargetStaffId}
              onChange={e => setTransferTargetStaffId(e.target.value)}
              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 mb-4"
            >
              <option value="">选择目标员工...</option>
              {staffList.filter(s => s.role === 'staff' && s.id !== selectedStaffId).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({getStaffWindowCount(s.id)}个窗口)
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setTransferWindowId(null); setTransferTargetStaffId(''); }} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm">取消</button>
              <button onClick={handleTransfer} disabled={!transferTargetStaffId} className="flex-1 py-2 bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:bg-cyber-primary/30 font-mono text-sm disabled:opacity-50">确认转让</button>
            </div>
          </div>
        </div>
      )}

      <ModalComponent />

      {/* 完成订单弹窗 - 使用员工当前窗口 */}
      {activeOrder && onCompleteOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-panel border border-cyber-primary/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-mono text-cyber-primary mb-4">完成订单 - {activeOrder.date}</h3>
            <div className="mb-4 p-3 bg-black/30 rounded flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">订单金额</div>
                <div className="text-2xl font-mono text-cyber-accent">{activeOrder.amount} 万</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">员工</div>
                <div className="text-lg font-mono text-white">{staffList.find(s => s.id === activeOrder.staffId)?.name || '未知'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">当前窗口数</div>
                <div className="text-lg font-mono text-cyber-primary">{cloudWindows.filter(w => w.userId === activeOrder.staffId).length}</div>
              </div>
            </div>

            {/* 已释放的窗口（partialResults） */}
            {activeOrder.partialResults && activeOrder.partialResults.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <div className="text-sm text-yellow-400 font-mono mb-2">已释放的窗口:</div>
                {activeOrder.partialResults.map((pr, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex justify-between">
                    <span>{pr.windowNumber} - {pr.staffName}</span>
                    <span>消耗: <span className="text-red-400">{formatWan(pr.consumed)}</span></span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-sm text-cyber-primary font-mono mb-2">请填写每个窗口的剩余哈夫币（万）(不填则默认无消耗):</div>
            <div className="space-y-3 mb-6">
              {/* 使用员工当前窗口 */}
              {cloudWindows.filter(w => w.userId === activeOrder.staffId).map(window => {
                const inputValue = windowBalances[window.id] || '';
                const startBalance = window.goldBalance;
                const endBalance = inputValue ? parseFloat(inputValue) * 10000 : startBalance;
                const consumed = startBalance - endBalance;
                return (
                  <div key={window.id} className={`bg-black/30 p-3 rounded border ${inputValue === '0' ? 'border-red-500/50' : 'border-cyber-primary/20'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-mono">{window.windowNumber}</span>
                        <span className="text-xs text-gray-500 ml-2">{getMachineName(window.machineId)}</span>
                        {inputValue === '0' && <span className="text-xs text-red-400 ml-2">✓ 已消耗完</span>}
                      </div>
                      <div className="text-xs text-gray-400">当前余额: {formatWan(startBalance)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`${toWan(startBalance)} 万 (当前余额)`}
                        value={inputValue}
                        onChange={e => setWindowBalances({...windowBalances, [window.id]: e.target.value})}
                        className="flex-1 bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-3 py-2 placeholder:text-gray-600 placeholder:opacity-50"
                      />
                      <div className={`text-sm font-mono min-w-[70px] ${consumed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatWan(consumed)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const startBalanceWan = String(startBalance / 10000);
                          setWindowBalances({...windowBalances, [window.id]: startBalanceWan});
                        }}
                        className={`px-2 py-2 text-xs font-mono border ${
                          inputValue === String(startBalance / 10000)
                            ? 'bg-green-500/20 border-green-500 text-green-400' 
                            : 'border-green-500 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        未使用
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWindowBalances({...windowBalances, [window.id]: '0'});
                        }}
                        className={`px-2 py-2 text-xs font-mono border ${
                          inputValue === '0'
                            ? 'bg-red-500/20 border-red-500 text-red-400' 
                            : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                        }`}
                      >
                        消耗完
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 汇总 - 使用员工当前窗口计算 */}
            <div className="mb-6 p-3 bg-cyber-primary/10 rounded border border-cyber-primary/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-400">总消耗 (万)</div>
                  <div className="font-mono text-lg">
                    {toWan(
                      (cloudWindows.filter(w => w.userId === activeOrder.staffId).reduce((sum, w) => {
                        const end = windowBalances[w.id] 
                          ? parseFloat(windowBalances[w.id]) * 10000
                          : w.goldBalance;
                        return sum + (w.goldBalance - end);
                      }, 0) || 0) +
                      (activeOrder.partialResults?.reduce((sum, pr) => sum + pr.consumed, 0) || 0)
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">订单金额 (万)</div>
                  <div className="font-mono text-lg text-cyber-accent">{activeOrder.amount}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">损耗 (万)</div>
                  <div className="font-mono text-lg text-red-400">
                    {(() => {
                      const currentConsumed = cloudWindows.filter(w => w.userId === activeOrder.staffId).reduce((sum, w) => {
                        const end = windowBalances[w.id] 
                          ? parseFloat(windowBalances[w.id]) * 10000
                          : w.goldBalance;
                        return sum + (w.goldBalance - end);
                      }, 0) || 0;
                      const partialConsumed = activeOrder.partialResults?.reduce((sum, pr) => sum + pr.consumed, 0) || 0;
                      const totalConsumed = currentConsumed + partialConsumed;
                      const orderAmountInCoins = activeOrder.amount * 10000;
                      const loss = totalConsumed - orderAmountInCoins;
                      return loss > 0 ? toWan(loss) : '0';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveOrderId(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <CyberButton onClick={() => handleCompleteOrder(activeOrder)} className="flex-1">
                <CheckCircle size={16} className="mr-2" /> 确认完成
              </CyberButton>
            </div>
          </div>
        </div>
      )} 

      {/* 确认完成弹窗（消耗不足时） */}
      {pendingCompleteOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-cyber-panel border border-yellow-500/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-mono text-yellow-400 mb-4">确认完成</h3>
            <p className="text-gray-400 mb-4">
              总消耗量小于订单金额，确定要完成此订单吗？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingCompleteOrder(null)} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800">
                取消
              </button>
              <button onClick={confirmCompleteOrder} className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30">
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
