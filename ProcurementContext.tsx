
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
  
  // Controle de concorrência para evitar loops de rede
  const isNetworkActive = useRef(false);
  const lastCloudHash = useRef(JSON.stringify(sheets));

  const saveToCloud = useCallback(async (data: Sheet[]) => {
    if (isNetworkActive.current) return;
    
    const dataStr = JSON.stringify(data);
    // Se os dados não mudaram desde a última sincronização bem sucedida, ignora
    if (dataStr === lastCloudHash.current) {
        setSyncStatus('synced');
        return;
    }

    setSyncStatus('saving');
    isNetworkActive.current = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        lastCloudHash.current = dataStr;
        setSyncStatus('synced');
        console.debug("SmartBuy: Sincronização de saída OK");
      } else {
        console.error(`SmartBuy: Erro Worker (${response.status})`);
        setSyncStatus('error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error("SmartBuy: Timeout na sincronização");
      }
      setSyncStatus('offline');
    } finally {
      isNetworkActive.current = false;
    }
  }, []);

  const fetchFromCloud = useCallback(async () => {
    // Não busca se já estivermos enviando algo
    if (isNetworkActive.current) return;

    try {
      const response = await fetch(`${WORKER_URL}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (response.ok) {
        const cloudData = await response.json();
        const cloudStr = JSON.stringify(cloudData);

        // Só atualiza o estado local se o conteúdo da nuvem for realmente novo
        // e se não estivermos com uma mudança local pendente
        if (cloudStr !== lastCloudHash.current && cloudStr !== "[]") {
          setSheets(cloudData);
          localStorage.setItem(STORAGE_KEY, cloudStr);
          lastCloudHash.current = cloudStr;
          console.debug("SmartBuy: Sincronização de entrada OK");
        }
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn("SmartBuy: Falha ao verificar nuvem (offline?)");
    }
  }, []);

  // Loop de verificação (Polling) - Intervalo aumentado para 10s para evitar 429 (Too Many Requests)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFromCloud();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchFromCloud]);

  // Debounce para salvar alterações (Espera o usuário parar de digitar por 3 segundos)
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentDataStr = JSON.stringify(sheets);
      if (currentDataStr !== lastCloudHash.current) {
        localStorage.setItem(STORAGE_KEY, currentDataStr);
        saveToCloud(sheets);
      }
    }, 3000);
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

  const getAllItems = useCallback(() => sheets.flatMap(s => s.items), [sheets]);

  const getActiveProjectItems = useCallback(() => {
    if (!activeProjectId) return [];
    return sheets.find(s => s.id === activeProjectId)?.items || [];
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
          if (info.invoiceNumber !== undefined) {
             newStatus = (info.invoiceNumber && info.invoiceNumber.trim() !== '') ? 'ENTREGUE' : (item.orderNumber ? 'COMPRADO' : 'PENDENTE');
          } else if (info.orderNumber !== undefined) {
             if (item.status !== 'ENTREGUE') {
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
    if (window.confirm("Isso apagará todos os projetos da nuvem e local. Continuar?")) {
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
    link.download = `SMARTBUY_BACKUP_${new Date().toISOString().split('T')[0]}.smartbuy`;
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
