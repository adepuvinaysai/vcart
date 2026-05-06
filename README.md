# VCart

A fullstack ecommerce website boilerplate with basic product browsing, cart management, and Stripe payment integration.

## Features

- Product catalog API
- Shopping cart UI
- Checkout flow with Stripe Checkout
- Order success page
- Backend in Node.js + Express
- Frontend in React + Vite
- User registration and login
- Persistent JSON storage for products, users, and orders
- Stripe Checkout payment flow
- Admin dashboard for product and order management

## Setup

1. Copy `.env.example` to `backend/.env` and add your Stripe secret key.
2. Install dependencies:

```bash
npm install --workspaces
```

3. Start backend and frontend in separate terminals:

```bash
npm run start:backend
npm run start:frontend
```

4. Open the frontend at `http://localhost:5173`.

## Admin access

A seeded admin user is created automatically when the backend first starts:

- Email: `admin@example.com`
- Password: `admin123`

Use this account to access the admin dashboard at `http://localhost:5173/admin`.

## Stripe

Use Stripe test keys. In `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
JWT_SECRET=supersecretkey
FRONTEND_URL=http://localhost:5173
BACKEND_PORT=4242
```

## Notes

This project is designed as a starter ecommerce app for development and demonstration. In production, replace in-memory data with a database, add authentication, and secure webhooks.
