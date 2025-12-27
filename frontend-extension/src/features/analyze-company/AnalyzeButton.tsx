import { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/ui/Button';
import { useCompanyStore } from '@/entities/company/store';
import { useToast } from '@/shared/ui/Toast';
import { Search, Sparkles, MapPin, X } from 'lucide-react';

export const AnalyzeButton = () => {
  const { analyzeCompany, isLoading, currentCompany, error, errorCode } = useCompanyStore();
  const { addToast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState<'Nigeria' | 'Ghana'>('Nigeria');
  const lastErrorRef = useRef<string | null>(null);

  // Show toast when error changes
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;

      // Customize toast based on error code
      if (errorCode === 'UNAUTHORIZED' || errorCode === 'HTTP_401') {
        addToast({
          type: 'warning',
          title: 'Session Expired',
          message: 'Please log in again to continue.',
          duration: 5000,
        });
      } else if (errorCode === 'NETWORK_ERROR' || errorCode === 'ERR_NETWORK') {
        addToast({
          type: 'error',
          title: 'Connection Error',
          message: error,
          duration: 5000,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Analysis Failed',
          message: error,
        });
      }
    }
  }, [error, errorCode, addToast]);

  const handleAnalyze = async () => {
    if (!companyName.trim()) {
      addToast({
        type: 'warning',
        title: 'Company name required',
        message: 'Please enter a company name to analyze',
      });
      return;
    }

    lastErrorRef.current = null; // Reset to allow new error toasts
    await analyzeCompany(companyName.trim(), country);

    // Show success toast only if no error occurred
    const store = useCompanyStore.getState();
    if (!store.error && store.currentCompany) {
      addToast({
        type: 'success',
        title: 'Analysis Complete',
        message: `Found insights for ${companyName}`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAnalyze();
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search any company..."
          disabled={isLoading}
          className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm
                     placeholder:text-slate-400 text-slate-700
                     focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
        {companyName && !isLoading && (
          <button
            onClick={() => setCompanyName('')}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Country Toggle */}
      <div className="flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(['Nigeria', 'Ghana'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              disabled={isLoading}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                country === c
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {c === 'Nigeria' && '🇳🇬 '}
              {c === 'Ghana' && '🇬🇭 '}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        isLoading={isLoading}
        disabled={!companyName.trim()}
        className="w-full"
      >
        <Sparkles className="w-4 h-4" />
        {isLoading ? 'Analyzing...' : currentCompany ? 'Analyze Again' : 'Get AI Insights'}
      </Button>
    </div>
  );
};
