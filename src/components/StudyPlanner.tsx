import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { geminiService } from '../services/geminiService';
import { studyService } from '../services/studyService';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Save,
  Clock,
  Weight,
  AlertCircle,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudyPlanner({ user }: { user: FirebaseUser }) {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState([
    { name: 'Seguridade Social', weight: 58 },
    { name: 'Português', weight: 15 },
    { name: 'Direito Administrativo', weight: 5 },
    { name: 'Direito Constitucional', weight: 5 },
    { name: 'Raciocínio Lógico', weight: 5 },
    { name: 'Informática', weight: 5 },
    { name: 'Ética', weight: 5 },
  ]);
  const [totalHours, setTotalHours] = useState(540);
  const [dailyGoal, setDailyGoal] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isDataLoaded = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await studyService.getUser(user.uid);
      if (data?.subjects) setSubjects(data.subjects);
      if (data?.totalStudyHours) setTotalHours(data.totalStudyHours);
      if (data?.dailyHoursGoal) setDailyGoal(data.dailyHoursGoal);
      if (data?.plan) setPlan(data.plan);
      
      // Dá tempo de todos os hooks de estado se estabilizarem antes de ativar o monitoramento
      setTimeout(() => {
        isDataLoaded.current = true;
      }, 500);
    };
    loadData();
  }, [user.uid]);

  useEffect(() => {
    if (!isDataLoaded.current) return;
    
    // Auto-save settings when changes are made, with 1.5s debounce
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      await studyService.saveUser({
        uid: user.uid,
        subjects: subjects.map(s => ({ ...s, weight: Number(s.weight) || 0 })),
        totalStudyHours: Number(totalHours) || 0,
        dailyHoursGoal: Number(dailyGoal) || 0,
        plan
      });
      setIsSaving(false);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [subjects, totalHours, dailyGoal, plan, user.uid]);

  const handleAddSubject = () => {
    setSubjects([...subjects, { name: '', weight: 0 }]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: string, value: any) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await studyService.saveUser({
      uid: user.uid,
      subjects: subjects.map(s => ({ ...s, weight: Number(s.weight) || 0 })),
      totalStudyHours: Number(totalHours) || 0,
      dailyHoursGoal: Number(dailyGoal) || 0,
      plan
    });
    setIsSaving(false);
    showToast('Configurações salvas com sucesso!', 'success');
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const generatedPlan = await geminiService.generateStudyPlan(subjects, totalHours);
      setPlan(generatedPlan);
    } catch (error) {
      console.error('Failed to generate plan', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text('Cronograma de Estudos - Concurseiro SIPC', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Plano automatizado gerado por Inteligência Artificial', 14, 30);

    const tableColumn = ["Bloco", "Matéria", "Foco de Estudo", "Duração Máxima"];
    const tableRows: any[] = [];

    plan.forEach((item, index) => {
      tableRows.push([
        `${index + 1}º Bloco`,
        item.subject,
        item.focusArea,
        `${item.durationMinutes} min`
      ]);
    });

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [79, 70, 229], // indigo-600
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        3: { cellWidth: 25, halign: 'center' }
      }
    });

    doc.save('cronograma_concurseiro.pdf');
  };

  const totalWeight = subjects.reduce((acc, s) => acc + Number(s.weight), 0);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Planejador Inteligente</h1>
          <p className="text-gray-500">Configure suas matérias e deixe a IA organizar seu tempo.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-gray-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait"
        >
          {isSaving ? (
             <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"
            />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Metas Gerais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas Totais de Estudo</label>
                <input 
                  type="number" 
                  value={totalHours === 0 ? '' : totalHours} 
                  onChange={(e) => setTotalHours(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas por Dia</label>
                <input 
                  type="number" 
                  value={dailyGoal === 0 ? '' : dailyGoal} 
                  onChange={(e) => setDailyGoal(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Weight className="w-5 h-5 text-indigo-600" />
                Matérias e Pesos
              </h3>
              <button 
                onClick={handleAddSubject}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.map((subject, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="Matéria"
                    value={subject.name}
                    onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input 
                    type="number" 
                    placeholder="%"
                    value={subject.weight === 0 ? '' : subject.weight}
                    onChange={(e) => handleSubjectChange(index, 'weight', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={() => handleRemoveSubject(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${totalWeight === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <AlertCircle className="w-4 h-4" />
              Total de pesos: {totalWeight}% {totalWeight !== 100 && '(Recomendado: 100%)'}
            </div>
          </div>

          <button 
            onClick={generatePlan}
            disabled={isGenerating}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Gerar Cronograma com IA
          </button>
        </div>

        {/* Plan Display */}
        <div className="lg:col-span-2">
          {plan.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Cronograma Sugerido</h3>
                <button onClick={downloadPDF} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold" title="Baixar Cronograma em PDF">
                  <Printer className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {plan.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{item.subject}</h4>
                        <p className="text-sm text-gray-500">{item.focusArea}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-600">{item.durationMinutes} min</div>
                      <div className="text-xs text-gray-400">Bloco Sugerido</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum cronograma gerado</h3>
              <p className="text-gray-500 max-w-xs">
                Configure suas matérias e clique em "Gerar Cronograma" para que a IA crie um plano personalizado para você.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
