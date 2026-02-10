
import { GoogleGenAI, Type } from "@google/genai";
import { ProcurementItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProcurementData = async (items: ProcurementItem[]): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const itemsBySheet: Record<string, any[]> = {};
  items.forEach(item => {
    if (!itemsBySheet[item.sheetName]) itemsBySheet[item.sheetName] = [];
    if (itemsBySheet[item.sheetName].length < 10) {
      itemsBySheet[item.sheetName].push({
        desc: item.description,
        qty: item.quantity,
        type: item.type
      });
    }
  });

  const prompt = `
    Como um consultor sênior de suprimentos industriais especializado em:
    - LASER E FUNILARIA
    - USINAGEM
    - POLICARBONATO
    - PNEUMÁTICA
    - PEÇAS DE MONTAGEM
    - TRATAMENTO

    Analise esta amostra de itens da lista de compras atual:
    ${JSON.stringify(itemsBySheet)}
    
    Por favor, forneça em Português do Brasil:
    1. **Visão Geral por Categoria**: Quais categorias parecem mais críticas ou volumosas.
    2. **Estratégia de Negociação**: Sugestões específicas para cada categoria (ex: agrupar itens de usinagem).
    3. **Riscos de Prazo**: Avaliação baseada na complexidade de fabricados vs comerciais.
    4. **Dica de Especialista**: Uma recomendação tática para o comprador hoje.

    Use Markdown rico com tabelas se necessário.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na análise da IA:", error);
    return "Erro ao processar análise inteligente.";
  }
};
