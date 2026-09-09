import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setOnSessionExpired, tokens } from './api';
import type { Driver, LoginResponse, School } from './endpoints';
import { listSchools } from './endpoints';
import { applyCampus } from './campus';

interface SessionValue {
  driver: Driver | null;
  school: School | null;
  signIn: (r: LoginResponse) => void;
  signOut: () => void;
}

const Ctx = createContext<SessionValue | null>(null);
const PROFILE_KEY = 'traverse.driver.profile';

function readDriver(): Driver | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Driver) : null;
  } catch { return null; }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(() => (tokens.access() ? readDriver() : null));
  const [school, setSchool] = useState<School | null>(null);

  const signOut = useCallback(() => {
    tokens.clear();
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
    setDriver(null);
    setSchool(null);
  }, []);

  const signIn = useCallback((res: LoginResponse) => {
    tokens.set(res.accessToken, res.refreshToken);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(res.driver)); } catch { /* ignore */ }
    setDriver(res.driver);
  }, []);

  useEffect(() => {
    setOnSessionExpired(signOut);
    return () => setOnSessionExpired(null);
  }, [signOut]);

  useEffect(() => {
    if (!driver) { setSchool(null); return; }
    let cancelled = false;
    listSchools()
      .then((schools) => {
        if (cancelled) return;
        const mine = schools.find((s) => s.id === driver.schoolId) ?? null;
        setSchool(mine);
        applyCampus(mine?.primaryColor ?? null);
      })
      .catch(() => { /* colour is a nicety; never block the app on it */ });
    return () => { cancelled = true; };
  }, [driver]);

  const value = useMemo<SessionValue>(() => ({ driver, school, signIn, signOut }), [driver, school, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
