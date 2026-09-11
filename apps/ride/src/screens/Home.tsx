import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelSeat, createRideOffer, getRideOffer, listAvailableDrivers, listNodes, quoteFare,
  requestMatch,
} from '../lib/endpoints';
import type {
  CampusNodeRef, FareQuote, MatchCandidate, RideOffer, RideTier,
} from '../lib/endpoints';
import { ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { Pips, Spine } from '../components/Spine';
import { formatGhs } from '../lib/format';
import { AppOnlyDialog, useAppOnly } from '../components/AppOnly';
import { RIDER_APP_ONLY } from '../lib/appOnly';

const TIERS: { id: RideTier; name: string; blurb: string }[] = [
  { id: 'standard',    name: 'Standard',    blurb: 'Share the car. Cheapest seat.' },
  { id: 'independent', name: 'Independent', blurb: 'The whole car to yourself.' },
];

type Stage = 'plan' | 'searching' | 'candidates' | 'waiting' | 'accepted' | 'declined';

function formatEta(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min`;
}

export function Home() {
  const { rider, school } = useSession();
  const [nodes, setNodes] = useState<CampusNodeRef[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [tier, setTier] = useState<RideTier>('standard');
  const [party, setParty] = useState(1);
  const [quote, setQuote] = useState<FareQuote | null>(null);

  const gate = useAppOnly();
  const tracking = RIDER_APP_ONLY.find((r) => r.id === 'tracking')!;
  const [cancelling, setCancelling] = useState(false);

  const [stage, setStage] = useState<Stage>('plan');
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [offer, setOffer] = useState<RideOffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rider) return;
    listNodes(rider.schoolId).then(setNodes).catch(() => setError('Could not load campus stops.'));
  }, [rider]);

  useEffect(() => {
    if (!origin || !destination || origin === destination) { setQuote(null); return; }
    let cancelled = false;
    quoteFare({ originNodeId: origin, destinationNodeId: destination, partySize: party, tier })
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [origin, destination, party, tier]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const ready = Boolean(origin && destination && origin !== destination);

  const stops = useMemo(() => ([
    { id: 'o', role: 'origin' as const, active: Boolean(origin),
      name: byId.get(origin)?.name ?? 'Choose a pickup stop', meta: origin ? 'Pickup' : undefined },
    { id: 'd', role: 'destination' as const, active: Boolean(destination),
      name: byId.get(destination)?.name ?? 'Choose where you are going', meta: destination ? 'Drop-off' : undefined },
  ]), [origin, destination, byId]);

  /* ---- Find a ride ---------------------------------------------------- */
  const find = useCallback(async () => {
    if (!rider || !ready) return;
    setStage('searching');
    setError(null);
    setCandidates([]);
    try {
      const drivers = await listAvailableDrivers(rider.schoolId, tier, party);
      if (drivers.length === 0) {
        setCandidates([]);
        setStage('candidates');
        return;
      }
      const result = await requestMatch({
        originNodeId: origin, destinationNodeId: destination, availableDrivers: drivers,
      });
      setCandidates(result.candidates);
      setStage('candidates');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not look for a ride.');
      setStage('plan');
    }
  }, [rider, ready, tier, party, origin, destination]);

  /* ---- Book one ------------------------------------------------------- */
  const book = useCallback(async (c: MatchCandidate) => {
    setStage('waiting');
    setError(null);
    try {
      const created = await createRideOffer({
        driverId: c.driverId,
        originNodeId: origin,
        destinationNodeId: destination,
        tripId: c.tripId,
        addedDetourSeconds: c.addedDetourSeconds,
        partySize: party,
        tier,
      });
      setOffer(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the request.');
      setStage('candidates');
    }
  }, [origin, destination, party, tier]);

  /* ---- Poll the offer -------------------------------------------------
     There is no push channel on the web, so the offer is polled. Stops the
     moment it resolves rather than running for the life of the screen. */
  const offerId = offer?.id;
  const pollRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!offerId || stage !== 'waiting') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const fresh = await getRideOffer(offerId);
        if (cancelled) return;
        setOffer(fresh);
        if (fresh.status === 'accepted') { setStage('accepted'); return; }
        if (fresh.status === 'declined') { setStage('declined'); return; }
      } catch { /* a failed poll is not a failed booking; try again */ }
      if (!cancelled) pollRef.current = window.setTimeout(tick, 2500);
    };
    pollRef.current = window.setTimeout(tick, 2000);
    return () => { cancelled = true; window.clearTimeout(pollRef.current); };
  }, [offerId, stage]);

  function reset() {
    setStage('plan'); setOffer(null); setCandidates([]); setError(null);
  }

  return (
    <>
      <div className="shell__inner">
        <header className="stack-2 rise">
          <span className="sign">{school?.alias ?? school?.code ?? 'Campus'}</span>
          <h1 style={{ fontSize: 'var(--t-title)' }}>
            {stage === 'plan' ? 'Where are you going?'
              : stage === 'searching' ? 'Looking for a ride'
              : stage === 'candidates' ? 'Who can take you'
              : stage === 'waiting' ? 'Asking the driver'
              : stage === 'accepted' ? 'You have a ride' : 'That one fell through'}
          </h1>
        </header>

        {error && <p className="card" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}

        <section className="card rise" aria-label="Your route">
          <Spine stops={stops} seatsTaken={party} />
          {stage === 'plan' && (
            <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
              <StopPicker label="Pickup" nodes={nodes} value={origin} exclude={destination} onChange={setOrigin} />
              <StopPicker label="Drop-off" nodes={nodes} value={destination} exclude={origin} onChange={setDestination} />
            </div>
          )}
        </section>

        {stage === 'plan' && (
          <>
            <section className="stack rise" aria-label="Ride type">
              <span className="sign">Ride type</span>
              <div className="stack-2">
                {TIERS.map((t) => (
                  <button key={t.id} type="button" className="card card--raised tier"
                    data-selected={tier === t.id} aria-pressed={tier === t.id}
                    onClick={() => setTier(t.id)}>
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
                  <button key={n} type="button" className="btn btn--quiet seat"
                    data-selected={party === n} aria-pressed={party === n}
                    onClick={() => setParty(n)}>
                    <span className="data">{n}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="context-inline"><FarePanel quote={quote} ready={ready} /></div>

            <button className="btn btn--primary btn--block rise" disabled={!ready} onClick={() => void find()}>
              {ready ? 'Find a ride' : 'Pick both stops'}
            </button>
          </>
        )}

        {stage === 'searching' && (
          <div className="card empty rise" role="status" aria-live="polite">
            <span className="pulse-bar" aria-hidden="true" />
            <strong>Checking who is free</strong>
            {/* Named, because a silent seven seconds reads as a hang. */}
            <span>The matcher batches requests for a few seconds so riders going
              the same way can share a car. This usually takes about 7 seconds.</span>
          </div>
        )}

        {stage === 'candidates' && (
          <section className="stack rise" aria-label="Available rides">
            {candidates.length === 0 ? (
              <div className="card empty">
                <strong>No car can take this right now</strong>
                <span>No driver on duty is close enough, or none has {party} {party === 1 ? 'seat' : 'seats'} free.</span>
                <button className="btn btn--ghost" onClick={reset} style={{ marginTop: 'var(--sp-3)' }}>Change the trip</button>
              </div>
            ) : (
              <>
                <span className="sign">{candidates.length} {candidates.length === 1 ? 'option' : 'options'}</span>
                <div className="stack-2">
                  {candidates.map((c) => (
                    <CandidateCard key={c.driverId + (c.tripId ?? '')} c={c} onBook={() => void book(c)} />
                  ))}
                </div>
                <button className="btn btn--ghost btn--block" onClick={reset}>Change the trip</button>
              </>
            )}
          </section>
        )}

        {stage === 'waiting' && (
          <div className="card empty rise" role="status" aria-live="polite">
            <span className="pulse-bar" aria-hidden="true" />
            <strong>Waiting for the driver to accept</strong>
            <span>They can decline, and you will be brought back to the other options.</span>
          </div>
        )}

        {stage === 'accepted' && offer && (
          <section className="card stack-2 rise">
            <span className="sign">Confirmed</span>
            <div className="fare__total data">{formatGhs(offer.farePesewas)}</div>
            <p className="spine__meta">
              {offer.quotedEtaSeconds != null && <>Arriving in about {formatEta(offer.quotedEtaSeconds)}. </>}
              Charged at drop-off, not now.
            </p>

            {/* Following the car is the app's job - the position streams, and a
                tab you have switched away from stops receiving it. Offered as a
                real control that explains itself rather than as an absence. */}
            <button className="btn btn--quiet btn--block" onClick={() => gate.open(tracking)}
                    style={{ marginTop: 'var(--sp-3)' }}>
              Follow the car
            </button>

            {/* Cancelling, by contrast, is one request and belongs on the web.
                Only once there is a trip to leave: an idle offer has no trip
                behind it and tripId is null until the driver accepts. */}
            {offer.tripId && (
              <button
                className="btn btn--ghost btn--block"
                disabled={cancelling}
                onClick={async () => {
                  setCancelling(true);
                  setError(null);
                  try {
                    await cancelSeat(offer.tripId!);
                    reset();
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Could not cancel the ride.');
                  } finally {
                    setCancelling(false);
                  }
                }}
                style={{ marginTop: 'var(--sp-2)' }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel this ride'}
              </button>
            )}

            <button className="btn btn--ghost btn--block" onClick={reset} style={{ marginTop: 'var(--sp-2)' }}>
              Book another
            </button>
          </section>
        )}

        {stage === 'declined' && (
          <div className="card empty rise">
            <strong>The driver declined</strong>
            <span>It happens — they may have just taken another rider.</span>
            <button className="btn btn--primary" onClick={() => setStage('candidates')} style={{ marginTop: 'var(--sp-3)' }}>
              See the other options
            </button>
          </div>
        )}
      </div>

      <aside className="shell__context" aria-label="Fare">
        <FarePanel quote={quote} ready={ready} />
      </aside>

      <AppOnlyDialog reason={gate.reason} onClose={gate.close} />
    </>
  );
}

function CandidateCard({ c, onBook }: { c: MatchCandidate; onBook: () => void }) {
  const taken = c.capacity - c.seatsAvailable;
  return (
    <div className="card stack-2">
      <div className="row row--between">
        <span className="sign">{c.type === 'pooled' ? 'Sharing a car' : 'Own car'}</span>
        <span className="data spine__meta">{formatEta(c.etaSeconds)} away</span>
      </div>
      <div className="row row--between">
        <Pips taken={taken} capacity={c.capacity} />
        <span className="spine__meta data">{(c.distanceMeters / 1000).toFixed(1)} km</span>
      </div>
      {c.type === 'pooled' && c.addedDetourSeconds != null && (
        // The detour is the cost this match puts on people already in the car.
        // Shown because it is the whole basis on which pooling is allowed.
        <p className="spine__meta">
          Adds about {formatEta(c.addedDetourSeconds)} for whoever is already aboard.
        </p>
      )}
      <button className="btn btn--primary btn--block" onClick={onBook}>Ask this driver</button>
    </div>
  );
}

function StopPicker({ label, nodes, value, exclude, onChange }: {
  label: string; nodes: CampusNodeRef[]; value: string; exclude: string; onChange: (v: string) => void;
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
    return <div className="card"><span className="sign">Fare</span>
      <p style={{ marginTop: 'var(--sp-2)', color: 'var(--text-muted)' }}>Working it out…</p></div>;
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
      <p className="spine__meta" style={{ marginTop: 'var(--sp-2)' }}>Charged at drop-off, not now.</p>
    </div>
  );
}
