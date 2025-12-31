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
          w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200
          ${isActive 
            ? "bg-blue-700 text-white shadow-lg shadow-blue-700/30" 
            : variant === "danger"
              ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              : "text-slate-400 hover:text-blue-600 hover:bg-blue-100"
          }
        `}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-blue-950 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            {label}
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-blue-950" />
          </div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  activeTab: "home" | "companies" | "feed" | "settings";
  onTabChange: (tab: "home" | "companies" | "feed" | "settings") => void;
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
    <div className="w-14 bg-white border-r border-blue-100 flex flex-col items-center py-3 gap-1">
      {/* Logo */}
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      
      {/* Plan Badge */}
      <div className="mb-3 relative group">
        <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-green-500 rounded-md flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </div>
        {/* Plan Tooltip */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-950 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            {planLabel} Plan
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-blue-950" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-blue-100 mb-2" />

      {/* Main Navigation */}
      <div className="flex flex-col gap-1 flex-1">
        <SidebarItem
          icon={<Home className="w-5 h-5" />}
          label="Dashboard"
          isActive={activeTab === "home"}
          onClick={() => onTabChange("home")}
        />
        <SidebarItem
          icon={<Building2 className="w-5 h-5" />}
          label="Companies"
          isActive={activeTab === "companies"}
          onClick={() => onTabChange("companies")}
        />
        <SidebarItem
          icon={<Newspaper className="w-5 h-5" />}
          label="Industry News"
          isActive={activeTab === "feed"}
          onClick={() => onTabChange("feed")}
          badge={unreadCount}
        />
        <SidebarItem
          icon={<Bell className="w-5 h-5" />}
          label="Notifications"
          badge={unreadCount}
          onClick={() => onTabChange("feed")}
        />
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-blue-100 my-2" />

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1">
        <SidebarItem
          icon={<RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />}
          label="Refresh Data"
          onClick={onRefresh}
        />
        <SidebarItem
          icon={<ExternalLink className="w-5 h-5" />}
          label="Open Dashboard"
          onClick={onOpenDashboard}
        />
        <SidebarItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          isActive={activeTab === "settings"}
          onClick={() => onTabChange("settings")}
        />
        <SidebarItem
          icon={<HelpCircle className="w-5 h-5" />}
          label="Help & Support"
          onClick={() => window.open("https://use-linq.netlify.app/support", "_blank")}
        />
        
        {/* Divider */}
        <div className="w-6 h-px bg-blue-100 my-2 mx-auto" />
        
        <SidebarItem
          icon={<LogOut className="w-5 h-5" />}
          label="Logout"
          variant="danger"
          onClick={onLogout}
        />
      </div>
    </div>
  );
};

export default Sidebar;

