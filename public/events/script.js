document.addEventListener('DOMContentLoaded', async () => {
    // 1. ACTIVE SECURITY GUARD & IDENTITY VERIFICATION
    try {
        const authCheck = await fetch('/api/auth/status');
        const authData = await authCheck.json();
        if (!authData.authenticated) {
            window.location.replace('/login');
            return;
        }
    } catch (err) {
        window.location.replace('/login');
        return;
    }

    // DOM Elements
    const eventsGrid = document.getElementById('eventsGrid');
    const feedStatus = document.getElementById('feedStatus');
    const logoutBtn = document.getElementById('logoutBtn');

    // 2. FETCH EVENTS AND UPDATE INTERACTIVE FEED CARDS
    async function loadEventsFeed() {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();

            if (!data.success) {
                showStatus('Failed to retrieve active event clusters.', '#ff4a4a');
                return;
            }

            eventsGrid.innerHTML = '';

            if (data.events.length === 0) {
                eventsGrid.innerHTML = '<div class="empty-state">No active events are scheduled at this moment.</div>';
                return;
            }

            data.events.forEach(event => {
                // Calculate live seat availability data from the new array structure
                const totalSeats = event.seats ? event.seats.length : event.capacity;
                const bookedSeats = event.seats ? event.seats.filter(s => s.status === 'booked').length : event.attendees.length;
                const availableSeats = totalSeats - bookedSeats;

                const isFull = availableSeats <= 0;
                const parsedDate = new Date(event.date);

                // Build Glassmorphic Card Container
                const card = document.createElement('div');
                card.className = `event-card ${isFull ? 'event-full' : ''}`;

                card.innerHTML = `
          <div class="card-body">
            <span class="status-tag ${isFull ? 'tag-waitlist' : 'tag-available'}">
              ${isFull ? 'Waitlist Only' : `${availableSeats} Seats Left`}
            </span>
            <h2 class="event-title">${escapeHTML(event.title)}</h2>
            <p class="event-desc">${escapeHTML(event.description || 'No descriptive context provided for this arrangement.')}</p>
            
            <div class="event-meta-row">
              <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>${parsedDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">🪑</span>
                <span>Total Map Capacity: ${totalSeats} Layout Units</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="action-btn" onclick="window.location.href='/event/${event._id}'">
              ${isFull ? 'Request Waitlist Position' : 'Examine Seating & RSVP'} →
            </button>
          </div>
        `;

                eventsGrid.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            showStatus('Critical network linking failure.', '#ff4a4a');
        }
    }

    // Initial Boot load
    loadEventsFeed();

    // Helper Utility to mitigate XSS exposure via text injection
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    function showStatus(msg, color) {
        feedStatus.textContent = msg;
        feedStatus.style.color = color;
        feedStatus.style.borderColor = color;
        feedStatus.classList.remove('hidden');
    }

    // 3. SECURE AXIOS-STYLE LOGOUT MUTATION
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                const data = await response.json();
                if (data.success) window.location.replace('/login');
            } catch (err) {
                window.location.replace('/login');
            }
        });
    }
});