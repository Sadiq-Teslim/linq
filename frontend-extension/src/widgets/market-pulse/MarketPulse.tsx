/**
 * Industry News Feed Widget
 * Shows latest news and updates relevant to the user's industry
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/entities/user/authStore';
import { feedApi, type IndustryNews } from '@/shared/api';
import { parseApiError } from '@/shared/lib/errors';
import {
  TrendingUp, DollarSign, Handshake, Rocket, Layers, Scale,
  AlertCircle, RefreshCw, ExternalLink, Bookmark, BookmarkCheck,
  Zap, Radio, ArrowRight, Sparkles
} from 'lucide-react';

const getNewsConfig = (newsType: string) => {
  switch (newsType) {
    case 'funding':
      return {
        icon: DollarSign,
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        label: 'Funding'
      };
    case 'merger':
      return {
        icon: Handshake,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        label: 'M&A'
      };
    case 'expansion':
      return {
        icon: TrendingUp,
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        label: 'Expansion'
      };
    case 'product':
      return {
        icon: Rocket,
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        label: 'Product'
      };
    case 'partnership':
      return {
        icon: Layers,
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-700',
        label: 'Partnership'
      };
    case 'regulation':
      return {
        icon: Scale,
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        label: 'Regulation'
      };
    default:
      return {
        icon: Sparkles,
        bg: 'bg-pink-50',
        border: 'border-pink-200',
        text: 'text-pink-700',
        label: 'Trend'
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

// Demo industry news
const DEMO_NEWS: IndustryNews[] = [
  {
    id: '1',
    headline: 'OpenAI raises $6.6B at $157B valuation',
    summary: 'The AI leader secures record funding round as enterprise adoption accelerates.',
    industry: 'Technology',
    companies_mentioned: ['OpenAI', 'Microsoft'],
    news_type: 'funding',
    source_url: 'https://techcrunch.com',
    source_name: 'TechCrunch',
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    relevance_score: 0.95,
    is_bookmarked: false,
  },
  {
    id: '2',
    headline: 'Salesforce acquires data analytics startup for $2B',
    summary: 'Strategic acquisition to enhance CRM capabilities with advanced analytics.',
    industry: 'Technology',
    companies_mentioned: ['Salesforce'],
    news_type: 'merger',
    source_url: 'https://bloomberg.com',
    source_name: 'Bloomberg',
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    relevance_score: 0.88,
    is_bookmarked: false,
  },
  {
    id: '3',
    headline: 'HubSpot launches AI-powered sales assistant',
    summary: 'New feature uses generative AI to automate prospect research and outreach.',
    industry: 'Technology',
    companies_mentioned: ['HubSpot'],
    news_type: 'product',
    source_url: 'https://hubspot.com',
    source_name: 'HubSpot Blog',
    published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    relevance_score: 0.82,
    is_bookmarked: true,
  },
  {
    id: '4',
    headline: 'EU announces new AI regulations for enterprise software',
    summary: 'Companies have 18 months to comply with new transparency requirements.',
    industry: 'Technology',
    companies_mentioned: [],
    news_type: 'regulation',
    source_url: 'https://reuters.com',
    source_name: 'Reuters',
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    relevance_score: 0.75,
    is_bookmarked: false,
  },
];

interface MarketPulseProps {
  limit?: number;
}

export const MarketPulse = ({ limit = 5 }: MarketPulseProps) => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<IndustryNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const industry = user?.industry || 'Technology';

  const fetchFeed = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await feedApi.getIndustryFeed(1, limit);
      setItems(response.items);
    } catch (err) {
      const apiError = parseApiError(err);
      console.error('Failed to fetch industry feed:', apiError.message);
      setError(apiError.message);
      // Use demo data as fallback
      setItems(DEMO_NEWS.slice(0, limit));
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
      <div className="mt-5">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse" />
              <div className="h-4 bg-white/20 rounded w-28 animate-pulse" />
            </div>
          </div>
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-slate-200 rounded w-16 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Industry Pulse</h3>
                <span className="text-[10px] text-white/60">{industry}</span>
              </div>
            </div>
            <button
              onClick={() => fetchFeed(true)}
              disabled={isRefreshing}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10
                       text-white/80 hover:bg-white/20 hover:text-white transition-all"
              title="Refresh feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {error && items.length === 0 ? (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Failed to load</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
                <button
                  onClick={() => fetchFeed()}
                  className="text-xs font-medium text-red-700 hover:text-red-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {items.map((item) => {
                const config = getNewsConfig(item.news_type);
                const Icon = config.icon;

                return (
                  <div
                    key={item.id}
                    className="group relative p-3 rounded-xl border bg-slate-50/50 border-slate-100
                               hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${config.bg} ${config.border} border flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${config.text}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(item.published_at)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed line-clamp-2 group-hover:text-slate-900 transition-colors">
                          {item.headline}
                        </p>
                        {item.companies_mentioned.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.companies_mentioned.slice(0, 3).map((company, i) => (
                              <span
                                key={i}
                                className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
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
                              ? 'text-indigo-600 bg-indigo-50'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors py-1.5">
                <Zap className="w-3 h-3" />
                View all {industry} news
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
