import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { CONFIG } from "./config";
import { useAuthStore } from "../store/authStore";

// Create a singleton axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple logout redirects
let isLoggingOut = false;

// Request interceptor - add auth token to all requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = useAuthStore.getState();
    const token = state.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors (unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      
      console.warn("[Auth] Session expired or invalid. Logging out...");
      
      // Get the logout function from the store
      const { logout, isAuthenticated } = useAuthStore.getState();
      
      // Only logout if currently authenticated
      if (isAuthenticated) {
        logout();
        
        // Redirect to login page with a message
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/dashboard")) {
          window.location.href = "/auth/login?expired=true";
        }
      }
      
      // Reset flag after a delay to allow for redirect
      setTimeout(() => {
        isLoggingOut = false;
      }, 2000);
    }
    
    // Handle 403 Forbidden (access denied)
    if (error.response?.status === 403) {
      console.warn("[Auth] Access denied. User may not have required permissions.");
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper to create authenticated requests (for backwards compatibility)
export const getAuthenticatedClient = () => apiClient;

