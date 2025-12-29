import { api } from "./client";

export interface RecentActivity {
  event_type: string;
  headline: string;
  date?: string;
  source?: string;
  url?: string;
}

export interface CompanyProfile {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  website?: string;
  headquarters?: string;
  country: string;
  founded_year?: number;
  employee_count?: string;
  employee_range?: string;
  funding_stage?: string;
  total_funding?: string;
  last_funding_date?: string;
  linkedin_url?: string;
  twitter_url?: string;
  recent_activities: RecentActivity[];
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  verification_score: number;
  verification_sources: string[];
  last_verified?: string;
}

export interface DecisionMaker {
  name: string;
  title: string;
  linkedin_url?: string;
  contact?: ContactInfo;
  is_founder: boolean;
  is_c_suite: boolean;
}

export interface ScoreFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

export interface CompanyIntelligence {
  profile: CompanyProfile;
  decision_makers: DecisionMaker[];
  ai_summary: string;
  predicted_pain_points: string[];
  why_now_factors: string[];
  conversion_score: number;
  score_factors: ScoreFactor[];
  score_label: string;
  data_freshness: string;
  data_age_days: number;
  sources_used: string[];
  processing_time_ms?: number;
  confidence_level: "low" | "medium" | "high";
}

export interface CompanySearchRequest {
  company_name: string;
  country?: string;
  user_vertical?: string;
}

export const searchApi = {
  analyzeCompany: async (
    companyName: string,
    country: string = "Nigeria",
  ): Promise<CompanyIntelligence> => {
    const response = await api.post<CompanyIntelligence>("/search/company", {
      company_name: companyName,
      country,
    });
    return response.data;
  },

  quickSearch: async (
    companyName: string,
    country: string = "Nigeria",
  ): Promise<CompanyIntelligence> => {
    const response = await api.get<CompanyIntelligence>(
      `/search/company/${encodeURIComponent(companyName)}`,
      { params: { country } },
    );
    return response.data;
  },
};
