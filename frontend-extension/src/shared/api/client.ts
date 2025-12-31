/**
 * API Client
 * Centralized axios instance for all API calls
 */
import axios from "axios";
import { CONFIG } from "../config";

// Create axios instance for LIVE API (Render)
export const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.API_TIMEOUT,
});

// Create axios instance for LOCAL API (Ollama-based endpoints)
export const localApi = axios.create({
  baseURL: CONFIG.LOCAL_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.LOCAL_API_TIMEOUT,
});

// Helper function to get token from storage
// Zustand persist stores data as: { state: {...}, version: ... }
const getTokenFromStorage = (): string | null => {
  try {
    const storage = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH);
    if (!storage) return null;
    
    const parsed = JSON.parse(storage);
    // Check both possible formats
    const token = parsed?.state?.token || parsed?.token;
    return token || null;
  } catch (error) {
    console.error("Error reading token from storage:", error);
    return null;
  }
};

// Request interceptor to add auth token (live API)
api.interceptors.request.use(
  (config) => {
    const token = getTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Request interceptor to add auth token (local API)
localApi.interceptors.request.use(
  (config) => {
    const token = getTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle auth errors (live API)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth storage on 401
      localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH);
      localStorage.removeItem("linq-user-storage");

      // Dispatch custom event for auth error handling
      window.dispatchEvent(
        new CustomEvent("linq:auth-error", {
          detail: { message: "Session expired" },
        }),
      );
    }
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors (local API)
localApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH);
      localStorage.removeItem("linq-user-storage");
      window.dispatchEvent(
        new CustomEvent("linq:auth-error", {
          detail: { message: "Session expired" },
        }),
      );
    }
    return Promise.reject(error);
  },
);
