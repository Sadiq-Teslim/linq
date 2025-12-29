import { useCompanyStore } from "@/entities/company/store";
import {
  Building2,
  AlertCircle,
  RefreshCw,
  X,
  MapPin,
  Users,
  Briefcase,
  Mail,
  Linkedin,
  ExternalLink,
  TrendingUp,
  Star,
  StarOff,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
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
    clearSelection,
    updateCompanySettings,
    refreshCompany,
    isRefreshing,
  } = useCompanyStore();

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <div className="w-12 h-12 rounded-full bg-gold-500/30" />
              </div>
            </div>
            <p className="text-slate-400 mt-4 text-sm">Loading company details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-500/10 rounded-2xl border border-red-500/20 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">Error</h3>
            <p className="text-sm text-red-300/80 mt-1">{error}</p>
          </div>
          <button
            onClick={clearSelection}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
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
    <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 flex-shrink-0">
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
                <Building2 className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white truncate">
                  {selectedCompany.company_name}
                </h3>
                {selectedCompany.is_priority && (
                  <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {selectedCompany.industry && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {selectedCompany.industry}
                  </span>
                )}
                {selectedCompany.headquarters && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCompany.headquarters}
                  </span>
                )}
                {selectedCompany.employee_count && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedCompany.employee_count}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
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
            className="ml-auto"
          >
            <Button size="sm" variant="ghost" className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Website
            </Button>
          </a>
        )}
      </div>

      {/* Description */}
      {selectedCompany.description && (
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-sm text-slate-300 leading-relaxed">
            {selectedCompany.description}
          </p>
        </div>
      )}

      {/* Contacts */}
      {selectedCompany.contacts && selectedCompany.contacts.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Key Contacts ({selectedCompany.contacts.length})
          </h4>
          <div className="space-y-2">
            {selectedCompany.contacts.slice(0, 3).map((contact) => (
              <div
                key={contact.id}
                className="p-2 bg-white/5 rounded-lg border border-white/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {contact.name}
                      </p>
                      {contact.is_decision_maker && (
                        <span className="text-[10px] bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded border border-gold-500/20">
                          DM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{contact.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1"
                        >
                          <Linkedin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {selectedCompany.contacts.length > 3 && (
              <p className="text-xs text-slate-500 text-center pt-1">
                +{selectedCompany.contacts.length - 3} more contacts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Updates */}
      {selectedCompany.recent_updates && selectedCompany.recent_updates.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Recent Updates ({selectedCompany.recent_updates.length})
          </h4>
          <div className="space-y-2">
            {selectedCompany.recent_updates.slice(0, 3).map((update) => (
              <div
                key={update.id}
                className="p-2 bg-white/5 rounded-lg border border-white/5"
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
                      <span className="text-[10px] text-slate-500">
                        {formatTimeAgo(update.detected_at)}
                      </span>
                      {update.importance && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            update.importance === "critical"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : update.importance === "high"
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
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
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 bg-white/[0.01] flex items-center justify-between text-xs text-slate-500">
        <span>
          Tracking since{" "}
          {(selectedCompany.created_at || selectedCompany.added_at)
            ? formatTimeAgo(selectedCompany.created_at || selectedCompany.added_at)
            : "recently"}
        </span>
        {(selectedCompany.unread_update_count ?? 0) > 0 && (
          <span className="text-gold-400 font-medium">
            {selectedCompany.unread_update_count} new updates
          </span>
        )}
      </div>
    </div>
  );
};
