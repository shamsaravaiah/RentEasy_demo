import { api } from './client.js';

/**
 * Invite preview. Send auth if logged in so backend can set current_user_is_creator.
 * @param {string} token
 * @param {{ sendAuth?: boolean }} [opts] - if true, send Bearer token (default: true when token in storage)
 * @returns {Promise<{ contract: import('./types').ContractPreview, requires_auth_to_accept: boolean, current_user_is_creator?: boolean }>}
 */
export async function getInvitePreview(token, opts = {}) {
  const skipAuth = opts.sendAuth === false;
  return api(
    `/api/invites/${encodeURIComponent(token)}`,
    { method: 'GET' },
    { skipAuth }
  );
}

/**
 * Accept invite (auth required).
 * @param {string} token
 * @returns {Promise<{ contract: import('./types').Contract }>}
 */
export async function acceptInvite(token) {
  return api(`/api/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
}

/**
 * Decline invite (auth required, invitee only).
 * @param {string} token
 * @returns {Promise<{ status: string }>}
 */
export async function declineInvite(token) {
  return api(`/api/invites/${encodeURIComponent(token)}/decline`, { method: 'POST' });
}

/**
 * List pending invites sent to the current user's email (for Received section).
 * @returns {Promise<{ items: Array<{ contract_id: string, contract: import('./types').ContractPreview }> }>}
 */
export async function listPendingInvites() {
  return api('/api/invites/pending', { method: 'GET' });
}

/**
 * Accept an invite by contract id (when invite was sent to your email). No link visit needed.
 * @param {string} contractId
 * @returns {Promise<{ contract: import('./types').Contract }>}
 */
export async function acceptInviteByContract(contractId) {
  return api(`/api/contracts/${encodeURIComponent(contractId)}/accept-invite`, { method: 'POST' });
}

/**
 * Decline an invite by contract id (when invite was sent to your email).
 * @param {string} contractId
 * @returns {Promise<{ ok: boolean }>}
 */
export async function declineInviteByContract(contractId) {
  return api(`/api/contracts/${encodeURIComponent(contractId)}/decline-invite`, { method: 'POST' });
}
