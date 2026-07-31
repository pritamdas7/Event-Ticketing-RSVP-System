document.addEventListener('DOMContentLoaded', async () => {
  // 1. ACTIVE SECURITY GUARD
  try {
    const authCheck = await fetch('/api/auth/status');
    const authData = await authCheck.json();
    if (!authData.authenticated || authData.role !== 'organizer') {
      document.body.innerHTML = '';
      window.location.replace('/login');
      return;
    }
  } catch (err) {
    window.location.replace('/login');
    return;
  }

  // --- NEW ANALYTICS DOM SELECTORS ---
  const eventsCount = document.getElementById('totalEventsVal');
  const vipUtilization = document.getElementById('vipUtilizationVal');
  const generalUtilization = document.getElementById('generalUtilizationVal');
  const waitlistQueue = document.getElementById('waitlistQueueVal');

  // --- EXISTING DOM SELECTORS ---
  const sidebarItems = Array.from(document.querySelectorAll('.sidebar-menu li, .sidebar li'));
  const contentSections = Array.from(document.querySelectorAll('.content-section'));
  const logoutBtn = document.getElementById('logoutSidebarBtn');

  // --- INVENTORY & MODAL DOM SELECTORS ---
  const organizerEventsGrid = document.getElementById('organizerEventsGrid');
  const editEventModal = document.getElementById('editEventModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const saveEventBtn = document.getElementById('saveEventBtn');

  // --- WIZARD DOM SELECTORS & STATE ---
  const buildGridBtn = document.getElementById('buildGridBtn');
  const generateEventBtn = document.getElementById('generateEventBtn');
  const organizerSeatMap = document.getElementById('organizerSeatMap');
  const gridRowsInput = document.getElementById('gridRows');
  const gridColsInput = document.getElementById('gridCols');
  const wizardEventName = document.getElementById('wizardEventName');
  const wizardDate = document.getElementById('wizardDate');

  let currentSeatMap = [];

  // --- APP SYSTEM LEVEL HELPER FUNCTIONS ---
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // --- 2. DYNAMIC ANALYTICS PIPELINE ---
  async function loadDashboardAnalytics() {
    if (!eventsCount || !vipUtilization || !generalUtilization || !waitlistQueue) return;
    try {
      const res = await fetch('/api/organizer/analytics');
      const data = await res.json();

      if (data.success && data.metrics) {
        const m = data.metrics;

        eventsCount.textContent = m.eventsCount || 0;

        // Tier Formatting: Booked / Total
        const vipBooked = m.vipStats ? m.vipStats.booked : 0;
        const vipTotal = m.vipStats ? m.vipStats.total : 0;
        vipUtilization.textContent = `${vipBooked} / ${vipTotal}`;

        const genBooked = m.generalStats ? m.generalStats.booked : 0;
        const genTotal = m.generalStats ? m.generalStats.total : 0;
        generalUtilization.textContent = `${genBooked} / ${genTotal}`;

        // Waitlist logic default to 0 until backend array added
        waitlistQueue.textContent = m.waitlistCount || 0;
      }
    } catch (err) {
      console.error("Analytics rendering issue:", err);
    }
  }

  // --- 3. LIVE EVENT STREAM AND INVENTORY GENERATION ---
  async function loadOrganizerEventsGrid() {
    if (!organizerEventsGrid) return;
    try {
      const res = await fetch('/api/organizer/events');
      const data = await res.json();

      if (data.success) {
        organizerEventsGrid.innerHTML = '';
        if (data.events.length === 0) {
          organizerEventsGrid.innerHTML = `
            <div style="color: #6E6E73; grid-column: 1/-1; text-align: center; padding: 40px; border: 1px dashed #2C2C2C; border-radius: 10px;">
              No hosted events found. Build a dynamic map to begin.
            </div>`;
          return;
        }

        data.events.forEach(event => {
          const totalSeats = event.seats ? event.seats.length : event.capacity;
          const bookedSeats = event.seats ? event.seats.filter(s => s.status === 'booked').length : event.attendees.length;
          const parsedDate = new Date(event.date);
          const localIsoString = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000)
            .toISOString()
            .substring(0, 16);

          const card = document.createElement('div');
          card.className = 'stat-card';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'space-between';

          card.innerHTML = `
            <div>
              <h3 style="color: #FFFFFF; font-size: 16px; font-weight: 600; text-transform: none; margin-bottom: 8px;">${escapeHTML(event.title)}</h3>
              <p style="font-size: 13px; color: #A1A1A6; margin-bottom: 12px;">📅 ${parsedDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
              <p class="stat-number" style="font-size: 24px; margin-bottom: 4px;">${bookedSeats} / ${totalSeats}</p>
              <span class="stat-detail">Registered Seats Claimed</span>
            </div>
            <button class="btn-primary edit-trigger-btn" data-id="${event._id}" data-title="${escapeHTML(event.title)}" data-date="${localIsoString}" style="margin-top: 18px; width: 100%; padding: 8px 14px; font-size: 12px;">
              Edit Details
            </button>
          `;
          organizerEventsGrid.appendChild(card);
        });

        document.querySelectorAll('.edit-trigger-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.getElementById('editEventId').value = btn.dataset.id;
            document.getElementById('editEventName').value = btn.dataset.title;
            document.getElementById('editEventDate').value = btn.dataset.date;
            editEventModal.classList.remove('hidden');
          });
        });
      }
    } catch (err) {
      console.error("Failed to compile dashboard inventory map:", err);
    }
  }

  // --- 4. MODAL UTILITIES & UPDATE SUBSYSTEM ---
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => editEventModal.classList.add('hidden'));
  }

  if (saveEventBtn) {
    saveEventBtn.addEventListener('click', async () => {
      const id = document.getElementById('editEventId').value;
      const title = document.getElementById('editEventName').value.trim();
      const date = document.getElementById('editEventDate').value;

      if (!title || !date) return;

      try {
        saveEventBtn.disabled = true;
        saveEventBtn.textContent = 'Saving Changes...';

        const res = await fetch(`/api/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date })
        });

        const data = await res.json();
        if (data.success) {
          editEventModal.classList.add('hidden');
          await loadDashboardAnalytics();
          await loadOrganizerEventsGrid();
        } else {
          alert(`Modification Failed: ${data.error}`);
        }
      } catch (err) {
        console.error("Inventory tracking pipeline update fault:", err);
      } finally {
        saveEventBtn.disabled = false;
        saveEventBtn.textContent = 'Save Modifications';
      }
    });
  }

  // --- WIZARD: GRID BUILDER LOGIC ---
  if (buildGridBtn) {
    buildGridBtn.addEventListener('click', () => {
      const rows = parseInt(gridRowsInput.value) || 4;
      const cols = parseInt(gridColsInput.value) || 6;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      organizerSeatMap.innerHTML = '';
      currentSeatMap = [];

      // Inject CSS Variable for dynamic grid sizing and match stylesheet spacing bounds
      organizerSeatMap.style.setProperty('--grid-cols', cols);
      organizerSeatMap.style.display = 'grid';

      for (let r = 0; r < rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const seatId = `${alphabet[r]}${c}`;
          const seatElement = document.createElement('div');
          seatElement.className = 'seat general';
          seatElement.textContent = seatId;
          seatElement.dataset.id = seatId;
          seatElement.dataset.type = 'general';

          // Click handler to toggle General/VIP during creation
          seatElement.addEventListener('click', () => {
            if (seatElement.dataset.type === 'general') {
              seatElement.dataset.type = 'vip';
              seatElement.className = 'seat vip';
            } else {
              seatElement.dataset.type = 'general';
              seatElement.className = 'seat general';
            }
            const seatObj = currentSeatMap.find(s => s.id === seatId);
            if (seatObj) seatObj.type = seatElement.dataset.type;
          });

          organizerSeatMap.appendChild(seatElement);
          currentSeatMap.push({ id: seatId, type: 'general', status: 'available' });
        }
      }
    });
  }

  // --- WIZARD: PUBLISH EVENT LOGIC ---
  if (generateEventBtn) {
    generateEventBtn.addEventListener('click', async () => {
      const title = wizardEventName.value.trim();
      const date = wizardDate.value;

      if (!title || !date || currentSeatMap.length === 0) {
        alert('Please fill out the event name, date, and build a seat grid.');
        return;
      }

      try {
        generateEventBtn.disabled = true;
        generateEventBtn.textContent = 'Publishing...';

        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: 'An exclusive RSVP event.',
            date,
            seats: currentSeatMap
          })
        });

        const data = await res.json();

        if (data.success) {
          alert('Event published successfully!');
          wizardEventName.value = '';
          wizardDate.value = '';
          organizerSeatMap.innerHTML = '';
          currentSeatMap = [];

          const dashboardTab = document.querySelector('[data-target="dashboard-section"]');
          if (dashboardTab) dashboardTab.click();
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (err) {
        console.error('Publishing error:', err);
        alert('Failed to publish event due to a network anomaly.');
      } finally {
        generateEventBtn.disabled = false;
        generateEventBtn.textContent = '2. Publish Event to Database';
      }
    });
  }

  // --- 5. INTERFACE VIEW ROUTING SYNC ---
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'logoutSidebarBtn') return;

      const targetSectionId = item.getAttribute('data-target');

      sidebarItems.forEach(i => i.classList.remove('active'));
      contentSections.forEach(s => s.classList.add('hidden'));

      item.classList.add('active');
      const targetSection = document.getElementById(targetSectionId);
      if (targetSection) targetSection.classList.remove('hidden');

      if (targetSectionId === 'dashboard-section') {
        loadDashboardAnalytics();
        loadOrganizerEventsGrid();
      }
    });
  });

  // Initialize on boot
  loadDashboardAnalytics();
  loadOrganizerEventsGrid();

  // --- 6. SECURE SYSTEM DEAUTHORIZATION OUTFLOW ---
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