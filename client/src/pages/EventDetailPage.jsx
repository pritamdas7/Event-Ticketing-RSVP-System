import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { formatDate, requestJson, seatCount } from '../api';

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const stripe = useStripe();
  const elements = useElements();

  const [eventData, setEventData] = useState(null);
  const [selectedTier, setSelectedTier] = useState('vip');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [status, setStatus] = useState('Loading event details...');
  const [busy, setBusy] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  async function loadEvent() {
    const data = await requestJson('/api/events');
    const currentEvent = (data.events || []).find((item) => item._id === eventId);
    if (!currentEvent) {
      throw new Error('Requested event scheduling does not exist.');
    }
    setEventData(currentEvent);
    setSelectedSeat('');
    setStatus('Ready to process reservation transaction.');
  }

  useEffect(() => {
    let active = true;
    requestJson('/api/events')
      .then((data) => {
        if (!active) return;
        const currentEvent = (data.events || []).find((item) => item._id === eventId);
        if (!currentEvent) {
          setEventData(null);
          setStatus('Requested event scheduling does not exist.');
          return;
        }
        setEventData(currentEvent);
        setStatus('Ready to process reservation transaction.');

        // Auto-switch tier selection if VIP is full on load
        const vipAvailable = (currentEvent.seats || []).some(s => s.type === 'vip' && s.status === 'available');
        const generalAvailable = (currentEvent.seats || []).some(s => s.type === 'general' && s.status === 'available');

        if (!vipAvailable && generalAvailable) {
          setSelectedTier('general');
        } else if (!vipAvailable && !generalAvailable) {
          setSelectedTier('waitlist');
        }
      })
      .catch((error) => {
        if (!active) return;
        setStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (selectedTier === 'waitlist') {
      setSelectedSeat('');
    }
  }, [selectedTier]);

  async function applyCoupon() {
    if (!couponCode) return;
    try {
      const data = await requestJson(`/api/events/${eventId}/apply-coupon`, {
        method: 'POST',
        body: JSON.stringify({ couponCode })
      });
      setDiscountPercent(data.discountPercent);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  const seats = eventData?.seats || [];
  const columns = seatCount(seats);
  const selectedSeatObj = seats.find(s => s.id === selectedSeat);

  // Seat Availability Guards
  const isVipFull = seats.filter(s => s.type === 'vip' && s.status === 'available').length === 0;
  const isGeneralFull = seats.filter(s => s.type === 'general' && s.status === 'available').length === 0;
  const isFullyBooked = isVipFull && isGeneralFull;

  // Dynamic price calculation
  const rawPrice = selectedSeatObj ? (selectedSeatObj.price || 10) : (selectedTier === 'vip' ? 20 : 10);
  const discountedPrice = (rawPrice * (1 - discountPercent / 100)).toFixed(2);

  async function submitRsvp() {
    if (!eventData) return;
    if (selectedTier !== 'waitlist' && !selectedSeat) {
      setStatus('You must pick a seat on the map for this tier.');
      return;
    }

    setBusy(true);

    // Skip Stripe payment step if user is joining waitlist
    if (selectedTier === 'waitlist') {
      try {
        setStatus('Submitting waitlist request...');
        const data = await requestJson(`/api/events/${eventId}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ tier: 'waitlist' })
        });
        setStatus(data.message || 'Added to waitlist queue.');
        await loadEvent();
      } catch (error) {
        setStatus(error.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    setStatus('Initializing payment session...');

    try {
      const priceInCents = rawPrice * 100;
      const finalAmountInCents = Math.max(Math.round(priceInCents * (1 - discountPercent / 100)), 50);

      const intentData = await requestJson('/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ amount: finalAmountInCents })
      });

      if (!stripe || !elements) {
        throw new Error('Stripe payment system is currently unavailable.');
      }

      setStatus(`Processing card payment of $${(finalAmountInCents / 100).toFixed(2)}...`);
      const cardElement = elements.getElement(CardElement);
      const paymentResult = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: { card: cardElement }
      });

      if (paymentResult.error) {
        throw new Error(paymentResult.error.message);
      }

      setStatus('Payment confirmed! Reserving seat and dispatching ticket pass...');
      const data = await requestJson(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ tier: selectedTier, seatId: selectedSeat || null })
      });

      setStatus(data.message || 'Reservation request completed.');
      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
      }
      await loadEvent();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } catch (error) { }
    navigate('/login', { replace: true });
  }

  return (
    <div className="page-shell">
      <header className="top-strip">
        <div>
          <div className="eyebrow">RSVP Portal</div>
          <h1>{eventData ? eventData.title : 'Loading Event Details...'}</h1>
          <p>{eventData ? eventData.description || 'No descriptive context provided.' : 'Querying event engine metadata...'}</p>
        </div>
        <div className="button-row">
          <button className="secondary-btn" onClick={() => navigate('/events')}>Back to Events</button>
          <button className="secondary-btn danger" onClick={logout}>Log Out</button>
        </div>
      </header>

      {!eventData ? (
        <div className="notice error">{status}</div>
      ) : (
        <>
          <div className="metric-strip">
            <div className="metric-card"><strong>Date</strong><span>{formatDate(eventData.date)}</span></div>
            <div className="metric-card"><strong>Availability</strong><span>{eventData.attendees?.length || 0} / {eventData.capacity || 0} Filled</span></div>
            <div className="metric-card"><strong>Waitlist</strong><span>{eventData.waitlist?.length || 0} Requests</span></div>
          </div>

          <div className="detail-panel">
            <section className="tier-panel">
              <h3>Select Seating Tier</h3>
              <div className="tier-list">
                {[
                  { value: 'vip', label: 'VIP Priority Tier', description: 'Premium priority seating', disabled: isVipFull },
                  { value: 'general', label: 'General Admission', description: 'Standard main hall seats', disabled: isGeneralFull },
                  { value: 'waitlist', label: 'Join Waitlist', description: 'Queue up for open slots', disabled: !isFullyBooked }
                ].map((tier) => (
                  <label
                    className={`tier-card ${selectedTier === tier.value ? 'selected' : ''} ${tier.disabled ? 'disabled' : ''}`}
                    key={tier.value}
                    style={{ opacity: tier.disabled ? 0.4 : 1, cursor: tier.disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <input
                      type="radio"
                      name="seatTier"
                      value={tier.value}
                      disabled={tier.disabled}
                      checked={selectedTier === tier.value}
                      onChange={() => setSelectedTier(tier.value)}
                    />
                    <div>
                      <strong>{tier.label} {tier.disabled && tier.value !== 'waitlist' ? '(FULL)' : ''}</strong>
                      <span>{tier.description}</span>
                    </div>
                  </label>
                ))}
              </div>

              {selectedTier !== 'waitlist' && (
                <>
                  <div style={{ marginTop: '20px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                      Promotional Coupon
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. WELCOME10"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                      />
                      <button type="button" className="secondary-btn" onClick={applyCoupon}>Apply</button>
                    </div>
                    {discountPercent > 0 && (
                      <small style={{ color: 'var(--success)', marginTop: '4px', display: 'block' }}>
                        {discountPercent}% discount active
                      </small>
                    )}
                  </div>

                  {/* Stripe Payment Section */}
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Selected Seat:</span>
                      <strong>{selectedSeat || 'None'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Ticket Cost:</span>
                      <strong style={{ color: 'var(--accent)' }}>
                        {discountPercent > 0 ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginRight: '6px' }}>
                              ${rawPrice}
                            </span>
                            ${discountedPrice}
                            <span style={{ color: 'var(--success)', fontSize: '0.85rem', marginLeft: '6px' }}>
                              (-{discountPercent}%)
                            </span>
                          </>
                        ) : (
                          `$${rawPrice}`
                        )}
                      </strong>
                    </div>

                    <label style={{ fontSize: '0.9rem', color: 'var(--muted)', display: 'block', marginBottom: '10px' }}>
                      💳 Card Payment Details
                    </label>
                    <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)' }}>
                      <CardElement options={{
                        style: {
                          base: {
                            color: '#f4f7fb',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '16px',
                            '::placeholder': { color: '#97a4c0' }
                          }
                        }
                      }} />
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="seat-grid-shell">
              <div className="seat-grid" style={{ '--grid-cols': columns }}>
                {seats.map((seat) => {
                  const disabled = seat.status === 'booked' || selectedTier === 'waitlist' || (selectedTier === 'vip' && seat.type !== 'vip') || (selectedTier === 'general' && seat.type !== 'general');
                  const active = selectedSeat === seat.id;
                  return (
                    <button
                      type="button"
                      key={seat.id}
                      className={`seat-chip ${seat.type} ${seat.status} ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`}
                      disabled={disabled}
                      onClick={() => setSelectedSeat((current) => (current === seat.id ? '' : seat.id))}
                    >
                      {seat.id} (${seat.price})
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="notice neutral">{status}</div>

          {qrCodeUrl && (
            <div style={{ margin: '20px 0', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Your Entry Pass</h3>
              <img src={qrCodeUrl} alt="Verified Ticket QR Code" style={{ width: '180px', height: '180px', borderRadius: '12px' }} />
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '10px' }}>Present this QR code at venue entrance for check-in validation.</p>
            </div>
          )}

          <button className="primary-btn full-width" onClick={submitRsvp} disabled={busy}>
            {busy ? 'Processing...' : selectedTier === 'waitlist' ? 'Join Waitlist Queue' : 'Pay & Confirm Reservation'}
          </button>
        </>
      )}
    </div>
  );
}