# Secure RSVP & Event Ticketing Platform

This repository is now split into two major areas:

- `client/` contains the React UI built with Vite.
- `server/` contains the Express API, session handling, models, and route handlers.

## Stack

- Frontend: React, React Router, Vite
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: Express Session, bcrypt

## Run locally

Install dependencies first:

```bash
npm install
```

Start both client and server in development:

```bash
npm run dev
```

Or run them separately:

```bash
npm run server
npm run client
```

Build the React client for production:

```bash
npm run build
```

The server serves the built client from `client/dist` in production.
