import { AxiosError } from "axios";

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  408: "Request timed out. Please try again.",
  422: "Invalid data provided. Please check your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "Service temporarily unavailable. Please try again.",
  503: "Service is currently unavailable. Please try again later.",
  504: "Request timed out. Please check your connection.",
};

const ERROR_CODES: Record<string, string> = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  ECONNABORTED: "Request timed out. Please try again.",
  ERR_NETWORK: "Network error. Please check your connection.",
  ERR_CANCELED: "Request was cancelled.",
};

export function parseApiError(error: unknown): ApiError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status || 0;

    // Check for specific error codes first
    if (error.code && ERROR_CODES[error.code]) {
      return {
        message: ERROR_CODES[error.code],
        code: error.code,
        status,
      };
    }

    // Check for network errors
    if (!error.response) {
      return {
        message: "Unable to connect. Please check your internet connection.",
        code: "NETWORK_ERROR",
        status: 0,
      };
    }

    // Try to get error message from response
    const responseData = error.response.data as
      | Record<string, unknown>
      | undefined;
    const serverMessage =
      responseData?.detail || responseData?.message || responseData?.error;

    // For 401, check if it's a login failure or session expiration
    if (status === 401) {
      // If there's a server message about incorrect credentials, use that
      if (
        typeof serverMessage === "string" &&
        (serverMessage.toLowerCase().includes("incorrect") ||
          serverMessage.toLowerCase().includes("password") ||
          serverMessage.toLowerCase().includes("email") ||
          serverMessage.toLowerCase().includes("invalid"))
      ) {
        return {
          message: serverMessage,
          code: "UNAUTHORIZED",
          status: 401,
        };
      }
      // Otherwise, it's likely a session expiration
      return {
        message: ERROR_MESSAGES[401],
        code: "UNAUTHORIZED",
        status: 401,
      };
    }

    // For other errors, use server message if it's user-friendly, otherwise use generic
    if (typeof serverMessage === "string" && serverMessage.length < 100) {
      // Clean up technical error messages
      const cleanMessage = cleanErrorMessage(serverMessage);
      return {
        message: cleanMessage,
        code: `HTTP_${status}`,
        status,
      };
    }

    // Fall back to generic error messages
    return {
      message:
        ERROR_MESSAGES[status] ||
        "An unexpected error occurred. Please try again.",
      code: `HTTP_${status}`,
      status,
    };
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return {
      message: cleanErrorMessage(error.message),
      code: "ERROR",
      status: 0,
    };
  }

  // Handle unknown errors
  return {
    message: "An unexpected error occurred. Please try again.",
    code: "UNKNOWN",
    status: 0,
  };
}

function cleanErrorMessage(message: string): string {
  // Remove technical prefixes
  const technicalPrefixes = [
    "Request failed with status code",
    "Network Error:",
    "Error:",
    "AxiosError:",
  ];

  let cleaned = message;
  for (const prefix of technicalPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // If it's just a number (status code), convert to message
  if (/^\d{3}$/.test(cleaned)) {
    const status = parseInt(cleaned, 10);
    return ERROR_MESSAGES[status] || "An error occurred. Please try again.";
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Add period if missing
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }

  return cleaned || "An error occurred. Please try again.";
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return (
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.code === "NETWORK_ERROR"
    );
  }
  return false;
}
