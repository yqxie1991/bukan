'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className={`bg-card-bg rounded-xl shadow-[var(--card-shadow-hover)] border border-border-color ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in overscroll-contain`}>
        <div className="sticky top-0 bg-card-bg border-b border-border-color px-6 py-4 flex items-center justify-between z-10">
          <h3 id="modal-title" className="text-xl font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            aria-label="关闭弹窗"
            className="text-muted-foreground hover:text-foreground transition text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
