import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Briefcase, Command, X, BarChart3, FileText, FileSpreadsheet } from 'lucide-react';
import { useProcurement } from '../ProcurementContext';
import { ProcurementItem, Sheet } from '../types';

export interface SpotlightResult {
  type: 'item' | 'project' | 'action';
  id: string;
  title: string;
  subtitle?: string;
  metadata?: any;
  icon: React.ElementType;
}

export interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SpotlightResult) => void;
}

const SpotlightSearch: React.FC<SpotlightSearchProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const { sheets } = useProcurement();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    const matches: SpotlightResult[] = [];

    // 1. Actions (Always show if query matches or if empty)
    const actions: SpotlightResult[] = [
      { type: 'action', id: 'view-dashboard', title: 'Ver Dashboard', subtitle: 'Visão geral de métricas', icon: BarChart3, metadata: { view: 'dashboard' } },
      { type: 'action', id: 'view-projects', title: 'Ver Projetos', subtitle: 'Lista de todos os projetos', icon: Briefcase, metadata: { view: 'projects' } },
      { type: 'action', id: 'view-reports', title: 'Ver Relatórios', subtitle: 'Relatórios gerenciais e de projetos', icon: FileText, metadata: { view: 'report' } },
      { type: 'action', id: 'view-upload', title: 'Importar Planilha', subtitle: 'Adicionar novo projeto via Excel', icon: FileSpreadsheet, metadata: { view: 'upload' } },
    ];

    if (!q) {
      return actions;
    }

    // Filter actions
    matches.push(...actions.filter(a => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)));

    // 2. Projects
    sheets.forEach(sheet => {
      if (sheet.nome.toLowerCase().includes(q)) {
        matches.push({
          type: 'project',
          id: sheet.id,
          title: sheet.nome,
          subtitle: `${sheet.items.length} itens • Upload em ${sheet.data_upload}`,
          icon: Briefcase,
          metadata: { sheetId: sheet.id }
        });
      }
    });

    // 3. Items
    sheets.forEach(sheet => {
      sheet.items.forEach(item => {
        if (
          item.description.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.supplier?.toLowerCase().includes(q)
        ) {
          matches.push({
            type: 'item',
            id: item.id,
            title: item.description,
            subtitle: `PN: ${item.partNumber} • ${sheet.nome} • ${item.status}`,
            icon: Package,
            metadata: { item, sheetId: sheet.id }
          });
        }
      });
    });

    return matches.slice(0, 10);
  }, [query, sheets]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        onSelect(results[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelect]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] print:hidden"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl z-[101] overflow-hidden print:hidden"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-4">
              <Search className="w-6 h-6 text-indigo-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar itens, part numbers, fornecedores, projetos ou ações..."
                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-inner)] rounded-xl border border-[var(--border-color)]">
                <Command className="w-3 h-3 text-[var(--text-secondary)]" />
                <span className="text-[10px] font-black text-[var(--text-secondary)]">K</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--bg-inner)] rounded-xl transition-colors">
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="max-h-[450px] overflow-y-auto p-4 space-y-1 custom-scrollbar">
              {results.length > 0 ? (
                results.map((res, idx) => {
                  const Icon = res.icon;
                  return (
                    <button
                      key={res.id}
                      onClick={() => {
                        onSelect(res);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all text-left ${idx === selectedIndex ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-[var(--bg-inner)]'}`}
                    >
                      <div className={`p-2.5 rounded-xl ${idx === selectedIndex ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black text-sm uppercase truncate">{res.title}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${idx === selectedIndex ? 'bg-white/20' : 'bg-[var(--bg-inner)] text-[var(--text-secondary)]'}`}>
                            {res.type}
                          </span>
                        </div>
                        {res.subtitle && (
                          <p className={`text-[10px] font-bold uppercase truncate mt-0.5 ${idx === selectedIndex ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                            {res.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <Package className="w-12 h-12 text-[var(--text-secondary)]/20 mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)] font-bold uppercase text-xs">Nenhum resultado encontrado para "{query}"</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--bg-inner)]/50 border-t border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[9px] font-black text-[var(--text-secondary)] shadow-sm">↑↓</kbd>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Navegar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[9px] font-black text-[var(--text-secondary)] shadow-sm">ENTER</kbd>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Selecionar</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[9px] font-black text-[var(--text-secondary)] shadow-sm">ESC</kbd>
                <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Fechar</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpotlightSearch;
