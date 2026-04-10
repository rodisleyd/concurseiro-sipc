import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { studyService } from '../services/studyService';
import { useToast } from '../components/Toast';

interface Block {
  id: number;
  subject: string;
  duration: number;
}

interface StudySessionContextType {
  blocks: Block[];
  activeBlockIndex: number;
  timeLeft: number;
  isActive: boolean;
  completedBlocks: number[];
  toggleTimer: () => void;
  resetSession: () => void;
  skipToNextBlock: () => void;
}

const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

export function StudySessionProvider({ children, user }: { children: React.ReactNode, user: FirebaseUser | null }) {
  const { showToast } = useToast();
  
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, subject: 'Matéria 1', duration: 30 },
    { id: 2, subject: 'Matéria 2', duration: 30 },
    { id: 3, subject: 'Matéria 3', duration: 30 },
    { id: 4, subject: 'Revisão / Questões', duration: 30 },
  ]);

  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadSubjects = async () => {
      const data = await studyService.getUser(user.uid);
      if (data?.subjects && data.subjects.length > 0) {
        // Sort by weight desc
        const sorted = [...data.subjects].sort((a, b) => b.weight - a.weight);
        const newBlocks = [
          { id: 1, subject: sorted[0]?.name || 'Matéria 1', duration: 30 },
          { id: 2, subject: sorted[1]?.name || 'Matéria 2', duration: 30 },
          { id: 3, subject: sorted[2]?.name || 'Matéria 3', duration: 30 },
          { id: 4, subject: 'Revisão / Questões', duration: 30 },
        ];
        setBlocks(newBlocks);
        // Atualiza iniciar se a sessão estiver inativa/zerada
        if (!isActive && completedBlocks.length === 0) {
           setTimeLeft(newBlocks[0].duration * 60);
        }
      }
    };
    loadSubjects();
  }, [user]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      playVoiceAlert();
      handleBlockComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const playVoiceAlert = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Tempo esgotado. Preparando próxima matéria da sua sessão de estudos.");
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const playFinishAlert = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Parabéns. Ciclo alternado de duas horas concluído com sucesso. Bom descanso.");
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleBlockComplete = () => {
    setIsActive(false);
    if (!completedBlocks.includes(activeBlockIndex)) {
      setCompletedBlocks(prev => [...prev, activeBlockIndex]);
    }
    
    if (activeBlockIndex < blocks.length - 1) {
      const nextIndex = activeBlockIndex + 1;
      setActiveBlockIndex(nextIndex);
      setTimeLeft(blocks[nextIndex].duration * 60);
    } else {
      saveSession();
    }
  };

  const skipToNextBlock = () => {
    handleBlockComplete();
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetSession = () => {
    setActiveBlockIndex(0);
    setTimeLeft(blocks[0].duration * 60);
    setIsActive(false);
    setCompletedBlocks([]);
  };

  const saveSession = async () => {
    if (!user) return;
    playFinishAlert();
    await studyService.addSession(user.uid, {
      subject: 'Ciclo Completo',
      durationMinutes: 120, // 4 x 30m
      performance: 85,
      completed: true,
      blocks: blocks.map(b => b.subject)
    });
    showToast('Sessão de 2h concluída e salva com sucesso!', 'success');
    resetSession();
  };

  return (
    <StudySessionContext.Provider value={{
      blocks,
      activeBlockIndex,
      timeLeft,
      isActive,
      completedBlocks,
      toggleTimer,
      resetSession,
      skipToNextBlock
    }}>
      {children}
    </StudySessionContext.Provider>
  );
}

export const useStudySession = () => {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  return context;
};
