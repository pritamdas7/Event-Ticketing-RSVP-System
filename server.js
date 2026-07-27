const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/login', express.static(path.join(__dirname, 'views', 'login')));
app.use('/events', express.static(path.join(__dirname, 'views', 'events')));
app.use('/event', express.static(path.join(__dirname, 'views', 'attendee')));
app.use('/organizer', express.static(path.join(__dirname, 'views', 'organizer')));

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login', 'index.html')));
app.post('/login', (req, res) => res.redirect('/login?error=1'));
app.get('/events', (req, res) => res.sendFile(path.join(__dirname, 'views', 'events', 'index.html')));
app.get('/event/:eventId', (req, res) => res.sendFile(path.join(__dirname, 'views', 'attendee', 'index.html')));
app.get('/organizer', (req, res) => res.sendFile(path.join(__dirname, 'views', 'organizer', 'index.html')));

app.get('/', (req, res) => res.redirect('/login'));

app.use((req, res) => res.status(404).send('<h1>404: Resource Not Found</h1>'));

app.listen(PORT, () => {
  console.log(`RSVP Application Server running on http://localhost:${PORT}`);
});