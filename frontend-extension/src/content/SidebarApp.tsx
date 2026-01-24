import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { LoginPage } from "@/pages/login/LoginPage";
import { PopupPage } from "@/pages/popup/PopupPage";

export const SidebarApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, checkSession, token } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Drag state
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

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
    if (!isOpen) {
      // Reset position when opening
      setPosition({ x: window.innerWidth - 400, y: 0 });
    }
    setIsOpen(!isOpen);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the top bar area (first 40px)
    const rect = sidebarRef.current?.getBoundingClientRect();
    if (rect && e.clientY - rect.top > 40) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Constrain to viewport
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 100;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging, dragStart]);

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

      {/* Expanded State - DRAGGABLE WRAPPER */}
      {isOpen && (
        <div
          ref={sidebarRef}
          className="fixed h-screen w-[400px] bg-white shadow-2xl z-[2147483647] flex flex-col"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          {/* Drag Handle & Close Button */}
          <div
            className="h-10 bg-gradient-to-r from-blue-600 to-green-600 flex items-center justify-between px-4 flex-shrink-0"
            onMouseDown={handleMouseDown}
            style={{ cursor: "grab" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">LINQ AI</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                <div className="w-1 h-1 bg-white/50 rounded-full"></div>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="text-white hover:bg-white/20 rounded p-1 transition-colors"
              title="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {isAuthenticated ? <PopupPage /> : <LoginPage />}
          </div>
        </div>
      )}

      <style>
        {`
          /* Prevent text selection while dragging */
          .dragging-active {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
        `}
      </style>
    </>
  );
};
