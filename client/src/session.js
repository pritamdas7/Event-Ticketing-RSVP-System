import { useEffect, useState } from 'react';
import { requestJson } from './api';

export function useSession() {
  const [state, setState] = useState({ loading: true, authenticated: false, role: null });

  useEffect(() => {
    let active = true;

    requestJson('/api/auth/status')
      .then((data) => {
        if (!active) return;
        setState({
          loading: false,
          authenticated: Boolean(data.authenticated),
          role: data.role || null
        });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, authenticated: false, role: null });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
