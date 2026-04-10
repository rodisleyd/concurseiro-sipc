import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { geminiService } from '../services/geminiService';
import { studyService } from '../services/studyService';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ListChecks,
  BookOpen,
  HelpCircle,
  Headphones,
  Network,
  Save,
  Loader2,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';

export default function PDFUpload({ user, chunk }: { user: FirebaseUser, chunk?: any }) {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [mindMap, setMindMap] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'questions' | 'mindmap'>('summary');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Question State
  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeAudioText, setActiveAudioText] = useState('');

  // Ao receber um pedaço do Galpão, vamos checar se ele já foi mastigado antes
  useEffect(() => {
    if (!chunk) {
      setResult(null);
      setQuestions([]);
      setMindMap(null);
      setAnswers({});
      return;
    }

    setAnswers({});
    setSavedSuccess(false);

    // Se já foi processado no Firebase
    if (chunk.summaryData && chunk.questionsData && chunk.mindMapData) {
      setResult(chunk.summaryData);
      setQuestions(chunk.questionsData);
      setMindMap(chunk.mindMapData);
      setSavedSuccess(true);
    } else {
      // Pedaco cru: precisamos extrair com IA
      processContent(chunk.content, chunk.title);
    }
  }, [chunk]);

  const processContent = async (textToProcess: string, subjectName: string) => {
    setIsProcessing(true);
    try {
      const summaryData = await geminiService.summarizeMaterial(textToProcess);
      const questionsData = await geminiService.generateQuestionsFromText(textToProcess, subjectName);
      const mindMapData = await geminiService.generateMindMap(textToProcess);
      
      setResult(summaryData);
      setQuestions(questionsData);
      setMindMap(mindMapData);
    } catch (error) {
      console.error(error);
      showToast("Erro ao analisar via IA. O servidor pode estar sobrecarregado.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToGalpao = async () => {
    if (!chunk || !chunk.id) return;
    setIsSaving(true);
    try {
      await studyService.saveProcessedChunk(user.uid, chunk.id, {
        summaryData: result,
        mindMapData: mindMap,
        questionsData: questions
      });
      setSavedSuccess(true);
      showToast('Aula salva no seu Galpão!', 'success');
    } catch (e) {
      showToast("Erro ao salvar o material.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const playAudio = (text: string) => {
    if (isPlayingAudio && text === activeAudioText) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    // Filtro de Markdown para a voz não ler os caracteres
    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    
    setIsPlayingAudio(true);
    setActiveAudioText(text);
    window.speechSynthesis.speak(utterance);
  };

  const renderMindMapNode = (node: any, depth = 0) => {
    if (!node || node.label === undefined) return null;
    return (
      <div key={node.label + depth} className={`pl-${depth > 0 ? '6' : '0'} border-l-2 border-slate-200 mt-2 ml-${depth > 0 ? '4' : '0'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span className="font-bold text-gray-800 text-sm">{node.label}</span>
        </div>
        {node.children && node.children.map((child: any, i: number) => renderMindMapNode(child, depth + 1))}
      </div>
    );
  };

  if (!chunk) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-16 text-center">
        <Archive className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum Tópico Selecionado</h3>
        <p className="text-gray-500 max-w-md mx-auto">Vá para a aba <strong>Galpão de Arquivos</strong>, faça o upload das suas apostilas e selecione um tópico para começar a resolver os testes e ler os mapas mentais.</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-6"
        />
        <h3 className="text-2xl font-black text-gray-900 mb-2">Construindo sua Aula...</h3>
        <p className="text-gray-500 max-w-sm">Nossa IA está lendo <strong>"{chunk.title}"</strong> para criar seus mapas e perguntas inéditas. Um momento!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{chunk.title}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            Origem: <span className="font-semibold">{chunk.fileName}</span>
          </p>
        </div>
        {!savedSuccess ? (
          <motion.button 
            initial={{ scale: 1 }}
            animate={result ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={handleSaveToGalpao}
            disabled={isSaving || !result}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 text-sm"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Finalizar e Salvar Aula
          </motion.button>
        ) : (
          <div className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold rounded-2xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Aula Pronta no Galpão
          </div>
        )}
      </header>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-4">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`w-full p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                activeTab === 'summary' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className={`font-bold truncate ${activeTab === 'summary' ? 'text-indigo-900' : 'text-gray-700'}`}>Resumo Dinâmico</p>
                <p className="text-xs text-gray-500 truncate">Áudio & Pontos Chave</p>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('mindmap')}
              className={`w-full p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                activeTab === 'mindmap' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'mindmap' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Network className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className={`font-bold truncate ${activeTab === 'mindmap' ? 'text-indigo-900' : 'text-gray-700'}`}>Mapa Mental IA</p>
                <p className="text-xs text-gray-500 truncate">Esquema Estruturado</p>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('questions')}
              className={`w-full p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                activeTab === 'questions' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'questions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <ListChecks className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className={`font-bold truncate ${activeTab === 'questions' ? 'text-indigo-900' : 'text-gray-700'}`}>Simulador de Banca</p>
                <p className="text-xs text-gray-500 truncate">{questions.length} questões c/ feedback</p>
              </div>
            </button>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'summary' && (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-8"
                >
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                        Resumo Executivo
                      </h3>
                      <button 
                        onClick={() => playAudio(result.summary)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          isPlayingAudio && activeAudioText === result.summary 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                        }`}
                      >
                        <Headphones className="w-4 h-4" />
                        {isPlayingAudio && activeAudioText === result.summary ? 'Pausar Áudio' : 'Ouvir Resumo'}
                      </button>
                    </div>
                    <p className="text-gray-600 leading-relaxed text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      {result.summary}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-500" />
                      Pontos Mais Importantes
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {result.keyPoints?.map((point: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-700 font-medium leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'mindmap' && (
                <motion.div 
                  key="mindmap"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-8"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Network className="w-6 h-6 text-indigo-600" />
                    Mapa Mental
                  </h3>
                  {mindMap && mindMap.title ? (
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                       <h4 className="font-black text-xl text-indigo-900 mb-6 pb-4 border-b-2 border-indigo-100">
                         {mindMap.title}
                       </h4>
                       <div className="space-y-4">
                         {mindMap.nodes?.map((node: any, i: number) => renderMindMapNode(node))}
                       </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Mapa mental não foi gerado ou está carregando. Certifique-se de usar um texto compatível.</div>
                  )}
                </motion.div>
              )}

              {activeTab === 'questions' && (
                <motion.div 
                  key="questions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 space-y-8"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <HelpCircle className="w-6 h-6 text-indigo-600" />
                    Simulado e Explicações
                  </h3>
                  <div className="space-y-12">
                    {questions.map((q, i) => {
                      const selectedAnswer = answers[i];
                      const isAnswered = selectedAnswer !== undefined;
                      const isCorrect = selectedAnswer === q.correctOption;

                      return (
                        <div key={i} className="space-y-4">
                          <p className="font-bold text-gray-900 leading-relaxed text-sm">
                            <span className="text-indigo-600 mr-2 uppercase tracking-wide text-xs bg-indigo-100 px-2 py-1 rounded-md">Questão {i + 1}</span>
                            <br className="mt-2" />
                            {q.text}
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt: string, j: number) => {
                              const isThisSelected = selectedAnswer === j;
                              const isThisCorrect = q.correctOption === j;
                              
                              let btnClass = "border-slate-200 bg-white hover:bg-slate-50";
                              if (isAnswered) {
                                if (isThisCorrect) btnClass = "border-emerald-500 bg-emerald-50";
                                else if (isThisSelected) btnClass = "border-red-500 bg-red-50";
                                else btnClass = "border-slate-100 bg-slate-50 opacity-50";
                              } else {
                                if (isThisSelected) btnClass = "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200";
                              }

                              return (
                                <button 
                                  key={j}
                                  onClick={() => !isAnswered && handleAnswerSelect(i, j)}
                                  disabled={isAnswered}
                                  className={`w-full p-4 text-left text-sm border-2 rounded-xl transition-all flex items-start gap-3 group ${btnClass}`}
                                >
                                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                    isAnswered ? 
                                      (isThisCorrect ? 'bg-emerald-500 border-emerald-500' : isThisSelected ? 'bg-red-500 border-red-500' : 'border-slate-300') 
                                      : 'border-slate-300 group-hover:border-indigo-400'
                                  }`}>
                                    {isAnswered && isThisCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={isAnswered && (isThisCorrect || isThisSelected) ? 'font-bold' : ''}>
                                    {opt}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Feedback de Erro/Acerto */}
                          {isAnswered && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-5 rounded-2xl border-l-4 shadow-sm ${
                                isCorrect ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-500'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold text-sm ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {isCorrect ? '✨ Correto!' : '❌ Incorreto!'}
                                </span>
                                <button 
                                  onClick={() => playAudio(q.explanation)}
                                  className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-bold transition-colors"
                                >
                                  <Headphones className="w-4 h-4" /> 
                                  {isPlayingAudio && activeAudioText === q.explanation ? 'Pausar' : 'Ouvir Explicação'}
                                </button>
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {q.explanation}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
