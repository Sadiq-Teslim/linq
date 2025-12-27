import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { useCompanyStore } from '@/entities/company/store';
import { Search } from 'lucide-react';

export const AnalyzeButton = () => {
  const { analyzeCompany, isLoading } = useCompanyStore();
  const [companyName, setCompanyName] = useState('');

  const handleAnalyze = async () => {
    if (!companyName.trim()) return;
    await analyzeCompany(companyName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter company name..."
        className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <Button onClick={handleAnalyze} isLoading={isLoading} className="w-full">
        <Search className="w-4 h-4" /> Analyze Company
      </Button>
    </div>
  );
};