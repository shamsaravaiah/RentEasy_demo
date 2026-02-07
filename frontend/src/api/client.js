/**
 * Fault-tolerant API client: configurable base URL, timeout, retries, and consistent error handling.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const PRODUCTION_API_URL = 'https://renteasy-demo-backend.onrender.com';

function getBaseUrl() {
  const url = import.meta.env.VITE_API_URL;
  if (url) return url.replace(/\/$/, '');
  return import.meta.env.DEV ? 'http://localhost:8000' : PRODUCTION_API_URL;
}

function getToken() {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {string} message
 * @property {Record<string,unknown>} [body]
 */

/**
 * Parse error response body safely.
 * @param {Response} res
 * @returns {Promise<{ message: string, body?: Record<string,unknown> }>}
 */
async function parseErrorResponse(res) {
  let message = res.statusText || `Request failed (${res.status})`;
  let body;
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      body = await res.json();
      if (body && typeof body.detail === 'string') message = body.detail;
      else if (body && typeof body.detail === 'object' && Array.isArray(body.detail))
        message = body.detail.map((d) => (typeof d === 'object' && d?.msg != null ? d.msg : String(d))).join(', ');
      else if (body && typeof body.message === 'string') message = body.message;
    }
  } catch {
    // ignore parse errors
  }
  return { message, body };
}

/**
 * @param {Response} res
 * @param {string} message
 * @returns {Promise<never>}
 */
async function throwApiError(res, message) {
  const parsed = await parseErrorResponse(res);
  const err = new Error(parsed.message || message);
  err.status = res.status;
  err.body = parsed.body;
  err.response = res;
  throw err;
}

/**
 * Fetch with timeout.
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

/**
 * Call API with optional retries (only for network/5xx), auth header, and JSON handling.
 * @param {string} path - e.g. '/api/auth/login'
 * @param {RequestInit} options - method, body, etc.
 * @param {{ timeout?: number, retries?: number, skipAuth?: boolean }} [opts]
 * @returns {Promise<any>} Parsed JSON or undefined for 204
 */
export async function api(path, options = {}, opts = {}) {
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const skipAuth = opts.skipAuth === true;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const init = { ...options, headers };
  if (typeof init.body === 'object' && init.body !== null && !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams)) {
    init.body = JSON.stringify(init.body);
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeout);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (res.status === 204 || (contentType.includes('application/json') && res.status !== 204)) {
          if (res.status === 204) return undefined;
          return res.json();
        }
        return undefined;
      }

      const parsed = await parseErrorResponse(res);
      const err = new Error(parsed.message);
      err.status = res.status;
      err.body = parsed.body;
      err.response = res;
      lastError = err;

      // On 401, clear auth so user can log in again
      if (res.status === 401) {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw err;
      }
      // Don't retry other client errors (4xx) except 408/429
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    } catch (e) {
      if (e.name === 'AbortError') {
        lastError = new Error('Request timed out');
        lastError.status = 0;
      } else if (e instanceof TypeError && e.message.includes('fetch')) {
        lastError = new Error('Network error. Is the backend running?');
        lastError.status = 0;
      } else {
        lastError = e;
      }
      if (lastError.status != null && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 408 && lastError.status !== 429) {
        throw lastError;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export { getBaseUrl, getToken };
