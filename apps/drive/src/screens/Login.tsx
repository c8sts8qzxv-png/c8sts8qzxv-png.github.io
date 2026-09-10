import { useEffect, useState } from 'react';
import {
  confirmEmailCode, confirmPhoneCode, getOtpChannels, requestEmailCode, requestPhoneCode,
} from '../lib/endpoints';
import type { OtpChannel } from '../lib/endpoints';
import { ApiError } from '../lib/api';
import { useSession } from '../lib/session';

type Step = 'email' | 'emailCode' | 'phone' | 'phoneCode';

const STEP_COPY: Record<Step, { sign: string; title: string; hint: string; cta: string }> = {
  email:     { sign: 'Step 1 of 2', title: 'Sign in',        hint: 'The email you registered to drive with.',                         cta: 'Send code' },
  emailCode: { sign: 'Step 1 of 2', title: 'Check email',    hint: 'Six digits, sent just now.',                 cta: 'Continue' },
  phone:     { sign: 'Step 2 of 2', title: 'Your number',    hint: 'The number riders will call.',             cta: 'Send code' },
  phoneCode: { sign: 'Step 2 of 2', title: 'Check messages', hint: 'Last step.',                                 cta: 'Sign in' },
};

export function Login() {
  const { signIn } = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which channels this deployment can deliver on. Null until asked; the
  // choice is only offered when there is genuinely more than one.
  const [channels, setChannels] = useState<OtpChannel[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOtpChannels()
      .then((r) => { if (!cancelled) setChannels(r.channels); })
      // A failure here must not block signing in: fall back to one button,
      // which sends with no preference and lets the server decide.
      .catch(() => { if (!cancelled) setChannels(['sms']); });
    return () => { cancelled = true; };
  }, []);

  const canChooseChannel = step === 'phone' && (channels ?? []).includes('whatsapp');

  const copy = STEP_COPY[step];

  async function submit(e: React.FormEvent, channel?: OtpChannel) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 'email') {
        await requestEmailCode(email.trim());
        setCode(''); setStep('emailCode');
      } else if (step === 'emailCode') {
        const { loginToken: t } = await confirmEmailCode(email.trim(), code.trim());
        setLoginToken(t); setCode(''); setStep('phone');
      } else if (step === 'phone') {
        await requestPhoneCode(loginToken, phone.trim(), channel);
        setCode(''); setStep('phoneCode');
      } else {
        signIn(await confirmPhoneCode(loginToken, phone.trim(), code.trim()));
      }
    } catch (err) {
      // Errors name what to do next, and never blame the person typing.
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const isCode = step === 'emailCode' || step === 'phoneCode';
  const value = step === 'email' ? email : step === 'phone' ? phone : code;
  const disabled = busy || value.trim().length === 0;

  return (
    <div className="auth">
      <div className="auth__card stack">
        <div className="row rise">
          <span className="brand__mark">T</span>
          <span className="brand__name">Traverse</span>
          <span className="sign badge">Driver</span>
        </div>

        <div className="stack-2 rise">
          <span className="sign">{copy.sign}</span>
          <h1 style={{ fontSize: 'var(--t-title)' }}>{copy.title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{copy.hint}</p>
        </div>

        <form className="stack rise" onSubmit={submit}>
          <div className="field">
            <label className="sign" htmlFor="login-input">
              {step === 'email' ? 'Email' : step === 'phone' ? 'Phone' : 'Code'}
            </label>
            <input
              id="login-input"
              className="field__input"
              // A new field per step, so the browser never offers the email
              // it just saved as a candidate for the phone number.
              key={step}
              type={step === 'email' ? 'email' : step === 'phone' ? 'tel' : 'text'}
              inputMode={isCode ? 'numeric' : step === 'phone' ? 'tel' : 'email'}
              autoComplete={isCode ? 'one-time-code' : step === 'phone' ? 'tel' : 'email'}
              maxLength={isCode ? 6 : undefined}
              placeholder={step === 'email' ? 'you@campus.edu.gh' : step === 'phone' ? '+233…' : '••••••'}
              value={value}
              autoFocus
              onChange={(e) => {
                const v = e.target.value;
                if (step === 'email') setEmail(v);
                else if (step === 'phone') setPhone(v);
                else setCode(v.replace(/\D/g, ''));
              }}
            />
          </div>

          {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--t-small)' }}>{error}</p>}

          {canChooseChannel ? (
            /* Asked every time, and never remembered. A stored preference goes
               stale in silence: someone who uninstalls WhatsApp would keep
               being sent codes they cannot read, from the one screen that
               gives them no way to say so. */
            <div className="stack-2">
              <button
                type="button"
                className="btn btn--primary btn--block"
                disabled={disabled}
                onClick={(e) => submit(e, 'whatsapp')}
              >
                {busy ? 'Working…' : 'Send code on WhatsApp'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--block"
                disabled={disabled}
                onClick={(e) => submit(e, 'sms')}
              >
                Send code by SMS
              </button>
            </div>
          ) : (
            <button className="btn btn--primary btn--block" disabled={disabled}>
              {busy ? 'Working…' : copy.cta}
            </button>
          )}

          {step !== 'email' && (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => { setError(null); setCode(''); setStep(step === 'emailCode' ? 'email' : step === 'phone' ? 'email' : 'phone'); }}
            >
              Back
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
