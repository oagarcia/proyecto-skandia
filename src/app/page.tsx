'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw, X, BrainCircuit, AlertTriangle, CheckCircle, FileText, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { aiSettings } from '@/config/ai-settings';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

function sanitizeUrl(url: string | undefined): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url, 'https://dummy.base');
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (safeProtocols.includes(parsed.protocol)) {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function downloadPdfDataUrl(pdfUrl: string, portfolioName: string) {
  if (pdfUrl.startsWith('data:')) {
    const parts = pdfUrl.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Ficha_Tecnica_${portfolioName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } else {
    // 🛡️ SENTINEL: Sanitize the URL to prevent DOM XSS via 'javascript:' URIs
    // and use 'noopener,noreferrer' to prevent Reverse Tabnabbing attacks.
    window.open(sanitizeUrl(pdfUrl), '_blank', 'noopener,noreferrer');
  }
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
  // @ts-expect-error - index access
  const style = colors[risk] || colors.Unknown;

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", style)}>
      {risk}
    </span>
  );
};

const ReturnValue = ({ value, className }: { value: string, className?: string }) => {
  const parseReturn = (val: string) => parseFloat(val.replace('%', '').replace(',', '.'));
  const val = parseReturn(value);
  const isPos = val >= 0;
  return (
    <span className={cn(className, isPos ? "text-emerald-400" : "text-red-400")}>
      {value}
    </span>
  );
};

const ReturnItem = ({ label, value }: { label: string, value: string }) => {
  return (
    <div className="bg-slate-800/50 p-2 rounded-lg">
      <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <ReturnValue value={value} className="text-lg font-bold" />
    </div>
  );
};

const PortfolioCard = ({
  portfolio,
  onOpenChart,
  onOpenAnalysis
}: {
  portfolio: Portfolio;
  onOpenChart: () => void;
  onOpenAnalysis: () => void;
}) => {

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

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChart();
          }}
          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 border border-emerald-500/20 shadow-sm"
        >
          <TrendingUp size={14} />
          Ver Gráfico
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAnalysis();
          }}
          className="flex-1 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 border border-purple-500/20 shadow-sm"
        >
          <BrainCircuit size={14} />
          Análisis IA
        </button>
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

  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.target === dialog) {
        dialog.removeEventListener('transitionend', handleTransitionEnd);
        onClose();
      }
    };
    dialog.addEventListener('transitionend', handleTransitionEnd);

    setTimeout(() => {
      onClose();
    }, 400); // fallback in case transitionend doesn't fire

    dialog.close();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();

      // Lock background scrolling on html and body
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const handleCancel = (e: Event) => {
        e.preventDefault();
        handleClose();
      };

      dialog.addEventListener('cancel', handleCancel);

      return () => {
        dialog.removeEventListener('cancel', handleCancel);
        // Restore background scrolling on unmount
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [handleClose]);

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        handleClose();
      }
    }
  };

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
    } catch {
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
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-emerald-500/10 flex flex-col p-0 text-white outline-none"
    >
      <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-emerald-400 shrink-0" size={20} />
            <span className="truncate max-w-[200px] sm:max-w-none">Análisis AI: {portfolio.name}</span>
          </h2>
          {pdfUrl && (
            <button
              onClick={() => downloadPdfDataUrl(pdfUrl, portfolio.name)}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline mt-1 block flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
            >
              <FileText size={12} />
              Descargar Ficha Técnica (PDF)
            </button>
          )}
        </div>
        <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6 grow overflow-y-auto">
        {!analysis && !loading && (
          <div className="flex flex-col gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-blue-200 text-sm">
              <p className="flex items-center gap-2 font-semibold mb-2">
                <AlertTriangle size={16} />
                Requiere Gemini API Key
              </p>
              <p className="text-xs sm:text-sm">Para realizar un análisis con IA generativa, necesitas una API Key de Google Gemini. Tu llave se guardará localmente en tu navegador por lo que no se recomienda usar un dispositivo compartido.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  placeholder="Ingresa tu Gemini API Key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setModels([]); // Reset models when key changes
                    setSelectedModel('');
                  }}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 focus:border-emerald-500 outline-none transition-colors text-sm"
                />
                <button
                  onClick={handleValidateKey}
                  disabled={!apiKey || isValidating}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isValidating ? <RefreshCw className="animate-spin" size={16} /> : 'Validar'}
                </button>
              </div>


              {models.length > 0 && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm text-slate-400">Selecciona el Modelo:</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 focus:border-emerald-500 outline-none transition-colors text-white w-full"
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
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
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
                h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-emerald-400" {...props} />,
                h2: ({ ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 text-emerald-300 border-b border-white/10 pb-2" {...props} />,
                h3: ({ ...props }) => <h3 className="text-lg font-bold mt-5 mb-2 text-emerald-200" {...props} />,
                p: ({ ...props }) => <p className="mb-4 leading-relaxed text-slate-300" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-300" {...props} />,
                li: ({ ...props }) => <li className="pl-1" {...props} />,
                strong: ({ ...props }) => <strong className="text-white font-semibold" {...props} />,
                a: ({ ...props }) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-emerald-900/30 text-emerald-300 text-xs font-medium hover:bg-emerald-800 transition-colors no-underline border border-emerald-800/50"
                    {...props}
                    href={sanitizeUrl(props.href)}
                  >
                    {props.children}
                  </a>
                ),
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </dialog>
  );
};

const formatDateToYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatYYYYMMDDToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

const ChartModal = ({ portfolio, onClose }: { portfolio: Portfolio; onClose: () => void }) => {
  const [period, setPeriod] = useState<string>('P4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ Date: string; formattedDate: string; Value: number }[]>([]);
  const [stats, setStats] = useState<{ var: number; label: string } | null>(null);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); // 6 months ago default
    return formatDateToYYYYMMDD(d);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return formatDateToYYYYMMDD(new Date());
  });
  const [searchRange, setSearchRange] = useState<{ start: string; end: string } | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.target === dialog) {
        dialog.removeEventListener('transitionend', handleTransitionEnd);
        onClose();
      }
    };
    dialog.addEventListener('transitionend', handleTransitionEnd);

    setTimeout(() => {
      onClose();
    }, 400); // fallback in case transitionend doesn't fire

    dialog.close();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();

      // Lock background scrolling on html and body
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const handleCancel = (e: Event) => {
        e.preventDefault();
        handleClose();
      };

      dialog.addEventListener('cancel', handleCancel);

      return () => {
        dialog.removeEventListener('cancel', handleCancel);
        // Restore background scrolling on unmount
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [handleClose]);

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        handleClose();
      }
    }
  };

  useEffect(() => {
    const fetchChartData = async () => {
      if (period === 'custom' && !searchRange) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const safeId = portfolio.id.replace(/[^A-Z0-9_]/g, '');
        let apiPeriod = period;
        if (period === 'custom' && searchRange) {
          const startFormatted = formatYYYYMMDDToDDMMYYYY(searchRange.start);
          const endFormatted = formatYYYYMMDDToDDMMYYYY(searchRange.end);
          apiPeriod = `P0_${startFormatted}_${endFormatted}`;
        }

        const res = await fetch(`/api/skandia/series?id=${safeId}&period=${apiPeriod}`);
        const json = await res.json();

        if (json.success && json.data) {
          setStats({
            var: json.data.var || 0,
            label: json.data.label || ''
          });

          const rawSeries = json.data.series || [];
          const formattedSeries = rawSeries.map((item: { Date: string; Value: string | number }) => {
            const dateObj = new Date(item.Date);
            let formattedDate = '';
            if (period === 'P1') {
              formattedDate = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            } else if (period === 'P2') {
              formattedDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
            } else if (period === 'custom' && searchRange) {
              const startD = new Date(searchRange.start);
              const endD = new Date(searchRange.end);
              const diffTime = Math.abs(endD.getTime() - startD.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 60) {
                formattedDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
              } else {
                formattedDate = dateObj.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
              }
            } else {
              formattedDate = dateObj.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
            }

            const numericValue = typeof item.Value === 'number' ? item.Value : parseFloat(item.Value) || 0;

            return {
              Date: item.Date,
              formattedDate,
              Value: numericValue
            };
          });

          setChartData(formattedSeries);
        } else {
          setError(json.error || 'No se pudieron obtener los datos históricos.');
        }
      } catch (err) {
        console.error(err);
        setError('Error de conexión al cargar el gráfico.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [portfolio.id, period, searchRange]);

  const periodsList = [
    { id: 'P1', label: '1 Día' },
    { id: 'P2', label: '1 Mes' },
    { id: 'P3', label: '180 Días' },
    { id: 'P4', label: '1 Año' },
    { id: 'custom', label: 'Rango' }
  ];

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl shadow-emerald-500/10 flex flex-col p-4 sm:p-6 text-white outline-none"
    >
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-emerald-500 font-mono mb-1 uppercase tracking-wider">{portfolio.category}</div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
            <TrendingUp className="text-emerald-400 shrink-0" size={20} />
            <span className="truncate">Histórico: {portfolio.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 truncate">
            Sigla: <span className="font-mono text-slate-300">{portfolio.id}</span> • Valor Fondo: <span className="text-slate-300 font-semibold">{portfolio.value} M</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-950/60 p-1.5 rounded-xl border border-white/5 mb-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-none momentum-scroll pb-1 sm:pb-0">
          {periodsList.map((item) => {
            const active = period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPeriod(item.id);
                  if (item.id === 'custom' && !searchRange) {
                    setSearchRange({ start: startDate, end: endDate });
                  }
                }}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-300 relative",
                  active
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/10 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {stats && !loading && (
          <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end px-2 py-1.5 sm:py-0 sm:px-0 sm:text-right border-t border-white/5 sm:border-t-0 w-full sm:w-auto mt-1 sm:mt-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider sm:block">Variación Período</span>
            <span className={cn("text-xs sm:text-sm font-bold sm:mt-0.5", stats.var >= 0 ? "text-emerald-400" : "text-red-400")}>
              {stats.var >= 0 ? '+' : ''}{stats.var.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {period === 'custom' && (
        <div className="flex flex-col gap-2 bg-slate-950/40 p-4 rounded-xl border border-white/5 mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-emerald-500 outline-none transition-colors text-white [color-scheme:dark]"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-emerald-500 outline-none transition-colors text-white [color-scheme:dark]"
              />
            </div>
            <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                type="button"
                onClick={() => setSearchRange({ start: startDate, end: endDate })}
                disabled={!startDate || !endDate || loading || !!(startDate && endDate && new Date(startDate) > new Date(endDate))}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs px-5 py-2.5 rounded-lg transition-all w-full text-center"
              >
                Buscar
              </button>
            </div>
          </div>
          {startDate && endDate && new Date(startDate) > new Date(endDate) && (
            <p className="text-[10px] text-red-400 animate-pulse">
              La fecha de inicio debe ser anterior o igual a la fecha de fin.
            </p>
          )}
        </div>
      )}

      <div className="bg-slate-950/40 rounded-xl border border-white/5 p-4 h-60 sm:h-72 flex items-center justify-center relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-emerald-500" size={36} />
            <p className="text-xs text-slate-500">Cargando histórico...</p>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <AlertTriangle className="text-red-400 mx-auto mb-2" size={32} />
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => setPeriod(period)}
              className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-xs text-slate-500">No hay datos históricos disponibles en este período.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="formattedDate"
                stroke="#ffffff40"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#ffffff40"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(val) => Math.round(val).toLocaleString('es-CO')}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    const dateObj = new Date(dataPoint.Date);
                    const formattedFullDate = dateObj.toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });

                    return (
                      <div className="bg-slate-900/95 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-1">
                          {formattedFullDate}
                        </p>
                        <p className="text-sm font-bold text-white">
                          Índice: <span className="text-emerald-400 font-mono font-black">{payload[0].value?.toLocaleString('es-CO')}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="Value"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4 text-[10px] text-slate-500">
        <p className="leading-normal">
          * El gráfico muestra el crecimiento unitario indexado a base inicial 1000.
        </p>
        {stats && (
          <p className="font-mono text-slate-400 whitespace-nowrap">
            Rango: {stats.label}
          </p>
        )}
      </div>
    </dialog>
  );
};

// Reusable Filter Tabs Component
const FilterTabs = ({ items, selected, onToggle, label }: { items: string[], selected: string[], onToggle: (item: string) => void, label?: string }) => (
  <div className="flex flex-col gap-2 mb-4">
    {label && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>}
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none momentum-scroll pr-10">
        {items.map(item => {
          const isActive = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2",
                isActive
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "bg-slate-900 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              {isActive && <CheckCircle size={14} />}
              {item}
            </button>
          );
        })}
      </div>
      {/* Right fade gradient to visually indicate horizontal scrolling on mobile */}
      <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />
    </div>
  </div>
);


export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string[]>(['Portafolios Abiertos']);
  const [rankedFilterCategory, setRankedFilterCategory] = useState<string[]>(['Portafolios Abiertos']);
  const [rankedFilterRisk, setRankedFilterRisk] = useState<string[]>(['Conservador', 'Moderado', 'Agresivo']);
  const [rankedSortCriteria, setRankedSortCriteria] = useState<string>('Score');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [selectedChartPortfolio, setSelectedChartPortfolio] = useState<Portfolio | null>(null);

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

  const toggleRankedCategory = (cat: string) => {
    setRankedFilterCategory(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const toggleRankedRisk = (risk: string) => {
    setRankedFilterRisk(prev =>
      prev.includes(risk)
        ? prev.filter(r => r !== risk)
        : [...prev, risk]
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

  // Ranking Logic - Derived from portfolios but filtered by rankedFilterCategory and rankedFilterRisk
  const rankedPortfolios = portfolios
    .filter(p => rankedFilterCategory.length === 0 || rankedFilterCategory.includes(p.category || ''))
    .filter(p => rankedFilterRisk.length === 0 || rankedFilterRisk.includes(p.risk || ''))
    .sort((a, b) => {
      const parse = (v: string) => parseFloat(v.replace('%', '').replace(',', '.')) || 0;

      if (rankedSortCriteria === 'Score') {
        const scoreA = parse(a.returns.yearly) * 0.50 + parse(a.returns.sixMonths) * 0.30 + parse(a.returns.monthly) * 0.15 + parse(a.returns.daily) * 0.05;
        const scoreB = parse(b.returns.yearly) * 0.50 + parse(b.returns.sixMonths) * 0.30 + parse(b.returns.monthly) * 0.15 + parse(b.returns.daily) * 0.05;
        return scoreB - scoreA;
      }

      const valA = rankedSortCriteria === 'Yearly' ? parse(a.returns.yearly) :
        rankedSortCriteria === 'SixMonths' ? parse(a.returns.sixMonths) :
          rankedSortCriteria === 'Monthly' ? parse(a.returns.monthly) :
            parse(a.returns.daily);

      const valB = rankedSortCriteria === 'Yearly' ? parse(b.returns.yearly) :
        rankedSortCriteria === 'SixMonths' ? parse(b.returns.sixMonths) :
          rankedSortCriteria === 'Monthly' ? parse(b.returns.monthly) :
            parse(b.returns.daily);

      return valB - valA;
    });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Skandia Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">Monitor de Rentabilidades y Análisis en Tiempo Real</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg transition-colors border border-emerald-500/20 w-full sm:w-auto justify-center"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </header>


        {/* Ranking Section */}
        {!loading && (
          <section className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-400" />
                <h2 className="text-2xl font-semibold">Ranking de Desempeño</h2>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-3">Ordenar por:</span>
                <select
                  value={rankedSortCriteria}
                  onChange={(e) => setRankedSortCriteria(e.target.value)}
                  className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Score">Puntaje Combinado</option>
                  <option value="Yearly">Año (YTD)</option>
                  <option value="SixMonths">6 Meses</option>
                  <option value="Monthly">Mes</option>
                  <option value="Daily">1 Día</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <FilterTabs
                label="Categoría"
                items={['Portafolios Abiertos', 'Portafolios a la Medida', 'Portafolios Especiales']}
                selected={rankedFilterCategory}
                onToggle={toggleRankedCategory}
              />
              <FilterTabs
                label="Riesgo"
                items={['Conservador', 'Moderado', 'Agresivo']}
                selected={rankedFilterRisk}
                onToggle={toggleRankedRisk}
              />
            </div>

            {rankedPortfolios.length > 0 ? (
              <div className="overflow-x-auto pb-4 momentum-scroll snap-x snap-mandatory">
                <div className="flex gap-4 min-w-max px-1">
                  {rankedPortfolios.map((p, index) => (
                    <div key={p.id} className="w-64 bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition-all duration-300 group snap-start flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-emerald-500 font-bold text-lg">#{index + 1}</span>
                          <RiskBadge risk={p.risk} />
                        </div>
                        <h3 title={p.name} className="font-semibold truncate mb-2 group-hover:text-emerald-400 text-sm text-white">{p.name}</h3>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-[10px] text-slate-500">Año</p>
                            <ReturnValue value={p.returns.yearly} className="text-sm font-bold" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Mes</p>
                            <ReturnValue value={p.returns.monthly} className="text-sm font-bold" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">6M</p>
                            <ReturnValue value={p.returns.sixMonths} className="text-sm font-bold" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Día</p>
                            <ReturnValue value={p.returns.daily} className="text-sm font-bold" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-white/5 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChartPortfolio(p);
                          }}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1 border border-emerald-500/20"
                        >
                          <TrendingUp size={12} />
                          Gráfico
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPortfolio(p);
                          }}
                          className="flex-1 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1 border border-purple-500/20"
                        >
                          <BrainCircuit size={12} />
                          Análisis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">Selecciona una categoría para ver el ranking.</div>
            )}
          </section>
        )}

        {/* Main Grid Section */}
        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-emerald-400" />
            <h2 className="text-2xl font-semibold">Explorador de Portafolios</h2>
          </div>

          {/* Category Tabs (Main Grid) */}
          <FilterTabs
            items={['Portafolios Abiertos', 'Portafolios a la Medida', 'Portafolios Especiales']}
            selected={filterCategory}
            onToggle={toggleCategory}
          />

          {/* Filters */}
          <div className="relative">
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none momentum-scroll pr-10">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px]"
              >
                <option value="All">Todos los Tipos</option>
                <option value="RV">Renta Variable (RV)</option>
                <option value="RF">Renta Fija (RF)</option>
                <option value="IA">Inv. Alternativa (IA)</option>
              </select>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 min-w-[150px]"
              >
                <option value="All">Todos los Riesgos</option>
                <option value="Conservador">Conservador</option>
                <option value="Moderado">Moderado</option>
                <option value="Agresivo">Agresivo</option>
              </select>
            </div>
            {/* Right fade gradient to visually indicate horizontal scrolling on mobile */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10 sm:hidden" />
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
                <div key={portfolio.id}>
                  <PortfolioCard
                    portfolio={portfolio}
                    onOpenChart={() => setSelectedChartPortfolio(portfolio)}
                    onOpenAnalysis={() => setSelectedPortfolio(portfolio)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modals */}
        {selectedPortfolio && (
          <AnalysisModal portfolio={selectedPortfolio} onClose={() => setSelectedPortfolio(null)} />
        )}
        {selectedChartPortfolio && (
          <ChartModal portfolio={selectedChartPortfolio} onClose={() => setSelectedChartPortfolio(null)} />
        )}
      </div>
    </main>
  );
}
