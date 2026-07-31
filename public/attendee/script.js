document.addEventListener('DOMContentLoaded', async () => {
  const pathSegments = window.location.pathname.split('/');
  const eventId = pathSegments[pathSegments.length - 1];

  // 1. ACTIVE SECURITY GUARD
  try {
    const authCheck = await fetch('/api/auth/status');
    const authData = await authCheck.json();
    if (!authData.authenticated || authData.role !== 'attendee') {
      document.body.innerHTML = '';
      window.location.replace('/login');
      return;
    }
  } catch (err) {
    window.location.replace('/login');
    return;
  }

  // DOM Selectors
  const eventTitle = document.getElementById('eventTitle');
  const eventDescription = document.getElementById('eventDescription');
  const eventDate = document.getElementById('eventDate');
  const eventCapacity = document.getElementById('eventCapacity');
  const submitButton = document.getElementById('submitRsvpBtn');
  const statusMessage = document.getElementById('statusMessage');
  const logoutBtn = document.getElementById('logoutBtn');

  // NEW DOM Selectors for Seat Map
  const attendeeSeatMap = document.getElementById('attendeeSeatMap');
  const tierInputs = Array.from(document.querySelectorAll('input[name="seatTier"]'));
  let selectedSeat = null;
  let allSeatsElements = [];

  // Logic to grey out unavailable seats based on tier selected
  function refreshSeatStates() {
    const selectedTierInput = document.querySelector('input[name="seatTier"]:checked');
    const currentTier = selectedTierInput ? selectedTierInput.value : 'general';

    allSeatsElements.forEach(seat => {
      const isVipSeat = seat.dataset.type === 'vip';
      const isBooked = seat.dataset.status === 'booked';

      let isDisabled = false;
      if (currentTier === 'waitlist' || isBooked) {
        isDisabled = true;
      } else if (currentTier === 'vip' && !isVipSeat) {
        isDisabled = true;
      } else if (currentTier === 'general' && isVipSeat) {
        isDisabled = true;
      }

      // Deselect if active seat becomes disabled
      if (isDisabled && seat === selectedSeat) {
        selectedSeat.classList.remove('selected');
        selectedSeat = null;
      }

      seat.classList.toggle('disabled', isDisabled);
    });

    if (currentTier === 'waitlist') {
      if (attendeeSeatMap) {
        attendeeSeatMap.style.opacity = '0.4';
        attendeeSeatMap.style.pointerEvents = 'none';
      }
    } else {
      if (attendeeSeatMap) {
        attendeeSeatMap.style.opacity = '1';
        attendeeSeatMap.style.pointerEvents = 'auto';
      }
    }
  }

  // Listen for radio button tier switches
  tierInputs.forEach(input => input.addEventListener('change', refreshSeatStates));

  // 2. FETCH AND UPDATE DYNAMIC TARGET METRICS & SEAT MAP
  async function fetchTargetEventData() {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      if (data.success) {
        const currentEvent = data.events.find(e => e._id === eventId);

        if (!currentEvent) {
          renderAlert('Requested event scheduling does not exist.', '#ff4a4a');
          submitButton.disabled = true;
          return;
        }

        eventTitle.textContent = currentEvent.title;
        eventDescription.textContent = currentEvent.description || 'No descriptive context provided.';

        const parsedDate = new Date(currentEvent.date);
        eventDate.textContent = parsedDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

        const filledSeats = currentEvent.attendees.length;
        const maxCapacity = currentEvent.capacity;
        eventCapacity.textContent = `${filledSeats} / ${maxCapacity} Claimed`;

        if (filledSeats >= maxCapacity) {
          renderAlert('Capacity full. Only Waitlist option is currently operating.', '#ffb74d');
        }

        // Render Map
        if (attendeeSeatMap) {
          attendeeSeatMap.innerHTML = '';
          allSeatsElements = [];

          // Auto-detect maximum columns dynamically to set layout configurations
          if (currentEvent.seats && currentEvent.seats.length > 0) {
            // Find the highest column number present in the event dataset
            const maxCol = Math.max(...currentEvent.seats.map(s => parseInt(s.id.replace(/^\D+/g, '')) || 0));
            attendeeSeatMap.style.setProperty('--grid-cols', maxCol);

            currentEvent.seats.forEach(seatData => {
              const seatElement = document.createElement('div');
              seatElement.className = `seat ${seatData.status} ${seatData.type}`;
              seatElement.textContent = seatData.id;
              seatElement.dataset.id = seatData.id;
              seatElement.dataset.type = seatData.type;
              seatElement.dataset.status = seatData.status;

              seatElement.addEventListener('click', () => {
                if (seatElement.classList.contains('disabled') || seatElement.classList.contains('booked')) return;

                if (selectedSeat) selectedSeat.classList.remove('selected');

                if (selectedSeat !== seatElement) {
                  selectedSeat = seatElement;
                  selectedSeat.classList.add('selected');
                } else {
                  selectedSeat = null; // Unselect if clicked again
                }
              });

              attendeeSeatMap.appendChild(seatElement);
              allSeatsElements.push(seatElement);
            });
            refreshSeatStates(); // Apply initial filter
          }
        }
      } else {
        renderAlert('Failed to synchronize streaming records.', '#ff4a4a');
      }
    } catch (err) {
      console.error(err);
      renderAlert('Operational data linkage error.', '#ff4a4a');
    }
  }

  fetchTargetEventData();

  // 3. EXECUTE BACKEND RSVP PIPELINE WITH SELECTED TIER & SEAT
  submitButton.addEventListener('click', async () => {
    const selectedTierInput = document.querySelector('input[name="seatTier"]:checked');
    const selectedTier = selectedTierInput ? selectedTierInput.value : 'general';

    if (selectedTier !== 'waitlist' && !selectedSeat) {
      renderAlert('You must pick a seat on the map for this tier.', '#ff4a4a');
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Verifying Tier Assets...';

      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          seatId: selectedSeat ? selectedSeat.dataset.id : null
        })
      });

      const data = await res.json();

      if (data.success) {
        const messageDisplay = selectedTier === 'waitlist'
          ? 'Added to the Waitlist queue successfully.'
          : `Reservation Confirmed! Your ${selectedTier.toUpperCase()} pass for seat ${selectedSeat.dataset.id} is verified.`;

        renderAlert(messageDisplay, '#03dac6');
        submitButton.textContent = 'Reservation Secured';
        fetchTargetEventData(); // Refresh seat availability visually
      } else {
        renderAlert(`Error: ${data.error}`, '#ff4a4a');
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm My Seat Reservation';
      }
    } catch (err) {
      renderAlert('Network transport anomaly detected.', '#ff4a4a');
      submitButton.disabled = false;
      submitButton.textContent = 'Confirm My Seat Reservation';
    }
  });

  function renderAlert(text, color) {
    statusMessage.textContent = text;
    statusMessage.style.borderColor = color;
    statusMessage.style.color = color;
  }

  // 4. LOGOUT EVENT LISTENER ROUTE LINK
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