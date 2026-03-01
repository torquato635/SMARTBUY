import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Users, 
  Trophy,
  ShieldCheck,
  Clock,
  Award,
  Star,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingUp
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { ProcurementItem, ItemType } from '../types';
import { parseDate } from '../utils';

interface AnalysesViewProps {
  items: ProcurementItem[];
  onUpdateItem: (itemId: string, updates: Partial<ProcurementItem>) => void;
}

const AnalysesView: React.FC<AnalysesViewProps> = ({ items, onUpdateItem }) => {
  const [activeTab, setActiveTab] = useState<'srm' | 'gargalos' | 'insights'>('srm');

  const today = new Date().toISOString().split('T')[0];

  // 1. SRM - Gestão de Performance de Fornecedores
  const vendorPerformance = useMemo(() => {
    const vendors: Record<string, { total: number, delivered: number, onTime: number, totalLeadTime: number, qualitySum: number }> = {};
    
    items.forEach(item => {
      const s = item.supplier?.trim();
      if (s && s !== '-') {
        if (!vendors[s]) vendors[s] = { total: 0, delivered: 0, onTime: 0, totalLeadTime: 0, qualitySum: 0 };
        vendors[s].total++;
        
        if (item.status === 'ENTREGUE') {
          vendors[s].delivered++;
          // Simulação de qualidade baseada no status (em um sistema real seria um input)
          vendors[s].qualitySum += 5; 
          
          const expected = parseDate(item.expectedArrival);
          const actual = parseDate(item.actualArrivalDate);

          if (expected && actual) {
            if (actual <= expected) {
              vendors[s].onTime++;
            }
          } else if (expected && !actual) {
             // Se entregue mas sem data real, assumimos no prazo para o MVP
             vendors[s].onTime++;
          }
        }
      }
    });

    return Object.entries(vendors).map(([name, stats]) => {
      const deliveryRate = (stats.onTime / stats.delivered) * 100 || 0;
      const completionRate = (stats.delivered / stats.total) * 100 || 0;
      const avgQuality = stats.delivered > 0 ? stats.qualitySum / stats.delivered : 0;
      
      // Score final de 1 a 5 estrelas
      const score = ((deliveryRate / 20) + (completionRate / 20) + avgQuality) / 3;
      const stars = Math.max(1, Math.min(5, Math.round(score)));

      return { name, stars, deliveryRate, completionRate, total: stats.total };
    }).sort((a, b) => b.stars - a.stars || b.deliveryRate - a.deliveryRate);
  }, [items]);

  // 2. Gargalos Críticos - Top 10
  const criticalBottlenecks = useMemo(() => {
    return items
      .filter(item => item.status !== 'ENTREGUE')
      .map(item => {
        let riskScore = 0;
        const expected = parseDate(item.expectedArrival);

        if (item.status === 'PENDENTE') riskScore += 50;
        if (expected && expected < today) riskScore += 100;
        if (item.type === ItemType.FABRICADO) riskScore += 30;
        
        return { ...item, riskScore, parsedExpected: expected };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [items, today]);

  // 3. Insights - Gráficos
  const statusData = useMemo(() => {
    const counts = { PENDENTE: 0, COMPRADO: 0, ENTREGUE: 0 };
    items.forEach(item => {
      if (counts.hasOwnProperty(item.status)) {
        counts[item.status as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Pendente', value: counts.PENDENTE, color: '#f59e0b' },
      { name: 'Comprado', value: counts.COMPRADO, color: '#6366f1' },
      { name: 'Entregue', value: counts.ENTREGUE, color: '#10b981' },
    ];
  }, [items]);

  const projectDistribution = useMemo(() => {
    const projects: Record<string, number> = {};
    items.forEach(item => {
      const sheetName = item.sheetName || 'Sem Projeto';
      projects[sheetName] = (projects[sheetName] || 0) + 1;
    });
    return Object.entries(projects)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [items]);

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight uppercase">Análises Estratégicas</h1>
          <p className="text-[var(--text-secondary)] font-bold uppercase text-xs mt-1">Inteligência de Suprimentos e Gestão de Riscos</p>
        </div>
        
        <div className="flex glass-card p-1.5 rounded-2xl border border-[var(--border-color)] corporate-shadow">
          <button 
            onClick={() => setActiveTab('srm')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'srm' ? 'bg-emerald-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-emerald-500'}`}
          >
            <Users className="w-4 h-4" /> Performance por Fornecedor
          </button>
          <button 
            onClick={() => setActiveTab('gargalos')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'gargalos' ? 'bg-rose-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-rose-500'}`}
          >
            <AlertCircle className="w-4 h-4" /> Gargalos Críticos
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-indigo-500'}`}
          >
            <PieChartIcon className="w-4 h-4" /> Insights de Dados
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'srm' && (
          <motion.div 
            key="srm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {vendorPerformance.map((vendor, idx) => (
              <div key={vendor.name} className="glass-card p-6 rounded-[1.5rem] border border-[var(--border-color)] corporate-shadow hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Trophy className="w-16 h-16" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${idx === 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {idx === 0 ? <Award className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-primary)] uppercase truncate max-w-[150px]">{vendor.name}</h3>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < vendor.stars ? 'fill-amber-400 text-amber-400' : 'text-[var(--border-color)]'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                      <span className="text-[var(--text-secondary)]">Pontualidade</span>
                      <span className="text-emerald-500">{Math.round(vendor.deliveryRate)}%</span>
                    </div>
                    <div className="w-full h-1 glass-inner rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${vendor.deliveryRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                      <span className="text-[var(--text-secondary)]">Conclusão de Pedidos</span>
                      <span className="text-indigo-500">{Math.round(vendor.completionRate)}%</span>
                    </div>
                    <div className="w-full h-1 glass-inner rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${vendor.completionRate}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">{vendor.total} Projetos Atendidos</span>
                  <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black rounded-full uppercase">Ativo</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'gargalos' && (
          <motion.div 
            key="gargalos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-[2.5rem] border border-[var(--border-color)] corporate-shadow overflow-hidden"
          >
            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between glass-inner">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><AlertCircle className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] uppercase">Top 10 Gargalos Críticos</h2>
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Itens com maior risco de parada de linha</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-rose-500/10 text-rose-600 text-[10px] font-black rounded-xl uppercase border border-rose-500/20">Ação Imediata</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="glass-inner text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">
                    <th className="px-8 py-5">Item / Descrição</th>
                    <th className="px-8 py-5">Projeto</th>
                    <th className="px-8 py-5">Status Atual</th>
                    <th className="px-8 py-5">Previsão</th>
                    <th className="px-8 py-5 text-center">Nível de Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {criticalBottlenecks.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-500/5 transition-colors">
                      <td className="px-8 py-5">
                        <div className="max-w-md">
                          <p className="font-black text-xs uppercase text-[var(--text-primary)] truncate">{item.description}</p>
                          <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">{item.partNumber}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black rounded-lg uppercase">{item.sheetName}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${item.status === 'PENDENTE' ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${item.parsedExpected && item.parsedExpected < today ? 'text-rose-500' : 'text-[var(--text-secondary)]'}`} />
                          <span className={`text-[10px] font-black ${item.parsedExpected && item.parsedExpected < today ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>
                            {item.parsedExpected ? item.parsedExpected.split('-').reverse().join('/') : 'NÃO DEFINIDA'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex-1 max-w-[100px] h-2 glass-inner rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.riskScore > 100 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, item.riskScore / 1.5)}%` }} />
                          </div>
                          <span className={`text-[10px] font-black ${item.riskScore > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {item.riskScore > 100 ? 'CRÍTICO' : 'ALTO'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div 
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Status Distribution */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-[var(--border-color)] corporate-shadow">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><PieChartIcon className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Distribuição de Status</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Visão geral do fluxo de suprimentos</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-color)',
                        borderRadius: '16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        backdropFilter: 'blur(10px)'
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-[10px] font-black uppercase text-[var(--text-secondary)]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Project Distribution */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-[var(--border-color)] corporate-shadow">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><BarChartIcon className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Top 5 Projetos</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Volume de itens por projeto</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectDistribution} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-color)',
                        borderRadius: '16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 10, 10, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysesView;
