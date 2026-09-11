import { useEffect, useState } from 'react';
import { getBalance, listMyTrips } from '../lib/endpoints';
import type { Trip } from '../lib/endpoints';
import { formatGhs, initials } from '../lib/format';
import { useSession } from '../lib/session';
import { AppOnlyDialog, AppOnlyList, useAppOnly } from '../components/AppOnly';
import { RIDER_APP_ONLY } from '../lib/appOnly';

export function Wallet() {
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const gate = useAppOnly();
  const topUp = RIDER_APP_ONLY.find((r) => r.id === 'topup')!;

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
          Read-only here. The balance is the same one the app shows.
        </p>
        {/* A real button rather than a disabled one: tapping it explains the
            limit instead of leaving the person to guess it is broken. */}
        <button className="btn btn--quiet btn--block" onClick={() => gate.open(topUp)}
                style={{ marginTop: 'var(--sp-3)' }}>
          Top up
        </button>
      </section>
      <AppOnlyDialog reason={gate.reason} onClose={gate.close} />
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
  const gate = useAppOnly();
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
      <AppOnlyList reasons={RIDER_APP_ONLY} onPick={gate.open} />

      <button className="btn btn--ghost btn--block rise" onClick={signOut}>Sign out</button>
      <AppOnlyDialog reason={gate.reason} onClose={gate.close} />
    </div>
  );
}
