import { useState } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import GoogleOAuthButton from '../components/GoogleOAuthButton';
import { googleAuth, login } from '../services/api';

export default function LoginPage({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await login({ email, password });
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth(idToken) {
    setError('');
    setIsGoogleSubmitting(true);

    try {
      const session = await googleAuth(idToken);
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message || 'Unable to continue with Google. Please try again.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to search
        </button>

        <div className="auth-heading">
          <div className="auth-icon" aria-hidden="true"><LockKeyhole size={18} /></div>
          <p className="auth-kicker">Account</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in or sign up with Google to access your smartsearch account.</p>
        </div>

        <div className="auth-google-block">
          <GoogleOAuthButton
            disabled={isSubmitting || isGoogleSubmitting}
            onToken={handleGoogleAuth}
            onError={setError}
          />
          {isGoogleSubmitting && (
            <p className="auth-google-loading">
              <LoaderCircle className="auth-spinner" size={14} />
              Connecting to Google...
            </p>
          )}
        </div>

        <div className="auth-divider" aria-hidden="true">
          <span>or use email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-wrap">
              <Mail size={16} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input-wrap">
              <LockKeyhole size={16} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isSubmitting || isGoogleSubmitting}
              />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting || isGoogleSubmitting}>
            {isSubmitting ? <LoaderCircle className="auth-spinner" size={16} /> : <LockKeyhole size={16} />}
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
