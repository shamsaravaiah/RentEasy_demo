import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as contractsApi from '../api/contracts.js';
import * as invitesApi from '../api/invites.js';
import { Layout } from '../components/Layout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { Loading } from '../components/Loading.jsx';

export function Dashboard() {
  const [created, setCreated] = useState([]);
  const [received, setReceived] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const refresh = useCallback(() => {
    setError(null);
    Promise.all([
      contractsApi.listContracts('created').catch((e) => e),
      contractsApi.listContracts('received').catch((e) => e),
      invitesApi.listPendingInvites().catch((e) => e),
    ]).then(([createdRes, receivedRes, pendingRes]) => {
      if (!(createdRes instanceof Error)) setCreated(createdRes?.items ?? []);
      if (createdRes instanceof Error) setError(createdRes.message);
      if (!(receivedRes instanceof Error)) setReceived(receivedRes?.items ?? []);
      if (receivedRes instanceof Error) setError(receivedRes.message);
      if (!(pendingRes instanceof Error)) setPendingInvites(pendingRes?.items ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleAcceptInvite = async (contractId) => {
    setActionLoadingId(contractId);
    setError(null);
    try {
      await invitesApi.acceptInviteByContract(contractId);
      refresh();
    } catch (e) {
      setError(e?.message ?? 'Failed to accept invite');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvite = async (contractId) => {
    if (!window.confirm('Decline this contract invite?')) return;
    setActionLoadingId(contractId);
    setError(null);
    try {
      await invitesApi.declineInviteByContract(contractId);
      refresh();
    } catch (e) {
      setError(e?.message ?? 'Failed to decline invite');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <Layout title="Dashboard"><Loading text="Loading contracts…" /></Layout>;

  function StatusBadge({ status }) {
    const slug = (status || '').toLowerCase();
    const cls = ['draft', 'invited', 'accepted', 'signed', 'cancelled', 'declined'].includes(slug)
      ? `status-badge status-badge-${slug}`
      : 'status-badge';
    return <span className={cls}>{status || '—'}</span>;
  }

  return (
    <Layout title="Dashboard">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />
      <section className="dashboard-section">
        <div className="card">
          <h2 className="card-title">Created by me</h2>
          {created.length === 0 ? (
            <p className="dashboard-empty">No contracts yet. <Link to="/contracts/new">Create one</Link>.</p>
          ) : (
            <ul className="contract-list">
              {created.map((c) => (
                <li key={c.id}>
                  <Link to={`/contracts/${c.id}`}>
                    <span className="contract-address">{c.property_address}</span>
                    <StatusBadge status={c.status} />
                    <span className="contract-meta">{c.currency} {Math.round(Number(c.rent_amount))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="dashboard-section">
        <div className="card">
          <h2 className="card-title">Received</h2>
          {pendingInvites.length > 0 ? (
            <div className="pending-invites" style={{ marginBottom: '1rem' }}>
              <div className="detail-label" style={{ marginBottom: '0.5rem' }}>Pending invites (accept or decline)</div>
              <ul className="contract-list">
                {pendingInvites.map((item) => (
                  <li key={item.contract_id}>
                    <span className="contract-address">{item.contract.property_address}</span>
                    <span className="contract-meta">{item.contract.currency} {Math.round(Number(item.contract.rent_amount))}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={actionLoadingId === item.contract_id}
                        onClick={() => handleAcceptInvite(item.contract_id)}
                      >
                        {actionLoadingId === item.contract_id ? 'Accepting…' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={actionLoadingId === item.contract_id}
                        onClick={() => handleDeclineInvite(item.contract_id)}
                      >
                        Decline
                      </button>
                      <Link to={`/contracts/${item.contract_id}`} className="btn btn-secondary">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {received.length === 0 && pendingInvites.length === 0 ? (
            <p className="dashboard-empty">No received contracts.</p>
          ) : received.length > 0 ? (
            <ul className="contract-list">
              {received.map((c) => (
                <li key={c.id}>
                  <Link to={`/contracts/${c.id}`}>
                    <span className="contract-address">{c.property_address}</span>
                    <StatusBadge status={c.status} />
                    <span className="contract-meta">{c.currency} {Math.round(Number(c.rent_amount))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
