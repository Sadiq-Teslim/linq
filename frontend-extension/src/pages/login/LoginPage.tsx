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
    message?: string;
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

    // Auto-validate when code looks complete
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

  const formatPlan = (plan?: string) => {
    if (!plan) return 'Free Trial';
    return plan.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="h-[560px] w-[380px] flex flex-col bg-gradient-to-b from-navy-950 to-navy-900">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold-500/3 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 z-10">
        {/* Logo */}
        <div className="mb-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center shadow-lg shadow-gold-500/30 animate-pulse-glow">
            <Sparkles className="w-8 h-8 text-navy-950" />
          </div>
          <h1 className="text-3xl font-serif text-white mb-1">LINQ</h1>
          <p className="text-sm text-slate-400">
            B2B Sales Intelligence
          </p>
        </div>

        {/* Access Code Form */}
        <form onSubmit={handleActivate} className="w-full space-y-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2.5 uppercase tracking-wider">
              Enter your access code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="LINQ-XXXX-XXXX"
                value={accessCode}
                onChange={(e) => handleCodeChange(e.target.value.toUpperCase())}
                className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono
                           placeholder:text-slate-600 text-white uppercase tracking-wider
                           focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20
                           transition-all duration-200"
              />
              {/* Validation indicator */}
              <div className="absolute inset-y-0 right-4 flex items-center">
                {isValidating && (
                  <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                )}
                {!isValidating && validationResult?.valid && (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
                {!isValidating && validationResult && !validationResult.valid && accessCode.length >= 4 && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            {/* Validation feedback */}
            {validationResult?.valid && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-emerald-300 font-medium">
                      {validationResult.organization_name}
                    </p>
                    <p className="text-xs text-emerald-400/80">
                      {formatPlan(validationResult.plan)} Plan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {validationResult && !validationResult.valid && accessCode.length >= 4 && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">
                    {validationResult.message || 'Invalid access code'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!accessCode.trim() || (validationResult !== null && !validationResult.valid)}
            className="w-full"
            size="lg"
          >
            <Key className="w-4 h-4" />
            Activate Extension
          </Button>
        </form>

        {/* Demo hint */}
        <div className="mt-5 p-3 bg-gold-500/5 border border-gold-500/10 rounded-xl w-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <p className="text-xs text-gold-300/80 text-center">
            <span className="font-medium">Demo Mode:</span> Use code{' '}
            <code className="bg-gold-500/10 px-1.5 py-0.5 rounded font-mono text-gold-400">DEMO</code>
            {' '}to try LINQ
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/5 bg-navy-950/50 backdrop-blur-sm z-10">
        <p className="text-xs text-slate-500 text-center mb-2">
          Don't have an access code?
        </p>
        <a
          href="https://use-linq.netlify.app/auth/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors"
        >
          Sign up at linq.ai
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
