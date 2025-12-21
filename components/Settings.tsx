import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Shield } from 'lucide-react';
import { GlassCard, SectionHeader, CyberInput, NeonButton, useCyberModal, CyberButton } from './CyberUI';
import { Settings as SettingsType } from '../types';
import { superApi } from '../api';

interface SettingsProps {
  settings: SettingsType;
  onSave: (newSettings: SettingsType) => void;
  tenantId?: string;
  onSuperLogin?: (superUser: any) => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({ settings, onSave, tenantId, onSuperLogin }) => {
  const [form, setForm] = useState(settings);
  const [showSuperLogin, setShowSuperLogin] = useState(false);
  const [superUsername, setSuperUsername] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  const [superError, setSuperError] = useState('');
  const [superLoading, setSuperLoading] = useState(false);
  const { showSuccess, ModalComponent } = useCyberModal();

  const isSuperAdminUser = tenantId === '13051818686';

  const handleSuperLogin = async () => {
    setSuperError('');
    setSuperLoading(true);
    try {
      const res = await superApi.login(superUsername, superPassword);
      if (res.success && onSuperLogin) {
        onSuperLogin(res.user);
      } else {
        throw new Error(res.error || '超管登录失败');
      }
    } catch (err: any) {
      setSuperError(err.message || '登录失败');
    } finally {
      setSuperLoading(false);
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

      {/* 超级管理员入口 - 仅对 13051818686 可见 */}
      {isSuperAdminUser && onSuperLogin && (
        <GlassCard className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-red-400" size={20} />
            <h3 className="text-lg font-mono text-red-400">超级管理员入口</h3>
          </div>
          
          {!showSuperLogin ? (
            <button
              onClick={() => setShowSuperLogin(true)}
              className="text-red-400/70 hover:text-red-400 text-sm font-mono transition-colors flex items-center gap-2"
            >
              <Shield size={14} /> 点击进入超管登录
            </button>
          ) : (
            <div className="space-y-4">
              <CyberInput
                label="超管用户名"
                type="text"
                value={superUsername}
                onChange={(e: any) => setSuperUsername(e.target.value)}
                placeholder="输入超管用户名"
              />
              <CyberInput
                label="超管密码"
                type="password"
                value={superPassword}
                onChange={(e: any) => setSuperPassword(e.target.value)}
                placeholder="输入超管密码"
              />
              {superError && (
                <div className="text-red-500 text-sm font-mono bg-red-500/10 border border-red-500/30 p-2">
                  {superError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSuperLogin(false); setSuperUsername(''); setSuperPassword(''); setSuperError(''); }}
                  className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 font-mono text-sm"
                >
                  取消
                </button>
                <CyberButton
                  onClick={handleSuperLogin}
                  disabled={superLoading}
                  className="flex-1"
                >
                  {superLoading ? '登录中...' : <><Shield size={16} className="mr-2" />超管登录</>}
                </CyberButton>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      <ModalComponent />
    </div>
  );
};