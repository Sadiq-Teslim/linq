import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../lib/api";

const SparklesIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, token } = useAuthStore();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!token) return;
      try {
        const response = await api.analytics.getSubscriptionStatus(token);
        setSubscriptionStatus(response.data);
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [token]);

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard/overview",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "Analytics",
      path: "/dashboard/analytics",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: "Payment",
      path: "/dashboard/payment",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      label: "Settings",
      path: "/dashboard/settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      label: "Access Code",
      path: "/dashboard/access-code",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    logout();
    localStorage.removeItem("linq_token");
    localStorage.removeItem("linq_user");
    navigate("/");
  };

  const isActive = subscriptionStatus?.is_active !== false;
  const plan = subscriptionStatus?.plan || "free_trial";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 -z-10"></div>
      
      {/* Floating shapes */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float -z-10"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
                <SparklesIcon />
              </div>
              <span className="text-xl font-bold text-white tracking-tight hidden sm:block group-hover:text-blue-300 transition-colors">
                LYNQ
              </span>
            </button>
            {!loading && !isActive && (
              <span className="text-xs bg-red-500/20 text-red-300 px-2.5 py-1 rounded-full border border-red-500/30 font-medium glass">
                Expired
              </span>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <span className="text-sm font-medium text-white block">{user?.email}</span>
              <span className="text-xs text-slate-400 capitalize">
                {plan.replace("_", " ")} Plan
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg glass border border-white/10 hover:border-red-500/30 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-4 space-y-2 border-t border-white/10 glass">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 glass"
                    : "text-slate-300 hover:text-white hover:bg-white/5 glass border border-white/10"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-white/10">
              <div className="px-4 py-2">
                <span className="text-sm font-medium text-white block">{user?.email}</span>
                <span className="text-xs text-slate-400 capitalize">
                  {plan.replace("_", " ")} Plan
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-2 text-sm text-red-300 hover:text-red-200 px-4 py-3 rounded-xl hover:bg-red-500/10 glass border border-red-500/20 transition-all flex items-center gap-3 font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Subscription warning */}
      {!loading && !isActive && (
        <div className="fixed top-[73px] left-0 right-0 z-40 bg-red-500/20 border-b border-red-500/30 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-300">
                Your subscription has expired. Some features may be limited.
              </p>
              <button
                onClick={() => navigate("/dashboard/payment")}
                className="text-sm font-semibold text-red-300 hover:text-red-200 underline transition-colors"
              >
                Renew now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop Fixed */}
      <nav className={`hidden md:block fixed left-0 w-64 h-screen ${!loading && !isActive ? "top-[121px]" : "top-[73px]"} z-30 px-4 py-8 overflow-y-auto`}>
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5 glass border border-white/10 hover:border-blue-500/20"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className={`md:ml-64 pt-[73px] ${!loading && !isActive ? "pt-[121px]" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <main className="animate-fade-in-up">
            <Outlet context={{ subscriptionStatus, isActive }} />
          </main>
        </div>
      </div>
    </div>
  );
};
