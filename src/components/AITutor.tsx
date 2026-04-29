import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User as FirebaseUser } from 'firebase/auth';
import { geminiService } from '../services/geminiService';
import { 
  Send, 
  Bot, 
  User as UserIcon,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Headphones,
  X,
  FileDown,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AITutor({ user }: { user: FirebaseUser }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Olá ${user.displayName?.split(' ')[0]}! Eu sou seu Professor IA. Como posso te ajudar nos estudos hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [quickSearchResponse, setQuickSearchResponse] = useState('');
  const [isQuickSearching, setIsQuickSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await geminiService.explainTopic(userMessage, 'Concursos Públicos');
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'Desculpe, não consegui processar sua dúvida.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro ao conectar com o servidor.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = async () => {
    if (!quickSearchInput.trim() || isQuickSearching) return;
    setIsQuickSearching(true);
    try {
      const response = await geminiService.quickSearch(quickSearchInput);
      setQuickSearchResponse(response || 'Não consegui encontrar uma resposta rápida para isso.');
    } catch (error) {
      console.error(error);
      setQuickSearchResponse('Ocorreu um erro ao realizar a busca rápida.');
    } finally {
      setIsQuickSearching(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Professor IA - Relatório de Estudo", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 33);

    let y = 55;
    
    messages.forEach((msg, i) => {
      // Check for page overflow
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const role = msg.role === 'user' ? 'Você' : 'Professor IA';
      const cleanContent = msg.content.replace(/[*#_`~]/g, '');
      
      // Role Label
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(msg.role === 'user' ? 79 : 100, msg.role === 'user' ? 70 : 116, msg.role === 'user' ? 229 : 139);
      doc.text(role.toUpperCase(), 20, y);
      y += 6;

      // Message Content
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55); // Gray 800
      
      const splitText = doc.splitTextToSize(cleanContent, pageWidth - 40);
      doc.text(splitText, 20, y);
      
      y += (splitText.length * 6) + 12;
    });

    doc.save(`estudo-concurseiro-${new Date().getTime()}.pdf`);
  };

  const playAudio = async (text: string, index: number) => {
    if (playingIndex === index) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingIndex(null);
      return;
    }
    
    // Para qualquer áudio anterior
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setPlayingIndex(index);

    try {
      // Limpa markdown para o TTS
      const cleanText = text
        .replace(/[*#_`~]/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

      const base64Audio = await geminiService.textToSpeech(cleanText);
      
      if (base64Audio) {
        // Convertendo base64 para Blob (Padrão Spark)
        const binary = window.atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        audioRef.current = audio;
        
        audio.onended = () => {
          setPlayingIndex(null);
          audioRef.current = null;
          URL.revokeObjectURL(url);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'pt-BR';
          utterance.onend = () => setPlayingIndex(null);
          window.speechSynthesis.speak(utterance);
        };

        await audio.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.onend = () => setPlayingIndex(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`~]/g, ''));
      utterance.lang = 'pt-BR';
      utterance.onend = () => setPlayingIndex(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <header className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Professor IA</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Online e pronto para ajudar</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowQuickSearch(!showQuickSearch)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
              showQuickSearch ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50' : 'text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Abrir busca rápida"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Curiosidades</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2 text-indigo-900 dark:text-indigo-300" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-indigo-800 dark:text-indigo-400" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-2 text-indigo-700 dark:text-indigo-500" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => playAudio(msg.content, i)}
                    className={`absolute -right-10 top-2 p-1.5 rounded-lg transition-opacity ${
                      playingIndex === i ? 'opacity-100 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                    title="Ouvir explicação"
                  >
                    <Headphones className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 flex gap-1">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {showQuickSearch && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 flex flex-col gap-4 absolute right-0 top-0 bottom-0 z-10"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Saber +
                </h3>
                <button onClick={() => setShowQuickSearch(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={quickSearchInput}
                  onChange={(e) => setQuickSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                  placeholder="Termo ou curiosidade..."
                  className="w-full pl-3 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={handleQuickSearch}
                  disabled={!quickSearchInput.trim() || isQuickSearching}
                  className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {isQuickSearching ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Pesquisando...</span>
                  </div>
                ) : quickSearchResponse ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ReactMarkdown>{quickSearchResponse}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 gap-2">
                    <Bot className="w-8 h-8" />
                    <p>Digite algo acima para saber mais rapidamente!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="p-6 border-t border-slate-100 dark:border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tire sua dúvida sobre qualquer matéria..."
            className="w-full pl-6 pr-16 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-md shadow-indigo-100 dark:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 font-medium">Sugestões:</span>
            <button onClick={() => setInput("Explique o que é Seguridade Social")} className="text-xs text-indigo-600 hover:underline">O que é Seguridade Social?</button>
            <button onClick={() => setInput("Como funciona a revisão espaçada?")} className="text-xs text-indigo-600 hover:underline">Revisão espaçada?</button>
          </div>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Salvar PDF
          </button>
        </div>
      </footer>
    </div>
  );
}
