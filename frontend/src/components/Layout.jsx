import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function BurgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function Layout({ children, title, titleAction }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [menuOpen]);

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-left">
          <button
            type="button"
            className="burger-btn"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Open menu"
          >
            <BurgerIcon />
          </button>
        </div>
        <Link to="/dashboard" className="layout-brand" onClick={() => setMenuOpen(false)}>
          Rent Easy
        </Link>
      </header>

      {menuOpen && (
        <div
          className="slide-menu-backdrop"
          role="presentation"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        ref={menuRef}
        className={`slide-menu ${menuOpen ? 'slide-menu-open' : ''}`}
        role="dialog"
        aria-label="Menu"
        aria-modal={menuOpen}
      >
        <div className="slide-menu-inner">
          {isAuthenticated ? (
            <>
              <div className="menu-user" title={user?.email}>
                {user?.email}
              </div>
              <Link to="/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/contracts/new" role="menuitem" onClick={() => setMenuOpen(false)}>New contract</Link>
              <Link to="/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>My contracts</Link>
              <Link to="/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>Account</Link>
              <Link to="/" role="menuitem" onClick={() => setMenuOpen(false)}>About RentEasy</Link>
              <button type="button" role="menuitem" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" role="menuitem" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/signup" role="menuitem" onClick={() => setMenuOpen(false)}>Sign up</Link>
              <Link to="/" role="menuitem" onClick={() => setMenuOpen(false)}>About RentEasy</Link>
            </>
          )}
        </div>
      </aside>

      <main className="layout-main">
        {title && (
          <div className="layout-title-row">
            <h1 className="layout-title">{title}</h1>
            {titleAction != null ? <div className="layout-title-action">{titleAction}</div> : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
