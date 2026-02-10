
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Search, 
  Sparkles,
  LayoutDashboard,
  X,
  Download,
  CheckSquare,
  Square,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Briefcase,
  Plus,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Scissors,
  Wrench,
  Database,
  Trash2,
  CloudDownload,
  CloudUpload,
  Filter,
  User,
  Hash,
  Truck,
  FileText,
  FileDown,
  Layers,
  ChevronRight,
  Cloud,
  Share2,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { ProcurementProvider, useProcurement } from './ProcurementContext';
import DashboardStats from './components/DashboardStats';
import FileUpload from './components/FileUpload';
import { ItemType, CATEGORY_CONFIG, Sheet as SheetType, SheetData, ItemStatus, ProcurementItem } from './types';

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

const MainContent = () => {
  const { 
    sheets, 
    activeProjectId, 
    syncStatus,
    setActiveProjectId, 
    getActiveProjectItems, 
    addSheet, 
    removeSheet, 
    updateItemStatus, 
    updateItemOrderInfo,
    exportAllData,
    importAllData,
    forceSync
  } = useProcurement();
  
  const [activeSheet, setActiveSheet] = useState<string>('All');
  const [search, setSearch] = useState('');
  
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterOrder, setFilterOrder] = useState('');
  const [receivingSearchTerm, setReceivingSearchTerm] = useState('');

  const [arrivalFilter, setArrivalFilter] = useState<'all' | 'atrasado' | 'hoje' | 'proximo'>('all');
  const [view, setView] = useState<'projects' | 'dashboard' | 'upload' | 'items' | 'receiving' | 'projectReceiving'>('projects');
  const [homeSubView, setHomeSubView] = useState<'projects' | 'receiving'>('projects');
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncStatus === 'saving') {
        const message = "O sistema ainda está salvando dados na nuvem. Deseja realmente sair?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncStatus]);

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setView('dashboard');
    setActiveSheet('All');
  };

  const projectItems = getActiveProjectItems();
  const activeProjectName = sheets.find(s => s.id === activeProjectId)?.nome || 'PROJETO';
  const today = new Date().toISOString().split('T')[0];

  const getInternalPools = useCallback((items: ProcurementItem[]) => {
    const laserK = CATEGORY_CONFIG['LASER_FUNILARIA'].keywords;
    const montagemK = CATEGORY_CONFIG['PEÇAS MONTAGEM'].keywords;
    const usinagemK = CATEGORY_CONFIG['USINAGEM'].keywords;
    const laserPool = items.filter(i => laserK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    const montagemPool = items.filter(i => montagemK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    const usinagemPool = items.filter(i => usinagemK.some(k => normalizeString(i.sheetName).includes(normalizeString(k))));
    return { laserPool, montagemPool, usinagemPool };
  }, []);

  const currentPools = useMemo(() => getInternalPools(projectItems), [projectItems, getInternalPools]);

  const receivingItems = useMemo(() => {
    let base = projectItems.filter(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE');
    if (receivingSearchTerm) {
      const term = normalizeString(receivingSearchTerm);
      base = base.filter(i => 
        (i.orderNumber && normalizeString(i.orderNumber).includes(term)) ||
        (i.description && normalizeString(i.description).includes(term))
      );
    }
    return base.sort((a, b) => {
      if (!a.expectedArrival) return 1;
      if (!b.expectedArrival) return -1;
      return a.expectedArrival.localeCompare(b.expectedArrival);
    });
  }, [projectItems, receivingSearchTerm]);

  const tabStats = useMemo(() => {
    const stats: Record<string, { rows: number, totalQty: number }> = {};
    const { laserPool, montagemPool, usinagemPool } = currentPools;
    Object.keys(CATEGORY_CONFIG).forEach(key => {
      const config = CATEGORY_CONFIG[key];
      let items: ProcurementItem[] = [];
      if (key === 'All') items = projectItems;
      else if (key === 'FABRICADOS') {
        const laserPNs = new Set(laserPool.map(i => normalizeString(i.partNumber)));
        const montagemPNs = new Set(montagemPool.map(i => normalizeString(i.partNumber)));
        items = usinagemPool.filter(u => laserPNs.has(normalizeString(u.partNumber)) || montagemPNs.has(normalizeString(u.partNumber)));
      } else {
        items = projectItems.filter(i => config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw))));
      }
      stats[key] = { rows: items.length, totalQty: items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) };
    });
    return stats;
  }, [projectItems, currentPools]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    projectItems.forEach(item => { if (item.supplier && item.supplier.trim() !== '') suppliers.add(normalizeString(item.supplier)); });
    return Array.from(suppliers).sort();
  }, [projectItems]);

  const filteredItems = useMemo(() => {
    let baseItems: any[] = [];
    const { laserPool, montagemPool, usinagemPool } = currentPools;
    if (activeSheet === 'FABRICADOS') {
      const laserPNs = new Set(laserPool.map(i => normalizeString(i.partNumber)));
      const montagemPNs = new Set(montagemPool.map(i => normalizeString(i.partNumber)));
      baseItems = usinagemPool.filter(uItem => {
        const pn = normalizeString(uItem.partNumber);
        return laserPNs.has(pn) || montagemPNs.has(pn);
      }).map(uItem => {
        const pn = normalizeString(uItem.partNumber);
        const stages = [];
        if (laserPNs.has(pn)) stages.push({ label: 'LASER', delivered: laserPool.find(l => normalizeString(l.partNumber) === pn)?.status === 'ENTREGUE', icon: Scissors });
        else if (montagemPNs.has(pn)) stages.push({ label: 'MONTAGEM', delivered: montagemPool.find(m => normalizeString(m.partNumber) === pn)?.status === 'ENTREGUE', icon: Layers });
        stages.push({ label: 'USINAGEM', delivered: uItem.status === 'ENTREGUE', icon: Wrench });
        const progress = Math.round((stages.filter(s => s.delivered).length / stages.length) * 100);
        return { ...uItem, stages, progress, isEvolutionView: true };
      });
    } else {
      const config = CATEGORY_CONFIG[activeSheet];
      if (activeSheet === 'All') baseItems = projectItems;
      else baseItems = projectItems.filter(i => config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw))));
    }
    if (filterStatus !== 'ALL') baseItems = baseItems.filter(i => i.status === filterStatus);
    if (filterSupplier !== '') baseItems = baseItems.filter(i => i.supplier && normalizeString(i.supplier) === filterSupplier);
    if (filterOrder !== '') baseItems = baseItems.filter(i => i.orderNumber && normalizeString(i.orderNumber).includes(normalizeString(filterOrder)));
    if (arrivalFilter !== 'all') {
      baseItems = baseItems.filter(i => {
        if (!i.expectedArrival || i.status !== 'COMPRADO') return false;
        if (arrivalFilter === 'atrasado') return i.expectedArrival < today;
        if (arrivalFilter === 'hoje') return i.expectedArrival === today;
        if (arrivalFilter === 'proximo') return i.expectedArrival > today;
        return true;
      });
    }
    if (search) {
      const s = normalizeString(search);
      baseItems = baseItems.filter(i => normalizeString(i.description).includes(s) || normalizeString(i.partNumber).includes(s) || normalizeString(i.assembly).includes(s) || (i.supplier && normalizeString(i.supplier).includes(s)));
    }
    if (sortConfig.key !== 'none') {
      baseItems.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return baseItems;
  }, [projectItems, activeSheet, search, arrivalFilter, today, sortConfig, currentPools, filterStatus, filterSupplier, filterOrder]);

  const arrivalsData = useMemo(() => {
    const itemsWithArrival = projectItems.filter(i => i.expectedArrival && i.status === 'COMPRADO');
    return {
      atrasados: itemsWithArrival.filter(i => i.expectedArrival! < today),
      hoje: itemsWithArrival.filter(i => i.expectedArrival === today),
      proximos: itemsWithArrival.filter(i => i.expectedArrival! > today).sort((a,b) => a.expectedArrival!.localeCompare(b.expectedArrival!))
    };
  }, [projectItems, today]);

  const handleDataLoaded = (data: SheetData) => {
    const newSheetId = `PRJ-${Date.now()}`;
    const newSheet: SheetType = {
      id: newSheetId,
      nome: normalizeString(data.fileName),
      items: data.sheets.flatMap((s) => s.items.map(item => ({ ...item, status: normalizeString(item.status) as ItemStatus }))),
      data_upload: new Date().toLocaleDateString('pt-BR')
    };
    addSheet(newSheet);
    setActiveProjectId(newSheetId);
    setView('dashboard');
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link do projeto copiado!");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (importAllData(content)) alert("Base importada!");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedItemIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) setSelectedItemIds(new Set());
    else setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
  };

  const handleExportQuotation = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const itemsToExport = filteredItems.filter(i => selectedItemIds.has(i.id));
    const exportData = itemsToExport.map(i => ({ 
      'CÓDIGO': i.partNumber, 
      'DESCRIÇÃO': i.description, 
      'QUANTIDADE': i.quantity 
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "ORCAMENTO");
    (window as any).XLSX.writeFile(wb, `SOLICITACAO_ORCAMENTO_${activeProjectName}.xlsx`);
  }, [selectedItemIds, filteredItems, activeProjectName]);

  const handleExportReport = useCallback(() => {
    if (filteredItems.length === 0) return;
    const exportData = filteredItems.map(i => ({
      'CONJUNTO': i.assembly, 'CÓDIGO': i.partNumber, 'DESCRIÇÃO': i.description, 'QTD': i.quantity, 'UN': i.unit, 'STATUS': i.status, 'FORNECEDOR': i.supplier || '-', 'ORDEM': i.orderNumber || '-', 'NF': i.invoiceNumber || '-', 'CHEGADA': i.expectedArrival || '-'
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "DADOS");
    (window as any).XLSX.writeFile(wb, `RELATORIO_${activeProjectName}.xlsx`);
  }, [filteredItems, activeProjectName]);

  const requestSort = (key: keyof ProcurementItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortHeader = ({ label, sortKey }: { label: string, sortKey: keyof ProcurementItem }) => (
    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors group" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />) : (<ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />)}
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
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
            <button 
              onClick={forceSync}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95 ${
              syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
              syncStatus === 'saving' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
              'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
              {syncStatus === 'saving' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
              <span>{
                syncStatus === 'synced' ? 'Nuvem Sincronizada' :
                syncStatus === 'saving' ? 'Salvando...' :
                'Erro Sinc.'
              }</span>
            </button>
            {activeProjectId && (
              <button onClick={handleShare} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                <Share2 className="w-3 h-3" />
                <span>Link</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-6 md:px-10 pt-8 space-y-8 flex-1">
        <AnimatePresence mode="wait">
          {view === 'projects' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex justify-center mb-10">
                <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xl flex items-center space-x-2">
                   <button onClick={() => setHomeSubView('projects')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'projects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                     <Briefcase className="w-4 h-4" />
                     <span>Meus Projetos</span>
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
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">GERENCIADOR DE PROJETOS</h1>
                      <p className="text-slate-500 font-bold uppercase text-xs mt-1">ORGANIZAÇÃO DE COMPRAS POR PLANILHAS</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={exportAllData} title="Exportar Backup Local" className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><CloudDownload className="w-5 h-5" /></button>
                      <button onClick={() => fileInputRef.current?.click()} title="Importar Backup Local" className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><CloudUpload className="w-5 h-5" /></button>
                      <button onClick={() => setView('upload')} className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase text-xs">
                        <Plus className="w-5 h-5" />
                        <span>NOVO PROJETO</span>
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".smartbuy" />
                    </div>
                  </div>

                  {!sheets.length ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200">
                      <Briefcase className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                      <h2 className="text-2xl font-black mb-4 uppercase">SEM PROJETOS ATIVOS</h2>
                      <button onClick={() => setView('upload')} className="px-14 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm">IMPORTAR PLANILHA</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {sheets.map(sheet => {
                        const total = sheet.items.length;
                        const ok = sheet.items.filter(i => i.status === 'ENTREGUE').length;
                        const percent = total > 0 ? Math.round((ok / total) * 100) : 0;
                        return (
                          <motion.div key={sheet.id} whileHover={{ y: -8 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm cursor-pointer group flex flex-col h-full" onClick={() => openProject(sheet.id)}>
                            <div className="flex justify-between mb-6">
                              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><FileSpreadsheet className="w-6 h-6" /></div>
                              <button onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }} className="p-2 text-slate-200 hover:text-rose-500 rounded-xl"><X className="w-5 h-5" /></button>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1 uppercase truncate">{sheet.nome}</h3>
                            <p className="text-[10px] text-slate-400 font-black mb-6 uppercase">CRIADO EM {sheet.data_upload}</p>
                            <div className="mt-auto">
                              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-indigo-600" />
                              </div>
                              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                <span>{total} ITENS</span>
                                <span>{percent}% OK</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">CENTRAL DE RECEBIMENTO</h1>
                      <p className="text-slate-500 font-bold uppercase text-xs mt-1">SELECIONE O PROJETO PARA CONFERÊNCIA DE CARGA</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sheets.map(sheet => {
                      const toReceive = sheet.items.filter(i => i.status === 'COMPRADO').length;
                      const received = sheet.items.filter(i => i.status === 'ENTREGUE').length;
                      return (
                        <motion.button key={sheet.id} whileHover={{ scale: 1.02 }} onClick={() => { setActiveProjectId(sheet.id); setView('projectReceiving'); }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-left flex flex-col group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-indigo-600 transition-all duration-500 flex items-center justify-center pt-6 pr-6"><ChevronRight className="w-6 h-6 text-indigo-400 group-hover:text-white" /></div>
                          <h3 className="text-xl font-black text-slate-800 mb-1 uppercase pr-10">{sheet.nome}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-auto">
                             <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-2xl font-black text-amber-600">{toReceive}</p>
                                <p className="text-[9px] font-black text-amber-500 uppercase">A RECEBER</p>
                             </div>
                             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-2xl font-black text-emerald-600">{received}</p>
                                <p className="text-[9px] font-black text-emerald-500 uppercase">RECEBIDOS</p>
                             </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
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
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">BAIXA DE NOTAS FISCAIS E CONFERÊNCIA</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-[450px]">
                    <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                    <input type="text" placeholder="BUSCAR POR ORDEM OU DESCRIÇÃO..." value={receivingSearchTerm} onChange={(e) => setReceivingSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs uppercase font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xl" />
                  </div>
                </div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PEDIDO / ORDEM</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ITEM / DESCRIÇÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QTD</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PREVISÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/30 text-center">Nº NOTA FISCAL (NF)</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receivingItems.map(item => {
                          const isLate = item.expectedArrival && item.expectedArrival < today && item.status !== 'ENTREGUE';
                          return (
                            <tr key={item.id} className={`hover:bg-slate-50/50 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/30' : ''}`}>
                              <td className="px-8 py-6">
                                <div className="flex items-center space-x-3"><div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Hash className="w-4 h-4" /></div><span className="text-sm font-black text-slate-700">{item.orderNumber || 'S/ ORDEM'}</span></div>
                              </td>
                              <td className="px-8 py-6"><div className="text-sm font-black text-slate-900 uppercase">{item.description}</div><div className="text-[10px] font-mono text-slate-500 uppercase">{item.partNumber}</div></td>
                              <td className="px-8 py-6 text-center"><span className="text-lg font-black text-slate-800">{item.quantity}</span></td>
                              <td className="px-8 py-6"><div className={`flex items-center space-x-2 text-xs font-black ${isLate ? 'text-rose-500' : 'text-slate-600'}`}><Calendar className="w-3.5 h-3.5" /><span>{item.expectedArrival ? new Date(item.expectedArrival).toLocaleDateString('pt-BR') : 'N/A'}</span></div></td>
                              <td className="px-8 py-6 bg-indigo-50/20"><input type="text" value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} placeholder="NF..." className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner" /></td>
                              <td className="px-8 py-6 text-center">{item.status === 'ENTREGUE' ? <span className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase">RECEBIDO</span> : <span className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black rounded-full uppercase">EM TRÂNSITO</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
             </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="flex items-center space-x-5">
                <button onClick={() => setView('projects')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{activeProjectName}</h1>
              </div>
              <DashboardStats items={projectItems} onEntregueClick={() => { setFilterStatus('ENTREGUE'); setArrivalFilter('all'); setView('items'); }} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => { setArrivalFilter('atrasado'); setView('items'); }} className="bg-rose-50 p-6 rounded-3xl border border-rose-100 cursor-pointer hover:scale-105 transition-all">
                   <AlertCircle className="w-6 h-6 text-rose-600 mb-4" />
                   <p className="text-4xl font-black text-rose-700">{arrivalsData.atrasados.length}</p>
                   <span className="text-[10px] font-black text-rose-600 uppercase">EM ATRASO</span>
                </div>
                <div onClick={() => { setArrivalFilter('hoje'); setView('items'); }} className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 cursor-pointer hover:scale-105 transition-all">
                   <Clock className="w-6 h-6 text-indigo-600 mb-4" />
                   <p className="text-4xl font-black text-indigo-700">{arrivalsData.hoje.length}</p>
                   <span className="text-[10px] font-black text-indigo-600 uppercase">CHEGA HOJE</span>
                </div>
                <div onClick={() => { setArrivalFilter('proximo'); setView('items'); }} className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 cursor-pointer hover:scale-105 transition-all">
                   <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-4" />
                   <p className="text-4xl font-black text-emerald-700">{arrivalsData.proximos.length}</p>
                   <span className="text-[10px] font-black text-emerald-600 uppercase">PREVISTOS</span>
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">FLUXOS DE PROCESSAMENTO</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    if (key === 'All') return null;
                    const stats = tabStats[key] || { rows: 0, totalQty: 0 };
                    return (
                      <motion.button key={key} whileHover={{ scale: 1.02 }} onClick={() => { setActiveSheet(key); setView('items'); setArrivalFilter('all'); setFilterStatus('ALL'); setFilterSupplier(''); setFilterOrder(''); }} className={`p-8 rounded-[2.5rem] border-2 transition-all text-left flex items-center space-x-6 ${activeSheet === key ? `border-indigo-600 bg-indigo-50/50 shadow-inner` : 'border-white bg-white shadow-sm hover:border-slate-200'}`}>
                        <div className={`p-5 rounded-2xl shrink-0 ${config.bg} ${config.text}`}><config.icon className="w-7 h-7" /></div>
                        <div className="flex-1 min-w-0">
                           <div className="text-[12px] font-black text-slate-800 uppercase leading-tight truncate">{config.label}</div>
                           <div className="text-[10px] font-black text-indigo-600 mt-2 uppercase">{stats.rows} LINHAS</div>
                           <div className="text-[10px] font-black text-slate-400 uppercase">{stats.totalQty} UNIDADES</div>
                        </div>
                      </motion.button>
                    );
                  })}
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setActiveSheet('All'); setView('items'); setArrivalFilter('all'); setFilterStatus('ALL'); setFilterSupplier(''); setFilterOrder(''); }} className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all text-left flex items-center space-x-6">
                    <div className="p-5 rounded-2xl shrink-0 bg-white/20 text-white"><Layers className="w-7 h-7" /></div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[12px] font-black uppercase leading-tight">TODO O INVENTÁRIO</div>
                       <div className="text-[10px] font-black text-indigo-100 mt-2 uppercase">{tabStats['All']?.rows} LINHAS</div>
                       <div className="text-[10px] font-black text-indigo-200 uppercase">{tabStats['All']?.totalQty} UNIDADES</div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : view === 'upload' ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto py-16"><FileUpload onDataLoaded={handleDataLoaded} /></motion.div>
          ) : view === 'items' ? (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center space-x-4 shrink-0">
                   <button onClick={() => setView('dashboard')} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeSheet === 'All' ? 'CONSOLIDADO DE ITENS' : CATEGORY_CONFIG[activeSheet]?.label}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 bg-white p-2.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                  <div className="relative min-w-[200px]"><Search className="absolute left-4 top-3 w-4 h-4 text-slate-300" /><input type="text" placeholder="PESQUISAR..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] uppercase font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                  <div className="flex items-center space-x-2">
                    {selectedItemIds.size > 0 && (
                      <button onClick={handleExportQuotation} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>SOLICITAR ORÇAMENTO ({selectedItemIds.size})</span>
                      </button>
                    )}
                    <button onClick={handleExportReport} className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg"><FileDown className="w-3.5 h-3.5" /><span>RELATÓRIO</span></button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-10 py-6 w-16 text-center"><button onClick={toggleAllSelection} className="text-slate-300">{selectedItemIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6" />}</button></th>
                        <SortHeader label="CONJUNTO" sortKey="assembly" /><SortHeader label="CODIGO" sortKey="partNumber" /><SortHeader label="DESCRICAO" sortKey="description" /><SortHeader label="QTD" sortKey="quantity" />
                        {activeSheet !== 'FABRICADOS' ? (<><SortHeader label="FORNECEDOR" sortKey="supplier" /><SortHeader label="N ORDEM" sortKey="orderNumber" /><SortHeader label="PREVISAO" sortKey="expectedArrival" /><SortHeader label="STATUS" sortKey="status" /><th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BAIXA</th></>) : (<th className="px-10 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">ESTEIRA DE PRODUÇÃO</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/20' : ''}`}>
                          <td className="px-10 py-5 text-center"><button onClick={() => toggleItemSelection(item.id)} className="text-slate-200">{selectedItemIds.has(item.id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6" />}</button></td>
                          <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{item.assembly}</td>
                          <td className="px-6 py-5 text-[11px] font-mono font-bold text-slate-500">{item.partNumber}</td>
                          <td className="px-6 py-5"><div className="font-black text-sm text-slate-900 uppercase">{item.description}</div></td>
                          <td className="px-6 py-5 text-center"><span className="font-black text-base text-slate-800">{item.quantity}</span></td>
                          {activeSheet !== 'FABRICADOS' ? (<>
                            <td className="px-6 py-5"><input type="text" value={item.supplier || ''} onChange={(e) => updateItemOrderInfo(item.id, { supplier: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" /></td>
                            <td className="px-6 py-5"><input type="text" value={item.orderNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { orderNumber: e.target.value })} className="w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-inner" /></td>
                            <td className="px-6 py-5"><input type="date" value={item.expectedArrival || ''} onChange={(e) => updateItemOrderInfo(item.id, { expectedArrival: e.target.value })} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black" /></td>
                            <td className="px-6 py-5">
                              <select value={item.status} onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)} className="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 border-none outline-none">
                                <option value="PENDENTE">🟡 PENDENTE</option><option value="EM ORCAMENTO">🔵 ORCAMENTO</option><option value="COMPRADO">🟢 COMPRADO</option><option value="ENTREGUE">✅ ENTREGUE</option>
                              </select>
                            </td>
                            <td className="px-10 py-5 text-center"><button onClick={() => updateItemStatus(item.id, item.status === 'ENTREGUE' ? 'COMPRADO' : 'ENTREGUE')} className={`p-3 rounded-2xl border transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-300 border-slate-200 hover:text-indigo-400'}`}><Check className="w-5 h-5" /></button></td>
                          </>) : (
                            <td className="px-10 py-5">
                              <div className="flex flex-col space-y-3 w-full max-w-sm mx-auto">
                                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest gap-2">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`flex items-center space-x-1 ${stage.delivered ? 'text-emerald-600' : 'text-slate-400'}`}><stage.icon className="w-3.5 h-3.5" /><span>{stage.label}</span></div>))}
                                 </div>
                                 <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 relative shadow-inner">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`h-full transition-all duration-700 ${stage.delivered ? 'bg-emerald-500' : 'bg-transparent'}`} style={{ width: `${100 / item.stages.length}%` }} />))}
                                 </div>
                                 <div className="flex justify-center">{item.progress === 100 ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 uppercase">PROCESSO FINALIZADO</span> : <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full uppercase">EM PRODUÇÃO ({item.progress}%)</span>}</div>
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

      <footer className="w-full px-6 md:px-10 py-6 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alltech SmartBuy &copy; 2024 - Sistema de Alta Disponibilidade</p>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Armazenamento Local Sincronizado</span></div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (<ProcurementProvider><MainContent /></ProcurementProvider>);
};

export default App;
