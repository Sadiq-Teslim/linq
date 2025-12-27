/**
 * Intelligence Card Widget
 * Displays company score + AI summary
 */
interface IntelligenceCardProps {
  companyName?: string;
  score?: number;
  summary?: string;
  isLoading?: boolean;
}

export function IntelligenceCard({
  companyName,
  score,
  summary,
  isLoading
}: IntelligenceCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
        <div className="h-3 bg-muted rounded w-full mb-2"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold text-lg">{companyName || 'No company selected'}</h3>
      {score !== undefined && (
        <div className="text-3xl font-bold text-primary my-2">{score}/100</div>
      )}
      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}
    </div>
  );
}
