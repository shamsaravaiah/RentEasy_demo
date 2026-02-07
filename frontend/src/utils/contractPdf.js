import { jsPDF } from 'jspdf';

const MARGIN = 20;
const PAGE_WIDTH = 210;
const LINE_HEIGHT = 7;
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;

/**
 * Format ISO date for display.
 * @param {string} [iso]
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

/**
 * Build a PDF document from contract data. Returns a Blob.
 * @param {import('../api/types').Contract} contract
 * @returns {Promise<Blob>}
 */
export async function buildContractPdf(contract) {
  const doc = new jsPDF();
  let y = MARGIN;

  doc.setFontSize(TITLE_SIZE);
  doc.text('Rental Contract', MARGIN, y);
  y += LINE_HEIGHT + 4;

  doc.setFontSize(BODY_SIZE);
  doc.setFont(undefined, 'normal');

  const lines = [
    ['Status', contract.status ?? '—'],
    ['Property address', contract.property_address ?? '—'],
    ['Landlord', contract.landlord_name ?? '—'],
    ['Tenant', contract.tenant_name ?? '—'],
    ['Rent', `${contract.currency ?? ''} ${Math.round(Number(contract.rent_amount ?? 0))}`],
    ['Deposit', `${contract.currency ?? ''} ${Math.round(Number(contract.deposit_amount ?? 0))}`],
    ['Start date', contract.start_date ?? '—'],
    ['End date', contract.end_date ?? '—'],
  ];

  for (const [label, value] of lines) {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), MARGIN + 45, y);
    y += LINE_HEIGHT;
  }

  y += 4;

  if (contract.terms_text) {
    doc.setFontSize(HEADING_SIZE);
    doc.setFont(undefined, 'bold');
    doc.text('Terms', MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFontSize(BODY_SIZE);
    doc.setFont(undefined, 'normal');
    const termsLines = doc.splitTextToSize(contract.terms_text, PAGE_WIDTH - 2 * MARGIN);
    doc.text(termsLines, MARGIN, y);
    y += termsLines.length * LINE_HEIGHT + 6;
  }

  const hasSignatures = contract.status === 'ACCEPTED' || contract.status === 'SIGNED';
  if (hasSignatures) {
    doc.setFontSize(HEADING_SIZE);
    doc.setFont(undefined, 'bold');
    doc.text('Signatures', MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFontSize(BODY_SIZE);
    doc.setFont(undefined, 'normal');
    const landlordName = contract.creator_side === 'LANDLORD' ? contract.landlord_name : contract.tenant_name;
    const tenantName = contract.creator_side === 'LANDLORD' ? contract.tenant_name : contract.landlord_name;
    doc.text(`Landlord (${landlordName}): ${contract.creator_signed_at ? formatDate(contract.creator_signed_at) : 'Not signed yet'}`, MARGIN, y);
    y += LINE_HEIGHT;
    doc.text(`Tenant (${tenantName}): ${contract.counterparty_signed_at ? formatDate(contract.counterparty_signed_at) : 'Not signed yet'}`, MARGIN, y);
  }

  return doc.output('blob');
}
