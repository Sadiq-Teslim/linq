import { useEffect } from "react";
import { useCompanyStore } from "@/entities/company/store";
import {
  Building2,
  Star,
  StarOff,
  ExternalLink,
  Bell,
  Clock,
  ChevronRight,
  Users,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";

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

interface MonitorBoardProps {
  showAll?: boolean;
}

export const MonitorBoard: React.FC<MonitorBoardProps> = ({ showAll = false }) => {
  const {
    trackedCompanies,
    updates,
    unreadCount,
    isLoading,
    fetchTrackedCompanies,
    fetchUpdates,
    updateCompanySettings,
    untrackCompany,
    selectCompany,
  } = useCompanyStore();

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackedCompanies();
    fetchUpdates();
  }, [fetchTrackedCompanies, fetchUpdates]);

  const togglePriority = async (
    companyId: string,
    currentPriority: boolean,
  ) => {
    await updateCompanySettings(companyId, { is_priority: !currentPriority });
  };

  const handleUntrack = async (companyId: string) => {
    await untrackCompany(companyId);
    setExpandedMenu(null);
  };

  // Sort: priority first, then by last updated
  const sortedCompanies = [...trackedCompanies].sort((a, b) => {
    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
    return (
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );
  });

  if (isLoading && trackedCompanies.length === 0) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Monitor Board</h3>
        </div>
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 border-r-green-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400 mt-4">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (trackedCompanies.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col items-center text-center py-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-3 border border-white/10">
            <Building2 className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="font-semibold text-white text-sm">No Companies Yet</h3>
          <p className="text-white/60 text-xs mt-1 max-w-[180px]">
            Search and add companies above to start monitoring their updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-green-600 rounded-full" />
          <h3 className="text-xs font-semibold text-white">Monitor Board</h3>
          <span className="badge">
            {trackedCompanies.length}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="badge badge-success flex items-center gap-1">
            <Bell className="w-2.5 h-2.5" />
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Company List */}
      <div className={`divide-y divide-white/10 overflow-y-auto ${showAll ? 'max-h-[350px]' : 'max-h-48'}`}>
        {(showAll ? sortedCompanies : sortedCompanies.slice(0, 4)).map((company) => {
          const companyUpdates = updates.filter(
            (u) => u.company_id === company.id && !u.is_read,
          );

          return (
            <div
              key={company.id}
              className="relative group hover:bg-white/5 transition-colors card-hover"
            >
              <div className="p-2 flex items-center gap-2">
                {/* Logo */}
                <div className="relative">
                  <div className="w-8 h-8 glass rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.company_name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (
                            e.target as HTMLImageElement
                          ).parentElement!.innerHTML =
                            '<svg class="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                        }}
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                  {/* Priority indicator */}
                  {company.is_priority && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="w-2 h-2 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Company Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => selectCompany(company.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs text-white truncate">
                      {company.company_name}
                    </p>
                    {companyUpdates.length > 0 && (
                      <span className="flex items-center justify-center w-3.5 h-3.5 bg-gradient-to-br from-green-500 to-green-600 text-white text-[8px] font-bold rounded-full shadow-lg">
                        {companyUpdates.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {company.industry && (
                      <span className="text-[9px] text-white/60 truncate max-w-[80px]">
                        {company.industry}
                      </span>
                    )}
                    <span className="text-[9px] text-white/50 flex items-center gap-0.5">
                      <Clock className="w-2 h-2" />
                      {formatTimeAgo(company.last_updated)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      togglePriority(company.id, company.is_priority)
                    }
                    className={`p-1 rounded-md transition-colors ${
                      company.is_priority
                        ? "text-blue-400 hover:bg-blue-500/20"
                        : "text-white/40 hover:bg-white/10 hover:text-blue-400"
                    }`}
                    title={
                      company.is_priority
                        ? "Remove priority"
                        : "Mark as priority"
                    }
                  >
                    {company.is_priority ? (
                      <Star className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <StarOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setExpandedMenu(
                          expandedMenu === company.id ? null : company.id,
                        )
                      }
                      className="p-1 rounded-md text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {expandedMenu === company.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setExpandedMenu(null)}
                        />
                        <div className="absolute right-0 top-7 z-50 glass-card rounded-lg shadow-xl border border-white/20 py-1 w-32">
                          <button
                            onClick={() => selectCompany(company.id, "contacts")}
                            className="w-full px-2.5 py-1.5 text-left text-[11px] text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                          >
                            <Users className="w-3 h-3" />
                            View Contacts
                          </button>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-2.5 py-1.5 text-left text-[11px] text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Visit Website
                            </a>
                          )}
                          <button
                            onClick={() => handleUntrack(company.id)}
                            className="w-full px-2.5 py-1.5 text-left text-[11px] text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Stop Tracking
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - only show if there are more companies */}
      {!showAll && sortedCompanies.length > 4 && (
        <div className="px-3 py-1.5 border-t border-white/10 glass">
          <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
            View all {sortedCompanies.length} companies →
          </button>
        </div>
      )}
    </div>
  );
};
