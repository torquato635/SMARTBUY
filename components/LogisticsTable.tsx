import React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { Check, CheckCircle2, AlertCircle, Clock, Search } from 'lucide-react';
import DateInput from './DateInput';
import { ProcurementItem } from '../types';

interface LogisticsTableProps {
  items: ProcurementItem[];
  today: string;
  updateItemOrderInfo: (id: string, info: any) => void;
  isTodayFilterActive: boolean;
  logisticsGlobalSearch: string;
}

const LogisticsTable: React.FC<LogisticsTableProps> = ({ items, today, updateItemOrderInfo, isTodayFilterActive, logisticsGlobalSearch }) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden animate-fade-in h-[600px] flex flex-col">
       <div className="p-6 bg-[var(--bg-inner)] border-b border-[var(--border-color)] flex items-center justify-between print:hidden shrink-0">
          <h2 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-widest flex items-center gap-2">
            <Search className="w-4 h-4" /> {isTodayFilterActive ? 'ITENS PARA HOJE' : 'RESULTADOS'} {logisticsGlobalSearch ? `: "${logisticsGlobalSearch.toUpperCase()}"` : ''}
          </h2>
          <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase">{items.length} Itens</span>
       </div>
       <div className="flex-1">
        <TableVirtuoso
          data={items}
          components={{
            Table: (props) => <table {...props} className="w-full text-left border-collapse min-w-[1100px]" />,
            TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="bg-[var(--bg-inner)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest sticky top-0 z-10" />),
            TableRow: (props) => <tr {...props} className={`hover:bg-[var(--bg-inner)] transition-colors ${props['data-item'].status === 'ENTREGUE' ? 'bg-emerald-500/5' : ''}`} />,
          }}
          fixedHeaderContent={() => (
            <tr>
              <th className="px-8 py-4 bg-[var(--bg-inner)]">Projeto</th>
              <th className="px-8 py-4 w-40 bg-[var(--bg-inner)]">Ordem (OC)</th>
              <th className="px-8 py-4 bg-[var(--bg-inner)]">Descrição e Código</th>
              <th className="px-8 py-4 text-center bg-[var(--bg-inner)]">Qtd</th>
              <th className="px-4 py-4 text-center w-32 bg-[var(--bg-inner)]">Previsão</th>
              <th className="px-4 py-4 w-44 bg-[var(--bg-inner)]">Nota Fiscal (NF)</th>
              <th className="px-4 py-4 w-40 bg-[var(--bg-inner)]">Status</th>
            </tr>
          )}
          itemContent={(index, item) => {
             const isAtrasado = item.expectedArrival && item.expectedArrival < today && item.status !== 'ENTREGUE';
             return (
               <>
                  <td className="px-8 py-4"><span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{(item as any).projectName}</span></td>
                  <td className="px-8 py-4">
                    <input type="text" value={item.orderNumber || ''} readOnly className="w-full px-3 py-2 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-lg text-xs font-black uppercase outline-none text-[var(--text-secondary)]" />
                  </td>
                  <td className="px-8 py-4">
                     <div className="max-w-md">
                       <p className="font-black text-xs uppercase text-[var(--text-primary)] truncate">{item.description}</p>
                       <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                          <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">{item.partNumber}</span>
                          <span className="text-[11px] font-bold text-emerald-500 uppercase">| {item.supplier || 'S/ FORNECEDOR'}</span>
                       </div>
                     </div>
                  </td>
                  <td className="px-8 py-4 text-center font-black text-[var(--text-secondary)] text-xs">{item.quantity}</td>
                  <td className="px-4 py-4 text-center">
                     <DateInput value={item.expectedArrival || ''} readOnly className={`px-3 py-2 border rounded-lg text-xs font-black outline-none ${isAtrasado ? 'border-rose-900 bg-rose-500/10 text-rose-500' : 'border-[var(--border-color)] bg-[var(--bg-inner)] text-[var(--text-secondary)]'}`} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative group">
                      <input type="text" placeholder="Nº DA NOTA..." value={item.invoiceNumber || ''} onChange={(e) => updateItemOrderInfo(item.id, { invoiceNumber: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg-inner)] border-2 border-[var(--border-color)] rounded-xl text-xs font-black uppercase focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm text-[var(--text-primary)]" />
                      {item.invoiceNumber && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                     {item.status === 'ENTREGUE' ? (
                        <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-emerald-500/20 whitespace-nowrap"><CheckCircle2 className="w-3.5 h-3.5" /> RECEBIDO</span>
                     ) : (
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border whitespace-nowrap ${isAtrasado ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          {isAtrasado ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {isAtrasado ? 'ATRASADO' : 'A RECEBER'}
                        </span>
                     )}
                  </td>
               </>
             );
          }}
        />
       </div>
    </div>
  );
};

export default LogisticsTable;
