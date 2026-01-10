import React from "react";
import { useCompanyStore } from "@/entities/company/store";
import {
  Building2,
  AlertCircle,
  RefreshCw,
  X,
  MapPin,
  Users,
  Briefcase,
  ExternalLink,
  TrendingUp,
  Star,
  StarOff,
  Clock,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { ContactSections } from "./ContactSections";
// Simple date formatter
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const ResultCard = () => {
  const {
    isLoading,
    error,
    selectedCompany,
    viewMode,
    clearSelection,
    updateCompanySettings,
    refreshCompany,
    isRefreshing,
    setViewMode,
  } = useCompanyStore();
  
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-lg">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 border-r-green-500 rounded-full animate-spin" />
            </div>
            <p className="text-slate-300 mt-4 text-sm font-medium">Loading company details...</p>
            <p className="text-slate-500 text-xs mt-1">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="glass-card rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-300">Error</h3>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
          <button
            onClick={clearSelection}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // No Company State
  if (!selectedCompany) {
    return null;
  }

  const handleTogglePriority = async () => {
    await updateCompanySettings(selectedCompany.id, {
      is_priority: !selectedCompany.is_priority,
    });
  };

  const handleRefresh = async () => {
    await refreshCompany(selectedCompany.id);
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
              {selectedCompany.logo_url ? (
                <img
                  src={selectedCompany.logo_url}
                  alt={selectedCompany.company_name}
                  className="w-10 h-10 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Building2 className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white truncate">
                  {selectedCompany.company_name}
                </h3>
                {selectedCompany.is_priority && (
                  <Star className="w-4 h-4 text-green-400 fill-green-400" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {selectedCompany.industry && (
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {selectedCompany.industry}
                  </span>
                )}
                {selectedCompany.headquarters && (
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCompany.headquarters}
                  </span>
                )}
                {selectedCompany.employee_count && (
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedCompany.employee_count}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex-shrink-0"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
          <button
            onClick={() => setViewMode("details")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === "details"
                ? "bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30"
                : "text-slate-400 hover:text-blue-300"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setViewMode("contacts")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === "contacts"
                ? "bg-green-500/20 text-green-300 font-medium border border-green-500/30"
                : "text-slate-400 hover:text-green-300"
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => setViewMode("updates")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === "updates"
                ? "bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30"
                : "text-slate-400 hover:text-blue-300"
            }`}
          >
            Updates
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={selectedCompany.is_priority ? "primary" : "ghost"}
            onClick={handleTogglePriority}
            className="flex items-center gap-1.5"
          >
            {selectedCompany.is_priority ? (
              <>
                <Star className="w-3.5 h-3.5 fill-current" />
                Priority
              </>
            ) : (
              <>
                <StarOff className="w-3.5 h-3.5" />
                Mark Priority
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {selectedCompany.website && (
            <a
              href={selectedCompany.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="ghost" className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Website
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Description - Show only in details or contacts view */}
      {(viewMode === "details" || viewMode === "contacts") && selectedCompany.description && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-sm text-slate-300 leading-relaxed">
            {selectedCompany.description}
          </p>
        </div>
      )}

      {/* Contacts - Show only in details or contacts view */}
      {(viewMode === "details" || viewMode === "contacts") && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Contacts ({selectedCompany.contacts?.length || 0})
            </h4>
            {selectedCompany.last_updated && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {formatTimeAgo(selectedCompany.last_updated)}
              </span>
            )}
          </div>
          {selectedCompany.contacts && selectedCompany.contacts.length > 0 ? (
            <ContactSections
              contacts={selectedCompany.contacts}
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          ) : (
            <div className="py-6 text-center">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300">No contacts found</p>
              <p className="text-xs text-slate-400 mt-1">
                Click refresh to discover contacts
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Updates - Show only in details or updates view */}
      {(viewMode === "details" || viewMode === "updates") && (
        <div className="px-4 py-3 border-b border-white/10">
          <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Recent Updates ({selectedCompany.recent_updates?.length || 0})
          </h4>
          {selectedCompany.recent_updates && selectedCompany.recent_updates.length > 0 ? (
            <div className="space-y-2">
              {selectedCompany.recent_updates.map((update) => (
              <div
                key={update.id}
                className="p-2 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{update.headline}</p>
                    {update.summary && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {update.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        {formatTimeAgo(update.detected_at)}
                      </span>
                      {update.importance && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            update.importance === "critical"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : update.importance === "high"
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                          }`}
                        >
                          {update.importance}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300">No updates yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Updates will appear here as they are detected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 bg-blue-500/10 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
        <span>
          Tracking since{" "}
          {(selectedCompany.created_at || selectedCompany.added_at)
            ? formatTimeAgo(selectedCompany.created_at || selectedCompany.added_at)
            : "recently"}
        </span>
        {(selectedCompany.unread_update_count ?? 0) > 0 && (
          <span className="text-blue-300 font-medium">
            {selectedCompany.unread_update_count} new updates
          </span>
        )}
      </div>
    </div>
  );
};
