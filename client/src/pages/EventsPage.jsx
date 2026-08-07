import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDate, requestJson } from '../api';

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('Loading event feed...');

  useEffect(() => {
    let active = true;
    requestJson('/api/events')
      .then((data) => {
        if (!active) return;
        setEvents(data.events || []);
        setStatus((data.events || []).length ? 'Browse events and open an event card to RSVP.' : 'No active events are available right now.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue to login even if the session is already cleared.
    }
    navigate('/login', { replace: true });
  }

  return (
    <div className="page-shell">
      <header className="top-strip">
        <div>
          <div className="eyebrow">RSVP Portal</div>
          <h1>Scheduled Events</h1>
          <p>Browse listings, inspect seat layouts, and confirm reservations instantly.</p>
        </div>
        <button className="secondary-btn" onClick={logout}>Log Out</button>
      </header>

      <div className="notice neutral">{status}</div>

      <div className="card-grid">
        {events.map((event) => {
          const totalSeats = event.seats?.length || event.capacity || 0;
          const bookedSeats = event.seats?.filter((seat) => seat.status === 'booked').length || event.attendees?.length || 0;
          const availableSeats = Math.max(totalSeats - bookedSeats, 0);
          const isFull = availableSeats === 0;

          return (
            <article className={`event-card ${isFull ? 'full' : ''}`} key={event._id}>
              <div className="card-header">
                <span className={`tag ${isFull ? 'warn' : 'ok'}`}>
                  {isFull ? 'Waitlist Only' : `${availableSeats} Seats Left`}
                </span>
              </div>

              <div className="card-body">
                <h2>{event.title}</h2>
                <p className="card-description">
                  {event.description || 'An exclusive RSVP hosted event.'}
                </p>
              </div>

              <div className="event-meta">
                <span>🗓️ {formatDate(event.date)}</span>
                <span>🎟️ {totalSeats} total seat slots</span>
              </div>

              <div className="card-footer">
                <Link className="primary-btn link-btn full-width" to={`/event/${event._id}`}>
                  {isFull ? 'Request Waitlist Position' : 'Examine Seating & RSVP'}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}