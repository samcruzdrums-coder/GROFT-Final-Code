import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

type User = { email: string };
export type AuthContextValue = { user: User; signOut: () => void; expire: () => void };
type State = { status: 'loading' } | { status: 'offline' } | { status: 'anon' } | { status: 'authed'; user: User };

const API = '/api';
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthGate>');
  return value;
}

type ApiResult = { ok: boolean; status: number; data: any };
async function call(path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, data };
}

/** Shows the sign-in / create-account screen until the visitor has a valid session. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const check = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const r = await call('/auth/me');
      setState(r.ok && r.data?.user?.email ? { status: 'authed', user: { email: r.data.user.email } } : r.status === 401 ? { status: 'anon' } : { status: 'offline' });
    } catch {
      setState({ status: 'offline' });
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const signOut = useCallback(() => {
    // Leave the app immediately; the server clears the cookie in the background.
    setState({ status: 'anon' });
    void call('/auth/logout', {}).catch(() => {});
  }, []);
  const expire = useCallback(() => setState({ status: 'anon' }), []);

  if (state.status === 'loading') return <div className="auth-screen" aria-busy="true"><p className="auth-note">Loading…</p></div>;
  if (state.status === 'offline') {
    return (
      <div className="auth-screen"><div className="auth-card">
        <h1 className="auth-title">Can’t reach the server</h1>
        <p className="auth-note">Check your connection and try again.</p>
        <button className="auth-submit" type="button" onClick={() => void check()}>Try again</button>
      </div></div>
    );
  }
  if (state.status === 'anon') return <AuthScreen onAuthed={(user) => setState({ status: 'authed', user })} />;
  return <AuthContext.Provider value={{ user: state.user, signOut, expire }}>{children}</AuthContext.Provider>;
}

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);
function loadGsi(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.accounts?.id) return resolve(w.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => resolve(w.google); s.onerror = () => reject(new Error('gsi'));
    document.head.appendChild(s);
  });
}

export function AuthScreen({ onAuthed }: { onAuthed: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailMode, setEmailMode] = useState<null | 'signup' | 'login'>(null);
  const gBtn = useRef<HTMLDivElement>(null);

  const finish = (r: ApiResult) => {
    if (r.ok && r.data?.user?.email) onAuthed({ email: r.data.user.email });
    else setError(r.data?.error?.message ?? 'Something went wrong. Please try again.');
  };
  const googleCredential = async (credential: string) => {
    setBusy(true); setError('');
    try { finish(await call('/auth/google', { credential })); }
    catch { setError('Can’t reach the server. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const googleUnavailable = () => {
    setError('Google sign-in isn’t available right now. Use your email below.');
    setEmailMode('login');
  };
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !gBtn.current) return;
    let live = true;
    loadGsi().then((g) => {
      if (!live || !gBtn.current) return;
      g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (resp: any) => void googleCredential(resp.credential) });
      g.accounts.id.renderButton(gBtn.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 300 });
    }).catch(() => setError('Google sign-in could not load. Check your connection and try again.'));
    return () => { live = false; };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !emailMode) return;
    setBusy(true); setError('');
    try { finish(await call(emailMode === 'signup' ? '/auth/signup' : '/auth/login', { email, password })); }
    catch { setError('Can’t reach the server. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const signup = emailMode === 'signup';
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img className="auth-logo" src={`${import.meta.env.BASE_URL}groft-logo.png`} alt="GROFT"/>
        <p className="auth-note">A global repository of folkloric traditions</p>
        <h1 className="auth-title">Sign in to continue</h1>
        {GOOGLE_CLIENT_ID
          ? <div ref={gBtn} className="auth-google-slot" data-testid="auth-google-slot" />
          : <button type="button" className="auth-google" onClick={googleUnavailable} data-testid="auth-google"><GoogleG /><span>Sign in with Google</span></button>}
        {error && <p className="auth-error" role="alert" data-testid="auth-error">{error}</p>}
        {!emailMode && <button type="button" className="auth-link" onClick={() => { setEmailMode('signup'); setError(''); }} data-testid="auth-email-link">Or create an account with your email</button>}
        {emailMode && (
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="auth-divider"><span>email</span></div>
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="auth-input" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} data-testid="auth-email" onChange={(e) => setEmail(e.target.value)} />
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <input id="auth-password" className="auth-input" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required maxLength={128} value={password} data-testid="auth-password" onChange={(e) => setPassword(e.target.value)} />
            {signup && <p className="auth-hint">At least 10 characters.</p>}
            <button className="auth-submit" type="submit" disabled={busy} data-testid="auth-submit">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
            <button type="button" className="auth-link" onClick={() => { setEmailMode(signup ? 'login' : 'signup'); setError(''); }}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
