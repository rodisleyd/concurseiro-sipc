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
      contents: `Explain the topic "${topic}" in the context of "${subject}" for a public exam candidate. Use simple examples.`,
      config: {
        systemInstruction: "You are an expert tutor for public exams. Explain concepts clearly and concisely."
      }
    });
    return response.text;
  },

  async generateQuestionsFromText(text: string, subject: string) {
    const prompt = `Based on the following text about ${subject}, generate 5 multiple-choice questions for a public exam.
    Text: ${text}`;

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
      contents: `Summarize the following study material and list the top 5 key points.
      Text: ${text}`,
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
      contents: `Based on the following text, generate a mind map structure. 
      Return an object with a 'title' string and a 'nodes' array. Each node should have a 'label' string and an optional 'children' array of sub-nodes (same structure). Keep it concise, max 3 levels deep.
      Text: ${text}`,
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
      contents: `Divide the following text into logical study chunks/chapters. Give each chunk a concise title and extract the exact text belonging to that chunk.
      Text: ${text}`,
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
