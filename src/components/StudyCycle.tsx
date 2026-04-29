import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { studyService } from '../services/studyService';
import { geminiService } from '../services/geminiService';
import { useStudySession } from '../contexts/StudySessionContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare,
  BookOpen,
  Brain,
  Pencil,
  ArrowRight,
  Sparkles,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';

export default function StudyCycle({ user }: { user: FirebaseUser }) {
  const { showToast } = useToast();
  const { 
    blocks, 
    activeBlockIndex, 
    timeLeft, 
    isActive, 
    completedBlocks, 
    toggleTimer, 
    resetSession, 
    skipToNextBlock,
    jumpToBlock,
    updateBlockSubject,
    reloadData
  } = useStudySession();

  // Recarregar os dados do banco toda vez que abrir esta tela
  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const currentBlock = blocks[activeBlockIndex];
  const isRevisionBlock = activeBlockIndex === 3 || 
                          currentBlock?.id === 4 || 
                          currentBlock?.subject?.toLowerCase().includes('revisão');

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      // Pega os nomes das matérias dos blocos anteriores
      const previousSubjects = blocks.slice(0, 3).map(b => b.subject);
      const data = await geminiService.generateQuestionsForSubjects(previousSubjects);
      setQuestions(data);
    } catch (e) {
      showToast('Erro ao gerar questões', 'error');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleExplain = async () => {
    setIsExplaining(true);
    try {
      const text = await geminiService.explainTopic('Resumo dos pontos mais importantes e conexões principais desta matéria', blocks[activeBlockIndex].subject);
      setExplanation(text || '');
    } catch (e) {
      console.error(e);
      showToast('Erro ao contactar Professor IA', 'error');
    } finally {
      setIsExplaining(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ciclo de Estudos Alternado</h1>
        <p className="text-gray-500 dark:text-gray-400">Metodologia P.E.A.A.F - Foque no aprendizado alternando matérias a cada bloco.</p>
      </header>

      {/* Blocks Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {blocks.map((block, index) => {
          return (
            <div 
              key={`${block.id}-${index}`}
              onClick={() => jumpToBlock(index)}
              className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 ${
                activeBlockIndex === index 
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' 
                  : completedBlocks.includes(index)
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
              }`}
            >
              {activeBlockIndex === index && (
                 <motion.div 
                   layoutId="active-indicator"
                   className="absolute inset-0 bg-indigo-100/50"
                 />
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${activeBlockIndex === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    Bloco {index + 1}
                  </span>
                  {completedBlocks.includes(index) && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <input 
                  type="text"
                  value={block.subject}
                  onChange={(e) => updateBlockSubject(index, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent border-none font-bold outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 -ml-1 ${activeBlockIndex === index ? 'text-indigo-900 dark:text-indigo-100 text-lg' : 'text-gray-600 dark:text-gray-400'}`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{block.duration} min</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timer Section */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[32px] shadow-lg border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">{currentBlock?.subject || 'Carregando...'}</h3>
          
          <div className="relative w-56 h-56 flex items-center justify-center mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <motion.circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={653}
                animate={{ strokeDashoffset: 653 * (1 - timeLeft / ((currentBlock?.duration || 30) * 60)) }}
                className="text-indigo-600 dark:text-indigo-400"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => toggleTimer()}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'
              }`}
            >
              {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button 
              onClick={resetSession}
              className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Reiniciar Ciclo"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button 
               onClick={skipToNextBlock}
               className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
               title="Pular para próximo bloco"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action / Methodology Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            {/* Preparar */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">1. Preparar (5 min)</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 mb-2">
                  Não comece lendo profundamente. Dê uma visão panorâmica no material contendo o sumário, imagens e marcações. O objetivo é despertar curiosidade no seu cérebro.
                </p>
              </div>
            </div>

            {/* Entender */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">2. Entender (15 min)</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 mb-3">
                  Estudo ativo. Marque, grife e relacione o conteúdo novo com o que você já sabe. Se a matéria for difícil, peça para nosso Professor IA explicar de um jeito analógico.
                </p>
                <div className="space-y-4">
                  <button 
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                  >
                    {isExplaining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Simplificar assunto com a IA
                  </button>
                  {explanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm leading-relaxed shadow-inner"
                    >
                      {explanation}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Aprender */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">3. Aprender (10 min)</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Aplicaça o conhecimento. Faça 5 a 10 exercícios sobre o que você acabou de ler para garantir a fixação ativa e preparar a trilha neural.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
