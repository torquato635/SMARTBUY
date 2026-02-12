
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, Package, ShoppingCart, 
  TrendingUp, Users, Activity, Clock, ShieldCheck,
  Layers, CalendarDays, AlertCircle, Heart, ReceiptText
} from 'lucide-react';
import { ProcurementItem, CATEGORY_CONFIG } from '../types';

interface ManagerialReportViewProps {
  items: ProcurementItem[];
  projectName: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  'PENDENTE': '#cbd5e1',
  'EM ORCAMENTO': '#3b82f6',
  'COMPRADO': '#4f46e5',
  'ENTREGUE': '#10b981'
};

const ManagerialReportView: React.FC<ManagerialReportViewProps> = ({ items, projectName }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const total = items.length;
    const pendentes = items.filter(i => i.status === 'PENDENTE').length;
    const orcamento = items.filter(i => i.status === 'EM ORCAMENTO').length;
    const comprados = items.filter(i => i.status === 'COMPRADO').length;
    const entregues = items.filter(i => i.status === 'ENTREGUE').length;
    const atrasados = items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < todayStr).length;

    const purchaseProg = total > 0 ? Math.round(((comprados + entregues) / total) * 100) : 0;
    const deliveryProg = total > 0 ? Math.round((entregues / total) * 100) : 0;

    // Status Distribution
    const statusData = [
      { name: 'Pendente', value: pendentes, fill: STATUS_COLORS['PENDENTE'] },
      { name: 'Orçamento', value: orcamento, fill: STATUS_COLORS['EM ORCAMENTO'] },
      { name: 'Comprado', value: comprados, fill: STATUS_COLORS['COMPRADO'] },
      { name: 'Entregue', value: entregues, fill: STATUS_COLORS['ENTREGUE'] }
    ].filter(d => d.value > 0);

    // Health Indicators
    const withSupplier = items.filter(i => i.supplier && i.supplier !== '').length;
    const withOrder = items.filter(i => i.orderNumber && i.orderNumber !== '').length;
    const supplierRate = total > 0 ? Math.round((withSupplier / total) * 100) : 0;
    const orderRate = total > 0 ? Math.round((withOrder / total) * 100) : 0;
    
    // Overall Project Health
    let healthStatus = 'Excelente';
    let healthColor = 'text-emerald-600';
    if (atrasados > total * 0.1 || deliveryProg < 20) {
      healthStatus = 'Alerta';
      healthColor = 'text-amber-600';
    }
    if (atrasados > total * 0.3) {
      healthStatus = 'Crítico';
      healthColor = 'text-rose-600';
    }

    // Category Performance
    const categoryData = Object.entries(CATEGORY_CONFIG)
      .filter(([key]) => key !== 'All')
      .map(([key, config]) => {
        const catItems = items.filter(i => 
          config.keywords.some(kw => i.sheetName.toUpperCase().includes(kw.toUpperCase()))
        );
        const catTotal = catItems.length;
        const catDelivered = catItems.filter(i => i.status === 'ENTREGUE').length;
        const catProg = catTotal > 0 ? Math.round((catDelivered / catTotal) * 100) : 0;
        return { name: config.label, total: catTotal, entregue: catDelivered, prog: catProg };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);

    // Top Suppliers
    const supplierCounts: Record<string, number> = {};
    items.forEach(i => {
      const s = i.supplier || 'NÃO DEFINIDO';
      supplierCounts[s] = (supplierCounts[s] || 0) + 1;
    });
    const supplierData = Object.entries(supplierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Arrival Timeline (Monthly)
    const arrivalMap: Record<string, number> = {};
    items.forEach(i => {
      if (i.expectedArrival) {
        const date = i.expectedArrival.substring(0, 7); // YYYY-MM
        arrivalMap[date] = (arrivalMap[date] || 0) + 1;
      }
    });
    const arrivalTimeline = Object.entries(arrivalMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Critical items with delay calculation
    const criticalItems = items
      .filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < todayStr)
      .map(i => {
        const arrDate = new Date(i.expectedArrival!);
        const diffTime = Math.abs(today.getTime() - arrDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...i, delay: diffDays };
      })
      .sort((a, b) => b.delay - a.delay)
      .slice(0, 15);

    return { 
      total, pendentes, orcamento, comprados, entregues, atrasados, 
      purchaseProg, deliveryProg, statusData, categoryData, 
      supplierData, arrivalTimeline, criticalItems,
      supplierRate, orderRate, healthStatus, healthColor
    };
  }, [items, todayStr]);

  const KpiCard = ({ icon: Icon, label, value, sub, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-black text-slate-800">{value}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 5 KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <KpiCard icon={Package} label="Total Itens" value={metrics.total} sub="Escopo total" color="bg-indigo-50 text-indigo-600" />
        <KpiCard icon={ShoppingCart} label="Comprados" value={metrics.comprados} sub="Em trânsito/produção" color="bg-blue-50 text-blue-600" />
        <KpiCard icon={CheckCircle2} label="Entregues" value={metrics.entregues} sub={`${metrics.deliveryProg}% do total`} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Activity} label="Pendentes" value={metrics.pendentes + metrics.orcamento} sub="Ação necessária" color="bg-slate-50 text-slate-500" />
        <KpiCard icon={AlertTriangle} label="Atrasados" value={metrics.atrasados} sub="Críticos em risco" color="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gauge Radial & Pizza */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Evolução & Status
          </h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full aspect-square max-w-[200px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Purchased', value: metrics.purchaseProg },
                      { name: 'Remaining', value: 100 - metrics.purchaseProg }
                    ]}
                    cx="50%" cy="50%" innerRadius={65} outerRadius={85} startAngle={90} endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#4f46e5" stroke="none" />
                    <Cell fill="#f1f5f9" stroke="none" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-indigo-600">{metrics.purchaseProg}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Progresso</span>
              </div>
            </div>

            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.statusData}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    paddingAngle={5} dataKey="value"
                  >
                    {metrics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-4">
               {metrics.statusData.map(s => (
                 <div key={s.name} className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ background: s.fill }}></div>
                   <span className="text-[9px] font-black text-slate-500 uppercase">{s.name}: {s.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Operational Health & Category Progress */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Saúde & Categorias
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Saúde do Projeto:</span>
              <span className={`text-[11px] font-black uppercase ${metrics.healthColor}`}>{metrics.healthStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                   <Users className="w-4 h-4" />
                   <span className="text-[9px] font-black uppercase">Definição Fornecedores</span>
                </div>
                <p className="text-xl font-black text-slate-800">{metrics.supplierRate}%</p>
                <div className="w-full h-1 bg-slate-200 rounded-full mt-2">
                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${metrics.supplierRate}%` }}></div>
                </div>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                   <ReceiptText className="w-4 h-4" />
                   <span className="text-[9px] font-black uppercase">Emissão de Ordens</span>
                </div>
                <p className="text-xl font-black text-slate-800">{metrics.orderRate}%</p>
                <div className="w-full h-1 bg-slate-200 rounded-full mt-2">
                   <div className="h-full bg-blue-500 rounded-full" style={{ width: `${metrics.orderRate}%` }}></div>
                </div>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                   <CheckCircle2 className="w-4 h-4" />
                   <span className="text-[9px] font-black uppercase">Taxa de Entrega</span>
                </div>
                <p className="text-xl font-black text-slate-800">{metrics.deliveryProg}%</p>
                <div className="w-full h-1 bg-slate-200 rounded-full mt-2">
                   <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.deliveryProg}%` }}></div>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progresso por Categoria</h4>
            <div className="space-y-5">
              {metrics.categoryData.map((cat, idx) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-600">{cat.name}</span>
                    <span className="text-indigo-600">{cat.prog}% ({cat.entregue}/{cat.total})</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${cat.prog}%`, background: COLORS[idx % COLORS.length] }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Arrival Chronogram Area Chart */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" /> Cronograma de Chegadas (Mensal)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.arrivalTimeline}>
                <defs>
                  <linearGradient id="colorArrival" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorArrival)" name="Itens Previstos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers Horizontal Bar Chart */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Top Fornecedores (Concentração)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.supplierData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Itens" barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical atrasados Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-rose-50/20">
          <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Itens em Atraso Crítico
          </h3>
          <span className="text-[10px] font-black text-rose-500 uppercase px-4 py-1.5 bg-white border border-rose-100 rounded-full shadow-sm">
            {metrics.atrasados} Ocorrências
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase font-black text-slate-400">
              <tr>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Atraso</th>
                <th className="px-8 py-5">CÓDIGO / DESCRIÇÃO</th>
                <th className="px-8 py-5">FORNECEDOR</th>
                <th className="px-8 py-5">ORDEM</th>
                <th className="px-8 py-5">PREVISÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.criticalItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400 font-bold uppercase tracking-widest italic">Nenhum item em atraso detectado.</td>
                </tr>
              ) : (
                metrics.criticalItems.map(item => (
                  <tr key={item.id} className="hover:bg-rose-50/10 transition-colors">
                    <td className="px-8 py-5">
                       <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-black text-[9px]">{item.delay} DIAS</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-mono font-bold text-slate-500 mb-0.5">{item.partNumber}</div>
                      <div className="font-black text-slate-800 uppercase text-[11px] truncate max-w-xs">{item.description}</div>
                    </td>
                    <td className="px-8 py-5 font-bold text-indigo-600 uppercase">{item.supplier}</td>
                    <td className="px-8 py-5 font-mono font-bold">{item.orderNumber}</td>
                    <td className="px-8 py-5 text-rose-600 font-black">{item.expectedArrival}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          Plataforma SmartBuy - Decisões baseadas em dados
        </div>
        <span>Relatório Gerencial - Projeto: {projectName} - {new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};

export default ManagerialReportView;
