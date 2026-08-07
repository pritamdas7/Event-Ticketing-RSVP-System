import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestJson } from '../api';
import { useSession } from '../session';

export default function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('attendee');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session.loading && session.authenticated) {
      navigate(session.role === 'organizer' ? '/organizer' : '/events', { replace: true });
    }
  }, [session.loading, session.authenticated, session.role, navigate]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const payload = { username, password, role };

      // Append signup-specific fields
      if (mode === 'signup') {
        payload.email = email;
        if (role === 'organizer') payload.inviteCode = inviteCode;
      }

      const data = await requestJson(mode === 'login' ? '/login' : '/signup', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      navigate(data.redirect || (data.role === 'organizer' ? '/organizer' : '/events'), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (session.loading) {
    return <div className="page-shell centered-shell"><div className="loading-panel">Preparing portal...</div></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-copy">
          <h1>{mode === 'login' ? 'Sign in to your portal' : 'Create a secure account'}</h1>
          <p>Your gateway to seamless RSVPs and event management.</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={30}
              required
            />
          </label>

          {mode === 'signup' && (
            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label>
            Account Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="attendee">Attendee</option>
              <option value="organizer">Organizer</option>
            </select>
          </label>

          {mode === 'signup' && role === 'organizer' && (
            <label>
              Organizer Invite Token
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ORG-XXXX-XXXX"
                required
              />
            </label>
          )}

          {error && <div className="notice error">{error}</div>}

          <button className="primary-btn" type="submit" disabled={busy}>
            {busy ? 'Processing...' : mode === 'login' ? 'Authenticate' : 'Register Account'}
          </button>

          <button
            type="button"
            className="ghost-btn"
            onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}