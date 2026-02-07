import { api } from './client.js';

/**
 * @param {{ property_address: string, creator_side: 'LANDLORD'|'TENANT', rent_amount: number, deposit_amount: number, currency?: string, start_date: string, end_date?: string, terms_text?: string }} body
 * @returns {Promise<import('./types').Contract>}
 */
export async function createContract(body) {
  return api('/api/contracts', { method: 'POST', body });
}

/**
 * @param {string} type - 'created' | 'received'
 * @param {{ status?: string, cursor?: string, limit?: number }} [params]
 * @returns {Promise<{ items: import('./types').ContractListItem[], next_cursor?: string }>}
 */
export async function listContracts(type, params = {}) {
  const q = new URLSearchParams();
  q.set('type', type);
  if (params.status) q.set('status', params.status);
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit != null) q.set('limit', String(params.limit));
  return api(`/api/contracts?${q}`, { method: 'GET' });
}

/**
 * @param {string} id
 * @returns {Promise<import('./types').Contract>}
 */
export async function getContract(id) {
  return api(`/api/contracts/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * @param {string} id
 * @param {Partial<import('./types').Contract>} body
 * @returns {Promise<import('./types').Contract>}
 */
export async function updateContract(id, body) {
  return api(`/api/contracts/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

/**
 * Create invite link; optionally send to a specific email (they will see it in Received).
 * @param {string} id - contract id
 * @param {{ invitee_email?: string }} [body]
 * @returns {Promise<{ invite_url: string, expires_at?: string }>}
 */
export async function createInvite(id, body) {
  return api(`/api/contracts/${encodeURIComponent(id)}/invite`, {
    method: 'POST',
    body: body && (body.invitee_email !== undefined) ? { invitee_email: body.invitee_email || null } : undefined,
  });
}

/**
 * @param {string} id
 * @returns {Promise<{ contract: import('./types').Contract }>}
 */
export async function signContract(id) {
  return api(`/api/contracts/${encodeURIComponent(id)}/sign`, { method: 'POST' });
}

/**
 * @param {string} id
 * @returns {Promise<import('./types').Contract>}
 */
export async function cancelContract(id) {
  return api(`/api/contracts/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
