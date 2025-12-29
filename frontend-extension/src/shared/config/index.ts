/**
 * Extension Configuration
 * All configurable values should be here - no hardcoding elsewhere
 */

export const CONFIG = {
  // API Configuration
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "https://linq-api.onrender.com/api/v1",

  // Dashboard URL (for links to web app)
  DASHBOARD_URL:
    import.meta.env.VITE_DASHBOARD_URL || "https://use-linq.netlify.app",

  // Request timeout in ms
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,

  // Storage keys (for consistency)
  STORAGE_KEYS: {
    AUTH: "linq-extension-auth",
    COMPANY: "linq-company-store",
    SETTINGS: "linq-extension-settings",
  },

  // Extension version
  VERSION: import.meta.env.VITE_APP_VERSION || "1.0.0",

  // Feature flags
  FEATURES: {
    DEMO_MODE: import.meta.env.VITE_DEMO_MODE === "true",
    DEBUG: import.meta.env.VITE_DEBUG === "true",
  },
} as const;

// Type for the config
export type AppConfig = typeof CONFIG;
