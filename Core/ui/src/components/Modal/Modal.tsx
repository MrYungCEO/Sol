import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0B1120] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] rounded-2xl border border-gray-800/50 w-[90vw] max-w-[1200px] max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] animate-modal-slide-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-300 z-10"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};