import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import apiClient from "../lib/apiClient";

interface AuthProviderProps {
  children: React.ReactNode;
}

// Check session every 5 minutes
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Warn user 5 minutes before expiry
const EXPIRY_WARNING_THRESHOLD = 5 * 60 * 1000;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    isAuthenticated, 
    token, 
    logout, 
    isTokenExpired, 
    getTimeUntilExpiry,
    restoreSession 
  } = useAuthStore();
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) {
      const storedToken = localStorage.getItem("linq_token");
      const userStr = localStorage.getItem("linq_user");
      
      if (storedToken && userStr) {
        try {
          const user = JSON.parse(userStr);
          restoreSession(user, storedToken);
        } catch {
          // Invalid stored data, clear it
          localStorage.removeItem("linq_token");
          localStorage.removeItem("linq_user");
          localStorage.removeItem("linq_token_expiry");
        }
      }
    }
  }, [isAuthenticated, restoreSession]);

  // Handle logout with redirect
  const handleLogout = useCallback((reason: string = "session_expired") => {
    console.warn(`[Auth] Logging out user. Reason: ${reason}`);
    logout();
    
    // Only redirect if on a protected page
    if (location.pathname.startsWith("/dashboard")) {
      navigate(`/auth/login?reason=${reason}`, { replace: true });
    }
  }, [logout, navigate, location.pathname]);

  // Check token expiry locally
  const checkTokenExpiry = useCallback(() => {
    if (!isAuthenticated || !token) return;

    // Check if token is expired
    if (isTokenExpired()) {
      handleLogout("token_expired");
      return;
    }

    // Check if approaching expiry (show warning)
    const timeUntilExpiry = getTimeUntilExpiry();
    if (timeUntilExpiry !== null && timeUntilExpiry < EXPIRY_WARNING_THRESHOLD && !warningShownRef.current) {
      warningShownRef.current = true;
      console.info(`[Auth] Session expiring in ${Math.round(timeUntilExpiry / 60000)} minutes`);
      // Could show a toast/notification here
    }
  }, [isAuthenticated, token, isTokenExpired, getTimeUntilExpiry, handleLogout]);

  // Validate session with server
  const validateSession = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      // Use the global apiClient which has interceptors
      await apiClient.get("/auth/session/status");
    } catch (error: any) {
      // 401 errors are already handled by the interceptor
      // This catches other errors like network issues
      if (error.response?.status !== 401) {
        console.error("[Auth] Session validation error:", error.message);
      }
    }
  }, [isAuthenticated, token]);

  // Set up periodic session checks
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval when not authenticated
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      warningShownRef.current = false;
      return;
    }

    // Immediate check on authentication
    checkTokenExpiry();
    validateSession();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(() => {
      checkTokenExpiry();
      validateSession();
    }, SESSION_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkTokenExpiry, validateSession]);

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "linq_token" && event.newValue === null) {
        // Token was removed (logged out in another tab)
        console.info("[Auth] Detected logout from another tab");
        handleLogout("logged_out_elsewhere");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleLogout]);

  // Listen for visibility change (check session when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        checkTokenExpiry();
        validateSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, checkTokenExpiry, validateSession]);

  return <>{children}</>;
};

export default AuthProvider;

