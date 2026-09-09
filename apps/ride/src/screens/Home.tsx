import { useEffect, useMemo, useState } from 'react';
import { listNodes, quoteFare } from '../lib/endpoints';
import type { CampusNodeRef, FareQuote, RideTier } from '../lib/endpoints';
import { useSession } from '../lib/session';
import { Spine } from '../components/Spine';
import { formatGhs } from '../lib/format';

const TIERS: { id: RideTier; name: string; blurb: string }[] = [
  { id: 'standard',    name: 'Standard',    blurb: 'Share the car. Cheapest seat.' },
  { id: 'comfort',     name: 'Comfort',     blurb: 'Fewer seats sold, more room.' },
  { id: 'independent', name: 'Independent', blurb: 'The whole car to yourself.' },
];

export function Home() {
  const { rider, school } = useSession();
  const [nodes, setNodes] = useState<CampusNodeRef[]>([]);
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [tier, setTier] = useState<RideTier>('standard');
  const [party, setParty] = useState(1);
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!rider) return;
    listNodes(rider.schoolId)
      .then(setNodes)
      .catch(() => setLoadError('Could not load campus stops.'));
  }, [rider]);

  // Quoting is the backend's job, not arithmetic done twice. The fare here
  // is the fare the ride will actually be charged at.
  useEffect(() => {
    if (!origin || !destination || origin === destination) { setQuote(null); return; }
    let cancelled = false;
    quoteFare({ originNodeId: origin, destinationNodeId: destination, partySize: party, tier })
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [origin, destination, party, tier]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const stops = useMemo(() => ([
    {
      id: 'o', role: 'origin' as const, active: Boolean(origin),
      name: byId.get(origin)?.name ?? 'Choose a pickup stop',
      meta: origin ? 'Pickup' : undefined,
    },
    {
      id: 'd', role: 'destination' as const, active: Boolean(destination),
      name: byId.get(destination)?.name ?? 'Choose where you are going',
      meta: destination ? 'Drop-off' : undefined,
    },
  ]), [origin, destination, byId]);

  const ready = Boolean(origin && destination && origin !== destination);

  return (
    <>
      <div className="shell__inner">
        <header className="stack-2 rise">
          <span className="sign">{school?.alias ?? school?.code ?? 'Campus'}</span>
          <h1 style={{ fontSize: 'var(--t-title)' }}>Where are you going?</h1>
        </header>

        {loadError && <p className="card" role="alert" style={{ color: 'var(--danger)' }}>{loadError}</p>}

        <section className="card rise" aria-label="Your route">
          <Spine stops={stops} seatsTaken={party} />

          <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
            <StopPicker label="Pickup" nodes={nodes} value={origin} exclude={destination} onChange={setOrigin} />
            <StopPicker label="Drop-off" nodes={nodes} value={destination} exclude={origin} onChange={setDestination} />
          </div>
        </section>

        <section className="stack rise" aria-label="Ride type">
          <span className="sign">Ride type</span>
          <div className="stack-2">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="card card--raised tier"
                data-selected={tier === t.id}
                aria-pressed={tier === t.id}
                onClick={() => setTier(t.id)}
              >
                <span className="grow" style={{ textAlign: 'left' }}>
                  <span className="spine__name">{t.name}</span>
                  <span className="spine__meta" style={{ display: 'block' }}>{t.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="stack rise" aria-label="Seats">
          <span className="sign">Seats</span>
          <div className="row" role="group" aria-label="Number of seats">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn--quiet seat"
                data-selected={party === n}
                aria-pressed={party === n}
                onClick={() => setParty(n)}
              >
                <span className="data">{n}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Shown inline on narrow screens; the context column takes over on wide ones. */}
        <div className="context-inline">
          <FarePanel quote={quote} ready={ready} />
        </div>

        <button className="btn btn--primary btn--block rise" disabled={!ready}>
          {ready ? 'Find a ride' : 'Pick both stops'}
        </button>
      </div>

      <aside className="shell__context" aria-label="Fare">
        <FarePanel quote={quote} ready={ready} />
      </aside>
    </>
  );
}

function StopPicker({ label, nodes, value, exclude, onChange }: {
  label: string; nodes: CampusNodeRef[]; value: string; exclude: string;
  onChange: (v: string) => void;
}) {
  const id = `stop-${label.toLowerCase()}`;
  return (
    <div className="field">
      <label className="sign" htmlFor={id}>{label}</label>
      <select id={id} className="field__input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a stop</option>
        {nodes.filter((n) => n.id !== exclude).map((n) => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
    </div>
  );
}

function FarePanel({ quote, ready }: { quote: FareQuote | null; ready: boolean }) {
  if (!ready) {
    return (
      <div className="card">
        <span className="sign">Fare</span>
        <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>
          Pick a pickup and a drop-off to see the fare.
        </p>
      </div>
    );
  }
  if (!quote) {
    return <div className="card"><span className="sign">Fare</span><p style={{ marginTop: 'var(--sp-2)', color: 'var(--text-muted)' }}>Working it out…</p></div>;
  }
  return (
    <div className="card stack-2">
      <span className="sign">Fare</span>
      <div className="fare__total data">{formatGhs(quote.totalPesewas)}</div>
      <div className="row row--between spine__meta">
        <span>{quote.partySize} × {formatGhs(quote.perSeatPesewas)}</span>
        <span className="data">{formatGhs(quote.rawTotalPesewas)}</span>
      </div>
      {quote.discountPesewas > 0 && (
        <div className="row row--between spine__meta" style={{ color: 'var(--positive)' }}>
          <span>Group discount{quote.discountPct ? ` (${quote.discountPct}%)` : ''}</span>
          <span className="data">−{formatGhs(quote.discountPesewas)}</span>
        </div>
      )}
      <p className="spine__meta" style={{ marginTop: 'var(--sp-2)' }}>
        Charged at drop-off, not now.
      </p>
    </div>
  );
}
