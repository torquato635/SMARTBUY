import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  FileSpreadsheet, 
  Search, 
  X,
  Briefcase,
  Plus,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  Truck,
  Layers,
  CloudDownload,
  CloudUpload,
  CheckSquare,
  Square,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Calendar,
  ShoppingCart,
  Printer,
  AlertOctagon,
  Building2,
  Clock,
  ArrowDownCircle,
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
  RefreshCw,
  Wifi,
  WifiOff,
  History,
  Timer,
  Users,
  Trash2,
  Lock,
  Key,
  LogOut,
  StickyNote,
  Send,
  Pencil,
  ClipboardX,
  Sun,
  Moon,
  CalendarCheck,
  Mail
} from 'lucide-react';
import { ProcurementProvider, useProcurement } from './ProcurementContext';
import LoginScreen from './components/LoginScreen';
import LogisticsTable from './components/LogisticsTable';
import DateInput from './components/DateInput';
import DashboardStats from './components/DashboardStats';
import ManualRequestModal from './components/ManualRequestModal';
import FileUpload from './components/FileUpload';
import { normalizeString } from './utils';
import ManufacturingLineView from './components/ManufacturingLineView';
import ProjectReportView from './components/ProjectReportView';
import AnalysesView from './components/AnalysesView';
import SpotlightSearch from './components/SpotlightSearch';
import ItemTimeline from './components/ItemTimeline';
import { CATEGORY_CONFIG, Sheet as SheetType, SheetData, ItemStatus, ProcurementItem, ManualRequest, ItemType } from './types';

type SortConfig = {
  key: keyof ProcurementItem | 'none';
  direction: 'asc' | 'desc';
};




const ProjectCardContent = ({
  sheet,
  metrics,
  isEditing,
  tempProjectName,
  setTempProjectName,
  handleSaveRename,
  setEditingProjectId,
  startEditingProjectName,
  handleDeleteProjectClick,
  setActiveProjectId,
  setView,
  style,
  attributes,
  listeners,
  setNodeRef,
  isDragging
}: any) => {
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-xl cursor-pointer group flex flex-col h-full relative overflow-hidden ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => { setActiveProjectId(sheet.id); setView('dashboard'); }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm"><FileSpreadsheet className="w-5 h-5" /></div>
        <button onClick={(e) => handleDeleteProjectClick(e, sheet.id, sheet.nome)} className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
      </div>
      
      {isEditing ? (
        <div className="mb-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            type="text"
            className="bg-[var(--bg-inner)] border border-emerald-500 text-[var(--text-primary)] text-lg font-black uppercase rounded-xl px-3 py-1 w-full outline-none"
            value={tempProjectName}
            onChange={(e) => setTempProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(sheet.id);
              if (e.key === 'Escape') setEditingProjectId(null);
            }}
          />
          <button onClick={() => handleSaveRename(sheet.id)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditingProjectId(null)} className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-inner)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between group/title mb-0.5">
          <h3 
            className="text-lg font-black text-[var(--text-primary)] uppercase truncate tracking-tight flex-1"
            onDoubleClick={(e) => { e.stopPropagation(); startEditingProjectName(sheet); }}
          >
            {sheet.nome}
          </h3>
          <button 
            onClick={(e) => { e.stopPropagation(); startEditingProjectName(sheet); }}
            className="opacity-0 group-hover/title:opacity-100 p-2 text-[var(--text-secondary)] hover:text-emerald-500 transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-[9px] text-[var(--text-secondary)] font-black mb-4 uppercase tracking-widest">CRIADO EM {sheet.data_upload}</p>
      <div className="space-y-2.5 mt-auto">
        <div>
          <div className="flex justify-between items-end mb-0.5">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1"><ShoppingCart className="w-2.5 h-2.5 text-emerald-500" /> EVOLUÇÃO DE PEDIDOS COLOCADOS</span>
            <span className="text-[9px] font-black text-emerald-500">{metrics.placedOrdersProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-inner)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.placedOrdersProgress}%` }} className="h-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-end mb-0.5">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1"><Truck className="w-2.5 h-2.5 text-emerald-500" /> EVOLUÇÃO DE ENTREGAS</span>
            <span className="text-[9px] font-black text-emerald-500">{metrics.deliveryProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-inner)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.deliveryProgress}%` }} className="h-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-end mb-0.5">
            <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> ITENS EM ATRASO</span>
            <span className="text-[9px] font-black text-rose-500">{metrics.delayed} UN ({metrics.delayedProgress}%)</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-inner)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.delayedProgress}%` }} className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
         <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Acessar Projeto</span>
         <ArrowRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

const SortableProjectCard = ({
  sheet,
  getProjectCardMetrics,
  editingProjectId,
  setEditingProjectId,
  tempProjectName,
  setTempProjectName,
  handleSaveRename,
  startEditingProjectName,
  handleDeleteProjectClick,
  setActiveProjectId,
  setView
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sheet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none'
  };

  const metrics = getProjectCardMetrics(sheet);
  const isEditing = editingProjectId === sheet.id;

  return (
    <ProjectCardContent
      sheet={sheet}
      metrics={metrics}
      isEditing={isEditing}
      tempProjectName={tempProjectName}
      setTempProjectName={setTempProjectName}
      handleSaveRename={handleSaveRename}
      setEditingProjectId={setEditingProjectId}
      startEditingProjectName={startEditingProjectName}
      handleDeleteProjectClick={handleDeleteProjectClick}
      setActiveProjectId={setActiveProjectId}
      setView={setView}
      style={style}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
    />
  );
};

const MainContent = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { 
    sheets, 
    manualRequests,
    activeProjectId, 
    setActiveProjectId, 
    getActiveProjectItems, 
    getAllItems,
    addSheet, 
    removeSheet, 
    renameSheet,
    updateItemStatus, 
    updateItemOrderInfo,
    bulkUpdateItems,
    addManualRequest,
    removeManualRequest,
    updateManualRequestInfo,
    exportAllData,
    importAllData,
    syncStatus,
    lastSyncTime,
    accessLevel,
    activeUsers,
    setAccessLevel,
    reorderSheets
  } = useProcurement();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sheets.findIndex((item) => item.id === active.id);
      const newIndex = sheets.findIndex((item) => item.id === over.id);
      reorderSheets(arrayMove(sheets, oldIndex, newIndex));
    }
    setActiveId(null);
  };
  
  const [activeSheet, setActiveSheet] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [logisticsGlobalSearch, setLogisticsGlobalSearch] = useState('');
  const [isTodayFilterActive, setIsTodayFilterActive] = useState(false);
  const [view, setView] = useState<'projects' | 'dashboard' | 'upload' | 'items' | 'projectReceiving' | 'report'>('projects');
  const [homeSubView, setHomeSubView] = useState<'projects' | 'receiving' | 'analyses'>('projects');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [logisticsFilters, setLogisticsFilters] = useState<Record<string, 'RECEBIDO' | 'A_RECEBER' | 'ATRASADO' | 'ALL'>>({});
  
  const [logisticsSnapshots, setLogisticsSnapshots] = useState<Record<string, { filter: string, ids: string[] }>>({});

  const [itemFilterStatus, setItemFilterStatus] = useState<ItemStatus | 'ALL' | 'NAO_COMPRADO' | 'ATRASADO'>('ALL');
  const [manualSidebarFilter, setManualSidebarFilter] = useState<'ALL' | 'PENDENTE' | 'COMPRADO' | 'ENTREGUE'>('ALL');
  const [visibleItemIds, setVisibleItemIds] = useState<Set<string> | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [massDate, setMassDate] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [selectedItemForTimeline, setSelectedItemForTimeline] = useState<ProcurementItem | null>(null);

  const [deleteConfirmProject, setDeleteConfirmProject] = useState<{id: string, name: string} | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{id: string, description: string} | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProjectName, setTempProjectName] = useState('');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('borto-theme') as 'dark' | 'light') || 'dark';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeProjectName = sheets.find(s => s.id === activeProjectId)?.nome || 'TODOS OS PROJETOS';
  const projectItems = getActiveProjectItems();
  const allGlobalItems = getAllItems();

  const filteredManualRequests = useMemo(() => {
    if (manualSidebarFilter === 'ALL') return manualRequests;
    return manualRequests.filter(req => req.status === manualSidebarFilter);
  }, [manualRequests, manualSidebarFilter]);
  
  // Captura data local (YYYY-MM-DD) para evitar erros de fuso horário do UTC
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    document.body.classList.remove('dark', 'light', 'theme-transition');
    document.body.classList.add(theme);
    const timer = setTimeout(() => document.body.classList.add('theme-transition'), 100);
    localStorage.setItem('borto-theme', theme);
    return () => clearTimeout(timer);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const startEditingProjectName = (sheet: SheetType) => {
    if (accessLevel === 'VIEW' || accessLevel === 'REQUESTER') return;
    setEditingProjectId(sheet.id);
    setTempProjectName(sheet.nome);
  };

  const handleSaveRename = (id: string) => {
    if (!tempProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }
    renameSheet(id, tempProjectName);
    setEditingProjectId(null);
  };

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

  const globalMetrics = useMemo(() => {
    const allItems = sheets.flatMap(s => s.items.filter(i => isItemInAnyCard(i)));
    return {
      pendentes: allItems.filter(i => i.status === 'PENDENTE').length,
      comprados: allItems.filter(i => i.status === 'COMPRADO').length,
      entregues: allItems.filter(i => i.status === 'ENTREGUE').length,
      atrasados: allItems.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length
    };
  }, [sheets, isItemInAnyCard, today]);

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

    const filterByToday = (items: any[]) => {
      if (!isTodayFilterActive) return items;
      return items.filter(i => i.expectedArrival === today);
    };

    // Lógica para busca e/ou filtro de hoje
    const baseItemsForSearch = allValidItems.filter(i => {
      if (!logisticsGlobalSearch) return true;
      const s = normalizeString(logisticsGlobalSearch);
      return (i.orderNumber && normalizeString(i.orderNumber).includes(s)) ||
             (i.supplier && normalizeString(i.supplier).includes(s)) ||
             normalizeString(i.description).includes(s);
    });

    const searchResults = (logisticsGlobalSearch || isTodayFilterActive) 
      ? filterByToday(baseItemsForSearch)
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
          if (currentFilter === 'ATRASADO') return i.status === 'COMPRADO' && isAtrasado;
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
        procuredItems: filterByToday(filteredItems),
        metrics
      };
    }).filter(p => p.procuredItems.length > 0 || (!isTodayFilterActive && Object.values(p.metrics).some(v => (v as number) > 0)));

    return { searchResults, projectsWithData };
  }, [sheets, logisticsGlobalSearch, logisticsFilters, logisticsSnapshots, isItemInAnyCard, today, isTodayFilterActive]);



  const setProjectFilter = (projectId: string, filter: 'RECEBIDO' | 'A_RECEBER' | 'ATRASADO' | 'ALL') => {
    const currentActiveFilter = logisticsFilters[projectId] || 'ALL';
    
    if (currentActiveFilter === filter && filter !== 'ALL') {
      setLogisticsFilters(prev => ({ ...prev, [projectId]: 'ALL' }));
      setExpandedProjects(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      setLogisticsSnapshots(prev => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      return;
    }

    setLogisticsFilters(prev => ({ ...prev, [projectId]: filter }));
    
    if (filter !== 'ALL') {
      setExpandedProjects(prev => {
        const next = new Set(prev);
        next.add(projectId);
        return next;
      });
    } else {
      setExpandedProjects(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
    
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
            if (filter === 'ATRASADO') return i.status === 'COMPRADO' && isAtrasado;
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
  }, [sheets, manualRequests, isItemInAnyCard, getItemCategory, today]);

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
    refreshVisibleItems(status, activeSheet, activeProjectId);
    setView('items');
  };

  const handleCategoryClick = (key: string) => {
    setActiveSheet(key);
    setItemFilterStatus('ALL');
    setSearch('');
    refreshVisibleItems('ALL', key, activeProjectId);
    setView('items');
    setSelectedIds(new Set());
    setSortConfig({ key: 'none', direction: 'asc' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSpotlightSelect = (item: ProcurementItem, sheetId: string) => {
    setActiveProjectId(sheetId);
    setHomeSubView('projects');
    setView('projects');
    setSearch(item.description);
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
        const totalQty = validItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        stats[key] = { rows: validItems.length, totalQty, missingToBuy: 0, isCompleted: false, purchasedProgress: 0 };
        return;
      }

      if (key === 'FABRICADOS') {
        let pairedRowsCount = 0;
        let totalSubProcesses = 0;
        let finishedSubProcesses = 0;
        let totalQtySum = 0;
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
            totalQtySum += u.quantity || 0;
            if (u.status === 'ENTREGUE') finishedSubProcesses++;
            if (laserMatch?.status === 'ENTREGUE') finishedSubProcesses++;
            if (comMatch?.status === 'ENTREGUE') finishedSubProcesses++;
          }
        });
        const progress = totalSubProcesses > 0 ? Math.round((finishedSubProcesses / totalSubProcesses) * 100) : 100;
        stats[key] = { rows: pairedRowsCount, totalQty: totalQtySum, missingToBuy: 0, isCompleted: progress === 100, purchasedProgress: progress };
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
  }, [projectItems, allGlobalItems, manualRequests, activeProjectId, activeProjectName, isItemInAnyCard, getItemCategory]);

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
  }, [projectItems, allGlobalItems, manualRequests, activeSheet, search, visibleItemIds, sortConfig, activeProjectId, activeProjectName, isItemInAnyCard, getItemCategory]);

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
    setSearch('');
    setSelectedIds(new Set());
    if (activeSheet === 'MANUAL' && !activeProjectId) {
        setView('projects');
        setActiveSheet('All');
        return;
    }
    setActiveSheet('All');
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
    if (activeSheet === 'MANUAL') {
        selectedIds.forEach(id => updateManualRequestInfo(id, { expectedArrival: massDate }));
    } else {
        bulkUpdateItems(selectedIds, { expectedArrival: massDate });
    }
    setMassDate('');
    setSelectedIds(new Set());
  };

  const handleExportWithPassword = () => {
    const password = window.prompt("Digite a senha de segurança para EXPORTAR o backup dos dados:");
    if (password === '372812' || password === '1234') {
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
      alert("Somente usuários com acesso TOTAL podem importar backups.");
    }
  };

  const exportSelectionForQuotation = () => {
    if (selectedIds.size === 0) return;
    
    let itemsToExport;
    if (activeSheet === 'MANUAL') {
        const relevantManualReqs = activeProjectId 
            ? manualRequests.filter(req => normalizeString(req.project) === normalizeString(activeProjectName))
            : manualRequests;

        itemsToExport = relevantManualReqs
            .filter(i => selectedIds.has(i.id))
            .map(i => ({
                'PROJETO': i.project,
                'CÓDIGO': i.code,
                'DESCRIÇÃO': i.description,
                'QUANTIDADE': i.quantity
            }));
    } else {
        itemsToExport = (activeProjectId ? projectItems : allGlobalItems)
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
    }

    const worksheet = (window as any).XLSX.utils.json_to_sheet(itemsToExport);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Cotacao");
    (window as any).XLSX.writeFile(workbook, `COTACAO_${activeSheet === 'MANUAL' ? 'SOLICITAÇÃO FORA DE LISTA' : activeProjectName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };

  const handleEmailQuotation = () => {
    if (selectedIds.size === 0) return;
    
    let itemsToExport;
    if (activeSheet === 'MANUAL') {
        const relevantManualReqs = activeProjectId 
            ? manualRequests.filter(req => normalizeString(req.project) === normalizeString(activeProjectName))
            : manualRequests;

        itemsToExport = relevantManualReqs
            .filter(i => selectedIds.has(i.id))
            .map(i => ({
                project: i.project,
                code: i.code,
                description: i.description,
                quantity: i.quantity
            }));
    } else {
        itemsToExport = (activeProjectId ? projectItems : allGlobalItems)
          .filter(i => selectedIds.has(i.id))
          .map(i => {
            const projectOfItem = sheets.find(s => s.items.some(it => it.id === i.id));
            return {
              project: projectOfItem?.nome || '-',
              code: i.partNumber,
              description: i.description,
              quantity: i.quantity
            };
          });
    }

    const subject = `Solicitação de Cotação - ${itemsToExport.length} Itens`;
    let body = "Solicito cotação para os seguintes itens:\n\n";
    body += "PROJETO | CÓDIGO | DESCRIÇÃO | QUANTIDADE\n";
    body += "--------------------------------------------------\n";
    
    itemsToExport.forEach(item => {
        body += `${item.project} | ${item.code} | ${item.description} | ${item.quantity}\n`;
    });
    
    body += "\n\nAtenciosamente,";

    // Generate and download Excel file
    const excelData = itemsToExport.map(i => ({
        'PROJETO': i.project,
        'CÓDIGO': i.code,
        'DESCRIÇÃO': i.description,
        'QUANTIDADE': i.quantity
    }));
    const worksheet = (window as any).XLSX.utils.json_to_sheet(excelData);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Cotacao");
    (window as any).XLSX.writeFile(workbook, `COTACAO_ANEXO_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);

    // Open mail client
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');

    // Notify user
    setTimeout(() => {
        alert("O arquivo Excel com os itens foi baixado automaticamente.\n\nPor favor, ANEXE-O manualmente ao e-mail que foi aberto.");
    }, 1000);
  };

  const exportCurrentSituation = () => {
    const itemsToExport = filteredItems.map(i => {
      const projectOfItem = sheets.find(s => s.items.some(it => it.id === i.id));
      return { 
        'PROJETO': activeSheet === 'MANUAL' ? i.sheetName : (projectOfItem?.nome || '-'),
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
    (window as any).XLSX.writeFile(workbook, `SITUACAO_ATUAL_${activeSheet}_${activeProjectName}.xlsx`);
  };

  const handleDeleteProjectClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (accessLevel === 'VIEW' || accessLevel === 'REQUESTER') {
      alert(`Acesso Negado: Seu nível de acesso (${accessLevel}) não permite excluir projetos.`);
      return;
    }
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

  const handleConfirmDeleteItem = () => {
    if (!deleteConfirmItem) return;
    removeManualRequest(deleteConfirmItem.id);
    setDeleteConfirmItem(null);
  };

  if (!accessLevel) {
    return <LoginScreen onLogin={setAccessLevel} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] pb-12 font-sans flex flex-col transition-colors duration-300">
      <SpotlightSearch 
        isOpen={isSpotlightOpen} 
        onClose={() => setIsSpotlightOpen(false)} 
        onSelectItem={handleSpotlightSelect}
      />

      <ItemTimeline 
        isOpen={!!selectedItemForTimeline}
        onClose={() => setSelectedItemForTimeline(null)}
        history={selectedItemForTimeline?.history || []}
        itemName={selectedItemForTimeline?.description || ''}
      />

      <header className="bg-[var(--bg-card)]/80 backdrop-blur-md border-b border-[var(--border-color)] sticky top-0 z-30 print:hidden shadow-sm">
        <div className="w-full px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="cursor-pointer" onClick={() => { setView('projects'); setActiveProjectId(null); setVisibleItemIds(null); }}>
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-none">
                BORTO <span className="text-emerald-500">SMARTBUY</span>
              </h1>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Soluções em Máquinas</p>
            </div>
            
            <button 
              onClick={() => setAccessLevel(null)} 
              className="p-1.5 bg-emerald-500/10 hover:bg-rose-500/20 text-emerald-500 hover:text-rose-500 rounded-lg transition-all border border-emerald-500/20 hover:border-rose-500/30 ml-2"
              title="Sair / Trocar Acesso"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6">
             <div className="flex items-center bg-[var(--bg-inner)] rounded-2xl p-1 px-3 md:px-4 space-x-3 md:space-x-4 border border-[var(--border-color)] shadow-inner group">
                <button 
                  onClick={toggleTheme}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-emerald-500 transition-all shadow-sm"
                  title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                {syncStatus === 'loading' ? (
                  <div className="flex items-center space-x-2 text-blue-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Carregando Nuvem...</span>
                  </div>
                ) : syncStatus === 'pending' ? (
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Timer className="w-3.5 h-3.5 animate-pulse" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Aguardando Sinc. (1.5s)</span>
                  </div>
                ) : syncStatus === 'saving' ? (
                  <div className="flex items-center space-x-2 text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Sincronizando...</span>
                  </div>
                ) : syncStatus === 'error' ? (
                  <div className="flex items-center space-x-2 text-rose-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Erro na Rede</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="hidden md:inline text-[9px] font-black uppercase tracking-tight">Cloud Ativa</span>
                    </div>
                    {lastSyncTime && (
                      <div className="hidden md:flex items-center space-x-1.5 text-[var(--text-secondary)] border-l border-[var(--border-color)] pl-3">
                        <History className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">Último: {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="w-px h-3 bg-[var(--border-color)]" />
                <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-2 text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-tight">
                        {accessLevel === 'TOTAL' ? 'ACESSO TOTAL' : accessLevel === 'REQUESTER' ? 'SOLICITANTE' : 'VIEWER MODE'}
                      </span>
                   </div>
                   <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500" title="Usuários ativos agora">
                      <Users className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black">{activeUsers}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </header>
      <main className="w-full px-6 md:px-10 pt-8 space-y-8 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'projects' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10 flex-1 flex flex-col">
              <div className="flex flex-col md:flex-row items-center justify-center mb-4 gap-4 print:hidden">
                <div className="bg-[var(--bg-card)] p-2 rounded-3xl border border-[var(--border-color)] shadow-xl flex items-center space-x-2">
                   <button onClick={() => setHomeSubView('projects')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'projects' ? 'bg-emerald-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inner)]'}`}>
                     <Briefcase className="w-4 h-4" />
                     <span>PAINEL DE COMPRAS</span>
                   </button>
                   <button onClick={() => setHomeSubView('receiving')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center space-x-3 ${homeSubView === 'receiving' ? 'bg-emerald-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inner)]'}`}>
                     <Truck className="w-4 h-4" />
                     <span>Painel de Recebimento</span>
                   </button>
                </div>
              </div>

              {homeSubView === 'projects' ? (
                <div className="flex flex-col gap-8 flex-1 min-h-0">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
                    <div className="flex flex-col gap-6">
                      <div>
                        <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight uppercase">MEUS PROJETOS</h1>
                      </div>
                        <button 
                          onClick={() => setIsRequestModalOpen(true)}
                          className="flex items-center space-x-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 uppercase text-[10px] tracking-widest w-fit"
                        >
                          <Send className="w-4 h-4 text-white" />
                          <span>SOLICITAÇÃO DE COMPRA</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {accessLevel !== 'REQUESTER' && (
                        <>
                          <button onClick={handleExportWithPassword} title="Exportar Backup" className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-emerald-500 hover:bg-[var(--bg-inner)] transition-all shadow-sm"><CloudDownload className="w-5 h-5" /></button>
                          <button onClick={handleImportClickWithPassword} title="Importar Backup" className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-emerald-500 hover:bg-[var(--bg-inner)] transition-all shadow-sm"><CloudUpload className="w-5 h-5" /></button>

                          <button onClick={() => setView('upload')} className="flex items-center space-x-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 uppercase text-xs">
                            <Plus className="w-5 h-5" />
                            <span>NOVO PROJETO</span>
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => handleGlobalStatusFilter('NAO_COMPRADO')}
                        className="flex items-center gap-3 px-6 py-4 bg-orange-500 text-white rounded-2xl border border-orange-400 shadow-2xl shadow-orange-500/30 group hover:bg-orange-400 transition-all uppercase text-xs font-black ring-2 ring-orange-500/20"
                      >
                        <Clock className="w-4 h-4 text-white" />
                        <span>ITENS PENDENTES ({globalMetrics.pendentes})</span>
                      </button>

                      <button 
                        onClick={() => handleGlobalStatusFilter('ATRASADO')}
                        className="flex items-center gap-3 px-6 py-4 bg-rose-500 text-white rounded-2xl border border-rose-400 shadow-2xl shadow-rose-500/30 group hover:bg-rose-400 transition-all uppercase text-xs font-black ring-2 ring-rose-500/20"
                      >
                        <AlertTriangle className="w-4 h-4 text-white" />
                        <span>ITENS ATRASADOS ({globalMetrics.atrasados})</span>
                      </button>

                      <button 
                        onClick={() => setHomeSubView('analyses')}
                        className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl border border-indigo-400 shadow-2xl shadow-indigo-500/30 group hover:bg-indigo-400 transition-all uppercase text-xs font-black ring-2 ring-indigo-500/20"
                      >
                        <BarChart3 className="w-4 h-4 text-white" />
                        <span>ANÁLISES</span>
                      </button>

                      <input type="file" id="import-json" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
                    </div>
                  </div>

                  <div className="flex gap-8 items-start">
                    <aside className="hidden lg:block w-80 shrink-0 print:hidden">
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-320px)] ring-1 ring-[var(--border-color)]/50">
                         <div className="p-6 bg-[var(--bg-inner)] border-b border-[var(--border-color)] flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <StickyNote className="w-5 h-5 text-emerald-500" />
                                 <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Solicitação Fora de Lista</h3>
                               </div>
                               <button 
                                 onClick={() => {
                                     setActiveSheet('MANUAL');
                                     setView('items');
                                     setActiveProjectId(null);
                                 }}
                                 className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                 title="Ver Página de Compras"
                               >
                                 <Maximize2 className="w-4 h-4" />
                               </button>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                               <button 
                                 onClick={() => setManualSidebarFilter('ALL')}
                                 className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border shrink-0 ${manualSidebarFilter === 'ALL' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-inner)]'}`}
                               >
                                 Todos
                               </button>
                               <button 
                                 onClick={() => setManualSidebarFilter('PENDENTE')}
                                 className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border shrink-0 ${manualSidebarFilter === 'PENDENTE' ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-inner)]'}`}
                               >
                                 Pendentes
                               </button>
                               <button 
                                 onClick={() => setManualSidebarFilter('COMPRADO')}
                                 className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border shrink-0 ${manualSidebarFilter === 'COMPRADO' ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-inner)]'}`}
                               >
                                 Comprado
                               </button>
                               <button 
                                 onClick={() => setManualSidebarFilter('ENTREGUE')}
                                 className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border shrink-0 ${manualSidebarFilter === 'ENTREGUE' ? 'bg-blue-500 text-white border-blue-400 shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-inner)]'}`}
                               >
                                 Entregue
                               </button>
                            </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1.5">
                            {filteredManualRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-50 space-y-4">
                                 <Package className="w-10 h-10" />
                                 <p className="text-[10px] font-black uppercase text-center">Nenhuma solicitação {manualSidebarFilter !== 'ALL' ? manualSidebarFilter.toLowerCase() : 'pendente'}</p>
                              </div>
                            ) : (
                              filteredManualRequests.map(req => (
                                <div key={req.id} className={`flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl hover:border-emerald-500/30 transition-all text-[9px] font-bold uppercase group relative ${req.status === 'COMPRADO' ? 'bg-emerald-500/10 border-emerald-500/20' : req.status === 'ENTREGUE' ? 'bg-emerald-500/5 opacity-60' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                  <span className="text-emerald-500 shrink-0">{req.project}</span>
                                  <span className="text-[var(--text-secondary)] shrink-0">|</span>
                                  <span className="text-[var(--text-primary)] truncate flex-1">{req.description}</span>
                                  <span className="text-[var(--text-secondary)] shrink-0">|</span>
                                  <span className="text-[var(--text-secondary)] shrink-0">{req.quantity} UN</span>
                                  {accessLevel !== 'REQUESTER' && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmItem({ id: req.id, description: req.description }); }}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] rounded-md"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                         </div>
                      </div>
                    </aside>

                    <div className="flex-1">
                      <DndContext 
                        sensors={sensors} 
                        collisionDetection={closestCenter} 
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={sheets.map(s => s.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 print:hidden pb-10">
                            {sheets.map(sheet => (
                              <SortableProjectCard
                                key={sheet.id}
                                sheet={sheet}
                                getProjectCardMetrics={getProjectCardMetrics}
                                editingProjectId={editingProjectId}
                                setEditingProjectId={setEditingProjectId}
                                tempProjectName={tempProjectName}
                                setTempProjectName={setTempProjectName}
                                handleSaveRename={handleSaveRename}
                                startEditingProjectName={startEditingProjectName}
                                handleDeleteProjectClick={handleDeleteProjectClick}
                                setActiveProjectId={setActiveProjectId}
                                setView={setView}
                              />
                            ))}
                          </div>
                        </SortableContext>
                        <DragOverlay>
                          {activeId ? (
                            <ProjectCardContent
                              sheet={sheets.find(s => s.id === activeId)}
                              metrics={getProjectCardMetrics(sheets.find(s => s.id === activeId)!)}
                              isEditing={false}
                              tempProjectName=""
                              setTempProjectName={() => {}}
                              handleSaveRename={() => {}}
                              setEditingProjectId={() => {}}
                              startEditingProjectName={() => {}}
                              handleDeleteProjectClick={() => {}}
                              setActiveProjectId={() => {}}
                              setView={() => {}}
                            />
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  </div>
                </div>
              ) : homeSubView === 'analyses' ? (
                <AnalysesView items={allGlobalItems} onUpdateItem={updateItemOrderInfo} />
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight uppercase">PAINEL DE RECEBIMENTO</h1>
                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 justify-end">
                      <div className="relative w-full md:w-[450px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                        <input 
                          type="text" 
                          placeholder="PESQUISAR POR FORNECEDOR OU ORDEM (OC)..." 
                          value={logisticsGlobalSearch} 
                          onChange={(e) => setLogisticsGlobalSearch(e.target.value)} 
                          className="w-full pl-14 pr-6 py-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[2rem] text-sm uppercase font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50" 
                        />
                      </div>
                      <button 
                        onClick={() => setIsTodayFilterActive(!isTodayFilterActive)}
                        className={`flex items-center space-x-3 px-8 py-5 rounded-[2rem] font-black transition-all shadow-xl uppercase text-xs border-2 ${isTodayFilterActive ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-emerald-500/50 hover:text-emerald-500'}`}
                      >
                        <CalendarCheck className="w-5 h-5" />
                        <span>ENTREGA HOJE</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* MAIN CONTENT AREA - TABLES */}
                    <div className="flex-1 w-full min-w-0 space-y-8 z-10">
                      {/* Se houver busca OU o filtro de HOJE estiver ativo, mostramos a tabela consolidada global */}
                      {(logisticsGlobalSearch || isTodayFilterActive) ? (
                        <LogisticsTable 
                          items={logisticsData.searchResults} 
                          today={today} 
                          updateItemOrderInfo={updateItemOrderInfo} 
                          isTodayFilterActive={isTodayFilterActive}
                          logisticsGlobalSearch={logisticsGlobalSearch}
                        />
                      ) : (
                        <div className="space-y-5 animate-fade-in">
                          {logisticsData.projectsWithData.map((project) => {
                            const currentFilter = logisticsFilters[project.id] || 'ALL';
                            return (
                              <div key={project.id} className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden transition-all">
                                <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[var(--bg-inner)]/50 print:hidden">
                                   <div className="flex items-center gap-5">
                                      <div className="p-3 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-2xl shadow-sm"><Building2 className="w-6 h-6 text-emerald-500" /></div>
                                      <div>
                                        <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{project.nome}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-1">
                                          <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {project.metrics.delivered} Recebidos</span>
                                          <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5" /> {project.metrics.toReceive} A Receber</span>
                                          <span className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {project.metrics.atrasados} Atrasados</span>
                                        </div>
                                      </div>
                                   </div>
                                   <div className="flex flex-wrap items-center gap-3">
                                      <div className="flex flex-wrap items-center bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-2xl p-1.5 shadow-sm">
                                         <button onClick={() => setProjectFilter(project.id, 'RECEBIDO')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${currentFilter === 'RECEBIDO' ? 'bg-emerald-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-emerald-500'}`}>Recebidos</button>
                                         <button onClick={() => setProjectFilter(project.id, 'A_RECEBER')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${currentFilter === 'A_RECEBER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-emerald-500'}`}>A Receber</button>
                                         <button onClick={() => setProjectFilter(project.id, 'ATRASADO')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${currentFilter === 'ATRASADO' ? 'bg-rose-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-rose-500'}`}>Atrasados</button>
                                         <div className="w-px h-4 bg-[var(--border-color)] mx-2 hidden sm:block" />
                                         <button onClick={() => setProjectFilter(project.id, 'ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${currentFilter === 'ALL' ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Limpar</button>
                                      </div>
                                      <button onClick={() => toggleProject(project.id)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap">{expandedProjects.has(project.id) ? <><Minimize2 className="w-4 h-4" /> Recolher</> : <><Maximize2 className="w-4 h-4" /> AMPLIAR</>}</button>
                                   </div>
                                </div>
                                {expandedProjects.has(project.id) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-[var(--border-color)] p-0 overflow-hidden">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse min-w-[1100px]">
                                        <thead>
                                          <tr className="bg-[var(--bg-inner)] border-b border-[var(--border-color)]">
                                            <th className="px-8 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest w-40">Ordem (OC)</th>
                                            <th className="px-8 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Descrição e Código</th>
                                            <th className="px-8 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest text-center">Qtd</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest text-center w-32">Previsão</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest w-44">Nota Fiscal (NF)</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest w-40">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-color)]">
                                          {project.procuredItems.map(item => {
                                            const isAtrasado = item.expectedArrival && item.expectedArrival < today && item.status !== 'ENTREGUE';
                                            return (
                                              <tr key={item.id} className={`hover:bg-[var(--bg-inner)] transition-colors ${item.status === 'ENTREGUE' ? 'bg-emerald-500/5' : ''}`}>
                                                <td className="px-8 py-2.5"><input type="text" placeholder="Nº OC" value={item.orderNumber || ''} readOnly className="w-full px-3 py-2 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-lg text-xs font-black uppercase outline-none text-[var(--text-secondary)]" /></td>
                                                <td className="px-8 py-2.5">
                                                   <div className="max-w-md">
                                                     <p className="font-black text-xs uppercase text-[var(--text-primary)] truncate">{item.description}</p>
                                                     <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                                        <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">{item.partNumber}</span>
                                                        <span className="text-[11px] font-bold text-emerald-500 uppercase">| {item.supplier || 'S/ FORNECEDOR'}</span>
                                                     </div>
                                                   </div>
                                                </td>
                                                <td className="px-8 py-2.5 text-center font-black text-[var(--text-secondary)] text-xs">{item.quantity}</td>
                                                <td className="px-4 py-2.5 text-center"><DateInput value={item.expectedArrival || ''} readOnly className={`px-3 py-2 border rounded-lg text-xs font-black outline-none ${isAtrasado ? 'border-rose-900 bg-rose-500/10 text-rose-500' : 'border-[var(--border-color)] bg-[var(--bg-inner)] text-[var(--text-secondary)]'}`} /></td>
                                                <td className="px-4 py-2.5"><div className="relative group"><input type="text" placeholder="Nº DA NOTA..." value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg-inner)] border-2 border-[var(--border-color)] rounded-xl text-xs font-black uppercase focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm text-[var(--text-primary)]" />{item.invoiceNumber && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}</div></td>
                                                <td className="px-4 py-2.5">{item.status === 'ENTREGUE' ? (<span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-emerald-500/20 whitespace-nowrap"><CheckCircle2 className="w-3.5 h-3.5" /> RECEBIDO</span>) : (<span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border whitespace-nowrap ${isAtrasado ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>{isAtrasado ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {isAtrasado ? 'ATRASADO' : 'A RECEBER'}</span>)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </motion.div>
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
                  <button onClick={() => setView('projects')} className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-inner)] transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                  <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight">{activeProjectName}</h1>
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
              </div>
            </motion.div>
          ) : view === 'report' ? (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-0">
               <div className="flex items-center gap-4 mb-8 print:hidden">
                  <button onClick={() => setView('dashboard')} className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-inner)] transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">RELATÓRIO DO PROJETO</h2>
                  <button onClick={handlePrint} className="ml-auto flex items-center gap-2 px-6 py-3 bg-[var(--bg-card)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-color)] text-[10px] font-black uppercase hover:bg-[var(--bg-inner)] transition-all shadow-lg"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
               </div>
               <ProjectReportView items={projectItems} projectName={activeProjectName} />
            </motion.div>
          ) : view === 'items' ? (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 pb-24">
              <div className="flex flex-col gap-6 print:hidden">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center space-x-4"><button onClick={exitItemsView} className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-inner)] transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{activeSheet === 'All' ? activeProjectName : (activeSheet === 'MANUAL' ? 'SOLICITAÇÃO FORA DE LISTA' : CATEGORY_CONFIG[activeSheet]?.label)}</h2></div>
                  <div className="flex items-center gap-3"><button onClick={exportCurrentSituation} className="flex items-center space-x-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/30 uppercase text-xs"><ClipboardList className="w-4 h-4 text-white" /><span>SITUAÇÃO ATUAL</span></button></div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center gap-3 bg-[var(--bg-card)] p-2 rounded-2xl border border-[var(--border-color)] shadow-sm flex-1 w-full"><Search className="w-4 h-4 text-[var(--text-secondary)] ml-4" /><input type="text" placeholder="BUSCAR ITEM..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-[11px] uppercase font-bold outline-none px-4 py-2 text-[var(--text-primary)]" /></div>
                  <div className="flex items-center gap-1.5 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <button onClick={() => handleStatusFilter('ALL')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'ALL' ? 'bg-emerald-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inner)]'}`}>TUDO</button>
                    <div className="w-px h-4 bg-[var(--border-color)] mx-1" /><button onClick={() => handleStatusFilter('PENDENTE')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'PENDENTE' || itemFilterStatus === 'NAO_COMPRADO' ? 'bg-amber-600 text-white' : 'text-[var(--text-secondary)] hover:bg-amber-500/10 hover:text-amber-500'}`}>PENDENTE</button><button onClick={() => handleStatusFilter('COMPRADO')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'COMPRADO' ? 'bg-indigo-700 text-white' : 'text-[var(--text-secondary)] hover:bg-indigo-500/10 hover:text-indigo-500'}`}>COMPRADO</button><button onClick={() => handleStatusFilter('ENTREGUE')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${itemFilterStatus === 'ENTREGUE' ? 'bg-emerald-700 text-white' : 'text-[var(--text-secondary)] hover:bg-emerald-500/10 hover:text-emerald-500'}`}>ENTREGUE</button>
                  </div>
                </div>
              </div>
              
              {activeSheet === 'FABRICADOS' && activeProjectId ? (
                <ManufacturingLineView items={projectItems} updateStatus={updateItemStatus} today={today} />
              ) : (
                <div className="bg-[var(--bg-card)] rounded-[2.5rem] overflow-hidden border border-[var(--border-color)] shadow-2xl relative">
                  <div className="overflow-x-auto">
                    {filteredItems.length === 0 && activeSheet === 'MANUAL' ? (
                        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                            <ClipboardX className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">Nenhuma solicitação fora de lista para este projeto.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                          <thead>
                            <tr className="bg-[var(--bg-inner)] border-b border-[var(--border-color)]">
                              <th className="px-6 py-5 w-16 text-center print:hidden"><button onClick={toggleSelectAll} className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${selectedIds.size > 0 && selectedIds.size === filteredItems.length ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (<Check className="w-4 h-4" />) : (<Square className="w-4 h-4" />)}</button></th>
                              {(!activeProjectId || activeSheet === 'MANUAL') && <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">PROJETO</th>}
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('partNumber')}>CÓDIGO</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('description')}>DESCRIÇÃO</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest text-center cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('quantity')}>QTD</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('supplier')}>FORNECEDOR</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('orderNumber')}>ORDEM</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('expectedArrival')}>PREVISÃO</th>
                              <th className="px-6 py-5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest cursor-pointer hover:bg-[var(--bg-inner)] transition-colors" onClick={() => handleSort('status')}>STATUS</th>
                              <th className="px-6 py-5 text-center print:hidden">{activeSheet === 'MANUAL' ? 'AÇÕES' : 'BAIXA'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {filteredItems.map(item => { 
                              const projectOfItem = sheets.find(s => s.items.some(it => it.id === item.id));
                              const statusColors = { 
                                'PENDENTE': 'bg-orange-500/10 border-l-[12px] border-orange-500', 
                                'COMPRADO': 'bg-emerald-500/10 border-l-[12px] border-emerald-500', 
                                'ENTREGUE': 'bg-emerald-500/5 border-l-[12px] border-emerald-600 opacity-70 grayscale-[0.2]', 
                                'ATRASADO': 'bg-rose-500/10 border-l-[12px] border-rose-500' 
                              }; 
                              const displayStatus = (item.status === 'COMPRADO' && item.expectedArrival && item.expectedArrival < today) ? 'ATRASADO' : item.status; 
                              const isSelected = selectedIds.has(item.id); 
                              
                              const handleUpdateStatus = (id: string, status: ItemStatus) => {
                                  if (activeSheet === 'MANUAL') updateManualRequestInfo(id, { status });
                                  else updateItemStatus(id, status);
                              };
                              
                              const handleUpdateInfo = (id: string, info: any) => {
                                  if (activeSheet === 'MANUAL') updateManualRequestInfo(id, info);
                                  else updateItemOrderInfo(id, info);
                              };
    
                              return (
                                <tr key={item.id} className={`hover:brightness-105 transition-all ${isSelected ? 'bg-emerald-500/10 ring-2 ring-inset ring-emerald-600' : (statusColors[displayStatus as keyof typeof statusColors] || statusColors[item.status])}`}>
                                  <td className="px-6 py-5 text-center print:hidden"><button onClick={() => toggleItemSelection(item.id)} className={`w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{isSelected ? (<Check className="w-4 h-4" />) : (<Square className="w-4 h-4" />)}</button></td>
                                  {(!activeProjectId || activeSheet === 'MANUAL') && <td className="px-6 py-5"><span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg truncate max-w-[150px] inline-block border border-emerald-500/20">{projectOfItem?.nome || '-'}</span></td>}
                                  <td className="px-6 py-5 text-[11px] font-mono font-black text-[var(--text-primary)] whitespace-nowrap">{item.partNumber}</td>
                                  <td className="px-6 py-5 font-black text-sm uppercase text-[var(--text-primary)] truncate max-w-xs">{item.description}</td>
                                  <td className="px-6 py-5 text-center font-black text-[var(--text-primary)]">{item.quantity}</td>
                                  <td className="px-6 py-5"><input type="text" value={item.supplier || ''} readOnly={accessLevel === 'REQUESTER'} onChange={(e) => handleUpdateInfo(item.id, { supplier: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-lg text-xs font-black uppercase text-[var(--text-primary)] print:border-none" /></td>
                                  <td className="px-6 py-5"><input type="text" value={item.orderNumber || ''} readOnly={accessLevel === 'REQUESTER'} onChange={(e) => handleUpdateInfo(item.id, { orderNumber: e.target.value })} className="w-24 px-3 py-2 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-lg text-xs font-black uppercase text-[var(--text-primary)] print:border-none" /></td>
                                  <td className="px-6 py-5"><DateInput value={item.expectedArrival || ''} readOnly={accessLevel === 'REQUESTER'} onChange={(e) => handleUpdateInfo(item.id, { expectedArrival: e.target.value })} className="px-2 py-2 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-lg text-xs font-black text-[var(--text-primary)] print:border-none" /></td>
                                  <td className="px-6 py-5"><select value={item.status} disabled={accessLevel === 'REQUESTER'} onChange={(e) => handleUpdateStatus(item.id, e.target.value as ItemStatus)} className="w-full px-2 py-2 bg-transparent text-[10px] font-black uppercase outline-none text-[var(--text-primary)] print:appearance-none"><option value="PENDENTE">🟡 PENDENTE</option><option value="COMPRADO">🟢 COMPRADO</option><option value="ENTREGUE">✅ ENTREGUE</option></select></td>
                                  <td className="px-6 py-5 text-center print:hidden">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setSelectedItemForTimeline(item)} className="p-3 bg-[var(--bg-inner)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-indigo-600 hover:text-indigo-500 transition-all rounded-2xl" title="Ver Histórico">
                                        <History className="w-5 h-5" />
                                      </button>
                                      {accessLevel !== 'REQUESTER' && (
                                        <>
                                          <button onClick={() => handleUpdateStatus(item.id, item.status === 'ENTREGUE' ? 'COMPRADO' : 'ENTREGUE')} className={`p-3 rounded-2xl transition-all ${item.status === 'ENTREGUE' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-[var(--bg-inner)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-emerald-600 hover:text-emerald-500'}`}><Check className="w-5 h-5" /></button>
                                          {activeSheet === 'MANUAL' && (
                                            <button onClick={() => setDeleteConfirmItem({ id: item.id, description: item.description })} className="p-3 bg-[var(--bg-inner)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-rose-600 hover:text-white transition-all rounded-2xl">
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ); 
                            })}
                          </tbody>
                        </table>
                    )}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {selectedIds.size > 0 && accessLevel !== 'REQUESTER' && (
                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-6 px-10 py-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl text-[var(--text-primary)] backdrop-blur-md max-w-[90vw] overflow-x-auto whitespace-nowrap scrollbar-hide print:hidden ring-1 ring-emerald-500/30">
                    <div className="flex items-center space-x-4 pr-6 border-r border-[var(--border-color)]">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">{selectedIds.size}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest leading-none mb-1">Itens</p>
                        <p className="text-sm font-black uppercase tracking-tight leading-none">Selecionados</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 pr-6 border-r border-[var(--border-color)]">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-emerald-500 uppercase mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Aplicar Data de Previsão</span>
                        <div className="flex items-center gap-2">
                          <input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)} className="bg-[var(--bg-inner)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-colors" />
                          <button onClick={applyMassDate} disabled={!massDate} className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${massDate ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-[var(--bg-inner)] text-[var(--text-secondary)] cursor-not-allowed'}`}>Aplicar</button>
                        </div>
                      </div>
                    </div>

                    <button onClick={exportSelectionForQuotation} className="flex items-center space-x-3 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-black/10 uppercase text-[10px] tracking-widest">
                      <FileText className="w-4 h-4" />
                      <span>SOLICITAR COTAÇÃO</span>
                    </button>

                    <button onClick={handleEmailQuotation} className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-black/10 uppercase" title="Enviar Cotação por E-mail">
                      <Mail className="w-4 h-4" />
                    </button>

                    <button onClick={() => setSelectedIds(new Set())} className="flex items-center space-x-3 px-6 py-3 bg-[var(--text-primary)]/10 text-[var(--text-secondary)] rounded-xl font-black hover:bg-[var(--text-primary)]/20 transition-all uppercase text-[10px] tracking-widest">
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

        {/* MODAL DE SOLICITAÇÃO DE COMPRA - COMPACTO */}
        <AnimatePresence>
          <ManualRequestModal 
            isOpen={isRequestModalOpen} 
            onClose={() => setIsRequestModalOpen(false)} 
            addManualRequest={addManualRequest}
          />
        </AnimatePresence>

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
                className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl max-w-sm w-full p-6 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Trash2 className="w-16 h-16 text-rose-500" />
                </div>
                
                <div className="mb-6">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl w-fit mb-4">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight mb-2 leading-tight">DESEJA EXCLUIR PROJETO?</h2>
                  <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
                    Remover <span className="text-[var(--text-primary)] font-bold">"{deleteConfirmProject.name}"</span> e seus itens? Esta ação é irreversível.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleConfirmDeleteWithPassword}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20"
                  >
                    Sim, Excluir
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmProject(null)}
                    className="flex-1 px-4 py-3 bg-[var(--bg-inner)] text-[var(--text-primary)] rounded-xl font-black uppercase text-[10px] hover:bg-[var(--bg-card)] transition-all border border-[var(--border-color)]"
                  >
                    Não, Voltar
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {deleteConfirmItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 print:hidden">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setDeleteConfirmItem(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl max-w-sm w-full p-6 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Trash2 className="w-16 h-16 text-rose-500" />
                </div>
                
                <div className="mb-6">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl w-fit mb-4">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight mb-2 leading-tight">DESEJA EXCLUIR ITEM?</h2>
                  <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
                    Remover <span className="text-[var(--text-primary)] font-bold">"{deleteConfirmItem.description}"</span>? Esta ação é irreversível.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleConfirmDeleteItem}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20"
                  >
                    Sim, Excluir
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmItem(null)}
                    className="flex-1 px-4 py-3 bg-[var(--bg-inner)] text-[var(--text-primary)] rounded-xl font-black uppercase text-[10px] hover:bg-[var(--bg-card)] transition-all border border-[var(--border-color)]"
                  >
                    Não, Voltar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <footer className="w-full px-6 md:px-10 py-6 border-t border-[var(--border-color)] bg-[var(--bg-main)] mt-auto print:hidden text-center"><p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">BORTO SMARTBUY &copy; 2026 - BY TORQUATO</p></footer>
    </div>
  );
};

const App = () => (<ProcurementProvider><MainContent /></ProcurementProvider>);
export default App;