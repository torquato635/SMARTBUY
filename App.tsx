import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Search, 
  LayoutDashboard,
  X,
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
  Scissors,
  Wrench,
  CloudUpload,
  Hash,
  Truck,
  FileDown,
  Layers,
  ChevronRight,
  Cloud,
  RefreshCw,
  LogIn,
  LogOut,
  Trash2,
  Download,
  Cpu
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
    isGoogleAuthenticated,
    setActiveProjectId, 
    getActiveProjectItems, 
    addSheet, 
    removeSheet, 
    updateItemStatus, 
    updateItemOrderInfo,
    exportAllData,
    importAllData,
    loginGoogle,
    logoutGoogle,
    clearAllData
  } = useProcurement();
  
  const [activeSheet, setActiveSheet] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [receivingSearchTerm, setReceivingSearchTerm] = useState('');
  const [view, setView] = useState<'projects' | 'dashboard' | 'upload' | 'items' | 'projectReceiving'>('projects');
  const [homeSubView, setHomeSubView] = useState<'projects' | 'receiving'>('projects');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProjectName = sheets.find(s => s.id === activeProjectId)?.nome || 'PROJETO';
  const projectItems = getActiveProjectItems();

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
        if (montagemPNs.has(pn)) stages.push({ label: 'MONTAGEM', delivered: montagemPool.find(m => normalizeString(m.partNumber) === pn)?.status === 'ENTREGUE', icon: Layers });
        stages.push({ label: 'USINAGEM', delivered: uItem.status === 'ENTREGUE', icon: Wrench });
        const progress = Math.round((stages.filter(s => s.delivered).length / stages.length) * 100);
        return { ...uItem, stages, progress, isEvolutionView: true };
      });
    } else {
      const config = CATEGORY_CONFIG[activeSheet];
      if (activeSheet === 'All') baseItems = projectItems;
      else baseItems = projectItems.filter(i => config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw))));
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
  }, [projectItems, activeSheet, search, sortConfig, currentPools]);

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

  const SortHeader = ({ label, sortKey }: { label: string, sortKey: keyof ProcurementItem }) => (
    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => {
        setSortConfig(prev => ({ key: sortKey, direction: prev.key === sortKey && prev.direction === 'asc' ? 'desc' : 'asc' }));
    }}>
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />)}
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
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
               <Cpu className="w-3 h-3 text-indigo-500" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">React 19 Active</span>
            </div>
            {isGoogleAuthenticated ? (
              <div className="flex items-center space-x-3">
                 <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase transition-all ${
                   syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                   syncStatus === 'saving' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                   'bg-rose-50 border-rose-100 text-rose-600'
                 }`}>
                   {syncStatus === 'saving' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                   <span>{syncStatus === 'saving' ? 'Sincronizando...' : 'Google Drive'}</span>
                 </div>
                 <button onClick={logoutGoogle} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={loginGoogle} className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                <LogIn className="w-4 h-4" />
                <span>Conectar Drive</span>
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
                   <button onClick={() => setHomeSubView('projects')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'projects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                     <Briefcase className="w-4 h-4" />
                     <span>Meus Projetos</span>
                   </button>
                   <button onClick={() => setHomeSubView('receiving')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'receiving' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
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
                      <p className="text-slate-500 font-bold uppercase text-xs mt-1">Sincronização Cloud Real-Time (10s)</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={exportAllData} className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><Download className="w-5 h-5" /></button>
                      <button onClick={() => setView('upload')} className="flex items-center space-x-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase text-xs">
                        <Plus className="w-5 h-5" />
                        <span>NOVO PROJETO</span>
                      </button>
                    </div>
                  </div>

                  {!sheets.length ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200">
                      <Briefcase className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                      <h2 className="text-2xl font-black mb-2 uppercase">PLANILHA NÃO DETECTADA</h2>
                      <p className="text-slate-400 font-bold text-xs mb-8 uppercase">SUBIR UMA PLANILHA PARA INICIAR O FOLLOW-UP</p>
                      <button onClick={() => setView('upload')} className="px-14 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm">IMPORTAR PLANILHA</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {sheets.map(sheet => {
                        const total = sheet.items.length;
                        const ok = sheet.items.filter(i => i.status === 'ENTREGUE').length;
                        const percent = total > 0 ? Math.round((ok / total) * 100) : 0;
                        return (
                          <motion.div key={sheet.id} whileHover={{ y: -8 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm cursor-pointer group flex flex-col h-full" onClick={() => { setActiveProjectId(sheet.id); setView('dashboard'); }}>
                            <div className="flex justify-between mb-6">
                              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><FileSpreadsheet className="w-6 h-6" /></div>
                              <button onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }} className="p-2 text-slate-200 hover:text-rose-500 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1 uppercase truncate">{sheet.nome}</h3>
                            <p className="text-[10px] text-slate-400 font-black mb-6 uppercase">UPLOAD EM {sheet.data_upload}</p>
                            <div className="mt-auto">
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
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
                      <p className="text-slate-500 font-bold uppercase text-xs mt-1">CONTROLE DE NOTA FISCAL E ENTRADA DE CARGA</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sheets.map(sheet => {
                      const toReceive = sheet.items.filter(i => i.status === 'COMPRADO').length;
                      const received = sheet.items.filter(i => i.status === 'ENTREGUE').length;
                      return (
                        <motion.button key={sheet.id} whileHover={{ scale: 1.02 }} onClick={() => { setActiveProjectId(sheet.id); setView('projectReceiving'); }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-left flex flex-col group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-[4rem] group-hover:bg-indigo-600 transition-all duration-300 flex items-center justify-center pt-4 pr-4"><ChevronRight className="w-6 h-6 text-indigo-400 group-hover:text-white" /></div>
                          <h3 className="text-xl font-black text-slate-800 mb-1 uppercase pr-10">{sheet.nome}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-8">
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
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{activeProjectName}</h1>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">BAIXA DE NOTAS FISCAIS EM TEMPO REAL</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-[450px]">
                    <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                    <input type="text" placeholder="BUSCAR POR ORDEM OU DESCRIÇÃO..." value={receivingSearchTerm} onChange={(e) => setReceivingSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs uppercase font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-lg" />
                  </div>
                </div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ORDEM</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QTD</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PREVISÃO</th>
                          <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/30 text-center">Nº NOTA FISCAL (NF)</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receivingItems.map(item => (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/30' : ''}`}>
                            <td className="px-8 py-6 font-black text-sm text-slate-600 uppercase">{item.orderNumber || 'S/ ORDEM'}</td>
                            <td className="px-8 py-6"><div className="text-sm font-black text-slate-900 uppercase">{item.description}</div><div className="text-[10px] font-mono text-slate-400 uppercase">{item.partNumber}</div></td>
                            <td className="px-8 py-6 text-center font-black text-lg">{item.quantity}</td>
                            <td className="px-8 py-6 text-xs font-black uppercase text-slate-500">{item.expectedArrival ? new Date(item.expectedArrival).toLocaleDateString('pt-BR') : 'N/A'}</td>
                            <td className="px-8 py-6 bg-indigo-50/10"><input type="text" value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} placeholder="DIGITE A NF..." className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner" /></td>
                            <td className="px-8 py-6 text-center">{item.status === 'ENTREGUE' ? <span className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase">CONCLUÍDO</span> : <span className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black rounded-full uppercase">PENDENTE</span>}</td>
                          </tr>
                        ))}
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
              <DashboardStats items={projectItems} onEntregueClick={() => { setView('items'); setActiveSheet('All'); }} />
              <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">FLUXOS DE PROCESSAMENTO</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    if (key === 'All') return null;
                    const stats = tabStats[key] || { rows: 0, totalQty: 0 };
                    return (
                      <motion.button key={key} whileHover={{ scale: 1.02 }} onClick={() => { setActiveSheet(key); setView('items'); }} className={`p-8 rounded-[2.5rem] border-2 transition-all text-left flex items-center space-x-6 ${activeSheet === key ? `border-indigo-600 bg-indigo-50/50 shadow-inner` : 'border-white bg-white shadow-sm hover:border-slate-200'}`}>
                        <div className={`p-5 rounded-2xl shrink-0 ${config.bg} ${config.text}`}><config.icon className="w-7 h-7" /></div>
                        <div className="flex-1 min-w-0">
                           <div className="text-[12px] font-black text-slate-800 uppercase leading-tight truncate">{config.label}</div>
                           <div className="text-[10px] font-black text-indigo-600 mt-2 uppercase">{stats.rows} LINHAS</div>
                        </div>
                      </motion.button>
                    );
                  })}
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setActiveSheet('All'); setView('items'); }} className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all text-left flex items-center space-x-6">
                    <div className="p-5 rounded-2xl shrink-0 bg-white/20 text-white"><Layers className="w-7 h-7" /></div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[12px] font-black uppercase leading-tight">TODO O INVENTÁRIO</div>
                       <div className="text-[10px] font-black text-indigo-100 mt-2 uppercase">{tabStats['All']?.rows} LINHAS</div>
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
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeSheet === 'All' ? 'VISÃO GERAL' : CATEGORY_CONFIG[activeSheet]?.label}</h2>
                </div>
                <div className="flex items-center gap-4 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex-1 max-w-xl">
                  <Search className="w-4 h-4 text-slate-300 ml-2" />
                  <input type="text" placeholder="BUSCAR POR DESCRIÇÃO OU PN..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full py-2 bg-transparent text-[11px] uppercase font-bold outline-none" />
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <SortHeader label="CONJUNTO" sortKey="assembly" /><SortHeader label="CÓDIGO" sortKey="partNumber" /><SortHeader label="DESCRIÇÃO" sortKey="description" /><SortHeader label="QTD" sortKey="quantity" />
                        {activeSheet !== 'FABRICADOS' ? (<><SortHeader label="FORNECEDOR" sortKey="supplier" /><SortHeader label="ORDEM" sortKey="orderNumber" /><SortHeader label="PREVISÃO" sortKey="expectedArrival" /><SortHeader label="STATUS" sortKey="status" /><th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BAIXA</th></>) : (<th className="px-10 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">FLUXO DE PRODUÇÃO</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-50/10' : ''}`}>
                          <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase">{item.assembly}</td>
                          <td className="px-6 py-5 text-[11px] font-mono font-bold text-slate-500">{item.partNumber}</td>
                          <td className="px-6 py-5 font-black text-sm text-slate-900 uppercase">{item.description}</td>
                          <td className="px-6 py-5 text-center font-black text-base">{item.quantity}</td>
                          {activeSheet !== 'FABRICADOS' ? (<>
                            <td className="px-6 py-5"><input type="text" value={item.supplier || ''} onChange={(e) => updateItemOrderInfo(item.id, { supplier: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" /></td>
                            <td className="px-6 py-5"><input type="text" value={item.orderNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { orderNumber: e.target.value })} className="w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-inner" /></td>
                            <td className="px-6 py-5"><input type="date" value={item.expectedArrival || ''} onChange={(e) => updateItemOrderInfo(item.id, { expectedArrival: e.target.value })} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black" /></td>
                            <td className="px-6 py-5">
                              <select value={item.status} onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)} className="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 border-none outline-none">
                                <option value="PENDENTE">🟡 PENDENTE</option><option value="EM ORCAMENTO">🔵 ORÇAMENTO</option><option value="COMPRADO">🟢 COMPRADO</option><option value="ENTREGUE">✅ ENTREGUE</option>
                              </select>
                            </td>
                            <td className="px-10 py-5 text-center"><button onClick={() => updateItemStatus(item.id, item.status === 'ENTREGUE' ? 'COMPRADO' : 'ENTREGUE')} className={`p-3 rounded-2xl border transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-300 border-slate-200 hover:text-indigo-400'}`}><Check className="w-5 h-5" /></button></td>
                          </>) : (
                            <td className="px-10 py-5">
                              <div className="flex flex-col space-y-3 w-full max-w-sm mx-auto">
                                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest gap-2">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`flex items-center space-x-1 ${stage.delivered ? 'text-emerald-600' : 'text-slate-400'}`}><stage.icon className="w-3.5 h-3.5" /><span>{stage.label}</span></div>))}
                                 </div>
                                 <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                                    {item.stages?.map((stage: any, sIdx: number) => (<div key={sIdx} className={`h-full transition-all duration-700 ${stage.delivered ? 'bg-emerald-500' : 'bg-transparent'}`} style={{ width: `${100 / item.stages.length}%` }} />))}
                                 </div>
                                 <div className="flex justify-center">{item.progress === 100 ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1 rounded-full uppercase">FINALIZADO</span> : <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1 rounded-full uppercase">{item.progress}% CONCLUÍDO</span>}</div>
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
          <div className="flex items-center space-x-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alltech SmartBuy &copy; 2024</p>
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-indigo-600 rounded-md">
               <span className="text-[8px] font-black text-white uppercase">React 19 Core</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isGoogleAuthenticated ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
              {isGoogleAuthenticated ? 'Drive Sync Active (10s)' : 'Disconnected'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (<ProcurementProvider><MainContent /></ProcurementProvider>);
};

export default App;