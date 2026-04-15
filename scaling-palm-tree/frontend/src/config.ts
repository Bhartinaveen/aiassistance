/**
 * Global configuration Utility
 * Centralizes the API URL logic for both local development and production.
 */

export const getApiUrl = () => {
  // 1. Default to localhost for local development (Highest priority to avoid dev confusion)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return "http://127.0.0.1:8000";
  }

  // 2. Check for manual override (Standard Vercel/Production practice)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 3. Fallback to your live Render backend (Production fallback)
  return "https://aiassistance-kfib.onrender.com";
};
