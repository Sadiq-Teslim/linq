import { useEffect } from 'react';
import { useCompanyStore } from '@/entities/company/store';
import {
  Building2, Star, StarOff, RefreshCw, ExternalLink, Bell, Clock,
  ChevronRight, Users, Trash2, MoreVertical
} from 'lucide-react';
import { useState } from 'react';

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

export const MonitorBoard = () => {
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

  const togglePriority = async (companyId: string, currentPriority: boolean) => {
    await updateCompanySettings(companyId, { is_priority: !currentPriority });
  };

  const handleUntrack = async (companyId: string) => {
    await untrackCompany(companyId);
    setExpandedMenu(null);
  };

  // Sort: priority first, then by last updated
  const sortedCompanies = [...trackedCompanies].sort((a, b) => {
    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
    return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
  });

  if (isLoading && trackedCompanies.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="h-5 bg-slate-200 rounded w-32 animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
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
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">No Companies Yet</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-[200px]">
            Search and add companies above to start monitoring their updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Monitor Board</h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {trackedCompanies.length} companies
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full">
            <Bell className="w-3 h-3" />
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Company List */}
      <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
        {sortedCompanies.map((company) => {
          const companyUpdates = updates.filter((u) => u.company_id === company.id && !u.is_read);

          return (
            <div
              key={company.id}
              className="relative group hover:bg-slate-50/50 transition-colors"
            >
              <div className="p-3 flex items-center gap-3">
                {/* Logo */}
                <div className="relative">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.company_name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                        }}
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  {/* Priority indicator */}
                  {company.is_priority && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Company Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => selectCompany(company.id)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {company.company_name}
                    </p>
                    {companyUpdates.length > 0 && (
                      <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full">
                        {companyUpdates.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {company.industry && (
                      <span className="text-[10px] text-slate-500">{company.industry}</span>
                    )}
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(company.last_updated)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePriority(company.id, company.is_priority)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      company.is_priority
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                    }`}
                    title={company.is_priority ? 'Remove priority' : 'Mark as priority'}
                  >
                    {company.is_priority ? (
                      <Star className="w-4 h-4 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === company.id ? null : company.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {expandedMenu === company.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setExpandedMenu(null)}
                        />
                        <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-slate-100 py-1 w-36">
                          <button
                            onClick={() => selectCompany(company.id)}
                            className="w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Users className="w-3.5 h-3.5" />
                            View Contacts
                          </button>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Visit Website
                            </a>
                          )}
                          <button
                            onClick={() => handleUntrack(company.id)}
                            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Stop Tracking
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
        <button className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
          View all companies →
        </button>
      </div>
    </div>
  );
};
