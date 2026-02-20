import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, ProcurementItem, ItemStatus, ManualRequest } from './types';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'alltech_smartbuy_local_storage_v1';
const SUPABASE_TABLE = 'app_data';

export type AccessLevel = 'TOTAL' | 'VIEW' | null;

interface ProcurementContextType {
  sheets: Sheet[];
  manualRequests: ManualRequest[];
  activeProjectId: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'loading' | 'offline' | 'pending';
  lastSyncTime: Date | null;
  accessLevel: AccessLevel;
  setAccessLevel: (level: AccessLevel) => void;
  addSheet: (sheet: Sheet) => void;
  removeSheet: (id: string) => void;
  renameSheet: (id: string, newName: string) => void;
  setActiveProjectId: (id: string | null) => void;
  getAllItems: () => ProcurementItem[];
  getActiveProjectItems: () => ProcurementItem[];
  updateItemStatus: (itemId: string, newStatus: ItemStatus) => void;
  updateItemOrderInfo: (itemId: string, info: any) => void;
  bulkUpdateItems: (itemIds: Set<string>, info: any) => void;
  addManualRequest: (req: ManualRequest) => void;
  removeManualRequest: (id: string) => void;
  updateManualRequestInfo: (id: string, info: any) => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  forceSync: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [manualRequests, setManualRequests] = useState<ManualRequest[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'offline' | 'pending'>('loading');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(null);
  
  const isDirtyRef = useRef(false);

  const checkAccess = useCallback(() => {
    if (accessLevel === 'VIEW') {
      alert("ACESSO NEGADO: Seu nível de acesso permite apenas VISUALIZAÇÃO.");
      return false;
    }
    if (accessLevel !== 'TOTAL') {
      alert("ACESSO NEGADO: Você precisa estar autenticado.");
      return false;
    }
    return true;
  }, [accessLevel]);

  const saveToSupabase = useCallback(async (data: Sheet[], manual: ManualRequest[]) => {
    if (!isInitialLoadComplete || !isDirtyRef.current) return;
    if (accessLevel !== 'TOTAL') return;

    setSyncStatus('saving');
    try {
      const payload = { sheets: data, manualRequests: manual };
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ id: 1, payload: payload, updated_at: new Date() }, { onConflict: 'id' });

      if (error) throw error;
      
      setSyncStatus('synced');
      isDirtyRef.current = false;
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar com Supabase:', err);
      setSyncStatus('error');
    }
  }, [isInitialLoadComplete, accessLevel]);

  useEffect(() => {
    const loadInitialData = async () => {
      setSyncStatus('loading');
      try {
        const { data, error } = await supabase
          .from(SUPABASE_TABLE)
          .select('payload')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.payload) {
          const payload = data.payload;
          if (Array.isArray(payload)) {
            setSheets(payload);
            setManualRequests([]);
          } else {
            setSheets(payload.sheets || []);
            setManualRequests(payload.manualRequests || []);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload));
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setSheets(parsed);
              setManualRequests([]);
            } else {
              setSheets(parsed.sheets || []);
              setManualRequests(parsed.manualRequests || []);
            }
          }
        }
        
        setIsInitialLoadComplete(true);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('Erro ao carregar do Supabase:', err);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSheets(parsed);
            setManualRequests([]);
          } else {
            setSheets(parsed.sheets || []);
            setManualRequests(parsed.manualRequests || []);
          }
        }
        setIsInitialLoadComplete(true);
        setSyncStatus('offline');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime_procurement')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: SUPABASE_TABLE, filter: 'id=eq.1' },
        (payload) => {
          if (!isDirtyRef.current && payload.new && payload.new.payload) {
            const newData = payload.new.payload;
            if (Array.isArray(newData)) {
              setSheets(newData);
              setManualRequests([]);
            } else {
              setSheets(newData.sheets || []);
              setManualRequests(newData.manualRequests || []);
            }
            setLastSyncTime(new Date());
            setSyncStatus('synced');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isInitialLoadComplete) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets, manualRequests }));
    
    const timeoutId = setTimeout(() => {
      saveToSupabase(sheets, manualRequests);
    }, 1500); 
    
    return () => clearTimeout(timeoutId);
  }, [sheets, manualRequests, saveToSupabase, isInitialLoadComplete]);

  const markAsDirty = useCallback(() => {
    if (accessLevel !== 'TOTAL') return;
    isDirtyRef.current = true;
    setSyncStatus('pending');
  }, [accessLevel]);

  const addSheet = useCallback((sheet: Sheet) => {
    if (!checkAccess()) return;
    setSheets(prev => [...prev, sheet]);
    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const removeSheet = useCallback((id: string) => {
    if (!checkAccess()) return;
    setSheets(prev => prev.filter(s => s.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
    markAsDirty();
  }, [activeProjectId, markAsDirty, checkAccess]);

  const renameSheet = useCallback((id: string, newName: string) => {
    if (!checkAccess()) return;
    const normalized = normalizeString(newName);
    if (!normalized) {
      alert("O nome do projeto não pode estar vazio.");
      return;
    }
    setSheets(prev => prev.map(s => s.id === id ? { ...s, nome: normalized } : s));
    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const getAllItems = useCallback(() => {
    return sheets.flatMap(s => s.items);
  }, [sheets]);

  const getActiveProjectItems = useCallback(() => {
    if (!activeProjectId) return [];
    const sheet = sheets.find(s => s.id === activeProjectId);
    return sheet ? sheet.items : [];
  }, [sheets, activeProjectId]);

  const updateItemStatus = useCallback((itemId: string, newStatus: ItemStatus) => {
    if (!checkAccess()) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Atualiza nos projetos
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: newStatus,
              actualArrivalDate: newStatus === 'ENTREGUE' ? (item.actualArrivalDate || today) : undefined 
            } 
          : item
      )
    })));
    
    // Sincroniza nas solicitações manuais
    setManualRequests(prev => prev.map(req => 
        req.id === itemId ? { ...req, status: newStatus, actualArrivalDate: newStatus === 'ENTREGUE' ? (req.actualArrivalDate || today) : undefined } : req
    ));

    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const updateItemOrderInfo = useCallback((itemId: string, info: any) => {
    if (!checkAccess()) return;
    const today = new Date().toISOString().split('T')[0];
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => {
        if (item.id === itemId) {
          let newStatus = item.status;
          let arrivalDate = item.actualArrivalDate;
          
          if (info.hasOwnProperty('invoiceNumber')) {
            const hasInvoice = info.invoiceNumber && info.invoiceNumber.trim() !== '';
            newStatus = hasInvoice ? 'ENTREGUE' : (item.orderNumber ? 'COMPRADO' : 'PENDENTE');
            if (hasInvoice && !arrivalDate) arrivalDate = today;
          } else if (info.hasOwnProperty('orderNumber')) {
            if (item.status !== 'ENTREGUE') {
              newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : 'PENDENTE';
            }
          }
          
          return { ...item, ...info, status: newStatus, actualArrivalDate: arrivalDate };
        }
        return item;
      })
    })));
    
    setManualRequests(prev => prev.map(req => {
        if (req.id === itemId) {
            let newStatus = req.status || 'PENDENTE';
            let arrivalDate = req.actualArrivalDate;

            if (info.hasOwnProperty('invoiceNumber')) {
              const hasInvoice = info.invoiceNumber && info.invoiceNumber.trim() !== '';
              newStatus = hasInvoice ? 'ENTREGUE' : (req.orderNumber ? 'COMPRADO' : 'PENDENTE');
              if (hasInvoice && !arrivalDate) arrivalDate = today;
            } else if (info.hasOwnProperty('orderNumber')) {
              if (req.status !== 'ENTREGUE') {
                newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : 'PENDENTE';
              }
            }
            return { ...req, ...info, status: newStatus, actualArrivalDate: arrivalDate };
        }
        return req;
    }));

    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const bulkUpdateItems = useCallback((itemIds: Set<string>, info: any) => {
    if (!checkAccess()) return;
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => 
        itemIds.has(item.id) ? { ...item, ...info } : item
      )
    })));
    
    setManualRequests(prev => prev.map(req => 
        itemIds.has(req.id) ? { ...req, ...info } : req
    ));

    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const addManualRequest = useCallback((req: ManualRequest) => {
    if (!checkAccess()) return;
    
    const normalizedProjectName = normalizeString(req.project);
    if (!normalizedProjectName) return;

    setSheets(prev => {
        let targetSheet = prev.find(s => normalizeString(s.nome) === normalizedProjectName);
        let updatedSheets = [...prev];

        if (!targetSheet) {
            targetSheet = {
                id: `PRJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                nome: normalizedProjectName,
                items: [],
                data_upload: new Date().toLocaleDateString('pt-BR')
            };
            updatedSheets.push(targetSheet);
        }

        const newItem: ProcurementItem = {
            id: req.id,
            sheetName: 'SOLICITAÇÃO FORA DE LISTA',
            assembly: '-',
            partNumber: req.code || '-',
            description: req.description,
            quantity: req.quantity,
            unit: 'UN',
            type: req.type,
            supplier: req.supplier || req.brand || '-',
            status: req.status || 'PENDENTE',
            orderNumber: req.orderNumber,
            expectedArrival: req.expectedArrival,
            invoiceNumber: req.invoiceNumber,
            actualArrivalDate: req.actualArrivalDate
        };

        return updatedSheets.map(s => 
            s.id === targetSheet?.id ? { ...s, items: [newItem, ...s.items] } : s
        );
    });

    setManualRequests(prev => [{ ...req, status: 'PENDENTE' }, ...prev]);
    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const removeManualRequest = useCallback((id: string) => {
    if (!checkAccess()) return;
    
    setSheets(prev => prev.map(sheet => ({
        ...sheet,
        items: sheet.items.filter(item => item.id !== id)
    })));

    setManualRequests(prev => prev.filter(r => r.id !== id));
    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const updateManualRequestInfo = useCallback((id: string, info: any) => {
    if (!checkAccess()) return;
    const today = new Date().toISOString().split('T')[0];
    
    setManualRequests(prev => prev.map(req => {
      if (req.id === id) {
        let newStatus = req.status || 'PENDENTE';
        let arrivalDate = req.actualArrivalDate;

        if (info.hasOwnProperty('invoiceNumber')) {
          const hasInvoice = info.invoiceNumber && info.invoiceNumber.trim() !== '';
          newStatus = hasInvoice ? 'ENTREGUE' : (req.orderNumber ? 'COMPRADO' : 'PENDENTE');
          if (hasInvoice && !arrivalDate) arrivalDate = today;
        } else if (info.hasOwnProperty('orderNumber')) {
          if (req.status !== 'ENTREGUE') {
            newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : 'PENDENTE';
          }
        } else if (info.hasOwnProperty('status')) {
          newStatus = info.status;
          if (newStatus === 'ENTREGUE' && !arrivalDate) arrivalDate = today;
        }
        
        return { ...req, ...info, status: newStatus, actualArrivalDate: arrivalDate };
      }
      return req;
    }));

    setSheets(prev => prev.map(sheet => ({
        ...sheet,
        items: sheet.items.map(item => {
            if (item.id === id) {
                let newStatus = item.status;
                let arrivalDate = item.actualArrivalDate;
                
                if (info.hasOwnProperty('invoiceNumber')) {
                    const hasInvoice = info.invoiceNumber && info.invoiceNumber.trim() !== '';
                    newStatus = hasInvoice ? 'ENTREGUE' : (item.orderNumber ? 'COMPRADO' : 'PENDENTE');
                    if (hasInvoice && !arrivalDate) arrivalDate = today;
                } else if (info.hasOwnProperty('orderNumber')) {
                    if (item.status !== 'ENTREGUE') {
                        newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : 'PENDENTE';
                    }
                } else if (info.hasOwnProperty('status')) {
                    newStatus = info.status;
                    if (newStatus === 'ENTREGUE' && !arrivalDate) arrivalDate = today;
                }

                return { ...item, ...info, status: newStatus, actualArrivalDate: arrivalDate };
            }
            return item;
        })
    })));

    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const clearAllData = useCallback(() => {
    if (!checkAccess()) return;
    const password = window.prompt("CUIDADO: Você está prestes a apagar TODOS os dados da plataforma. Digite a senha de segurança para continuar:");
    if (password === '372812') {
      if (window.confirm("Confirma a exclusão permanente de tudo?")) {
        setSheets([]);
        setManualRequests([]);
        localStorage.removeItem(STORAGE_KEY);
        isDirtyRef.current = true;
        saveToSupabase([], []);
      }
    } else if (password !== null) {
      alert("Senha incorreta. Ação abortada.");
    }
  }, [saveToSupabase, checkAccess]);

  const exportAllData = useCallback(() => {
    const dataStr = JSON.stringify({ sheets, manualRequests }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `BACKUP_CLOUDBUY_${new Date().getTime()}.json`);
    linkElement.click();
  }, [sheets, manualRequests]);

  const importAllData = useCallback((jsonData: string) => {
    if (!checkAccess()) return false;
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setSheets(parsed);
        setManualRequests([]);
      } else {
        setSheets(parsed.sheets || []);
        setManualRequests(parsed.manualRequests || []);
      }
      markAsDirty();
      return true;
    } catch (e) {
      return false;
    }
  }, [markAsDirty, checkAccess]);

  const forceSync = useCallback(() => {
    if (!checkAccess()) return;
    markAsDirty();
    saveToSupabase(sheets, manualRequests);
  }, [sheets, manualRequests, saveToSupabase, markAsDirty, checkAccess]);

  return (
    <ProcurementContext.Provider value={{ 
      sheets, 
      manualRequests,
      activeProjectId, 
      syncStatus,
      lastSyncTime,
      accessLevel,
      setAccessLevel,
      addSheet, 
      removeSheet, 
      renameSheet,
      setActiveProjectId,
      getAllItems, 
      getActiveProjectItems,
      updateItemStatus, 
      updateItemOrderInfo,
      bulkUpdateItems,
      addManualRequest,
      removeManualRequest,
      updateManualRequestInfo,
      clearAllData,
      exportAllData,
      importAllData,
      forceSync
    }}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error('useProcurement must be used within a ProcurementProvider');
  return context;
};