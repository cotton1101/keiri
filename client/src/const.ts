export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Base path derived from Vite config (e.g. "/keiri" in production, "" in dev) */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

// Generate login URL - now points to internal login page instead of OAuth
export const getLoginUrl = () => {
  return `${BASE_PATH}/login`;
};
