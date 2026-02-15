
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
  Lock
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG, ItemStatus } from '../types';

interface ManufacturingLineViewProps {
  items: ProcurementItem[];
  updateStatus: (id: string, status: ItemStatus) => void;
  today: string;
}

const normalize = (str: string) => str ? str.toUpperCase().trim() : "";

const ManufacturingLineView: React.FC<ManufacturingLineViewProps> = ({ items, updateStatus, today }) => {
  
  const processedData = useMemo(() => {
    const getItemsByCat = (catKey: string) => {
      const config = CATEGORY_CONFIG[catKey];
      if (!config) return [];
      return items.filter(i => config.keywords.some(kw => normalize(i.sheetName).includes(normalize(kw))));
    };

    const usinagem = getItemsByCat('USINAGEM');
    const laser = getItemsByCat('LASER_FUNILARIA');
    const comerciais = getItemsByCat('ITENS COMERCIAIS');

    let availableLaser = [...laser];
    let availableComerciais = [...comerciais];

    const results = usinagem.map(u => {
      let laserMatchIndex = -1;
      const uPN = normalize(u.partNumber);
      const uDesc = normalize(u.description);

      if (uPN && uPN !== '-') {
        laserMatchIndex = availableLaser.findIndex(l => normalize(l.partNumber) === uPN);
      }
      
      if (laserMatchIndex === -1) {
        laserMatchIndex = availableLaser.findIndex(l => normalize(l.description) === uDesc);
      }

      const laserMatch = laserMatchIndex !== -1 ? availableLaser.splice(laserMatchIndex, 1)[0] : null;

      let comerciaisMatchIndex = -1;
      if (uPN && uPN !== '-') {
        comerciaisMatchIndex = availableComerciais.findIndex(m => normalize(m.partNumber) === uPN);
      }
      
      if (comerciaisMatchIndex === -1) {
        comerciaisMatchIndex = availableComerciais.findIndex(m => normalize(m.description) === uDesc);
      }

      const comerciaisMatch = comerciaisMatchIndex !== -1 ? availableComerciais.splice(comerciaisMatchIndex, 1)[0] : null;

      const processCount = 1 + (laserMatch ? 1 : 0) + (comerciaisMatch ? 1 : 0);

      // Regra de Trava: Usinagem só pode ser concluída se Laser e Comerciais estiverem ENTREGUES
      const isLaserReady = !laserMatch || laserMatch.status === 'ENTREGUE';
      const isComerciaisReady = !comerciaisMatch || comerciaisMatch.status === 'ENTREGUE';
      const canFinishUsinagem = isLaserReady && isComerciaisReady;

      return {
        id: u.id,
        usinagem: u,
        laser: laserMatch,
        comerciais: comerciaisMatch,
        processCount,
        canFinishUsinagem
      };
    });

    return results.filter(row => row.processCount >= 2);
  }, [items]);

  const StatusBadge = ({ 
    item, 
    label, 
    icon: Icon, 
    isDisabled = false,
    tooltip = ""
  }: { 
    item: ProcurementItem | null, 
    label: string, 
    icon: any, 
    isDisabled?: boolean,
    tooltip?: string
  }) => {
    if (!item) return (
      <div className="flex flex-col items-center opacity-10">
        <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-slate-300 mb-1 flex items-center justify-center">
           <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <span className="text-[7px] font-black uppercase text-slate-300">Não Aplic.</span>
      </div>
    );

    const isConcluido = item.status === 'ENTREGUE';
    const isAtrasado = !isConcluido && item.status === 'COMPRADO' && item.expectedArrival && item.expectedArrival < today;
    
    const colors = {
      'PENDENTE': 'bg-amber-100 text-amber-600 border-amber-200',
      'EM ORCAMENTO': 'bg-blue-100 text-blue-600 border-blue-200',
      'COMPRADO': 'bg-indigo-100 text-indigo-600 border-indigo-200',
      'ENTREGUE': 'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200 transition-colors',
      'ATRASADO': 'bg-rose-100 text-rose-600 border-rose-200',
      'BLOCKED': 'bg-slate-100 text-slate-400 border-slate-200 grayscale cursor-not-allowed opacity-60'
    };

    const statusKey = isDisabled && !isConcluido ? 'BLOCKED' : (isConcluido ? 'ENTREGUE' : (isAtrasado ? 'ATRASADO' : item.status));

    return (
      <div className="flex flex-col items-center group/badge relative" title={tooltip}>
        <button 
          disabled={isDisabled && !isConcluido}
          onClick={() => updateStatus(item.id, isConcluido ? 'COMPRADO' : 'ENTREGUE')}
          className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 ${colors[statusKey as keyof typeof colors]}`}
        >
          {isConcluido ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : isDisabled ? (
            <Lock className="w-5 h-5" />
          ) : isAtrasado ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </button>
        <span className={`text-[8px] font-black uppercase mt-2 tracking-tighter ${isAtrasado ? 'text-rose-600' : (isDisabled && !isConcluido ? 'text-slate-400' : 'text-slate-500')}`}>
          {label}
        </span>
        {isDisabled && !isConcluido && (
          <div className="absolute -top-1 -right-1">
             <div className="bg-amber-500 w-3 h-3 rounded-full border-2 border-white shadow-sm" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                <Factory className="w-8 h-8 text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Fluxo de Fabricação</h2>
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em]">Usinagem: Etapa Final Bloqueada</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase rounded-full">Trava de Precedência Ativa</span>
             <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded-full">Garantia de Recebimento</span>
          </div>
        </div>
        
        <div className="mt-6 md:mt-0 flex items-center gap-8 relative z-10">
           <div className="text-center">
              <span className="text-4xl font-black block">{processedData.length}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Conjuntos</span>
           </div>
           <div className="w-px h-12 bg-slate-800" />
           <div className="text-center">
              <span className="text-4xl font-black block text-emerald-500">
                {Math.round((processedData.filter(r => r.usinagem.status === 'ENTREGUE').length / (processedData.length || 1)) * 100)}%
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Finalizados</span>
           </div>
        </div>

        <div className="absolute -right-20 -bottom-20 opacity-5">
           <Settings className="w-80 h-80 rotate-12" />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Componente</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Controle de Fluxo e Precedência</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Conjunto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 uppercase leading-none group-hover:text-indigo-600 transition-colors">{row.usinagem.description}</span>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">{row.usinagem.partNumber}</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg text-indigo-600">
                           <Layers className="w-3 h-3" />
                           <span className="text-[10px] font-black uppercase">Qtd: {row.usinagem.quantity}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-center">
                      <StatusBadge 
                        item={row.laser} 
                        label="1. Corte/Laser" 
                        icon={Zap} 
                      />
                      <div className="px-4 mb-4">
                        <ArrowRight className={`w-5 h-5 transition-colors ${row.laser?.status === 'ENTREGUE' ? 'text-emerald-500' : 'text-slate-200'}`} />
                      </div>
                      <StatusBadge 
                        item={row.comerciais} 
                        label="2. Comerciais" 
                        icon={Package} 
                      />
                      <div className="px-4 mb-4">
                        <ArrowRight className={`w-5 h-5 transition-colors ${row.comerciais?.status === 'ENTREGUE' ? 'text-emerald-500' : 'text-slate-200'}`} />
                      </div>
                      <StatusBadge 
                        item={row.usinagem} 
                        label="3. Usinagem Final" 
                        icon={Settings} 
                        isDisabled={!row.canFinishUsinagem}
                        tooltip={!row.canFinishUsinagem ? "Aguardando conclusão das etapas anteriores (Laser e/ou Comerciais)" : "Liberado para finalização"}
                      />
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-200">
                      {row.usinagem.assembly}
                    </div>
                  </td>
                </tr>
              ))}
              {processedData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Factory className="w-10 h-10 text-slate-300" />
                      </div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-2">Aguardando Pareamento</h4>
                      <p className="text-xs font-medium text-slate-400 uppercase leading-relaxed text-center">O sistema listará aqui itens que requerem multiprocessamento para garantir a integridade da baixa.</p>
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
