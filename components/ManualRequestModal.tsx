import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, FileSpreadsheet, Package, Factory } from 'lucide-react';
import { ItemType, ManualRequest } from '../types';
import { normalizeString } from '../utils';

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  addManualRequest: (req: ManualRequest) => void;
}

const ManualRequestModal: React.FC<ManualRequestModalProps> = ({ isOpen, onClose, addManualRequest }) => {
  const [manualForm, setManualForm] = useState({ 
    project: '', 
    code: '', 
    description: '', 
    quantity: '',
    brand: '',
    type: ItemType.COMERCIAL
  });
  const excelImportRef = useRef<HTMLInputElement>(null);

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.project || !manualForm.code || !manualForm.description || !manualForm.quantity) {
      alert("Todos os campos básicos são obrigatórios.");
      return;
    }

    const newReq: ManualRequest = {
      id: `REQ-${Date.now()}`,
      project: normalizeString(manualForm.project),
      code: normalizeString(manualForm.code),
      description: normalizeString(manualForm.description),
      quantity: Number(manualForm.quantity),
      brand: normalizeString(manualForm.brand),
      type: manualForm.type,
      timestamp: new Date().toLocaleDateString('pt-BR'),
      status: 'PENDENTE'
    };

    addManualRequest(newReq);
    setManualForm({ 
      project: '', 
      code: '', 
      description: '', 
      quantity: '', 
      brand: '', 
      type: ItemType.COMERCIAL 
    });
    onClose();
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = (window as any).XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = (window as any).XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("A planilha está vazia.");
          return;
        }

        let importedCount = 0;
        data.forEach((row: any) => {
          const findVal = (keys: string[]) => {
            const key = Object.keys(row).find(k => keys.some(target => k.toLowerCase().trim() === target.toLowerCase()));
            return key ? row[key] : null;
          };

          const project = findVal(['projeto', 'project', 'obra']);
          const code = findVal(['código', 'codigo', 'code', 'pn', 'part number']);
          const desc = findVal(['descrição', 'descricao', 'description', 'item']);
          const qtd = findVal(['quantidade', 'qtd', 'quantity', 'amount']);
          const brand = findVal(['marca', 'brand', 'fabricante', 'fornecedor']);

          if (project && code && desc && qtd) {
            const newReq: ManualRequest = {
              id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              project: normalizeString(String(project)),
              code: normalizeString(String(code)),
              description: normalizeString(String(desc)),
              quantity: Number(qtd),
              brand: brand ? normalizeString(String(brand)) : '',
              type: ItemType.COMERCIAL,
              timestamp: new Date().toLocaleDateString('pt-BR'),
              status: 'PENDENTE'
            };
            addManualRequest(newReq);
            importedCount++;
          }
        });

        alert(`${importedCount} itens importados com sucesso!`);
        onClose();
      } catch (error) {
        console.error("Erro ao importar Excel:", error);
        alert("Erro ao ler o arquivo Excel. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl max-w-lg w-full p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm"><Send className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight leading-none">Solicitação</h2>
              <p className="text-[var(--text-secondary)] text-[8px] font-bold uppercase tracking-widest mt-1">Registro de demanda manual</p>
            </div>
          </div>
          <button 
            onClick={() => excelImportRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Importar</span>
          </button>
          <input type="file" ref={excelImportRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
        </div>

        <form onSubmit={handleManualSave} className="space-y-4">
          <div className="flex items-center gap-2 p-1 bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl">
            <button 
              type="button"
              onClick={() => setManualForm({...manualForm, type: ItemType.COMERCIAL})}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${manualForm.type === ItemType.COMERCIAL ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Package className="w-3.5 h-3.5" /> COMERCIAL
            </button>
            <button 
              type="button"
              onClick={() => setManualForm({...manualForm, type: ItemType.FABRICADO})}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${manualForm.type === ItemType.FABRICADO ? 'bg-emerald-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Factory className="w-3.5 h-3.5" /> FABRICADO
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Projeto Destino</label>
            <input 
              type="text" 
              required
              placeholder="Identificação do Projeto"
              value={manualForm.project}
              onChange={e => setManualForm({...manualForm, project: e.target.value})}
              className="w-full bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--text-primary)] font-black uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-[var(--text-secondary)]/30 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Código (P/N)</label>
              <input 
                type="text" 
                required
                placeholder="EX: PN-001"
                value={manualForm.code}
                onChange={e => setManualForm({...manualForm, code: e.target.value})}
                className="w-full bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--text-primary)] font-black uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Quantidade</label>
              <input 
                type="number" 
                required
                min="1"
                placeholder="0"
                value={manualForm.quantity}
                onChange={e => setManualForm({...manualForm, quantity: e.target.value})}
                className="w-full bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--text-primary)] font-black outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Marca / Fornecedor</label>
            <input 
              type="text" 
              placeholder="Identificação do Fornecedor"
              value={manualForm.brand}
              onChange={e => setManualForm({...manualForm, brand: e.target.value})}
              className="w-full bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--text-primary)] font-black uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Descrição do Item</label>
            <textarea 
              required
              rows={2}
              placeholder="O que deseja comprar?"
              value={manualForm.description}
              onChange={e => setManualForm({...manualForm, description: e.target.value})}
              className="w-full bg-[var(--bg-inner)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--text-primary)] font-black uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30 text-xs resize-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mt-4"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Registrar Solicitação</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ManualRequestModal;
