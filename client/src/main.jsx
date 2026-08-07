// client/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import OrganizerPage from './pages/OrganizerPage';
import { useSession } from './session';
import './styles.css';

// Fallback to test key if env variable is undefined
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51U1gGIELh9mhPYjE9TetfWEX51VxEYc6QXye2PWlyGunaFLapj9DFXurTKNNWNBGGFjxobcG5pifGeV07q9mdlST009tS8ryb2';
const stripePromise = loadStripe(STRIPE_KEY);

function ProtectedRoute({ role }) {
  const session = useSession();
  if (session.loading) {
    return <div className="page-shell centered-shell"><div className="loading-panel">Checking access...</div></div>;
  }
  if (!session.authenticated || (role && session.role !== role)) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute role="attendee" />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/event/:eventId" element={<EventDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute role="organizer" />}>
          <Route path="/organizer" element={<OrganizerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
      <AppRouter />
    </Elements>
  </React.StrictMode>
);