import { useState, useEffect } from 'react';
import { auth, db } from '../cloudbase';
import { Staff } from '../types';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [staffInfo, setStaffInfo] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStaffInfo = async (username: string) => {
    // 通过用户名查找员工信息
    const res = await db.collection('staff').where({ username }).get();
    if (res.data && res.data.length > 0) {
      const data = res.data[0];
      setStaffInfo({ id: data._id, ...data } as Staff);
      return data;
    }
    return null;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loginState = await auth.getLoginState();
        
        if (loginState) {
          setUser(loginState.user);
          
          // 从 localStorage 获取当前登录的用户名
          const currentUsername = localStorage.getItem('currentUsername');
          if (currentUsername) {
            await loadStaffInfo(currentUsername);
          }
        } else {
          setUser(null);
          setStaffInfo(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setStaffInfo(null);
      }
      setLoading(false);
    };

    checkAuth();

    // 监听登录状态变化
    auth.onLoginStateChanged((loginState) => {
      if (loginState) {
        setUser(loginState.user);
      } else {
        setUser(null);
        setStaffInfo(null);
        localStorage.removeItem('currentUsername');
      }
    });
  }, []);

  // 用户名密码登录
  const login = async (username: string, password: string) => {
    try {
      console.log('开始登录流程...');
      
      // 先匿名登录以获取数据库查询权限
      console.log('尝试匿名登录...');
      await auth.signInAnonymously();
      console.log('匿名登录成功');
      
      // 查找用户
      console.log('查询用户:', username);
      const res = await db.collection('staff').where({ username }).get();
      console.log('查询结果:', res);
      
      if (!res.data || res.data.length === 0) {
        throw new Error('用户名不存在');
      }
      
      const userData = res.data[0];
      console.log('找到用户:', userData);
      
      // 验证密码
      if (userData.password !== password) {
        throw new Error('密码错误');
      }
      
      // 保存当前用户名
      localStorage.setItem('currentUsername', username);
      
      setStaffInfo({ id: userData._id, ...userData } as Staff);
      setUser({ username });
      
      console.log('登录成功');
      return userData;
    } catch (error: any) {
      console.error('登录失败详情:', error);
      console.error('错误代码:', error.code);
      console.error('错误消息:', error.message);
      throw error;
    }
  };

  // 注册新用户
  const register = async (username: string, password: string, name: string, role: 'admin' | 'staff' = 'staff') => {
    try {
      console.log('开始注册流程...');
      
      // 先匿名登录以获取写入权限
      console.log('尝试匿名登录...');
      await auth.signInAnonymously();
      console.log('匿名登录成功');
      
      // 检查用户名是否已存在
      console.log('检查用户名是否存在...');
      const existing = await db.collection('staff').where({ username }).get();
      if (existing.data && existing.data.length > 0) {
        throw new Error('用户名已存在');
      }
      console.log('用户名可用');
      
      const id = crypto.randomUUID();
      console.log('写入数据库...');
      await db.collection('staff').doc(id).set({
        username,
        password,
        name,
        role,
        joinedDate: new Date().toISOString().split('T')[0]
      });
      console.log('数据库写入成功');
      
      localStorage.setItem('currentUsername', username);
      
      const staffData = { id, username, password, name, role, joinedDate: new Date().toISOString().split('T')[0] };
      setStaffInfo(staffData as Staff);
      setUser({ username });
      
      return staffData;
    } catch (error: any) {
      console.error('注册失败详情:', error);
      console.error('错误代码:', error.code);
      console.error('错误消息:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    localStorage.removeItem('currentUsername');
    setUser(null);
    setStaffInfo(null);
  };

  // 管理员创建员工账号（不需要登出当前用户）
  const createStaffAccount = async (username: string, password: string, name: string) => {
    // 检查用户名是否已存在
    const existing = await db.collection('staff').where({ username }).get();
    if (existing.data && existing.data.length > 0) {
      throw new Error('用户名已存在');
    }
    
    const id = crypto.randomUUID();
    await db.collection('staff').doc(id).set({
      username,
      password,
      name,
      role: 'staff',
      joinedDate: new Date().toISOString().split('T')[0]
    });
    
    return id;
  };

  return {
    user,
    staffInfo,
    loading,
    login,
    register,
    logout,
    createStaffAccount,
    isAdmin: staffInfo?.role === 'admin',
    isStaff: staffInfo?.role === 'staff'
  };
}
