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
import { parseDate } from '../utils';

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

    // Função auxiliar para alinhar com a lógica do App.tsx
    const getItemCategory = (item: ProcurementItem) => {
      const normalize = (str: string) => str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const uSheet = normalize(item.sheetName || "");
      
      for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
        if (key === 'All' || key === 'FABRICADOS') continue;
        if (config.keywords.some(kw => uSheet.includes(normalize(kw)))) {
          return key;
        }
      }
      if (item.type === 'Fabricado' || item.type?.toString() === 'Fabricado') return 'FABRICADOS';
      return null;
    };

    const total = items.length;
    const pendentes = items.filter(i => i.status === 'PENDENTE').length;
    const comprados = items.filter(i => i.status === 'COMPRADO').length;
    const entregues = items.filter(i => i.status === 'ENTREGUE').length;
    
    const atrasados = items.filter(i => {
      const expected = parseDate(i.expectedArrival);
      return i.status === 'COMPRADO' && 
             expected && 
             expected < today;
    }).length;
    
    const itemsSemData = items.filter(i => i.status === 'COMPRADO' && !parseDate(i.expectedArrival)).length;
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
        const catItems = items.filter(i => getItemCategory(i) === key);
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
      if (s && s !== '-' && s.length > 1) {
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

    // Timeline S-Curve - Melhorada para garantir exibição
    const dates = [...new Set(items.map(i => parseDate(i.expectedArrival)).filter((d): d is string => !!d))].sort();
    
    let timelineData: any[] = [];
    if (dates.length > 0) {
      timelineData = dates.map((date: string) => {
        // Itens que deveriam ter chegado até esta data
        const itemsDue = items.filter(i => {
            const d = parseDate(i.expectedArrival);
            return d && d <= date;
        });

        // Desses itens, quantos foram entregues? (Schedule Adherence)
        // Ou melhor: quantos itens NO TOTAL foram entregues até essa data? (Cumulative Delivery)
        // Se usarmos actualArrivalDate, podemos fazer uma curva real histórica.
        // Se não tivermos actualArrivalDate, usamos status 'ENTREGUE' como proxy (mas isso reescreve a história).
        // Vamos tentar usar actualArrivalDate se disponível, senão fallback para status.
        
        // Opção 1: Schedule Adherence (O que foi planejado vs O que foi feito DO QUE FOI PLANEJADO)
        // Opção 2: Cumulative Progress (Total planejado vs Total realizado independente da data planejada)
        
        // Vamos usar Cumulative Progress (Opção 2) que é mais comum em Curva S.
        
        const totalPlanned = itemsDue.length;
        
        // Para o realizado, idealmente precisamos saber QUANDO foi entregue.
        // Se não temos actualArrivalDate, não podemos plotar o passado corretamente.
        // Mas o código original fazia itemsDue.filter(ENTREGUE). Isso mostra "dos que eram pra hoje, quantos chegaram?".
        // Isso é útil para ver atrasos acumulados.
        
        const totalDeliveredFromDue = itemsDue.filter(i => i.status === 'ENTREGUE').length;

        return {
          date: date.split('-').reverse().slice(0, 2).join('/'),
          previsto: Math.round((totalPlanned / total) * 100),
          realizado: Math.round((totalDeliveredFromDue / total) * 100)
        };
      });
    }

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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl flex items-center gap-4 print:hidden">
           <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>
           <div className="flex-1">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Integridade dos Dados</h4>
              <p className="text-[11px] text-amber-700/80 font-bold uppercase mt-0.5">
                {metrics.itemsSemData} itens sem data e {metrics.itemsSemFornecedor} sem fornecedor detectados.
              </p>
           </div>
        </motion.div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="bg-[var(--bg-card)] p-10 rounded-[3rem] border border-[var(--border-color)] shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Target className="w-64 h-64 rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">Relatório Executivo</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          
          <h1 className="text-5xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none mb-10 max-w-4xl">{projectName}</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Progresso Físico</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-emerald-600 leading-none">{metrics.physicalProgress}%</span>
                <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Carteira de Pedidos</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-indigo-600 leading-none">{metrics.orderProgress}%</span>
                <div className="w-2 h-2 rounded-full bg-indigo-500 mb-2 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Saúde do Projeto</p>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-black leading-none ${metrics.score > 80 ? 'text-emerald-600' : metrics.score > 50 ? 'text-amber-600' : 'text-rose-600'}`}>{metrics.score}</span>
                <span className="text-[10px] font-black uppercase mb-1 opacity-40">/ 100</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Total de Itens</p>
              <span className="text-4xl font-black text-[var(--text-primary)] leading-none">{metrics.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DISTRIBUIÇÃO DE STATUS - PIE CHART */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[450px]">
           <h3 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Distribuição de Status
           </h3>
           <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={metrics.statusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {metrics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '900', paddingTop: '20px' }}
                    />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Total</p>
                <p className="text-3xl font-black text-[var(--text-primary)]">{metrics.total}</p>
              </div>
           </div>
        </div>

        {/* GARGALOS POR CATEGORIA - BAR CHART */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[450px]">
           <h3 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-8 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Gargalos por Categoria
           </h3>
           <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={metrics.categoryData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--text-secondary)' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    />
                    <Bar dataKey="ENTREGUE" stackId="a" fill={COLORS.ENTREGUE} radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="COMPRADO" stackId="a" fill={COLORS.COMPRADO} barSize={24} />
                    <Bar dataKey="PENDENTE" stackId="a" fill={COLORS.PENDENTE} radius={[0, 6, 6, 0]} barSize={24} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="flex items-center justify-center gap-6 mt-4 border-t border-[var(--border-color)] pt-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.ENTREGUE }} />
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Entregue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.COMPRADO }} />
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Comprado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.PENDENTE }} />
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Pendente</span>
              </div>
           </div>
        </div>

        {/* PERFORMANCE DE FORNECEDORES */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[550px]">
           <h3 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-10 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Performance de Fornecedores
           </h3>
           <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {metrics.vendorData.map((vendor, idx) => (
                <div key={idx} className="group">
                   <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[11px] font-black text-[var(--text-primary)] uppercase truncate max-w-[180px]">{vendor.name}</p>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-60">{vendor.total} Itens</p>
                      </div>
                      <span className={`text-[11px] font-black ${vendor.efficiency === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {vendor.efficiency}%
                      </span>
                   </div>
                   <div className="w-full h-2 bg-[var(--bg-inner)] rounded-full overflow-hidden border border-[var(--border-color)]">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${vendor.efficiency}%` }} 
                        className={`h-full rounded-full transition-all duration-1000 ${vendor.efficiency > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      />
                   </div>
                </div>
              ))}
              {metrics.vendorData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/30 gap-4">
                  <PackageSearch className="w-10 h-10 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum fornecedor identificado</p>
                </div>
              )}
           </div>
        </div>

        {/* CURVA S DE PERFORMANCE */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 rounded-[3rem] border border-[var(--border-color)] shadow-sm flex flex-col h-[550px]">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-indigo-600" /> Curva S de Suprimentos
              </h3>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Realizado</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/20" />
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Previsto</span>
                 </div>
              </div>
           </div>
           <div className="flex-1 w-full">
              {metrics.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={metrics.timelineData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="previsto" fill="rgba(99, 102, 241, 0.03)" stroke="rgba(99, 102, 241, 0.15)" strokeWidth={2} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="realizado" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                   </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/20 gap-6">
                   <div className="p-6 bg-[var(--bg-inner)] rounded-full"><ListChecks className="w-10 h-10 opacity-20" /></div>
                   <p className="text-[10px] font-black uppercase max-w-[250px] text-center leading-relaxed tracking-widest">
                      Preencha a coluna de <span className="text-indigo-600">PREVISÃO</span> para habilitar a Curva S.
                   </p>
                </div>
              )}
           </div>
        </div>

        {/* CARD DE ALERTAS / ATRASOS */}
        <div className={`lg:col-span-3 p-10 rounded-[3rem] border-2 flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${metrics.atrasados > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
           <div className="flex items-center gap-6">
              <div className={`p-5 rounded-3xl ${metrics.atrasados > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {metrics.atrasados > 0 ? <AlertOctagon className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
              </div>
              <div>
                <h4 className={`text-2xl font-black uppercase tracking-tight ${metrics.atrasados > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {metrics.atrasados > 0 ? `${metrics.atrasados} Itens em Atraso` : 'Cronograma em Dia'}
                </h4>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">
                  {metrics.atrasados > 0 ? 'Ação imediata necessária para evitar paradas de linha.' : 'Todos os itens comprados estão dentro do prazo previsto.'}
                </p>
              </div>
           </div>
           {metrics.atrasados > 0 && (
             <div className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/30">
                Prioridade Crítica
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ProjectReportView;
