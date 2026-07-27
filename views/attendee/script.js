const attendeeForm = document.querySelector('.rsvp-form');
const tierInputs = Array.from(document.querySelectorAll('input[name="tier"]'));
const submitButton = document.querySelector('.submit-button');
const paymentInfo = document.querySelector('.payment-info');
const seatMap = document.getElementById('seatMap');
const seatHelper = document.getElementById('seatHelper');
const eventTitleElement = document.getElementById('eventTitle');

let selectedSeat = null;
let seats = [];

const activeEventData = {
  name: 'Annual Summer Gala',
  seats: [
    { id: 'A1', type: 'vip', status: 'available' },
    { id: 'A2', type: 'vip', status: 'available' },
    { id: 'A3', type: 'vip', status: 'available' },
    { id: 'A4', type: 'vip', status: 'available' },
    { id: 'A5', type: 'vip', status: 'available' },
    { id: 'A6', type: 'vip', status: 'available' },
    { id: 'A7', type: 'vip', status: 'available' },
    { id: 'A8', type: 'vip', status: 'available' },
    { id: 'B1', type: 'general', status: 'available' },
    { id: 'B2', type: 'general', status: 'available' },
    { id: 'B3', type: 'general', status: 'available' },
    { id: 'B4', type: 'general', status: 'available' },
    { id: 'B5', type: 'general', status: 'available' },
    { id: 'B6', type: 'general', status: 'available' },
    { id: 'B7', type: 'general', status: 'available' },
    { id: 'B8', type: 'general', status: 'available' }
  ]
};

function loadStaticEventDetails() {
  eventTitleElement.textContent = activeEventData.name;
  document.title = `${activeEventData.name} - RSVP Portal`;

  seatMap.innerHTML = '';

  activeEventData.seats.forEach(seatData => {
    const seatElement = document.createElement('div');
    seatElement.className = `seat ${seatData.status} ${seatData.type}`;
    seatElement.textContent = seatData.id;

    seatElement.dataset.type = seatData.type;
    seatElement.dataset.status = seatData.status;

    seatElement.addEventListener('click', () => {
      if (seatElement.classList.contains('disabled') || seatElement.classList.contains('booked')) {
        return;
      }
      selectedSeat = selectedSeat === seatElement ? null : seatElement;
      refreshSeatStates();
    });

    seatMap.appendChild(seatElement);
  });

  seats = Array.from(document.querySelectorAll('.seat'));
  refreshSeatStates();
}

function currentTier() {
  const active = tierInputs.find((input) => input.checked);
  return active ? active.value : 'general';
}

function refreshSeatStates() {
  const tier = currentTier();

  if (tier === 'waitlist') {
    seatMap.classList.add('disabled-map');
    seatHelper.textContent = "Seat map is disabled because you are joining the waitlist.";
    seatHelper.style.color = "#ffb74d";
    selectedSeat = null;
  } else if (tier === 'vip') {
    seatMap.classList.remove('disabled-map');
    seatHelper.innerHTML = "Select a <span style='color: #bb86fc; font-weight: bold;'>VIP seat (Purple)</span>. General Admission seats are greyed out.";
    seatHelper.style.color = "#888";
  } else {
    seatMap.classList.remove('disabled-map');
    seatHelper.innerHTML = "Select a <span style='color: #03dac6; font-weight: bold;'>General seat (Teal)</span>. VIP seats are greyed out.";
    seatHelper.style.color = "#888";
  }

  seats.forEach((seat) => {
    const isVipSeat = seat.dataset.type === 'vip';
    const isBookedSeat = seat.classList.contains('booked') || seat.dataset.status === 'booked';
    let isDisabled = false;

    if (tier === 'waitlist' || isBookedSeat) {
      isDisabled = true;
    } else if (tier === 'vip' && !isVipSeat) {
      isDisabled = true;
    } else if (tier === 'general' && isVipSeat) {
      isDisabled = true;
    }

    if (isDisabled && seat === selectedSeat) {
      selectedSeat = null;
    }

    const isSelected = seat === selectedSeat;
    seat.classList.toggle('selected', isSelected);
    seat.classList.toggle('disabled', isDisabled);
    seat.setAttribute('aria-pressed', String(isSelected));
    seat.setAttribute('aria-disabled', String(isDisabled));
  });
}

// Event Listeners
tierInputs.forEach((input) => {
  input.addEventListener('change', refreshSeatStates);
});

submitButton.addEventListener('click', () => {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const tier = currentTier();

  if (!name || !email) {
    paymentInfo.textContent = 'Please finish the required fields before checkout.';
    paymentInfo.style.borderColor = '#cf6679';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    paymentInfo.textContent = 'Please enter a valid email address.';
    paymentInfo.style.borderColor = '#cf6679';
    return;
  }

  if (tier !== 'waitlist' && !selectedSeat) {
    paymentInfo.textContent = 'Please choose an available seat before checkout.';
    paymentInfo.style.borderColor = '#cf6679';
    return;
  }

  if (tier === 'waitlist') {
    paymentInfo.textContent = `${name}, you have been added to the waitlist. Updates will be sent to ${email}.`;
    paymentInfo.style.borderColor = '#ffb74d';
    nameInput.value = '';
    emailInput.value = '';
  } else {
    paymentInfo.textContent = `${name}, your ${tier.toUpperCase()} seat ${selectedSeat.textContent} has been reserved. A QR ticket will be sent to ${email}.`;
    paymentInfo.style.borderColor = '#03dac6';

    selectedSeat.classList.remove('available');
    selectedSeat.classList.add('booked');
    selectedSeat.dataset.status = 'booked';

    selectedSeat = null;
    nameInput.value = '';
    emailInput.value = '';
    refreshSeatStates();
  }
});

loadStaticEventDetails();