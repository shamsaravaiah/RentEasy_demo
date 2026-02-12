import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../landing.css';

function extractTokenFromUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('/invite/')) {
      const token = trimmed.replace(/^\/invite\//, '').split(/[/?#]/)[0];
      return token || null;
    }
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`);
    const match = url.pathname.match(/\/invite\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function InviteLinkEntry() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const token = extractTokenFromUrl(url);
    if (token) {
      navigate(`/invite/${token}`);
    } else {
      setError('Please paste a valid RentEasy invite link.');
    }
  };

  return (
    <div className="landing invite-link-entry">
      <header className="landing-header">
        <Link to="/" className="landing-logo">RentEasy</Link>
        {isAuthenticated ? (
          <Link to="/dashboard" className="landing-signin">Dashboard</Link>
        ) : (
          <Link to="/login" className="landing-signin">Sign in</Link>
        )}
      </header>

      <main className="landing-main">
        <form onSubmit={handleSubmit} className="invite-link-form">
          <h1>Open your contract</h1>
          <p className="invite-link-desc">
            Paste the invite link you received from your landlord or tenant.
          </p>
          <label htmlFor="invite-url">Invite link</label>
          <input
            id="invite-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/invite/..."
            autoComplete="url"
          />
          {error && <p className="invite-link-error">{error}</p>}
          <button type="submit" className="btn-landing-primary">Open contract</button>
          <Link to="/" className="invite-link-back">← Back to home</Link>
        </form>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href="mailto:contact@renteasy.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
