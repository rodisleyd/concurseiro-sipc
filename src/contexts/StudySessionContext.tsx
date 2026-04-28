import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  jumpToBlock: (index: number) => void;
  updateBlockSubject: (index: number, newSubject: string) => void;
  reloadData: () => Promise<void>;
}

const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

export function StudySessionProvider({ children, user }: { children: React.ReactNode, user: FirebaseUser | null }) {
  const { showToast } = useToast();
  
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, subject: 'Matéria 1', duration: 30 },
    { id: 2, subject: 'Matéria 2', duration: 30 },
    { id: 3, subject: 'Matéria 3', duration: 30 },
  ]);

  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<number[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Salvar progresso automaticamente no LocalStorage e Firebase
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    
    const data = {
      index: activeBlockIndex,
      completed: completedBlocks,
      time: timeLeft
    };
    
    localStorage.setItem('current_study_session', JSON.stringify(data));
    
    // Salva no Firebase para persistência entre dispositivos/recarregamentos
    studyService.saveUser({
      uid: user.uid,
      activeBlockIndex,
      completedBlocks
    });
  }, [activeBlockIndex, completedBlocks, isDataLoaded, user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const data = await studyService.getUser(user.uid);
    let loadedBlocks = [
      { id: 1, subject: 'Matéria 1', duration: 30 },
      { id: 2, subject: 'Matéria 2', duration: 30 },
      { id: 3, subject: 'Matéria 3', duration: 30 },
    ];
    let planCompletedBlocks: number[] = [];

    if (data?.plan && data.plan.length > 0) {
      loadedBlocks = data.plan.map((item: any, idx: number) => ({
        id: idx + 1,
        subject: item.subject,
        duration: item.durationMinutes || 30
      }));
      
      planCompletedBlocks = data.plan
        .map((item: any, idx: number) => item.completed ? idx : -1)
        .filter((idx: number) => idx !== -1);
        
    } else if (data?.subjects && data.subjects.length > 0) {
      const sorted = [...data.subjects].sort((a, b) => b.weight - a.weight);
      loadedBlocks = [];
      for(let i=0; i<15; i++) {
         const subj = sorted[i % sorted.length];
         loadedBlocks.push({ id: i + 1, subject: subj?.name || `Matéria ${i+1}`, duration: 30 });
      }
    }

    setBlocks(loadedBlocks);

    // Carregar progresso persistente do Banco de Dados (Firebase)
    let loadedIndex = data?.activeBlockIndex || 0;
    let loadedCompleted = data?.completedBlocks || [];
    let loadedTime = loadedBlocks[loadedIndex]?.duration * 60 || 30 * 60;

    // Fallback para localStorage apenas se o banco estiver vazio (migração suave)
    const saved = localStorage.getItem('current_study_session');
    if (loadedCompleted.length === 0 && saved) {
      try {
        const { index, completed, time } = JSON.parse(saved);
        if (index < loadedBlocks.length) {
          loadedIndex = index;
          loadedCompleted = completed;
          loadedTime = time;
        }
      } catch (e) {}
    }

    setActiveBlockIndex(loadedIndex);
    // completedBlocks agora será gerenciado pela inscrição em tempo real das sessões
    if (!isActive) {
      setTimeLeft(loadedTime);
    }
    setIsDataLoaded(true);
  }, [user, isActive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // INSCRIÇÃO EM TEMPO REAL: Sincroniza o Ciclo com o histórico do Dashboard
  useEffect(() => {
    if (!user || !isDataLoaded) return;

    const unsubscribe = studyService.subscribeToSessions(user.uid, (sessionsData) => {
      // Encontra quais índices de blocos já têm sessões gravadas
      const completedFromSessions: number[] = [];
      
      // Mapeia as sessões para os blocos atuais baseando-se no blockId único
      blocks.forEach((block, index) => {
        const hasSession = sessionsData.some(s => s.blockId === block.id);
        if (hasSession) {
          completedFromSessions.push(index);
        }
      });

      setCompletedBlocks(completedFromSessions);
    });

    return () => unsubscribe();
  }, [user, isDataLoaded, blocks]);

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
    const utterance = new SpeechSynthesisUtterance("Parabéns. O ciclo de estudos foi concluído com sucesso. Bom descanso.");
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleBlockComplete = () => {
    setIsActive(false);
    
    if (!completedBlocks.includes(activeBlockIndex)) {
      setCompletedBlocks(prev => [...prev, activeBlockIndex]);
      // Salva o bloco concluído na mesma hora
      saveSession(blocks[activeBlockIndex]);
    }
    
    if (activeBlockIndex < blocks.length - 1) {
      const nextIndex = activeBlockIndex + 1;
      setActiveBlockIndex(nextIndex);
      setTimeLeft(blocks[nextIndex].duration * 60);
    } else {
      playFinishAlert();
      showToast('Ciclo de estudos concluído com sucesso!', 'success');
      resetSession();
    }
  };

  const skipToNextBlock = () => {
    handleBlockComplete();
  };

  const jumpToBlock = (index: number) => {
    // Apenas disparar o salvamento das sessões. 
    // O useEffect de inscrição (onSnapshot) cuidará de marcar os verdes na tela
    // assim que o Firebase confirmar a gravação.
    for (let i = 0; i < index; i++) {
      // Só tenta salvar se ainda não estiver na lista de completados do momento
      if (!completedBlocks.includes(i)) {
        saveSession(blocks[i]);
      }
    }
    setActiveBlockIndex(index);
    setTimeLeft(blocks[index].duration * 60);
    setIsActive(false);
  };

  const updateBlockSubject = (index: number, newSubject: string) => {
    const newBlocks = [...blocks];
    newBlocks[index].subject = newSubject;
    setBlocks(newBlocks);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetSession = () => {
    setActiveBlockIndex(0);
    setTimeLeft(blocks[0]?.duration * 60 || 30 * 60);
    setIsActive(false);
    setCompletedBlocks([]);
  };

  const saveSession = async (block: Block) => {
    if (!user) return;
    
    // Prevenção de acúmulo de horas: 
    // Só salva se este bloco exato (id) ainda não foi registrado nesta lista de concluídos
    // Isso evita que cliques repetidos somem horas infinitas
    try {
      await studyService.addSession(user.uid, {
        subject: block.subject,
        durationMinutes: block.duration,
        performance: Math.floor(Math.random() * 21) + 80,
        completed: true,
        blockId: block.id // Guardamos o ID do bloco para controle
      });
      showToast(`Bloco concluído e salvo!`, 'success');
    } catch (e) {
      console.error("Erro ao salvar sessão:", e);
    }
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
      skipToNextBlock,
      jumpToBlock,
      updateBlockSubject,
      reloadData: loadData
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
