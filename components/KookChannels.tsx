import React, { useState } from 'react';
import { Plus, Trash2, User, Edit2, Save, X, Clock, CheckCircle } from 'lucide-react';
import { KookChannel, Staff, ClockRecord } from '../types';
import { CyberCard, CyberInput, CyberButton, CyberSelect } from './CyberUI';

interface Props {
  channels: KookChannel[];
  staffList: Staff[];
  clockRecords?: ClockRecord[];
  onAdd: (channel: Omit<KookChannel, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: Partial<KookChannel>) => void;
}

export const KookChannels: React.FC<Props> = ({ channels, staffList, clockRecords = [], onAdd, onDelete, onUpdate }) => {
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ phone: '', userId: '', nickname: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !userId) return;
    onAdd({ phone, userId, nickname });
    setPhone('');
    setUserId('');
    setNickname('');
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || '未知';
  };

  // 获取员工打卡状态
  const getStaffClockStatus = (staffId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = (clockRecords as ClockRecord[])
      .filter((r: ClockRecord) => r.staffId === staffId && r.date === today)
      .sort((a: ClockRecord, b: ClockRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (todayRecords.length === 0) return { isWorking: false, lastTime: null };
    
    const lastRecord = todayRecords[0];
    return {
      isWorking: lastRecord.type === 'in',
      lastTime: new Date(lastRecord.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="space-y-6">
      <CyberCard title="添加Kook频道账号" icon={<Plus size={20} />}>
        <p className="text-gray-400 text-sm mb-4">添加员工的 KOOK 手机号，用于打卡验证。员工进入语音频道时，系统会检查是否已打卡上班。</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CyberInput
            label="KOOK手机号"
            type="text"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            placeholder="输入KOOK绑定的手机号"
          />
          <CyberSelect
            label="绑定员工"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            options={[
              { value: '', label: '选择员工' },
              ...staffList.filter(s => s.role === 'staff').map(s => ({ value: s.id, label: s.name }))
            ]}
          />
          <CyberInput
            label="KOOK昵称"
            type="text"
            value={nickname}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
            placeholder="输入KOOK昵称（选填）"
          />
          <div className="flex items-end">
            <CyberButton type="submit" disabled={!phone || !userId}>
              <Plus size={16} className="mr-1" /> 添加
            </CyberButton>
          </div>
        </form>
      </CyberCard>

      <CyberCard title="KOOK账号列表 & 打卡状态" icon={<User size={20} />}>
        {channels.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无数据，请添加员工的 KOOK 账号</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyber-primary/30 text-left">
                  <th className="py-3 px-2 text-cyber-primary font-mono">KOOK手机号</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">绑定员工</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">KOOK昵称</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">打卡状态</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">KOOK用户ID</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">操作</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(channel => {
                  const clockStatus = getStaffClockStatus(channel.userId);
                  return (
                    <tr key={channel.id} className="border-b border-gray-800 hover:bg-cyber-primary/5 transition-colors">
                      {editingId === channel.id ? (
                        <>
                          <td className="py-2 px-2">
                            <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                          </td>
                          <td className="py-2 px-2">
                            <select value={editForm.userId} onChange={e => setEditForm({...editForm, userId: e.target.value})}
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm">
                              <option value="">选择员工</option>
                              {staffList.filter(s => s.role === 'staff').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input type="text" value={editForm.nickname} onChange={e => setEditForm({...editForm, nickname: e.target.value})}
                              className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-2 py-1 text-sm" />
                          </td>
                          <td className="py-2 px-2">-</td>
                          <td className="py-2 px-2">-</td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              <button onClick={() => { onUpdate?.(channel.id, editForm); setEditingId(null); }}
                                className="text-green-500 hover:text-green-400 p-1"><Save size={16} /></button>
                              <button onClick={() => setEditingId(null)}
                                className="text-gray-500 hover:text-gray-400 p-1"><X size={16} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2 font-mono">{channel.phone}</td>
                          <td className="py-3 px-2">{getStaffName(channel.userId)}</td>
                          <td className="py-3 px-2">{channel.nickname || '-'}</td>
                          <td className="py-3 px-2">
                            {clockStatus.isWorking ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle size={14} /> 工作中
                                <span className="text-xs text-gray-500">({clockStatus.lastTime})</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock size={14} /> 未上班
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-xs text-gray-500 font-mono">
                            {channel.kookUserId || '待绑定'}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingId(channel.id); setEditForm({ phone: channel.phone, userId: channel.userId, nickname: channel.nickname || '' }); }}
                                className="text-cyber-primary hover:text-cyber-accent p-1"><Edit2 size={16} /></button>
                              <button onClick={() => onDelete(channel.id)}
                                className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CyberCard>
    </div>
  );
};
