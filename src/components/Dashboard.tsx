import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { studyService } from '../services/studyService';
import { useStudySession } from '../contexts/StudySessionContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function Dashboard({ user, onStartNext }: { user: FirebaseUser, onStartNext?: () => void }) {
  const { theme } = useTheme();
  const { blocks, activeBlockIndex, completedBlocks } = useStudySession();
  const [sessions, setSessions] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const data = await studyService.getUser(user.uid);
      setUserData(data);
    };
    fetchUserData();

    const unsubscribe = studyService.subscribeToSessions(user.uid, (data) => {
      // Auto-corrige sessões antigas que foram gravadas com 90 minutos ou mais
      data.forEach(s => {
        if (s.durationMinutes > 30 || s.subject === 'Ciclo Completo') {
          studyService.updateSession(user.uid, s.id, {
            subject: s.blocks ? s.blocks[0] : (s.subject === 'Ciclo Completo' ? 'Matéria Estudada' : s.subject),
            durationMinutes: 30
          });
        }
      });
      setSessions(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // As sessões agora são salvas bloco a bloco, então sessions contém tudo
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalHoursNum = totalMinutes / 60;
  
  const userLevel = Math.floor(totalHoursNum / 10) + 1;
  const nextLevelParams = `Faltam ${Math.ceil((userLevel * 10) - totalHoursNum)}h pro lvl ${userLevel + 1}`;

  const avgPerformance = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + (s.performance || 0), 0) / sessions.length)
    : 0;

  const upcomingBlock = blocks[activeBlockIndex]?.subject || 'Nenhuma configurada';

  const chartData = sessions.slice(-7).map(s => ({
    name: new Date(s.startTime).toLocaleDateString('pt-BR', { weekday: 'short' }),
    horas: (s.durationMinutes / 60).toFixed(1)
  }));

  const subjectPerformance = sessions.reduce((acc: any, s) => {
    if (!acc[s.subject]) acc[s.subject] = { name: s.subject, total: 0, count: 0 };
    acc[s.subject].total += s.performance || 0;
    acc[s.subject].count += 1;
    return acc;
  }, {});

  const performanceData = Object.values(subjectPerformance).map((s: any) => ({
    name: s.name,
    score: (s.total / s.count).toFixed(0)
  }));

  const handleResetStats = async () => {
    if (window.confirm("Isso apagará todo o histórico de horas estudadas e reiniciará o ciclo. Deseja continuar? (Útil para limpar dados de teste)")) {
      // Deleta as sessões
      for (const s of sessions) {
        await studyService.deleteSession(user.uid, s.id);
      }
      
      // Reseta o status de concluído no plano (Cronograma)
      if (userData?.plan) {
        const newPlan = userData.plan.map((item: any) => ({ ...item, completed: false }));
        await studyService.saveUser({
          ...userData,
          plan: newPlan
        });
        setUserData({ ...userData, plan: newPlan });
      }

      localStorage.removeItem('current_study_session');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bem-vindo, {user.displayName?.split(' ')[0]}!</h1>
          <p className="text-gray-500 dark:text-gray-400">Aqui está o seu progresso de estudos atual.</p>
        </div>
        <button 
          onClick={handleResetStats}
          className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          title="Zerar Estatísticas (Modo Dev)"
        >
          <Trash2 className="w-4 h-4" />
          Zerar Testes
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Clock} 
          label="Total de Horas" 
          value={`${totalHours}h`} 
          subValue={`Meta: ${userData?.totalStudyHours || 0}h`}
          color="bg-blue-500"
        />
        <StatCard 
          icon={Target} 
          label="Sessões Concluídas" 
          value={sessions.length.toString()} 
          subValue="+2 esta semana"
          color="bg-emerald-500"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Desempenho Médio" 
          value={`${avgPerformance}%`}
          subValue={sessions.length > 0 ? "Global" : "Aguardando mais dados"}
          color="bg-amber-500"
        />
        <StatCard 
          icon={Trophy} 
          label="Seu Nível" 
          value={`Lvl ${userLevel}`} 
          subValue={nextLevelParams}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Progress */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Progresso Semanal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#fff',
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                />
                <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Subject */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Desempenho por Matéria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#fff',
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                />
                <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: theme === 'dark' ? '#0f172a' : '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts/Notifications */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white flex items-center justify-between overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Pronto para a próxima sessão?</h3>
          <p className="text-indigo-100 opacity-90 mb-6 max-w-md">
            Sua matéria da vez no ciclo é **{upcomingBlock}**. 
            Mantenha o foco para acumular XP e subir de nível hoje!
          </p>
          <button 
            onClick={onStartNext}
            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
          >
            Começar Agora
          </button>
        </div>
        <BrainCircuit className="w-48 h-48 text-white opacity-10 absolute -right-8 -bottom-8" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-opacity-20`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h4>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{subValue}</p>
    </div>
  );
}

function BrainCircuit(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.105 4 4 0 0 0 7.327 1.48A3 3 0 1 0 12 5Z" />
      <path d="M9 13a4.5 4.5 0 0 0 3-4" />
      <path d="M6.003 5.125A3 3 0 0 0 12 5" />
      <path d="M12 5a3 3 0 0 0 5.997.125" />
      <path d="M21.477 10.895a4 4 0 0 1-2.526-5.77" />
      <path d="M18 5a3 3 0 0 1 3 3" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4" />
    </svg>
  );
}
