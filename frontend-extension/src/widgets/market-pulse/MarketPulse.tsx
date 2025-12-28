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
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        label: "Funding",
      };
    case "merger":
      return {
        icon: Handshake,
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-400",
        label: "M&A",
      };
    case "expansion":
      return {
        icon: TrendingUp,
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        text: "text-orange-400",
        label: "Expansion",
      };
    case "product":
      return {
        icon: Rocket,
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-400",
        label: "Product",
      };
    case "partnership":
      return {
        icon: Layers,
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        text: "text-indigo-400",
        label: "Partnership",
      };
    case "regulation":
      return {
        icon: Scale,
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
        text: "text-slate-400",
        label: "Regulation",
      };
    default:
      return {
        icon: Sparkles,
        bg: "bg-gold-500/10",
        border: "border-gold-500/20",
        text: "text-gold-400",
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
        item.id === newsId ? { ...item, is_bookmarked: !item.is_bookmarked } : item
      )
    );
    try {
      await feedApi.toggleBookmark(newsId);
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === newsId ? { ...item, is_bookmarked: !item.is_bookmarked } : item
        )
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
      <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
        <div className="bg-gradient-to-r from-gold-500/20 to-gold-400/10 px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-28 animate-pulse" />
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10" />
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded w-16 mb-2" />
                  <div className="h-4 bg-white/10 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold-500/10 to-transparent px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gold-500/10 rounded-lg flex items-center justify-center border border-gold-500/20">
              <Radio className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Industry Pulse</h3>
              <span className="text-[10px] text-slate-500">{industry}</span>
            </div>
          </div>
          <button
            onClick={() => fetchFeed(true)}
            disabled={isRefreshing}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5
                     text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {error ? (
          <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Failed to load</p>
                <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => fetchFeed()}
                className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
              <Newspaper className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No news available</p>
            <p className="text-xs text-slate-500 mt-1">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {items.map((item) => {
              const config = getNewsConfig(item.news_type);
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="group relative p-3 rounded-xl border bg-white/[0.02] border-white/5
                             hover:border-white/10 hover:bg-white/[0.03] transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-lg ${config.bg} ${config.border} border flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide ${config.text}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatTimeAgo(item.published_at)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-300 leading-relaxed line-clamp-2 group-hover:text-white transition-colors">
                        {item.headline}
                      </p>
                      {item.companies_mentioned.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {item.companies_mentioned.slice(0, 3).map((company, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5"
                            >
                              {company}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleBookmark(item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.is_bookmarked
                            ? "text-gold-400 bg-gold-500/10"
                            : "text-slate-500 hover:text-gold-400 hover:bg-gold-500/10"
                        }`}
                      >
                        {item.is_bookmarked ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
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
          <div className="mt-3 pt-3 border-t border-white/5">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-gold-400 transition-colors py-1.5">
              <Zap className="w-3 h-3" />
              View all {industry} news
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
