import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Shield, Headphones, UserPlus, Trash2, Phone, Check, X } from 'lucide-react';
import { GlassCard, SectionHeader, CyberInput, NeonButton, useCyberModal, CyberButton } from './CyberUI';
import { Settings as SettingsType } from '../types';
import { superApi, dispatcherApi, contactApi } from '../api';

interface Dispatcher {
  id: string;
  username: string;
  name: string;
}

interface ContactRequest {
  _id: string;
  tenantId: string;
  tenantName: string;
  contact: string;
  message: string;
  status: 'pending' | 'processed';
  createdAt: string;
}

interface SettingsProps {
  settings: SettingsType;
  onSave: (newSettings: SettingsType) => void;
  tenantId?: string;
  username?: string;
  onSuperLogin?: (superUser: any) => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({ settings, onSave, tenantId, username, onSuperLogin }) => {
  const [form, setForm] = useState(settings);
  
  // 客服管理
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [showAddDispatcher, setShowAddDispatcher] = useState(false);
  const [newDispatcherName, setNewDispatcherName] = useState('');
  const [newDispatcherUsername, setNewDispatcherUsername] = useState('');
  const [newDispatcherPassword, setNewDispatcherPassword] = useState('');
  const [dispatcherError, setDispatcherError] = useState('');
  const [dispatcherLoading, setDispatcherLoading] = useState(false);
  
  // 联系定制请求（仅超级管理员）
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  
  const { showSuccess, ModalComponent } = useCyberModal();

  const isSuperAdminUser = username === '13051818686';

  // 加载联系请求（仅超级管理员）
  const loadContactRequests = async () => {
    if (!isSuperAdminUser) return;
    setContactLoading(true);
    try {
      const res = await contactApi.list();
      if (res.success) {
        setContactRequests(res.data || []);
      }
    } catch (err) {
      console.error('加载联系请求失败:', err);
    }
    setContactLoading(false);
  };

  // 处理联系请求
  const handleProcessContact = async (id: string) => {
    try {
      await contactApi.update(id, 'processed');
      loadContactRequests();
    } catch (err) {
      console.error('处理失败:', err);
    }
  };

  // 删除联系请求
  const handleDeleteContact = async (id: string) => {
    try {
      await contactApi.delete(id);
      loadContactRequests();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 加载客服列表
  const loadDispatchers = async () => {
    if (!tenantId) return;
    try {
      const res = await dispatcherApi.list(tenantId);
      if (res.success) {
        setDispatchers(res.data || []);
      }
    } catch (err) {
      console.error('加载客服列表失败:', err);
    }
  };

  useEffect(() => {
    loadDispatchers();
    loadContactRequests();
  }, [tenantId]);

  // 添加客服
  const handleAddDispatcher = async () => {
    if (!tenantId) return;
    if (!newDispatcherName || !newDispatcherUsername || !newDispatcherPassword) {
      setDispatcherError('请填写完整信息');
      return;
    }
    if (newDispatcherPassword.length < 6) {
      setDispatcherError('密码至少6位');
      return;
    }
    
    setDispatcherLoading(true);
    setDispatcherError('');
    try {
      const res = await dispatcherApi.add({
        username: newDispatcherUsername,
        password: newDispatcherPassword,
        name: newDispatcherName,
        tenantId
      });
      if (res.success) {
        showSuccess('创建成功', '客服账号已创建');
        setNewDispatcherName('');
        setNewDispatcherUsername('');
        setNewDispatcherPassword('');
        setShowAddDispatcher(false);
        loadDispatchers();
      } else {
        throw new Error(res.error || '创建失败');
      }
    } catch (err: any) {
      setDispatcherError(err.message || '创建失败');
    } finally {
      setDispatcherLoading(false);
    }
  };

  // 删除客服
  const handleDeleteDispatcher = async (id: string) => {
    if (!confirm('确认删除该客服账号？')) return;
    try {
      const res = await dispatcherApi.delete(id);
      if (res.success) {
        loadDispatchers();
      }
    } catch (err) {
      console.error('删除客服失败:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    showSuccess("保存成功", "系统配置已更新");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SectionHeader title="系统设置 // 参数配置" icon={SettingsIcon} />
      
      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-4">
           <CyberInput 
              label="员工成本 (元/千万哈夫币)" 
              type="number"
              step="0.01"
              value={form.employeeCostRate} 
              onChange={(e: any) => setForm({...form, employeeCostRate: parseFloat(e.target.value)})} 
            />
             <CyberInput 
              label="默认手续费 (%)" 
              type="number"
              step="0.1"
              value={form.defaultFeePercent} 
              onChange={(e: any) => setForm({...form, defaultFeePercent: parseFloat(e.target.value)})} 
            />

            <div className="pt-4 flex justify-end">
              <NeonButton variant="primary">
                <span className="flex items-center gap-2"><Save size={16} /> 保存配置</span>
              </NeonButton>
            </div>
        </form>
      </GlassCard>

      {/* 客服管理 */}
      <GlassCard className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Headphones className="text-cyber-accent" size={20} />
            <h3 className="text-lg font-mono text-cyber-accent">客服管理</h3>
          </div>
          <button
            onClick={() => setShowAddDispatcher(!showAddDispatcher)}
            className="px-3 py-1 bg-cyber-accent/20 border border-cyber-accent text-cyber-accent text-sm flex items-center gap-1 hover:bg-cyber-accent/30"
          >
            <UserPlus size={14} /> 添加客服
          </button>
        </div>
        
        <p className="text-gray-500 text-sm mb-4">
          客服可以派单、管理窗口分配，但看不到财务数据（余额、采购、利润等）
        </p>

        {showAddDispatcher && (
          <div className="mb-4 p-4 border border-cyber-accent/30 bg-cyber-accent/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <CyberInput
                label="客服姓名"
                type="text"
                value={newDispatcherName}
                onChange={(e: any) => setNewDispatcherName(e.target.value)}
                placeholder="输入姓名"
              />
              <CyberInput
                label="登录用户名"
                type="text"
                value={newDispatcherUsername}
                onChange={(e: any) => setNewDispatcherUsername(e.target.value)}
                placeholder="输入用户名"
              />
              <CyberInput
                label="登录密码"
                type="password"
                value={newDispatcherPassword}
                onChange={(e: any) => setNewDispatcherPassword(e.target.value)}
                placeholder="至少6位"
              />
            </div>
            {dispatcherError && (
              <div className="text-red-500 text-sm font-mono bg-red-500/10 border border-red-500/30 p-2 mb-4">
                {dispatcherError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddDispatcher(false); setDispatcherError(''); }}
                className="px-4 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 text-sm"
              >
                取消
              </button>
              <CyberButton onClick={handleAddDispatcher} disabled={dispatcherLoading}>
                {dispatcherLoading ? '创建中...' : '确认创建'}
              </CyberButton>
            </div>
          </div>
        )}

        {dispatchers.length === 0 ? (
          <div className="text-gray-500 text-center py-4">暂无客服账号</div>
        ) : (
          <div className="space-y-2">
            {dispatchers.map(d => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-black/30 border border-cyber-accent/20">
                <div>
                  <span className="text-white font-mono">{d.name}</span>
                  <span className="text-gray-500 text-sm ml-2">@{d.username}</span>
                </div>
                <button
                  onClick={() => handleDeleteDispatcher(d.id)}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 联系定制请求 - 仅对 13051818686 可见 */}
      {isSuperAdminUser && (
        <GlassCard className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="text-purple-400" size={20} />
              <h3 className="text-lg font-mono text-purple-400">联系定制请求</h3>
            </div>
            <button onClick={loadContactRequests} className="text-xs text-gray-400 hover:text-white">
              刷新
            </button>
          </div>
          
          {contactLoading ? (
            <div className="text-gray-500 text-sm">加载中...</div>
          ) : contactRequests.length === 0 ? (
            <div className="text-gray-500 text-sm">暂无联系请求</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {contactRequests.map(req => (
                <div key={req._id} className={`p-3 rounded border ${req.status === 'pending' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-purple-400 font-mono">{req.contact}</span>
                      <span className="text-gray-500 text-xs ml-2">({req.tenantName || req.tenantId})</span>
                    </div>
                    <div className="flex gap-2">
                      {req.status === 'pending' && (
                        <button onClick={() => handleProcessContact(req._id)} className="text-green-400 hover:text-green-300 p-1" title="标记已处理">
                          <Check size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteContact(req._id)} className="text-red-400 hover:text-red-300 p-1" title="删除">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {req.message && <div className="text-gray-400 text-sm mb-2">{req.message}</div>}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(req.createdAt).toLocaleString()}</span>
                    <span className={req.status === 'pending' ? 'text-yellow-400' : 'text-green-400'}>
                      {req.status === 'pending' ? '待处理' : '已处理'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* 超级管理员入口 - 仅对 13051818686 可见，直接进入无需登录 */}
      {isSuperAdminUser && onSuperLogin && (
        <GlassCard className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-red-400" size={20} />
            <h3 className="text-lg font-mono text-red-400">超级管理员入口</h3>
          </div>
          
          <button
            onClick={() => onSuperLogin({ role: 'super', username: 'nolan' })}
            className="text-red-400/70 hover:text-red-400 text-sm font-mono transition-colors flex items-center gap-2"
          >
            <Shield size={14} /> 点击进入超管后台
          </button>
        </GlassCard>
      )}

      <ModalComponent />
    </div>
  );
};
