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
  ArrowRight
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
    skipToNextBlock 
  } = useStudySession();

  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);

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

  const currentBlock = blocks[activeBlockIndex];


  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ciclo de Estudo Alternado (2h)</h1>
        <p className="text-gray-500">Metodologia P.E.A.A.F - Evite a fadiga alternando matérias a cada 30 minutos.</p>
      </header>

      {/* Blocks Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {blocks.map((block, index) => (
          <div 
            key={block.id}
            className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
              activeBlockIndex === index 
                ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                : completedBlocks.includes(index)
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-100 bg-white opacity-60'
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
                <span className={`text-xs font-bold uppercase tracking-wider ${activeBlockIndex === index ? 'text-indigo-600' : 'text-gray-400'}`}>
                  Bloco {index + 1}
                </span>
                {completedBlocks.includes(index) && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              </div>
              <p className={`font-bold truncate ${activeBlockIndex === index ? 'text-indigo-900 text-lg' : 'text-gray-600'}`}>
                {block.subject}
              </p>
              <p className="text-xs text-gray-500 mt-1">{block.duration} min</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timer Section */}
        <div className="lg:col-span-1 bg-white rounded-[32px] shadow-lg border border-slate-100 p-8 flex flex-col items-center flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{currentBlock.subject}</h3>
          
          <div className="relative w-56 h-56 flex items-center justify-center mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100"
              />
              <motion.circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={653}
                animate={{ strokeDashoffset: 653 * (1 - timeLeft / (currentBlock.duration * 60)) }}
                className="text-indigo-600"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-gray-900 tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => toggleTimer()}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
              }`}
            >
              {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button 
              onClick={resetSession}
              className="w-12 h-12 rounded-full bg-slate-100 text-gray-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              title="Reiniciar Ciclo"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button 
               onClick={skipToNextBlock}
               className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
               title="Pular para próximo bloco"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action / Methodology Section */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Suas metas neste bloco de 30m:</h3>
            <p className="text-sm text-gray-500">
              Siga os passos P.E.A para garantir o máximo de retenção na matéria <strong>{currentBlock.subject}</strong>.
            </p>
          </div>

          <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            {/* Preparar */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">1. Preparar (5 min)</h4>
                <p className="text-gray-600 text-sm mt-1 mb-2">
                  Não comece lendo profundamente. Dê uma visão panorâmica no material contendo o sumário, imagens e marcações. O objetivo é despertar curiosidade no seu cérebro.
                </p>
              </div>
            </div>

            {/* Entender */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg">2. Entender (15 min)</h4>
                <p className="text-gray-600 text-sm mt-1 mb-3">
                  Estudo ativo. Marque, grife e relacione o conteúdo novo com o que você já sabe. Se a matéria for difícil, peça para nosso Professor IA explicar de um jeito analógico.
                </p>
                <div className="space-y-4">
                  <button 
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isExplaining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Simplificar assunto com a IA
                  </button>
                  {explanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-gray-700 text-sm leading-relaxed shadow-inner"
                    >
                      {explanation}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Aprender */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">3. Aprender (10 min)</h4>
                <p className="text-gray-600 text-sm mt-1">
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
