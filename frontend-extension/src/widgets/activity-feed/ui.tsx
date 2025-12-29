/**
 * Activity Feed Widget
 * Scrolling news feed of business events
 */
interface FeedItem {
  id: number;
  eventType: string;
  headline: string;
  companyName?: string;
  country?: string;
}

interface ActivityFeedProps {
  items?: FeedItem[];
  isLoading?: boolean;
}

export function ActivityFeed({ items = [], isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border rounded animate-pulse">
            <div className="h-3 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className="p-3 border rounded hover:bg-muted/50 cursor-pointer"
        >
          <span className="text-xs uppercase font-medium text-primary">
            {item.eventType}
          </span>
          <p className="text-sm font-medium">{item.headline}</p>
          {item.companyName && (
            <span className="text-xs text-muted-foreground">
              {item.companyName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
