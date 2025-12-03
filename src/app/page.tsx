'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, DollarSign, Activity, RefreshCw, Filter, X, BrainCircuit, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzePortfolio, AnalysisResult } from '@/lib/intelligence';
import ReactMarkdown from 'react-markdown';
import { aiSettings } from '@/config/ai-settings';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Portfolio {
  id: string;
  name: string;
  type: string;
  value: string;
  risk: 'Conservador' | 'Moderado' | 'Agresivo' | 'Unknown';
  category?: string;
  returns: {
    daily: string;
    monthly: string;
    sixMonths: string;
    yearly: string;
  };
}

const RiskBadge = ({ risk }: { risk: string }) => {
  const colors = {
    Conservador: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Moderado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Agresivo: 'bg-red-500/20 text-red-400 border-red-500/30',
    Unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  // @ts-ignore
  const style = colors[risk] || colors.Unknown;

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", style)}>
      {risk}
    </span>
  );
};

const PortfolioCard = ({ portfolio }: { portfolio: Portfolio }) => {
  const parseReturn = (val: string) => parseFloat(val.replace('%', '').replace(',', '.'));
  const yearly = parseReturn(portfolio.returns.yearly);

  const ReturnItem = ({ label, value }: { label: string, value: string }) => {
    const val = parseReturn(value);
    const isPos = val >= 0;
    return (
      <div className="bg-slate-800/50 p-2 rounded-lg">
        <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">{label}</p>
        <p className={cn("text-lg font-bold", isPos ? "text-emerald-400" : "text-red-400")}>
          {value}
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-300 group h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[10px] text-emerald-500/80 font-mono mb-1 uppercase tracking-wider">{portfolio.category}</div>
          <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[3rem]">
            {portfolio.name}
          </h3>
          <p className="text-slate-400 text-xs mt-1">{portfolio.type} • {portfolio.value} M</p>
        </div>
        <RiskBadge risk={portfolio.risk} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 mt-auto">
        <ReturnItem label="1 Día" value={portfolio.returns.daily} />
        <ReturnItem label="Mes" value={portfolio.returns.monthly} />
        <ReturnItem label="6 Meses" value={portfolio.returns.sixMonths} />
        <ReturnItem label="Año (YTD)" value={portfolio.returns.yearly} />
      </div>
    </motion.div>
  );
};

// Add this component inside the file or separate
const AnalysisModal = ({ portfolio, onClose }: { portfolio: Portfolio; onClose: () => void }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateKey = async () => {
    if (!apiKey) return;
    setIsValidating(true);
    setError(null);
    setModels([]);

    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await res.json();

      if (data.success && data.models.length > 0) {
        setModels(data.models);

        let defaultModel = data.models[0];

        if (aiSettings.restrictModels) {
          // Priority 1: Configured default model (if it exists in the list and is allowed)
          if (aiSettings.defaultModel &&
            data.models.includes(aiSettings.defaultModel) &&
            aiSettings.allowedModels.includes(aiSettings.defaultModel)) {
            defaultModel = aiSettings.defaultModel;
          } else {
            // Priority 2: First available model that is allowed
            const firstAllowed = data.models.find((m: string) => aiSettings.allowedModels.includes(m));
            if (firstAllowed) {
              defaultModel = firstAllowed;
            }
          }
        } else {
          // If no restriction, just check if default model exists in the list
          if (aiSettings.defaultModel && data.models.includes(aiSettings.defaultModel)) {
            defaultModel = aiSettings.defaultModel;
          }
        }

        setSelectedModel(defaultModel);
        localStorage.setItem('gemini_api_key', apiKey);
      } else {
        setError(data.error || 'No se encontraron modelos disponibles.');
      }
    } catch (e) {
      setError('Error al validar la API Key.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!apiKey) return;

    setLoading(true);
    setError(null);
    setPdfUrl(null);
    localStorage.setItem('gemini_api_key', apiKey);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio, apiKey, model: selectedModel }),
      });

      const data = await res.json();

      if (data.success) {
        setAnalysis(data.analysis);
        if (data.pdfUrl) setPdfUrl(data.pdfUrl);
      } else {
        setError(data.error || 'Error al generar el análisis');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-emerald-500/10 flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BrainCircuit className="text-emerald-400" />
              Análisis AI: {portfolio.name}
            </h2>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline mt-1 block flex items-center gap-1"
              >
                <FileText size={12} />
                Ver Ficha Técnica (PDF)
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 grow overflow-y-auto">
          {!analysis && !loading && (
            <div className="flex flex-col gap-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-blue-200 text-sm">
                <p className="flex items-center gap-2 font-semibold mb-2">
                  <AlertTriangle size={16} />
                  Requiere Gemini API Key
                </p>
                <p>Para realizar un análisis con IA generativa, necesitas una API Key de Google Gemini. Tu llave se guardará localmente en tu navegador por lo que no se recomienda usar un dispositivo compartido.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Ingresa tu Gemini API Key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setModels([]); // Reset models when key changes
                      setSelectedModel('');
                    }}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 focus:border-emerald-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleValidateKey}
                    disabled={!apiKey || isValidating}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isValidating ? <RefreshCw className="animate-spin" size={16} /> : 'Validar'}
                  </button>
                </div>

                {models.length > 0 && (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm text-slate-400">Selecciona el Modelo:</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 focus:border-emerald-500 outline-none transition-colors text-white"
                      >
                        {models.map(model => {
                          const isAllowed = !aiSettings.restrictModels || aiSettings.allowedModels.includes(model);
                          return (
                            <option key={model} value={model} disabled={!isAllowed}>
                              {model} {!isAllowed ? '(No disponible)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={handleAnalyze}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <BrainCircuit size={18} />
                        Analizar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw className="animate-spin text-emerald-500" size={48} />
              <p className="text-slate-400 animate-pulse text-center">
                Generando análisis financiero detallado...<br />
                <span className="text-xs text-slate-500">(Obteniendo Ficha Técnica PDF, esto puede tomar unos segundos)</span>
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          {analysis && (
            <div className="prose prose-invert prose-emerald max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-emerald-400" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 text-emerald-300 border-b border-white/10 pb-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-5 mb-2 text-emerald-200" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-slate-300" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-300" {...props} />,
                  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                  strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Reusable Category Tabs Component
const CategoryTabs = ({ selected, onToggle }: { selected: string[], onToggle: (cat: string) => void }) => (
  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
    {['Portafolios Abiertos', 'Portafolios a la Medida', 'Portafolios Especiales'].map(cat => {
      const isActive = selected.includes(cat);
      return (
        <button
          key={cat}
          onClick={() => onToggle(cat)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2",
            isActive
              ? "bg-emerald-500 text-black border-emerald-500"
              : "bg-slate-900 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
          )}
        >
          {isActive && <CheckCircle size={14} />}
          {cat}
        </button>
      );
    })}
  </div>
);

export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string[]>(['Portafolios Abiertos']);
  const [top10FilterCategory, setTop10FilterCategory] = useState<string[]>(['Portafolios Abiertos']);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/skandia');
      const json = await res.json();
      if (json.success) {
        setPortfolios(json.data);
      } else {
        setError('No se pudo cargar la información. Intente nuevamente.');
      }
    } catch (e) {
      console.error(e);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategory = (cat: string) => {
    setFilterCategory(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const toggleTop10Category = (cat: string) => {
    setTop10FilterCategory(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const filteredPortfolios = portfolios.filter(p => {
    // If no category is selected, show none (or all? User said "activate 1, 2 or 3". If 0, usually nothing).
    // Let's assume if nothing is selected, we show nothing, or we could show all. 
    // Given the prompt "activate 1, 2 or 3", showing nothing when 0 are active is the most logical "filter" behavior.
    if (filterCategory.length > 0 && !filterCategory.includes(p.category || '')) return false;

    if (filterType !== 'All' && p.type !== filterType) return false;
    if (filterRisk !== 'All' && p.risk !== filterRisk) return false;
    return true;
  });

  // Top 10 Logic - Derived from portfolios but filtered by top10FilterCategory
  const top10 = portfolios
    .filter(p => top10FilterCategory.length === 0 || top10FilterCategory.includes(p.category || ''))
    .sort((a, b) => {
      const valA = parseFloat(a.returns.yearly.replace('%', '').replace(',', '.'));
      const valB = parseFloat(b.returns.yearly.replace('%', '').replace(',', '.'));
      return valB - valA;
    })
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Skandia Intelligence
            </h1>
            <p className="text-slate-400 mt-2">Monitor de Rentabilidades y Análisis en Tiempo Real</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg transition-colors border border-emerald-500/20"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </header>

        {/* Top 10 Section */}
        {!loading && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-emerald-400" />
              <h2 className="text-2xl font-semibold">Top 10 Portafolios (Filtrados)</h2>
            </div>

            <CategoryTabs selected={top10FilterCategory} onToggle={toggleTop10Category} />

            {top10.length > 0 ? (
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {top10.map((p, index) => (
                    <div key={p.id} className="w-64 bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition-colors cursor-pointer group" onClick={() => setSelectedPortfolio(p)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-emerald-500 font-bold text-lg">#{index + 1}</span>
                        <RiskBadge risk={p.risk} />
                      </div>
                      <h3 className="font-semibold truncate mb-2 group-hover:text-emerald-400 text-sm">{p.name}</h3>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-slate-500">Año</p>
                          <p className="text-sm font-bold text-white">{p.returns.yearly}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Mes</p>
                          <p className="text-sm font-bold text-white">{p.returns.monthly}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">6M</p>
                          <p className="text-sm font-bold text-white">{p.returns.sixMonths}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Día</p>
                          <p className="text-sm font-bold text-white">{p.returns.daily}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">Selecciona una categoría para ver el Top 10.</div>
            )}
          </section>
        )}

        {/* Category Tabs (Main Grid) */}
        <CategoryTabs selected={filterCategory} onToggle={toggleCategory} />

        {/* Filters */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="All">Todos los Tipos</option>
            <option value="RV">Renta Variable (RV)</option>
            <option value="RF">Renta Fija (RF)</option>
            <option value="IA">Inv. Alternativa (IA)</option>
          </select>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="All">Todos los Riesgos</option>
            <option value="Conservador">Conservador</option>
            <option value="Moderado">Moderado</option>
            <option value="Agresivo">Agresivo</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-center">
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-900/50 rounded-xl border border-white/5"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map(portfolio => (
              <div key={portfolio.id} className="relative">
                <PortfolioCard portfolio={portfolio} />
                <button
                  onClick={() => setSelectedPortfolio(portfolio)}
                  className="absolute bottom-4 right-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border border-emerald-500/20"
                >
                  <BrainCircuit size={14} />
                  AI Analysis
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedPortfolio && (
          <AnalysisModal portfolio={selectedPortfolio} onClose={() => setSelectedPortfolio(null)} />
        )}
      </div>
    </main>
  );
}
