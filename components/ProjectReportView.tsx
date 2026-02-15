
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, Activity, 
  TrendingUp, Layers, Target, ShieldCheck,
  AlertOctagon, Clock, PackageSearch
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';

interface ProjectReportViewProps {
  items: ProcurementItem[];
  projectName: string;
}

const COLORS = {
  PENDENTE: '#cbd5e1', // slate-300
  COMPRADO: '#6366f1', // indigo-500
  ENTREGUE: '#10b981', // emerald-500
  ATRASADO: '#f43f5e', // rose-500
};

const ProjectReportView: React.FC<ProjectReportViewProps> = ({ items, projectName }) => {
  const today = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    if (!items || items.length === 0) return null;

    const total = items.length;
    
    const pendentes = items.filter(i => i.status === 'PENDENTE').length;
    const comprados = items.filter(i => i.status === 'COMPRADO').length;
    const entregues = items.filter(i => i.status === 'ENTREGUE').length;
    
    const atrasados = items.filter(i => 
      i.status === 'COMPRADO' && 
      (i.expectedArrival || i.dueDate) && 
      (i.expectedArrival || i.dueDate)! < today
    ).length;
    
    const physicalProgress = Math.round((entregues / total) * 100);
    const orderProgress = Math.round(((comprados + entregues) / total) * 100);

    let score = 100 - (atrasados * 2) - ((pendentes / total) * 15);
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let grade = 'A';
    if (score < 90) grade = 'B';
    if (score < 75) grade = 'C';
    if (score < 50) grade = 'D';

    const statusData = [
      { name: 'Pendente', value: pendentes, color: COLORS.PENDENTE },
      { name: 'Comprado', value: comprados, color: COLORS.COMPRADO },
      { name: 'Entregue', value: entregues, color: COLORS.ENTREGUE },
    ].filter(d => d.value > 0);

    const itemsWithDate = items.filter(i => (i.expectedArrival && i.expectedArrival.trim() !== "") || (i.dueDate && i.dueDate.trim() !== ""));
    const dateMap: Record<string, { planned: number, actual: number }> = {};

    itemsWithDate.forEach(i => {
      const d = (i.expectedArrival || i.dueDate)!;
      if (!dateMap[d]) dateMap[d] = { planned: 0, actual: 0 };
      dateMap[d].planned += 1;
      if (i.status === 'ENTREGUE') dateMap[d].actual += 1;
    });

    const sortedDates = Object.keys(dateMap).sort();
    let accPlanned = 0;
    let accActual = 0;
    const totalWithDate = itemsWithDate.length || 1;

    const sCurveData = sortedDates.map(date => {
      accPlanned += dateMap[date].planned;
      accActual += dateMap[date].actual;
      const displayDate = date.includes('-') ? date.split('-').reverse().slice(0, 2).join('/') : date;
      return {
        date: displayDate,
        Planejado: Math.round((accPlanned / totalWithDate) * 100),
        Realizado: Math.round((accActual / totalWithDate) * 100)
      };
    });

    const categoriesMap: Record<string, { total: number, delivered: number }> = {};
    items.forEach(item => {
      let matched = false;
      const sName = (item.sheetName || "").toUpperCase();
      for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
        if (key === 'All' || key === 'FABRICADOS') continue;
        if (config.keywords.some(kw => sName.includes(kw.toUpperCase()))) {
          if (!categoriesMap[config.label]) categoriesMap[config.label] = { total: 0, delivered: 0 };
          categoriesMap[config.label].total += 1;
          if (item.status === 'ENTREGUE') categoriesMap[config.label].delivered += 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const label = 'GERAL / DIVERSOS';
        if (!categoriesMap[label]) categoriesMap[label] = { total: 0, delivered: 0 };
        categoriesMap[label].total += 1;
        if (item.status === 'ENTREGUE') categoriesMap[label].delivered += 1;
      }
    });

    const categoryData = Object.entries(categoriesMap).map(([name, val]) => ({
      name,
      total: val.total,
      entregues: val.delivered,
      perc: Math.round((val.delivered / val.total) * 100)
    })).sort((a, b) => b.total - a.total);

    const criticalItems = items
      .filter(i => 
        (i.status === 'COMPRADO' && (i.expectedArrival || i.dueDate) && (i.expectedArrival || i.dueDate)! < today) || 
        (i.status === 'PENDENTE')
      )
      .sort((a, b) => {
        const dateA = a.expectedArrival || a.dueDate || '9999-99-99';
        const dateB = b.expectedArrival || b.dueDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 10);

    return { 
      total, pendentes, comprados, entregues, atrasados, 
      physicalProgress, orderProgress, score, grade,
      statusData, categoryData, sCurveData, criticalItems,
      hasTimeline: sCurveData.length > 0
    };
  }, [items, today]);

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
        <PackageSearch className="w-16 h-16 text-slate-200 mb-6" />
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sem dados para este projeto</h3>
        <p className="text-slate-400 font-bold uppercase text-[10px] mt-2">Importe uma planilha para gerar o relatório</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target className="w-5 h-5" /></div>
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Dashboard Estratégico</h3>
              </div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{projectName}</h1>
              <div className="flex items-center gap-6 mt-6">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Entrega Física</span>
                    <span className="text-2xl font-black text-emerald-600">{metrics.physicalProgress}%</span>
                 </div>
                 <div className="w-px h-10 bg-slate-100" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Pedidos Colocados</span>
                    <span className="text-2xl font-black text-indigo-600">{metrics.orderProgress}%</span>
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-8">
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Saúde Operacional</p>
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${metrics.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {metrics.grade === 'A' ? 'Operação Estável' : 'Ação Necessária'}
                 </span>
              </div>
              <div className="w-28 h-28 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shadow-inner ring-4 ring-white">
                 <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Score</span>
                 <span className={`text-5xl font-black ${metrics.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{metrics.score}</span>
              </div>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden shadow-xl">
           <AlertTriangle className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gargalos Críticos</p>
           <h4 className="text-6xl font-black text-rose-500 mb-2">{metrics.atrasados}</h4>
           <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Itens com prazo de entrega vencido</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[500px]">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Funil de Suprimentos
           </h3>
           <div className="flex-1 w-full min-h-[350px]">
              {metrics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={metrics.statusData}
                         innerRadius={80}
                         outerRadius={110}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {metrics.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold'}} />
                   </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-black text-[10px] uppercase">Aguardando dados...</div>
              )}
           </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[500px]">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Curva S de Performance
           </h3>
           <div className="flex-1 w-full min-h-[350px]">
              {metrics.hasTimeline ? (
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={metrics.sCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="Planejado" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPlan)" />
                      <Area type="monotone" dataKey="Realizado" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', top: -30}} />
                   </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Clock className="w-12 h-12 opacity-20" />
                  <p className="text-[10px] font-black uppercase max-w-[280px] text-center leading-relaxed">Defina datas de previsão nos itens para habilitar a projeção temporal.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportView;
