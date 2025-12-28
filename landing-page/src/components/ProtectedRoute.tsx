import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, setUser, setToken } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    // Check store first
    if (isAuthenticated && token) {
      setIsAuthed(true);
      setIsLoading(false);
      return;
    }

    // Fallback: check localStorage and restore session
    const storedToken = localStorage.getItem("linq_token");
    const storedUser = localStorage.getItem("linq_user");

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Restore session to store
        setUser(user);
        setToken(storedToken);
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
    navigate("/auth/login");
  }, [isAuthenticated, token, navigate, setUser, setToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthed ? <>{children}</> : null;
};
