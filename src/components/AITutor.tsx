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
  Headphones
} from 'lucide-react';
import { motion } from 'motion/react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const playAudio = (text: string, index: number) => {
    if (playingIndex === index) {
      window.speechSynthesis.cancel();
      setPlayingIndex(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    // Limpa asteriscos, hashtags e outros caracteres de formatação Markdown para a voz não ler isso
    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    
    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);
    
    setPlayingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <header className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Professor IA</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">Online e pronto para ajudar</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

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
                msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-50 text-gray-800 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2 text-indigo-900" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-indigo-800" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-2 text-indigo-700" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />
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
                      playingIndex === i ? 'opacity-100 bg-indigo-100 text-indigo-600' : 'opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-400 hover:text-indigo-600'
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
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-6 border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tire sua dúvida sobre qualquer matéria..."
            className="w-full pl-6 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-md shadow-indigo-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs text-gray-400 font-medium">Sugestões:</span>
          <button onClick={() => setInput("Explique o que é Seguridade Social")} className="text-xs text-indigo-600 hover:underline">O que é Seguridade Social?</button>
          <button onClick={() => setInput("Como funciona a revisão espaçada?")} className="text-xs text-indigo-600 hover:underline">Revisão espaçada?</button>
        </div>
      </footer>
    </div>
  );
}
