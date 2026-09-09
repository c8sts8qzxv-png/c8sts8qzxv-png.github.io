import { useCallback, useEffect, useState } from 'react';
import {
  getShiftStatus, getStatus, goOffline, goOnline, listNodes, listTrips, setCurrentNode,
  startTrip, completeTrip,
} from '../lib/endpoints';
import type { CampusNodeRef, TripListItem } from '../lib/endpoints';
import { useSession } from '../lib/session';
import { formatGhs } from '../lib/format';

function hoursMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function Duty() {
  const { driver, school } = useSession();
  const [online, setOnline] = useState<boolean | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [nodes, setNodes] = useState<CampusNodeRef[]>([]);
  const [currentNode, setNode] = useState('');
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [status, shift] = await Promise.all([getStatus(), getShiftStatus()]);
      setOnline(status.online);
      setMinutes(shift.onDutyMinutes);
      setNode(status.currentNodeId ?? '');
    } catch {
      setError('Could not reach Traverse.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!driver) return;
    listNodes(driver.schoolId).then(setNodes).catch(() => { /* picker stays empty */ });
    listTrips().then(setTrips).catch(() => setTrips([]));
  }, [driver]);

  // Only while on duty. Polling an off-duty driver's shift clock spends
  // their data to watch a number that cannot change.
  useEffect(() => {
    if (!online) return;
    const t = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(t);
  }, [online, refresh]);

  async function toggleDuty() {
    setBusy(true);
    setError(null);
    try {
      // Ending a shift is never refused and never questioned - there is no
      // confirmation step here on purpose. A driver who wants to stop
      // driving has already decided, and a dialog between them and stopping
      // is the app arguing with someone who may have a reason it cannot see.
      if (online) { await goOffline(); setOnline(false); }
      else { await goOnline(); setOnline(true); }
      await refresh();
    } catch {
      setError(online ? 'Could not end the shift. Try again.' : 'Could not go on duty. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function pickNode(id: string) {
    setNode(id);
    try { await setCurrentNode(id); } catch { /* position is advisory while idle */ }
  }

  const active = trips.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  return (
    <>
      <div className="shell__inner">
        <header className="stack-2 rise">
          <span className="sign">{school?.alias ?? school?.code ?? 'Campus'}</span>
          <h1 style={{ fontSize: 'var(--t-title)' }}>{driver?.fullName ?? 'Driver'}</h1>
        </header>

        {error && <p className="card" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}

        <section className="duty stack rise" data-on={online ? 'true' : 'false'} aria-live="polite">
          <span className="sign">Shift</span>
          <div className="duty__state">{online === null ? '…' : online ? 'On duty' : 'Off duty'}</div>
          {online && (
            <span className="duty__live">
              <span className="duty__beacon" aria-hidden="true" />
              <span>Taking requests · <span className="data">{hoursMinutes(minutes)}</span> on duty</span>
            </span>
          )}
          {!online && online !== null && (
            <span className="spine__meta">You will not receive ride requests while off duty.</span>
          )}
          <button
            className={online ? 'btn btn--ghost btn--block' : 'btn btn--primary btn--block'}
            onClick={toggleDuty}
            disabled={busy || online === null}
          >
            {busy ? 'Working…' : online ? 'End shift' : 'Go on duty'}
          </button>
        </section>

        {online && (
          <section className="stack rise" aria-label="Where you are">
            <span className="sign">Where you are</span>
            <div className="field">
              <label className="sign" htmlFor="node">Current stop</label>
              <select id="node" className="field__input" value={currentNode} onChange={(e) => void pickNode(e.target.value)}>
                <option value="">Not set</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <p className="spine__meta">
              Only used while you are idle — during a trip your position comes from the route itself.
            </p>
          </section>
        )}

        <section className="stack rise" aria-label="Your trips">
          <span className="sign">Trips</span>
          {active.length === 0 && (
            <div className="empty card">
              <strong>{online ? 'Waiting for requests' : 'Nothing running'}</strong>
              <span>{online ? 'You will be offered rides that suit where you are.' : 'Go on duty to start receiving requests.'}</span>
            </div>
          )}
          <div className="stack-2">
            {active.map((t) => (
              <TripRow key={t.id} trip={t} onChanged={(next) => setTrips((prev) => prev.map((p) => (p.id === next.id ? next : p)))} />
            ))}
          </div>
        </section>
      </div>

      <aside className="shell__context" aria-label="Shift summary">
        <div className="card stack-2">
          <span className="sign">Right now</span>
          <div className="metric">
            <span className="metric__value">{online === null ? '…' : online ? 'On duty' : 'Off duty'}</span>
            <span className="spine__meta">{online ? `${hoursMinutes(minutes)} on duty` : 'Not receiving requests'}</span>
          </div>
          <div className="metric" style={{ marginTop: 'var(--sp-3)' }}>
            <span className="metric__value data">{active.length}</span>
            <span className="spine__meta">{active.length === 1 ? 'trip running' : 'trips running'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function TripRow({ trip, onChanged }: { trip: TripListItem; onChanged: (t: TripListItem) => void }) {
  const [busy, setBusy] = useState(false);
  const canStart = trip.status === 'matched' || trip.status === 'scheduled' || trip.status === 'pending';
  const canComplete = trip.status === 'in_progress' || trip.status === 'started';

  async function act(fn: (id: string) => Promise<TripListItem>) {
    setBusy(true);
    try { onChanged(await fn(trip.id)); } catch { /* surfaced by the row not changing */ }
    finally { setBusy(false); }
  }

  return (
    <div className="card stack-2">
      <div className="row row--between">
        <span className="sign">{trip.tier}</span>
        <span className="data spine__meta">{formatGhs(trip.farePerRiderPesewas)} / rider</span>
      </div>
      <div className="row row--between">
        <span className="spine__name">{trip.status.replace(/_/g, ' ')}</span>
        <span className="data spine__meta">{trip.capacity} seats</span>
      </div>
      {(canStart || canComplete) && (
        <button
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void act(canStart ? startTrip : completeTrip)}
        >
          {busy ? 'Working…' : canStart ? 'Start trip' : 'Complete trip'}
        </button>
      )}
    </div>
  );
}
