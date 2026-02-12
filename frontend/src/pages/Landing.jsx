import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../landing.css';

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="landing-logo">RentEasy</Link>
        {isAuthenticated ? (
          <Link to="/dashboard" className="landing-signin">Dashboard</Link>
        ) : (
          <Link to="/login" className="landing-signin">Sign in</Link>
        )}
      </header>

      <section className="landing-hero">
        <h1>Secure rental agreements. Signed with BankID.</h1>
        <p className="landing-hero-sub">
          Turn informal Facebook or WhatsApp rental deals into verified, legally signed contracts in minutes.
        </p>
        <div className="landing-cta">
          <Link
            to={isAuthenticated ? '/contracts/new' : '/login?redirect=' + encodeURIComponent('/contracts/new')}
            className="btn-landing-primary"
          >
            Create a contract
          </Link>
          <Link
            to={isAuthenticated ? '/invite' : '/login?redirect=' + encodeURIComponent('/invite')}
            className="btn-landing-secondary"
          >
            I have a contract link
          </Link>
        </div>
        <p className="landing-trust">Swedish BankID verification • Private deal rooms • No marketplace</p>
      </section>

      <section className="landing-section">
        <h2>How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <strong>Create a deal room</strong><br />
            Enter rental details and generate a secure invite link.
          </div>
          <div className="landing-step">
            <strong>Both verify with BankID</strong><br />
            Each party confirms their identity.
          </div>
          <div className="landing-step">
            <strong>Sign and store</strong><br />
            Both sign. The contract is locked and saved for both parties.
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2>Why use RentEasy?</h2>
        <ul>
          <li>No more "agreed in chat" misunderstandings</li>
          <li>Verified identities on both sides</li>
          <li>Clear rental terms</li>
          <li>Legally signed contract</li>
          <li>Stored securely for both parties</li>
        </ul>
      </section>

      <section className="landing-section">
        <h2>Built for informal rentals</h2>
        <ul>
          <li>Swedes renting in Spain</li>
          <li>Sublets</li>
          <li>Private short-term rentals</li>
          <li>Long-term agreements outside marketplaces</li>
          <li>Any deal made over chat</li>
        </ul>
      </section>

      <section className="landing-cta-section">
        <h2>Make your next rental agreement official.</h2>
        <Link
          to={isAuthenticated ? '/contracts/new' : '/login?redirect=' + encodeURIComponent('/contracts/new')}
          className="btn-landing-primary"
        >
          Create contract
        </Link>
        <p>No account creation. BankID is your login.</p>
      </section>

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
