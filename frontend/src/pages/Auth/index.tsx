import { useState, type FormEvent } from 'react';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import Header from '../../components/Header';
import { apiFetch } from '../../utils/api';

type Tab = 'register' | 'login' | 'verify';

// Firebase web config — safe to expose in frontend
// Fill in these values from your pinme project's auth_config
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  tenantId: import.meta.env.VITE_FIREBASE_TENANT_ID as string,
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_CONFIG.apiKey) return null;
  if (!firebaseAuth) {
    firebaseApp = initializeApp({
      apiKey: FIREBASE_CONFIG.apiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      projectId: FIREBASE_CONFIG.projectId,
    });
    firebaseAuth = getAuth(firebaseApp);
    firebaseAuth.tenantId = FIREBASE_CONFIG.tenantId;
  }
  return firebaseAuth;
}

export default function AuthDemo() {
  const [tab, setTab] = useState<Tab>('register');
  const firebaseReady = !!FIREBASE_CONFIG.apiKey;

  // register
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<string | null>(null);
  const [regError, setRegError] = useState('');

  // login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [idToken, setIdToken] = useState('');
  const [loginError, setLoginError] = useState('');

  // verify
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState('');

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    setRegResult(null);
    try {
      const resp = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword, display_name: regName }),
      });
      const data = await resp.json() as { user?: unknown; error?: string };
      if (!resp.ok || data.error) {
        setRegError(data.error ?? 'Registration failed');
      } else {
        setRegResult(JSON.stringify(data.user, null, 2));
      }
    } catch {
      setRegError('Network error');
    } finally {
      setRegLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    setIdToken('');
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setLoginError('Firebase not configured'); return; }
      const credential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const token = await credential.user.getIdToken();
      setIdToken(token);
      setVerifyToken(token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoginLoading(true);
    setLoginError('');
    setIdToken('');
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setLoginError('Firebase not configured'); return; }
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await credential.user.getIdToken();
      setIdToken(token);
      setVerifyToken(token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Google login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const resp = await apiFetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: verifyToken }),
      });
      const data = await resp.json() as { error?: string; email_not_verified?: boolean };
      if (!resp.ok || data.error) {
        setVerifyError(
          data.email_not_verified
            ? 'Email not verified — please check your inbox'
            : (data.error ?? 'Verification failed')
        );
      } else {
        setVerifyResult(JSON.stringify(data, null, 2));
      }
    } catch {
      setVerifyError('Network error');
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div className="page">
      <Header />
      <main>
        <section className="auth-hero">
          <h2>Auth Demo</h2>
          <p>Register, login, and verify tokens using Pinme Identity Platform.</p>
        </section>

        {!firebaseReady && <div className="status error">Firebase not configured — set VITE_FIREBASE_* env vars</div>}

        <div className="auth-tabs">
          {(['register', 'login', 'verify'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`auth-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'register' ? 'Register' : t === 'login' ? 'Login' : 'Verify Token'}
            </button>
          ))}
        </div>

        {tab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required disabled={regLoading} placeholder="alice@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required disabled={regLoading} placeholder="Min 8 chars" />
            </div>
            <div className="form-group">
              <label>Display Name (optional)</label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} disabled={regLoading} placeholder="Alice" />
            </div>
            {regError && <div className="status error">{regError}</div>}
            <button type="submit" className="btn-primary auth-submit" disabled={regLoading}>
              {regLoading ? 'Registering...' : 'Register'}
            </button>
            {regResult && (
              <div className="auth-result">
                <p className="auth-result-hint">User created. A verification email has been sent.</p>
                <pre>{regResult}</pre>
              </div>
            )}
          </form>
        )}

        {tab === 'login' && (
          <div className="auth-form">
            <form onSubmit={handleEmailLogin}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={loginLoading || !firebaseReady} placeholder="alice@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required disabled={loginLoading || !firebaseReady} />
              </div>
              {loginError && <div className="status error">{loginError}</div>}
              <button type="submit" className="btn-primary auth-submit" disabled={loginLoading || !firebaseReady}>
                {loginLoading ? 'Logging in...' : 'Login with Email'}
              </button>
            </form>
            <div className="auth-divider">or</div>
            <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loginLoading || !firebaseReady}>
              Login with Google
            </button>
            {idToken && (
              <div className="auth-result">
                <p className="auth-result-hint">id_token obtained — copied to Verify tab.</p>
                <pre className="token-preview">{idToken.slice(0, 80)}…</pre>
              </div>
            )}
          </div>
        )}

        {tab === 'verify' && (
          <form className="auth-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label>id_token</label>
              <textarea
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                required
                disabled={verifyLoading}
                placeholder="Paste id_token here, or login first to auto-fill"
                rows={4}
              />
            </div>
            {verifyError && <div className="status error">{verifyError}</div>}
            <button type="submit" className="btn-primary auth-submit" disabled={verifyLoading || !verifyToken.trim()}>
              {verifyLoading ? 'Verifying...' : 'Verify Token'}
            </button>
            {verifyResult && (
              <div className="auth-result">
                <p className="auth-result-hint">Token valid.</p>
                <pre>{verifyResult}</pre>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
