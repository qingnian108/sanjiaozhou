import { useState, useEffect } from 'react';
import { authApi, staffApi } from '../api';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  name: string;
  tenantId: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.login(username, password);
      if (res.success) {
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
        return true;
      }
      throw new Error(res.error || '登录失败');
    } catch (err: any) {
      console.error('登录错误:', err);
      throw err;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.register(username, password);
      if (res.success) {
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
        return true;
      }
      throw new Error(res.error || '注册失败');
    } catch (err: any) {
      console.error('注册错误:', err);
      throw err;
    }
  };

  const registerAdmin = async (username: string, password: string, name: string): Promise<boolean> => {
    try {
      const res = await authApi.register(username, password);
      if (res.success) {
        // 更新用户名称
        const userData = { ...res.user, name };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      throw new Error(res.error || '注册失败');
    } catch (err: any) {
      console.error('注册错误:', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const changePassword = async (username: string, oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await authApi.changePassword(username, oldPassword, newPassword);
      if (res.success) {
        return true;
      }
      throw new Error(res.error || '修改密码失败');
    } catch (err: any) {
      console.error('修改密码错误:', err);
      throw err;
    }
  };

  const createStaffAccount = async (username: string, password: string, name: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await staffApi.add({ username, password, name, tenantId: user.tenantId });
      if (res.success) {
        return true;
      }
      throw new Error(res.error || '创建员工失败');
    } catch (err: any) {
      console.error('创建员工错误:', err);
      throw err;
    }
  };

  // 兼容旧代码的属性
  const isAdmin = user?.role === 'admin';
  const staffInfo = user ? {
    id: user.id,
    name: user.name,
    username: user.username,
    tenantId: user.tenantId,
    role: user.role
  } : null;

  const getTenantId = () => user?.tenantId || null;

  return { 
    user, 
    staffInfo,
    loading, 
    login, 
    register,
    registerAdmin,
    logout, 
    changePassword, 
    createStaffAccount,
    isAdmin,
    getTenantId
  };
}
