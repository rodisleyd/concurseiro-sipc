import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Brain,
  Timer as TimerIcon,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

export default function FocusMode({ user }: { user: FirebaseUser }) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleModeSwitch();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleModeSwitch = () => {
    setIsActive(false);
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(5 * 60);
      setSessionsCompleted(prev => prev + 1);
    } else {
      setMode('work');
      setTimeLeft(25 * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full bg-white rounded-[40px] shadow-2xl p-12 text-center border-b-8 transition-colors duration-500 ${
          mode === 'work' ? 'border-indigo-600' : 'border-emerald-500'
        }`}
      >
        <div className="flex items-center justify-center gap-4 mb-8">
          <button 
            onClick={() => { setMode('work'); setTimeLeft(25 * 60); setIsActive(false); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              mode === 'work' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-gray-500'
            }`}
          >
            Foco (25m)
          </button>
          <button 
            onClick={() => { setMode('break'); setTimeLeft(5 * 60); setIsActive(false); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              mode === 'break' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-gray-500'
            }`}
          >
            Pausa (5m)
          </button>
        </div>

        <div className="relative mb-12">
          <div className={`text-[120px] font-black leading-none tabular-nums tracking-tighter ${
            mode === 'work' ? 'text-gray-900' : 'text-emerald-600'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            {mode === 'work' ? (
              <Brain className="w-5 h-5 text-indigo-600" />
            ) : (
              <Coffee className="w-5 h-5 text-emerald-500" />
            )}
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              {mode === 'work' ? 'Hora de Concentrar' : 'Hora de Relaxar'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={resetTimer}
            className="w-16 h-16 rounded-3xl bg-slate-100 text-gray-400 flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
          >
            <RotateCcw className="w-8 h-8" />
          </button>
          <button 
            onClick={toggleTimer}
            className={`w-24 h-24 rounded-[32px] flex items-center justify-center transition-all active:scale-95 shadow-xl ${
              mode === 'work' 
                ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                : 'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600'
            }`}
          >
            {isActive ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 ml-1" />}
          </button>
          <div className="w-16 h-16 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-gray-900">{sessionsCompleted}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Sessões</span>
          </div>
        </div>
      </motion.div>

      <div className="mt-12 grid grid-cols-3 gap-4 w-full">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <TimerIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Tempo Total</p>
            <p className="text-sm font-bold text-gray-900">{(sessionsCompleted * 25)} min</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Eficiência</p>
            <p className="text-sm font-bold text-gray-900">94%</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Foco</p>
            <p className="text-sm font-bold text-gray-900">Alto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
