import { api } from './client.js';

/**
 * @param {{ email: string, password: string, first_name?: string, last_name?: string, phone?: string }} body
 * @returns {Promise<{ token: string, user: { id: string, email: string, first_name?: string, last_name?: string, phone?: string } }>}
 */
export async function signup(body) {
  return api('/api/auth/signup', { method: 'POST', body }, { skipAuth: true });
}

/**
 * @param {{ email: string, password: string }} body
 * @returns {Promise<{ token: string, user: { id: string, email: string, first_name?: string, last_name?: string, phone?: string } }>}
 */
export async function login(body) {
  return api('/api/auth/login', { method: 'POST', body }, { skipAuth: true });
}

/**
 * @returns {Promise<{ id: string, email: string, first_name?: string, last_name?: string, phone?: string }>}
 */
export async function me() {
  return api('/api/auth/me', { method: 'GET' });
}
