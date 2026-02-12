
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  bulkUpdateItems: (itemIds: Set<string>, info: any) => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  forceSync: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [syncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'offline'>('synced');
  const [lastSyncTime] = useState<Date | null>(new Date());
  
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
          
          // Se o fornecedor for preenchido e estava pendente, muda para EM ORCAMENTO
          if (info.hasOwnProperty('supplier') && info.supplier?.trim() !== '' && item.status === 'PENDENTE') {
            newStatus = 'EM ORCAMENTO';
          }

          if (info.hasOwnProperty('invoiceNumber')) {
            newStatus = (info.invoiceNumber && info.invoiceNumber.trim() !== '') 
              ? 'ENTREGUE' 
              : (item.orderNumber ? 'COMPRADO' : (item.supplier || info.supplier ? 'EM ORCAMENTO' : 'PENDENTE'));
          } else if (info.hasOwnProperty('orderNumber')) {
            if (item.status !== 'ENTREGUE') {
              newStatus = (info.orderNumber && info.orderNumber.trim() !== '') ? 'COMPRADO' : (item.supplier || info.supplier ? 'EM ORCAMENTO' : 'PENDENTE');
            }
          }
          return { ...item, ...info, status: newStatus };
        }
        return item;
      })
    })));
  }, []);

  const bulkUpdateItems = useCallback((itemIds: Set<string>, info: any) => {
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      items: sheet.items.map(item => 
        itemIds.has(item.id) ? { ...item, ...info } : item
      )
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
