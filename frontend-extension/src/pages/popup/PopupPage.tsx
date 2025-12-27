import { useAuthStore } from '@/entities/user/authStore';
import { AddCompanySearch } from '@/features/add-company';
import { MonitorBoard } from '@/widgets/monitor-board';
import { MarketPulse } from '@/widgets/market-pulse';
import { ToastProvider } from '@/shared/ui/Toast';
import { LogOut, Sparkles, Settings, Bell, Crown } from 'lucide-react';
import { useCompanyStore } from '@/entities/company/store';

export const PopupPage = () => {
  const { logout, user } = useAuthStore();
  const { unreadCount } = useCompanyStore();

  const planLabel = user?.subscription?.plan === 'enterprise' ? 'Enterprise' :
                    user?.subscription?.plan === 'professional' ? 'Pro' :
                    user?.subscription?.plan === 'starter' ? 'Starter' : 'Trial';

  return (
    <ToastProvider>
      <div className="w-[380px] min-h-[520px] bg-gradient-to-b from-slate-50 to-white flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 tracking-tight text-base">LINQ</span>
                    <span className="text-[9px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      {planLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                    {user?.organization_name || user?.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Notifications */}
                <button
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                           hover:text-slate-600 hover:bg-slate-100 transition-all"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                           hover:text-slate-600 hover:bg-slate-100 transition-all"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => logout()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                           hover:text-red-500 hover:bg-red-50 transition-all"
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
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
              <h2 className="text-sm font-semibold text-slate-700">Track Companies</h2>
            </div>
            <AddCompanySearch />
          </div>

          {/* Monitor Board */}
          <MonitorBoard />

          {/* Industry News Feed */}
          <MarketPulse limit={4} />
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Powered by</span>
              <span className="text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                LINQ AI
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {user?.subscription?.max_tracked_companies === -1
                ? 'Unlimited'
                : `${user?.subscription?.max_tracked_companies || 5} companies`}
            </span>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
};
