import { useState } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { Button } from "@/shared/ui/Button";
import { CONFIG } from "@/shared/config";
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";

export const LoginPage = () => {
  const {
    loginWithAccessCode,
    login,
    validateAccessCode,
    isLoading,
    isValidating,
    isActivated,
    error,
    clearError,
  } = useAuthStore();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    message?: string;
  } | null>(null);

  const handleCodeChange = async (code: string) => {
    const upperCode = code.toUpperCase();
    setAccessCode(upperCode);
    clearError();
    setValidationResult(null);

    if (upperCode.length >= 4) {
      const result = await validateAccessCode(upperCode);
      setValidationResult(result);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    // If not activated yet, require access code
    if (!isActivated) {
      if (!accessCode.trim()) {
        return;
      }
      await loginWithAccessCode(
        email.trim(),
        password.trim(),
        accessCode.trim(),
      );
    } else {
      // Already activated, just login
      await login(email.trim(), password.trim());
    }
  };

  const formatPlan = (plan?: string) => {
    if (!plan) return "Free Trial";
    return plan
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const canSubmit = () => {
    if (!email.trim() || !password.trim()) return false;
    if (!isActivated) {
      // First time: need valid access code
      return accessCode.trim().length > 0 && validationResult?.valid;
    }
    return true;
  };

  return (
    <div className="h-[560px] w-[380px] flex flex-col bg-gradient-to-b from-navy-950 to-navy-900">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold-500/3 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 z-10 overflow-y-auto">
        {/* Logo */}
        <div className="mb-5 text-center animate-fade-in-up">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center shadow-lg shadow-gold-500/30">
            <Sparkles className="w-6 h-6 text-navy-950" />
          </div>
          <h1 className="text-xl font-serif text-white mb-0.5">LINQ</h1>
          <p className="text-[10px] text-slate-400">B2B Sales Intelligence</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-3 animate-fade-in-up"
        >
          <div className="text-center mb-3">
            <h2 className="text-base font-semibold text-white">
              {isActivated ? "Welcome Back" : "Activate Extension"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isActivated
                ? "Sign in to your LINQ account"
                : "Enter your credentials and access code"}
            </p>
          </div>

          {/* Email Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                         placeholder:text-slate-500 text-white
                         focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20
                         transition-all duration-200"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                         placeholder:text-slate-500 text-white
                         focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20
                         transition-all duration-200"
            />
          </div>

          {/* Access Code Field - Only show if not activated */}
          {!isActivated && (
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Access Code (from dashboard)"
                  value={accessCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono
                             placeholder:text-slate-500 text-white uppercase tracking-wider
                             focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20
                             transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-3 flex items-center">
                  {isValidating && (
                    <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                  )}
                  {!isValidating && validationResult?.valid && (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  {!isValidating &&
                    validationResult &&
                    !validationResult.valid &&
                    accessCode.length >= 4 && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                </div>
              </div>

              {validationResult?.valid && (
                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-300 font-medium">
                        {validationResult.organization_name}
                      </p>
                      <p className="text-[10px] text-emerald-400/80">
                        {formatPlan(validationResult.plan)} Plan
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {validationResult &&
                !validationResult.valid &&
                accessCode.length >= 4 && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-300">
                        {validationResult.message || "Invalid access code"}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!canSubmit()}
            className="w-full"
            size="lg"
          >
            {isActivated ? "Sign In" : "Activate & Sign In"}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className="relative p-3 border-t border-white/5 bg-navy-950/50 backdrop-blur-sm z-10">
        <p className="text-[10px] text-slate-500 text-center mb-1.5">
          Don't have an account?
        </p>
        <a
          href={`${CONFIG.DASHBOARD_URL}/auth/signup`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
        >
          Sign up at linq.ai
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
