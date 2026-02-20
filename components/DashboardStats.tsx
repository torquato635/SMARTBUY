import React, { useMemo, useCallback } from 'react';
import { useProcurement } from '../ProcurementContext';
import { Clock, ShoppingCart, CheckCircle2, Package, AlertTriangle, ArrowRight } from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG, ItemStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DashboardStatsProps {
  items?: ProcurementItem[];
  onStatusFilter: (status: ItemStatus | 'ALL' | 'NAO_COMPRADO' | 'ATRASADO') => void;
}

const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ items: propItems, onStatusFilter }) => {
  const { getAllItems } = useProcurement();
  const contextItems = getAllItems();
  const items = propItems || contextItems;

  const today = new Date().toISOString().split('T')[0];

  const getItemCategory = useCallback((item: ProcurementItem) => {
    const uSheet = normalizeString(item.sheetName);
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      if (key === 'All' || key === 'FABRICADOS') continue;
      if (config.keywords.some(kw => uSheet.includes(normalizeString(kw)))) {
        return key;
      }
    }
    if (item.type === 'Fabricado') return 'FABRICADOS';
    return null;
  }, []);

  const metrics = useMemo(() => {
    let total = 0;
    let pendentes = 0;
    let comprados = 0;
    let entregues = 0;
    let atrasados = 0;

    items.forEach(item => {
      const category = getItemCategory(item);
      
      if (!category || category === 'FABRICADOS') return;

      total += 1;
      if (item.status === 'PENDENTE') pendentes += 1;
      if (item.status === 'COMPRADO') comprados += 1;
      if (item.status === 'ENTREGUE') entregues += 1;
      
      if (item.status === 'COMPRADO' && item.expectedArrival && item.expectedArrival < today) atrasados += 1;
    });

    const totalCalculated = total || 1;
    const totalAdquiridos = comprados + entregues;
    const purchaseEvolution = Math.round((totalAdquiridos / totalCalculated) * 100);

    return {
      total,
      pendentes,
      comprados,
      entregues,
      purchaseEvolution,
      atrasados
    };
  }, [items, today, getItemCategory]);

  const gaugeData = [
    { name: 'EVOLUCAO', value: metrics.purchaseEvolution },
    { name: 'RESTANTE', value: 100 - metrics.purchaseEvolution },
  ];

  const GAUGE_COLORS = ['#10b981', 'rgba(148, 163, 184, 0.1)'];

  const FilterButton = ({ 
    label, 
    value, 
    colorClass, 
    icon: Icon, 
    onClick 
  }: { 
    label: string, 
    value: number, 
    colorClass: string, 
    icon: any, 
    onClick: () => void 
  }) => (
    <button 
      onClick={onClick}
      className={`flex flex-col p-5 rounded-3xl border border-[var(--border-color)] transition-all hover:bg-emerald-500/5 hover:scale-[1.02] active:scale-95 text-left group bg-[var(--bg-card)]`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2.5 rounded-xl ${colorClass} bg-emerald-500/10 shadow-sm border border-emerald-500/5`}>
          <Icon className="w-4 h-4" />
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]/20 group-hover:text-emerald-500 transition-colors" />
      </div>
      <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-2xl font-black text-[var(--text-primary)]`}>{value}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => onStatusFilter('ENTREGUE')}
          className="lg:col-span-1 bg-gradient-to-br from-[#020617] to-[#022c22] dark:from-[#020617] dark:to-[#022c22] p-10 rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500/30 transition-all group"
        >
          {/* O gráfico de evolução sempre mantém o fundo escuro industrial para identidade visual da marca Alltech */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/50" />
          <p className="text-sm font-black text-emerald-50 uppercase tracking-[0.25em] mb-6 text-center group-hover:text-white transition-colors">
            EVOLUÇÃO DE COMPRAS
          </p>
          
          <div className="h-48 w-full relative mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={85}
                  outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={GAUGE_COLORS[index]} 
                      style={{ filter: index === 0 ? 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' : 'none' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pt-8">
              <div className="text-center translate-y-4">
                <span className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                  {metrics.purchaseEvolution}<span className="text-3xl text-emerald-400 align-top ml-1">%</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-8 -right-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity pointer-events-none">
            <ShoppingCart className="w-32 h-32 text-white rotate-12" />
          </div>
        </div>

        <div className="lg:col-span-3 bg-[var(--bg-card)] p-10 rounded-[3.5rem] border border-[var(--border-color)] shadow-2xl flex flex-col md:flex-row items-center gap-10">
          <div 
            onClick={() => onStatusFilter('ALL')}
            className="flex items-center space-x-8 shrink-0 cursor-pointer group"
          >
            <div className="p-7 rounded-[2.5rem] bg-emerald-600 text-white shadow-2xl shadow-emerald-900/40 group-hover:scale-110 transition-transform border border-emerald-400/20">
              <Package className="w-12 h-12" />
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2">TOTAL DE ITENS</p>
              <p className="text-6xl font-black text-[var(--text-primary)] tracking-tighter">{metrics.total}</p>
            </div>
          </div>
          
          <div className="h-24 w-px bg-[var(--border-color)] hidden md:block" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
            <FilterButton 
              label="Comprados" 
              value={metrics.comprados} 
              colorClass="text-emerald-500" 
              icon={ShoppingCart}
              onClick={() => onStatusFilter('COMPRADO')}
            />
            <FilterButton 
              label="Entregues" 
              value={metrics.entregues} 
              colorClass="text-emerald-500" 
              icon={CheckCircle2}
              onClick={() => onStatusFilter('ENTREGUE')}
            />
            <FilterButton 
              label="Pendente" 
              value={metrics.pendentes} 
              colorClass="text-amber-500" 
              icon={Clock}
              onClick={() => onStatusFilter('PENDENTE')}
            />
            <FilterButton 
              label="Em Atraso" 
              value={metrics.atrasados} 
              colorClass="text-rose-500" 
              icon={AlertTriangle}
              onClick={() => onStatusFilter('ATRASADO')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
