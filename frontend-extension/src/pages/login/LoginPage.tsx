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
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type AuthStep = "credentials" | "access-code" | "success";

export const LoginPage = () => {
  const {
    login,
    activateWithAccessCode,
    validateAccessCode,
    isLoading,
    isValidating,
    isActivated,
    needsNewAccessCode,
    error,
    clearError,
    user,
  } = useAuthStore();

  // Current step in auth flow
  const [step, setStep] = useState<AuthStep>("credentials");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    organization_name?: string;
    plan?: string;
    expires_at?: string;
    message?: string;
  } | null>(null);

  // Handle email/password submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    clearError();
    const result = await login(email.trim(), password.trim());

    if (result.success) {
      if (result.needsAccessCode) {
        // Move to access code step
        setStep("access-code");
      }
      // If no access code needed, isAuthenticated will be true and App.tsx will show PopupPage
    }
  };

  // Handle access code change with validation
  const handleCodeChange = async (code: string) => {
    const upperCode = code.toUpperCase();
    setAccessCode(upperCode);
    clearError();
    setValidationResult(null);

    // Validate when code looks complete (LINQ-XXXX-XXXX-XXXX format)
    if (upperCode.length >= 14) {
      const result = await validateAccessCode(upperCode);
      setValidationResult(result);
    }
  };

  // Handle access code submission
  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !validationResult?.valid) return;

    const success = await activateWithAccessCode(accessCode.trim());
    if (success) {
      setStep("success");
      // After brief success message, isAuthenticated will be true
    }
  };

  // Go back to credentials step
  const handleBack = () => {
    setStep("credentials");
    setAccessCode("");
    setValidationResult(null);
    clearError();
  };

  const formatPlan = (plan?: string) => {
    if (!plan) return "Free Trial";
    return plan
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Determine if we should show access code prompt
  // This happens when: first time activation OR access code expired/plan ended
  const showAccessCodeReason = () => {
    if (needsNewAccessCode) {
      return "Your access code has expired or your plan has ended. Please enter a new access code.";
    }
    if (!isActivated) {
      return "Enter your access code to activate the extension";
    }
    return "Enter your access code from the dashboard";
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
          <h1 className="text-xl font-serif text-white mb-0.5">LYNQ</h1>
          <p className="text-[10px] text-slate-400">B2B Sales Intelligence</p>
        </div>

        {/* Step 1: Email & Password */}
        {step === "credentials" && (
          <form
            onSubmit={handleCredentialsSubmit}
            className="w-full space-y-3 animate-fade-in-up"
          >
            <div className="text-center mb-3">
              <h2 className="text-base font-semibold text-white">
                Welcome Back
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Sign in to your LYNQ account
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
              disabled={!email.trim() || !password.trim()}
              className="w-full"
              size="lg"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        )}

        {/* Step 2: Access Code */}
        {step === "access-code" && (
          <form
            onSubmit={handleAccessCodeSubmit}
            className="w-full space-y-3 animate-fade-in-up"
          >
            <div className="text-center mb-3">
              <h2 className="text-base font-semibold text-white">
                {needsNewAccessCode ? "New Access Code Required" : "Activate Extension"}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {showAccessCodeReason()}
              </p>
            </div>

            {/* Logged in user info */}
            {user && (
              <div className="p-2 bg-white/5 border border-white/10 rounded-lg mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-950 font-semibold text-xs">
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user.organization_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Access Code Field */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="LINQ-XXXX-XXXX-XXXX"
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
                    accessCode.length >= 14 && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                </div>
              </div>

              {/* Validation Success */}
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

              {/* Validation Error */}
              {validationResult &&
                !validationResult.valid &&
                accessCode.length >= 14 && (
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
              disabled={!accessCode.trim() || !validationResult?.valid}
              className="w-full"
              size="lg"
            >
              Activate Extension
            </Button>

            {/* Help text */}
            <p className="text-[10px] text-slate-500 text-center">
              Get your access code from the{" "}
              <a
                href={`${CONFIG.DASHBOARD_URL}/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-400 hover:text-gold-300"
              >
                LINQ dashboard
              </a>{" "}
              after subscribing.
            </p>
          </form>
        )}

        {/* Step 3: Success (brief) */}
        {step === "success" && (
          <div className="w-full text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Extension Activated!
            </h2>
            <p className="text-sm text-slate-400">
              Welcome to LINQ. Loading your dashboard...
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative p-3 border-t border-white/5 bg-navy-950/50 backdrop-blur-sm z-10">
        <p className="text-[10px] text-slate-500 text-center mb-1.5">
          Don't have an account?
        </p>
        <a
          href={`${CONFIG.DASHBOARD_URL}`}
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
