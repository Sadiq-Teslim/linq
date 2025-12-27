import { useAuthStore } from '@/entities/user/authStore';
import { AnalyzeButton } from '@/features/analyze-company/AnalyzeButton';
import { ResultCard } from '@/widgets/intelligence-card/ResultCard';
import { LogOut } from 'lucide-react';

export const PopupPage = () => {
  const { logout, user } = useAuthStore();

  return (
    <div className="w-[350px] min-h-[500px] bg-bg flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4">
        <div>
          <span className="font-bold text-primary tracking-tight">LINQ AI</span>
          {user?.email && (
            <span className="text-[10px] text-slate-400 block">{user.email}</span>
          )}
        </div>
        <button onClick={() => logout()} className="text-slate-400 hover:text-red-500">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <AnalyzeButton />
        <ResultCard />

        {/* Activity Feed Placeholder */}
        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Market Pulse (Nigeria)</h3>
          <div className="bg-white p-3 rounded border border-slate-100 text-xs text-slate-600">
            <span className="text-green-600 font-bold">FUNDING:</span> Moove raises $10M debt financing (2h ago)
          </div>
        </div>
      </main>
    </div>
  );
};