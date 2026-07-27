document.addEventListener('DOMContentLoaded', () => {
    const eventListContainer = document.getElementById('eventList');

    eventListContainer.innerHTML = '';

    const singleEvent = {
        id: 'summer-gala-2026',
        name: 'Annual Summer Gala',
        date: '2026-08-15'
    };

    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    eventCard.innerHTML = `
        <div class="event-details">
          <h3>${singleEvent.name}</h3>
          <p>Date: ${singleEvent.date}</p>
        </div>
        <button class="select-btn">Select Event</button>
    `;

    eventCard.querySelector('.select-btn').addEventListener('click', () => {
        window.location.href = `/event/${singleEvent.id}`;
    });

    eventListContainer.appendChild(eventCard);
});