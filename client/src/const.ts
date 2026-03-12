export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - now points to internal login page instead of OAuth
export const getLoginUrl = () => {
  return "/login";
};
