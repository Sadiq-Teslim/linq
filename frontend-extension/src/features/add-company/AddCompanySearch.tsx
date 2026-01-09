import { useState, useCallback } from "react";
import { useCompanyStore } from "@/entities/company/store";
import { useToast } from "@/shared/ui/Toast";
import { Button } from "@/shared/ui/Button";
import {
  Search,
  Plus,
  X,
  Building2,
  MapPin,
  Users,
  Loader2,
  CheckCircle,
  Globe,
} from "lucide-react";

export const AddCompanySearch = () => {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const {
    searchResults,
    isSearching,
    isLoading,
    searchCompanies,
    trackCompany,
    clearSearch,
  } = useCompanyStore();

  const { addToast } = useToast();

  // Search only on Enter key or Search button click
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      searchCompanies(query.trim());
      setShowResults(true);
    } else {
      clearSearch();
      setShowResults(false);
    }
  }, [query, searchCompanies, clearSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleTrack = useCallback(
    async (company: (typeof searchResults)[0]) => {
      if (company.is_already_tracked) {
        addToast({
          type: "info",
          title: "Already Tracking",
          message: `${company.name} is already on your monitor board.`,
        });
        return;
      }

      await trackCompany(company);
      addToast({
        type: "success",
        title: "Company Added",
        message: `${company.name} is now being tracked.`,
      });
      setQuery("");
      setShowResults(false);
    },
    [trackCompany, addToast],
  );

  const handleClear = () => {
    setQuery("");
    clearSearch();
    setShowResults(false);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder="Search companies to track... (Press Enter to search)"
          className="w-full pl-10 pr-20 py-3 bg-white/5 border border-white/10 rounded-xl text-sm
                     placeholder:text-slate-400 text-white
                     focus:outline-none focus:bg-white/[0.07] focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/10
                     transition-all duration-200"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="p-1.5 text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            title="Search"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-navy-800 rounded-xl border border-white/10 shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((company, index) => (
              <div
                key={`${company.name}-${index}`}
                className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                  company.is_already_tracked ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Company Logo/Icon */}
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-8 h-8 rounded object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white truncate">
                          {company.name}
                        </p>
                        {company.is_already_tracked && (
                          <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full border border-green-500/30">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Tracking
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {company.industry && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Globe className="w-3 h-3" />
                            {company.industry}
                          </span>
                        )}
                        {company.headquarters && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3" />
                            {company.headquarters}
                          </span>
                        )}
                        {company.employee_count && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Users className="w-3 h-3" />
                            {company.employee_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add Button */}
                  <Button
                    size="sm"
                    variant={company.is_already_tracked ? "ghost" : "primary"}
                    disabled={company.is_already_tracked || isLoading}
                    onClick={() => handleTrack(company)}
                    className="flex-shrink-0"
                  >
                    {company.is_already_tracked ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Track
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && query && !isSearching && searchResults.length === 0 && (
        <div className="absolute z-[100] w-full mt-2 glass-card rounded-xl border border-white/10 shadow-xl p-4">
          <p className="text-sm text-slate-300 text-center">
            No companies found for "{query}"
          </p>
          <p className="text-xs text-slate-400 text-center mt-1">
            Try a different search term
          </p>
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};
