# persbudg-backend

Express and MongoDB backend for personal budgeting with JWT auth, budgets, transactions, refresh tokens, and pagination.

## Setup

1. Install dependencies:
   npm install
2. Start MongoDB locally.
3. Configure environment variables in `.env`.
4. Start the API:
   npm start

## Environment

Example values are in `.env.example`.

Required variables:

- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/persbudg`
- `JWT_SECRET=replace_with_a_long_random_secret`
- `FRONTEND_URLS=http://localhost:5173,http://localhost:3000`

## Scripts

- `npm start` starts the API.
- `npm run dev` starts the API with nodemon.
- `npm run seed` clears and repopulates demo data.
- `npm run seed:clear` clears seeded data.
- `npm test` runs API integration tests against `persbudg_test`.

## Auth Flow

Login and registration return:

- `accessToken` for API requests
- `refreshToken` for renewing access tokens

Use `POST /api/auth/refresh` with the refresh token to get a new token pair.
Use `POST /api/auth/logout` with an access token to clear the stored refresh token.

## Demo Data

Run:

```bash
npm run seed
```

Demo credentials:

- Email: `demo@persbudg.local`
- Password: `Password123!`

## API Usage

Example requests are in `requests.http`.

Main routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST|PUT|DELETE /api/budgets`
- `GET|POST|PUT|DELETE /api/transactions`

List endpoints support pagination and filters:

- `GET /api/budgets?page=1&limit=10`
- `GET /api/transactions?page=1&limit=10&type=expense&category=Food`

Protected routes require:

```http
Authorization: Bearer <jwt>
```

## Validation Notes

Route-level validation rejects malformed payloads before controller logic runs.

Examples:

- registration requires a valid email and password length >= 8
- budgets require a non-negative numeric amount
- transactions require `type` to be `income` or `expense`
- list endpoints require positive integer `page` and `limit` values when supplied

## Testing

`npm test` uses Node's built-in test runner and a separate MongoDB database:

- database: `mongodb://127.0.0.1:27017/persbudg_test`
- server: ephemeral local port

Continuous integration runs `npm test` on push and pull requests.

If local MongoDB is not running, the tests will fail to connect.

## Deploy on Render

1. Create a new Web Service on Render from this repository.
2. Use these settings:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Add these environment variables in Render:
   - `MONGO_URI=<your MongoDB connection string>`
   - `JWT_SECRET=<a long random secret>`
   - `FRONTEND_URLS=<your frontend URL>`
   - `PORT=10000` is not required; Render injects `PORT` automatically.
4. If you deploy from `render.yaml`, Render will use the same settings automatically.

## Connect Frontend to Backend

1. Set backend environment variables in `.env`:
   - `PORT=5000`
   - `FRONTEND_URLS=<your frontend URL>`
   - Example: `FRONTEND_URLS=http://localhost:5173`
2. Start backend:
   - `npm run dev`
3. In your frontend app, point API requests to:
   - `http://localhost:5000`
4. Send JWT in the `Authorization` header for protected endpoints:

```http
Authorization: Bearer <accessToken>
```

Example frontend request:

```js
const API_BASE_URL = 'http://localhost:5000';

const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```
