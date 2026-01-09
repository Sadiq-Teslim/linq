/**
 * Sidebar Navigation Component with Tooltips
 * Icon-only sidebar with hover tooltips for navigation
 */
import React, { useState } from "react";
import {
  Home,
  Building2,
  Newspaper,
  Settings,
  Bell,
  RefreshCw,
  LogOut,
  ExternalLink,
  Sparkles,
  Crown,
  HelpCircle,
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: number;
  variant?: "default" | "danger";
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  badge,
  variant = "default",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200
          ${isActive 
            ? "bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg shadow-blue-500/40" 
            : variant === "danger"
              ? "text-white/50 hover:text-red-400 hover:bg-red-500/20"
              : "text-white/60 hover:text-blue-400 hover:bg-white/10"
          }
        `}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-pulse">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="glass bg-white/10 backdrop-blur-xl text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl border border-white/20 whitespace-nowrap">
            {label}
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white/20" />
          </div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  activeTab: "home" | "companies" | "feed" | "notifications" | "settings";
  onTabChange: (tab: "home" | "companies" | "feed" | "notifications" | "settings") => void;
  unreadCount?: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenDashboard?: () => void;
  onLogout?: () => void;
  planLabel?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  isRefreshing = false,
  onRefresh,
  onOpenDashboard,
  onLogout,
  planLabel = "Trial",
}) => {
  return (
    <div className="w-12 glass border-r border-white/10 flex flex-col items-center py-2 gap-0.5">
      {/* Logo */}
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/40 mb-2 animate-pulse-glow">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      
      {/* Plan Badge */}
      <div className="mb-2 relative group">
        <div className="w-8 h-5 bg-gradient-to-r from-blue-500 to-green-500 rounded flex items-center justify-center shadow-md">
          <Crown className="w-2.5 h-2.5 text-white" />
        </div>
        {/* Plan Tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="glass bg-white/10 backdrop-blur-xl text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl border border-white/20 whitespace-nowrap">
            {planLabel} Plan
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white/20" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-5 h-px bg-white/10 mb-1" />

      {/* Main Navigation */}
      <div className="flex flex-col gap-0.5 flex-1">
        <SidebarItem
          icon={<Home className="w-4 h-4" />}
          label="Dashboard"
          isActive={activeTab === "home"}
          onClick={() => onTabChange("home")}
        />
        <SidebarItem
          icon={<Building2 className="w-4 h-4" />}
          label="Companies"
          isActive={activeTab === "companies"}
          onClick={() => onTabChange("companies")}
        />
        <SidebarItem
          icon={<Newspaper className="w-4 h-4" />}
          label="Industry News"
          isActive={activeTab === "feed"}
          onClick={() => onTabChange("feed")}
        />
        <SidebarItem
          icon={<Bell className="w-4 h-4" />}
          label="Notifications"
          isActive={activeTab === "notifications"}
          badge={unreadCount}
          onClick={() => onTabChange("notifications")}
        />
      </div>

      {/* Divider */}
      <div className="w-5 h-px bg-white/10 my-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col gap-0.5">
        <SidebarItem
          icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />}
          label="Refresh Data"
          onClick={onRefresh}
        />
        <SidebarItem
          icon={<ExternalLink className="w-4 h-4" />}
          label="Open Dashboard"
          onClick={onOpenDashboard}
        />
        <SidebarItem
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          isActive={activeTab === "settings"}
          onClick={() => onTabChange("settings")}
        />
        <SidebarItem
          icon={<HelpCircle className="w-4 h-4" />}
          label="Help & Support"
          onClick={() => window.open("https://use-linq.netlify.app/support", "_blank")}
        />
        
        {/* Divider */}
        <div className="w-5 h-px bg-white/10 my-1 mx-auto" />
        
        <SidebarItem
          icon={<LogOut className="w-4 h-4" />}
          label="Logout"
          variant="danger"
          onClick={onLogout}
        />
      </div>
    </div>
  );
};

export default Sidebar;
