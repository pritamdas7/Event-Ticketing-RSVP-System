# 🎟️ Event Ticketing & RSVP System

A full-stack **MERN** web application for creating, managing, and booking events online. The platform allows users to browse events, reserve tickets, receive QR-code based tickets, and enables organizers to manage registrations efficiently.

---

## 🌐 Live Demo

**Website:** *https://event-ticketing-rsvp-system.onrender.com*

## 📸 Features

### User Features
- User registration and login
- Browse available events
- View detailed event information
- RSVP and reserve tickets
- Secure online payment with Stripe
- QR Code ticket generation
- Email confirmation after successful booking
- View booked events

### Organizer/Admin Features
- Create new events
- Edit existing events
- Delete events
Manage attendee registrations
Track event capacity
View booking statistics 
 
---
 
## 🛠 Tech Stack 
 
### Frontend 
 - React 19 
 - Vite 
 - React Router DOM 
 - CSS 
 
### Backend 
 - Node.js 
 - Express.js 
 
### Database 
 - MongoDB 
 - Mongoose

# Authentication
- Express Session
- bcrypt

# Payment
- Stripe

# Additional Services
- Nodemailer
- QR Code Generator
- HTML5 QR Code Scanner

## 📂 Project Structure
```text
Event-Ticketing-RSVP-System/
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EventDetailPage.jsx
│   │   │   ├── EventsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── OrganizerPage.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   ├── session.css
│   │   └── styles.css
│   ├── index.html
│   └── vite.config.mjs
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── eventController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Event.js
│   │   ├── InviteCode.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── events.js
│   │   ├── organizer.js
│   │   └── payment.js
│   ├── utils/
│   │   └── emailService.js
│   └── server.js
│
├── .gitignore
├── .README.md
├── package-lock.json
└── package.json
```

## 🚀 Installation
1. Clone the repository:
```bash
git clone https://github.com/pritamdas7/Event-Ticketing-RSVP-System.git
```
2. Install dependencies:
- Root:
```bash
npm install
```
- Frontend:
```bash
cd client
npm install
```
- Backend:
```bash
cd ../server
npm install
```

## ⚙️ Environment Variables
Create a `.env` file inside the server directory with the following content:
```dotenv
PORT=5000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

## ▶️ Running the Project  
```bash 
cd client
npm run dev
```  
Open http://localhost:5000

## 💳 Payment Integration  
This project uses Stripe for secure payment processing.
During development, Stripe test keys can be used to simulate successful transactions without charging real money.

## 📧 Email Notifications  
after a successful booking, the system automatically sends an email confirmation containing the booking details and QR code ticket.

## 📱 QR Code Tickets  
each reservation generates a unique QR code that can be scanned during event check-in for quick verification.

## 🔒 Security Features  
- Password hashing using bcrypt  
- Session-based authentication  
- Protected routes  
- Input validation  
- Secure payment processing with Stripe

## Future Improvements:  
- JWT authentication
- Google OAuth login
- Event categories and search
- Event analytics dashboard
- PDF ticket downloads
- Attendance reports
- Admin dashboard improvements
- Push notifications
- Dark mode.
    
## 📄 License
This project is intended for educational and portfolio purposes.

## 👨‍💻 Author
Poromananda Das <br>
GitHub: https://github.com/pritamdas7
