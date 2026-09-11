import { useEffect, useState } from 'react';
import {
  getRegistrationChallenge, isSignedIn, listSchools, registerRider, verifyEmail, verifyPhone,
} from '../lib/endpoints';
import type { School } from '../lib/endpoints';
import { solveRegistrationChallenge } from '../lib/registrationChallenge';
import { describePhone, normalisePhone } from '../lib/phone';
import { ApiError } from '../lib/api';
import { useSession } from '../lib/session';

/**
 * Creating an account, on the web.
 *
 * The rider app has had this since the beginning; the web app never did, so a
 * student who had never used Traverse could not get an account by any route
 * that did not involve a phone. Booking on the site is not much use if you
 * cannot get in.
 *
 * Three steps, and the order is forced by the backend rather than chosen:
 *
 *   1. the form, which solves a proof-of-work and POSTs /auth/riders/register.
 *      Registering sends BOTH codes - phone and email - before it returns.
 *   2. the email code.
 *   3. the phone code.
 *
 * Whichever of 2 and 3 finishes second is the call that returns a session,
 * because completeRegistrationIfReady only issues one once both are verified.
 * So both steps check for a token rather than assuming the last one carries it.
 *
 * An earlier version of this comment said registration could not be faked with
 * the OTP login flow, because login supposedly refused an unverified account.
 * That was wrong - confirmPhoneLogin stamps the two verified timestamps itself
 * and hands back a session. This screen exists for the simpler reason: you
 * cannot sign in as an account that has never been created.
 */

type Step = 'form' | 'email' | 'phone';

/** The minimum the backend enforces (MINIMUM_ACCOUNT_AGE_YEARS). Checked here
 *  too so somebody is told before they fill in everything else, not after. */
const MIN_AGE = 16;

function isOldEnough(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  const turned = new Date(dob.getFullYear() + MIN_AGE, dob.getMonth(), dob.getDate());
  return turned <= now;
}

export function Register({ onBack }: { onBack: () => void }) {
  const { signIn } = useSession();

  const [step, setStep] = useState<Step>('form');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [terms, setTerms] = useState(false);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSchools()
      // Every school the API returns. There is no "live" flag on the School
      // type, and inventing a client-side filter for one would quietly hide
      // campuses the backend considers open.
      .then((s) => {
        if (cancelled) return;
        setSchools(s);
        // While Traverse runs on one campus there is nothing to choose, so the
        // question is not asked - it is answered. The picker reappears on its
        // own the moment a second campus is added, with both in it, because
        // this is driven by what the API returns rather than by a flag
        // somebody has to remember to flip.
        if (s.length === 1) setSchoolId(s[0].id);
      })
      .catch(() => { if (!cancelled) setError('Could not load the campus list.'); });
    return () => { cancelled = true; };
  }, []);

  // Shown only when there is genuinely a choice to make.
  const mustPickCampus = schools.length > 1;

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const formReady =
    schoolId && firstName.trim() && lastName.trim() && email.trim()
    && normalisePhone(phone).length >= 8 && dob && terms;

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formReady) return;
    if (!isOldEnough(dob)) {
      setError(`You have to be at least ${MIN_AGE} to use Traverse.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Named, because solving the puzzle is the one step with a visible pause
      // and an unexplained freeze reads as a hang.
      setStatus('Securing your registration…');
      const { challenge, difficulty } = await getRegistrationChallenge();
      const solution = await solveRegistrationChallenge(challenge, difficulty);
      setStatus(null);
      await registerRider({
        schoolId,
        fullName: fullName.trim(),
        // Normalised here, and by the same function the sign-in screen uses.
        // The API stores the string it is given and compares it exactly on
        // login, so the two screens agreeing is what keeps an account
        // reachable - see lib/phone.ts.
        phone: normalisePhone(phone),
        email: email.trim(),
        dateOfBirth: dob,
        acceptedTerms: true,
        challenge,
        solution,
      });
      setCode('');
      setStep('email');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the account. Try again.');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = step === 'email'
        ? await verifyEmail(email.trim(), code.trim())
        : await verifyPhone(normalisePhone(phone), code.trim());
      // Either step can be the one that completes the pair.
      if (isSignedIn(result)) { signIn(result); return; }
      setCode('');
      setStep(step === 'email' ? 'phone' : 'email');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (step !== 'form') {
    const onEmail = step === 'email';
    return (
      <div className="auth">
        <div className="auth__card stack">
          <div className="stack-2 rise">
            <span className="sign">{onEmail ? 'Step 2 of 3' : 'Step 3 of 3'}</span>
            <h1 style={{ fontSize: 'var(--t-title)' }}>{onEmail ? 'Check your email' : 'Check your messages'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Six digits, sent to {onEmail ? email.trim() : normalisePhone(phone)}.
            </p>
          </div>
          <form className="stack rise" onSubmit={submitCode}>
            <div className="field">
              <label className="sign" htmlFor="reg-code">Code</label>
              <input
                id="reg-code"
                className="field__input"
                key={step}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--t-small)' }}>{error}</p>}
            <button className="btn btn--primary btn--block" disabled={busy || code.trim().length === 0}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__card stack">
        <div className="row rise">
          <span className="brand__mark">T</span>
          <span className="brand__name">Traverse</span>
        </div>

        <div className="stack-2 rise">
          <span className="sign">Step 1 of 3</span>
          <h1 style={{ fontSize: 'var(--t-title)' }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)' }}>Your name, and how a driver reaches you.</p>
        </div>

        <form className="stack rise" onSubmit={submitForm}>
          {/* Asked only when there is more than one campus to pick from. With
              one, it is filled in silently; the picker returns by itself when
              a second campus is added, carrying both. */}
          {mustPickCampus && (
            <div className="field">
              <label className="sign" htmlFor="reg-school">Campus</label>
              <select id="reg-school" className="field__input" value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">Select your campus</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="reg__row">
            <div className="field">
              <label className="sign" htmlFor="reg-first">First name</label>
              <input id="reg-first" className="field__input" autoComplete="given-name"
                     value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label className="sign" htmlFor="reg-last">Last name</label>
              <input id="reg-last" className="field__input" autoComplete="family-name"
                     value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="field">
            {/* Any address. Nothing in the API requires a campus domain - that
                was the site's own copy, not a rule - and insisting on one
                would lock out every student whose school does not issue
                addresses, which is most of them. */}
            <label className="sign" htmlFor="reg-email">Email</label>
            <input id="reg-email" className="field__input" type="email" inputMode="email"
                   autoComplete="email" placeholder="you@example.com"
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field">
            <label className="sign" htmlFor="reg-phone">Phone</label>
            {/* No country-code placeholder. People type 024 123 4567, and the
                conversion happens here rather than being demanded of them. */}
            <input id="reg-phone" className="field__input" type="tel" inputMode="tel"
                   autoComplete="tel" placeholder="024 123 4567"
                   value={phone} onChange={(e) => setPhone(e.target.value)} />
            {describePhone(phone) && (
              <span className="field__hint">{describePhone(phone)}</span>
            )}
          </div>

          <div className="field">
            <label className="sign" htmlFor="reg-dob">Date of birth</label>
            <input id="reg-dob" className="field__input" type="date"
                   max={new Date().toISOString().slice(0, 10)}
                   value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          {/* An unticked box is refused by the DTO itself (@Equals(true)), and
              the acceptance timestamp is stamped server-side - never taken from
              here - so this cannot be forged by editing the request. */}
          <label className="reg__terms">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>I accept the Terms of Service and the Privacy Policy.</span>
          </label>

          {status && <p className="spine__meta" role="status">{status}</p>}
          {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--t-small)' }}>{error}</p>}

          <button className="btn btn--primary btn--block" disabled={busy || !formReady}>
            {busy ? 'Working…' : 'Create account'}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={onBack}>
            I already have an account
          </button>
        </form>
      </div>
    </div>
  );
}
