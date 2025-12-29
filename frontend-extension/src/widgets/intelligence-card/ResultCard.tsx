import { useCompanyStore } from "@/entities/company/store";
import { Building2, AlertCircle, RefreshCw } from "lucide-react";

export const ResultCard = () => {
  const { isLoading, error, selectedCompany } = useCompanyStore();

  // Loading State
  if (isLoading) {
    return (
      <div className="mt-4 bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <div className="w-12 h-12 rounded-full bg-gold-500/30" />
              </div>
            </div>
            <p className="text-slate-400 mt-4 text-sm">Analyzing company...</p>
            <p className="text-slate-500 text-xs mt-1">
              Gathering intelligence
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="mt-4 bg-red-500/10 rounded-2xl border border-red-500/20 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">Analysis Error</h3>
            <p className="text-sm text-red-300/80 mt-1">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // No Company State
  if (!selectedCompany) {
    return (
      <div className="mt-4 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 bg-gold-500/10 rounded-2xl flex items-center justify-center mb-4 border border-gold-500/20">
            <Building2 className="w-7 h-7 text-gold-400" />
          </div>
          <h3 className="font-semibold text-white text-sm">
            No Company Selected
          </h3>
          <p className="text-slate-500 text-xs mt-1 max-w-[200px]">
            Select a company from your monitor board to view details
          </p>
        </div>
      </div>
    );
  }

  // Company Details
  return (
    <div className="mt-4 bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
            {selectedCompany.logo_url ? (
              <img
                src={selectedCompany.logo_url}
                alt={selectedCompany.company_name}
                className="w-10 h-10 rounded object-contain"
              />
            ) : (
              <Building2 className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">
              {selectedCompany.company_name}
            </h3>
            {selectedCompany.industry && (
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedCompany.industry}
              </p>
            )}
            {selectedCompany.website && (
              <a
                href={selectedCompany.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold-400 hover:text-gold-300 mt-1 inline-block"
              >
                {selectedCompany.website}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
