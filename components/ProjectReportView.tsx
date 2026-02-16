
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
  Sparkles, Users, Calendar, ArrowUpRight,
  TrendingDown, Info, ShieldAlert,
  Database, ListChecks
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';
import { getProjectStrategicInsights } from '../services/geminiService';

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
  const [aiInsights, setAiInsights] = useState<string>('O Diretor de IA está analisando os dados de suprimentos...');
  const [loadingAi, setLoadingAi] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingAi(true);
      const text = await getProjectStrategicInsights(items, projectName);
      setAiInsights(text || "Sem análise disponível.");
      setLoadingAi(false);
    };
    if (items.length > 0) fetchInsights();
  }, [projectName, items.length]);

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
    <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
       <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
       <p className="text-slate-500 font-black uppercase text-xs">Aguardando dados para gerar o relatório...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-16 animate-fade-in print:bg-white">
      
      {/* ALERTA DE INTEGRIDADE (Check do Comprador) */}
      {(metrics.itemsSemData > 0 || metrics.itemsSemFornecedor > (metrics.total * 0.3)) && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4 print:hidden shadow-sm">
           <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl"><ShieldAlert className="w-6 h-6" /></div>
           <div>
              <h4 className="text-sm font-black text-amber-900 uppercase mb-1">Atenção: Integridade dos Dados</h4>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Detectamos que <span className="font-bold">{metrics.itemsSemData} itens comprados</span> estão sem data de previsão e <span className="font-bold">{metrics.itemsSemFornecedor} itens</span> estão sem fornecedor. 
                Isso compromete a precisão da Curva S e da análise de riscos da IA.
              </p>
           </div>
        </motion.div>
      )}

      {/* HEADER E SCORE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-50 text-indigo-800 rounded-lg"><Activity className="w-5 h-5" /></div>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel de Controle de Suprimentos</h3>
              </div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4">{projectName}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-8">
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entregas Físicas</p>
                    <div className="flex items-center gap-2">
                       <span className="text-3xl font-black text-emerald-600">{metrics.physicalProgress}%</span>
                       <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Carteira de Pedidos</p>
                    <span className="text-3xl font-black text-indigo-600">{metrics.orderProgress}%</span>
                 </div>
                 <div className="hidden md:block">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Itens Totais</p>
                    <span className="text-3xl font-black text-slate-900">{metrics.total}</span>
                 </div>
              </div>
           </div>
           
           <div className="relative group">
              <div className="w-40 h-40 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center shadow-inner bg-white ring-1 ring-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">SCORE</span>
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
        
        {/* IA PROCUREMENT ADVISOR (Gemini 3 Pro) */}
        <div className="lg:col-span-2 bg-slate-950 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
           <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                 <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" /> Gemini Strategic Advisor 3.0
              </h3>
              {loadingAi && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
           </div>
           <div className="p-10 flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
              <div className="text-[13px] leading-relaxed text-slate-300 font-medium space-y-4">
                {aiInsights.split('\n').map((line, i) => {
                  if (line.startsWith('#')) return <h4 key={i} className="text-emerald-400 font-black uppercase text-sm mt-8 mb-4 tracking-widest border-b border-emerald-900/50 pb-2">{line.replace(/#/g, '').trim()}</h4>;
                  if (line.startsWith('-') || line.startsWith('*')) return <li key={i} className="ml-4 mb-2 text-slate-300 list-disc">{line.replace(/^[-*]\s*/, '').trim()}</li>;
                  return <p key={i} className="mb-2">{line}</p>;
                })}
              </div>
           </div>
        </div>

        {/* GARGALOS POR CATEGORIA (Novo Funcional) */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[600px]">
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-10 flex items-center gap-2">
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
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[550px]">
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-10 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Performance de Fornecedores
           </h3>
           <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {metrics.vendorData.map((vendor, idx) => (
                <div key={idx} className="group">
                   <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[180px]">{vendor.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{vendor.total} Itens Vinculados</p>
                      </div>
                      <span className={`text-[10px] font-black ${vendor.efficiency === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {vendor.efficiency}%
                      </span>
                   </div>
                   <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${vendor.efficiency}%` }} 
                        className={`h-full rounded-full ${vendor.efficiency > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      />
                   </div>
                </div>
              ))}
              {metrics.vendorData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <PackageSearch className="w-12 h-12 opacity-30" />
                  <p className="text-[10px] font-black uppercase">Nenhum fornecedor identificado</p>
                </div>
              )}
           </div>
        </div>

        {/* CURVA S DE PERFORMANCE (PREVISTO VS REAL) */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[550px]">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-600" /> Curva S de Suprimentos
              </h3>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Realizado</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Previsto</span>
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
                      <Area type="monotone" dataKey="previsto" fill="#f8fafc" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="realizado" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8 }} />
                   </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                   <div className="p-6 bg-slate-50 rounded-full"><ListChecks className="w-10 h-10 opacity-30" /></div>
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
