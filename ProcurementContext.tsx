
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, ProcurementItem, ItemStatus } from './types';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'alltech_smartbuy_local_storage_v1';
const SUPABASE_TABLE = 'app_data';

export type AccessLevel = 'TOTAL' | 'VIEW' | null;

interface ProcurementContextType {
  sheets: Sheet[];
  activeProjectId: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'loading' | 'offline' | 'pending';
  lastSyncTime: Date | null;
  accessLevel: AccessLevel;
  setAccessLevel: (level: AccessLevel) => void;
  addSheet: (sheet: Sheet) => void;
  removeSheet: (id: string) => void;
  setActiveProjectId: (id: string | null) => void;
  getAllItems: () => ProcurementItem[];
  getActiveProjectItems: () => ProcurementItem[];
  updateItemStatus: (itemId: string, newStatus: ItemStatus) => void;
  updateItemOrderInfo: (itemId: string, info: any) => void;
  bulkUpdateItems: (itemIds: Set<string>, info: any) => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  forceSync: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
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

  const saveToSupabase = useCallback(async (data: Sheet[]) => {
    if (!isInitialLoadComplete || !isDirtyRef.current) return;
    if (accessLevel !== 'TOTAL') return; // Segurança extra para não salvar nada se for VIEW

    setSyncStatus('saving');
    try {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ id: 1, payload: data, updated_at: new Date() }, { onConflict: 'id' });

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

        if (data && data.payload && Array.isArray(data.payload)) {
          setSheets(data.payload);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload));
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setSheets(JSON.parse(saved));
        }
        
        setIsInitialLoadComplete(true);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('Erro ao carregar do Supabase:', err);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setSheets(JSON.parse(saved));
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
            setSheets(payload.new.payload);
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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
    
    const timeoutId = setTimeout(() => {
      saveToSupabase(sheets);
    }, 1500); 
    
    return () => clearTimeout(timeoutId);
  }, [sheets, saveToSupabase, isInitialLoadComplete]);

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
    markAsDirty();
  }, [markAsDirty, checkAccess]);

  const clearAllData = useCallback(() => {
    if (!checkAccess()) return;
    const password = window.prompt("CUIDADO: Você está prestes a apagar TODOS os dados da plataforma. Digite a senha de segurança para continuar:");
    if (password === '372812') {
      if (window.confirm("Confirma a exclusão permanente de tudo?")) {
        setSheets([]);
        localStorage.removeItem(STORAGE_KEY);
        isDirtyRef.current = true;
        saveToSupabase([]);
      }
    } else if (password !== null) {
      alert("Senha incorreta. Ação abortada.");
    }
  }, [saveToSupabase, checkAccess]);

  const exportAllData = useCallback(() => {
    // Exportação permitida para VIEW também, para fins de backup
    const dataStr = JSON.stringify(sheets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `BACKUP_CLOUDBUY_${new Date().getTime()}.json`);
    linkElement.click();
  }, [sheets]);

  const importAllData = useCallback((jsonData: string) => {
    if (!checkAccess()) return false;
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setSheets(parsed);
        markAsDirty();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [markAsDirty, checkAccess]);

  const forceSync = useCallback(() => {
    if (!checkAccess()) return;
    markAsDirty();
    saveToSupabase(sheets);
  }, [sheets, saveToSupabase, markAsDirty, checkAccess]);

  return (
    <ProcurementContext.Provider value={{ 
      sheets, 
      activeProjectId, 
      syncStatus,
      lastSyncTime,
      accessLevel,
      setAccessLevel,
      addSheet, 
      removeSheet, 
      setActiveProjectId,
      getAllItems, 
      getActiveProjectItems,
      updateItemStatus, 
      updateItemOrderInfo,
      bulkUpdateItems,
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
