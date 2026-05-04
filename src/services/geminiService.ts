import { GoogleGenAI, Type } from "@google/genai";

// Tenta pegar a chave do Vite (VITE_GEMINI_API_KEY)
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
               (import.meta as any).env?.GEMINI_API_KEY || 
               (process as any).env?.GEMINI_API_KEY || 
               "";

if (!apiKey) {
  console.warn("Aviso: GEMINI_API_KEY não encontrada no ambiente.");
}

const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  async generateStudyPlan(sequence: string[]) {
    const prompt = `Você é um mentor de estudos estratégico e especialista em metodologias de aprendizagem acelerada.
    Eu já calculei a sequência matemática exata das matérias que o aluno deve estudar para garantir um rodízio perfeito.
    
    SEQUÊNCIA EXATA DE MATÉRIAS:
    ${JSON.stringify(sequence)}
    
    Sua ÚNICA tarefa é definir um 'focusArea' (tópico de estudo sucinto e inspirador) para CADA bloco dessa sequência.
    
    REGRAS CRÍTICAS:
    1. Você DEVE retornar EXATAMENTE a mesma quantidade de itens do array que eu te enviei (${sequence.length} itens). Nenhum a mais, nenhum a menos.
    2. O campo "subject" DEVE ser EXATAMENTE a mesma string fornecida na sequência para a respectiva posição.
    3. O campo "durationMinutes" DEVE SER EXATAMENTE 30 para todos os itens.
    4. Crie um 'focusArea' diferente e progressivo quando a mesma matéria aparecer mais de uma vez.
    
    Retorne APENAS um array JSON válido onde cada objeto possui: subject, durationMinutes e focusArea.`;

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
      contents: `Explique o tópico "${topic}" dentro da disciplina "${subject}". Sua explicação deve ser baseada na aplicação real e prática deste conhecimento. 
      IMPORTANTE: Utilize exemplos e analogias variadas do mundo real (negócios, cotidiano, tecnologia, indústria, etc.) que demonstrem o conceito em ação. 
      PROIBIDO: Não utilize exemplos limitados ao universo de "estudos", "ser estudante" ou "aprender para uma prova". Foque em como um profissional ou alguém na prática usaria esse conceito no dia a dia.
      RESPONDA OBRIGATORIAMENTE EM PORTUGUÊS DO BRASIL.`,
      config: {
        systemInstruction: "Você é um especialista didático na disciplina informada. Sua missão é explicar conceitos através de aplicações práticas e analogias ricas do mundo real, fugindo do clichê acadêmico e do universo de 'estudante'. Seja criativo e use repertórios variados."
      }
    });
    return response.text;
  },

  async generateQuestionsFromText(text: string, subject: string) {
    const prompt = `Com base no texto a seguir sobre ${subject}, gere 5 questões de múltipla escolha focadas em uma avaliação de alto nível (acadêmica ou profissional).
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
      contents: `Resuma o material de estudo a seguir e extraia os 5 pontos cruciais e fundamentais para o domínio total do assunto.
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
    const prompt = `Gere 5 questões de múltipla escolha de nível avançado abrangendo os seguintes temas que foram estudados hoje: ${subjects.join(', ')}.
    As questões devem ser desafiadoras e variadas entre os temas para validar o conhecimento real do estudante.
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
      contents: `Explique brevemente o termo ou curiosidade: "${query}". Seja muito direto, didático e traga uma aplicação ou exemplo prático do mundo real que não seja apenas sobre "estudar". Responda em no máximo 3 parágrafos curtos. RESPONDA EM PORTUGUÊS DO BRASIL.`,
      config: {
        systemInstruction: "Você é um assistente inteligente e versátil. Sua missão é tirar dúvidas de forma clara e trazer exemplos do mundo real, evitando ficar preso ao contexto escolar ou acadêmico."
      }
    });
    return response.text;
  },

  async textToSpeech(text: string) {
    try {
      // Tom mais alegre e humano, baseado no sucesso do Audio Spark
      const toneInstructions = "Tone: cheerful, gentle, acting like a teacher.\nText to speak: ";
      const finalPrompt = `${toneInstructions}${text}`;

      // @ts-ignore
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: finalPrompt }] }],
        config: {
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" } 
            }
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find(p => p.inlineData || p.inline_data);
      const base64Data = audioPart?.inlineData?.data || audioPart?.inline_data?.data;

      if (!base64Data) {
        // Se falhar o models.generateContent, tentamos o método tradicional como fallback
        const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-tts-preview" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: {
            // @ts-ignore
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
          }
        });
        const altPart = result.response.candidates?.[0].content.parts.find(p => p.inlineData);
        if (altPart?.inlineData?.data) return this.wrapPcmInWav(altPart.inlineData.data, 24000);
        return null;
      }

      return this.wrapPcmInWav(base64Data, 24000);
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      return null;
    }
  },

  // Helper para envolver PCM em WAV
  wrapPcmInWav(base64Pcm: string, sampleRate: number) {
    const binaryString = window.atob(base64Pcm);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    view.setUint32(0, 0x52494646, false); // RIFF
    view.setUint32(4, 36 + pcmData.length, true);
    view.setUint32(8, 0x57415645, false); // WAVE
    view.setUint32(12, 0x666d7420, false); // fmt 
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // data
    view.setUint32(40, pcmData.length, true);
    
    const wavData = new Uint8Array(44 + pcmData.length);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(pcmData, 44);
    
    let binary = '';
    for (let i = 0; i < wavData.byteLength; i++) {
      binary += String.fromCharCode(wavData[i]);
    }
    return window.btoa(binary);
  }
};
