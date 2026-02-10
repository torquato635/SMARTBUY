
import React, { useMemo } from 'react';
import { useProcurement } from '../ProcurementContext';
import { Clock, ShoppingCart, CheckCircle2, Package, ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { ProcurementItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DashboardStatsProps {
  items?: ProcurementItem[];
  onEntregueClick?: () => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ items: propItems, onEntregueClick }) => {
  const { getAllItems } = useProcurement();
  const contextItems = getAllItems();
  const items = propItems || contextItems;

  const today = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const total = items.length || 1;
    const pendentes = items.filter(i => i.status === 'PENDENTE').length;
    const orcamento = items.filter(i => i.status === 'EM ORCAMENTO').length;
    const comprados = items.filter(i => i.status === 'COMPRADO').length;
    const entregues = items.filter(i => i.status === 'ENTREGUE').length;
    
    const totalAdquiridos = items.filter(i => i.status === 'COMPRADO' || i.status === 'ENTREGUE').length;
    const purchaseEvolution = Math.round((totalAdquiridos / total) * 100);
    const atrasados = items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < today).length;

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
        {/* Gauge de Evolução de Lista */}
        <div 
          onClick={onEntregueClick}
          className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center group-hover:text-indigo-600">EVOLUÇÃO DE LISTA</p>
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
          <p className="text-[9px] text-slate-400 font-bold mt-4 text-center uppercase">CLIQUE PARA DETALHES</p>
        </div>

        {/* Mini Cards de Métricas */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-5">
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DE ITENS</p>
              <p className="text-3xl font-black text-slate-800">{metrics.total}</p>
              <p className="text-[9px] text-indigo-500 font-bold uppercase mt-1">PROJETO CONSOLIDADO</p>
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
              <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">CLIQUE PARA VER LISTA</p>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-5">
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ITENS EM ATRASO</p>
              <p className="text-3xl font-black text-slate-800">{metrics.atrasados}</p>
              <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">NECESSITA FOLLOW-UP</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra de Status Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">PENDENTES</span>
          <span className="text-sm font-black text-amber-600">{metrics.pendentes}</span>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">EM ORCAMENTO</span>
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
