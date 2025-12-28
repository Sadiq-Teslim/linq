import { useEffect } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { AddCompanySearch } from "@/features/add-company";
import { MonitorBoard } from "@/widgets/monitor-board";
import { MarketPulse } from "@/widgets/market-pulse";
import { ToastProvider } from "@/shared/ui/Toast";
import { CONFIG } from "@/shared/config";
import {
  LogOut,
  Sparkles,
  Settings,
  Bell,
  Crown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useCompanyStore } from "@/entities/company/store";

export const PopupPage = () => {
  const { logout, user, refreshUser } = useAuthStore();
  const { unreadCount, fetchTrackedCompanies, fetchUpdates, isRefreshing } =
    useCompanyStore();

  // Fetch data on mount
  useEffect(() => {
    fetchTrackedCompanies();
    fetchUpdates();
    refreshUser();
  }, []);

  const planLabel =
    user?.subscription?.plan === "enterprise"
      ? "Enterprise"
      : user?.subscription?.plan === "professional"
      ? "Professional"
      : user?.subscription?.plan === "starter"
      ? "Starter"
      : "Trial";

  const handleOpenDashboard = () => {
    window.open(`${CONFIG.DASHBOARD_URL}/dashboard/overview`, "_blank");
  };

  const handleRefresh = () => {
    fetchTrackedCompanies();
    fetchUpdates();
  };

  return (
    <ToastProvider>
      <div className="w-[380px] min-h-[560px] bg-gradient-to-b from-navy-950 to-navy-900 flex flex-col">
        {/* Header */}
        <header className="bg-navy-950/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-gold-500 to-gold-400 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
                  <Sparkles className="w-5 h-5 text-navy-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-white tracking-tight text-base">
                      LINQ
                    </span>
                    <span className="text-[9px] bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      {planLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                    {user?.organization_name || user?.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500
                           hover:text-gold-400 hover:bg-white/5 transition-all disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
                {/* Notifications */}
                <button
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-500
                           hover:text-gold-400 hover:bg-white/5 transition-all"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold-500 text-navy-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleOpenDashboard}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500
                           hover:text-gold-400 hover:bg-white/5 transition-all"
                  title="Open Dashboard"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500
                           hover:text-gold-400 hover:bg-white/5 transition-all"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => logout()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500
                           hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Add Company Search */}
          <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-gradient-to-b from-gold-500 to-gold-400 rounded-full" />
              <h2 className="text-sm font-semibold text-white">
                Track Companies
              </h2>
            </div>
            <AddCompanySearch />
          </div>

          {/* Monitor Board */}
          <MonitorBoard />

          {/* Industry News Feed */}
          <MarketPulse limit={4} />
        </main>

        {/* Footer */}
        <footer className="px-4 py-2.5 border-t border-white/5 bg-navy-950/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">Powered by</span>
              <span className="text-[10px] font-semibold text-gold-400">
                LINQ AI
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              {user?.subscription?.max_tracked_companies === -1
                ? "Unlimited"
                : `${user?.subscription?.max_tracked_companies || 5} companies`}
            </span>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
};
