import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Trash2, Search, Crosshair, Monitor, X } from 'lucide-react';
import { GlassCard, CyberInput, NeonButton, SectionHeader, StatBox, useCyberModal } from './CyberUI';
import { Staff, OrderRecord, Settings, CloudWindow, CloudMachine } from '../types';
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
}

export const StaffManager: React.FC<StaffManagerProps> = ({ staffList, orders, settings, cloudWindows, cloudMachines, onAddStaff, onDeleteStaff, onDeleteOrder, onAssignWindow }) => {
  console.log('StaffManager received staffList:', staffList);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [filterName, setFilterName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const { ModalComponent } = useCyberModal();

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

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Add Staff Section */}
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteStaff(stat.staff.id); }}
                    className="text-gray-600 hover:text-red-500 z-10 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
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
                              <span className="font-mono font-bold text-white">#{window.windowNumber}</span>
                              <button
                                onClick={() => handleReleaseWindow(window.id)}
                                className="text-yellow-500 hover:text-yellow-400 p-1"
                                title="释放窗口"
                              >
                                <X size={14} />
                              </button>
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

      <ModalComponent />
    </div>
  );
};
