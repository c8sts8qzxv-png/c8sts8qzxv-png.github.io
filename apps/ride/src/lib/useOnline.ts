import { useEffect, useState } from 'react';
import { API_BASE_URL } from './api';

/**
 * Whether Traverse is actually reachable.
 *
 * `navigator.onLine` alone is not the answer and the native app already
 * learned why: being attached to a network is not the same as being able to
 * reach anything. A campus wifi that has stopped forwarding, a captive
 * portal, an exhausted data bundle - all three report online. So the browser
 * events are used for the fast edge (they fire immediately, which no poll
 * can match) and a probe of our own /health decides the truth.
 *
 * `false` is only ever set by a failed probe, never by the event alone,
 * because a wrong "offline" is the expensive direction: it tells a rider
 * their booking will not work while it demonstrably would.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function probe() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    // Long while healthy, short after a failure: there is no value in
    // re-probing a working connection often, and every value in noticing
    // recovery quickly.
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await probe();
        schedule();
      }, online ? 60_000 : 5_000);
    }

    const onOffline = () => setOnline(false);   // trustworthy: the OS knows the link dropped
    const onOnlineEvent = () => { void probe(); }; // not trustworthy on its own: verify

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnlineEvent);
    void probe();
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnlineEvent);
    };
  }, [online]);

  return online;
}
