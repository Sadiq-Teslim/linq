import { useState } from 'react';
import { useAuthStore } from '@/entities/user/authStore';
import { Button } from '@/shared/ui/Button';
import { Key, Sparkles, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const [accessCode, setAccessCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
  } | null>(null);

  const {
    activateWithCode,
    validateAccessCode,
    isLoading,
    isValidating,
    error,
    clearError,
  } = useAuthStore();

  const handleCodeChange = async (code: string) => {
    setAccessCode(code);
    clearError();
    setValidationResult(null);

    // Auto-validate when code looks complete (format: LINQ-XXXX-XXXX or similar)
    if (code.length >= 4) {
      const result = await validateAccessCode(code);
      setValidationResult(result);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    await activateWithCode(accessCode.trim());
  };

  return (
    <div className="h-[500px] w-[350px] flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-1">LINQ AI</h1>
        <p className="text-sm text-slate-500 mb-8 text-center">
          B2B Sales Intelligence Platform
        </p>

        {/* Access Code Form */}
        <form onSubmit={handleActivate} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Enter your access code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="LINQ-XXXX-XXXX"
                value={accessCode}
                onChange={(e) => handleCodeChange(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-mono
                           placeholder:text-slate-400 text-slate-700 uppercase tracking-wider
                           focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50
                           transition-all duration-200"
              />
              {/* Validation indicator */}
              <div className="absolute inset-y-0 right-3 flex items-center">
                {isValidating && (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                )}
                {!isValidating && validationResult?.valid && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                {!isValidating && validationResult && !validationResult.valid && accessCode.length >= 4 && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Validation feedback */}
            {validationResult?.valid && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">
                  {validationResult.organization_name}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  {validationResult.plan} Plan
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!accessCode.trim() || (validationResult !== null && !validationResult.valid)}
            className="w-full"
          >
            <Key className="w-4 h-4" />
            Activate Extension
          </Button>
        </form>

        {/* Demo hint */}
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg w-full">
          <p className="text-[10px] text-indigo-600 text-center">
            <span className="font-semibold">Demo Mode:</span> Use code{' '}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono">DEMO</code>
            {' '}to try LINQ
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-white/80">
        <p className="text-[10px] text-slate-500 text-center mb-2">
          Don't have an access code?
        </p>
        <a
          href="https://linq.ai/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign up at linq.ai
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
