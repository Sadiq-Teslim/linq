import { useState, useEffect } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { LoginPage } from "@/pages/login/LoginPage";
import { PopupPage } from "@/pages/popup/PopupPage";

export const SidebarApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, checkSession, token } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Check session on mount
  useEffect(() => {
    const init = async () => {
      if (token) {
        await checkSession();
      }
      setIsChecking(false);
    };
    init();
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Loading state
  if (isChecking) {
    return (
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-[2147483647]">
        <button
          className="w-12 h-14 rounded-l-lg flex items-center justify-center shadow-lg animate-pulse"
          style={{ backgroundColor: "#0052cc" }}
          disabled
        >
          <span className="text-white font-bold text-xl font-sans">L</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button (FAB) - Always Visible */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-[2147483647]">
        <button
          onClick={toggleSidebar}
          className="w-12 h-14 rounded-l-lg flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:w-14"
          style={{ backgroundColor: "#0052cc" }}
          title={isOpen ? "Close LYNQ AI" : "Open LYNQ AI"}
        >
          <span className="text-white font-bold text-xl font-sans">L</span>
        </button>
      </div>

      {/* Expanded State - PURE WRAPPER */}
      {isOpen && (
        <>
          {/* Backdrop - Non-interactive */}
          <div className="fixed inset-0 bg-black/10 z-[2147483646] transition-opacity duration-300 pointer-events-none" />

          {/* Extension Container - NO WRAPPER UI */}
          <div className="fixed top-0 right-0 h-screen w-[400px] shadow-2xl z-[2147483647] animate-slide-in-right">
            {isAuthenticated ? <PopupPage /> : <LoginPage />}
          </div>
        </>
      )}

      <style>
        {`
          @keyframes slide-in-right {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .animate-slide-in-right {
            animation: slide-in-right 0.3s ease-out;
          }
        `}
      </style>
    </>
  );
};
