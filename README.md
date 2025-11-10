This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### 📊 Sales Analytics System
A comprehensive analytics system built with functional programming principles using `fp-ts`.

#### Specialized Analytics Endpoints:
- **`/api/analytics/[sellerId]/overview`** - Business overview metrics
- **`/api/analytics/[sellerId]/products`** - Product performance analysis
- **`/api/analytics/[sellerId]/orders`** - Order status and completion rates
- **`/api/analytics/[sellerId]/customers`** - Customer behavior insights
- **`/api/analytics/[sellerId]/revenue`** - Revenue breakdown and trends
- **`/api/analytics/[sellerId]/promo-codes`** - Promo code effectiveness
- **`/api/analytics/[sellerId]/time-series`** - Time-series data with period analysis
  - Supports daily, weekly, monthly granularity
  - Date range filtering
  - Unified endpoint for temporal analytics

#### Functional Programming Features:
- ✅ Pure functions with no side effects
- ✅ Monoid pattern for data aggregation
- ✅ fp-ts integration (Pipe, Ord, Array operations)
- ✅ Immutable data structures
- ✅ Type-safe operations
- ✅ Function composition
- ✅ Railway-Oriented Programming with ResultAsync

📖 For detailed documentation, see:
- [ANALYTICS-ENDPOINTS.md](./ANALYTICS-ENDPOINTS.md) - API reference
- [ANALYTICS-SUMMARY.md](./ANALYTICS-SUMMARY.md) - Implementation details
- [ANALYTICS-TESTING.md](./ANALYTICS-TESTING.md) - Testing guide

### 💰 Balance System with Event Sourcing
- Time-travel balance calculation
- Balance history API
- Event-based transactions

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Setup

### Seed the Database
```bash
npm run db:seed
```

### Reset Database
```bash
npm run db:reset
```

### Test Database Connection
```bash
npm run db:test
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test
```bash
npm test -- specialized.test.ts
```

### Watch Mode
```bash
npm run test:watch
```

## Analytics API Examples

### Get Overview Analytics
```bash
curl http://localhost:3000/api/analytics/[sellerId]/overview
```

### Get Product Metrics
```bash
curl http://localhost:3000/api/analytics/[sellerId]/products
```

### Get Revenue Breakdown
```bash
curl http://localhost:3000/api/analytics/[sellerId]/revenue
```

### Get Time-Series Data
```bash
# All time-series data
curl http://localhost:3000/api/analytics/[sellerId]/time-series

# With date range filter
curl "http://localhost:3000/api/analytics/[sellerId]/time-series?startDate=2024-01-01&endDate=2024-12-31"

# Specific period (daily)
curl "http://localhost:3000/api/analytics/[sellerId]/time-series?granularity=daily&date=2024-11-10"

# Specific period (weekly)
curl "http://localhost:3000/api/analytics/[sellerId]/time-series?granularity=weekly&date=2024-11-10"

# Specific period (monthly)
curl "http://localhost:3000/api/analytics/[sellerId]/time-series?granularity=monthly&date=2024-11-01"
```

For more examples, see [ANALYTICS-TESTING.md](./ANALYTICS-TESTING.md).

## 📮 Postman Collection

Import the complete API collection for testing:
```bash
postman_collection.json
```

The collection includes:
- ✅ 35+ endpoints with automated tests
- ✅ Environment variables for easy testing
- ✅ Pre-configured requests for all features
- ✅ Test assertions for response validation

## Project Structure

```
lib/
├── analytics/          # Analytics system
│   ├── types.ts       # TypeScript types
│   ├── monoid.ts      # Monoid pattern implementation
│   ├── service.ts     # Original aggregation service
│   └── specialized.ts # Specialized FP functions
├── balance/           # Balance system with event sourcing
├── cart/              # Shopping cart logic
├── order/             # Order state machine
└── payment/           # Payment processing

app/api/
├── analytics/         # Analytics endpoints
│   └── [sellerId]/
│       ├── overview/      # Business metrics summary
│       ├── products/      # Product performance
│       ├── orders/        # Order statistics
│       ├── customers/     # Customer insights
│       ├── revenue/       # Revenue breakdown
│       ├── promo-codes/   # Promo effectiveness
│       └── time-series/   # Temporal data (replaces /period)
├── balance-events/    # Balance event sourcing
├── cart/              # Cart operations
├── checkout/          # Checkout with Railway-Oriented Programming
├── orders/            # Order management with state machine
├── payment/           # Payment processing
├── products/          # Product CRUD
├── promo-codes/       # Promo code management
├── reviews/           # Product reviews
└── users/             # User management
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
