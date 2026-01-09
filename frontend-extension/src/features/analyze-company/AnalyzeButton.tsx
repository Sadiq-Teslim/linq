import { useState, useRef, useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { useCompanyStore } from "@/entities/company/store";
import { useToast } from "@/shared/ui/Toast";
import { Search, Sparkles, MapPin, X } from "lucide-react";

export const AnalyzeButton = () => {
  const { isLoading, error, errorCode } = useCompanyStore();
  const { addToast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState<"Nigeria" | "Ghana">("Nigeria");
  const lastErrorRef = useRef<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Show toast when error changes
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;

      // Customize toast based on error code
      if (errorCode === "UNAUTHORIZED" || errorCode === "HTTP_401") {
        addToast({
          type: "warning",
          title: "Session Expired",
          message: "Please log in again to continue.",
          duration: 5000,
        });
      } else if (errorCode === "NETWORK_ERROR" || errorCode === "ERR_NETWORK") {
        addToast({
          type: "error",
          title: "Connection Error",
          message: error,
          duration: 5000,
        });
      } else {
        addToast({
          type: "error",
          title: "Analysis Failed",
          message: error,
        });
      }
    }
  }, [error, errorCode, addToast]);

  const handleAnalyze = async () => {
    if (!companyName.trim()) {
      addToast({
        type: "warning",
        title: "Company name required",
        message: "Please enter a company name to analyze",
      });
      return;
    }

    lastErrorRef.current = null;
    setAnalyzing(true);

    // Simulate analysis (replace with actual API call when ready)
    setTimeout(() => {
      setAnalyzing(false);
      addToast({
        type: "success",
        title: "Analysis Complete",
        message: `Found insights for ${companyName}`,
      });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && !analyzing) {
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
          disabled={isLoading || analyzing}
          className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm
                     placeholder:text-slate-400 text-white
                     focus:outline-none focus:bg-white/[0.07] focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/10
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
        {companyName && !isLoading && !analyzing && (
          <button
            onClick={() => setCompanyName("")}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Country Toggle */}
      <div className="flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
          {(["Nigeria", "Ghana"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              disabled={isLoading || analyzing}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                country === c
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "text-slate-400 hover:text-slate-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {c === "Nigeria" && "🇳🇬 "}
              {c === "Ghana" && "🇬🇭 "}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        isLoading={analyzing}
        disabled={!companyName.trim()}
        className="w-full"
      >
        <Sparkles className="w-4 h-4" />
        {analyzing ? "Analyzing..." : "Get AI Insights"}
      </Button>
    </div>
  );
};
