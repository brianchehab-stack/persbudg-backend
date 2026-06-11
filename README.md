# persbudg-backend

Express and MongoDB backend for personal budgeting with JWT auth, strict per-user isolation, budgets, transactions, password reset, refresh tokens, and pagination.

## Quick Start

1. Install dependencies: `npm install`
2. Configure `.env`
3. Start MongoDB
4. Run the API: `npm start`

Required environment variables:

- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/persbudg`
- `JWT_SECRET=replace_with_a_long_random_secret`
- `FRONTEND_URLS=http://localhost:5173,http://localhost:3000`

## Scripts

- `npm start` starts the API.
- `npm run dev` starts the API with nodemon.
- `npm run seed` seeds demo users, budgets, and transactions.
- `npm run seed:clear` removes seeded demo data.
- `npm run migrate:owner-id` backfills `ownerId` for legacy budget and transaction records.
- `npm test` runs the API integration tests.

## Auth

Login and registration return:

- `accessToken`
- `refreshToken`
- `user` with `id`, `name`, and `email`
- `entries` with user-scoped `budgets` and `transactions`

Use `GET /api/auth/me` after login or page refresh to restore the current user and reload saved entries.
Use `POST /api/auth/refresh` to get a new token pair.
Use `POST /api/auth/logout` to clear the stored refresh token.

Forgot password flow:

1. Call `POST /api/auth/forgot-password` with the user's email.
2. In development, the response includes a `resetToken`.
3. Call `POST /api/auth/reset-password` with the reset token and a strong new password.

Password rules:

- at least 8 characters
- uppercase letter
- lowercase letter
- number
- symbol

## Data Isolation

All owned records are scoped server-side with `ownerId`.

- Budgets use `ownerId`.
- Transactions use `ownerId`.
- The API never accepts `ownerId` from request bodies.
- Read, update, and delete routes always include the authenticated owner in the query.

This prevents one user from reading or overwriting another user's data.

## Useful Endpoints

- `GET /api/auth/me`
- `GET /api/transactions/summary`
- `GET /api/transactions/category-options`
- `GET|POST|PUT|DELETE /api/budgets`
- `GET|POST|PUT|DELETE /api/transactions`

List endpoints support pagination and filters:

- `GET /api/budgets?page=1&limit=10`
- `GET /api/transactions?page=1&limit=10&type=expense&category=Food`

`GET /api/transactions/summary` returns:

- `income`
- `expense`
- `balance`
- `incomeByCategory`
- `expenseByCategory`

Those category arrays are ready for pie chart use in the frontend.

## Validation

- registration requires a valid email and strong password
- budget names accept common frontend aliases like `budgetName` and `title`
- budgets require a non-negative amount
- transactions require `type` to be `income` or `expense`
- list endpoints require positive integer `page` and `limit`

## Demo Data

Run `npm run seed`.

Demo credentials:

- Email: `demo@persbudg.local`
- Password: `Password123!`

## Frontend Integration

Send JWTs in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

Example:

```js
const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

## Testing

`npm test` uses Node's built-in test runner against `mongodb://127.0.0.1:27017/persbudg_test`.

If local MongoDB is not running, the tests will fail to connect.
