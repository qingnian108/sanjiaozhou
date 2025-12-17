import React, { ReactNode, useState, useCallback } from 'react';

export const GlassCard = ({ children, className = "" }: { children?: ReactNode, className?: string }) => (
  <div className={`relative bg-cyber-panel/80 backdrop-blur-sm border border-cyber-primary/30 shadow-neon-box p-6 clip-angled ${className}`}>
    {/* Decorative Neon Lines */}
    <div className="absolute top-0 left-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
    <div className="absolute bottom-0 right-0 w-20 h-[1px] bg-cyber-primary shadow-[0_0_8px_#00f3ff]"></div>
    <div className="absolute top-0 right-0 w-[1px] h-10 bg-cyber-primary/50"></div>
    <div className="absolute bottom-0 left-0 w-[1px] h-10 bg-cyber-primary/50"></div>
    
    {/* Tech Texture */}
    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,243,255,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:4px_4px] pointer-events-none"></div>
    
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export const NeonButton = ({ children, onClick, type = "button", variant = 'primary', className = "" }: { children?: ReactNode, onClick?: () => void, type?: "button" | "submit" | "reset", variant?: 'primary' | 'secondary' | 'danger', className?: string }) => {
  const variants = {
    primary: 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary shadow-neon-cyan hover:bg-cyber-primary hover:text-black',
    secondary: 'bg-transparent text-cyber-text border border-cyber-muted hover:border-cyber-primary hover:text-cyber-primary',
    danger: 'bg-cyber-secondary/10 text-cyber-secondary border border-cyber-secondary shadow-neon-pink hover:bg-cyber-secondary hover:text-white'
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      className={`px-6 py-2 font-mono uppercase font-bold tracking-widest text-sm transition-all duration-300 transform active:scale-95 clip-angled ${variants[variant]} ${className}`}
    >
      <span className="flex items-center gap-2 justify-center">
        {children}
      </span>
    </button>
  );
};

export const CyberInput = ({ label, type = "text", value, onChange, placeholder, step, required }: any) => (
  <div className="mb-4 group">
    <label className="block text-cyber-primary text-xs font-mono mb-1 tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
      {`> ${label}`}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        required={required}
        className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-4 py-2 focus:outline-none focus:border-cyber-primary focus:shadow-neon-cyan transition-all placeholder-gray-700"
      />
      {/* Corner Accent */}
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-primary"></div>
    </div>
  </div>
);

export const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
  <div className="flex items-center gap-3 mb-6 border-b border-cyber-primary/30 pb-2">
    <div className="text-cyber-primary animate-pulse-slow">
      {Icon && <Icon className="w-5 h-5" />}
    </div>
    <h2 className="text-xl font-mono text-white tracking-[0.2em] uppercase">
      {title} <span className="text-cyber-primary text-sm animate-pulse">_</span>
    </h2>
  </div>
);

export const StatBox = ({ label, value, subValue, trend }: { label: string, value: string, subValue?: string, trend?: 'up' | 'down' | 'neutral' }) => (
  <div className="bg-cyber-panel border border-cyber-grid p-5 hover:border-cyber-primary transition-colors duration-300 relative group overflow-hidden">
    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
      <div className={`w-16 h-16 rounded-full blur-xl ${trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : 'bg-cyber-primary'}`}></div>
    </div>
    
    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className="text-gray-400 text-xs font-mono uppercase tracking-widest">{label}</div>
      <div className={`w-1 h-1 ${trend === 'up' ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : trend === 'down' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-cyber-primary shadow-[0_0_5px_#00f3ff]'}`}></div>
    </div>
    <div className="text-2xl md:text-3xl font-mono text-white font-bold tracking-tighter relative z-10 drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">
      {value}
    </div>
    {subValue && (
      <div className="text-xs text-cyber-primary/70 font-mono mt-1 pt-1 inline-block relative z-10">
        {subValue}
      </div>
    )}
  </div>
);


export const CyberCard = ({ title, icon, children, className = "" }: { title: string, icon?: ReactNode, children?: ReactNode, className?: string }) => (
  <GlassCard className={className}>
    <div className="flex items-center gap-3 mb-4 border-b border-cyber-primary/30 pb-2">
      {icon && <div className="text-cyber-primary">{icon}</div>}
      <h3 className="text-lg font-mono text-white tracking-wider uppercase">{title}</h3>
    </div>
    {children}
  </GlassCard>
);

export const CyberButton = ({ children, onClick, type = "button", disabled = false, variant = 'primary', className = "" }: { 
  children?: ReactNode, 
  onClick?: () => void, 
  type?: "button" | "submit" | "reset",
  disabled?: boolean,
  variant?: 'primary' | 'secondary' | 'danger', 
  className?: string 
}) => {
  const variants = {
    primary: 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary shadow-neon-cyan hover:bg-cyber-primary hover:text-black disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-transparent text-cyber-text border border-cyber-muted hover:border-cyber-primary hover:text-cyber-primary',
    danger: 'bg-cyber-secondary/10 text-cyber-secondary border border-cyber-secondary shadow-neon-pink hover:bg-cyber-secondary hover:text-white'
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-mono uppercase font-bold tracking-widest text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const CyberSelect = ({ label, value, onChange, options }: { 
  label: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, 
  options: { value: string, label: string }[] 
}) => (
  <div className="mb-4 group">
    <label className="block text-cyber-primary text-xs font-mono mb-1 tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
      {`> ${label}`}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-black/40 border border-cyber-primary/30 text-cyber-text font-mono px-4 py-2 focus:outline-none focus:border-cyber-primary focus:shadow-neon-cyan transition-all appearance-none cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-cyber-bg">{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyber-primary">▼</div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-primary"></div>
    </div>
  </div>
);


// 赛博风格弹窗组件
export const CyberModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = '确认', 
  cancelText = '取消',
  type = 'confirm' // 'confirm' | 'alert' | 'success' | 'warning'
}: { 
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert' | 'success' | 'warning';
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    confirm: { border: 'border-cyber-primary', title: 'text-cyber-primary', icon: '?' },
    alert: { border: 'border-red-500', title: 'text-red-400', icon: '!' },
    success: { border: 'border-green-500', title: 'text-green-400', icon: '✓' },
    warning: { border: 'border-yellow-500', title: 'text-yellow-400', icon: '⚠' }
  };

  const style = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`bg-cyber-panel border ${style.border} p-6 max-w-md w-full relative`}>
        {/* 装饰线条 */}
        <div className={`absolute top-0 left-0 w-16 h-[2px] ${style.border.replace('border-', 'bg-')} shadow-lg`}></div>
        <div className={`absolute bottom-0 right-0 w-16 h-[2px] ${style.border.replace('border-', 'bg-')} shadow-lg`}></div>
        <div className={`absolute top-0 right-0 w-[2px] h-8 ${style.border.replace('border-', 'bg-')}/50`}></div>
        <div className={`absolute bottom-0 left-0 w-[2px] h-8 ${style.border.replace('border-', 'bg-')}/50`}></div>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 border ${style.border} flex items-center justify-center ${style.title} font-mono text-lg`}>
            {style.icon}
          </div>
          <h3 className={`text-xl font-mono ${style.title} tracking-wider`}>{title}</h3>
        </div>

        {/* 内容 */}
        <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">{message}</p>

        {/* 按钮 */}
        <div className="flex gap-3">
          {type === 'confirm' ? (
            <>
              <button 
                onClick={onClose}
                className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 hover:border-gray-500 transition-all font-mono text-sm"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => { onConfirm?.(); onClose(); }}
                className={`flex-1 py-2 ${style.border.replace('border-', 'bg-')}/20 border ${style.border} ${style.title} hover:${style.border.replace('border-', 'bg-')}/40 transition-all font-mono text-sm`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className={`w-full py-2 ${style.border.replace('border-', 'bg-')}/20 border ${style.border} ${style.title} hover:${style.border.replace('border-', 'bg-')}/40 transition-all font-mono text-sm`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 使用 Hook 管理弹窗状态
export const useCyberModal = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'warning';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm'
  });

  const showModal = useCallback((options: {
    title: string;
    message: string;
    type?: 'confirm' | 'alert' | 'success' | 'warning';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => {
    setModalState({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'confirm',
      onConfirm: options.onConfirm,
      confirmText: options.confirmText,
      cancelText: options.cancelText
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 便捷方法
  const showAlert = useCallback((title: string, message: string, confirmText = '知道了') => {
    showModal({ title, message, type: 'alert', confirmText });
  }, [showModal]);

  const showSuccess = useCallback((title: string, message: string, confirmText = '好的') => {
    showModal({ title, message, type: 'success', confirmText });
  }, [showModal]);

  const showWarning = useCallback((title: string, message: string, confirmText = '知道了') => {
    showModal({ title, message, type: 'warning', confirmText });
  }, [showModal]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmText = '确认', cancelText = '取消') => {
    showModal({ title, message, type: 'confirm', onConfirm, confirmText, cancelText });
  }, [showModal]);

  return {
    modalState,
    showModal,
    closeModal,
    showAlert,
    showSuccess,
    showWarning,
    showConfirm,
    ModalComponent: () => (
      <CyberModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    )
  };
};
