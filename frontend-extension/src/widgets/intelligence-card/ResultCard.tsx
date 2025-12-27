import { useCompanyStore } from '@/entities/company/store';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const ResultCard = () => {
  const { currentCompany, isLoading, error } = useCompanyStore();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="animate-pulse">Analyzing company...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  if (!currentCompany) {
    return <div className="p-4 text-center text-gray-500 text-sm">Enter a company name and click 'Analyze'.</div>;
  }

  const scoreColor = currentCompany.conversion_score > 70 ? 'text-green-600' : 'text-yellow-600';
  const primaryContact = currentCompany.decision_makers[0];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mt-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-bold text-lg text-slate-800">{currentCompany.profile.name}</h2>
          {currentCompany.profile.industry && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              {currentCompany.profile.industry}
            </span>
          )}
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${scoreColor}`}>{currentCompany.conversion_score}</div>
          <div className="text-[10px] text-slate-400 uppercase">Score</div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border-l-4 border-blue-500">
        <p className="font-semibold text-xs text-slate-500 mb-1">WHY NOW?</p>
        {currentCompany.ai_summary}
      </div>

      {/* Pain Points */}
      {currentCompany.predicted_pain_points.length > 0 && (
        <div className="text-xs text-slate-600">
          <p className="font-semibold text-slate-500 mb-1">PAIN POINTS</p>
          <ul className="list-disc list-inside space-y-1">
            {currentCompany.predicted_pain_points.slice(0, 3).map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision Maker */}
      {primaryContact && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{primaryContact.name}</p>
            <span className="text-xs text-slate-500">({primaryContact.title})</span>
          </div>
          {primaryContact.contact?.email && (
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded text-xs font-mono text-slate-600">
              {primaryContact.contact.email}
              {primaryContact.contact.verification_score > 80 && (
                <CheckCircle className="w-3 h-3 text-green-500" />
              )}
            </div>
          )}
          {primaryContact.linkedin_url && (
            <a
              href={primaryContact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
            >
              View LinkedIn
            </a>
          )}
        </div>
      )}

      {/* Processing time */}
      <div className="text-[10px] text-slate-400 text-right">
        Processed in {currentCompany.processing_time_ms}ms
      </div>
    </div>
  );
};