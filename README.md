# Secure RSVP & Event Ticketing Platform

A full-stack, scalable event management and ticketing platform. This system empowers organizers to build dynamic, interactive seating grids while providing attendees with a seamless reservation experience, complete with an automated FIFO (First-In, First-Out) waitlist that promotes users as seats become available.

## 🚀 Key Features

*   **Role-Based Access Control:** Secure portal routing for two distinct user types: Organizers (Event Hosts) and Attendees (Guests).
*   **Dynamic Seat Mapping:** An interactive coordinate grid builder allowing organizers to customize event layouts, set rows/columns, and designate VIP vs. General Admission seats.
*   **Automated FIFO Waitlist Engine:** When an event is at capacity, users are routed to a tier-specific queue. If a confirmed attendee cancels, the system automatically promotes the next eligible user in line and updates the database.
*   **Real-Time Analytics Dashboard:** Organizers have access to live metrics, including total hosted events, tier utilization (VIP/General booked vs. total), and active waitlist queue sizes.
*   **Glassmorphic UI/UX:** A modern, responsive frontend built with native HTML/CSS/JS, featuring state-driven UI updates and secure form interception.
*   **Secure Infrastructure:** Implementation of bcrypt password hashing, HTTP-only session cookies, anti-cache middleware for protected routes, and NoSQL injection mitigation.

## 🛠️ Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB, Mongoose (ODM)
*   **Authentication:** Express-Session, Bcrypt
*   **Frontend:** HTML5, CSS3 (CSS Variables, Grid, Flexbox), Vanilla JavaScript
*   **Architecture:** MVC-inspired (Models, Views, Controllers, Routes)

## 📁 Project Structure

```text
/
├── config/               # Database connection setup
├── controllers/          # Core business logic (Events, Auth)
├── middleware/           # Route guards and anti-cache protection
├── models/               # Mongoose schemas (User, Event, InviteCode)
├── public/               # Global static assets (CSS, JS)
│   ├── attendee/
│   ├── events/
│   ├── login/
│   └── organizer/
├── routes/               # API endpoints and view distribution
├── views/                # Protected HTML layouts
├── .env                  # Environment variables (ignored in Git)
├── .gitignore            # Git exclusion rules
├── package.json          # Dependency manifests
└── server.js             # Application entry point
