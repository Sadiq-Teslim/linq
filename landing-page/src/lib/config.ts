/// <reference types="vite/client" />

const getHostname = () => window.location.hostname;

export const CONFIG = {
  get API_BASE_URL() {
    const hostname = getHostname();
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return (
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"
      );
    }
    return "https://linq-api.onrender.com/api/v1";
  },

  PAYSTACK_PUBLIC_KEY:
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
    "pk_test_1f5344a2bfcc4d0760b49cff752313e08e22d5b2",

  CHROME_EXTENSION_URL: "#",

  get CALLBACK_URL() {
    return `${window.location.origin}/payment-callback`;
  },
};
