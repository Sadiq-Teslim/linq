import { api } from './client';

export interface ActivityFeedItem {
  id: string;
  event_type: 'funding' | 'partnership' | 'hiring' | 'expansion' | 'news';
  headline: string;
  summary?: string;
  company_name?: string;
  country?: string;
  source_url?: string;
  source_name?: string;
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
}

export interface FeedStats {
  total_items: number;
  by_event_type: Record<string, number>;
  by_country: Record<string, number>;
}

export interface EventType {
  value: string;
  label: string;
  description: string;
}

export const feedApi = {
  getFeed: async (
    page: number = 1,
    pageSize: number = 20,
    eventType?: string,
    country?: string
  ): Promise<FeedResponse> => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (eventType) params.event_type = eventType;
    if (country) params.country = country;

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
