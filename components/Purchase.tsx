import React, { useState } from 'react';
import { ShoppingCart, PlusCircle } from 'lucide-react';
import { GlassCard, CyberInput, NeonButton, SectionHeader, useCyberModal } from './CyberUI';
import { PurchaseRecord } from '../types';

interface Props {
  onAddPurchase: (record: Omit<PurchaseRecord, 'id'>) => void;
}

export const Purchase: React.FC<Props> = ({ onAddPurchase }) => {
  const today = new Date().toISOString().split('T')[0];
  const { showSuccess, ModalComponent } = useCyberModal();

  const [purchaseForm, setPurchaseForm] = useState({
    date: today,
    amount: '',
    cost: ''
  });

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPurchase({
      date: purchaseForm.date,
      amount: parseFloat(purchaseForm.amount),
      cost: parseFloat(purchaseForm.cost)
    });
    setPurchaseForm({ ...purchaseForm, amount: '', cost: '' });
    showSuccess("添加成功", "采购记录已添加");
  };

  return (
    <div className="animate-fade-in">
      <GlassCard className="relative">
        <div className="absolute top-4 right-4 p-2 opacity-10">
          <ShoppingCart size={120} className="text-cyber-primary" />
        </div>
        <SectionHeader title="供应链 // 采购入库" icon={ShoppingCart} />
        <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="md:col-span-2">
            <CyberInput 
              label="采购日期" 
              type="date" 
              value={purchaseForm.date} 
              onChange={(e: any) => setPurchaseForm({...purchaseForm, date: e.target.value})}
              required 
            />
          </div>
          <CyberInput 
            label="采购哈夫币 (万)" 
            type="number" 
            step="0.01" 
            placeholder="30000"
            value={purchaseForm.amount} 
            onChange={(e: any) => setPurchaseForm({...purchaseForm, amount: e.target.value})}
            required 
          />
          <CyberInput 
            label="总成本 (元)" 
            type="number" 
            step="0.01" 
            placeholder="600"
            value={purchaseForm.cost} 
            onChange={(e: any) => setPurchaseForm({...purchaseForm, cost: e.target.value})}
            required 
          />
          <div className="md:col-span-2 mt-4 flex justify-end">
            <NeonButton variant="primary">
              <span className="flex items-center gap-2"><PlusCircle size={16} /> 确认入库</span>
            </NeonButton>
          </div>
        </form>
      </GlassCard>
      <ModalComponent />
    </div>
  );
};
