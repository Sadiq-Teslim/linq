/**
 * Industry Feed API - News and updates for user's industry
 */
import { api } from './client';
import type { IndustryNews, IndustryFeedResponse } from './types';

// Legacy types for backward compatibility
export interface ActivityFeedItem {
  id: number;
  event_type: 'funding' | 'partnership' | 'hiring' | 'expansion' | 'news';
  headline: string;
  summary?: string;
  company_name?: string;
  company_domain?: string;
  company_industry?: string;
  country?: string;
  region?: string;
  city?: string;
  source_url?: string;
  source_name?: string;
  relevance_score: number;
  is_high_priority: boolean;
  local_context?: string;
  signal_type?: string;
  published_at?: string;
  indexed_at: string;
}

export interface FeedResponse {
  items: ActivityFeedItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
  last_updated: string;
  high_priority_count: number;
}

export interface FeedStats {
  total_items: number;
  by_event_type: Record<string, number>;
  by_industry: Record<string, number>;
}

export interface EventType {
  value: string;
  label: string;
  description: string;
}

export const feedApi = {
  // Get industry-specific news feed based on organization's industry
  getIndustryFeed: async (
    page = 1,
    limit = 20,
    newsType?: string
  ): Promise<IndustryFeedResponse> => {
    const params: Record<string, string | number> = { page, limit };
    if (newsType) params.news_type = newsType;

    const response = await api.get<IndustryFeedResponse>('/feed/industry', { params });
    return response.data;
  },

  // Bookmark/unbookmark a news item
  toggleBookmark: async (newsId: string): Promise<IndustryNews> => {
    const response = await api.post<IndustryNews>(`/feed/industry/${newsId}/bookmark`);
    return response.data;
  },

  // Get bookmarked news
  getBookmarked: async (page = 1, limit = 20): Promise<IndustryFeedResponse> => {
    const response = await api.get<IndustryFeedResponse>('/feed/industry/bookmarked', {
      params: { page, limit },
    });
    return response.data;
  },

  // Legacy feed endpoint (for backward compatibility)
  getFeed: async (
    page = 1,
    pageSize = 20,
    eventType?: string,
    industry?: string
  ): Promise<FeedResponse> => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (eventType) params.event_type = eventType;
    if (industry) params.industry = industry;

    const response = await api.get<FeedResponse>('/feed/', { params });
    return response.data;
  },

  refreshFeed: async (): Promise<{ status: string; items_added: number; timestamp: string }> => {
    const response = await api.get('/feed/refresh');
    return response.data;
  },

  getStats: async (): Promise<FeedStats> => {
    const response = await api.get<FeedStats>('/feed/stats');
    return response.data;
  },

  getEventTypes: async (): Promise<{ event_types: EventType[] }> => {
    const response = await api.get('/feed/event-types');
    return response.data;
  },
};
