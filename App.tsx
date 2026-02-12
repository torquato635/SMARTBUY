
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Search, 
  LayoutDashboard,
  X,
  Briefcase,
  Plus,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  Scissors,
  Wrench,
  Truck,
  FileDown,
  Layers,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  CheckSquare,
  Square,
  FileText,
  ShieldCheck,
  HardDrive,
  Filter,
  Box,
  AlertCircle,
  CheckCircle2,
  Timer,
  Target,
  BarChart3,
  CalendarDays,
  Printer,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { ProcurementProvider, useProcurement } from './ProcurementContext';
import DashboardStats from './components/DashboardStats';
import FileUpload from './components/FileUpload';
import ManagerialReportView from './components/ManagerialReportView';
import { CATEGORY_CONFIG, Sheet as SheetType, SheetData, ItemStatus, ProcurementItem } from './types';

type SortConfig = {
  key: keyof ProcurementItem | 'none';
  direction: 'asc' | 'desc';
};

const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const DateInput = ({ value, onChange, className }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseEnter = () => {
    try {
      if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        (inputRef.current as any).showPicker();
      }
    } catch (e) {
      // Fallback
    }
  };

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={onChange}
      onMouseEnter={handleMouseEnter}
      className={className}
    />
  );
};

const MainContent = () => {
  const { 
    sheets, 
    activeProjectId, 
    setActiveProjectId, 
    getActiveProjectItems, 
    getAllItems,
    addSheet, 
    removeSheet, 
    updateItemStatus, 
    updateItemOrderInfo,
    bulkUpdateItems,
    exportAllData,
    importAllData
  } = useProcurement();
  
  const [activeSheet, setActiveSheet] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [receivingSearchTerm, setReceivingSearchTerm] = useState('');
  const [logisticsGlobalSearch, setLogisticsGlobalSearch] = useState('');
  const [view, setView] = useState<'projects' | 'dashboard' | 'upload' | 'items' | 'projectReceiving' | 'report'>('projects');
  const [homeSubView, setHomeSubView] = useState<'projects' | 'receiving'>('projects');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'ALL' | 'NAO_COMPRADO'>('ALL');
  const [arrivalFilter, setArrivalFilter] = useState<'all' | 'atrasado' | 'hoje' | 'proximo'>('all');
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProjectName = sheets.find(s => s.id === activeProjectId)?.nome || 'PROJETO';
  const projectItems = getActiveProjectItems();
  const allItems = getAllItems();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [activeProjectId, activeSheet]);

  const getProjectCardMetrics = (sheet: SheetType) => {
    const total = sheet.items.length;
    const delivered = sheet.items.filter(i => i.status === 'ENTREGUE').length;
    const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const itemsWithArrival = sheet.items.filter(i => i.expectedArrival && i.status !== 'ENTREGUE');
    let longestLead = 'N/A';
    if (itemsWithArrival.length > 0) {
      const maxDate = itemsWithArrival.reduce((prev, curr) => (prev.expectedArrival! > curr.expectedArrival! ? prev : curr)).expectedArrival;
      longestLead = maxDate ? new Date(maxDate).toLocaleDateString('pt-BR') : 'N/A';
    }
    const critical = sheet.items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length;
    return { progress, longestLead, critical, total };
  };

  const getInternalPools = useCallback((items: ProcurementItem[]) => {
    const laserK = CATEGORY_CONFIG['LASER_FUNILARIA']?.keywords || [];
    const montagemK = CATEGORY_CONFIG['PEÇAS MONTAGEM']?.keywords || [];
    const usinagemK = CATEGORY_CONFIG['USINAGEM']?.keywords || [];
    const laserPool = items.filter(i => laserK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    const montagemPool = items.filter(i => montagemK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    const usinagemPool = items.filter(i => usinagemK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    return { laserPool, montagemPool, usinagemPool };
  }, []);

  const currentPools = useMemo(() => getInternalPools(projectItems), [projectItems, getInternalPools]);

  const getItemCategoryLabel = useCallback((item: ProcurementItem) => {
    const sName = normalizeString(item.sheetName);
    for (const key in CATEGORY_CONFIG) {
      if (key === 'All' || key === 'FABRICADOS') continue;
      if (CATEGORY_CONFIG[key].keywords.some(kw => sName.includes(normalizeString(kw)))) {
        return CATEGORY_CONFIG[key].label;
      }
    }
    return item.sheetName;
  }, []);

  const isAllowedInOverview = useCallback((item: ProcurementItem) => {
    const sName = normalizeString(item.sheetName);
    const allowedKeys = [
      'LASER_FUNILARIA',
      'USINAGEM',
      'POLICARBONATO',
      'PNEUMATICA',
      'PEÇAS MONTAGEM',
      'SOLDA'
    ];
    return allowedKeys.some(key => 
      CATEGORY_CONFIG[key]?.keywords.some(kw => sName.includes(normalizeString(kw)))
    );
  }, []);

  const receivingItems = useMemo(() => {
    let base = projectItems.filter(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE');
    if (receivingSearchTerm) {
      const term = normalizeString(receivingSearchTerm);
      base = base.filter(i => 
        (i.orderNumber && normalizeString(i.orderNumber).includes(term)) ||
        (i.description && normalizeString(i.description).includes(term))
      );
      const exactOrderMatch = base.filter(i => i.orderNumber && normalizeString(i.orderNumber) === term);
      if (exactOrderMatch.length > 0) base = exactOrderMatch;
    }
    return base.sort((a, b) => {
      if (!a.expectedArrival) return 1;
      if (!b.expectedArrival) return -1;
      return a.expectedArrival.localeCompare(b.expectedArrival);
    });
  }, [projectItems, receivingSearchTerm]);

  const logisticsGlobalItems = useMemo(() => {
    if (!logisticsGlobalSearch) return [];
    const term = normalizeString(logisticsGlobalSearch);
    return allItems.filter(i => 
      (i.orderNumber && normalizeString(i.orderNumber).includes(term)) ||
      (i.description && normalizeString(i.description).includes(term))
    ).sort((a, b) => (a.expectedArrival || '').localeCompare(b.expectedArrival || ''));
  }, [allItems, logisticsGlobalSearch]);

  const tabStats = useMemo(() => {
    const stats: Record<string, { rows: number, totalQty: number, isCompleted: boolean }> = {};
    const { laserPool, montagemPool, usinagemPool } = currentPools;
    Object.keys(CATEGORY_CONFIG).forEach(key => {
      const config = CATEGORY_CONFIG[key];
      let items: ProcurementItem[] = [];
      if (key === 'All') {
        items = projectItems.filter(i => isAllowedInOverview(i));
      } else if (key === 'FABRICADOS') {
        const laserPNs = new Set(laserPool.map(i => normalizeString(i.partNumber)));
        const mPoolPNs = new Set(montagemPool.map(i => normalizeString(i.partNumber)));
        items = usinagemPool.filter(u => laserPNs.has(normalizeString(u.partNumber)) || mPoolPNs.has(normalizeString(u.partNumber)));
      } else {
        items = projectItems.filter(i => config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw))));
      }
      const isCompleted = items.length > 0 && items.every(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE');
      stats[key] = { rows: items.length, totalQty: items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0), isCompleted };
    });
    return stats;
  }, [projectItems, currentPools, isAllowedInOverview]);

  const filteredItems = useMemo(() => {
    let baseItems: any[] = [];
    const { laserPool, montagemPool, usinagemPool } = currentPools;
    if (activeSheet === 'FABRICADOS') {
      const laserPNs = new Set(laserPool.map(i => normalizeString(i.partNumber)));
      const mPoolPNs = new Set(montagemPool.map(i => normalizeString(i.partNumber)));
      baseItems = usinagemPool.filter(uItem => {
        const pn = normalizeString(uItem.partNumber);
        return laserPNs.has(pn) || mPoolPNs.has(pn);
      }).map(uItem => {
        const pn = normalizeString(uItem.partNumber);
        const stages = [];
        if (laserPNs.has(pn)) stages.push({ label: 'LASER', delivered: laserPool.find(l => normalizeString(l.partNumber) === pn)?.status === 'ENTREGUE', icon: Scissors });
        if (mPoolPNs.has(pn)) stages.push({ label: 'MONTAGEM', delivered: montagemPool.find(m => normalizeString(m.partNumber) === pn)?.status === 'ENTREGUE', icon: Layers });
        stages.push({ label: 'USINAGEM', delivered: uItem.status === 'ENTREGUE', icon: Wrench });
        const progress = Math.round((stages.filter(s => s.delivered).length / stages.length) * 100);
        return { ...uItem, stages, progress, isEvolutionView: true };
      });
    } else {
      const config = CATEGORY_CONFIG[activeSheet];
      if (activeSheet === 'All') {
        baseItems = projectItems.filter(i => isAllowedInOverview(i));
      } else {
        baseItems = projectItems.filter(i => config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw))));
      }
    }
    if (filterStatus === 'NAO_COMPRADO') {
      baseItems = baseItems.filter(i => i.status === 'PENDENTE' || i.status === 'EM ORCAMENTO');
    } else if (filterStatus !== 'ALL') {
      baseItems = baseItems.filter(i => i.status === filterStatus);
    }
    if (arrivalFilter !== 'all') {
      baseItems = baseItems.filter(i => {
        if (!i.expectedArrival) return false;
        if (arrivalFilter === 'atrasado') return i.expectedArrival < today && i.status === 'COMPRADO';
        if (arrivalFilter === 'hoje') return i.expectedArrival === today;
        if (arrivalFilter === 'proximo') return i.expectedArrival > today;
        return true;
      });
    }
    if (search) {
      const s = normalizeString(search);
      baseItems = baseItems.filter(i => normalizeString(i.description).includes(s) || normalizeString(i.partNumber).includes(s) || (i.supplier && normalizeString(i.supplier).includes(s)));
    }
    if (sortConfig.key !== 'none') {
      baseItems.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof ProcurementItem] ?? '';
        const bVal = b[sortConfig.key as keyof ProcurementItem] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return baseItems;
  }, [projectItems, activeSheet, search, sortConfig, currentPools, filterStatus, arrivalFilter, today, isAllowedInOverview]);

  const handleDataLoaded = (data: SheetData) => {
    const newSheetId = `PRJ-${Date.now()}`;
    const newSheet: SheetType = {
      id: newSheetId,
      nome: normalizeString(data.fileName),
      items: data.sheets.flatMap((s) => s.items.map(item => ({ ...item, status: 'PENDENTE' }))),
      data_upload: new Date().toLocaleDateString('pt-BR')
    };
    addSheet(newSheet);
    setActiveProjectId(newSheetId);
    setView('dashboard');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (importAllData(content)) alert("Base importada com sucesso!");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const requestSort = (key: keyof ProcurementItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortHeader = ({ label, sortKey }: { label: string, sortKey: keyof ProcurementItem }) => (
    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />)}
      </div>
    </th>
  );

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedItemIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkDateApply = () => {
    if (!bulkDate || selectedItemIds.size === 0) return;
    bulkUpdateItems(selectedItemIds, { expectedArrival: bulkDate });
    setIsBulkDateModalOpen(false);
    setSelectedItemIds(new Set());
    setBulkDate('');
  };

  const handleExportReport = useCallback(() => {
    if (filteredItems.length === 0) return;
    const exportData = filteredItems.map(i => ({
      'CONJUNTO': i.assembly, 'CÓDIGO': i.partNumber, 'DESCRIÇÃO': i.description, 'QTD': i.quantity, 'UN': i.unit, 'STATUS': i.status, 'FORNECEDOR': i.supplier || '-', 'ORDEM': i.orderNumber || '-', 'NF': i.invoiceNumber || '-', 'CHEGADA': i.expectedArrival || '-'
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "RELATORIO");
    (window as any).XLSX.writeFile(wb, `RELATORIO_${activeProjectName}.xlsx`);
  }, [filteredItems, activeProjectName]);

  const handleExportQuotation = useCallback(() => {
    if (selectedItemIds.size === 0) {
      alert("Selecione itens para gerar a cotação.");
      return;
    }
    const selectedItems = projectItems.filter(i => selectedItemIds.has(i.id));
    const exportData = selectedItems.map(i => ({
      'CÓDIGO': i.partNumber,
      'DESCRIÇÃO': i.description,
      'QUANTIDADE': i.quantity
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "COTACAO");
    (window as any).XLSX.writeFile(wb, `LISTA_COTACAO_${activeProjectName}_${new Date().getTime()}.xlsx`);
  }, [selectedItemIds, projectItems, activeProjectName]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView('projects'); setActiveProjectId(null); }}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase">
              ALLTECH <span className="text-indigo-600">SMARTBUY</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="flex items-center bg-slate-50 rounded-2xl p-1 px-4 space-x-4 border border-slate-200 shadow-inner">
                <div className="flex items-center space-x-2">
                   <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                   <span className="text-[9px] font-black uppercase tracking-tight text-emerald-600">
                     Proteção Local Ativa
                   </span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center space-x-2 text-slate-400">
                   <HardDrive className="w-3 h-3" />
                   <span className="text-[8px] font-bold uppercase">
                     Dispositivo Atual
                   </span>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 md:px-10 pt-8 space-y-8 flex-1">
        <AnimatePresence mode="wait">
          {view === 'projects' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xl flex items-center space-x-2">
                   <button onClick={() => setHomeSubView('projects')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'projects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                     <Briefcase className="w-4 h-4" />
                     <span>Portfólio Local</span>
                   </button>
                   <button onClick={() => setHomeSubView('receiving')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'receiving' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                     <Truck className="w-4 h-4" />
                     <span>Recebimento</span>
                   </button>
                </div>
              </div>

              {homeSubView === 'projects' ? (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">MEUS PROJETOS</h1>
                      <p className="text-slate-500 font-bold uppercase text-xs mt-1">DADOS ARMAZENADOS NESTE DISPOSITIVO</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={exportAllData} title="Exportar Backup JSON" className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><CloudDownload className="w-5 h-5" /></button>
                      <button onClick={() => fileInputRef.current?.click()} title="Importar JSON" className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><CloudUpload className="w-5 h-5" /></button>
                      <button onClick={() => setView('upload')} className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase text-xs">
                        <Plus className="w-5 h-5" />
                        <span>NOVO PROJETO</span>
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
                    </div>
                  </div>

                  {!sheets.length ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200">
                      <Briefcase className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                      <h2 className="text-2xl font-black mb-4 uppercase">NENHUM PROJETO LOCAL</h2>
                      <p className="text-slate-400 text-sm font-bold uppercase mb-8">SUBIR PLANILHA OU IMPORTAR BACKUP JSON</p>
                      <button onClick={() => setView('upload')} className="px-14 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm">CRIAR PRIMEIRO PROJETO</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      {sheets.map(sheet => {
                        const m = getProjectCardMetrics(sheet);
                        return (
                          <motion.div key={sheet.id} whileHover={{ y: -10 }} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl cursor-pointer group flex flex-col h-full relative overflow-hidden" onClick={() => { setActiveProjectId(sheet.id); setView('dashboard'); }}>
                            <div className="flex justify-between items-start mb-8">
                              <div className="p-5 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm"><FileSpreadsheet className="w-8 h-8" /></div>
                              <button onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }} className="p-2 text-slate-200 hover:text-rose-500 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-1 uppercase truncate tracking-tight">{sheet.nome}</h3>
                            <p className="text-[10px] text-slate-400 font-black mb-10 uppercase tracking-widest">CRIADO EM {sheet.data_upload}</p>
                            <div className="space-y-6 mt-auto">
                              <div>
                                <div className="flex justify-between items-end mb-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-500" /> EVOLUÇÃO</span>
                                  <span className="text-xs font-black text-indigo-600">{m.progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-white rounded-xl shadow-sm"><Timer className="w-4 h-4 text-amber-500" /></div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LEAD TIME</span>
                                </div>
                                <span className="text-xs font-black text-slate-800 uppercase">{m.longestLead}</span>
                              </div>
                              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${m.critical > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-white rounded-xl shadow-sm"><AlertCircle className={`w-4 h-4 ${m.critical > 0 ? 'text-rose-500' : 'text-emerald-500'}`} /></div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CRÍTICOS</span>
                                </div>
                                <span className={`text-xs font-black uppercase ${m.critical > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {m.critical > 0 ? `${m.critical} ATRASADOS` : 'EM DIA'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                                <span>{m.total} ITENS</span>
                                <span className="text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">ABRIR <ChevronRight className="w-3 h-3" /></span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-6">
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">LOGÍSTICA</h1>
                      <div className="relative w-[350px] md:w-[450px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                        <input 
                          type="text" 
                          placeholder="PESQUISAR ORDEM DE COMPRA..." 
                          value={logisticsGlobalSearch} 
                          onChange={(e) => setLogisticsGlobalSearch(e.target.value)} 
                          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-3xl text-sm uppercase font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xl shadow-indigo-100/10" 
                        />
                        {logisticsGlobalSearch && (
                          <button onClick={() => setLogisticsGlobalSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {!logisticsGlobalSearch ? (
                      <motion.div 
                        key="project-cards" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                      >
                        {sheets.map(sheet => {
                          const toReceive = sheet.items.filter(i => i.status === 'COMPRADO').length;
                          const received = sheet.items.filter(i => i.status === 'ENTREGUE').length;
                          return (
                            <motion.button key={sheet.id} whileHover={{ scale: 1.02 }} onClick={() => { setActiveProjectId(sheet.id); setView('projectReceiving'); }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-left flex flex-col group relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] group-hover:bg-indigo-600 transition-all duration-500 flex items-center justify-center pt-6 pr-6"><ChevronRight className="w-6 h-6 text-indigo-400 group-hover:text-white" /></div>
                              <h3 className="text-xl font-black text-slate-800 mb-1 uppercase pr-10">{sheet.nome}</h3>
                              <div className="grid grid-cols-2 gap-4 mt-auto">
                                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-2xl font-black text-amber-600">{toReceive}</p>
                                    <p className="text-[9px] font-black text-amber-500 uppercase">PENDENTES</p>
                                 </div>
                                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-2xl font-black text-emerald-600">{received}</p>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase">RECEBIDOS</p>
                                 </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="global-results" 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 20 }} 
                        className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden"
                      >
                        <div className="bg-slate-50/50 p-6 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Box className="w-4 h-4" /> Resultados da Busca Global: {logisticsGlobalItems.length} itens encontrados
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50/20 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ORDEM</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PROJETO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QTD</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PREVISÃO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/30 text-center">NF</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BAIXA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {logisticsGlobalItems.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-8 py-20 text-center">
                                    <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                    <p className="text-slate-400 font-black uppercase text-xs">Nenhum item com essa ordem em nenhum projeto</p>
                                  </td>
                                </tr>
                              ) : (
                                logisticsGlobalItems.map(item => {
                                  const project = sheets.find(s => s.items.some(i => i.id === item.id));
                                  return (
                                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/30' : ''}`}>
                                      <td className="px-8 py-6"><span className="font-black text-slate-800">{item.orderNumber || '-'}</span></td>
                                      <td className="px-8 py-6"><span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full">{project?.nome || 'N/A'}</span></td>
                                      <td className="px-8 py-6">
                                        <div className="text-sm font-black text-slate-900 uppercase">{item.description}</div>
                                        <div className="text-[10px] font-mono text-slate-500 uppercase">{item.partNumber}</div>
                                      </td>
                                      <td className="px-8 py-6 text-center"><span className="font-black text-slate-800">{item.quantity}</span></td>
                                      <td className="px-8 py-6"><span className="text-xs font-bold text-slate-600">{item.expectedArrival || 'N/A'}</span></td>
                                      <td className="px-8 py-6 bg-indigo-50/10">
                                        <input 
                                          type="text" 
                                          placeholder="Nº DA NF..."
                                          value={item.invoiceNumber || ''} 
                                          onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} 
                                          className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                                        />
                                      </td>
                                      <td className="px-8 py-6 text-center">
                                        {item.status === 'ENTREGUE' ? (
                                          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="px-4 py-2 bg-emerald-600 text-white text-[9px] font-black rounded-full uppercase shadow-lg shadow-emerald-100 flex items-center justify-center space-x-1">
                                            <Check className="w-2.5 h-2.5" />
                                            <span>RECEBIDO</span>
                                          </motion.div>
                                        ) : (
                                          <button 
                                            onClick={() => updateItemStatus(item.id, 'ENTREGUE')}
                                            className="p-3 bg-white border border-slate-200 text-slate-300 hover:text-indigo-400 hover:border-indigo-400 rounded-2xl transition-all shadow-sm"
                                          >
                                            <Check className="w-5 h-5" />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : view === 'projectReceiving' ? (
             <motion.div key="project-receiving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex items-center space-x-5">
                    <button onClick={() => setView('projects')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">RECEBIMENTO: {activeProjectName}</h1>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">PESQUISA POR ORDEM DE COMPRA</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-[500px]">
                    <Search className="absolute left-5 top-5 w-5 h-5 text-indigo-400" />
                    <input 
                      type="text" 
                      placeholder="PESQUISAR NÚMERO DE ORDEM..." 
                      value={receivingSearchTerm} 
                      onChange={(e) => setReceivingSearchTerm(e.target.value)} 
                      className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl text-sm uppercase font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xl shadow-indigo-100/20" 
                    />
                    {receivingSearchTerm && (
                      <button onClick={() => setReceivingSearchTerm('')} className="absolute right-5 top-5 p-1 text-slate-300 hover:text-rose-500 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                {receivingSearchTerm && (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center space-x-3 text-indigo-600">
                    <Filter className="w-5 h-5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Exibindo itens da Ordem: "{receivingSearchTerm}"</span>
                  </div>
                )}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ORDEM</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QTD</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PREVISÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/30 text-center">NF</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receivingItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center">
                              <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Digite um número de ordem para visualizar os itens</p>
                            </td>
                          </tr>
                        ) : (
                          receivingItems.map(item => (
                            <tr key={item.id} className={`hover:bg-slate-50/50 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/30' : ''}`}>
                              <td className="px-8 py-6">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-8 bg-indigo-500 rounded-full mr-2"></div>
                                  <span className="font-black text-base text-slate-800">{item.orderNumber || '-'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="text-sm font-black text-slate-900 uppercase">{item.description}</div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase">{item.partNumber}</div>
                              </td>
                              <td className="px-8 py-6 text-center"><span className="text-lg font-black text-slate-800">{item.quantity}</span></td>
                              <td className="px-8 py-6">
                                <DateInput 
                                  value={item.expectedArrival || ''} 
                                  onChange={(e) => updateItemOrderInfo(item.id, { expectedArrival: e.target.value })} 
                                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                />
                              </td>
                              <td className="px-8 py-6 bg-indigo-50/10">
                                <input 
                                  type="text" 
                                  placeholder="Nº DA NF..."
                                  value={item.invoiceNumber || ''} 
                                  onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} 
                                  className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                                />
                              </td>
                              <td className="px-8 py-6 text-center">
                                {item.status === 'ENTREGUE' ? (
                                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase shadow-lg shadow-emerald-100 flex items-center justify-center space-x-1">
                                    <Check className="w-3 h-3" />
                                    <span>RECEBIDO</span>
                                  </motion.div>
                                ) : (
                                  <div className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black rounded-full uppercase">PENDENTE</div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
             </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-5">
                  <button onClick={() => setView('projects')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                  <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{activeProjectName}</h1>
                </div>
                <button 
                  onClick={() => setView('report')} 
                  className="flex items-center space-x-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase text-xs tracking-wider"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>RELATÓRIO GERENCIAL</span>
                </button>
              </div>
              
              <div className="space-y-8 p-1">
                <DashboardStats 
                  items={projectItems} 
                  onEntregueClick={() => { setFilterStatus('ENTREGUE'); setArrivalFilter('all'); setView('items'); }} 
                  onAtrasadosClick={() => { setFilterStatus('COMPRADO'); setArrivalFilter('atrasado'); setView('items'); }}
                  onPendentesClick={() => { setFilterStatus('NAO_COMPRADO'); setArrivalFilter('all'); setView('items'); }}
                />
                
                <div className="space-y-6">
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">CATEGORIAS DO PROJETO</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      if (key === 'All') return null;
                      const stats = tabStats[key] || { rows: 0, totalQty: 0, isCompleted: false };
                      return (
                        <motion.button 
                          key={key} 
                          whileHover={{ scale: 1.02 }} 
                          onClick={() => { setActiveSheet(key); setFilterStatus('ALL'); setArrivalFilter('all'); setView('items'); }} 
                          className={`p-8 rounded-[2.5rem] border-2 transition-all text-left flex items-center space-x-6 relative overflow-hidden ${activeSheet === key ? `border-indigo-600 bg-indigo-50/50 shadow-inner` : 'border-white bg-white shadow-sm hover:border-slate-200'}`}
                        >
                          {stats.isCompleted && (
                            <div className="absolute top-0 right-0 p-3 bg-emerald-500 text-white rounded-bl-3xl shadow-lg">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                          <div className={`p-5 rounded-2xl shrink-0 ${config.bg} ${config.text}`}><config.icon className="w-7 h-7" /></div>
                          <div className="flex-1 min-w-0">
                             <div className="text-[12px] font-black text-slate-800 uppercase leading-tight truncate">{config.label}</div>
                             <div className={`text-[10px] font-black mt-2 uppercase ${stats.isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                               {stats.isCompleted ? '100% ADQUIRIDO' : `${stats.rows} LINHAS`}
                             </div>
                          </div>
                        </motion.button>
                      );
                    })}
                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => { setActiveSheet('All'); setFilterStatus('ALL'); setArrivalFilter('all'); setView('items'); }} 
                      className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all text-left flex items-center space-x-6"
                    >
                      <div className="p-5 rounded-2xl shrink-0 bg-white/20 text-white"><Layers className="w-7 h-7" /></div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[12px] font-black uppercase leading-tight">VISÃO GERAL</div>
                         <div className="text-[10px] font-black text-indigo-100 mt-2 uppercase">{tabStats['All']?.rows} LINHAS CATEGORIZADAS</div>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'report' ? (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-8 flex items-center justify-between print:hidden">
                <div className="flex items-center space-x-4">
                  <button onClick={() => setView('dashboard')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <h1 className="text-2xl font-black uppercase text-slate-800">Relatório Gerencial do Projeto</h1>
                </div>
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir Relatório
                </button>
              </div>
              <ManagerialReportView items={projectItems} projectName={activeProjectName} />
            </motion.div>
          ) : view === 'upload' ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto py-16"><FileUpload onDataLoaded={handleDataLoaded} /></motion.div>
          ) : view === 'items' ? (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center space-x-4 shrink-0">
                   <button onClick={() => setView('dashboard')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {activeSheet === 'All' ? 'VISÃO GERAL DO PROJETO' : CATEGORY_CONFIG[activeSheet]?.label}
                    {arrivalFilter === 'atrasado' && <span className="ml-4 text-rose-500 text-sm font-black uppercase border border-rose-100 bg-rose-50 px-3 py-1 rounded-full">EM ATRASO</span>}
                    {filterStatus === 'NAO_COMPRADO' && <span className="ml-4 text-amber-500 text-sm font-black uppercase border border-amber-100 bg-amber-50 px-3 py-1 rounded-full">PENDENTES</span>}
                   </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex-1">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl flex-1 border border-slate-100">
                    <Search className="w-4 h-4 text-slate-300" />
                    <input type="text" placeholder="BUSCAR POR DESCRIÇÃO OU CÓDIGO..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-[11px] uppercase font-bold outline-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedItemIds.size > 0 && (
                      <button 
                        onClick={() => setIsBulkDateModalOpen(true)}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all shadow-sm"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Definir Data ({selectedItemIds.size})</span>
                      </button>
                    )}
                    <button 
                      onClick={handleExportQuotation} 
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-md ${selectedItemIds.size > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Gerar Cotação ({selectedItemIds.size})</span>
                    </button>
                    <button onClick={handleExportReport} className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-md">
                      <FileDown className="w-3.5 h-3.5" />
                      <span>EXPORTAR EXCEL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal de Preenchimento em Massa */}
              <AnimatePresence>
                {isBulkDateModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                      className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl"
                    >
                      <h3 className="text-xl font-black text-slate-800 uppercase mb-4">Preenchimento em Massa</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-6">Definir data de chegada para {selectedItemIds.size} itens selecionados:</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Previsão de Chegada</label>
                          <input 
                            type="date" 
                            value={bulkDate} 
                            onChange={(e) => setBulkDate(e.target.value)}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-4">
                          <button onClick={() => setIsBulkDateModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                          <button onClick={handleBulkDateApply} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Aplicar Data</button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-5 w-16 text-center">
                          <button onClick={toggleAllSelection} className="text-slate-300 hover:text-indigo-500 transition-colors">
                            {selectedItemIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6" />}
                          </button>
                        </th>
                        {activeSheet === 'All' && <th className="px-6 py-5 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">CATEGORIA</th>}
                        <SortHeader label="CONJUNTO" sortKey="assembly" />
                        <SortHeader label="CÓDIGO" sortKey="partNumber" />
                        <SortHeader label="DESCRIÇÃO" sortKey="description" />
                        <SortHeader label="QTD" sortKey="quantity" />
                        {activeSheet !== 'FABRICADOS' ? (
                          <>
                            <SortHeader label="FORNECEDOR" sortKey="supplier" />
                            <SortHeader label="ORDEM" sortKey="orderNumber" />
                            <SortHeader label="PREVISÃO" sortKey="expectedArrival" />
                            <SortHeader label="STATUS" sortKey="status" />
                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BAIXA</th>
                          </>
                        ) : (
                          <th className="px-10 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">PROCESSO</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/10' : ''} ${selectedItemIds.has(item.id) ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-6 py-5 text-center">
                            <button onClick={() => toggleItemSelection(item.id)} className="text-slate-200 hover:text-indigo-400 transition-colors">
                              {selectedItemIds.has(item.id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6" />}
                            </button>
                          </td>
                          {activeSheet === 'All' && (
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                {getItemCategoryLabel(item)}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{item.assembly}</td>
                          <td className="px-6 py-5 text-[11px] font-mono font-bold text-slate-500">{item.partNumber}</td>
                          <td className="px-6 py-5 font-black text-sm text-slate-900 uppercase">{item.description}</td>
                          <td className="px-6 py-5 text-center font-black text-base">{item.quantity}</td>
                          {activeSheet !== 'FABRICADOS' ? (
                            <>
                              <td className="px-6 py-5"><input type="text" value={item.supplier || ''} onChange={(e) => updateItemOrderInfo(item.id, { supplier: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" /></td>
                              <td className="px-6 py-5"><input type="text" value={item.orderNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { orderNumber: e.target.value })} className="w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-inner" /></td>
                              <td className="px-6 py-5">
                                <DateInput 
                                  value={item.expectedArrival || ''} 
                                  onChange={(e) => updateItemOrderInfo(item.id, { expectedArrival: e.target.value })} 
                                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-500/10"
                                />
                              </td>
                              <td className="px-6 py-5">
                                <select value={item.status} onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)} className="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 border-none outline-none">
                                  <option value="PENDENTE">🟡 PENDENTE</option><option value="EM ORCAMENTO">🔵 ORÇAMENTO</option><option value="COMPRADO">🟢 COMPRADO</option><option value="ENTREGUE">✅ ENTREGUE</option>
                                </select>
                              </td>
                              <td className="px-10 py-5 text-center"><button onClick={() => updateItemStatus(item.id, item.status === 'ENTREGUE' ? 'COMPRADO' : 'ENTREGUE')} className={`p-3 rounded-2xl border transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-300 border-slate-200 hover:text-indigo-400'}`}><Check className="w-5 h-5" /></button></td>
                            </>
                          ) : (
                            <td className="px-10 py-5">
                              <div className="flex flex-col space-y-3 w-full max-w-sm mx-auto">
                                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest gap-2">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`flex items-center space-x-1 ${stage.delivered ? 'text-emerald-600' : 'text-slate-400'}`}><stage.icon className="w-3.5 h-3.5" /><span>{stage.label}</span></div>))}
                                 </div>
                                 <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`h-full transition-all duration-700 ${stage.delivered ? 'bg-emerald-500' : 'bg-transparent'}`} style={{ width: `${100 / item.stages.length}%` }} />))}
                                 </div>
                                 <div className="flex justify-center">{item.progress === 100 ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1 rounded-full uppercase">FINALIZADO</span> : <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1 rounded-full uppercase">{item.progress}%</span>}</div>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      <footer className="w-full px-6 md:px-10 py-6 border-t border-slate-200 bg-white mt-auto print:hidden">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alltech SmartBuy &copy; 2024 - Gerenciamento Local</p>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Armazenamento Local Ativo</span></div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (<ProcurementProvider><MainContent /></ProcurementProvider>);
};

export default App;
