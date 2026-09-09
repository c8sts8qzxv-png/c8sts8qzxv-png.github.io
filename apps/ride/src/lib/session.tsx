import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setOnSessionExpired, tokens } from './api';
import type { LoginResponse, Rider, School } from './endpoints';
import { listSchools } from './endpoints';
import { applyCampus } from './campus';

interface SessionValue {
  rider: Rider | null;
  school: School | null;
  ready: boolean;
  signIn: (r: LoginResponse) => void;
  signOut: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

const RIDER_KEY = 'traverse.rider.profile';

function readRider(): Rider | null {
  try {
    const raw = localStorage.getItem(RIDER_KEY);
    return raw ? (JSON.parse(raw) as Rider) : null;
  } catch { return null; }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Restored synchronously so a reload does not flash the login screen at
  // someone who is already signed in.
  const [rider, setRider] = useState<Rider | null>(() => (tokens.access() ? readRider() : null));
  const [school, setSchool] = useState<School | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    tokens.clear();
    try { localStorage.removeItem(RIDER_KEY); } catch { /* ignore */ }
    setRider(null);
    setSchool(null);
  }, []);

  const signIn = useCallback((res: LoginResponse) => {
    tokens.set(res.accessToken, res.refreshToken);
    try { localStorage.setItem(RIDER_KEY, JSON.stringify(res.rider)); } catch { /* ignore */ }
    setRider(res.rider);
  }, []);

  // A refresh that cannot be recovered has to reach the UI, or the rider
  // sits on a screen quietly failing every request.
  useEffect(() => {
    setOnSessionExpired(signOut);
    return () => setOnSessionExpired(null);
  }, [signOut]);

  // The school carries the campus colour, so it is fetched even before the
  // rider is known - the login screen should already be in campus colours if
  // we can tell which campus this is.
  useEffect(() => {
    let cancelled = false;
    listSchools()
      .then((schools) => {
        if (cancelled) return;
        const mine = rider ? schools.find((s) => s.id === rider.schoolId) ?? null : null;
        setSchool(mine);
        applyCampus(mine?.primaryColor ?? null);
      })
      .catch(() => { /* colour is a nicety; never block the app on it */ })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [rider]);

  const value = useMemo<SessionValue>(
    () => ({ rider, school, ready, signIn, signOut }),
    [rider, school, ready, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
