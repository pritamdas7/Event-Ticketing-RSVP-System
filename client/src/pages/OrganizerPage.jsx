import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { formatDate, requestJson } from '../api';

function MetricCard({ label, value, badge, subtext }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <strong>{label}</strong>
        {badge && <span className="metric-badge">{badge}</span>}
      </div>
      <span className="metric-value">{value}</span>
      {subtext && <p className="metric-subtext">{subtext}</p>}
    </div>
  );
}

export default function OrganizerPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [rows, setRows] = useState('4');
  const [cols, setCols] = useState('6');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [seatMap, setSeatMap] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  // Delete Confirmation Modal State
  const [deletingEventId, setDeletingEventId] = useState(null);

  // Tier Pricing State
  const [generalPrice, setGeneralPrice] = useState('10');
  const [vipPrice, setVipPrice] = useState('20');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  // Ticket Verification & Scanner State
  const [ticketTokenInput, setTicketTokenInput] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  // Invite Token Management State
  const [inviteCodes, setInviteCodes] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');

  async function loadDashboard() {
    const [analyticsData, eventData, codesData] = await Promise.all([
      requestJson('/api/organizer/analytics'),
      requestJson('/api/organizer/events'),
      requestJson('/api/invite-codes').catch(() => ({ codes: [] }))
    ]);
    setAnalytics(analyticsData.metrics || null);
    setEvents(eventData.events || []);
    setInviteCodes(codesData.codes || []);
  }

  useEffect(() => {
    loadDashboard().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    let scanner = null;
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          await processTokenVerification(decodedText);
          setShowCamera(false);
          scanner.clear().catch(() => { });
        },
        () => { }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => { });
      }
    };
  }, [showCamera]);

  async function processTokenVerification(token) {
    if (!token) return;
    try {
      const data = await requestJson('/api/events/verify-ticket', {
        method: 'POST',
        body: JSON.stringify({ qrCodeToken: token })
      });
      setScanResult(`✓ ${data.message}`);
      setTicketTokenInput('');
      await loadDashboard();
    } catch (error) {
      setScanResult(`⚠️ ${error.message}`);
    }
  }

  async function logout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } catch (error) { }
    navigate('/login', { replace: true });
  }

  async function verifyTicketToken(e) {
    e.preventDefault();
    await processTokenVerification(ticketTokenInput);
  }

  // Token Management Actions
  async function generateNewToken() {
    setBusy(true);
    try {
      const data = await requestJson('/api/invite-codes/generate', { method: 'POST' });
      setGeneratedCode(data.code);
      setStatus(`New organizer token generated: ${data.code}`);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTokenState(id) {
    try {
      await requestJson(`/api/invite-codes/${id}/toggle`, { method: 'PATCH' });
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    }
  }

  // Confirmed Delete Execution
  async function confirmDeleteEvent() {
    if (!deletingEventId) return;
    setBusy(true);
    try {
      const data = await requestJson(`/api/events/${deletingEventId}`, { method: 'DELETE' });
      setStatus(data.message || 'Event deleted successfully.');
      setDeletingEventId(null);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  function buildGrid() {
    const rowCount = Math.max(Number.parseInt(rows, 10) || 0, 1);
    const colCount = Math.max(Number.parseInt(cols, 10) || 0, 1);
    const genVal = Number(generalPrice) || 10;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextSeatMap = [];
    for (let row = 0; row < rowCount; row += 1) {
      for (let col = 1; col <= colCount; col += 1) {
        nextSeatMap.push({
          id: `${alphabet[row] || `R${row + 1}`}${col}`,
          type: 'general',
          price: genVal,
          status: 'available'
        });
      }
    }
    setSeatMap(nextSeatMap);
    setStatus(`Generated ${rowCount} × ${colCount} matrix. Standard seats: $${genVal}.`);
  }

  function toggleSeatType(seatId) {
    const genVal = Number(generalPrice) || 10;
    const vipVal = Number(vipPrice) || 20;

    setSeatMap((current) =>
      current.map((seat) => {
        if (seat.id === seatId) {
          const newType = seat.type === 'general' ? 'vip' : 'general';
          return {
            ...seat,
            type: newType,
            price: newType === 'vip' ? vipVal : genVal
          };
        }
        return seat;
      })
    );
  }

  async function publishEvent() {
    if (!title || !date || seatMap.length === 0) {
      setStatus('Please provide an event title, date, and configure a seating map.');
      return;
    }
    setBusy(true);

    const couponsPayload = (couponCode && discountPercent) ? [{
      code: couponCode.trim().toUpperCase(),
      discountPercent: Number(discountPercent)
    }] : [];

    try {
      await requestJson('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: 'An exclusive RSVP hosted event.',
          date,
          seats: seatMap,
          coupons: couponsPayload
        })
      });

      setTitle('');
      setDate('');
      setSeatMap([]);
      setCouponCode('');
      setDiscountPercent('');
      setStatus('Event successfully created and published to feed.');
      setSection('overview');
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(eventItem) {
    setEditingEvent(eventItem);
    setEditTitle(eventItem.title);
    setEditDate(new Date(eventItem.date).toISOString().slice(0, 16));
  }

  async function saveEdit() {
    if (!editingEvent) return;
    setBusy(true);
    try {
      await requestJson(`/api/events/${editingEvent._id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle, date: editDate })
      });
      setEditingEvent(null);
      setStatus('Event parameters updated successfully.');
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span> RSVP Admin
        </div>

        <nav className="sidebar-nav">
          <button
            className={section === 'overview' ? 'sidebar-item active' : 'sidebar-item'}
            onClick={() => { setSection('overview'); setStatus(''); }}
          >
            <span className="icon">📊</span> Overview & Analytics
          </button>

          <button
            className={section === 'create' ? 'sidebar-item active' : 'sidebar-item'}
            onClick={() => { setSection('create'); setStatus(''); }}
          >
            <span className="icon">🛠️</span> Event Architect
          </button>

          <button
            className={section === 'tokens' ? 'sidebar-item active' : 'sidebar-item'}
            onClick={() => { setSection('tokens'); setStatus(''); }}
          >
            <span className="icon">🔑</span> Organizer Tokens
          </button>
        </nav>

        <button className="sidebar-item danger" onClick={logout}>
          <span className="icon">🔒</span> Secure Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <div className="eyebrow">Organizer Portal</div>
            <h1>
              {section === 'overview' && 'Operational Overview'}
              {section === 'create' && 'Create Event'}
              {section === 'tokens' && 'Manage Organizer Access Tokens'}
            </h1>
            <p>
              {section === 'overview' && 'Manage active inventory, monitor real-time tier utilization, and evaluate revenue.'}
              {section === 'create' && 'Configure seat maps, tier prices, discount coupons, and publish listings.'}
              {section === 'tokens' && 'Generate and manage invite tokens to allow team members to sign up as organizers.'}
            </p>
          </div>
        </header>

        {status && (
          <div className={`notice ${status.toLowerCase().includes('error') || status.toLowerCase().includes('please') ? 'error' : 'neutral'}`}>
            {status}
          </div>
        )}

        {section === 'overview' && (
          <>
            <div className="metric-strip">
              <MetricCard
                label="Hosted Events"
                value={analytics?.eventsCount || 0}
                subtext="Total active event listings"
              />
              <MetricCard
                label="Total Revenue"
                value={`$${analytics?.totalRevenue || 0}`}
                badge="Finance"
                subtext="Gross sales across all events"
              />
              <MetricCard
                label="VIP Utilization"
                value={`${analytics?.vipStats?.booked || 0} / ${analytics?.vipStats?.total || 0}`}
                badge="VIP"
                subtext="Premium allocated capacity"
              />
              <MetricCard
                label="General Utilization"
                value={`${analytics?.generalStats?.booked || 0} / ${analytics?.generalStats?.total || 0}`}
                badge="GA"
                subtext="Standard hall capacity"
              />
            </div>

            <div className="builder-panel" style={{ marginBottom: '32px' }}>
              <h2>Ticket Verification & Check-In</h2>
              <form onSubmit={verifyTicketToken} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={ticketTokenInput}
                  onChange={(e) => setTicketTokenInput(e.target.value)}
                  placeholder="Scan or enter Ticket QR Token string (e.g. TICKET-...)"
                  style={{ flex: '1', minWidth: '280px' }}
                />
                <button type="submit" className="primary-btn">Verify Ticket</button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCamera((prev) => !prev)}
                >
                  {showCamera ? 'Close Camera' : '📷 Scan with Camera'}
                </button>
              </form>

              {showCamera && (
                <div style={{ marginTop: '20px', maxWidth: '400px' }}>
                  <div id="qr-reader"></div>
                </div>
              )}

              {scanResult && (
                <div style={{ marginTop: '10px', fontWeight: 'bold', color: scanResult.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>
                  {scanResult}
                </div>
              )}
            </div>

            <div className="section-header">
              <h2>Active Event Inventory</h2>
              <button className="secondary-btn" onClick={() => { setSection('create'); setStatus(''); }}>
                + Add New Event
              </button>
            </div>

            <div className="card-grid organizer-grid">
              {events.map((event) => {
                const totalSeats = event.seats?.length || event.capacity || 0;
                const bookedSeats = event.seats?.filter((seat) => seat.status === 'booked').length || event.attendees?.length || 0;
                const percentFull = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

                return (
                  <article className="event-card organizer-card" key={event._id}>
                    <div className="card-top">
                      <h2>{event.title}</h2>
                      <span className="capacity-badge">{percentFull}% Capacity</span>
                    </div>
                    <div className="event-meta">
                      <span>🗓️ {formatDate(event.date)}</span>
                      <span>🎟️ {bookedSeats} of {totalSeats} seats booked</span>
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>💰 Generated Revenue: ${event.revenue || 0}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={() => startEdit(event)}>
                        Edit Metadata
                      </button>
                      <button
                        className="secondary-btn danger"
                        style={{ padding: '8px 16px' }}
                        onClick={() => setDeletingEventId(event._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {section === 'create' && (
          <section className="builder-panel">
            <h2>Configure Event & Seating Map</h2>

            <div className="builder-row">
              <label>
                Event Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Annual Tech Summit 2026"
                />
              </label>

              <label>
                Schedule Date & Time
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="builder-row">
              <label>
                Grid Rows
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                />
              </label>

              <label>
                Grid Columns
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cols}
                  onChange={(e) => setCols(e.target.value)}
                />
              </label>
            </div>

            <div className="builder-row">
              <label>
                General Admission Seat Price ($)
                <input
                  type="number"
                  min="1"
                  value={generalPrice}
                  onChange={(e) => setGeneralPrice(e.target.value)}
                  placeholder="e.g. 10"
                />
              </label>

              <label>
                VIP Seat Price ($)
                <input
                  type="number"
                  min="1"
                  value={vipPrice}
                  onChange={(e) => setVipPrice(e.target.value)}
                  placeholder="e.g. 20"
                />
              </label>
            </div>

            <div className="builder-row">
              <label>
                Promotional Coupon Code (Optional)
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g., SAVE20"
                />
              </label>

              <label>
                Discount Percentage (Optional)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g., 20"
                />
              </label>
            </div>

            <div className="button-row">
              <button className="secondary-btn" onClick={buildGrid}>
                Build Coordinate Grid
              </button>

              <button className="primary-btn" onClick={publishEvent} disabled={busy || seatMap.length === 0}>
                {busy ? 'Publishing...' : 'Publish Event to Database'}
              </button>
            </div>

            {seatMap.length > 0 && (
              <div className="map-builder-container">
                <div className="map-legend-bar">
                  <span className="legend-title">Interactive Map Controls:</span>
                  <div className="legend-items">
                    <span className="legend-item general">● General Tier (${generalPrice || 10})</span>
                    <span className="legend-item vip">● VIP Tier (${vipPrice || 20})</span>
                  </div>
                  <small>Click any seat unit below to toggle its tier and price.</small>
                </div>

                <div className="seat-grid-shell">
                  <div
                    className="seat-grid builder-grid"
                    style={{ '--grid-cols': Math.max(Number.parseInt(cols, 10) || 1, 1) }}
                  >
                    {seatMap.map((seat) => (
                      <button
                        type="button"
                        key={seat.id}
                        className={`seat-chip ${seat.type}`}
                        onClick={() => toggleSeatType(seat.id)}
                      >
                        {seat.id} (${seat.price})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Organizer Token Management Section */}
        {section === 'tokens' && (
          <section className="builder-panel">
            <h2>Generate & Manage Invite Tokens</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '-12px 0 16px 0' }}>
              Create invite tokens to allow new organizers to sign up. Provide one of these tokens to new team members during account registration.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <button className="primary-btn" onClick={generateNewToken} disabled={busy}>
                {busy ? 'Generating...' : '+ Generate New Invite Token'}
              </button>

              {generatedCode && (
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'block' }}>Newly Generated Token:</span>
                  <strong style={{ fontSize: '1.4rem', color: 'var(--success)', letterSpacing: '1px' }}>{generatedCode}</strong>
                </div>
              )}
            </div>

            <h3>Active Token Registry</h3>
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              {inviteCodes.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No invite tokens created yet.</div>
              ) : (
                inviteCodes.map((token) => (
                  <div
                    key={token._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>{token.code}</strong>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginTop: '2px' }}>
                        Created: {new Date(token.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`tag ${token.isActive ? 'ok' : 'warn'}`}>
                        {token.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        className="secondary-btn"
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => toggleTokenState(token._id)}
                      >
                        {token.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="modal-backdrop" onClick={() => setEditingEvent(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Modify Event Parameters</h2>
              <button className="close-btn" onClick={() => setEditingEvent(null)}>✕</button>
            </div>

            <label>
              Event Title
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </label>

            <label>
              Event Date & Time
              <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </label>

            <div className="button-row" style={{ marginTop: '10px' }}>
              <button className="secondary-btn" onClick={() => setEditingEvent(null)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={saveEdit} disabled={busy}>
                {busy ? 'Saving...' : 'Save Modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Popup Modal */}
      {deletingEventId && (
        <div className="modal-backdrop" onClick={() => setDeletingEventId(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
              <h2 style={{ color: 'var(--danger)' }}>Confirm Deletion</h2>
              <button className="close-btn" onClick={() => setDeletingEventId(null)} style={{ position: 'absolute', right: 0 }}>✕</button>
            </div>

            <p style={{ color: 'var(--muted)', margin: '10px 0 20px 0' }}>
              Are you sure you want to permanently delete this event? All associated bookings, attendee data, and generated revenues will be removed.
            </p>

            <div className="button-row" style={{ justifyContent: 'center', gap: '12px' }}>
              <button className="secondary-btn" onClick={() => setDeletingEventId(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="primary-btn danger" onClick={confirmDeleteEvent} disabled={busy} style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}>
                {busy ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}