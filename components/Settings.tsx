import React, { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { GlassCard, SectionHeader, CyberInput, NeonButton, useCyberModal } from './CyberUI';
import { Settings as SettingsType } from '../types';

interface SettingsProps {
  settings: SettingsType;
  onSave: (newSettings: SettingsType) => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const { showSuccess, ModalComponent } = useCyberModal();

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
      <ModalComponent />
    </div>
  );
};