import { useEffect, useRef, useState } from 'react';
import { useOnline } from '../lib/useOnline';

type Phase = 'hidden' | 'offline' | 'restored';

/**
 * Says the connection is gone, and then says when it comes back.
 *
 * The copy names the state and nothing else. It used to add "we'll refresh
 * automatically when you're back", which is true but is not what the pill is
 * for - and at phone widths that sentence wrapped the pill onto two lines
 * across the top of the screen.
 *
 * What is new here is that it moves. The native banner is a bare
 * `if (online) return null`, so it pops into existence and vanishes - and an
 * element that appears from nothing reads as a glitch rather than as a
 * message. It also meant the banner could never animate out, because by the
 * time you would animate it the component had already unmounted. So the
 * element stays mounted and a data attribute drives it, which additionally
 * makes the transition interruptible: a connection that flaps retargets
 * mid-travel instead of restarting.
 */
export function OfflineBanner() {
  const online = useOnline();
  const [phase, setPhase] = useState<Phase>('hidden');
  const hasBeenOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      hasBeenOffline.current = true;
      setPhase('offline');
      return;
    }
    // Never announce a recovery that was never a loss - on a normal load the
    // first probe resolves online and there is nothing to report.
    if (!hasBeenOffline.current) {
      setPhase('hidden');
      return;
    }
    setPhase('restored');
    const t = window.setTimeout(() => setPhase('hidden'), 2200);
    return () => window.clearTimeout(t);
  }, [online]);

  const offline = phase === 'offline';

  return (
    <div
      className="offline"
      data-phase={phase}
      // Polite, not assertive: losing signal is not worth interrupting a
      // screen reader mid-sentence, and it will be read at the next pause.
      role="status"
      aria-live="polite"
      // Hidden from the tree entirely when retracted, so it is not a silent
      // focus stop sitting above the page.
      aria-hidden={phase === 'hidden'}
    >
      <div className="offline__pill">
        <span className="offline__dot" aria-hidden="true" />
        <span className="offline__text">
          {/* Just the state. The old copy also promised an automatic refresh,
              which made the pill wide enough to wrap on a phone - and the
              promise was the half nobody needed: it retries either way. */}
          {offline ? 'No connection' : 'Back online'}
        </span>
      </div>
    </div>
  );
}
