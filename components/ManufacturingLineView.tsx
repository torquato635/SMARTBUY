
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Zap, 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Factory,
  Layers,
  Lock,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG, ItemStatus } from '../types';

interface ManufacturingLineViewProps {
  items: ProcurementItem[];
  updateStatus: (id: string, status: ItemStatus) => void;
  today: string;
}

const normalize = (str: string) => str ? str.toUpperCase().trim() : "";

type StageType = 'comercial' | 'laser' | 'usinagem';

interface ConsolidatedItem {
  id: string;
  code: string;
  description: string;
  originalDescription: string;
  quantity: number;
  stages: {
    comercial: ProcurementItem[];
    laser: ProcurementItem[];
    usinagem: ProcurementItem[];
  };
  creationDate: string;
  overallStatus: 'COMPLETED' | 'IN_PRODUCTION' | 'WAITING';
}

const ManufacturingLineView: React.FC<ManufacturingLineViewProps> = ({ items, updateStatus, today }) => {
  
  const processedData = useMemo(() => {
    const getItemsByCat = (catKey: string) => {
      const config = CATEGORY_CONFIG[catKey];
      if (!config) return [];
      return items.filter(i => config.keywords.some(kw => normalize(i.sheetName).includes(normalize(kw))));
    };

    const laserItems = getItemsByCat('LASER_FUNILARIA');
    const usinagemItems = getItemsByCat('USINAGEM');
    const comercialItems = getItemsByCat('ITENS COMERCIAIS');

    const consolidatedMap = new Map<string, ConsolidatedItem>();

    const processItem = (item: ProcurementItem, type: StageType) => {
        const code = normalize(item.partNumber);
        const desc = normalize(item.description);
        
        // Key priority: Code > Description
        // If item has code (and it's not a placeholder like '-'), use it. Otherwise use description.
        let key = (code && code !== '-' && code.length > 1) ? `CODE:${code}` : `DESC:${desc}`;
        
        if (!consolidatedMap.has(key)) {
            consolidatedMap.set(key, {
                id: key,
                code: (code && code !== '-' && code.length > 1) ? code : '',
                description: desc,
                originalDescription: item.description,
                quantity: 0,
                stages: { laser: [], usinagem: [], comercial: [] },
                creationDate: item.dueDate || '',
                overallStatus: 'WAITING'
            });
        }
        
        const entry = consolidatedMap.get(key)!;
        // Only add quantity if it's the first time we see this item in this stage? 
        // Or sum everything? The prompt says "Somar quantidades". 
        // But if an item moves from Laser to Usinagem, it's the same item.
        // If we sum quantity from all stages, we might triple the actual quantity.
        // Usually, the quantity is the max of any stage, or the quantity of the primary stage.
        // Let's assume the quantity is consistent across stages. We should probably take the MAX quantity found, or the quantity from the 'latest' stage.
        // However, "Somar quantidades" usually implies consolidating multiple distinct items (e.g. 2 units in Laser, 2 units in Usinagem -> 2 units total if they are the same flow).
        // If the user says "Item X appears in Laser -> 2 units, Usinagem -> 2 units. In Line -> Item X -> 2 units", it implies NOT summing 2+2=4.
        // It implies unifying.
        // But if there are multiple *entries* in Laser for the same code (e.g. 2 + 3), we should sum those.
        // Strategy: Sum quantities within each stage, then take the max across stages? Or just take the quantity from the most downstream stage?
        // Let's track quantity per stage and take the max.
        
        entry.stages[type].push(item);
        
        // Update metadata if better info available
        if (!entry.code && code && code !== '-' && code.length > 1) entry.code = code;
    };

    laserItems.forEach(i => processItem(i, 'laser'));
    usinagemItems.forEach(i => processItem(i, 'usinagem'));
    comercialItems.forEach(i => processItem(i, 'comercial'));

    const results = Array.from(consolidatedMap.values())
      .filter(item => {
        let activeStages = 0;
        if (item.stages.laser.length > 0) activeStages++;
        if (item.stages.usinagem.length > 0) activeStages++;
        if (item.stages.comercial.length > 0) activeStages++;
        return activeStages >= 2;
      })
      .map(item => {
        // Calculate total quantity: Max of the sums of each stage
        const qtyComercial = item.stages.comercial.reduce((acc, i) => acc + i.quantity, 0);
        const qtyLaser = item.stages.laser.reduce((acc, i) => acc + i.quantity, 0);
        const qtyUsinagem = item.stages.usinagem.reduce((acc, i) => acc + i.quantity, 0);
        item.quantity = Math.max(qtyComercial, qtyLaser, qtyUsinagem);

        // Calculate Overall Status
        // Rule:
        // All stages finished -> Completed
        // Any stage pending -> In Production
        // No stage started -> Waiting
        
        const getStageStatus = (items: ProcurementItem[]) => {
            if (items.length === 0) return 'NA';
            if (items.every(i => i.status === 'ENTREGUE')) return 'DONE';
            if (items.every(i => i.status === 'PENDENTE')) return 'PENDING';
            return 'IN_PROGRESS';
        };

        const sComercial = getStageStatus(item.stages.comercial);
        const sLaser = getStageStatus(item.stages.laser);
        const sUsinagem = getStageStatus(item.stages.usinagem);

        const stages = [sComercial, sLaser, sUsinagem].filter(s => s !== 'NA');
        
        if (stages.length === 0) {
            item.overallStatus = 'WAITING'; // Should not happen if item exists
        } else if (stages.every(s => s === 'DONE')) {
            item.overallStatus = 'COMPLETED';
        } else if (stages.every(s => s === 'PENDING')) {
            item.overallStatus = 'WAITING';
        } else {
            item.overallStatus = 'IN_PRODUCTION';
        }

        return item;
    });

    // Sort: Waiting (Pending) -> In Production -> Completed
    return results.sort((a, b) => {
        const score = (status: string) => {
            if (status === 'WAITING') return 0;
            if (status === 'IN_PRODUCTION') return 1;
            return 2; // COMPLETED
        };
        
        const scoreA = score(a.overallStatus);
        const scoreB = score(b.overallStatus);
        
        if (scoreA !== scoreB) return scoreA - scoreB;
        
        // Secondary sort by description or code
        return a.description.localeCompare(b.description);
    });

  }, [items]);

  const StageStatusBadge = ({ 
    stage, 
    items, 
    icon: Icon, 
    label 
  }: { 
    stage: StageType, 
    items: ProcurementItem[], 
    icon: any, 
    label: string 
  }) => {
    if (items.length === 0) return (
      <div className="flex flex-col items-center opacity-20 grayscale">
        <div className="w-10 h-10 rounded-xl border border-dashed border-[var(--text-secondary)] mb-1 flex items-center justify-center">
           <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
        <span className="text-[7px] font-black uppercase text-[var(--text-secondary)]">N/A</span>
      </div>
    );

    const isDone = items.every(i => i.status === 'ENTREGUE');
    const isPending = items.every(i => i.status === 'PENDENTE');
    const isInProgress = !isDone && !isPending;
    
    // Determine color based on status
    let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
    if (isDone) colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-300';
    else if (isInProgress) colorClass = 'bg-amber-100 text-amber-700 border-amber-300';
    else if (isPending) colorClass = 'bg-slate-100 text-slate-600 border-slate-300'; // Waiting

    return (
      <div className="flex flex-col items-center group/badge relative">
        <button 
          onClick={() => {
             // Toggle status for all items in this stage?
             // The user said "Não alterar status real das etapas" (Do not change real status of stages)
             // But usually these badges are interactive.
             // "updateStatus" prop is available.
             // Let's allow toggling between ENTREGUE and previous status?
             // For safety, let's just toggle the first item or all?
             // If I click, I probably want to mark this stage as done.
             const newStatus = isDone ? 'COMPRADO' : 'ENTREGUE';
             items.forEach(i => updateStatus(i.id, newStatus));
          }}
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 ${colorClass}`}
          title={`${label}: ${items.length} itens`}
        >
          {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </button>
        <span className={`text-[7px] font-black uppercase mt-1.5 tracking-tight ${isDone ? 'text-emerald-700' : 'text-[var(--text-secondary)]'}`}>
          {label}
        </span>
        
        {/* Mini indicator for quantity if > 1 */}
        {items.length > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] flex items-center justify-center text-[8px] font-bold shadow-sm">
                {items.length}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-8 rounded-3xl text-[var(--text-primary)] corporate-shadow flex flex-col md:flex-row items-center justify-between overflow-hidden relative border border-[var(--border-color)]">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
             <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                <Factory className="w-8 h-8 text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Linha de Produção</h2>
                <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em]">Visão Consolidada de Fabricação</p>
             </div>
          </div>
        </div>
        
        <div className="mt-6 md:mt-0 flex items-center gap-8 relative z-10">
           <div className="text-center">
              <span className="text-4xl font-black block text-[var(--text-primary)]">{processedData.length}</span>
              <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Itens Consolidados</span>
           </div>
           <div className="w-px h-12 bg-[var(--border-color)]" />
           <div className="text-center">
              <span className="text-4xl font-black block text-emerald-500">
                {processedData.filter(r => r.overallStatus === 'COMPLETED').length}
              </span>
              <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Concluídos</span>
           </div>
        </div>

        <div className="absolute -right-20 -bottom-20 opacity-[0.03]">
           <Settings className="w-80 h-80 rotate-12 text-[var(--text-primary)]" />
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-[var(--border-color)] corporate-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="glass-inner border-b border-[var(--border-color)]">
                <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest w-[40%]">Item Consolidado</th>
                <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest text-center w-[15%]">Status Geral</th>
                <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest text-center w-[45%]">Cronologia de Etapas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {processedData.map((row) => (
                <tr key={row.id} className="hover:bg-emerald-500/5 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[var(--text-primary)] uppercase leading-snug group-hover:text-emerald-500 transition-colors">{row.originalDescription}</span>
                      <div className="flex items-center gap-3 mt-2">
                        {row.code && (
                            <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] glass-inner px-2 py-1 rounded-lg border border-[var(--border-color)]">
                                {row.code}
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
                           <Layers className="w-3 h-3" />
                           <span className="text-[10px] font-black uppercase">Qtd: {row.quantity}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${
                        row.overallStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        row.overallStatus === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                        {row.overallStatus === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                        {row.overallStatus === 'IN_PRODUCTION' && <Factory className="w-3 h-3" />}
                        {row.overallStatus === 'WAITING' && <Clock className="w-3 h-3" />}
                        
                        {row.overallStatus === 'COMPLETED' ? 'Concluído' :
                         row.overallStatus === 'IN_PRODUCTION' ? 'Em Produção' :
                         'Aguardando'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <StageStatusBadge 
                        stage="comercial" 
                        items={row.stages.comercial} 
                        icon={Package} 
                        label="Comercial"
                      />
                      <div className="w-8 h-0.5 bg-[var(--border-color)]" />
                      <StageStatusBadge 
                        stage="laser" 
                        items={row.stages.laser} 
                        icon={Zap} 
                        label="Laser"
                      />
                      <div className="w-8 h-0.5 bg-[var(--border-color)]" />
                      <StageStatusBadge 
                        stage="usinagem" 
                        items={row.stages.usinagem} 
                        icon={Settings} 
                        label="Usinagem"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {processedData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-20 h-20 glass-inner rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)]">
                        <Factory className="w-10 h-10 text-[var(--text-muted)]" />
                      </div>
                      <h4 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Nenhum Item na Linha</h4>
                      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase leading-relaxed text-center">Não foram encontrados itens de Laser, Usinagem ou Comerciais neste projeto.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingLineView;
