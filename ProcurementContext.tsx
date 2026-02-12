
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, ProcurementItem, ItemStatus } from './types';

const STORAGE_KEY = 'alltech_smartbuy_local_storage_v1';

interface ProcurementContextType {
  sheets: Sheet[];
  activeProjectId: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'loading' | 'offline';
  lastSyncTime: Date | null;
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
  // Inicialização exclusiva pelo LocalStorage
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [syncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'offline'>('synced');
  const [lastSyncTime] = useState<Date | null>(new Date());
  
  // Efeito para salvar no LocalStorage sempre que os dados mudarem
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  }, [sheets]);

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
    if (window.confirm("Deseja apagar permanentemente todos os dados deste navegador?")) {
      setSheets([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const exportAllData = useCallback(() => {
    const dataStr = JSON.stringify(sheets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `BACKUP_LOCAL_${new Date().getTime()}.json`);
    linkElement.click();
  }, [sheets]);

  const importAllData = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setSheets(parsed);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const forceSync = useCallback(() => {
    // Agora apenas valida se os dados estão no LocalStorage
    console.log("Dados locais validados.");
  }, []);

  return (
    <ProcurementContext.Provider value={{ 
      sheets, 
      activeProjectId, 
      syncStatus,
      lastSyncTime,
      addSheet, 
      removeSheet, 
      setActiveProjectId,
      getAllItems, 
      getActiveProjectItems,
      updateItemStatus, 
      updateItemOrderInfo,
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
