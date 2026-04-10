import React from 'react';
import { useStudySession } from '../contexts/StudySessionContext';
import { Play, Pause } from 'lucide-react';

export default function MiniTimer({ onNavigateToCycle }: { onNavigateToCycle: () => void }) {
  const { isActive, timeLeft, activeBlockIndex, blocks, toggleTimer, completedBlocks } = useStudySession();

  // Ocultar apenas temporariamente se os blocos não carregaram
  if (!blocks || blocks.length === 0) {
    return null; 
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBlock = blocks[activeBlockIndex];

  return (
    <div 
      className="mx-4 mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm"
      onClick={onNavigateToCycle}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          Bloco {activeBlockIndex + 1}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
          className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center hover:bg-indigo-300 transition-colors"
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>
      <p className="text-sm font-bold text-indigo-900 truncate mb-1" title={currentBlock?.subject}>
        {currentBlock?.subject}
      </p>
      <div className="text-2xl font-black text-indigo-600 tabular-nums">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}
