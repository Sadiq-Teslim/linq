/**
 * API Client
 * Centralized axios instance for all API calls
 */
import axios from "axios";
import { CONFIG } from "../config";

// Create axios instance with config values
export const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.API_TIMEOUT,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const storage = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH);
    if (storage) {
      try {
        const { state } = JSON.parse(storage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {
        // Invalid storage, ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
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
        })
      );
    }
    return Promise.reject(error);
  }
);
