import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as contractsApi from '../api/contracts.js';
import { Layout } from '../components/Layout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';

const defaultForm = {
  property_address: '',
  creator_side: 'LANDLORD',
  rent_amount: '',
  deposit_amount: '',
  currency: 'SEK',
  start_date: '',
  end_date: '',
  terms_text: '',
};

export function CreateContract() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.property_address?.trim()) {
      setError('Property address is required.');
      return;
    }
    const rent = parseInt(String(form.rent_amount).trim(), 10);
    const deposit = parseInt(String(form.deposit_amount).trim(), 10);
    if (Number.isNaN(rent) || rent < 0 || Number.isNaN(deposit) || deposit < 0) {
      setError('Rent and deposit must be valid whole numbers (no decimals).');
      return;
    }
    if (!form.start_date) {
      setError('Start date is required.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        property_address: form.property_address.trim(),
        creator_side: form.creator_side,
        rent_amount: rent,
        deposit_amount: deposit,
        currency: form.currency || 'SEK',
        start_date: form.start_date,
        end_date: form.end_date?.trim() || undefined,
        terms_text: form.terms_text?.trim() || undefined,
      };
      const contract = await contractsApi.createContract(body);
      navigate(`/contracts/${contract.id}`, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="New contract">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />
      <div className="card">
        <form onSubmit={handleSubmit} className="contract-form">
          <label>
            Property address *
            <input
              value={form.property_address}
              onChange={(e) => update('property_address', e.target.value)}
              required
              disabled={loading}
              placeholder="Street, city, postal code"
            />
          </label>
          <label>
            I am the
            <div className="creator-side-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="creator_side"
                  value="LANDLORD"
                  checked={form.creator_side === 'LANDLORD'}
                  onChange={(e) => update('creator_side', e.target.value)}
                  disabled={loading}
                />
                <span>Landlord</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="creator_side"
                  value="TENANT"
                  checked={form.creator_side === 'TENANT'}
                  onChange={(e) => update('creator_side', e.target.value)}
                  disabled={loading}
                />
                <span>Tenant</span>
              </label>
            </div>
          </label>
          <div className="form-row">
            <label>
              Rent amount *
              <input
                type="number"
                min="0"
                step="1"
                value={form.rent_amount}
                onChange={(e) => update('rent_amount', e.target.value)}
                required
                disabled={loading}
              />
            </label>
            <label>
              Deposit amount *
              <input
                type="number"
                min="0"
                step="1"
                value={form.deposit_amount}
                onChange={(e) => update('deposit_amount', e.target.value)}
                required
                disabled={loading}
              />
            </label>
          </div>
          <label>
            Currency
            <select value={form.currency} onChange={(e) => update('currency', e.target.value)} disabled={loading}>
              <option value="SEK">SEK</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <div className="form-row">
            <label>
              Start date *
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                required
                disabled={loading}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
                disabled={loading}
              />
            </label>
          </div>
          <label>
            Terms (optional)
            <textarea
              value={form.terms_text}
              onChange={(e) => update('terms_text', e.target.value)}
              rows={4}
              disabled={loading}
              placeholder="Additional terms and conditions…"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create contract'}
          </button>
        </form>
      </div>
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
    </Layout>
  );
}
