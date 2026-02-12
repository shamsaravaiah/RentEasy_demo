import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as invitesApi from '../api/invites.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Layout } from '../components/Layout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { Loading } from '../components/Loading.jsx';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError(null);
    setDeclined(false);
    invitesApi
      .getInvitePreview(token)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Invalid or expired invite');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!token || !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const res = await invitesApi.acceptInvite(token);
      navigate(`/contracts/${res.contract.id}`, { replace: true });
    } catch (e) {
      setError(e?.message ?? 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    if (!window.confirm('Are you sure you want to decline this contract invite?')) return;
    setDeclining(true);
    setError(null);
    try {
      await invitesApi.declineInvite(token);
      setDeclined(true);
    } catch (e) {
      setError(e?.message ?? 'Failed to decline invite');
    } finally {
      setDeclining(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <p>Missing invite token.</p>
        <Link to="/" className="back-link">← Back to home</Link>
      </Layout>
    );
  }

  if (authLoading || loading) {
    return <Layout><Loading text="Loading invite…" /></Layout>;
  }

  if (error && !preview && !declined) {
    return (
      <Layout>
        <ErrorMessage error={error} />
        <Link to="/" className="back-link">← Back to home</Link>
      </Layout>
    );
  }

  if (declined) {
    return (
      <Layout title="Invite declined">
        <div className="card invite-outcome">
          <h2>You have declined this contract</h2>
          <p className="invite-outcome-text">The contract invite has been declined. You can return to your dashboard.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        </div>
      </Layout>
    );
  }

  if (!preview) return <Layout><p>Loading…</p></Layout>;

  const { contract, requires_auth_to_accept, current_user_is_creator } = preview;

  /* You're the creator: don't show Accept/Decline; tell them to share the link with the other party */
  if (current_user_is_creator) {
    const inviteLink = typeof window !== 'undefined' ? window.location.origin + `/invite/${token}` : '';
    return (
      <Layout title="Contract invite">
        <div className="card invite-creator-notice">
          <h2>You created this contract</h2>
          <p className="invite-creator-text">
            You're currently logged in as <strong>{user?.email}</strong>. This link is for the other party to accept or decline.
          </p>
          <p className="invite-creator-text">
            Share the link below with them. They must open it in their own browser and sign in with <strong>their own account</strong> to accept or decline. If they use this same browser, they should log out first, then open the link and log in as themselves.
          </p>
          <div className="invite-url" style={{ marginTop: '1rem' }}>
            <label>Link to share</label>
            <div className="invite-url-row">
              <input
                type="text"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-secondary invite-copy-btn"
                onClick={() => handleCopyLink(inviteLink)}
              >
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Log out (so the other party can sign in here)
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  /* Landing: not signed in – prompt to sign in or log in to view and act */
  if (requires_auth_to_accept && !isAuthenticated) {
    return (
      <Layout title="Contract invite">
        <div className="invite-landing card">
          <h2>You’ve been sent a contract</h2>
          <p className="invite-landing-text">Sign in or create an account to view the contract and choose to accept or decline it.</p>
          <div className="invite-landing-actions">
            <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`} className="btn btn-primary">
              Log in
            </Link>
            <Link to={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`} className="btn btn-secondary">
              Sign up
            </Link>
          </div>
        </div>
        <Link to="/" className="back-link">← Back to home</Link>
      </Layout>
  );
  }

  /* Signed in: show contract preview and Accept / Decline */
  return (
    <Layout title="Contract invite">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />
      <div className="invite-preview card contract-detail">
        <h2>Review contract</h2>
        <p className="invite-preview-intro">Review the details below. You can accept to become a party to this contract, or decline.</p>
        <div className="contract-detail-grid">
          <div><div className="detail-label">Property address</div><div className="detail-value">{contract.property_address}</div></div>
          <div><div className="detail-label">Rent</div><div className="detail-value">{contract.currency} {Math.round(Number(contract.rent_amount))}</div></div>
          <div><div className="detail-label">Deposit</div><div className="detail-value">{contract.currency} {Math.round(Number(contract.deposit_amount))}</div></div>
          <div><div className="detail-label">Start date</div><div className="detail-value">{contract.start_date}</div></div>
          <div><div className="detail-label">End date</div><div className="detail-value">{contract.end_date ?? '—'}</div></div>
        </div>
        {contract.terms_text ? (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div className="detail-label">Terms</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{contract.terms_text}</div>
          </div>
        ) : null}
      </div>
      <div className="invite-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAccept}
          disabled={accepting || declining}
        >
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDecline}
          disabled={accepting || declining}
        >
          {declining ? 'Declining…' : 'Decline'}
        </button>
      </div>
      <Link to="/dashboard" className="back-link">← Back</Link>
    </Layout>
  );
}
