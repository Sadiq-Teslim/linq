import { useCompanyStore } from '@/entities/company/store';
import {
  CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Flame, Zap, Clock,
  Building2, Users, Target, AlertTriangle, Copy, RefreshCw, Linkedin
} from 'lucide-react';
import { useState } from 'react';

const getScoreConfig = (score: number) => {
  if (score >= 85) return {
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    label: 'Hot Lead',
    icon: Flame
  };
  if (score >= 70) return {
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    label: 'Warm Lead',
    icon: Zap
  };
  if (score >= 50) return {
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    label: 'Growth Stage',
    icon: TrendingUp
  };
  return {
    gradient: 'from-slate-400 to-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    label: 'Early Stage',
    icon: Clock
  };
};

export const ResultCard = () => {
  const { currentCompany, isLoading, error, reset } = useCompanyStore();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="mt-4 bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Analyzing company...</p>
            <p className="text-xs text-slate-400 mt-1">Gathering intelligence from multiple sources</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="mt-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-100 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 text-sm">Analysis Failed</h3>
            <p className="text-red-600 text-xs mt-1">{error}</p>
            <button
              onClick={() => reset()}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800"
            >
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!currentCompany) {
    return (
      <div className="mt-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
            <Target className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Ready to Discover</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-[200px]">
            Enter a company name above to get AI-powered sales intelligence
          </p>
        </div>
      </div>
    );
  }

  const scoreConfig = getScoreConfig(currentCompany.conversion_score);
  const ScoreIcon = scoreConfig.icon;
  const primaryContact = currentCompany.decision_makers[0];

  return (
    <div className="mt-4 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Score Header */}
      <div className={`bg-gradient-to-r ${scoreConfig.gradient} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-white truncate max-w-[180px]">
              {currentCompany.profile.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {currentCompany.profile.industry && (
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />
                  {currentCompany.profile.industry}
                </span>
              )}
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">
                {currentCompany.profile.country}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {currentCompany.conversion_score}
              </span>
            </div>
            <span className="text-[10px] text-white/90 mt-1 flex items-center gap-1">
              <ScoreIcon className="w-3 h-3" />
              {scoreConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* AI Summary Card */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Why Now</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {currentCompany.ai_summary}
            </p>
          </div>
        </div>

        {/* Timing Signals */}
        {currentCompany.why_now_factors && currentCompany.why_now_factors.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Timing Signals</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentCompany.why_now_factors.slice(0, 3).map((factor, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Score Factors */}
        {currentCompany.score_factors && currentCompany.score_factors.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Score Breakdown</span>
            </div>
            <div className="grid gap-1.5">
              {currentCompany.score_factors.slice(0, 3).map((factor, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                    factor.impact === 'positive' ? 'bg-emerald-50 border border-emerald-100' :
                    factor.impact === 'negative' ? 'bg-red-50 border border-red-100' :
                    'bg-slate-50 border border-slate-100'
                  }`}
                >
                  {factor.impact === 'positive' ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  ) : factor.impact === 'negative' ? (
                    <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
                  ) : (
                    <Minus className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${
                    factor.impact === 'positive' ? 'text-emerald-700' :
                    factor.impact === 'negative' ? 'text-red-700' : 'text-slate-600'
                  }`}>
                    {factor.factor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {currentCompany.predicted_pain_points.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pain Points</span>
            </div>
            <div className="space-y-1.5">
              {currentCompany.predicted_pain_points.slice(0, 3).map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Maker Card */}
        {primaryContact && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Key Contact</span>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-slate-800">{primaryContact.name}</p>
                  {primaryContact.is_founder && (
                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      Founder
                    </span>
                  )}
                  {primaryContact.is_c_suite && !primaryContact.is_founder && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                      C-Suite
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{primaryContact.title}</p>
              </div>
              {primaryContact.contact?.verification_score !== undefined && (
                <div className="flex items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    primaryContact.contact.verification_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    primaryContact.contact.verification_score >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {primaryContact.contact.verification_score}%
                  </div>
                </div>
              )}
            </div>

            {/* Contact Actions */}
            <div className="flex gap-2 mt-3">
              {primaryContact.contact?.email && (
                <button
                  onClick={() => copyEmail(primaryContact.contact!.email!)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200
                           rounded-lg py-2 text-xs font-medium text-slate-700 hover:bg-slate-50
                           hover:border-slate-300 transition-all"
                >
                  {copiedEmail ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              )}
              {primaryContact.linkedin_url && (
                <a
                  href={primaryContact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A66C2]
                           rounded-lg py-2 text-xs font-medium text-white hover:bg-[#004182] transition-all"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {currentCompany.sources_used.slice(0, 2).map((source, i) => (
              <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {source}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            {currentCompany.confidence_level && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                currentCompany.confidence_level === 'high' ? 'bg-emerald-50 text-emerald-600' :
                currentCompany.confidence_level === 'medium' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                <CheckCircle className="w-2.5 h-2.5" />
                {currentCompany.confidence_level}
              </span>
            )}
            {currentCompany.processing_time_ms && (
              <span>{currentCompany.processing_time_ms}ms</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};