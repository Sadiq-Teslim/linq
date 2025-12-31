/**
 * Industry News Feed Widget
 * Shows latest news and updates relevant to the user's industry
 */
import { useState, useEffect } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { feedApi, type IndustryNews } from "@/shared/api";
import { parseApiError } from "@/shared/lib/errors";
import {
  TrendingUp,
  DollarSign,
  Handshake,
  Rocket,
  Layers,
  Scale,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Zap,
  Radio,
  ArrowRight,
  Sparkles,
  Newspaper,
} from "lucide-react";

const getNewsConfig = (newsType: string) => {
  switch (newsType) {
    case "funding":
      return {
        icon: DollarSign,
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-600",
        label: "Funding",
      };
    case "merger":
      return {
        icon: Handshake,
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-600",
        label: "M&A",
      };
    case "expansion":
      return {
        icon: TrendingUp,
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-600",
        label: "Expansion",
      };
    case "product":
      return {
        icon: Rocket,
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-600",
        label: "Product",
      };
    case "partnership":
      return {
        icon: Layers,
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-600",
        label: "Partnership",
      };
    case "regulation":
      return {
        icon: Scale,
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
        label: "Regulation",
      };
    default:
      return {
        icon: Sparkles,
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-600",
        label: "Trend",
      };
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};

interface MarketPulseProps {
  limit?: number;
}

export const MarketPulse = ({ limit = 5 }: MarketPulseProps) => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<IndustryNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const industry = user?.industry || "Technology";

  const fetchFeed = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await feedApi.getIndustryFeed(1, limit);
      setItems(response.items);
    } catch (err) {
      const apiError = parseApiError(err);
      console.error("Failed to fetch industry feed:", apiError.message);
      setError(apiError.message);
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleBookmark = async (newsId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === newsId
          ? { ...item, is_bookmarked: !item.is_bookmarked }
          : item,
      ),
    );
    try {
      await feedApi.toggleBookmark(newsId);
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === newsId
            ? { ...item, is_bookmarked: !item.is_bookmarked }
            : item,
        ),
      );
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(() => fetchFeed(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit]);

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-2 rounded-lg bg-slate-50 animate-pulse"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100" />
                <div className="flex-1">
                  <div className="h-2 bg-slate-100 rounded w-14 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center border border-green-200">
              <Radio className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Industry Pulse
              </h3>
              <span className="text-[9px] text-slate-500">{industry}</span>
            </div>
          </div>
          <button
            onClick={() => fetchFeed(true)}
            disabled={isRefreshing}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white
                     text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all border border-slate-100"
            title="Refresh feed"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {error ? (
          <div className="bg-red-50 rounded-lg border border-red-200 p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-lg border border-red-200">
                <AlertCircle className="w-3 h-3 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-700">
                  Failed to load
                </p>
                <p className="text-[10px] text-red-500 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => fetchFeed()}
                className="text-[10px] font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-5">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
              <Newspaper className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-600">No news available</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Check back later for updates
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.map((item) => {
              const config = getNewsConfig(item.news_type);
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="group relative p-2 rounded-lg border bg-white border-slate-100
                             hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div
                      className={`p-1.5 rounded-lg ${config.bg} ${config.border} border flex-shrink-0`}
                    >
                      <Icon className={`w-3 h-3 ${config.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide ${config.text}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {formatTimeAgo(item.published_at)}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-700 leading-relaxed line-clamp-2 group-hover:text-slate-900 transition-colors">
                        {item.headline}
                      </p>
                      {item.companies_mentioned.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {item.companies_mentioned
                            .slice(0, 3)
                            .map((company, i) => (
                              <span
                                key={i}
                                className="text-[8px] bg-slate-50 text-slate-500 px-1 py-0.5 rounded border border-slate-100"
                              >
                                {company}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleBookmark(item.id)}
                        className={`p-1 rounded-md transition-colors ${
                          item.is_bookmarked
                            ? "text-green-600 bg-green-50"
                            : "text-slate-400 hover:text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {item.is_bookmarked ? (
                          <BookmarkCheck className="w-3 h-3" />
                        ) : (
                          <Bookmark className="w-3 h-3" />
                        )}
                      </button>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <button className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 transition-colors py-1">
              <Zap className="w-2.5 h-2.5" />
              View all {industry} news
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
