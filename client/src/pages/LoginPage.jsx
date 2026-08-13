import { useState } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { login } from '../services/api';

export default function LoginPage({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <p>Sign in to your smartsearch account.</p>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="auth-spinner" size={16} /> : <LockKeyhole size={16} />}
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
