
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, ProcurementItem, ItemStatus } from './types';

const WORKER_URL = 'https://smartbuy-api.lucas-cpd02.workers.dev';
const STORAGE_KEY = 'alltech_smartbuy_storage_v1';

interface ProcurementContextType {
  sheets: Sheet[];
  activeProjectId: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'offline';
  addSheet: (sheet: Sheet) => void;
  removeSheet: (id: string) => void;
  setActiveProjectId: (id: string | null) => void;
  getAllItems: () => ProcurementItem[];
  getActiveProjectItems: () => ProcurementItem[];
  updateItemStatus: (itemId: string, newStatus: ItemStatus) => void;
  updateItemOrderInfo: (itemId: string, info: any) => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  forceSync: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'offline'>('synced');
  
  const isSyncing = useRef(false);
  const hasPendingUpload = useRef(false);
  const lastSyncHash = useRef(JSON.stringify(sheets));
  const retryCount = useRef(0);

  // SALVAR NA NUVEM
  const saveToCloud = useCallback(async (data: Sheet[]) => {
    if (isSyncing.current) {
      hasPendingUpload.current = true;
      return;
    }
    
    const dataStr = JSON.stringify(data);
    if (dataStr === lastSyncHash.current && syncStatus === 'synced') return;

    setSyncStatus('saving');
    isSyncing.current = true;
    
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
      });

      if (response.ok) {
        setSyncStatus('synced');
        lastSyncHash.current = dataStr;
        retryCount.current = 0;
      } else {
        console.error(`Erro Servidor: ${response.status}`);
        setSyncStatus('error');
      }
    } catch (err) {
      console.error("Falha de conexão ao salvar:", err);
      setSyncStatus('offline');
    } finally {
      isSyncing.current = false;
      if (hasPendingUpload.current) {
        hasPendingUpload.current = false;
        saveToCloud(sheets);
      }
    }
  }, [sheets, syncStatus]);

  // BUSCAR DA NUVEM
  const fetchFromCloud = useCallback(async () => {
    // Se estiver salvando agora, não busca para não causar conflito
    if (isSyncing.current || syncStatus === 'saving') return;

    try {
      const response = await fetch(`${WORKER_URL}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (response.ok) {
        const cloudData = await response.json();
        const cloudStr = JSON.stringify(cloudData);

        // Se o que está na nuvem é diferente do que temos localmente
        if (cloudStr !== lastSyncHash.current && cloudStr !== "[]") {
          // Só atualiza se o local não tiver mudado nos últimos segundos
          setSheets(cloudData);
          localStorage.setItem(STORAGE_KEY, cloudStr);
          lastSyncHash.current = cloudStr;
        }
        setSyncStatus('synced');
      }
    } catch (err) {
      // Falha silenciosa no polling para não assustar o usuário
      if (syncStatus === 'synced') setSyncStatus('offline');
    }
  }, [syncStatus]);

  // Polling inteligente
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncStatus !== 'saving') fetchFromCloud();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchFromCloud, syncStatus]);

  // Auto-save debounced
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentHash = JSON.stringify(sheets);
      if (currentHash !== lastSyncHash.current) {
        localStorage.setItem(STORAGE_KEY, currentHash);
        saveToCloud(sheets);
      }
    }, 2000);
    return () => clearTimeout(handler);
  }, [sheets, saveToCloud]);

  const forceSync = () => {
    saveToCloud(sheets);
    fetchFromCloud();
  };

  const addSheet = useCallback((sheet: Sheet) => {
    setSheets(prev => [...prev, sheet]);
  }, []);

  const removeSheet = useCallback((id: string) => {
    setSheets(prev => prev.filter(s => s.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  }, [activeProjectId]);

  const getAllItems = useCallback(() => {
    return sheets.flatMap(s => s.items);
  }, [sheets]);

  const getActiveProjectItems = useCallback(() => {
    if (!activeProjectId) return [];
    const sheet = sheets.find(s => s.id === activeProjectId);
    return sheet ? sheet.items : [];
  }, [sheets, activeProjectId]);

  const updateItemStatus = useCallback((itemId: string, newStatus: ItemStatus) => {
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    })));
  }, []);

  const updateItemOrderInfo = useCallback((itemId: string, info: any) => {
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => {
        if (item.id === itemId) {
          let newStatus = item.status;
          if (info.hasOwnProperty('invoiceNumber')) {
            newStatus = (info.invoiceNumber && info.invoiceNumber.trim() !== '') ? 'ENTREGUE' : (item.orderNumber ? 'COMPRADO' : 'PENDENTE');
          } else if (info.hasOwnProperty('orderNumber')) {
            if (!item.invoiceNumber) {
              newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : 'PENDENTE';
            }
          }
          return { ...item, ...info, status: newStatus };
        }
        return item;
      })
    })));
  }, []);

  const clearAllData = useCallback(() => {
    if (window.confirm("Apagar TUDO?")) {
      setSheets([]);
      localStorage.removeItem(STORAGE_KEY);
      saveToCloud([]);
    }
  }, [saveToCloud]);

  const exportAllData = useCallback(() => {
    const dataStr = JSON.stringify(sheets);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_${new Date().getTime()}.smartbuy`;
    link.click();
  }, [sheets]);

  const importAllData = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setSheets(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <ProcurementContext.Provider value={{ 
      sheets, activeProjectId, syncStatus, addSheet, removeSheet, 
      setActiveProjectId, getAllItems, getActiveProjectItems,
      updateItemStatus, updateItemOrderInfo, clearAllData, exportAllData, importAllData, forceSync
    }}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error('useProcurement missing provider');
  return context;
};
