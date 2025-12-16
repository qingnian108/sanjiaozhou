import React, { useState } from 'react';
import { Plus, Trash2, User } from 'lucide-react';
import { KookChannel, Staff } from '../types';
import { CyberCard, CyberInput, CyberButton, CyberSelect } from './CyberUI';

interface Props {
  channels: KookChannel[];
  staffList: Staff[];
  onAdd: (channel: Omit<KookChannel, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const KookChannels: React.FC<Props> = ({ channels, staffList, onAdd, onDelete }) => {
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');

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

  return (
    <div className="space-y-6">
      <CyberCard title="添加Kook频道" icon={<Plus size={20} />}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CyberInput
            label="手机号"
            type="text"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            placeholder="输入手机号"
          />
          <CyberSelect
            label="使用人"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            options={[
              { value: '', label: '选择员工' },
              ...staffList.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
          <CyberInput
            label="昵称"
            type="text"
            value={nickname}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
            placeholder="输入昵称"
          />
          <div className="flex items-end">
            <CyberButton type="submit" disabled={!phone || !userId}>
              <Plus size={16} className="mr-1" /> 添加
            </CyberButton>
          </div>
        </form>
      </CyberCard>

      <CyberCard title="Kook频道列表" icon={<User size={20} />}>
        {channels.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyber-primary/30 text-left">
                  <th className="py-3 px-2 text-cyber-primary font-mono">手机号</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">使用人</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">昵称</th>
                  <th className="py-3 px-2 text-cyber-primary font-mono">操作</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(channel => (
                  <tr key={channel.id} className="border-b border-gray-800 hover:bg-cyber-primary/5 transition-colors">
                    <td className="py-3 px-2 font-mono">{channel.phone}</td>
                    <td className="py-3 px-2">{getStaffName(channel.userId)}</td>
                    <td className="py-3 px-2">{channel.nickname || '-'}</td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => onDelete(channel.id)}
                        className="text-red-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CyberCard>
    </div>
  );
};
