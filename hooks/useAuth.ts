import { useState, useEffect } from 'react';
import { auth, db, signInAnonymously } from '../cloudbase';
import { Staff } from '../types';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [staffInfo, setStaffInfo] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStaffInfo = async (username: string) => {
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
          const currentUsername = localStorage.getItem('currentUsername');
          if (currentUsername) {
            await signInAnonymously();
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

  const login = async (username: string, password: string) => {
    try {
      console.log('开始登录...');
      await signInAnonymously();
      
      const res = await db.collection('staff').where({ username }).get();
      if (!res.data || res.data.length === 0) {
        throw new Error('用户名不存在');
      }
      
      const userData = res.data[0];
      if (userData.password !== password) {
        throw new Error('密码错误');
      }
      
      localStorage.setItem('currentUsername', username);
      setStaffInfo({ id: userData._id, ...userData } as Staff);
      setUser({ username });
      
      return userData;
    } catch (error: any) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const registerAdmin = async (username: string, password: string, name: string) => {
    try {
      console.log('开始注册管理员...');
      await signInAnonymously();
      
      const existing = await db.collection('staff').where({ username }).get();
      if (existing.data && existing.data.length > 0) {
        throw new Error('用户名已存在');
      }
      
      const id = crypto.randomUUID();
      const adminData = {
        username,
        password,
        name,
        role: 'admin',
        tenantId: id,
        joinedDate: new Date().toISOString().split('T')[0]
      };
      
      await db.collection('staff').doc(id).set(adminData);
      
      localStorage.setItem('currentUsername', username);
      setStaffInfo({ id, ...adminData } as Staff);
      setUser({ username });
      
      return adminData;
    } catch (error: any) {
      console.error('注册失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    localStorage.removeItem('currentUsername');
    setUser(null);
    setStaffInfo(null);
  };

  const createStaffAccount = async (username: string, password: string, name: string) => {
    if (!staffInfo || staffInfo.role !== 'admin') {
      throw new Error('只有管理员可以创建员工账号');
    }
    
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
      tenantId: staffInfo.tenantId,
      joinedDate: new Date().toISOString().split('T')[0]
    });
    
    return id;
  };

  const getTenantId = () => {
    return staffInfo?.tenantId || null;
  };

  return {
    user,
    staffInfo,
    loading,
    login,
    registerAdmin,
    logout,
    createStaffAccount,
    getTenantId,
    isAdmin: staffInfo?.role === 'admin',
    isStaff: staffInfo?.role === 'staff'
  };
}
