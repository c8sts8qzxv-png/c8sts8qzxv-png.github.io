import { useEffect, useState } from 'react';
import { getBalance, listMyTrips } from '../lib/endpoints';
import type { Trip } from '../lib/endpoints';
import { formatGhs, initials } from '../lib/format';
import { useSession } from '../lib/session';

export function Wallet() {
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getBalance().then((b) => setBalance(b.balancePesewas)).catch(() => setError(true));
  }, []);

  return (
    <div className="shell__inner">
      <header className="stack-2 rise">
        <span className="sign">Wallet</span>
        <h1 style={{ fontSize: 'var(--t-title)' }}>Your balance</h1>
      </header>
      <section className="card stack-2 rise">
        <span className="sign">Available</span>
        <div className="fare__total data">
          {error ? '—' : balance === null ? '…' : formatGhs(balance)}
        </div>
        <p className="spine__meta">
          Top up over MTN MoMo to your campus number. A low balance never blocks a
          booking — you can settle with the driver instead.
        </p>
      </section>
    </div>
  );
}

export function History() {
  const [trips, setTrips] = useState<Trip[] | null>(null);

  useEffect(() => {
    listMyTrips().then(setTrips).catch(() => setTrips([]));
  }, []);

  return (
    <div className="shell__inner">
      <header className="stack-2 rise">
        <span className="sign">History</span>
        <h1 style={{ fontSize: 'var(--t-title)' }}>Your trips</h1>
      </header>
      {trips === null && <p className="empty">Loading…</p>}
      {trips?.length === 0 && (
        <div className="empty card">
          <strong>No trips yet</strong>
          <span>Your first ride will show up here.</span>
        </div>
      )}
      <div className="stack-2">
        {trips?.map((t) => (
          <div key={t.id} className="card row row--between rise">
            <span className="grow">
              <span className="spine__name">{t.status}</span>
              <span className="spine__meta" style={{ display: 'block' }}>
                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
              </span>
            </span>
            {t.farePesewas != null && <span className="data">{formatGhs(t.farePesewas)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Profile() {
  const { rider, school, signOut } = useSession();
  return (
    <div className="shell__inner">
      <header className="stack-2 rise">
        <span className="sign">Profile</span>
        <h1 style={{ fontSize: 'var(--t-title)' }}>{rider?.fullName ?? 'You'}</h1>
      </header>
      <section className="card row rise" style={{ gap: 'var(--sp-4)' }}>
        <span className="brand__mark" style={{ width: 44, height: 44, fontSize: '1.0625rem' }}>
          {rider ? initials(rider.fullName) : '—'}
        </span>
        <span className="grow stack-2">
          <span className="spine__name">{school?.name ?? 'Campus'}</span>
          <span className="spine__meta data">{rider?.phone}</span>
        </span>
      </section>
      <button className="btn btn--ghost btn--block rise" onClick={signOut}>Sign out</button>
    </div>
  );
}
