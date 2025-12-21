import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Hexagon, ArrowLeft, Key, Shield } from 'lucide-react';
import { CyberInput, CyberButton, useCyberModal } from './CyberUI';
import { superApi } from '../api';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegisterAdmin: (username: string, password: string, name: string) => Promise<void>;
  onChangePassword?: (username: string, oldPassword: string, newPassword: string) => Promise<void>;
  onSuperLogin?: (superUser: any) => void;
}

export const Login: React.FC<Props> = ({ onLogin, onRegisterAdmin, onChangePassword, onSuperLogin }) => {
  const [mode, setMode] = useState<'login' | 'adminRegister' | 'changePassword' | 'superLogin'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showAlert, ModalComponent } = useCyberModal();

  const VALID_INVITE_CODE = '13051818686';

  // 加载保存的登录信息
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (savedRemember && savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'adminRegister') {
        if (!name) {
          setError('请输入姓名');
          setLoading(false);
          return;
        }
        if (inviteCode !== VALID_INVITE_CODE) {
          setError('邀请码错误');
          setLoading(false);
          return;
        }
        await onRegisterAdmin(username, password, name);
      } else if (mode === 'changePassword') {
        if (!onChangePassword) {
          setError('修改密码功能不可用');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('两次输入的新密码不一致');
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setError('新密码至少6位');
          setLoading(false);
          return;
        }
        await onChangePassword(username, oldPassword, newPassword);
        showSuccess('修改成功', '密码已更新，请使用新密码登录');
        setMode('login');
        setPassword('');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // 清除保存的密码
        localStorage.removeItem('savedPassword');
      } else {
        // 登录
        if (rememberMe) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('savedPassword', password);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
          localStorage.setItem('rememberMe', 'false');
        }
        
        // 检查是否是超管登录
        if (mode === 'superLogin') {
          const res = await superApi.login(username, password);
          if (res.success && onSuperLogin) {
            onSuperLogin(res.user);
          } else {
            throw new Error(res.error || '超管登录失败');
          }
        } else {
          await onLogin(username, password);
        }
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setName('');
    setInviteCode('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4 bg-cyber-grid bg-[length:30px_30px]">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative bg-cyber-panel/80 backdrop-blur-sm border border-cyber-primary/30 p-8 w-full max-w-md">
        <div className="absolute top-0 left-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
        <div className="absolute bottom-0 right-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
        
        {mode !== 'login' && (
          <button
            onClick={() => { setMode('login'); resetForm(); }}
            className="absolute top-4 left-4 text-gray-500 hover:text-cyber-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        
        <div className="text-center mb-8">
          <Hexagon className="text-cyber-primary mx-auto mb-4 animate-pulse-slow drop-shadow-[0_0_8px_#00f3ff]" size={48} />
          <h1 className="text-2xl font-mono text-white tracking-wider">
            三角洲<span className="text-cyber-primary">撞车系统</span>
          </h1>
          <p className="text-cyber-primary/60 font-mono text-xs mt-2">
            {mode === 'adminRegister' ? 'ADMIN REGISTRATION' : mode === 'changePassword' ? 'CHANGE PASSWORD' : mode === 'superLogin' ? 'SUPER ADMIN' : 'SYSTEM LOGIN'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'adminRegister' && (
            <CyberInput
              label="管理员姓名"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="输入姓名"
              required
            />
          )}
          
          <CyberInput
            label="用户名"
            type="text"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="输入用户名"
            required
          />
          
          {mode === 'login' && (
            <CyberInput
              label="密码"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
            />
          )}

          {mode === 'superLogin' && (
            <CyberInput
              label="密码"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="输入超管密码"
              required
            />
          )}

          {mode === 'adminRegister' && (
            <>
              <CyberInput
                label="密码"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
              />
              <CyberInput
                label="邀请码"
                type="text"
                value={inviteCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteCode(e.target.value)}
                placeholder="输入邀请码"
                required
              />
            </>
          )}

          {mode === 'changePassword' && (
            <>
              <CyberInput
                label="原密码"
                type="password"
                value={oldPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                placeholder="输入原密码"
                required
              />
              <CyberInput
                label="新密码"
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="输入新密码（至少6位）"
                required
              />
              <CyberInput
                label="确认新密码"
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                required
              />
            </>
          )}

          {/* 记住登录信息 */}
          {(mode === 'login' || mode === 'superLogin') && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-cyber-primary"
              />
              <span className="text-sm text-gray-400 font-mono">记住登录信息</span>
            </label>
          )}

          {error && (
            <div className="text-red-500 text-sm font-mono bg-red-500/10 border border-red-500/30 p-2">
              {error}
            </div>
          )}

          <CyberButton type="submit" disabled={loading} className="w-full">
            {loading ? '处理中...' : (
              <>
                {mode === 'adminRegister' && <><UserPlus size={16} className="mr-2" />注册管理员</>}
                {mode === 'changePassword' && <><Key size={16} className="mr-2" />修改密码</>}
                {mode === 'superLogin' && <><Shield size={16} className="mr-2" />超管登录</>}
                {mode === 'login' && <><LogIn size={16} className="mr-2" />登录</>}
              </>
            )}
          </CyberButton>
        </form>

        {mode === 'login' && (
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => { setMode('changePassword'); resetForm(); }}
              className="text-yellow-400/70 hover:text-yellow-400 text-sm font-mono transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <Key size={14} /> 修改密码
            </button>
            <button
              onClick={() => { setMode('adminRegister'); resetForm(); }}
              className="text-cyber-primary/70 hover:text-cyber-primary text-sm font-mono transition-colors block mx-auto"
            >
              注册新的管理员账号
            </button>
            <p className="text-gray-600 text-xs font-mono">
              员工账号由管理员创建
            </p>
          </div>
        )}
      </div>
      <ModalComponent />
    </div>
  );
};
