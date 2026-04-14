/**
 * Global configuration Utility
 * Centralizes the API URL logic for both local development and production.
 */

export const getApiUrl = () => {
  // 1. Check for manual override (Standard Vercel/Production practice)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Default to localhost for local development
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return "http://127.0.0.1:8000";
  }

  // 3. Fallback to relative path (Works with Vercel rewrites)
  return "/api";
};
