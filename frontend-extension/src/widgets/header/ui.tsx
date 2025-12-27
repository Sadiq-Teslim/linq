/**
 * Header Widget
 * Navigation bar with user profile
 */
interface HeaderProps {
  userName?: string;
  onLogout?: () => void;
}

export function Header({ userName, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">LINQ</span>
        <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded">AI</span>
      </div>
      {userName && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{userName}</span>
          <button
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
