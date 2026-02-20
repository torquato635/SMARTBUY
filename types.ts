import { 
  Zap, 
  Settings, 
  ShieldAlert, 
  Wind, 
  Package, 
  Layers,
  Flame,
  Factory,
  StickyNote
} from 'lucide-react';

export enum ItemType {
  FABRICADO = 'Fabricado',
  COMERCIAL = 'Comercial'
}

export type ItemStatus = 'PENDENTE' | 'COMPRADO' | 'ENTREGUE';

export interface ProcurementItem {
  id: string;
  sheetName: string;
  assembly: string; 
  partNumber: string; 
  description: string; 
  quantity: number; 
  unit: string;
  type: ItemType;
  supplier?: string;
  status: ItemStatus;
  dueDate?: string;
  orderNumber?: string;
  expectedArrival?: string;
  invoiceNumber?: string;
  actualArrivalDate?: string;
}

export interface ManualRequest {
  id: string;
  project: string;
  code: string;
  description: string;
  quantity: number;
  brand: string;
  type: ItemType;
  timestamp: string;
  status?: ItemStatus;
  supplier?: string;
  orderNumber?: string;
  expectedArrival?: string;
  invoiceNumber?: string;
  actualArrivalDate?: string;
}

export interface Sheet {
  id: string;
  nome: string;
  items: ProcurementItem[];
  data_upload: string;
}

export interface SheetData {
  fileName: string;
  sheets: {
    name: string;
    items: ProcurementItem[];
  }[];
}

export const CATEGORY_CONFIG: Record<string, { color: string; icon: any; label: string; bg: string; text: string; keywords: string[] }> = {
  'FABRICADOS': { color: 'cyan', icon: Factory, label: 'Linha de Fabricação', bg: 'bg-cyan-50', text: 'text-cyan-600', keywords: ['FABRICADO'] },
  'LASER_FUNILARIA': { color: 'blue', icon: Zap, label: 'Laser & Funilaria', bg: 'bg-blue-50', text: 'text-blue-600', keywords: ['LASER', 'FUNILARIA'] },
  'USINAGEM': { color: 'indigo', icon: Settings, label: 'Usinagem', bg: 'bg-indigo-50', text: 'text-indigo-600', keywords: ['USINAGEM'] },
  'POLICARBONATO': { color: 'teal', icon: ShieldAlert, label: 'Policarbonato', bg: 'bg-teal-50', text: 'text-teal-600', keywords: ['POLICARBONATO'] },
  'PNEUMATICA': { color: 'orange', icon: Wind, label: 'Pneumática', bg: 'bg-orange-50', text: 'text-orange-600', keywords: ['PNEUMATICA'] },
  'ITENS COMERCIAIS': { color: 'violet', icon: Package, label: 'Itens Comerciais', bg: 'bg-violet-50', text: 'text-violet-600', keywords: ['MONTAGEM', 'COMERCIAL'] },
  'SOLDA': { color: 'rose', icon: Flame, label: 'Solda', bg: 'bg-rose-50', text: 'text-rose-600', keywords: ['SOLDA'] },
  'MANUAL': { color: 'emerald', icon: StickyNote, label: 'SOLICITAÇÃO FORA DE LISTA', bg: 'bg-emerald-50', text: 'text-emerald-600', keywords: ['SOLICITAÇÃO FORA DE LISTA', 'DEMANDA MANUAL'] },
  'All': { color: 'slate', icon: Layers, label: 'Visão Geral', bg: 'bg-slate-50', text: 'text-slate-600', keywords: [] }
};