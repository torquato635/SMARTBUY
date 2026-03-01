import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, AlertCircle, ShieldCheck } from 'lucide-react';
import { AccessLevel } from '../ProcurementContext';

interface LoginScreenProps {
  onLogin: (level: AccessLevel) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalPass = (import.meta as any).env.VITE_APP_PASSWORD_TOTAL || '372812';
    const viewPass = (import.meta as any).env.VITE_APP_PASSWORD_VIEW || '1234';
    const reqPass = (import.meta as any).env.VITE_APP_PASSWORD_REQUESTER || '102030';

    if (passwordInput === totalPass) {
      onLogin('TOTAL');
      setLoginError(false);
    } else if (passwordInput === viewPass) {
      onLogin('VIEW');
      setLoginError(false);
    } else if (passwordInput === reqPass) {
      onLogin('REQUESTER');
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-[2rem] shadow-2xl max-w-sm w-full relative overflow-hidden"
      >
        <div className="absolute -right-8 -top-8 opacity-[0.03]">
          <Lock className="w-32 h-32 text-emerald-500" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-none mb-1">
            BORTO <span className="text-emerald-500">SMARTBUY</span>
          </h1>
          <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Acesso Industrial</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Insira seu Token</label>
            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="password" 
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Token de Segurança"
                className={`w-full bg-[var(--bg-inner)] border ${loginError ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-[var(--border-color)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'} rounded-xl py-3.5 pl-11 pr-4 text-[var(--text-primary)] font-black outline-none transition-all placeholder:text-[var(--text-secondary)]/30 text-sm`}
              />
            </div>
            <AnimatePresence>
              {loginError && (
                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Token Inválido
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acessar</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border-color)] flex justify-center gap-4">
            <div className="flex items-center gap-1.5 opacity-30">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <span className="text-[7px] font-black text-[var(--text-primary)] uppercase">Full</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-30">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
               <span className="text-[7px] font-black text-[var(--text-primary)] uppercase">View</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
