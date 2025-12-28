import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface UsageData {
  total_searches: number;
  companies_tracked: number;
  api_calls_today: number;
  api_calls_this_month: number;
  daily_usage: { date: string; searches: number; api_calls: number }[];
  search_breakdown: { type: string; count: number }[];
  top_companies: { name: string; searches: number }[];
  response_times: { date: string; avg_ms: number }[];
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export const DashboardAnalytics = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await api.analytics.getFullBreakdown(token, timeRange);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        // Set mock data for display
        setData({
          total_searches: 0,
          companies_tracked: 0,
          api_calls_today: 0,
          api_calls_this_month: 0,
          daily_usage: [],
          search_breakdown: [],
          top_companies: [],
          response_times: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Full breakdown of your LINQ usage</p>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-lg p-1">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                timeRange === range
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Searches",
            value: data?.total_searches || 0,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
            color: "amber",
          },
          {
            label: "Companies Tracked",
            value: data?.companies_tracked || 0,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
            color: "green",
          },
          {
            label: "API Calls Today",
            value: data?.api_calls_today || 0,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
            color: "blue",
          },
          {
            label: "Monthly Calls",
            value: data?.api_calls_this_month || 0,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            color: "purple",
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className="p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-10 h-10 rounded-lg bg-${metric.color}-500/10 text-${metric.color}-400 flex items-center justify-center mb-4`}>
              {metric.icon}
            </div>
            <p className="text-3xl font-serif text-white mb-1">{metric.value.toLocaleString()}</p>
            <p className="text-sm text-slate-400">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Usage Over Time Chart */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Usage Over Time
        </h2>
        {data?.daily_usage && data.daily_usage.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.daily_usage}>
              <defs>
                <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                }}
                labelStyle={{ color: "#f8fafc" }}
              />
              <Area
                type="monotone"
                dataKey="searches"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorSearches)"
                strokeWidth={2}
                name="Searches"
              />
              <Area
                type="monotone"
                dataKey="api_calls"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorCalls)"
                strokeWidth={2}
                name="API Calls"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>No usage data available yet</p>
              <p className="text-sm text-slate-600 mt-1">Start using LINQ to see analytics</p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Breakdown */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Search Type Breakdown
          </h2>
          {data?.search_breakdown && data.search_breakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={data.search_breakdown}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    strokeWidth={0}
                  >
                    {data.search_breakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.search_breakdown.map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></span>
                      <span className="text-sm text-slate-300">{item.type}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500">
              No search data available
            </div>
          )}
        </div>

        {/* Response Times */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Average Response Times
          </h2>
          {data?.response_times && data.response_times.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.response_times}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={8} />
                <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${value}ms`, "Avg Response"]}
                />
                <Line
                  type="monotone"
                  dataKey="avg_ms"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500">
              No response time data available
            </div>
          )}
        </div>
      </div>

      {/* Top Companies */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Most Tracked Companies
        </h2>
        {data?.top_companies && data.top_companies.length > 0 ? (
          <div className="space-y-4">
            {data.top_companies.map((company, index) => {
              const maxSearches = Math.max(...data.top_companies.map((c) => c.searches));
              const width = (company.searches / maxSearches) * 100;
              return (
                <div key={company.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500 w-5">{index + 1}.</span>
                      {company.name}
                    </span>
                    <span className="text-white font-medium">{company.searches} searches</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              <p>No companies tracked yet</p>
              <p className="text-sm text-slate-600 mt-1">Start tracking companies via the extension</p>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Recent Activity
        </h2>
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 mb-1">No recent activity</p>
          <p className="text-sm text-slate-500">
            Your activity log will appear here as you use LINQ
          </p>
        </div>
      </div>
    </div>
  );
};

