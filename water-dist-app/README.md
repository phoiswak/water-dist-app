# Water Distribution App

A logistics management system that automates water delivery order assignments from WooCommerce to local distributors.

## What It Does

- Automatically receives orders from your WooCommerce store
- Assigns orders to the nearest available distributor using an intelligent algorithm
- Allows distributors to manage their deliveries through a dashboard
- Generates and emails invoices when deliveries are completed
- Sends automated notifications at each step

## Key Features

### For Store Owners
- **Automatic Order Assignment** - Orders are instantly assigned to the best distributor
- **Smart Algorithm** - Considers both distance (60%) and distributor workload (40%)
- **Real-time Tracking** - Monitor order status from placement to delivery

### For Distributors
- **Order Dashboard** - View all assigned orders in one place
- **Accept/Reject Orders** - Full control over which orders to take
- **Status Updates** - Mark orders as picked up or delivered
- **Automatic Invoicing** - Invoices generated and emailed upon delivery completion

## Tech Stack

**Backend:** Node.js, Express, TypeScript, PostgreSQL
**Frontend:** React, TypeScript, Vite
**Integrations:** WooCommerce, Google Maps API, SendGrid

## How It Works

### 1. Order Flow
```
WooCommerce Order → Webhook → Geocoding → Auto-Assignment → Distributor Notification
```

### 2. Delivery Flow
```
Distributor Login → View Orders → Accept → Pick Up → Deliver → Invoice Sent
```

### 3. Order Statuses
- **new** - Just received from WooCommerce
- **assigned** - Assigned to a distributor
- **accepted** - Distributor accepted the order
- **picked_up** - Order picked up for delivery
- **delivered** - Delivered to customer (invoice sent)
- **cancelled** - Order cancelled

## Database Structure

**Main Tables:**
- `distributors` - Distributor info, location, capacity
- `orders` - Customer orders with geocoded addresses
- `assignments` - Order-distributor matches with scores
- `invoices` - Generated delivery invoices
- `notifications` - Email notification logs

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/integrations/woocommerce/webhook` | POST | Receive WooCommerce orders |
| `/api/auth/login` | POST | Distributor login |
| `/api/orders` | GET | Get assigned orders |
| `/api/orders/:id/accept` | POST | Accept an order |
| `/api/orders/:id/reject` | POST | Reject an order |
| `/api/orders/:id/status` | PATCH | Update order status |
| `/api/orders/:id/invoice` | POST | Generate invoice |

## Setup Requirements

### Environment Variables
- `GOOGLE_MAPS_API_KEY` - For geocoding and distance calculations
- `SENDGRID_API_KEY` - For email notifications
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Authentication secret key

### Google Maps APIs Needed
- Geocoding API
- Distance Matrix API

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`

3. Run database migrations:
```bash
npm run migrate
```

4. Start the backend:
```bash
cd packages/backend
npm run dev
```

5. Start the frontend:
```bash
cd packages/frontend
npm run dev
```

## User Guide

### For Distributors

1. **Login** - Use your email to login
2. **View Orders** - See all assigned orders in the dashboard
3. **Accept/Reject** - Click buttons to accept or reject orders
4. **Update Status** - Mark orders as picked up or delivered
5. **Invoices** - Automatically generated and sent when you mark delivered

### For Administrators

- Configure distributor locations and capacity in database
- Set up WooCommerce webhook to point to `/api/integrations/woocommerce/webhook`
- Monitor order assignments and system logs

## Assignment Algorithm

Orders are assigned based on:
- **60% Distance Score** - Closer distributors ranked higher
- **40% Workload Score** - Less busy distributors prioritized
- **Capacity Check** - Only distributors with available capacity considered

## Notifications

Automated emails sent for:
- New order assignments (to distributor)
- Order acceptance (to customer)
- Pickup confirmation (to customer)
- Delivery completion with invoice (to customer)

## Project Structure

```
water-dist-app/
├── packages/
│   ├── backend/          # Express API server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   └── models/   # Database models
│   │   └── migrations/   # Database migrations
│   └── frontend/         # React app
│       └── src/
│           ├── pages/    # Route components
│           └── components/
└── README.md
```

## Support

For issues or questions, refer to the [Implementation Guide](IMPLEMENTATION_GUIDE.md) for detailed technical documentation.
