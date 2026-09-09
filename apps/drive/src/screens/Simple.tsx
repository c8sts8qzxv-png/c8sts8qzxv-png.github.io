import { useEffect, useState } from 'react';
import { getRevenue } from '../lib/endpoints';
import type { RevenueSummary } from '../lib/endpoints';
import { formatGhs, initials } from '../lib/format';
import { useSession } from '../lib/session';

export function Revenue() {
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { getRevenue().then(setData).catch(() => setFailed(true)); }, []);

  if (failed) {
    return (
      <div className="shell__inner">
        <div className="empty card"><strong>Revenue unavailable</strong><span>Could not reach Traverse.</span></div>
      </div>
    );
  }

  return (
    <div className="shell__inner">
      <header className="stack-2 rise">
        <span className="sign">Revenue</span>
        <h1 style={{ fontSize: 'var(--t-title)' }}>What you have earned</h1>
      </header>

      <section className="card stack rise">
        <span className="sign">Today</span>
        <div className="metric">
          <span className="fare__total data">{data ? formatGhs(data.today.totalPesewas) : '…'}</span>
          {/* Riders, not trips: one trip carrying two people counts twice,
              because the fare is charged per rider. */}
          <span className="spine__meta">
            {data ? `${data.today.riders} ${data.today.riders === 1 ? 'rider' : 'riders'} carried` : ' '}
          </span>
        </div>
      </section>

      <section className="card stack rise">
        <span className="sign">This week</span>
        <div className="metric">
          <span className="metric__value data">{data ? formatGhs(data.week.totalPesewas) : '…'}</span>
          <span className="spine__meta">
            {data ? `${data.week.riders} ${data.week.riders === 1 ? 'rider' : 'riders'} carried` : ' '}
          </span>
        </div>
      </section>

      {data && (
        <p className="spine__meta rise">
          Traverse keeps {(data.companyCutBps / 100).toFixed(2)}% of each fare
          {data.companyCutInherited ? ', set by your campus.' : '.'}
        </p>
      )}
    </div>
  );
}

export function Profile() {
  const { driver, school, signOut } = useSession();
  return (
    <div className="shell__inner">
      <header className="stack-2 rise">
        <span className="sign">Profile</span>
        <h1 style={{ fontSize: 'var(--t-title)' }}>{driver?.fullName ?? 'You'}</h1>
      </header>
      <section className="card row rise" style={{ gap: 'var(--sp-4)' }}>
        <span className="brand__mark" style={{ width: 44, height: 44, fontSize: '1.0625rem' }}>
          {driver ? initials(driver.fullName) : '—'}
        </span>
        <span className="grow stack-2">
          <span className="spine__name">{school?.name ?? 'Campus'}</span>
          <span className="spine__meta data">{driver?.phone}</span>
        </span>
      </section>
      <button className="btn btn--ghost btn--block rise" onClick={signOut}>Sign out</button>
    </div>
  );
}
