import React, { useState } from 'react';

interface PaywallGuardProps {
  children: React.ReactNode;
  isLocked: boolean; // Pass true if this specific feature should be locked
  triggerUnlock: () => void; // Function to open the unlock modal
}

export const PaywallGuard: React.FC<PaywallGuardProps> = ({ children, isLocked, triggerUnlock }) => {
  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative group rounded-xl">
      {/* 1. The Blurred Content */}
      <div className="filter blur-md pointer-events-none select-none opacity-50 grayscale transition duration-500">
        {children}
      </div>

      {/* 2. The Lock Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-xl p-2 text-center">
        <button 
            onClick={triggerUnlock}
            className="whitespace-nowrap bg-black text-white px-4 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all border border-white/20"
        >
            <span>🔒 UNLOCK</span>
        </button>
        <p className="text-[9px] font-black text-white/90 mt-3 uppercase tracking-tighter drop-shadow-md">
           Premium Feature
            </p>
        </div>
    </div>
  );
};

// --- THE MODAL COMPONENT ---
// Put this at the root of your app to handle the actual code entry
export const UnlockModal = ({ isOpen, onClose, onUnlock }: any) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await onUnlock(code);
    setLoading(false);
    
    if (result.success) {
      onClose();
      setCode(''); // Reset field
    } else {
      setError(result.message || 'Invalid code');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121212] border border-white/10 w-full max-w-sm p-6 rounded-3xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white">Unlock Full Access</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        
        <p className="text-sm text-slate-400 mb-6">
          Enter your Gumroad license key or your 2-day trial code below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX" 
            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-mono text-center uppercase focus:outline-none focus:border-blue-500 transition"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock Now'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <a href="https://studycopilot.gumroad.com/l/decide-app" target="_blank" className="text-xs text-slate-500 hover:text-white underline">
                Don't have a code? Buy one here ($5)
            </a>
        </div>
      </div>
    </div>
  );
};