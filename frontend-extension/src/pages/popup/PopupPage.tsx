import { useEffect, useState } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { AddCompanySearch } from "@/features/add-company";
import { MonitorBoard } from "@/widgets/monitor-board";
import { MarketPulse } from "@/widgets/market-pulse";
import { ResultCard } from "@/widgets/intelligence-card/ResultCard";
import { ToastProvider, useToast, Sidebar } from "@/shared/ui";
import { CONFIG } from "@/shared/config";
import { Building2, Newspaper, Sparkles } from "lucide-react";
import { useCompanyStore } from "@/entities/company/store";

type TabType = "home" | "companies" | "feed" | "settings";

const PopupContent = () => {
  const { logout, user, refreshUser } = useAuthStore();
  const {
    unreadCount,
    fetchTrackedCompanies,
    fetchUpdates,
    isRefreshing,
    selectedCompany,
    clearSelection,
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
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/feed/refresh`,
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

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <>
            {/* Quick Search */}
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-gradient-to-b from-blue-600 to-green-500 rounded-full" />
                <h2 className="text-sm font-semibold text-blue-950">
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

            {/* Quick Feed Preview */}
            <MarketPulse limit={3} />
          </>
        );

      case "companies":
        return (
          <>
            {/* Search */}
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-950">
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
              <Newspaper className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-950">
                Industry News
              </h2>
            </div>
            <MarketPulse limit={10} />
          </>
        );

      case "settings":
        return (
          <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-950">
                Account Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-950">
                  {user?.email}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {user?.organization_name || "Personal Account"}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl text-white">
                <p className="text-sm font-semibold">{planLabel} Plan</p>
                <p className="text-xs mt-1 opacity-90">
                  {user?.subscription?.max_tracked_companies === -1
                    ? "Unlimited companies"
                    : `${user?.subscription?.max_tracked_companies || 5} companies`}
                </p>
              </div>
              <button
                onClick={handleOpenDashboard}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
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
    <div className="w-[420px] h-[580px] bg-slate-50 flex overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-blue-950 text-lg tracking-tight">
              LYNQ
            </span>
            <span className="text-[10px] bg-gradient-to-r from-blue-600 to-green-500 text-white px-2 py-0.5 rounded-full font-medium">
              {activeTab === "home"
                ? "Dashboard"
                : activeTab === "companies"
                  ? "Companies"
                  : activeTab === "feed"
                    ? "News"
                    : "Settings"}
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate max-w-[150px]">
            {user?.organization_name || user?.email}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-blue-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">Powered by</span>
              <span className="text-[10px] font-semibold text-blue-600">
                LYNQ AI
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
