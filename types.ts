
import { 
  Zap, 
  Settings, 
  ShieldAlert, 
  Wind, 
  Package, 
  Layers,
  Flame,
  Factory
} from 'lucide-react';

export enum ItemType {
  FABRICADO = 'Fabricado',
  COMERCIAL = 'Comercial'
}

export type ItemStatus = 'PENDENTE' | 'EM ORCAMENTO' | 'COMPRADO' | 'ENTREGUE';

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
  'PEÇAS MONTAGEM': { color: 'violet', icon: Package, label: 'Peças Montagem', bg: 'bg-violet-50', text: 'text-violet-600', keywords: ['MONTAGEM'] },
  'SOLDA': { color: 'rose', icon: Flame, label: 'Solda', bg: 'bg-rose-50', text: 'text-rose-600', keywords: ['SOLDA'] },
  'All': { color: 'slate', icon: Layers, label: 'Visão Geral', bg: 'bg-slate-50', text: 'text-slate-600', keywords: [] }
};
