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
        bg: "bg-green-500/20",
        border: "border-green-500/30",
        text: "text-green-400",
        label: "Funding",
      };
    case "merger":
      return {
        icon: Handshake,
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
        label: "M&A",
      };
    case "expansion":
      return {
        icon: TrendingUp,
        bg: "bg-orange-500/20",
        border: "border-orange-500/30",
        text: "text-orange-400",
        label: "Expansion",
      };
    case "product":
      return {
        icon: Rocket,
        bg: "bg-purple-500/20",
        border: "border-purple-500/30",
        text: "text-purple-400",
        label: "Product",
      };
    case "partnership":
      return {
        icon: Layers,
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
        label: "Partnership",
      };
    case "regulation":
      return {
        icon: Scale,
        bg: "bg-white/10",
        border: "border-white/20",
        text: "text-white/60",
        label: "Regulation",
      };
    default:
      return {
        icon: Sparkles,
        bg: "bg-green-500/20",
        border: "border-green-500/30",
        text: "text-green-400",
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
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
            <div className="h-3 bg-white/10 rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-2 rounded-lg glass animate-pulse"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10" />
                <div className="flex-1">
                  <div className="h-2 bg-white/10 rounded w-14 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500/30 to-blue-500/30 rounded-lg flex items-center justify-center border border-white/10">
              <Radio className="w-3 h-3 text-green-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Industry Pulse
              </h3>
              <span className="text-[9px] text-white/60">{industry}</span>
            </div>
          </div>
          <button
            onClick={() => fetchFeed(true)}
            disabled={isRefreshing}
            className="w-6 h-6 flex items-center justify-center rounded-lg glass
                     text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
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
          <div className="glass-card rounded-lg border border-red-500/30 p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
                <AlertCircle className="w-3 h-3 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-400">
                  Failed to load
                </p>
                <p className="text-[10px] text-red-400/70 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => fetchFeed()}
                className="text-[10px] font-medium text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-5">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg glass flex items-center justify-center border border-white/10">
              <Newspaper className="w-5 h-5 text-white/40" />
            </div>
            <p className="text-xs text-white/70">No news available</p>
            <p className="text-[10px] text-white/50 mt-0.5">
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
                  className="group relative p-2 rounded-lg glass-card border border-white/10
                             hover:border-blue-500/30 hover:bg-white/5 transition-all card-hover"
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
                        <span className="text-[9px] text-white/50">
                          {formatTimeAgo(item.published_at)}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-white/90 leading-relaxed line-clamp-2 group-hover:text-white transition-colors">
                        {item.headline}
                      </p>
                      {item.companies_mentioned.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {item.companies_mentioned
                            .slice(0, 3)
                            .map((company, i) => (
                              <span
                                key={i}
                                className="text-[8px] glass text-white/70 px-1 py-0.5 rounded border border-white/10"
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
                            ? "text-green-400 bg-green-500/20"
                            : "text-white/40 hover:text-green-400 hover:bg-green-500/20"
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
                        className="p-1 rounded-md text-white/40 hover:text-blue-400 hover:bg-blue-500/20 transition-colors"
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
          <div className="mt-2 pt-2 border-t border-white/10">
            <button className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-white/60 hover:text-blue-400 transition-colors py-1">
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
