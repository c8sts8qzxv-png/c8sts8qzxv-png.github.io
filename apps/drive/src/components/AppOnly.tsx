import { useEffect, useRef, useState } from 'react';
import {
  APP_STORE_URL, PLAY_STORE_URL, STORES_LIVE, WHATSAPP_URL,
} from '../lib/appLinks';

/**
 * The wall between what the web does and what the app does.
 *
 * It is deliberately not a disabled button. A control that is greyed out with
 * no explanation reads as broken, and the person is left guessing whether they
 * did something wrong. This says what the limit is, why it exists, and what to
 * do about it - in that order.
 *
 * The "why" is never "we withheld it". Everything gated here needs the phone to
 * be doing something continuously - holding a location, receiving a push,
 * ringing - and a browser tab that is not in front is throttled, loses wake
 * locks, and is killed at the OS's convenience. A web version of these would
 * not be a smaller feature, it would be one that silently fails at the moment
 * it matters. Saying so is both true and a better argument for the app than
 * any marketing line.
 */
export function AppOnlyDialog({ reason, onClose }: {
  reason: { title: string; why: string } | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = reason !== null;

  // Escape closes, and focus lands on the dismiss control rather than being
  // left behind the dialog on whatever was clicked.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gate__panel">
        <span className="sign">Needs the app</span>
        <h2 id="gate-title" style={{ fontSize: 'var(--t-title)' }}>{reason.title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{reason.why}</p>

        {STORES_LIVE ? (
          <div className="stack-2">
            <a className="btn btn--primary btn--block" href={APP_STORE_URL}
               target="_blank" rel="noopener noreferrer">Get it on the App Store</a>
            <a className="btn btn--quiet btn--block" href={PLAY_STORE_URL}
               target="_blank" rel="noopener noreferrer">Get it on Google Play</a>
          </div>
        ) : (
          <div className="stack-2">
            {/* Said plainly rather than hidden. A student who taps a store
                button and lands on a 404 learns not to trust the next one. */}
            <p className="gate__note">
              The app is not in the stores yet. Message us and we will send it to
              you as soon as it lands.
            </p>
            <a className="btn btn--primary btn--block" href={WHATSAPP_URL}
               target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>
          </div>
        )}

        <button ref={closeRef} type="button" className="btn btn--ghost btn--block" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}

/** The list of things the web stops short of, rendered as tappable rows. */
export function AppOnlyList({ reasons, onPick }: {
  reasons: { id: string; title: string; why: string }[];
  onPick: (r: { title: string; why: string }) => void;
}) {
  return (
    <section className="stack rise" aria-label="In the app">
      <span className="sign">In the app</span>
      <div className="stack-2">
        {reasons.map((r) => (
          <button key={r.id} type="button" className="card card--raised gate__row"
                  onClick={() => onPick(r)}>
            <span className="grow" style={{ textAlign: 'left' }}>
              <span className="spine__name">{r.title}</span>
              <span className="spine__meta" style={{ display: 'block' }}>{r.why}</span>
            </span>
            <span className="gate__chev" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** One hook so a screen can open the dialog without threading state by hand. */
export function useAppOnly() {
  const [reason, setReason] = useState<{ title: string; why: string } | null>(null);
  return {
    reason,
    open: (r: { title: string; why: string }) => setReason(r),
    close: () => setReason(null),
  };
}
