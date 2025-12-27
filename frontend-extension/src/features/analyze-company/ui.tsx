/**
 * Analyze Company Feature
 * Button + Logic to trigger company analysis
 */
import { useState } from 'react';

interface AnalyzeCompanyProps {
  onAnalyze?: (companyName: string) => void;
  isLoading?: boolean;
}

export function AnalyzeCompany({ onAnalyze, isLoading }: AnalyzeCompanyProps) {
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim() && onAnalyze) {
      onAnalyze(companyName.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Enter company name..."
        className="flex-1 px-3 py-2 border rounded-lg text-sm"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !companyName.trim()}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? 'Analyzing...' : 'Analyze'}
      </button>
    </form>
  );
}
