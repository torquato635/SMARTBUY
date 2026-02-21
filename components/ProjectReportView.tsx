import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, Activity, 
  TrendingUp, Layers, Target, ShieldCheck,
  AlertOctagon, Clock, PackageSearch,
  Users, Calendar, ArrowUpRight,
  TrendingDown, Info, ShieldAlert,
  Database, ListChecks
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';

interface ProjectReportViewProps {
  items: ProcurementItem[];
  projectName: string;
}

const COLORS = {
  PENDENTE: '#cbd5e1', // Slate 300
  COMPRADO: '#6366f1', // Indigo 500
  ENTREGUE: '#10b981', // Emerald 500
  ATRASADO: '#f43f5e', // Rose 500
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
      i.expectedArrival && 
      i.expectedArrival < today
    ).length;
    
    const itemsSemData = items.filter(i => i.status === 'COMPRADO' && !i.expectedArrival).length;
    const itemsSemFornecedor = items.filter(i => !i.supplier || i.supplier === '-').length;

    const physicalProgress = Math.round((entregues / total) * 100);
    const orderProgress = Math.round(((comprados + entregues) / total) * 100);

    // Score de Saúde do Projeto
    let score = 100 - (atrasados * 3) - ((pendentes / total) * 20) - ((itemsSemData / total) * 10);
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    // Dados para Gráfico de Pizza (Status)
    const statusData = [
      { name: 'Pendente', value: pendentes, color: COLORS.PENDENTE },
      { name: 'Comprado', value: comprados, color: COLORS.COMPRADO },
      { name: 'Entregue', value: entregues, color: COLORS.ENTREGUE },
    ].filter(d => d.value > 0);

    // Gargalos por Categoria (Barras Empilhadas)
    const categoryData = Object.entries(CATEGORY_CONFIG)
      .filter(([key]) => key !== 'All')
      .map(([key, config]) => {
        const catItems = items.filter(i => {
           const sName = i.sheetName.toUpperCase();
           return config.keywords.some(kw => sName.includes(kw.toUpperCase()));
        });
        if (catItems.length === 0) return null;
        return {
          name: config.label,
          PENDENTE: catItems.filter(i => i.status === 'PENDENTE').length,
          COMPRADO: catItems.filter(i => i.status === 'COMPRADO').length,
          ENTREGUE: catItems.filter(i => i.status === 'ENTREGUE').length,
        };
      })
      .filter((d): d is any => d !== null);

    // Performance de Fornecedores
    const vendorMap: Record<string, { total: number, delivered: number }> = {};
    items.forEach(i => {
      const s = i.supplier?.trim();
      if (s && s !== '-') {
        if (!vendorMap[s]) vendorMap[s] = { total: 0, delivered: 0 };
        vendorMap[s].total += 1;
        if (i.status === 'ENTREGUE') vendorMap[s].delivered += 1;
      }
    });

    const vendorData = Object.entries(vendorMap)
      .map(([name, val]) => ({
        name,
        total: val.total,
        delivered: val.delivered,
        efficiency: Math.round((val.delivered / val.total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Timeline S-Curve
    const dates = [...new Set(items.map(i => i.expectedArrival).filter((d): d is string => !!d))].sort();
    const timelineData = dates.map((date: string) => {
      const itemsUntil = items.filter(i => i.expectedArrival && i.expectedArrival <= date);
      return {
        date: date.split('-').reverse().slice(0, 2).join('/'),
        previsto: Math.round((itemsUntil.length / total) * 100),
        realizado: Math.round((itemsUntil.filter(i => i.status === 'ENTREGUE').length / total) * 100)
      };
    });

    return { 
      total, pendentes, comprados, entregues, atrasados, 
      itemsSemData, itemsSemFornecedor,
      physicalProgress, orderProgress, score,
      statusData, vendorData, timelineData, categoryData,
      isHighRisk: score < 70
    };
  }, [items, today]);

  if (!metrics) return (
    <div className="p-20 text-center bg-[var(--bg-card)] rounded-[3rem] border-2 border-dashed border-[var(--border-color)]">
       <Database className="w-12 h-12 text-[var(--text-secondary)]/30 mx-auto mb-4" />
       <p className="text-[var(--text-secondary)] font-black uppercase text-xs">Aguardando dados para gerar o relatório...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-16 animate-fade-in print:bg-white">
      
      {/* ALERTA DE INTEGRIDADE (Check do Comprador) */}
      {(metrics.itemsSemData > 0 || metrics.itemsSemFornecedor > (metrics.total * 0.3)) && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-4 print:hidden shadow-sm">
           <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><ShieldAlert className="w-6 h-6" /></div>
           <div>
              <h4 className="text-sm font-black text-amber-500 uppercase mb-1">Atenção: Integridade dos Dados</h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                Detectamos que <span className="font-bold">{metrics.itemsSemData} itens comprados</span> estão sem data de previsão e <span className="font-bold">{metrics.itemsSemFornecedor} itens</span> estão sem fornecedor. 
                Isso compromete a precisão da Curva S e da análise de riscos.
              </p>
           </div>
        </motion.div>
      )}

      {/* HEADER E SCORE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-[var(--bg-card)] p-10 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Activity className="w-5 h-5" /></div>
                 <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Painel de Controle de Suprimentos</h3>
              </div>
              <h1 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-none mb-4">{projectName}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-8">
                 <div>
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Entregas Físicas</p>
                    <div className="flex items-center gap-2">
                       <span className="text-3xl font-black text-emerald-600">{metrics.physicalProgress}%</span>
                       <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Carteira de Pedidos</p>
                    <span className="text-3xl font-black text-indigo-600">{metrics.orderProgress}%</span>
                 </div>
                 <div className="hidden md:block">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Itens Totais</p>
                    <span className="text-3xl font-black text-[var(--text-primary)]">{metrics.total}</span>
                 </div>
              </div>
           </div>
           
           <div className="relative group">
              <div className="w-40 h-40 rounded-full border-[12px] border-[var(--bg-inner)] flex flex-col items-center justify-center shadow-inner bg-[var(--bg-card)] ring-1 ring-[var(--border-color)]">
                 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase mb-0.5 tracking-widest">SCORE</span>
                 <span className={`text-6xl font-black tracking-tighter ${metrics.score > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{metrics.score}</span>
              </div>
              <div className={`absolute -bottom-2 -right-2 p-3 rounded-2xl shadow-lg text-white ${metrics.score > 80 ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                 <ShieldCheck className="w-5 h-5" />
              </div>
           </div>
        </div>

        <div className={`p-10 rounded-[3rem] flex flex-col justify-between relative overflow-hidden shadow-xl transition-all ${metrics.atrasados > 0 ? 'bg-rose-600 text-white' : 'bg-slate-950 text-white'}`}>
           <AlertTriangle className="absolute -right-8 -bottom-8 w-44 h-44 opacity-10 rotate-12" />
           <div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Itens em Atraso</p>
              <h4 className="text-7xl font-black tracking-tighter">{metrics.atrasados}</h4>
              <p className="text-[10px] font-bold text-white/80 uppercase mt-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Alerta Lead-Time Crítico
              </p>
           </div>
           <div className="mt-6 text-[9px] font-black uppercase bg-white/10 p-3 rounded-xl border border-white/10">
              Urgência: {metrics.atrasados > 5 ? 'MÁXIMA' : 'MÉDIA'}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GARGALOS POR CATEGORIA */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] p-8 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[400px]">
           <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest mb-10 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> Gargalos por Categoria
           </h3>
           <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={metrics.categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="ENTREGUE" stackId="a" fill={COLORS.ENTREGUE} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="COMPRADO" stackId="a" fill={COLORS.COMPRADO} />
                    <Bar dataKey="PENDENTE" stackId="a" fill={COLORS.PENDENTE} radius={[0, 4, 4, 0]} />
                    <Legend wrapperStyle={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: '900', paddingTop: '20px' }} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* PERFORMANCE DE FORNECEDORES (TOP 6) */}
        <div className="bg-[var(--bg-card)] p-10 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[550px]">
           <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest mb-10 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Performance de Fornecedores
           </h3>
           <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {metrics.vendorData.map((vendor, idx) => (
                <div key={idx} className="group">
                   <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase truncate max-w-[180px]">{vendor.name}</p>
                        <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{vendor.total} Itens Vinculados</p>
                      </div>
                      <span className={`text-[10px] font-black ${vendor.efficiency === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {vendor.efficiency}%
                      </span>
                   </div>
                   <div className="w-full h-2.5 bg-[var(--bg-inner)] rounded-full overflow-hidden border border-[var(--border-color)] p-0.5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${vendor.efficiency}%` }} 
                        className={`h-full rounded-full ${vendor.efficiency > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      />
                   </div>
                </div>
              ))}
              {metrics.vendorData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/30 gap-4">
                  <PackageSearch className="w-12 h-12 opacity-30" />
                  <p className="text-[10px] font-black uppercase">Nenhum fornecedor identificado</p>
                </div>
              )}
           </div>
        </div>

        {/* CURVA S DE PERFORMANCE */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-10 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[550px]">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-600" /> Curva S de Suprimentos
              </h3>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Realizado</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--text-secondary)]/20" />
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Previsto</span>
                 </div>
              </div>
           </div>
           <div className="flex-1 w-full">
              {metrics.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={metrics.timelineData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                      />
                      <Area type="monotone" dataKey="previsto" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.2)" strokeWidth={2} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="realizado" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8 }} />
                   </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/30 gap-6">
                   <div className="p-6 bg-[var(--bg-inner)] rounded-full"><ListChecks className="w-10 h-10 opacity-30" /></div>
                   <p className="text-[10px] font-black uppercase max-w-[250px] text-center leading-relaxed">
                      Preencha a coluna de <span className="text-indigo-600">PREVISÃO</span> nas linhas da planilha para habilitar a Curva S de evolução.
                   </p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportView;
