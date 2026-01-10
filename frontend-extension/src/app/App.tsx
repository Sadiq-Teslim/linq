import { useEffect, useState } from "react";
import { useAuthStore } from "@/entities/user/authStore";
import { LoginPage } from "@/pages/login/LoginPage";
import { PopupPage } from "@/pages/popup/PopupPage";
import "./styles/index.css";

function App() {
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

  // Show loading while checking session
  if (isChecking) {
    return (
      <div className="h-[560px] w-[380px] bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg
                className="w-8 h-8 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <div className="absolute inset-0 -z-10 w-16 h-16 rounded-2xl bg-blue-500/20 blur-xl animate-pulse" />
          </div>
          <p className="text-slate-300 text-sm font-medium mb-1">Loading LYNQ</p>
          <p className="text-slate-500 text-xs">Initializing extension...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      {isAuthenticated ? <PopupPage /> : <LoginPage />}
    </div>
  );
}

export default App;
