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
  Printer,
  CheckCircle2,
  Check,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [galpaoMaterials, setGalpaoMaterials] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const isDataLoaded = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await studyService.getUser(user.uid);
      if (data?.subjects) setSubjects(data.subjects);
      if (data?.totalStudyHours) setTotalHours(data.totalStudyHours);
      if (data?.dailyHoursGoal) setDailyGoal(data.dailyHoursGoal);
      if (data?.plan) {
        const fixedPlan = data.plan.map((item: any) => ({ ...item, durationMinutes: 30 }));
        setPlan(fixedPlan);
      }
      
      // Inscreve para pegar materiais do galpão para vincular ao cronograma
      const unsubscribeGalpao = studyService.subscribeToGalpao(user.uid, (materials) => {
        setGalpaoMaterials(materials);
      });
      
      // Dá tempo de todos os hooks de estado se estabilizarem antes de ativar o monitoramento
      setTimeout(() => {
        isDataLoaded.current = true;
      }, 500);

      return () => unsubscribeGalpao();
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
      const validSubjects = subjects.map(s => ({ name: s.name, weight: Number(s.weight) || 0 })).filter(s => s.weight > 0 && s.name.trim() !== '');
      
      if (validSubjects.length === 0) {
        showToast('Adicione matérias válidas com pesos maiores que zero.', 'error');
        setIsGenerating(false);
        return;
      }

      const totalBlocks = (Number(totalHours) || 0) * 2;
      if (totalBlocks <= 0) {
        showToast('Informe um número válido de Horas Totais de Estudo.', 'error');
        setIsGenerating(false);
        return;
      }

      // Agrupamento de Matérias (Meta-Matérias)
      // Ex: "Content Marketing 1" e "Content Marketing 2" viram o grupo "Content Marketing"
      const groups: Record<string, { weight: number; items: string[]; currentScore: number }> = {};

      validSubjects.forEach(s => {
        // Remove números do final do nome para encontrar o "grupo" (ex: "EDH 1" -> "EDH")
        const baseName = s.name.replace(/\s+\d+$/, '').trim();
        if (!groups[baseName]) {
          groups[baseName] = { weight: 0, items: [], currentScore: 0 };
        }
        // Acumula o peso total do grupo e coloca a submatéria na fila
        groups[baseName].weight += s.weight;
        groups[baseName].items.push(s.name);
      });

      const groupNames = Object.keys(groups);
      const totalGroupWeight = groupNames.reduce((acc, name) => acc + groups[name].weight, 0);
      const sequence: string[] = [];

      // Algoritmo Matemático de Rodízio sobre os GRUPOS (Weighted Round Robin)
      for (let i = 0; i < totalBlocks; i++) {
        // Adiciona os pesos aos scores atuais
        for (const name of groupNames) {
          groups[name].currentScore += groups[name].weight;
        }

        // Encontra o grupo com o maior score
        let maxGroup = groupNames[0];
        for (let j = 1; j < groupNames.length; j++) {
          if (groups[groupNames[j]].currentScore > groups[maxGroup].currentScore) {
            maxGroup = groupNames[j];
          }
        }

        // Subtrai o peso total do grupo vencedor para equilibrar
        groups[maxGroup].currentScore -= totalGroupWeight;

        // Tira o primeiro item da fila desse grupo e coloca de volta no final (Fila Circular)
        const nextItem = groups[maxGroup].items.shift()!;
        groups[maxGroup].items.push(nextItem);

        // Adiciona a submatéria exata na sequência final
        sequence.push(nextItem);
      }

      // Para não sobrecarregar a IA (ou estourar limite de tokens) pedimos no máximo 30 blocos detalhados
      const blocksToDetail = Math.min(30, totalBlocks);
      const sequenceToDetail = sequence.slice(0, blocksToDetail);
      
      let detailedPlan = [];
      try {
        detailedPlan = await geminiService.generateStudyPlan(sequenceToDetail);
      } catch (e) {
        console.warn("Falha ao gerar detalhes via IA, usando fallback.", e);
        detailedPlan = sequenceToDetail.map(subject => ({ subject, durationMinutes: 30, focusArea: `Foco em ${subject}` }));
      }

      // Monta o cronograma completo
      const generatedPlan = sequence.map((subject, index) => {
        if (index < detailedPlan.length && detailedPlan[index]?.focusArea) {
          return { subject, durationMinutes: 30, focusArea: detailedPlan[index].focusArea };
        }
        return { subject, durationMinutes: 30, focusArea: `Avanço e aprofundamento em ${subject}` };
      });

      setPlan(generatedPlan);
      await studyService.saveUser({
        uid: user.uid,
        subjects: validSubjects,
        totalStudyHours: Number(totalHours) || 0,
        dailyHoursGoal: Number(dailyGoal) || 0,
        plan: generatedPlan
      });
      showToast(`Cronograma de ${totalBlocks} blocos gerado com sucesso!`, 'success');
    } catch (error) {
      console.error('Failed to generate plan', error);
      showToast('Erro ao gerar cronograma.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };
  const toggleBlockCompletion = (index: number) => {
    const newPlan = [...plan];
    newPlan[index].completed = !newPlan[index].completed;
    setPlan(newPlan);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Planejador Inteligente</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure suas matérias e deixe a IA organizar seu tempo.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait"
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Metas Gerais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horas Totais de Estudo</label>
                <input 
                  type="number" 
                  value={totalHours === 0 ? '' : totalHours} 
                  onChange={(e) => setTotalHours(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horas por Dia</label>
                <input 
                  type="number" 
                  value={dailyGoal === 0 ? '' : dailyGoal} 
                  onChange={(e) => setDailyGoal(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                <Weight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Matérias e Pesos
              </h3>
              <button 
                onClick={handleAddSubject}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
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
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                  <input 
                    type="number" 
                    placeholder="%"
                    value={subject.weight === 0 ? '' : subject.weight}
                    onChange={(e) => handleSubjectChange(index, 'weight', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-16 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                  <button 
                    onClick={() => handleRemoveSubject(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${totalWeight === 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Cronograma Sugerido</h3>
                <button onClick={downloadPDF} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold" title="Baixar Cronograma em PDF">
                  <Printer className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                  {(() => {
                    const blocksPerDay = (Number(dailyGoal) || 1) * 2;
                    const totalDays = Math.ceil(plan.length / blocksPerDay);
                    return Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                          selectedDay === day
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        Dia {day}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(() => {
                  const blocksPerDay = (Number(dailyGoal) || 1) * 2;
                  const dayBlocks = plan.slice((selectedDay - 1) * blocksPerDay, selectedDay * blocksPerDay);
                  
                  return dayBlocks.map((item, localIdx) => {
                    const i = (selectedDay - 1) * blocksPerDay + localIdx;
                    return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleBlockCompletion(i)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          item.completed 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none' 
                            : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/70'
                        }`}
                      >
                        {item.completed ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                      </button>
                      <div className="flex-1">
                        <div className={item.completed ? 'opacity-50 line-through' : ''}>
                          <h4 className="font-bold text-gray-900 dark:text-white">{item.subject}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.focusArea}</p>
                        </div>

                        {/* Sincronização Fiel com Galpão (Match Normalizado) */}
                        {(() => {
                          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                          const subjectNorm = normalize(item.subject);
                          
                          if (subjectNorm.length < 3) return null;

                          const materialsMap = galpaoMaterials.reduce((acc, chunk) => {
                            const sId = chunk.sourceId;
                            if (!acc[sId]) {
                              const cleanFileName = (chunk.fileName || '').replace('.pdf', '');
                              acc[sId] = { 
                                nameNorm: normalize(cleanFileName),
                                realFileName: chunk.fileName || '',
                                chunks: [],
                                lastUpdated: chunk.createdAt || ''
                              };
                            }
                            acc[sId].chunks.push(chunk);
                            return acc;
                          }, {} as Record<string, { nameNorm: string, realFileName: string, chunks: any[], lastUpdated: string }>);

                          const sortedMatches = Object.values(materialsMap)
                            .map(m => {
                              let score = 0;
                              if (m.nameNorm === subjectNorm) score = 100;
                              else if (m.nameNorm.includes(subjectNorm) || subjectNorm.includes(m.nameNorm)) score = 50;
                              return { ...m, score };
                            })
                            .filter(m => m.score > 0)
                            .sort((a, b) => {
                              if (b.score !== a.score) return b.score - a.score;
                              return b.lastUpdated.localeCompare(a.lastUpdated);
                            });

                          const bestMatch = sortedMatches[0];
                          if (!bestMatch) return null;

                          const isExpanded = expandedBlocks.includes(i);
                          const relatedChunks = bestMatch.chunks;

                          return (
                            <div className="mt-4">
                              <button 
                                onClick={() => setExpandedBlocks(prev => 
                                  prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                                )}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors mb-2"
                              >
                                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                                <BookOpen className="w-3 h-3" />
                                Temas do Galpão ({relatedChunks.length})
                                <span className="text-[9px] text-slate-400 normal-case font-medium ml-2 opacity-60">
                                  Vinculado a: {bestMatch.realFileName}
                                </span>
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="overflow-hidden border-l-2 border-indigo-100 dark:border-indigo-900/30 pl-4 space-y-2.5"
                                  >
                                    {relatedChunks.map((chunk) => (
                                      <div 
                                        key={chunk.id} 
                                        className="flex items-center justify-between group cursor-pointer py-0.5"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          studyService.toggleChunkStudied(user.uid, chunk.id, !chunk.isStudied);
                                        }}
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                            chunk.isStudied 
                                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-indigo-400'
                                          }`}>
                                            {chunk.isStudied && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </div>
                                          <span className={`text-[11px] font-medium transition-colors truncate ${
                                            chunk.isStudied 
                                              ? 'text-gray-400 dark:text-gray-500 line-through' 
                                              : 'text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                          }`}>
                                            {chunk.title}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 ml-4 tabular-nums">30 min</span>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-100/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum cronograma gerado</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                Configure suas matérias e clique em "Gerar Cronograma" para que a IA crie um plano personalizado para você.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
