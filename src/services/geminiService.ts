import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async generateStudyPlan(subjects: { name: string; weight: number }[], totalHours: number) {
    const prompt = `Você é um mentor especialista em concursos.
    Gere uma trilha de estudos realista baseada em um ciclo de estudos.
    Total do projeto: ${totalHours} horas.
    Matérias e Pesos: ${JSON.stringify(subjects)}.
    
    REGRAS CRÍTICAS:
    1. O campo "durationMinutes" DEVE SER EXATAMENTE 30 para TODOS os blocos gerados, sem exceção.
    2. Intercale as matérias respeitando a proporção dos pesos (matérias com mais peso aparecem mais vezes).
    3. Gere de 15 a 20 blocos para começar a trilha.
    
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

    const parsed = JSON.parse(response.text || "[]");
    return parsed.map((item: any) => ({ ...item, durationMinutes: 30 }));
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

  async generateQuestionsForSubjects(subjects: string[]) {
    const prompt = `Gere 5 questões de múltipla escolha de nível concurso público abrangendo os seguintes temas que foram estudados hoje: ${subjects.join(', ')}.
    As questões devem ser desafiadoras e variadas entre os temas.
    IMPORTANTE: Retorne a resposta estritamente em PORTUGUÊS DO BRASIL.`;

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
  },

  async quickSearch(query: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique brevemente o termo ou curiosidade: "${query}". Seja muito direto, didático e simples. Responda em no máximo 3 parágrafos curtos. RESPONDA EM PORTUGUÊS DO BRASIL.`,
      config: {
        systemInstruction: "Você é um assistente rápido para estudantes de concursos. Sua missão é tirar dúvidas pontuais de forma extremamente clara e concisa."
      }
    });
    return response.text;
  },

  async textToSpeech(text: string) {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-tts-preview" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Leia o seguinte texto de forma extremamente natural, humana e com boa entonação em português do Brasil: ${text}` }] }],
      generationConfig: {
        // @ts-ignore
        responseModalities: ["audio"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Puck"
            }
          }
        }
      }
    });

    const audioPart = result.response.candidates?.[0].content.parts.find(p => p.inlineData?.mimeType.startsWith('audio/'));
    return audioPart?.inlineData?.data; // Retorna o base64
  }
};
