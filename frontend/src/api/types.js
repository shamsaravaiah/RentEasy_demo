// JSDoc-only types for API responses (no runtime code).

/**
 * @typedef {{ id: string, email: string, first_name?: string, last_name?: string, phone?: string }} User
 */

/**
 * @typedef {{ id: string, status: string, property_address: string, rent_amount: number, currency: string, start_date: string, created_at: string }} ContractListItem
 */

/**
 * @typedef {{ id: string, status: string, property_address: string, rent_amount: number, deposit_amount: number, currency: string, start_date: string, end_date?: string, terms_text: string }} ContractPreview
 */

/**
 * @typedef {ContractPreview & {
 *   creator_user_id: string,
 *   counterparty_user_id?: string,
 *   landlord_name: string,
 *   tenant_name?: string,
 *   accepted_at?: string,
 *   creator_signed_at?: string,
 *   counterparty_signed_at?: string,
 *   created_at: string,
 *   updated_at: string
 * }} Contract
 */
