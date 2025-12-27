import { api } from './client';

export interface CompanyProfile {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  website?: string;
  headquarters?: string;
  founded_year?: number;
  employee_count?: string;
  funding_stage?: string;
  linkedin_url?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  verification_score: number;
}

export interface DecisionMaker {
  name: string;
  title: string;
  linkedin_url?: string;
  contact?: ContactInfo;
}

export interface CompanyIntelligence {
  profile: CompanyProfile;
  decision_makers: DecisionMaker[];
  ai_summary: string;
  predicted_pain_points: string[];
  conversion_score: number;
  score_factors: string[];
  data_freshness: string;
  sources_used: string[];
  processing_time_ms: number;
}

export interface CompanySearchRequest {
  company_name: string;
  country?: string;
}

export const searchApi = {
  analyzeCompany: async (
    companyName: string,
    country: string = 'Nigeria'
  ): Promise<CompanyIntelligence> => {
    const response = await api.post<CompanyIntelligence>('/search/company', {
      company_name: companyName,
      country,
    });
    return response.data;
  },

  quickSearch: async (
    companyName: string,
    country: string = 'Nigeria'
  ): Promise<CompanyIntelligence> => {
    const response = await api.get<CompanyIntelligence>(
      `/search/company/${encodeURIComponent(companyName)}`,
      { params: { country } }
    );
    return response.data;
  },
};
