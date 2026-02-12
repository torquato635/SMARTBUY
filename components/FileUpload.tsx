
import React, { useCallback } from 'react';
import { ItemType, ProcurementItem, SheetData } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: SheetData) => void;
}

const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const findValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      const match = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
      if (match) return row[match];
    }
    return null;
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = (window as any).XLSX.read(bstr, { type: 'binary' });
      
      const sheetData: SheetData = {
        fileName: normalizeString(fileNameWithoutExtension),
        sheets: []
      };

      wb.SheetNames.forEach((sheetName: string) => {
        const ws = wb.Sheets[sheetName];
        const data = (window as any).XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) return;

        const items: ProcurementItem[] = data
          .map((row: any, index: number) => {
            const rawDesc = findValue(row, ['Descricao', 'Descrição', 'Item', 'Description', 'Nome']) || '';
            const rawPN = findValue(row, ['Codigo', 'Código', 'PartNumber', 'Part Number', 'PN', 'Ref']) || '';
            
            const description = normalizeString(rawDesc.toString());
            const partNumber = normalizeString(rawPN.toString());

            // Regra estrita: Sem descrição, a linha não existe na plataforma
            if (!description || description === "" || description === "SEM DESCRICAO") {
              return null;
            }

            const assembly = findValue(row, ['Conjunto', 'Conj', 'Assembly', 'Modulo', 'Módulo']) || '-';
            const quantity = Number(findValue(row, ['Quantidade', 'Qtd', 'Quantity', 'Quant', 'Vol']) || 0);
            
            const sName = sheetName.toUpperCase();
            const isFabricado = ['USINAGEM', 'LASER', 'FUNILARIA', 'TRATAMENTO', 'SOLDA', 'POLICARBONATO'].some(k => sName.includes(k));
            
            let type = isFabricado ? ItemType.FABRICADO : ItemType.COMERCIAL;
            
            const typeInRow = (findValue(row, ['Tipo', 'Type']) || '').toString().toLowerCase();
            if (typeInRow.includes('fab')) type = ItemType.FABRICADO;
            if (typeInRow.includes('com')) type = ItemType.COMERCIAL;

            return {
              id: `${sheetName}-${index}-${Date.now()}`,
              sheetName: normalizeString(sheetName),
              assembly: normalizeString(assembly.toString()),
              partNumber: partNumber || "-",
              description: description,
              quantity,
              unit: normalizeString((findValue(row, ['Unidade', 'Un', 'Unit']) || 'UN').toString()),
              type,
              supplier: normalizeString((findValue(row, ['Fornecedor', 'Supplier']) || '').toString()),
              status: 'PENDENTE' as const,
              dueDate: findValue(row, ['Data', 'Prazo', 'Deadline']) || ''
            };
          })
          .filter((item): item is ProcurementItem => item !== null);

        if (items.length > 0) {
          sheetData.sheets.push({ name: normalizeString(sheetName), items });
        }
      });

      onDataLoaded(sheetData);
    };
    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-white hover:border-indigo-400 transition-all cursor-pointer group shadow-sm">
      <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
        <div className="p-5 bg-indigo-50 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 transition-all mb-4 text-indigo-600">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="mb-2 text-sm text-slate-700 font-bold text-center uppercase">ARRASTE SUA PLANILHA INDUSTRIAL AQUI</p>
        <p className="text-[10px] text-slate-400 font-medium uppercase mb-4">Apenas linhas com descrição serão importadas</p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {['CONJUNTO', 'CODIGO', 'DESCRICAO', 'QUANTIDADE'].map(col => (
            <span key={col} className="px-2 py-1 bg-slate-100 text-[9px] font-bold text-slate-500 rounded uppercase tracking-wider">{col}</span>
          ))}
        </div>
        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
      </label>
    </div>
  );
};

export default FileUpload;
