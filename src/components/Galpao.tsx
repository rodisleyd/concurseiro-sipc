import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { studyService } from '../services/studyService';
import { geminiService } from '../services/geminiService';
import { 
  Warehouse, 
  Upload, 
  FileText, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  Archive,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from './Toast';

// Carga do worker via CDN (mesmo do PDFUpload)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Galpao({ user, onStudyChunk }: { user: FirebaseUser, onStudyChunk: (chunk: any) => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = studyService.subscribeToGalpao(user.uid, (data) => {
      setMaterials(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setLoadingMsg('Lendo PDF localmente...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 10); // Limite por enquanto
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      setLoadingMsg('IA separando o conteúdo por temas (Galpão em ação)...');
      
      const chunks = await geminiService.splitMaterialIntoChunks(fullText);
      
      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
         // Se a IA nao dividiu bem, cria 1 unico chunk
         const fallbackChunks = [{ title: 'Material Completo', content: fullText }];
         await studyService.saveGalpaoChunks(user.uid, file.name, fallbackChunks);
      } else {
         // Sanitiza chunks para evitar `undefined` quebrando o Firebase
         const safeChunks = chunks.map(c => ({
           title: c.title || 'Capítulo da Apostila',
           content: c.content || 'Sem texto legível',
         }));
         await studyService.saveGalpaoChunks(user.uid, file.name, safeChunks);
      }

    } catch (err: any) {
      console.error("ERRO NO GALPAO:", err);
      showToast(`Ocorreu um erro: ${err?.message || 'Falha na IA'}`, 'error');
    } finally {
      setIsProcessing(false);
      setLoadingMsg('');
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta aula?')) return;
    try {
      await studyService.deleteGalpaoChunk(user.uid, chunkId);
      showToast('Aula excluída do Galpão.', 'info');
    } catch (err) {
      showToast('Erro ao excluir a aula.', 'error');
    }
  };

  const handleDeleteMaterial = async (sourceId: string, fileName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir toda a apostila "${fileName}"? Isso apagará todas as aulas relacionadas.`)) return;
    try {
      await studyService.deleteGalpaoMaterial(user.uid, sourceId);
      showToast('Apostila completa removida.', 'info');
    } catch (err) {
      showToast('Erro ao excluir a apostila.', 'error');
    }
  };

  // Agrupar materiais pelo SourceID
  const groupedMaterials = materials.reduce((acc, curr) => {
    if (!acc[curr.sourceId]) acc[curr.sourceId] = [];
    acc[curr.sourceId].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Galpão de Arquivos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Faça o upload do seu edital/apostilas. Nós separamos os temas para você estudar.</p>
        </div>
        
        <input 
          type="file" 
          accept=".pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {isProcessing ? 'Armazenando...' : 'Adicionar Apostila (PDF)'}
        </button>
      </header>

      {isProcessing && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex items-center justify-center gap-4 text-indigo-700 dark:text-indigo-300 font-bold">
          <Loader2 className="w-6 h-6 animate-spin" />
          {loadingMsg}
        </div>
      )}

      {Object.keys(groupedMaterials).length === 0 && !isProcessing ? (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-16 text-center">
          <Archive className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500">O Galpão está vazio</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Envie PDFs para seus funcionários começarem a separação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(groupedMaterials).map(([sourceId, chunks]) => (
            <div key={sourceId} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate" title={chunks[0].fileName}>
                    {chunks[0].fileName}
                  </h3>
                  {(() => {
                    const processed = chunks.filter(c => c.processedAt).length;
                    const total = chunks.length;
                    const percent = Math.round((processed / total) * 100);
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">{percent}% pronto</span>
                      </div>
                    );
                  })()}
                </div>
                <button 
                  onClick={() => handleDeleteMaterial(sourceId, chunks[0].fileName)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Excluir Apostila Inteira"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3 mt-4">
                {chunks.map((chunk, idx) => (
                  <div key={chunk.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors group">
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                      {chunk.processedAt ? (
                         <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                         <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{chunk.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {chunk.processedAt ? 'Aula Pronta' : 'Aguardando processamento'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={() => handleDeleteChunk(chunk.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Tópico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onStudyChunk(chunk)}
                        className={`w-32 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                          chunk.processedAt 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500' 
                          : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                        }`}
                      >
                        {chunk.processedAt ? 'Revisar' : 'Gerar Aula'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
