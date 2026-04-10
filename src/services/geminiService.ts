import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async generateStudyPlan(subjects: { name: string; weight: number }[], totalHours: number) {
    const prompt = `Você é um mentor especialista em concursos.
    Gere uma trilha de estudos realista baseada em um ciclo de estudos.
    Total do projeto: ${totalHours} horas.
    Matérias e Pesos: ${JSON.stringify(subjects)}.
    
    REGRAS CRÍTICAS:
    1. Divida o tempo proporcionalmente aos pesos, mas cada bloco de estudo deve ter entre 45 e 120 minutos. NUNCA gere blocos de milhares de minutos.
    2. Intercale as matérias (não coloque a mesma matéria em 3 blocos seguidos).
    3. Gere os primeiros 15 a 20 blocos dessa jornada para começar.
    4. O campo durationMinutes deve ser um número realista para uma única sessão de estudo.
    
    Retorne um array JSON de objetos com: subject, durationMinutes e focusArea (um tópico específico para estudar nesse bloco).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER },
              focusArea: { type: Type.STRING }
            },
            required: ["subject", "durationMinutes", "focusArea"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  async explainTopic(topic: string, subject: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique o tópico "${topic}" no contexto da matéria "${subject}" para um candidato de concurso público no Brasil. Use exemplos práticos. RESPONDA OBRIGATORIAMENTE EM PORTUGUÊS DO BRASIL.`,
      config: {
        systemInstruction: "Você é um tutor especialista em concursos públicos no Brasil. Explique os conceitos de forma muito clara e concisa em Português."
      }
    });
    return response.text;
  },

  async generateQuestionsFromText(text: string, subject: string) {
    const prompt = `Com base no texto a seguir sobre ${subject}, gere 5 questões de múltipla escolha focadas em modelo de prova de concurso (banca padrão).
    Escreva TODAS as questões, opções e a explicação final estritamente em PORTUGUÊS DO BRASIL.
    Texto: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctOption: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["text", "options", "correctOption", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  async summarizeMaterial(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Resuma o material de estudo a seguir e extraia os 5 pontos cruciais que costumam cair em provas.
      O resumo deve ser gerado totalmente em PORTUGUÊS DO BRASIL.
      Texto: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "keyPoints"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async generateMindMap(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crie a estrutura de um mapa mental baseada no texto a seguir para facilitar os estudos. 
      Retorne um objeto JSON com 'title' (string) e um array 'nodes'. Cada 'node' deve ter um 'label' (string) e opcionalmente um array de 'children' na mesma estrutura, até 3 níveis.
      Todos os títulos e labels DEVEM ESTAR EM PORTUGUÊS DO BRASIL.
      Texto: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        children: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING }
                            },
                            required: ["label"]
                          }
                        }
                      },
                      required: ["label"]
                    }
                  }
                },
                required: ["label"]
              }
            }
          },
          required: ["title", "nodes"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async splitMaterialIntoChunks(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Divida o texto a seguir em capítulos/tópicos lógicos de estudo. Dê a cada pedaço um título resumido e extraia o texto exato correspondente.
      Escreva os títulos totalmente em PORTUGUÊS DO BRASIL.
      Texto: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }
};
