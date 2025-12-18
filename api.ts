// API 基础地址 - 部署时改成服务器地址
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  return res.json();
}

// 认证相关
export const authApi = {
  login: (username: string, password: string) => 
    request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  
  register: (username: string, password: string) =>
    request('/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  
  changePassword: (username: string, oldPassword: string, newPassword: string) =>
    request('/change-password', { method: 'POST', body: JSON.stringify({ username, oldPassword, newPassword }) })
};

// 员工相关
export const staffApi = {
  list: (tenantId: string) => request(`/staff/${tenantId}`),
  add: (data: { username: string; password: string; name: string; tenantId: string }) =>
    request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/staff/${id}`, { method: 'DELETE' })
};

// 通用数据操作
export const dataApi = {
  list: (collection: string, tenantId: string) => request(`/data/${collection}/${tenantId}`),
  add: (collection: string, data: any) => request(`/data/${collection}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (collection: string, id: string, data: any) => request(`/data/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (collection: string, id: string) => request(`/data/${collection}/${id}`, { method: 'DELETE' })
};

// 设置相关
export const settingsApi = {
  get: (tenantId: string) => request(`/settings/${tenantId}`),
  save: (tenantId: string, data: any) => request(`/settings/${tenantId}`, { method: 'POST', body: JSON.stringify(data) })
};
