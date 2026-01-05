import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
          api.analytics
            .getSubscriptionStatus(token)
            .catch(() => ({ data: null })),
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
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isActive = subscriptionStatus?.is_active !== false;
  const plan = subscription?.plan || subscriptionStatus?.plan || "Free Trial";
  const maxCompanies =
    subscription?.max_tracked_companies ||
    subscriptionStatus?.max_tracked_companies ||
    5;
  const currentCompanies = usage?.total_companies || 0;
  const usagePercent =
    maxCompanies > 0
      ? Math.min((currentCompanies / maxCompanies) * 100, 100)
      : 0;

  const stats = [
    {
      label: "Plan Status",
      value: plan.replace("_", " "),
      subtext: isActive ? "Active" : "Inactive",
      subtextColor: isActive ? "text-green-600" : "text-red-600",
      bgColor: isActive ? "bg-green-50" : "bg-red-50",
      borderColor: isActive ? "border-green-100" : "border-red-100",
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    {
      label: "Companies Tracked",
      value: `${currentCompanies}`,
      subtext: maxCompanies === -1 ? "of ∞" : `of ${maxCompanies}`,
      progress: usagePercent,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      label: "Total Contacts",
      value: usage?.total_contacts || 0,
      subtext: "Across all companies",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Updates (30 days)",
      value: usage?.updates_last_30_days || 0,
      subtext: "Company updates",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
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
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif text-slate-900 mb-2">
          Welcome back, {user?.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-slate-500">
          Here's an overview of your LYNQ account
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} ${stat.borderColor} border flex items-center justify-center text-blue-700`}>
                {stat.icon}
              </div>
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-serif text-slate-900 capitalize mb-1">
              {stat.value}
            </div>
            {stat.progress !== undefined && (
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stat.progress >= 90
                      ? "bg-red-500"
                      : stat.progress >= 70
                        ? "bg-yellow-500"
                        : "bg-gradient-to-r from-blue-600 to-green-500"
                  }`}
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            )}
            <p
              className={`text-xs mt-1 font-medium ${stat.subtextColor || "text-slate-400"}`}
            >
              {stat.subtext}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {usage?.usage_by_day && usage.usage_by_day.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Activity Over Time
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={usage.usage_by_day}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
              />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#1e293b",
                  boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="companies"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#2563eb" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Activity Summary
          </h2>
          <div className="space-y-4">
            {[
              {
                label: "Feed Items (30 days)",
                value: usage?.feed_items_last_30_days || 0,
              },
              {
                label: "Company Updates",
                value: usage?.updates_last_30_days || 0,
              },
              { label: "Total Contacts", value: usage?.total_contacts || 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0"
              >
                <span className="text-slate-600 text-sm">{item.label}</span>
                <span className="text-xl font-serif text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {[
              { label: "Manage Subscription", path: "/dashboard/payment" },
              { label: "Team Settings", path: "/dashboard/settings" },
              { label: "View Access Code", path: "/dashboard/access-code" },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 text-slate-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 flex items-center justify-between group"
              >
                {action.label}
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {!isActive && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 mb-1">
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
            <button
              onClick={() => navigate("/dashboard/payment")}
              className="flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/20"
            >
              {subscriptionStatus?.status === "expired"
                ? "Renew Now"
                : "Upgrade Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
