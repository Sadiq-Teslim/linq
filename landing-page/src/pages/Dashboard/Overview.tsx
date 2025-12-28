import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button, Card } from "../../components";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [subResponse, usageResponse, statusResponse] = await Promise.all([
          api.subscription.getCurrent(token).catch(() => ({ data: null })),
          api.analytics.getUsage(token).catch(() => ({ data: null })),
          api.analytics.getSubscriptionStatus(token).catch(() => ({ data: null })),
        ]);
        
        setSubscription(subResponse.data);
        setUsage(usageResponse.data);
        setSubscriptionStatus(statusResponse.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-indigo-600 text-4xl">⟳</div>
      </div>
    );
  }

  const isActive = subscriptionStatus?.is_active !== false;
  const plan = subscription?.plan || subscriptionStatus?.plan || "Free Trial";
  const maxCompanies = subscription?.max_tracked_companies || subscriptionStatus?.max_tracked_companies || 5;
  const currentCompanies = usage?.total_companies || 0;
  const usagePercent = maxCompanies > 0 ? Math.min((currentCompanies / maxCompanies) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {user?.full_name || "User"}
        </h1>
        <p className="text-slate-600 mt-2">
          Here's an overview of your LINQ account
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-slate-600 mb-2">Plan Status</div>
          <div className="text-2xl font-bold text-slate-900 capitalize">
            {plan.replace("_", " ")}
          </div>
          <p className={`text-xs mt-2 ${isActive ? "text-green-600" : "text-red-600"}`}>
            {isActive ? "Active" : "Inactive"}
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-600 mb-2">Companies Tracked</div>
          <div className="text-2xl font-bold text-slate-900">
            {currentCompanies}
            {maxCompanies > 0 && (
              <span className="text-sm text-slate-500 font-normal ml-1">
                / {maxCompanies === -1 ? "∞" : maxCompanies}
              </span>
            )}
          </div>
          <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-indigo-600"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-600 mb-2">Total Contacts</div>
          <div className="text-2xl font-bold text-slate-900">
            {usage?.total_contacts || 0}
          </div>
          <p className="text-xs text-slate-500 mt-2">Across all companies</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-600 mb-2">Updates (30 days)</div>
          <div className="text-2xl font-bold text-slate-900">
            {usage?.updates_last_30_days || 0}
          </div>
          <p className="text-xs text-slate-500 mt-2">Company updates</p>
        </Card>
      </div>

      {/* Usage Chart */}
      {usage?.usage_by_day && usage.usage_by_day.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Companies Tracked Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usage.usage_by_day}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="companies"
                stroke="#4f46e5"
                strokeWidth={2}
                name="Companies"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Activity Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Feed Items (30 days)</span>
              <span className="text-2xl font-bold text-slate-900">
                {usage?.feed_items_last_30_days || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Company Updates</span>
              <span className="text-2xl font-bold text-slate-900">
                {usage?.updates_last_30_days || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Contacts</span>
              <span className="text-2xl font-bold text-slate-900">
                {usage?.total_contacts || 0}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/dashboard/payment")}
            >
              Manage Subscription
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/dashboard/settings")}
            >
              Team Settings
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/dashboard/access-code")}
            >
              View Access Code
            </Button>
          </div>
        </Card>
      </div>

      {/* Upgrade Prompt */}
      {!isActive && (
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                {subscriptionStatus?.status === "expired" 
                  ? "Your subscription has expired" 
                  : "Upgrade Your Plan"}
              </h3>
              <p className="text-sm text-slate-600">
                {subscriptionStatus?.status === "expired"
                  ? "Renew your subscription to continue using all features."
                  : "Unlock all features and start tracking companies today."}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate("/dashboard/payment")}
            >
              {subscriptionStatus?.status === "expired" ? "Renew Now" : "Upgrade Now"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
