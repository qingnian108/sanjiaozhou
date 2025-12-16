import React, { useState } from 'react';
import { LogIn, UserPlus, Hexagon } from 'lucide-react';
import { CyberInput, CyberButton } from './CyberUI';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
}

export const Login: React.FC<Props> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) {
          setError('请输入姓名');
          return;
        }
        await onRegister(username, password, name);
      } else {
        await onLogin(username, password);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4 bg-cyber-grid bg-[length:30px_30px]">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative bg-cyber-panel/80 backdrop-blur-sm border border-cyber-primary/30 p-8 w-full max-w-md">
        <div className="absolute top-0 left-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
        <div className="absolute bottom-0 right-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
        
        <div className="text-center mb-8">
          <Hexagon className="text-cyber-primary mx-auto mb-4 animate-pulse-slow drop-shadow-[0_0_8px_#00f3ff]" size={48} />
          <h1 className="text-2xl font-mono text-white tracking-wider">
            三角洲<span className="text-cyber-primary">员工系统</span>
          </h1>
          <p className="text-cyber-primary/60 font-mono text-xs mt-2">
            {isRegister ? 'STAFF REGISTRATION' : 'STAFF LOGIN'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <CyberInput
              label="姓名"
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
          
          <CyberInput
            label="密码"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="输入密码"
            required
          />

          {error && (
            <div className="text-red-500 text-sm font-mono bg-red-500/10 border border-red-500/30 p-2">
              {error}
            </div>
          )}

          <CyberButton type="submit" disabled={loading} className="w-full">
            {loading ? '处理中...' : (
              <>
                {isRegister ? <UserPlus size={16} className="mr-2" /> : <LogIn size={16} className="mr-2" />}
                {isRegister ? '注册' : '登录'}
              </>
            )}
          </CyberButton>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-cyber-primary/70 hover:text-cyber-primary text-sm font-mono transition-colors"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
};
