import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as contractsApi from '../api/contracts.js';
import { buildContractPdf } from '../utils/contractPdf.js';
import { Layout } from '../components/Layout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { Loading } from '../components/Loading.jsx';

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [sentToEmail, setSentToEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);
    contractsApi
      .getContract(id)
      .then((c) => {
        if (!cancelled) setContract(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load contract');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleCreateInvite = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await contractsApi.createInvite(id);
      setInviteUrl(res.invite_url);
    } catch (e) {
      setError(e?.message ?? 'Failed to create invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToEmail = async () => {
    if (!id || !inviteeEmail?.trim()) return;
    setActionLoading(true);
    setError(null);
    setSentToEmail(null);
    try {
      const res = await contractsApi.createInvite(id, { invitee_email: inviteeEmail.trim() });
      setInviteUrl(res.invite_url);
      setSentToEmail(inviteeEmail.trim());
    } catch (e) {
      setError(e?.message ?? 'Failed to send invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSign = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await contractsApi.signContract(id);
      const c = await contractsApi.getContract(id);
      setContract(c);
    } catch (e) {
      setError(e?.message ?? 'Failed to sign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('Cancel this contract?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await contractsApi.cancelContract(id);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e?.message ?? 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    if (!contract) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const blob = await buildContractPdf(contract);
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewOpen(true);
    } catch (e) {
      setError(e?.message ?? 'Failed to generate PDF');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    setPreviewOpen(false);
  };

  const handleDownloadPdf = () => {
    if (!previewPdfUrl || !contract) return;
    const a = document.createElement('a');
    a.href = previewPdfUrl;
    a.download = `contract-${contract.property_address?.replace(/\s+/g, '-') || contract.id}.pdf`;
    a.click();
  };

  if (loading) return <Layout><Loading text="Loading contract…" /></Layout>;
  if (error && !contract) {
    return (
      <Layout>
        <ErrorMessage error={error} />
        <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      </Layout>
    );
  }
  if (!contract) return <Layout><p>Contract not found.</p></Layout>;

  const isCreator = user?.id && contract.creator_user_id === user.id;
  const isCounterparty = user?.id && contract.counterparty_user_id === user.id;
  const canInvite = contract.status === 'DRAFT' || contract.status === 'INVITED';
  const canCancel = isCreator && contract.status !== 'SIGNED' && contract.status !== 'CANCELLED' && contract.status !== 'DECLINED';
  const statusAccepted = contract.status === 'ACCEPTED';
  const creatorSigned = !!contract.creator_signed_at;
  const counterpartySigned = !!contract.counterparty_signed_at;
  const canSignAsCreator = statusAccepted && isCreator && !creatorSigned;
  const canSignAsCounterparty = statusAccepted && isCounterparty && !counterpartySigned;
  const showSignButton = canSignAsCreator || canSignAsCounterparty;

  const statusSlug = (contract.status || '').toLowerCase();
  const statusBadgeClass = ['draft', 'invited', 'accepted', 'signed', 'cancelled', 'declined'].includes(statusSlug)
    ? `status-badge status-badge-${statusSlug}` : 'status-badge';

  const formatSignedDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' at ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <Layout
      title="Contract"
      titleAction={canCancel ? (
        <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={actionLoading}>
          {actionLoading ? 'Cancelling…' : 'Cancel contract'}
        </button>
      ) : null}
    >
      <ErrorMessage error={error} onDismiss={() => setError(null)} />
      <div className="contract-detail">
        <div className="contract-detail-grid">
          <div><div className="detail-label">Status</div><div className="detail-value"><span className={statusBadgeClass}>{contract.status}</span></div></div>
          <div><div className="detail-label">Property address</div><div className="detail-value">{contract.property_address}</div></div>
          <div><div className="detail-label">Landlord</div><div className="detail-value">{contract.landlord_name}</div></div>
          <div><div className="detail-label">Tenant</div><div className="detail-value">{contract.tenant_name ?? '—'}</div></div>
          <div><div className="detail-label">Rent</div><div className="detail-value">{contract.currency} {Math.round(Number(contract.rent_amount))}</div></div>
          <div><div className="detail-label">Deposit</div><div className="detail-value">{contract.currency} {Math.round(Number(contract.deposit_amount))}</div></div>
          <div><div className="detail-label">Start date</div><div className="detail-value">{contract.start_date}</div></div>
          <div><div className="detail-label">End date</div><div className="detail-value">{contract.end_date ?? '—'}</div></div>
        </div>
        {(contract.status === 'ACCEPTED' || contract.status === 'SIGNED') ? (
          <div className="contract-signatures">
            <div className="detail-label">Signatures</div>
            <div className="signature-list">
              {creatorSigned ? (
                <div className="signature-item signed">
                  <span className="signature-label">{contract.creator_side === 'LANDLORD' ? contract.landlord_name : contract.tenant_name || '—'}</span>
                  <span className="signature-value">Signed on {formatSignedDate(contract.creator_signed_at)}</span>
                </div>
              ) : (
                <div className="signature-item pending">
                  <span className="signature-label">{contract.creator_side === 'LANDLORD' ? contract.landlord_name : contract.tenant_name || '—'}</span>
                  <span className="signature-value">Not signed yet</span>
                </div>
              )}
              {counterpartySigned ? (
                <div className="signature-item signed">
                  <span className="signature-label">{contract.creator_side === 'LANDLORD' ? contract.tenant_name : contract.landlord_name || '—'}</span>
                  <span className="signature-value">Signed on {formatSignedDate(contract.counterparty_signed_at)}</span>
                </div>
              ) : (
                <div className="signature-item pending">
                  <span className="signature-label">{contract.creator_side === 'LANDLORD' ? contract.tenant_name : contract.landlord_name || '—'}</span>
                  <span className="signature-value">Not signed yet</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
        {contract.terms_text ? (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div className="detail-label">Terms</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{contract.terms_text}</div>
          </div>
        ) : null}
      </div>
      <div className="contract-actions">
        {inviteUrl ? (
          <div className="invite-url">
            <label>Invite link (share with counterparty)</label>
            <div className="invite-url-row">
              <input type="text" readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn btn-secondary invite-copy-btn"
                onClick={() => handleCopyLink(inviteUrl)}
              >
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {sentToEmail ? (
              <p className="invite-sent-note">Sent to {sentToEmail}.</p>
            ) : null}
            {canInvite && isCreator ? (
              <div className="invite-send-email" style={{ marginTop: '1rem' }}>
                <label htmlFor="invitee-email-existing">Send to email (they’ll see it in Received)</label>
                <div className="invite-send-row">
                  <input
                    id="invitee-email-existing"
                    type="email"
                    placeholder="counterparty@example.com"
                    value={inviteeEmail}
                    onChange={(e) => setInviteeEmail(e.target.value)}
                    className="input"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSendToEmail}
                    disabled={actionLoading || !inviteeEmail?.trim()}
                  >
                    {actionLoading ? 'Sending…' : 'Send to email'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {canInvite && isCreator && !inviteUrl ? (
          <>
            <button type="button" className="btn btn-primary" onClick={handleCreateInvite} disabled={actionLoading}>
              {actionLoading ? 'Creating…' : 'Create invite link'}
            </button>
            <div className="invite-send-email" style={{ marginTop: '1rem' }}>
              <label htmlFor="invitee-email">Or send to email (they’ll see it in Received)</label>
              <div className="invite-send-row">
                <input
                  id="invitee-email"
                  type="email"
                  placeholder="counterparty@example.com"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendToEmail}
                  disabled={actionLoading || !inviteeEmail?.trim()}
                >
                  {actionLoading ? 'Sending…' : 'Send to email'}
                </button>
              </div>
            </div>
          </>
        ) : null}
        {showSignButton ? (
          <button type="button" className="btn btn-primary" onClick={handleSign} disabled={actionLoading}>
            {actionLoading ? 'Signing…' : 'Sign'}
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary" onClick={handleOpenPreview} disabled={previewLoading}>
          {previewLoading ? 'Generating…' : 'Preview contract'}
        </button>
      </div>
      {previewOpen && previewPdfUrl ? (
        <div className="pdf-preview-overlay" role="dialog" aria-modal="true" aria-label="Contract PDF preview">
          <div className="pdf-preview-backdrop" onClick={handleClosePreview} aria-hidden />
          <div className="pdf-preview-panel">
            <div className="pdf-preview-toolbar">
              <button type="button" className="btn btn-primary" onClick={handleDownloadPdf}>
                Download
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClosePreview}>
                Close
              </button>
            </div>
            <iframe title="Contract PDF preview" src={previewPdfUrl} className="pdf-preview-iframe" />
          </div>
        </div>
      ) : null}
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
    </Layout>
  );
}
