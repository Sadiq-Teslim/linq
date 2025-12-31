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
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-blue-50">
          <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-2 rounded-lg bg-slate-50 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded w-20 mb-1" />
                  <div className="h-2 bg-slate-100 rounded w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trackedCompanies.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
        <div className="flex flex-col items-center text-center py-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-blue-950 text-sm">No Companies Yet</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-[180px]">
            Search and add companies above to start monitoring their updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-3 py-2 border-b border-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-green-500 rounded-full" />
          <h3 className="text-xs font-semibold text-blue-950">Monitor Board</h3>
          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
            {trackedCompanies.length}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="flex items-center gap-1 text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
            <Bell className="w-2.5 h-2.5" />
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Company List */}
      <div className={`divide-y divide-blue-50 overflow-y-auto ${showAll ? 'max-h-[350px]' : 'max-h-48'}`}>
        {(showAll ? sortedCompanies : sortedCompanies.slice(0, 4)).map((company) => {
          const companyUpdates = updates.filter(
            (u) => u.company_id === company.id && !u.is_read,
          );

          return (
            <div
              key={company.id}
              className="relative group hover:bg-blue-50/50 transition-colors"
            >
              <div className="p-2 flex items-center gap-2">
                {/* Logo */}
                <div className="relative">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
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
                            '<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                        }}
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {/* Priority indicator */}
                  {company.is_priority && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
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
                    <p className="font-medium text-xs text-blue-950 truncate">
                      {company.company_name}
                    </p>
                    {companyUpdates.length > 0 && (
                      <span className="flex items-center justify-center w-3.5 h-3.5 bg-green-500 text-white text-[8px] font-bold rounded-full">
                        {companyUpdates.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {company.industry && (
                      <span className="text-[9px] text-slate-500 truncate max-w-[80px]">
                        {company.industry}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
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
                        ? "text-blue-500 hover:bg-blue-100"
                        : "text-slate-400 hover:bg-slate-100 hover:text-blue-500"
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
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {expandedMenu === company.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setExpandedMenu(null)}
                        />
                        <div className="absolute right-0 top-7 z-50 bg-white rounded-lg shadow-lg border border-slate-100 py-1 w-32">
                          <button
                            onClick={() => selectCompany(company.id, "contacts")}
                            className="w-full px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Users className="w-3 h-3" />
                            View Contacts
                          </button>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Visit Website
                            </a>
                          )}
                          <button
                            onClick={() => handleUntrack(company.id)}
                            className="w-full px-2.5 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            Stop Tracking
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - only show if there are more companies */}
      {!showAll && sortedCompanies.length > 4 && (
        <div className="px-3 py-1.5 border-t border-blue-50 bg-slate-50/50">
          <button className="text-[10px] text-blue-600 hover:text-blue-700 font-medium transition-colors">
            View all {sortedCompanies.length} companies →
          </button>
        </div>
      )}
    </div>
  );
};
