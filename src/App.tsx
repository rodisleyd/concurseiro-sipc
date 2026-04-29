import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { auth } from './firebase';
import { studyService } from './services/studyService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  Timer, 
  FileText, 
  LogOut,
  ChevronRight,
  BrainCircuit,
  GraduationCap,
  Warehouse,
  Sun,
  Moon
} from 'lucide-react';

// Theme
import { useTheme } from './contexts/ThemeContext';

// Components
import Dashboard from './components/Dashboard';
import StudyPlanner from './components/StudyPlanner';
import StudyCycle from './components/StudyCycle';
import AITutor from './components/AITutor';
import FocusMode from './components/FocusMode';
import PDFUpload from './components/PDFUpload';
import Galpao from './components/Galpao';
import { ToastProvider } from './components/Toast';
import { StudySessionProvider } from './contexts/StudySessionContext';
import MiniTimer from './components/MiniTimer';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeChunk, setActiveChunk] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        studyService.saveUser({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Concurseiro</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Seu tutor inteligente para aprovação em concursos públicos.</p>
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const handleStudyChunk = (chunk: any) => {
    setActiveChunk(chunk);
    setActiveTab('materials');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Cronograma', icon: Calendar },
    { id: 'galpao', label: 'Galpão de Arquivos', icon: Warehouse },
    { id: 'materials', label: 'Estudar Material', icon: FileText },
    { id: 'cycle', label: 'Ciclo de Estudo', icon: BrainCircuit },
    { id: 'tutor', label: 'Professor IA', icon: MessageSquare },
  ];

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StudySessionProvider user={user}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
          {/* Sidebar */}
          <aside className="w-full md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col print:hidden">
            <div className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Concurseiro</span>
              </div>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                    activeTab === tab.id 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {tab.label}
                </button>
              ))}
            </nav>

            <MiniTimer onNavigateToCycle={() => setActiveTab('cycle')} />
            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-indigo-100 dark:border-indigo-900" alt="Avatar" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 h-screen overflow-y-auto p-4 md:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-6xl mx-auto"
              >
                {activeTab === 'dashboard' && <Dashboard user={user} onStartNext={() => setActiveTab('cycle')} />}
                {activeTab === 'planner' && <StudyPlanner user={user} />}
                {activeTab === 'galpao' && <Galpao user={user} onStudyChunk={handleStudyChunk} />}
                {activeTab === 'materials' && <PDFUpload user={user} chunk={activeChunk} onGoToGalpao={() => setActiveTab('galpao')} />}
                {activeTab === 'cycle' && <StudyCycle user={user} />}
                {activeTab === 'tutor' && <AITutor user={user} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        </StudySessionProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

