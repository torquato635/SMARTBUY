
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
  BarChart3,
  ChevronLeft,
  Calendar,
  ShoppingCart,
  Printer,
  AlertOctagon,
  Building2,
  Clock,
  ArrowDownCircle,
  PackageCheck,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Factory,
  Download,
  Eraser,
  CalendarDays,
  ClipboardList,
  Target,
  ArrowRight,
  Package,
  ListFilter,
  RefreshCw,
  Wifi,
  WifiOff,
  History,
  Timer,
  FileUp,
  Trash2,
  Sparkles,
  Bot
} from 'lucide-react';
import { ProcurementProvider, useProcurement } from './ProcurementContext';
import DashboardStats from './components/DashboardStats';
import FileUpload from './components/FileUpload';
import ManufacturingLineView from './components/ManufacturingLineView';
import ProjectReportView from './components/ProjectReportView';
import { CATEGORY_CONFIG, Sheet as SheetType, SheetData, ItemStatus, ProcurementItem } from './types';
import { getReceivingInsights } from './services/geminiService';

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

const DateInput = ({ value, onChange, className, readOnly }: { value: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, readOnly?: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleMouseEnter = () => {
    if (readOnly) return;
    try {
      if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        (inputRef.current as any).showPicker();
      }
    } catch (e) {}
  };

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={onChange}
      onMouseEnter={handleMouseEnter}
      className={className}
      readOnly={readOnly}
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
    importAllData,
    syncStatus,
    lastSyncTime
  } = useProcurement();
  
  const [activeSheet, setActiveSheet] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [logisticsGlobalSearch, setLogisticsGlobalSearch] = useState('');
  const [view, setView] = useState<'projects' | 'dashboard' | 'upload' | 'items' | 'projectReceiving' | 'report'>('projects');
  const [homeSubView, setHomeSubView] = useState<'projects' | 'receiving'>('projects');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [logisticsFilters, setLogisticsFilters] = useState<Record<string, 'RECEBIDO' | 'A_RECEBER' | 'ATRASADO' | 'ALL'>>({});
  
  const [logisticsSnapshots, setLogisticsSnapshots] = useState<Record<string, { filter: string, ids: string[] }>>({});

  const [itemFilterStatus, setItemFilterStatus] = useState<ItemStatus | 'ALL' | 'NAO_COMPRADO' | 'ATRASADO'>('ALL');
  const [visibleItemIds, setVisibleItemIds] = useState<Set<string> | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [massDate, setMassDate] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  
  const [receivingAiSummary, setReceivingAiSummary] = useState<string>('Analisando logística...');
  const [loadingReceivingAi, setLoadingReceivingAi] = useState(false);
  const [lastAiUpdateTime, setLastAiUpdateTime] = useState<number | null>(null);

  // State para o modal de exclusão
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<{id: string, name: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProjectName = sheets.find(s => s.id === activeProjectId)?.nome || 'TODOS OS PROJETOS';
  const projectItems = getActiveProjectItems();
  const allGlobalItems = getAllItems();
  const today = new Date().toISOString().split('T')[0];

  const getItemCategory = useCallback((item: ProcurementItem) => {
    const uSheet = normalizeString(item.sheetName);
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      if (key === 'All' || key === 'FABRICADOS') continue;
      if (config.keywords.some(kw => uSheet.includes(normalizeString(kw)))) {
        return key;
      }
    }
    if (item.type === 'Fabricado') return 'FABRICADOS';
    return null;
  }, []);

  const isItemInAnyCard = useCallback((item: ProcurementItem) => {
    const cat = getItemCategory(item);
    return cat !== null && cat !== 'FABRICADOS';
  }, [getItemCategory]);

  // IA Insight Effect para Recebimento com Cache de 1h
  useEffect(() => {
    const fetchReceivingAi = async () => {
      if (homeSubView !== 'receiving' || sheets.length === 0) return;

      const allItems = sheets.flatMap(s => s.items).filter(i => isItemInAnyCard(i));
      const relevantItems = allItems.filter(i => i.status === 'COMPRADO');
      const delayed = relevantItems.filter(i => i.expectedArrival && i.expectedArrival < today);
      const next7Days = relevantItems.filter(i => i.expectedArrival && i.expectedArrival >= today && i.expectedArrival <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      // Gerar fingerprint único para os dados atuais
      const dataFingerprint = `${relevantItems.length}-${delayed.length}-${next7Days.length}-${allItems.filter(i => i.status === 'ENTREGUE').length}`;

      const CACHE_KEY = 'receiving_ai_cache_v1';
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        try {
          const { response, timestamp, fingerprint } = JSON.parse(cached);
          const now = Date.now();
          const isExpired = now - timestamp > 3600000; // 1 hora em milissegundos
          const hasChanged = fingerprint !== dataFingerprint;

          // Se não expirou, usamos o cache mesmo que tenha mudado (mantém estável por 1h)
          if (!isExpired) {
            setReceivingAiSummary(response);
            setLastAiUpdateTime(timestamp);
            return;
          }

          // Se expirou mas os dados são IGUAIS, apenas renovamos o timestamp e usamos o cache
          if (isExpired && !hasChanged) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ response, timestamp: now, fingerprint: dataFingerprint }));
            setReceivingAiSummary(response);
            setLastAiUpdateTime(now);
            return;
          }
        } catch (e) {
          console.error("Erro ao ler cache da IA:", e);
        }
      }

      // Se chegamos aqui, ou não tem cache, ou expirou e os dados mudaram
      setLoadingReceivingAi(true);
      const summary = await getReceivingInsights(allItems);
      const updateTime = Date.now();
      
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        response: summary,
        timestamp: updateTime,
        fingerprint: dataFingerprint
      }));

      setReceivingAiSummary(summary);
      setLastAiUpdateTime(updateTime);
      setLoadingReceivingAi(false);
    };

    fetchReceivingAi();
  }, [homeSubView, sheets, isItemInAnyCard, today]);

  const globalMetrics = useMemo(() => {
    const allItems = sheets.flatMap(s => s.items.filter(i => isItemInAnyCard(i)));
    return {
      pendentes: allItems.filter(i => i.status === 'PENDENTE').length,
      comprados: allItems.filter(i => i.status === 'COMPRADO').length,
      entregues: allItems.filter(i => i.status === 'ENTREGUE').length
    };
  }, [sheets, isItemInAnyCard]);

  const getProjectCardMetrics = useCallback((sheet: SheetType) => {
    const items = sheet.items.filter(i => isItemInAnyCard(i));
    const total = items.length || 1;
    const bought = items.filter(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE').length;
    const delivered = items.filter(i => i.status === 'ENTREGUE').length;
    const delayed = items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length;
    
    return {
      placedOrdersProgress: Math.round((bought / total) * 100),
      deliveryProgress: Math.round((delivered / total) * 100),
      delayed,
      delayedProgress: Math.round((delayed / total) * 100)
    };
  }, [isItemInAnyCard, today]);

  const logisticsData = useMemo(() => {
    const allValidItems = sheets.flatMap(s => 
      s.items.map(i => ({ ...i, projectId: s.id, projectName: s.nome }))
    ).filter(i => isItemInAnyCard(i));

    const searchResults = logisticsGlobalSearch 
      ? allValidItems.filter(i => 
          (i.orderNumber && normalizeString(i.orderNumber).includes(normalizeString(logisticsGlobalSearch))) ||
          (i.supplier && normalizeString(i.supplier).includes(normalizeString(logisticsGlobalSearch))) ||
          normalizeString(i.description).includes(normalizeString(logisticsGlobalSearch))
        )
      : [];

    const projectsWithData = sheets.map(s => {
      const pItems = s.items.filter(i => isItemInAnyCard(i) && (i.status === 'COMPRADO' || i.status === 'ENTREGUE'));
      
      const currentFilter = logisticsFilters[s.id] || 'ALL';
      const snapshot = logisticsSnapshots[s.id];

      let filteredItems;
      if (snapshot && snapshot.filter === currentFilter && currentFilter !== 'ALL') {
        filteredItems = pItems.filter(i => snapshot.ids.includes(i.id));
      } else {
        filteredItems = pItems.filter(i => {
          const isAtrasado = i.expectedArrival && i.expectedArrival < today && i.status !== 'ENTREGUE';
          if (currentFilter === 'RECEBIDO') return i.status === 'ENTREGUE';
          if (currentFilter === 'A_RECEBER') return i.status === 'COMPRADO' && !isAtrasado;
          if (currentFilter === 'ATRASADO') return isAtrasado;
          return true;
        });
      }

      const metrics = {
        delivered: pItems.filter(i => i.status === 'ENTREGUE').length,
        toReceive: pItems.filter(i => i.status === 'COMPRADO' && !(i.expectedArrival && i.expectedArrival < today)).length,
        atrasados: pItems.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length
      };

      return {
        ...s,
        procuredItems: filteredItems,
        metrics
      };
    }).filter(p => p.procuredItems.length > 0 || Object.values(p.metrics).some(v => (v as number) > 0));

    return { searchResults, projectsWithData };
  }, [sheets, logisticsGlobalSearch, logisticsFilters, logisticsSnapshots, isItemInAnyCard, today]);

  const setProjectFilter = (projectId: string, filter: 'RECEBIDO' | 'A_RECEBER' | 'ATRASADO' | 'ALL') => {
    setLogisticsFilters(prev => ({ ...prev, [projectId]: filter }));
    
    if (filter === 'ALL') {
      setLogisticsSnapshots(prev => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
    } else {
      const project = sheets.find(s => s.id === projectId);
      if (project) {
        const matchingIds = project.items
          .filter(i => isItemInAnyCard(i) && (i.status === 'COMPRADO' || i.status === 'ENTREGUE'))
          .filter(i => {
            const isAtrasado = i.expectedArrival && i.expectedArrival < today && i.status !== 'ENTREGUE';
            if (filter === 'RECEBIDO') return i.status === 'ENTREGUE';
            if (filter === 'A_RECEBER') return i.status === 'COMPRADO' && !isAtrasado;
            if (filter === 'ATRASADO') return isAtrasado;
            return true;
          })
          .map(i => i.id);
          
        setLogisticsSnapshots(prev => ({
          ...prev,
          [projectId]: { filter, ids: matchingIds }
        }));
      }
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handlePrint = () => window.print();

  const handleSort = (key: keyof ProcurementItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const refreshVisibleItems = useCallback((status: ItemStatus | 'ALL' | 'NAO_COMPRADO' | 'ATRASADO', category: string, projectId: string | null) => {
    const currentItems = projectId ? sheets.find(s => s.id === projectId)?.items || [] : sheets.flatMap(s => s.items);
    
    let baseItems;
    if (category === 'All') {
      baseItems = currentItems.filter(i => isItemInAnyCard(i));
    } else {
      baseItems = currentItems.filter(i => getItemCategory(i) === category);
    }

    let filtered;
    if (status === 'NAO_COMPRADO' || status === 'PENDENTE') {
      filtered = baseItems.filter(i => i.status === 'PENDENTE');
    } else if (status === 'ATRASADO') {
      filtered = baseItems.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today);
    } else if (status === 'ALL') {
      filtered = baseItems;
    } else {
      filtered = baseItems.filter(i => i.status === status);
    }
    
    setVisibleItemIds(new Set(filtered.map(i => i.id)));
  }, [sheets, isItemInAnyCard, getItemCategory, today]);

  useEffect(() => {
    if (itemFilterStatus !== 'ALL' || activeSheet !== 'All' || search) {
      if (!visibleItemIds) {
        refreshVisibleItems(itemFilterStatus, activeSheet, activeProjectId);
      }
    } else {
      setVisibleItemIds(null);
    }
  }, [itemFilterStatus, activeSheet, activeProjectId, refreshVisibleItems, visibleItemIds, search]);

  const handleStatusFilter = (status: ItemStatus | 'ALL' | 'NAO_COMPRADO' | 'ATRASADO') => {
    setItemFilterStatus(status);
    setActiveSheet('All');
    refreshVisibleItems(status, 'All', activeProjectId);
    setView('items');
  };

  const handleCategoryClick = (key: string) => {
    setActiveSheet(key);
    setItemFilterStatus('ALL');
    refreshVisibleItems('ALL', key, activeProjectId);
    setView('items');
    setSelectedIds(new Set());
    setSortConfig({ key: 'none', direction: 'asc' });
  };

  const handleGlobalStatusFilter = (status: ItemStatus | 'NAO_COMPRADO' | 'ATRASADO') => {
    setActiveProjectId(null); 
    setItemFilterStatus(status);
    setActiveSheet('All');
    refreshVisibleItems(status, 'All', null);
    setView('items');
  };

  const tabStats = useMemo(() => {
    const stats: Record<string, { rows: number, totalQty: number, missingToBuy: number, isCompleted: boolean, purchasedProgress: number }> = {};
    const itemsToStat = activeProjectId ? projectItems : allGlobalItems;

    Object.keys(CATEGORY_CONFIG).forEach(key => {
      if (key === 'All') {
        const validItems = itemsToStat.filter(i => isItemInAnyCard(i));
        stats[key] = { rows: validItems.length, totalQty: 0, missingToBuy: 0, isCompleted: false, purchasedProgress: 0 };
        return;
      }

      if (key === 'FABRICADOS') {
        let pairedRowsCount = 0;
        let totalSubProcesses = 0;
        let finishedSubProcesses = 0;
        const sItems = itemsToStat;
        const usinagem = sItems.filter(i => normalizeString(i.sheetName).includes('USINAGEM'));
        const laser = sItems.filter(i => normalizeString(i.sheetName).includes('LASER') || normalizeString(i.sheetName).includes('FUNILARIA'));
        const comerciais = sItems.filter(i => normalizeString(i.sheetName).includes('MONTAGEM') || normalizeString(i.sheetName).includes('COMERCIAL'));
        let availLaser = [...laser];
        let availCom = [...comerciais];
        usinagem.forEach(u => {
          const uPN = normalizeString(u.partNumber);
          const uDesc = normalizeString(u.description);
          let lIdx = availLaser.findIndex(l => (uPN !== '-' && normalizeString(l.partNumber) === uPN) || normalizeString(l.description) === uDesc);
          let laserMatch = lIdx !== -1 ? availLaser.splice(lIdx, 1)[0] : null;
          let cIdx = availCom.findIndex(c => (uPN !== '-' && normalizeString(c.partNumber) === uPN) || normalizeString(c.description) === uDesc);
          let comMatch = cIdx !== -1 ? availCom.splice(cIdx, 1)[0] : null;
          const count = 1 + (laserMatch ? 1 : 0) + (comMatch ? 1 : 0);
          if (count >= 2) {
            pairedRowsCount++;
            totalSubProcesses += count;
            if (u.status === 'ENTREGUE') finishedSubProcesses++;
            if (laserMatch?.status === 'ENTREGUE') finishedSubProcesses++;
            if (comMatch?.status === 'ENTREGUE') finishedSubProcesses++;
          }
        });
        const progress = totalSubProcesses > 0 ? Math.round((finishedSubProcesses / totalSubProcesses) * 100) : 100;
        stats[key] = { rows: pairedRowsCount, totalQty: pairedRowsCount, missingToBuy: 0, isCompleted: progress === 100, purchasedProgress: progress };
        return;
      }

      const items = itemsToStat.filter(i => getItemCategory(i) === key);
      const rows = items.length;
      const totalQty = items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      const totalComprados = items.filter(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE').length;
      const isCompleted = rows > 0 ? totalComprados === rows : true;
      const purchasedProgress = rows > 0 ? Math.round((totalComprados / rows) * 100) : 100;
      stats[key] = { rows, totalQty, missingToBuy: items.filter(i => i.status === 'PENDENTE').length, isCompleted, purchasedProgress };
    });
    return stats;
  }, [projectItems, allGlobalItems, activeProjectId, isItemInAnyCard, getItemCategory]);

  const filteredItems = useMemo(() => {
    const itemsToFilter = activeProjectId ? projectItems : allGlobalItems;
    let baseItems = [];
    if (activeSheet === 'All') {
      baseItems = itemsToFilter.filter(i => isItemInAnyCard(i));
    } else {
      baseItems = itemsToFilter.filter(i => getItemCategory(i) === activeSheet);
    }
    if (visibleItemIds) baseItems = baseItems.filter(i => visibleItemIds.has(i.id));
    if (search) {
      const s = normalizeString(search);
      baseItems = baseItems.filter(i => normalizeString(i.description).includes(s) || normalizeString(i.partNumber).includes(s) || (i.supplier && normalizeString(i.supplier).includes(s)));
    }
    if (sortConfig.key !== 'none') {
      baseItems.sort((a, b) => {
        let aVal = a[sortConfig.key as keyof ProcurementItem];
        let bVal = b[sortConfig.key as keyof ProcurementItem];
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return baseItems;
  }, [projectItems, allGlobalItems, activeSheet, search, visibleItemIds, sortConfig, activeProjectId, isItemInAnyCard, getItemCategory]);

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
      if (importAllData(content)) setView('projects');
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const exitItemsView = () => {
    setVisibleItemIds(null);
    setItemFilterStatus('ALL');
    setSelectedIds(new Set());
    if (activeProjectId) setView('dashboard'); else setView('projects');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const applyMassDate = () => {
    if (!massDate || selectedIds.size === 0) return;
    bulkUpdateItems(selectedIds, { expectedArrival: massDate });
    setMassDate('');
    setSelectedIds(new Set());
  };

  const handleExportWithPassword = () => {
    const password = window.prompt("Digite a senha de segurança para EXPORTAR o backup dos dados:");
    if (password === '372812') {
      exportAllData();
    } else if (password !== null) {
      alert("Senha incorreta. Operação cancelada.");
    }
  };

  const handleImportClickWithPassword = () => {
    const password = window.prompt("Digite a senha de segurança para IMPORTAR um novo backup (isso substituirá os dados atuais):");
    if (password === '372812') {
      fileInputRef.current?.click();
    } else if (password !== null) {
      alert("Senha incorreta. Operação cancelada.");
    }
  };

  const exportSelectionForQuotation = () => {
    if (selectedIds.size === 0) return;
    const itemsToExport = (activeProjectId ? projectItems : allGlobalItems)
      .filter(i => selectedIds.has(i.id))
      .map(i => {
        const projectOfItem = sheets.find(s => s.items.some(it => it.id === i.id));
        return {
          'PROJETO': projectOfItem?.nome || '-',
          'CÓDIGO': i.partNumber,
          'DESCRIÇÃO': i.description,
          'QUANTIDADE': i.quantity
        };
      });
    const worksheet = (window as any).XLSX.utils.json_to_sheet(itemsToExport);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Cotacao");
    (window as any).XLSX.writeFile(workbook, `COTACAO_${activeProjectName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };

  const exportCurrentSituation = () => {
    const itemsToExport = filteredItems.map(i => {
      const projectOfItem = sheets.find(s => s.items.some(it => it.id === i.id));
      return { 
        'PROJETO': projectOfItem?.nome || '-',
        'CÓDIGO': i.partNumber,
        'DESCRIÇÃO': i.description,
        'QTD': i.quantity,
        'FORNECEDOR': i.supplier || '-',
        'ORDEM': i.orderNumber || '-',
        'PREVISÃO': i.expectedArrival || '-',
        'DATA DE CHEGADA': i.actualArrivalDate || '-',
        'STATUS': (i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today) ? 'ATRASADO' : i.status,
        'NOTA FISCAL': i.invoiceNumber || '-',
        'CONJUNTO': i.assembly
      };
    });
    const worksheet = (window as any).XLSX.utils.json_to_sheet(itemsToExport);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Situacao_Atual");
    (window as any).XLSX.writeFile(workbook, `SITUACAO_ATUAL_${activeSheet === 'All' ? 'GERAL' : activeSheet}_${activeProjectName}.xlsx`);
  };

  const handleDeleteProjectClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteConfirmProject({ id, name });
  };

  const handleConfirmDeleteWithPassword = () => {
    if (!deleteConfirmProject) return;
    
    const password = window.prompt(`Digite a senha de segurança para excluir o projeto "${deleteConfirmProject.name}":`);
    if (password === '372812') {
      removeSheet(deleteConfirmProject.id);
      setDeleteConfirmProject(null);
    } else if (password !== null) {
      alert('Senha incorreta. Operação cancelada.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans flex flex-col">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="w-full px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => { setView('projects'); setActiveProjectId(null); setVisibleItemIds(null); }}>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                BORTO <span className="text-emerald-500">SMARTBUY</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Soluções em Máquinas</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
             <div className="flex items-center bg-slate-950/50 rounded-2xl p-1 px-4 space-x-4 border border-slate-800 shadow-inner group">
                {syncStatus === 'loading' ? (
                  <div className="flex items-center space-x-2 text-blue-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Carregando Nuvem...</span>
                  </div>
                ) : syncStatus === 'pending' ? (
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Timer className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Aguardando Sinc. (1.5s)</span>
                  </div>
                ) : syncStatus === 'saving' ? (
                  <div className="flex items-center space-x-2 text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Sincronizando...</span>
                  </div>
                ) : syncStatus === 'error' ? (
                  <div className="flex items-center space-x-2 text-rose-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Erro na Rede</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-tight">Cloud Ativa</span>
                    </div>
                    {lastSyncTime && (
                      <div className="hidden md:flex items-center space-x-1.5 text-slate-500 border-l border-slate-800 pl-3">
                        <History className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">Último: {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="w-px h-3 bg-slate-800" />
                <div className="flex items-center space-x-2 text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                   <ShieldCheck className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-tight">Safe Mode</span>
                </div>
             </div>
          </div>
        </div>
      </header>
      <main className="w-full px-6 md:px-10 pt-8 space-y-8 flex-1">
        <AnimatePresence mode="wait">
          {view === 'projects' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
              <div className="flex justify-center mb-4 print:hidden">
                <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-xl flex items-center space-x-2">
                   <button onClick={() => setHomeSubView('projects')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'projects' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                     <Briefcase className="w-4 h-4" />
                     <span>PAINEL DE COMPRAS</span>
                   </button>
                   <button onClick={() => setHomeSubView('receiving')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'receiving' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                     <Truck className="w-4 h-4" />
                     <span>Painel de Recebimento</span>
                   </button>
                </div>
              </div>

              {homeSubView === 'projects' ? (
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase">MEUS PROJETOS</h1>
                        <p className="text-slate-400 font-bold uppercase text-xs mt-1">Sincronização em tempo real com a nuvem</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button onClick={handleExportWithPassword} title="Exportar Backup" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-500 hover:bg-slate-800 transition-all shadow-sm"><CloudDownload className="w-5 h-5" /></button>
                      <button onClick={handleImportClickWithPassword} title="Importar Backup" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-500 hover:bg-slate-800 transition-all shadow-sm"><CloudUpload className="w-5 h-5" /></button>

                      <button onClick={() => setView('upload')} className="flex items-center space-x-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 uppercase text-xs">
                        <Plus className="w-5 h-5" />
                        <span>NOVO PROJETO</span>
                      </button>

                      <button 
                        onClick={() => handleGlobalStatusFilter('NAO_COMPRADO')}
                        className="flex items-center gap-3 px-6 py-4 bg-orange-500 text-white rounded-2xl border border-orange-400 shadow-2xl shadow-orange-500/30 group hover:bg-orange-400 transition-all uppercase text-xs font-black ring-2 ring-orange-500/20"
                      >
                        <Clock className="w-4 h-4 text-white" />
                        <span>ITENS PENDENTES ({globalMetrics.pendentes})</span>
                      </button>

                      <input type="file" id="import-json" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 print:hidden">
                    {sheets.map(sheet => {
                      const m = getProjectCardMetrics(sheet);
                      return (
                        <motion.div key={sheet.id} whileHover={{ y: -10 }} className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-xl cursor-pointer group flex flex-col h-full relative overflow-hidden" onClick={() => { setActiveProjectId(sheet.id); setView('dashboard'); }}>
                          <div className="flex justify-between items-start mb-8">
                            <div className="p-5 bg-emerald-950 text-emerald-500 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm"><FileSpreadsheet className="w-8 h-8" /></div>
                            <button onClick={(e) => handleDeleteProjectClick(e, sheet.id, sheet.nome)} className="p-2 text-slate-600 hover:text-rose-500 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
                          </div>
                          <h3 className="text-2xl font-black text-white mb-1 uppercase truncate tracking-tight">{sheet.nome}</h3>
                          <p className="text-[10px] text-slate-500 font-black mb-10 uppercase tracking-widest">CRIADO EM {sheet.data_upload}</p>
                          <div className="space-y-4 mt-auto">
                            <div>
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ShoppingCart className="w-3 h-3 text-emerald-500" /> EVOLUÇÃO DE PEDIDOS COLOCADOS</span>
                                <span className="text-[10px] font-black text-emerald-500">{m.placedOrdersProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${m.placedOrdersProgress}%` }} className="h-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Truck className="w-3 h-3 text-emerald-500" /> EVOLUÇÃO DE ENTREGAS</span>
                                <span className="text-[10px] font-black text-emerald-500">{m.deliveryProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${m.deliveryProgress}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-rose-500" /> ITENS EM ATRASO</span>
                                <span className="text-[10px] font-black text-rose-500">{m.delayed} UN ({m.delayedProgress}%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${m.delayedProgress}%` }} className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                             <span className="text-[10px] font-black text-slate-500 uppercase">Acessar Projeto</span>
                             <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase">PAINEL DE RECEBIMENTO</h1>
                    <div className="relative w-full md:w-[550px]">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input 
                        type="text" 
                        placeholder="PESQUISAR POR FORNECEDOR OU ORDEM (OC)..." 
                        value={logisticsGlobalSearch} 
                        onChange={(e) => setLogisticsGlobalSearch(e.target.value)} 
                        className="w-full pl-14 pr-6 py-5 bg-slate-900 border-2 border-slate-800 rounded-[2rem] text-sm uppercase font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-xl text-white placeholder-slate-600" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* IA LOGISTICS SIDEBAR COM CACHE PERSISTENTE */}
                    <div className="w-full lg:w-1/4 sticky top-28 print:hidden">
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col ring-1 ring-emerald-500/20">
                        <div className="p-6 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Logistics Advisor</h3>
                          </div>
                          {loadingReceivingAi ? (
                             <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                          ) : (
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                          )}
                        </div>
                        <div className="p-8">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                              <Bot className="w-7 h-7" />
                            </div>
                            <div>
                               <p className="text-[9px] font-bold text-slate-500 uppercase">Resumo Industrial</p>
                               <p className="text-xs font-black text-white uppercase">Status da Cadeia</p>
                               <p className="text-[10px] font-black text-emerald-400 mt-1 uppercase">TENHA UM ÓTIMO DIA LISIANE!</p>
                            </div>
                          </div>
                          
                          <div className="text-[12px] leading-relaxed text-slate-400 space-y-4 font-medium italic">
                            {receivingAiSummary.split('\n').map((line, idx) => (
                              <p key={idx} className={line.startsWith('#') || line.startsWith('**') ? 'text-emerald-400 not-italic font-black text-[10px] uppercase mt-4 mb-2' : ''}>
                                {line.replace(/[*#]/g, '')}
                              </p>
                            ))}
                          </div>

                          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-emerald-500/60">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase">Gemini 3 Pro</span>
                             </div>
                             {lastAiUpdateTime && (
                               <div className="text-[7px] font-black text-slate-600 uppercase flex items-center gap-1">
                                 <Clock className="w-2.5 h-2.5" />
                                 Ref: {new Date(lastAiUpdateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MAIN LOGISTICS CONTENT */}
                    <div className="flex-1 w-full space-y-8">
                      {logisticsGlobalSearch ? (
                        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden animate-fade-in">
                           <div className="p-6 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between print:hidden">
                              <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Search className="w-4 h-4" /> Resultados da Pesquisa para: <span className="text-emerald-500">"{logisticsGlobalSearch.toUpperCase()}"</span>
                              </h2>
                              <span className="text-[10px] font-black bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full uppercase">{logisticsData.searchResults.length} Itens encontrados</span>
                           </div>
                           <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1100px]">
                              <thead>
                                <tr className="bg-slate-800 border-b border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <th className="px-8 py-4">Projeto</th>
                                  <th className="px-8 py-4 w-40">Ordem (OC)</th>
                                  <th className="px-8 py-4">Descrição e Código</th>
                                  <th className="px-8 py-4 text-center">Qtd</th>
                                  <th className="px-8 py-4 text-center">Previsão</th>
                                  <th className="px-8 py-4">Nota Fiscal (NF)</th>
                                  <th className="px-8 py-4">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {logisticsData.searchResults.map(item => {
                                  const isAtrasado = item.expectedArrival && item.expectedArrival < today && item.status !== 'ENTREGUE';
                                  return (
                                    <tr key={item.id} className={`hover:bg-slate-800/50 transition-colors ${item.status === 'ENTREGUE' ? 'bg-emerald-950/20' : ''}`}>
                                      <td className="px-8 py-4"><span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg">{(item as any).projectName}</span></td>
                                      <td className="px-8 py-4">
                                        <input type="text" value={item.orderNumber || ''} readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black uppercase outline-none text-slate-400" />
                                      </td>
                                      <td className="px-8 py-4">
                                         <p className="font-black text-xs uppercase text-white">{item.description}</p>
                                         <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] font-mono font-bold text-slate-500">{item.partNumber}</span>
                                            <span className="text-[11px] font-bold text-emerald-500 uppercase">| {item.supplier || 'S/ FORNECEDOR'}</span>
                                         </div>
                                      </td>
                                      <td className="px-8 py-4 text-center font-black text-slate-300 text-xs">{item.quantity}</td>
                                      <td className="px-8 py-4 text-center">
                                         <DateInput value={item.expectedArrival || ''} readOnly className={`px-3 py-2 border rounded-lg text-xs font-black outline-none ${isAtrasado ? 'border-rose-900 bg-rose-950/30 text-rose-500' : 'border-slate-800 bg-slate-950 text-slate-400'}`} />
                                      </td>
                                      <td className="px-8 py-4">
                                        <div className="relative group">
                                          <input type="text" placeholder="Nº DA NOTA..." value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} className="w-full px-4 py-2 bg-slate-950 border-2 border-slate-800 rounded-xl text-xs font-black uppercase focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm text-white" />
                                          {item.invoiceNumber && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                                        </div>
                                      </td>
                                      <td className="px-8 py-4">
                                         {item.status === 'ENTREGUE' ? (
                                            <span className="px-4 py-1.5 bg-emerald-950 text-emerald-400 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-emerald-900/50">
                                              <CheckCircle2 className="w-3.5 h-3.5" /> RECEBIDO
                                            </span>
                                         ) : (
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border ${isAtrasado ? 'bg-rose-950 text-rose-500 border-rose-900/50' : 'bg-emerald-950 text-emerald-400 border-emerald-900/50'}`}>
                                              {isAtrasado ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {isAtrasado ? 'ATRASADO' : 'A RECEBER'}
                                            </span>
                                         )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                           </div>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-fade-in">
                          {logisticsData.projectsWithData.map((project) => {
                            const currentFilter = logisticsFilters[project.id] || 'ALL';
                            return (
                              <div key={project.id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden transition-all">
                                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-800/30 print:hidden">
                                   <div className="flex items-center gap-6">
                                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-sm"><Building2 className="w-6 h-6 text-emerald-500" /></div>
                                      <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{project.nome}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                          <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {project.metrics.delivered} Recebidos</span>
                                          <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5" /> {project.metrics.toReceive} A Receber</span>
                                          <span className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {project.metrics.atrasados} Atrasados</span>
                                        </div>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-sm">
                                         <button onClick={() => setProjectFilter(project.id, 'RECEBIDO')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentFilter === 'RECEBIDO' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-500'}`}>Recebidos</button>
                                         <button onClick={() => setProjectFilter(project.id, 'A_RECEBER')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentFilter === 'A_RECEBER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-500'}`}>A Receber</button>
                                         <button onClick={() => setProjectFilter(project.id, 'ATRASADO')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentFilter === 'ATRASADO' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-rose-500'}`}>Atrasados</button>
                                         <div className="w-px h-4 bg-slate-800 mx-2" />
                                         <button onClick={() => setProjectFilter(project.id, 'ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentFilter === 'ALL' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Limpar</button>
                                      </div>
                                      <button onClick={() => toggleProject(project.id)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">{expandedProjects.has(project.id) ? <><Minimize2 className="w-4 h-4" /> Recolher</> : <><Maximize2 className="w-4 h-4" /> AMPLIAR</>}</button>
                                   </div>
                                </div>
                                {expandedProjects.has(project.id) && (
                                  <div className="border-t border-slate-800 p-0 animate-fade-in">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse min-w-[1100px]">
                                        <thead>
                                          <tr className="bg-slate-950/50 border-b border-slate-800">
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40">Ordem (OC)</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição e Código</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Qtd</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Previsão</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nota Fiscal (NF)</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                          {project.procuredItems.map(item => {
                                            const isAtrasado = item.expectedArrival && item.expectedArrival < today && item.status !== 'ENTREGUE';
                                            return (
                                              <tr key={item.id} className={`hover:bg-slate-800/30 transition-colors ${item.status === 'ENTREGUE' ? 'bg-emerald-950/10' : ''}`}>
                                                <td className="px-8 py-4"><input type="text" placeholder="Nº OC" value={item.orderNumber || ''} readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black uppercase outline-none text-slate-500" /></td>
                                                <td className="px-8 py-4"><p className="font-black text-xs uppercase text-white">{item.description}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] font-mono font-bold text-slate-600">{item.partNumber}</span><span className="text-[11px] font-bold text-emerald-500 uppercase">| {item.supplier || 'S/ FORNECEDOR'}</span></div></td>
                                                <td className="px-8 py-4 text-center font-black text-slate-400 text-xs">{item.quantity}</td>
                                                <td className="px-8 py-4 text-center"><DateInput value={item.expectedArrival || ''} readOnly className={`px-3 py-2 border rounded-lg text-xs font-black outline-none ${isAtrasado ? 'border-rose-900 bg-rose-950/30 text-rose-500' : 'border-slate-800 bg-slate-950 text-slate-500'}`} /></td>
                                                <td className="px-8 py-4"><div className="relative group"><input type="text" placeholder="Nº DA NOTA..." value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} className="w-full px-4 py-2 bg-slate-950 border-2 border-slate-800 rounded-xl text-xs font-black uppercase focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm text-white" />{item.invoiceNumber && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}</div></td>
                                                <td className="px-8 py-4">{item.status === 'ENTREGUE' ? (<span className="px-4 py-1.5 bg-emerald-950 text-emerald-400 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-emerald-900/50"><CheckCircle2 className="w-3.5 h-3.5" /> RECEBIDO</span>) : (<span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border ${isAtrasado ? 'bg-rose-950 text-rose-500 border-rose-900/50' : 'bg-emerald-950 text-emerald-400 border-emerald-900/50'}`}>{isAtrasado ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {isAtrasado ? 'ATRASADO' : 'A RECEBER'}</span>)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center space-x-5">
                  <button onClick={() => setView('projects')} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight">{activeProjectName}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('report')} className="flex items-center space-x-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 uppercase text-xs tracking-wider">
                    <Target className="w-5 h-5" />
                    <span>RELATÓRIO DE PROJETO</span>
                  </button>
                </div>
              </div>
              <div className="print:hidden">
                <DashboardStats items={projectItems} onStatusFilter={handleStatusFilter} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:hidden">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  if (key === 'All') return null;
                  const stats = tabStats[key] || { rows: 0, totalQty: 0, missingToBuy: 0, isCompleted: true, purchasedProgress: 100 };
                  const cardBg = stats.isCompleted ? 'bg-emerald-600 border-emerald-700' : 'bg-orange-600 border-orange-700';
                  return (
                    <motion.button key={key} whileHover={{ scale: 1.02 }} onClick={() => handleCategoryClick(key)} className={`p-8 rounded-[2.5rem] border-2 transition-all text-left flex items-center space-x-6 relative overflow-hidden shadow-lg ${cardBg} ${activeSheet === key ? 'ring-4 ring-emerald-500/20' : ''}`}>
                      {stats.isCompleted && (<div className="absolute top-0 right-0 p-3 bg-white/20 text-white rounded-bl-3xl shadow-sm backdrop-blur-sm"><CheckCircle2 className="w-5 h-5" /></div>)}
                      <div className={`p-5 rounded-2xl shrink-0 bg-white/20 text-white`}><config.icon className="w-7 h-7" /></div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[12px] font-black uppercase leading-tight truncate text-white">{config.label}</div>
                         <div className="text-[10px] font-black mt-2 uppercase flex items-center justify-between text-white">
                            <span>{stats.rows} {key === 'FABRICADOS' ? 'CONJUNTOS' : 'LINHAS'}</span>
                            <span className="opacity-90 text-[8px]">{stats.totalQty} UN</span>
                         </div>
                         <div className="mt-3">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-[8px] font-black uppercase text-white/90">EVOLUÇÃO {key === 'FABRICADOS' ? 'PROCESSO' : 'COMPRAS'}</span>
                             <span className="text-[9px] font-black text-white">{stats.purchasedProgress}%</span>
                           </div>
                           <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/20"><motion.div initial={{ width: 0 }} animate={{ width: `${stats.purchasedProgress}%` }} className="h-full bg-white" /></div>
                         </div>
                      </div>
                    </motion.button>
                  );
                })}
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => handleCategoryClick('All')} className="p-8 rounded-[2.5rem] bg-slate-900 text-white border border-slate-800 shadow-xl hover:bg-slate-800 transition-all text-left flex items-center space-x-6">
                  <div className="p-5 rounded-2xl shrink-0 bg-white/20 text-white"><Layers className="w-7 h-7" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-black uppercase leading-tight">VISÃO GERAL</div>
                    <div className="text-[10px] font-black text-emerald-50 mt-2 uppercase">{tabStats['All']?.rows} LINHAS</div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : view === 'report' ? (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-0">
               <div className="flex items-center gap-4 mb-8 print:hidden">
                  <button onClick={() => setView('dashboard')} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">RELATÓRIO DO PROJETO</h2>
                  <button onClick={handlePrint} className="ml-auto flex items-center gap-2 px-6 py-3 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all shadow-lg"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
               </div>
               <ProjectReportView items={projectItems} projectName={activeProjectName} />
            </motion.div>
          ) : view === 'items' ? (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 pb-24">
              <div className="flex flex-col gap-6 print:hidden">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center space-x-4"><button onClick={exitItemsView} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-2xl font-black text-white uppercase tracking-tight">{activeSheet === 'All' ? activeProjectName : CATEGORY_CONFIG[activeSheet]?.label}</h2></div>
                  <div className="flex items-center gap-3"><button onClick={exportCurrentSituation} className="flex items-center space-x-3 px-6 py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/40 uppercase text-xs"><ClipboardList className="w-4 h-4 text-emerald-600" /><span>SITUAÇÃO ATUAL</span></button></div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm flex-1 w-full"><Search className="w-4 h-4 text-slate-500 ml-4" /><input type="text" placeholder="BUSCAR ITEM..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-[11px] uppercase font-bold outline-none px-4 py-2 text-white" /></div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-sm">
                    <button onClick={() => handleStatusFilter('ALL')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'ALL' ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-slate-800'}`}>TUDO</button>
                    <div className="w-px h-4 bg-slate-800 mx-1" /><button onClick={() => handleStatusFilter('PENDENTE')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'PENDENTE' || itemFilterStatus === 'NAO_COMPRADO' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-amber-900/30 hover:text-amber-500'}`}>PENDENTE</button><button onClick={() => handleStatusFilter('COMPRADO')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'COMPRADO' ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:bg-indigo-900/30 hover:text-indigo-500'}`}>COMPRADO</button><button onClick={() => handleStatusFilter('ENTREGUE')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'ENTREGUE' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:bg-emerald-900/30 hover:text-emerald-500'}`}>ENTREGUE</button>
                  </div>
                </div>
              </div>
              
              {activeSheet === 'FABRICADOS' && activeProjectId ? (
                <ManufacturingLineView items={projectItems} updateStatus={updateItemStatus} today={today} />
              ) : (
                <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                          <th className="px-6 py-5 w-16 text-center print:hidden"><button onClick={toggleSelectAll} className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${selectedIds.size > 0 && selectedIds.size === filteredItems.length ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (<Check className="w-4 h-4" />) : (<Square className="w-4 h-4" />)}</button></th>
                          {!activeProjectId && <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PROJETO</th>}
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('partNumber')}>CÓDIGO</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('description')}>DESCRIÇÃO</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('quantity')}>QTD</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('supplier')}>FORNECEDOR</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('orderNumber')}>ORDEM</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('expectedArrival')}>PREVISÃO</th>
                          <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>STATUS</th>
                          <th className="px-6 py-5 text-center print:hidden">BAIXA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredItems.map(item => { 
                          const projectOfItem = sheets.find(s => s.items.some(it => it.id === item.id));
                          const statusColors = { 
                            'PENDENTE': 'bg-orange-600/15 border-l-[12px] border-orange-500', 
                            'COMPRADO': 'bg-indigo-600/15 border-l-[12px] border-indigo-500', 
                            'ENTREGUE': 'bg-emerald-900/10 border-l-[12px] border-emerald-700 opacity-60 grayscale-[0.3]', 
                            'ATRASADO': 'bg-rose-600/15 border-l-[12px] border-rose-500' 
                          }; 
                          const displayStatus = (item.status === 'COMPRADO' && item.expectedArrival && item.expectedArrival < today) ? 'ATRASADO' : item.status; 
                          const isSelected = selectedIds.has(item.id); 
                          return (
                            <tr key={item.id} className={`hover:brightness-125 transition-all ${isSelected ? 'bg-emerald-900/30 ring-2 ring-inset ring-emerald-600' : (statusColors[displayStatus as keyof typeof statusColors] || statusColors[item.status])}`}>
                              <td className="px-6 py-5 text-center print:hidden"><button onClick={() => toggleItemSelection(item.id)} className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{isSelected ? (<Check className="w-4 h-4" />) : (<Square className="w-4 h-4" />)}</button></td>
                              {!activeProjectId && <td className="px-6 py-5"><span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg truncate max-w-[150px] inline-block border border-emerald-900/50">{projectOfItem?.nome || '-'}</span></td>}
                              <td className="px-6 py-5 text-[11px] font-mono font-black text-slate-300">{item.partNumber}</td>
                              <td className="px-6 py-5 font-black text-sm uppercase text-white">{item.description}</td>
                              <td className="px-6 py-5 text-center font-black text-white">{item.quantity}</td>
                              <td className="px-6 py-5"><input type="text" value={item.supplier || ''} onChange={(e) => updateItemOrderInfo(item.id, { supplier: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black uppercase text-white print:border-none" /></td>
                              <td className="px-6 py-5"><input type="text" value={item.orderNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { orderNumber: e.target.value })} className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black uppercase text-white print:border-none" /></td>
                              <td className="px-6 py-5"><DateInput value={item.expectedArrival || ''} onChange={(e) => updateItemOrderInfo(item.id, { expectedArrival: e.target.value })} className="px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-black text-white print:border-none" /></td>
                              <td className="px-6 py-5"><select value={item.status} onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)} className="w-full px-2 py-2 bg-transparent text-[10px] font-black uppercase outline-none text-white print:appearance-none"><option value="PENDENTE">🟡 PENDENTE</option><option value="COMPRADO">🟢 COMPRADO</option><option value="ENTREGUE">✅ ENTREGUE</option></select></td>
                              <td className="px-6 py-5 text-center print:hidden"><button onClick={() => updateItemStatus(item.id, item.status === 'ENTREGUE' ? 'COMPRADO' : 'ENTREGUE')} className={`p-3 rounded-2xl transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-emerald-600 hover:text-emerald-500'}`}><Check className="w-5 h-5" /></button></td>
                            </tr>
                          ); 
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* BARRA DE AÇÕES EM MASSA GLOBAL */}
              <AnimatePresence>
                {selectedIds.size > 0 && (
                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-6 px-10 py-5 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl text-white backdrop-blur-md max-w-[90vw] overflow-x-auto whitespace-nowrap scrollbar-hide print:hidden ring-1 ring-emerald-500/30">
                    <div className="flex items-center space-x-4 pr-6 border-r border-slate-700">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">{selectedIds.size}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest leading-none mb-1">Itens</p>
                        <p className="text-sm font-black uppercase tracking-tight leading-none">Selecionados</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 pr-6 border-r border-slate-700">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-emerald-100 uppercase mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Aplicar Data de Previsão</span>
                        <div className="flex items-center gap-2">
                          <input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)} className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-white transition-colors" />
                          <button onClick={applyMassDate} disabled={!massDate} className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${massDate ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Aplicar</button>
                        </div>
                      </div>
                    </div>

                    <button onClick={exportSelectionForQuotation} className="flex items-center space-x-3 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-black/10 uppercase text-[10px] tracking-widest">
                      <FileText className="w-4 h-4" />
                      <span>SOLICITAR COTAÇÃO</span>
                    </button>

                    <button onClick={() => setSelectedIds(new Set())} className="flex items-center space-x-3 px-6 py-3 bg-white/10 text-slate-300 rounded-xl font-black hover:bg-white/20 transition-all uppercase text-[10px] tracking-widest">
                      <Eraser className="w-4 h-4" />
                      <span>Limpar</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : view === 'upload' ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto py-16 print:hidden"><FileUpload onDataLoaded={handleDataLoaded} /></motion.div>
          ) : null}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO CUSTOMIZADO */}
        <AnimatePresence>
          {deleteConfirmProject && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 print:hidden">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setDeleteConfirmProject(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Trash2 className="w-24 h-24 text-rose-500" />
                </div>
                
                <div className="mb-8">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl w-fit mb-6">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">DESEJA EXCLUIR PROJETO?</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Você está prestes a remover o projeto <span className="text-white font-bold">"{deleteConfirmProject.name}"</span> e todos os seus itens da plataforma. Esta ação não pode ser desfeita.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleConfirmDeleteWithPassword}
                    className="flex-1 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/20"
                  >
                    Sim, Excluir
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmProject(null)}
                    className="flex-1 px-8 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-700 transition-all border border-slate-700"
                  >
                    Não, Voltar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <footer className="w-full px-6 md:px-10 py-6 border-t border-slate-800 bg-slate-950 mt-auto print:hidden text-center"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BORTO SMARTBUY &copy; 2026 - BY TORQUATO</p></footer>
    </div>
  );
};

const App = () => (<ProcurementProvider><MainContent /></ProcurementProvider>);
export default App;
