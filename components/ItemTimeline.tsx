import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, User, ArrowRight, X } from 'lucide-react';
import { AuditLog } from '../types';

interface ItemTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  history: AuditLog[];
  itemName: string;
}

const ItemTimeline: React.FC<ItemTimelineProps> = ({ isOpen, onClose, history, itemName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] print:hidden"
          />
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-0 right-0 h-full w-full max-w-md glass-card border-l border-[var(--border-color)] corporate-shadow z-[151] flex flex-col print:hidden"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between glass-inner">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Histórico de Auditoria</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase truncate max-w-[200px]">{itemName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--bg-inner)] rounded-xl transition-colors">
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {history && history.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--border-color)]" />
                  <div className="space-y-8">
                    {history.map((log, idx) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 w-6 h-6 glass-card border-2 border-indigo-500 rounded-full flex items-center justify-center z-10">
                          <Clock className="w-3 h-3 text-indigo-500" />
                        </div>
                        
                        <div className="glass-inner border border-[var(--border-color)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-[var(--text-secondary)]" />
                              <span className="text-[10px] font-black text-indigo-500 uppercase">{log.user}</span>
                            </div>
                            <span className="text-[9px] font-bold text-[var(--text-secondary)]">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          
                          <p className="text-[11px] font-black text-[var(--text-primary)] uppercase mb-3">{log.action}</p>
                          
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-[var(--border-color)]/50">
                              {Object.entries(log.changes).map(([key, change]: [string, any]) => (
                                <div key={key} className="flex flex-col gap-1">
                                  <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase">{key}</span>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-md line-through opacity-50">{String(change.from || '-')}</span>
                                    <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md font-bold">{String(change.to || '-')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <History className="w-12 h-12 mb-4" />
                  <p className="text-xs font-black uppercase">Nenhum histórico disponível</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ItemTimeline;
