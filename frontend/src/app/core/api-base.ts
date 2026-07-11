/**
 * Base URL of the Pesawise API.
 *
 * Always relative — the frontend and API are same-origin in every setup:
 *  • Docker  → nginx serves the app and reverse-proxies `/api` to the backend.
 *  • Dev     → `ng serve` proxies `/api` to http://localhost:3000 (proxy.conf.json).
 */
export const API_BASE = '/api';
