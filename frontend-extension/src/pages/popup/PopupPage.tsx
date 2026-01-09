import { useEffect, useState } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { AddCompanySearch } from "@/features/add-company";
import { MonitorBoard } from "@/widgets/monitor-board";
import { MarketPulse } from "@/widgets/market-pulse";
import { ResultCard } from "@/widgets/intelligence-card/ResultCard";
import { ToastProvider, useToast, Sidebar } from "@/shared/ui";
import { CONFIG } from "@/shared/config";
import { Building2, Newspaper, Sparkles, Bell, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useCompanyStore } from "@/entities/company/store";

type TabType = "home" | "companies" | "feed" | "notifications" | "settings";

const PopupContent = () => {
  const { logout, user, refreshUser } = useAuthStore();
  const {
    unreadCount,
    updates,
    fetchTrackedCompanies,
    fetchUpdates,
    isRefreshing,
    selectedCompany,
    clearSelection,
    markUpdatesRead,
  } = useCompanyStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchTrackedCompanies(),
        fetchUpdates(),
        refreshUser(),
      ]);

      // Refresh industry feed in background
      try {
        fetch(
          `${import.meta.env.VITE_API_BASE_URL || "https://linq-api.onrender.com/api/v1"}/feed/refresh`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("linq-extension-auth") ? JSON.parse(localStorage.getItem("linq-extension-auth")!).state?.token : ""}`,
            },
          }
        ).catch(() => {});
      } catch (e) {
        // Ignore
      }
    };

    loadData();
  }, []);

  // Get plan label from user subscription
  const planLabel =
    user?.subscription?.plan === "enterprise"
      ? "Enterprise"
      : user?.subscription?.plan === "professional"
        ? "Professional"
        : user?.subscription?.plan === "starter"
          ? "Starter"
          : user?.subscription?.plan === "free_trial"
            ? "Trial"
            : "Trial";

  const handleOpenDashboard = () => {
    window.open(`${CONFIG.DASHBOARD_URL}/dashboard/overview`, "_blank");
  };

  const handleRefresh = async () => {
    await Promise.all([fetchTrackedCompanies(), fetchUpdates(), refreshUser()]);
    addToast({
      type: "success",
      title: "Refreshed",
      message: "Data has been updated.",
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Clear selection when switching tabs
    if (tab !== "companies" && selectedCompany) {
      clearSelection();
    }
  };

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

  const handleMarkAllRead = async () => {
    const unreadIds = updates.filter(u => !u.is_read).map(u => u.id);
    if (unreadIds.length > 0) {
      await markUpdatesRead(unreadIds);
      addToast({
        type: "success",
        title: "Marked as read",
        message: `${unreadIds.length} notifications marked as read.`,
      });
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <>
            {/* Quick Search */}
            <div className="glass-card rounded-2xl p-4 card-hover">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-gradient-to-b from-blue-600 to-green-600 rounded-full animate-pulse-glow" />
                <h2 className="text-sm font-semibold text-white">
                  Track Companies
                </h2>
              </div>
              <AddCompanySearch />
            </div>

            {/* Monitor Board */}
            <MonitorBoard />

            {/* Company Details - Show when a company is selected */}
            {selectedCompany && (
              <div className="relative">
                <ResultCard />
              </div>
            )}
          </>
        );

      case "companies":
        return (
          <>
            {/* Search */}
            <div className="glass-card rounded-2xl p-4 card-hover">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">
                  Track New Company
                </h2>
              </div>
              <AddCompanySearch />
            </div>

            {/* Full Monitor Board */}
            <MonitorBoard showAll />

            {/* Company Details */}
            {selectedCompany && (
              <div className="relative">
                <ResultCard />
              </div>
            )}
          </>
        );

      case "feed":
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">
                Industry News
              </h2>
            </div>
            <MarketPulse limit={10} />
          </>
        );

      case "notifications":
        return (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="badge badge-success">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            
            {updates.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-white">No notifications yet</h3>
                <p className="text-xs text-white/60 mt-1">
                  Company updates and alerts will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {updates.slice(0, 20).map((update) => (
                  <div
                    key={update.id}
                    className={`glass-card rounded-xl p-3 card-hover ${
                      !update.is_read && "border-green-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        update.importance === "high" || update.importance === "critical"
                          ? "bg-orange-500/20"
                          : "bg-blue-500/20"
                      }`}>
                        {update.importance === "high" || update.importance === "critical" ? (
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {update.headline}
                        </p>
                        {update.summary && (
                          <p className="text-xs text-white/70 mt-0.5 line-clamp-2">
                            {update.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-white/50 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(update.detected_at)}
                          </span>
                          {update.importance && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              update.importance === "critical"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : update.importance === "high"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {update.importance}
                            </span>
                          )}
                          {!update.is_read && (
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );

      case "settings":
        return (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">
                Account Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 glass rounded-xl border border-white/10">
                <p className="text-sm font-medium text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {user?.organization_name || "Personal Account"}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl text-white shadow-lg glow-blue">
                <p className="text-sm font-semibold">{planLabel} Plan</p>
                <p className="text-xs mt-1 opacity-90">
                  {user?.subscription?.max_tracked_companies === -1
                    ? "Unlimited companies"
                    : `${user?.subscription?.max_tracked_companies || 5} companies`}
                </p>
              </div>
              <button
                onClick={handleOpenDashboard}
                className="btn-primary w-full py-2.5 px-4 text-sm font-medium rounded-xl"
              >
                Open Full Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] h-[520px] flex overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onOpenDashboard={handleOpenDashboard}
        onLogout={handleLogout}
        planLabel={planLabel}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="glass border-b border-white/10 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-base tracking-tight">
              LYNQ
            </span>
            <span className="text-[9px] bg-gradient-to-r from-blue-600 to-green-600 text-white px-1.5 py-0.5 rounded-full font-medium shadow-lg">
              {activeTab === "home"
                ? "Dashboard"
                : activeTab === "companies"
                  ? "Companies"
                  : activeTab === "feed"
                    ? "News"
                    : activeTab === "notifications"
                      ? "Alerts"
                      : "Settings"}
            </span>
          </div>
          <div className="text-[10px] text-white/70 truncate max-w-[100px]">
            {user?.organization_name || user?.email}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-3 overflow-y-auto space-y-3">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="px-3 py-1.5 border-t border-white/10 glass">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-white/50">Powered by</span>
              <span className="text-[9px] font-semibold text-blue-400">
                LYNQ AI
              </span>
            </div>
            <span className="text-[9px] text-white/50">
              {user?.subscription?.max_tracked_companies === -1
                ? "Unlimited"
                : `${user?.subscription?.max_tracked_companies || 5} comp`}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const PopupPage = () => {
  return (
    <ToastProvider>
      <PopupContent />
    </ToastProvider>
  );
};
