/**
 * Company entity types
 */
export interface Company {
  name: string;
  domain?: string;
  industry?: string;
  description?: string;
  headquarters?: string;
  employeeCount?: string;
  foundedYear?: number;
  website?: string;
}

export interface DecisionMaker {
  name: string;
  title: string;
  linkedinUrl?: string;
  email?: string;
  verificationScore: number;
}

export interface CompanyIntelligence {
  profile: Company;
  decisionMakers: DecisionMaker[];
  aiSummary: string;
  conversionScore: number;
  scoreFactors: string[];
  predictedPainPoints: string[];
  dataFreshness: string;
  sourcesUsed: string[];
  processingTimeMs?: number;
}
