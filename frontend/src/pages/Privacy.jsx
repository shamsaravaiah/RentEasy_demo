import { Link } from 'react-router-dom';
import '../landing.css';

export function Privacy() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="landing-logo">RentEasy</Link>
        <Link to="/login" className="landing-signin">Sign in</Link>
      </header>
      <section className="landing-section" style={{ paddingTop: '2rem' }}>
        <h2>Privacy Policy</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Privacy Policy will be available here. Please contact us for more information.
        </p>
        <Link to="/" className="invite-link-back" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          ← Back to home
        </Link>
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
