
import { GoogleGenAI } from "@google/genai";
import { ProcurementItem } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getProjectStrategicInsights = async (items: ProcurementItem[], projectName: string): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";
  
  const stats = {
    total: items.length,
    pendentes: items.filter(i => i.status === 'PENDENTE').length,
    atrasados: items.filter(i => i.status === 'COMPRADO' && i.expectedArrival && i.expectedArrival < new Date().toISOString().split('T')[0]).length,
    entregues: items.filter(i => i.status === 'ENTREGUE').length,
    semFornecedor: items.filter(i => !i.supplier).length,
    categorias: [...new Set(items.map(i => i.sheetName))],
    amostraDescricoes: items.filter(i => i.status === 'PENDENTE').slice(0, 20).map(i => i.description)
  };

  const prompt = `
    Como um Diretor de Suprimentos Industrial, analise estrategicamente o projeto "${projectName}":
    
    ESTATÍSTICAS:
    - Itens Totais: ${stats.total}
    - Entregues (Sucesso): ${stats.entregues}
    - Em Atraso Crítico: ${stats.atrasados}
    - Pendentes de Compra: ${stats.pendentes}
    - Itens sem fornecedor definido: ${stats.semFornecedor}
    - Categorias: ${stats.categorias.join(', ')}

    DESCRIÇÕES DOS ITENS PENDENTES (Amostra):
    ${stats.amostraDescricoes.join(' | ')}

    FORNEÇA UMA ANÁLISE EM MARKDOWN:
    1. **RISCO DE CRONOGRAMA**: Chance de atraso?
    2. **ESTRATÉGIA DE CATEGORIA**: Onde focar hoje?
    3. **INSIGHTS DE ITENS**: Sugira gargalos de lead-time.
    4. **PLANO DE AÇÃO**: 3 passos imediatos.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 4000 } }
    });
    return response.text || "Sem análise no momento.";
  } catch (error) {
    console.error(error);
    return "Erro ao processar análise estratégica.";
  }
};

export const getReceivingInsights = async (items: ProcurementItem[]): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview"; // Flash para maior agilidade no painel de controle
  const today = new Date().toISOString().split('T')[0];

  const relevantItems = items.filter(i => i.status === 'COMPRADO');
  const delayed = relevantItems.filter(i => i.expectedArrival && i.expectedArrival < today);
  const next7Days = relevantItems.filter(i => i.expectedArrival && i.expectedArrival >= today && i.expectedArrival <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const supplierIssues = delayed.reduce((acc: any, curr) => {
    const s = curr.supplier || 'DESCONHECIDO';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const topTroubleSuppliers = Object.entries(supplierIssues)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count} atrasos)`)
    .join(', ');

  const prompt = `
    Analise o estado atual do recebimento logístico:
    - Itens aguardando chegada: ${relevantItems.length}
    - Itens em atraso: ${delayed.length}
    - Chegadas previstas para os próximos 7 dias: ${next7Days.length}
    - Fornecedores com mais atrasos: ${topTroubleSuppliers}

    Crie um resumo executivo muito curto (máximo 4 bullets) em MARKDOWN focando em:
    - Situação crítica imediata.
    - Previsão de fluxo para a semana.
    - Alerta de fornecedor.
    Use tom profissional de gestor de logística.
  `;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Sem análise logística disponível.";
  } catch (error) {
    return "Logística indisponível.";
  }
};
