
import React, { useMemo } from 'react';
import { useProcurement } from '../ProcurementContext';
import { Clock, ShoppingCart, CheckCircle2, Package, ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DashboardStatsProps {
  items?: ProcurementItem[];
  onEntregueClick?: () => void;
  onAtrasadosClick?: () => void;
  onPendentesClick?: () => void;
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

const DashboardStats: React.FC<DashboardStatsProps> = ({ items: propItems, onEntregueClick, onAtrasadosClick, onPendentesClick }) => {
  const { getAllItems } = useProcurement();
  const contextItems = getAllItems();
  const items = propItems || contextItems;

  const today = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    // Apenas All e FABRICADOS são excluídos do somatório total das metas de compras
    const excludedKeys = ['All', 'FABRICADOS'];
    const categoriesToSum = Object.keys(CATEGORY_CONFIG).filter(k => !excludedKeys.includes(k));
    
    let total = 0;
    let pendentes = 0;
    let orcamento = 0;
    let comprados = 0;
    let entregues = 0;
    let atrasados = 0;

    categoriesToSum.forEach(key => {
      const config = CATEGORY_CONFIG[key];
      const catItems = items.filter(i => 
        config.keywords.some(kw => normalizeString(i.sheetName).includes(normalizeString(kw)))
      );
      
      total += catItems.length;
      pendentes += catItems.filter(i => i.status === 'PENDENTE').length;
      orcamento += catItems.filter(i => i.status === 'EM ORCAMENTO').length;
      comprados += catItems.filter(i => i.status === 'COMPRADO').length;
      entregues += catItems.filter(i => i.status === 'ENTREGUE').length;
      atrasados += catItems.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length;
    });

    const totalCalculated = total || 1;
    const totalAdquiridos = comprados + entregues;
    const purchaseEvolution = Math.round((totalAdquiridos / totalCalculated) * 100);

    return {
      total,
      pendentes,
      orcamento,
      comprados,
      entregues,
      purchaseEvolution,
      atrasados
    };
  }, [items, today]);

  const gaugeData = [
    { name: 'EVOLUCAO', value: metrics.purchaseEvolution },
    { name: 'RESTANTE', value: 100 - metrics.purchaseEvolution },
  ];

  const GAUGE_COLORS = ['#4F46E5', '#F1F5F9'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div 
          onClick={onEntregueClick}
          className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center group-hover:text-indigo-600">EVOLUÇÃO DE COMPRAS</p>
          <div className="h-32 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index]} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pt-8">
              <span className="text-4xl font-black text-indigo-600">
                {metrics.purchaseEvolution}%
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-4 text-center uppercase">CATEGORIAS CONSOLIDADAS</p>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-5">
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DE ITENS</p>
              <p className="text-3xl font-black text-slate-800">{metrics.total}</p>
              <p className="text-[9px] text-indigo-500 font-bold uppercase mt-1">SOMA DAS CATEGORIAS</p>
            </div>
          </div>

          <div 
            onClick={onEntregueClick}
            className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-5 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/10 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ENTREGUES</p>
              <p className="text-3xl font-black text-slate-800">{metrics.entregues}</p>
              <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">VER LISTA COMPLETA</p>
            </div>
          </div>

          <div 
            onClick={onAtrasadosClick}
            className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-5 cursor-pointer hover:border-rose-300 hover:bg-rose-50/10 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EM ATRASO</p>
              <p className="text-3xl font-black text-slate-800">{metrics.atrasados}</p>
              <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">REQUER ATENÇÃO</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">EM ORÇAMENTO</span>
          <span className="text-sm font-black text-blue-600">{metrics.orcamento}</span>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">COMPRADOS</span>
          <span className="text-sm font-black text-emerald-600">{metrics.comprados}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
