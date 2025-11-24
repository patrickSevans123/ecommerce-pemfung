# E-Commerce Functional Programming Learning Project

## 📋 Overview

This is a full-stack E-Commerce application built with **Next.js 16** and **TypeScript**, designed specifically as a learning resource for applying **Functional Programming (FP)** concepts in a modern web development context.

Unlike typical object-oriented or imperative web apps, this project leverages mathematical principles like **Pure Functions**, **Functors**, and **Railway Oriented Programming** to build robust, type-safe, and testable systems. It features a complete shopping experience for buyers and a comprehensive analytics dashboard for sellers.

## 🎯 Learning Objectives

By exploring this codebase, you will learn how to implement:
- ✅ **Pure Functions** for predictable business logic
- ✅ **Railway Oriented Programming (ROP)** for robust error handling
- ✅ **Monoids** for complex data aggregation
- ✅ **Algebraic Data Types (ADTs)** for domain modeling
- ✅ **Pattern Matching** for state transitions
- ✅ **Function Composition** for building pipelines
- ✅ **Reactive Programming** for event handling

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **FP Libraries:**
  - `fp-ts`: Core FP abstractions (Monoid, Ord, Pipe)
  - `neverthrow`: Result types for ROP
  - `ts-pattern`: Exhaustive pattern matching
  - `ramda`: Functional utilities
  - `rxjs`: Reactive streams
- **State Management:** Zustand
- **Database:** MongoDB with Mongoose
- **Styling:** Tailwind CSS & Radix UI

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas URI)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd ecommerce-pemfung
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up environment variables**
    Create a `.env` file in the root directory:
    ```env
    MONGODB_URI=mongodb://localhost:27017/ecommerce-fp
    JWT_SECRET=your-secret
    NEXT_PUBLIC_API_URL=/api
    ```

4.  **Seed the database**
    ```bash
    npm run db:seed
    ```

### Running the Project

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📚 Functional Programming Concepts Demonstrated

### 1. Pure Functions
- **What it is**: Functions that always produce the same output for the same input and have no side effects.
- **Why it matters**: Makes code testable, predictable, and easier to debug.
- **Where to find it**: `lib/balance/operations.ts`

**Code Example:**
```typescript
// lib/balance/operations.ts
export const calculateEventValue = (event: BalanceEventRecord): number => {
  const multiplier = eventTypeMultiplier[event.type] ?? 0;
  return multiplier * event.amount;
};
```
**Explanation**: This function relies *only* on its input `event`. It doesn't read from a database or modify global state.

### 2. Railway Oriented Programming (ROP)
- **What it is**: A pattern for handling errors by chaining operations that return a `Result` type (Success or Failure).
- **Why it matters**: Eliminates `try/catch` hell and ensures errors are handled explicitly at each step.
- **Where to find it**: `lib/analytics/pipeline.ts`

**Code Example:**
```typescript
// lib/analytics/pipeline.ts
export const analyticsPipeline = (
  sellerId: string
): ResultAsync<SerializedAnalyticsResult, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .andThen(calculateAnalytics)
    .andThen(serializeAnalytics);
};
```
**Explanation**: We use `neverthrow`'s `ResultAsync`. If any step fails (e.g., `validateSellerId`), the pipeline stops and returns the error. If it succeeds, the data is passed to the next function (`andThen`).

### 3. Monoids
- **What it is**: A type with an associative binary operation (combine) and an identity element (empty).
- **Why it matters**: Allows for easy aggregation of data structures, parallel processing, and "folding" of lists.
- **Where to find it**: `lib/analytics/monoid.ts`

**Code Example:**
```typescript
// lib/analytics/monoid.ts
export const monoidSalesStatistics: Monoid<SalesStatistics> = {
  empty: {
    totalSales: 0,
    orderCount: 0,
    // ... other zero values
  },
  concat: (x, y) => ({
    totalSales: x.totalSales + y.totalSales,
    orderCount: x.orderCount + y.orderCount,
    // ... merging logic
  }),
};
```
**Explanation**: We define how to merge two `SalesStatistics` objects. We can then use `foldMap` to reduce an array of thousands of orders into a single statistics object efficiently.

### 4. Pattern Matching
- **What it is**: Checking a value against a pattern to determine code execution, often used with ADTs.
- **Why it matters**: More powerful and safer than `switch` statements, ensuring all cases are handled (exhaustiveness).
- **Where to find it**: `lib/order/stateMachine.ts`

**Code Example:**
```typescript
// lib/order/stateMachine.ts
export const transitionOrder = (current: OrderStatus, event: OrderEvent) => {
  return match([current, event])
    .with([{ status: 'pending' }, { type: 'ConfirmPayment' }], 
      () => ({ status: 'paid' as const, paidAt: new Date().toISOString() }))
    .with([{ status: 'paid' }, { type: 'Ship' }], 
      ([, e]) => ({ status: 'shipped' as const, tracking: e.trackingNumber }))
    .otherwise(() => null);
};
```
**Explanation**: We use `ts-pattern` to define valid state transitions. It visually maps `(Current State) + (Event) => (New State)`.

### 5. Higher-Order Functions
- **What it is**: Functions that take other functions as arguments or return them.
- **Why it matters**: Enables abstraction of control flow and creation of specialized functions.
- **Where to find it**: `lib/fp/productFilters.ts`

**Code Example:**
```typescript
// lib/fp/productFilters.ts
const filterBy = (predicate: (p: ProductDoc) => boolean) =>
  (products: ProductDoc[]): ProductDoc[] => products.filter(predicate);

// Usage
const filterByPrice = filterBy(byPriceRange(10, 100));
```
**Explanation**: `filterBy` is a factory that creates filtering functions. This allows us to compose complex filters dynamically.

### 6. Applicative Validation
- **What it is**: Validating multiple fields independently and collecting *all* errors, rather than failing on the first one.
- **Why it matters**: Provides better user experience by showing all form errors at once.
- **Where to find it**: `lib/cart/validation.ts`

**Code Example:**
```typescript
// lib/cart/validation.ts
export const validateCart = async (cart: CartInput) => {
  const validations = [
    validateQuantities(cart),
    validateCartSize(cart, context),
    validateStockAvailability(cart, context),
  ];
  
  // Collects all errors if any exist, otherwise returns success
  return map(sequence(validations), () => cart);
};
```

### 7. Partial Application
- **What it is**: The process of fixing a number of arguments to a function, producing another function of smaller arity.
- **Why it matters**: Allows for code reuse by creating specialized functions from general ones, and facilitates function composition.
- **Where to find it**: `lib/fp/productFilters.ts`

**Code Example:**
```typescript
// lib/fp/productFilters.ts
export const byCategory = (category?: string) => (p: ProductDoc) => {
  if (!category) return true;
  return (p.category || '').toLowerCase() === category.toLowerCase();
};

// Usage
// We "partially apply" the category argument
const electronicsFilter = byCategory('Electronics');
// Now we have a specialized function that only takes a product
products.filter(electronicsFilter);
```
**Explanation**: The `byCategory` function doesn't filter immediately. Instead, it returns a *new function* that remembers the category you passed. This makes it easy to create reusable filters like `electronicsFilter` or `furnitureFilter`.

### 8. Event Sourcing
- **What it is**: A pattern where state is determined by a sequence of events rather than just the current state.
- **Why it matters**: Provides a complete audit trail, enables time-travel debugging, and fits perfectly with immutable data structures.
- **Where to find it**: `lib/balance/operations.ts`

**Code Example:**
```typescript
// lib/balance/operations.ts
export const sumBalanceEvents = (events: BalanceEventRecord[]): number =>
  events.reduce((total, event) => total + calculateEventValue(event), 0);
```
**Explanation**: Instead of storing a user's balance in a database column that gets updated (mutated), we store every transaction (deposit, payment, refund, income). To get the current balance, we simply "replay" (reduce) all history. This guarantees data integrity and immutability.

## 🗂️ Project Structure

```
/app
  ├── api/              # Next.js API Routes (Backend)
  ├── (routes)/         # Frontend Pages (App Router)
  └── layout.tsx        # Root Layout
/lib
  ├── analytics/        # Analytics logic (Monoids, Pipelines)
  ├── balance/          # Balance system (Event Sourcing)
  ├── fp/               # Generic FP utilities (Pipe, Validation)
  ├── order/            # Order state machine
  ├── domain/           # Domain types (ADTs)
  └── db/               # Database models
/components
  ├── ui/               # Reusable UI components
  └── ...               # Feature components
/store                  # Zustand state stores
```

---
*Created for the Functional Programming Course - Semester 7*
