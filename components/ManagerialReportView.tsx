
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ComposedChart, Line, Area
} from 'recharts';
import { 
  Activity, TrendingUp, Layers
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';

interface ManagerialReportViewProps {
  items: ProcurementItem[];
  projectName: string;
}

const STACK_COLORS = {
  'PENDENTE': '#e2e8f0',
  'COMPRADO': '#818cf8',
  'ENTREGUE': '#34d399'
};

const ManagerialReportView: React.FC<ManagerialReportViewProps> = ({ items, projectName }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const total = items.length;
    if (total === 0) return null;

    const pendentes = items.filter(i => i.status === 'PENDENTE').length;
    const comprados = items.filter(i => i.status === 'COMPRADO').length;
    const entregues = items.filter(i => i.status === 'ENTREGUE').length;
    const atrasados = items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < todayStr).length;
    
    const physicalProgress = Math.round((entregues / total) * 100);
    const financialProgress = Math.round(((comprados + entregues) / total) * 100);

    let scoreVal = 100 - (atrasados * 2) - ((pendentes / total) * 20);
    if (scoreVal < 0) scoreVal = 0;
    
    let healthGrade = 'A';
    if (scoreVal < 90) healthGrade = 'B';
    if (scoreVal < 70) healthGrade = 'C';
    if (scoreVal < 50) healthGrade = 'D';

    const categoryStackData = Object.entries(CATEGORY_CONFIG)
      .filter(([key]) => key !== 'All')
      .map(([key, config]) => {
        const catItems = items.filter(i => config.keywords.some(kw => i.sheetName.toUpperCase().includes(kw.toUpperCase())));
        if (catItems.length === 0) return null;
        return {
          name: config.label,
          PENDENTE: catItems.filter(i => i.status === 'PENDENTE').length,
          COMPRADO: catItems.filter(i => i.status === 'COMPRADO').length,
          ENTREGUE: catItems.filter(i => i.status === 'ENTREGUE').length,
          total: catItems.length
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.total || 0) - (a?.total || 0));

    return { total, pendentes, comprados, entregues, atrasados, physicalProgress, financialProgress, healthGrade, scoreVal, categoryStackData };
  }, [items, todayStr]);

  if (!metrics) return <div className="p-10 text-center text-slate-400">Sem dados para análise.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch justify-between gap-8">
        <div className="flex-1">
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">{projectName}</h1>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Relatório Consolidado de Gestão</p>
        </div>
        <div className={`w-full md:w-64 rounded-[1.5rem] p-6 border flex flex-col items-center justify-center bg-slate-50 border-white shadow-sm`}>
             <p className="text-[10px] font-black uppercase opacity-60 mb-1">Health Score</p>
             <div className="text-6xl font-black tracking-tighter text-indigo-600">{metrics.healthGrade}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Progresso Entregas</p>
            <span className="text-4xl font-black text-emerald-600">{metrics.physicalProgress}%</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pedidos Colocados</p>
            <span className="text-4xl font-black text-indigo-600">{metrics.financialProgress}%</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Itens Atrasados</p>
            <span className="text-4xl font-black text-rose-600">{metrics.atrasados}</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Backlog</p>
            <span className="text-4xl font-black text-slate-600">{metrics.pendentes}</span>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Gargalos por Categoria
          </h3>
          <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.categoryStackData} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                      <Bar dataKey="ENTREGUE" stackId="a" fill={STACK_COLORS['ENTREGUE']} />
                      <Bar dataKey="COMPRADO" stackId="a" fill={STACK_COLORS['COMPRADO']} />
                      <Bar dataKey="PENDENTE" stackId="a" fill={STACK_COLORS['PENDENTE']} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default ManagerialReportView;
