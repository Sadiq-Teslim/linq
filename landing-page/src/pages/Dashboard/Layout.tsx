import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components";
import { api } from "../../lib/api";
import clsx from "clsx";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, token } = useAuthStore();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    { label: "Overview", path: "/dashboard/overview" },
    { label: "Payment", path: "/dashboard/payment" },
    { label: "Settings", path: "/dashboard/settings" },
    { label: "Access Code", path: "/dashboard/access-code" },
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-indigo-600">LINQ</h1>
            {!loading && !isActive && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                Subscription Expired
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-sm text-slate-600 block">{user?.email}</span>
              <span className="text-xs text-slate-500 capitalize">
                {plan.replace("_", " ")} Plan
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {!loading && !isActive && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">
                Your subscription has expired. Some features may be limited.{" "}
                <button
                  onClick={() => navigate("/dashboard/payment")}
                  className="font-medium underline"
                >
                  Renew now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "w-full text-left px-4 py-2 rounded-lg transition",
                  location.pathname === item.path
                    ? "bg-indigo-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="md:col-span-3">
            <Outlet context={{ subscriptionStatus, isActive }} />
          </div>
        </div>
      </div>
    </div>
  );
};
