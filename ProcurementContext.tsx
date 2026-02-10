import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, ProcurementItem, ItemStatus } from './types';

// CONFIGURAÇÃO GOOGLE
// IMPORTANTE: Substitua pelo seu ID real no Google Cloud Console
const CLIENT_ID = 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILENAME = 'smartbuy_alltech_data.json';

interface ProcurementContextType {
  sheets: Sheet[];
  activeProjectId: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'unauthorized';
  isGoogleAuthenticated: boolean;
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
  loginGoogle: () => void;
  logoutGoogle: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'unauthorized'>('unauthorized');
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  
  const tokenClient = useRef<any>(null);
  const driveFileId = useRef<string | null>(null);
  const lastCloudHash = useRef("");
  const isSyncing = useRef(false);

  // --- LÓGICA GOOGLE DRIVE ---

  const initGoogleDrive = useCallback(() => {
    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (!gapi || !google) return;

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        
        // Se já tiver um token válido no gapi, tenta autenticar
        const token = gapi.client.getToken();
        if (token) {
          setIsGoogleAuthenticated(true);
          setSyncStatus('synced');
          fetchFromDrive();
        }
      } catch (err) {
        console.error("Erro gapi.init:", err);
      }
    });

    tokenClient.current = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error !== undefined) {
          setSyncStatus('error');
          return;
        }
        setIsGoogleAuthenticated(true);
        setSyncStatus('synced');
        fetchFromDrive();
      },
    });
  }, []);

  useEffect(() => {
    initGoogleDrive();
  }, [initGoogleDrive]);

  const findOrCreateFile = async () => {
    const gapi = (window as any).gapi;
    const response = await gapi.client.drive.files.list({
      q: `name = '${DATA_FILENAME}' and trashed = false`,
      fields: 'files(id, name)',
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      driveFileId.current = files[0].id;
      return files[0].id;
    } else {
      const createResponse = await gapi.client.drive.files.create({
        resource: {
          name: DATA_FILENAME,
          mimeType: 'application/json',
        },
        fields: 'id',
      });
      driveFileId.current = createResponse.result.id;
      return createResponse.result.id;
    }
  };

  const saveToDrive = useCallback(async (data: Sheet[]) => {
    if (!isGoogleAuthenticated || isSyncing.current) return;
    
    const dataStr = JSON.stringify(data);
    if (dataStr === lastCloudHash.current) return;

    setSyncStatus('saving');
    isSyncing.current = true;

    try {
      const gapi = (window as any).gapi;
      const fileId = driveFileId.current || await findOrCreateFile();

      const metadata = { name: DATA_FILENAME, mimeType: 'application/json' };
      const boundary = 'smartbuy_upload_boundary';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        dataStr +
        close_delim;

      // Usando gapi.client.request para evitar erros de Fetch/CORS e usar o token atualizado
      await gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        method: 'PATCH',
        body: body,
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        }
      });

      lastCloudHash.current = dataStr;
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro ao salvar no Drive:", err);
      setSyncStatus('error');
      // Tenta renovar o token silenciosamente em caso de erro 401
      if ((err as any).status === 401) loginGoogle();
    } finally {
      isSyncing.current = false;
    }
  }, [isGoogleAuthenticated]);

  const fetchFromDrive = useCallback(async () => {
    if (!isGoogleAuthenticated || isSyncing.current) return;

    try {
      const gapi = (window as any).gapi;
      const fileId = driveFileId.current || await findOrCreateFile();

      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // O gapi.client já tenta fazer o parse do JSON automaticamente se o MIME for correto
      const cloudData = response.result;
      
      if (cloudData && Array.isArray(cloudData)) {
        const cloudStr = JSON.stringify(cloudData);
        if (cloudStr !== lastCloudHash.current) {
          setSheets(cloudData);
          lastCloudHash.current = cloudStr;
        }
      }
      setSyncStatus('synced');
    } catch (err) {
      console.warn("Drive vazio ou erro na leitura:", err);
    }
  }, [isGoogleAuthenticated]);

  useEffect(() => {
    if (!isGoogleAuthenticated) return;
    const interval = setInterval(fetchFromDrive, 10000);
    return () => clearInterval(interval);
  }, [isGoogleAuthenticated, fetchFromDrive]);

  useEffect(() => {
    const handler = setTimeout(() => {
      saveToDrive(sheets);
    }, 2000);
    return () => clearTimeout(handler);
  }, [sheets, saveToDrive]);

  const loginGoogle = () => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken({ prompt: 'consent' });
    }
  };

  const logoutGoogle = () => {
    const gapi = (window as any).gapi;
    if (gapi.client) gapi.client.setToken(null);
    setIsGoogleAuthenticated(false);
    setSyncStatus('unauthorized');
    setSheets([]);
  };

  // --- MÉTODOS DE DADOS ---

  const addSheet = useCallback((sheet: Sheet) => {
    setSheets(prev => [...prev, sheet]);
  }, []);

  const removeSheet = useCallback((id: string) => {
    setSheets(prev => prev.filter(s => s.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  }, [activeProjectId]);

  const getAllItems = useCallback(() => {
    return Array.isArray(sheets) ? sheets.flatMap(s => s.items) : [];
  }, [sheets]);

  const getActiveProjectItems = useCallback(() => {
    if (!activeProjectId || !Array.isArray(sheets)) return [];
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
    if (window.confirm("Isso apagará seus dados no Google Drive. Continuar?")) {
      setSheets([]);
      saveToDrive([]);
    }
  }, [saveToDrive]);

  const exportAllData = useCallback(() => {
    const dataStr = JSON.stringify(sheets);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SMARTBUY_DRIVE_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
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
      sheets, activeProjectId, syncStatus, isGoogleAuthenticated,
      addSheet, removeSheet, setActiveProjectId, getAllItems, getActiveProjectItems,
      updateItemStatus, updateItemOrderInfo, clearAllData, exportAllData, importAllData,
      loginGoogle, logoutGoogle
    }}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error('useProcurement deve ser usado com um provider');
  return context;
};