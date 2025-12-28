import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, restoreSession } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    // Give zustand persist a moment to hydrate from localStorage
    const checkAuth = () => {
      // Check store first (zustand persist should have restored it)
      if (isAuthenticated && token) {
        setIsAuthed(true);
        setIsLoading(false);
        return;
      }

      // Fallback: check manual localStorage backup
      const storedToken = localStorage.getItem("linq_token");
      const storedUser = localStorage.getItem("linq_user");

      if (storedToken && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Restore session to store
          restoreSession(user, storedToken);
          setIsAuthed(true);
          setIsLoading(false);
          return;
        } catch {
          // Invalid stored data, clear it
          localStorage.removeItem("linq_token");
          localStorage.removeItem("linq_user");
        }
      }

      // No valid session found, redirect to login
      setIsLoading(false);
      navigate("/auth/login", { replace: true });
    };

    // Small delay to allow zustand persist to hydrate
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [isAuthenticated, token, navigate, restoreSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthed ? <>{children}</> : null;
};
