import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/persbudg_test';

const mongooseModule = await import('mongoose');
const connectDBModule = await import('../config/db.js');
const appModule = await import('../app.js');
const userModule = await import('../models/User.js');
const budgetModule = await import('../models/Budget.js');
const transactionModule = await import('../models/Transaction.js');

const mongoose = mongooseModule.default;
const connectDB = connectDBModule.default;
const app = appModule.default;
const User = userModule.default;
const Budget = budgetModule.default;
const Transaction = transactionModule.default;

let server;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body
  };
};

const registerAndLogin = async () => {
  const registerResponse = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!'
    })
  });

  assert.equal(registerResponse.status, 201);
  assert.ok(registerResponse.body.accessToken);
  assert.ok(registerResponse.body.refreshToken);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Password123!'
    })
  });

  assert.equal(loginResponse.status, 200);
  assert.ok(loginResponse.body.accessToken);
  assert.ok(loginResponse.body.refreshToken);

  return loginResponse.body;
};

before(async () => {
  const connected = await connectDB();
  assert.equal(connected, true);

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  await Transaction.deleteMany({});
  await Budget.deleteMany({});
  await User.deleteMany({});
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

test('register, login, and fetch current user', async () => {
  const authPayload = await registerAndLogin();

  const meResponse = await request('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.email, 'test@example.com');
});

test('reject invalid registration payloads', async () => {
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'A',
      email: 'not-an-email',
      password: 'short'
    })
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /email|Password/i);
});
test('reject weak registration passwords', async () => {
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Weak Password User',
      email: 'weak@example.com',
      password: 'password'
    })
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /uppercase|lowercase|number|symbol/i);
});

test('budget CRUD flow works for an authenticated user', async () => {
  const authPayload = await registerAndLogin();

  const createResponse = await request('/api/budgets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      name: 'Groceries',
      category: 'Food',
      amount: 350,
      period: 'monthly'
    })
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.name, 'Groceries');

  const budgetId = createResponse.body._id;

  const summaryResponse = await request('/api/budgets/summary', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body[0].spent, 0);

  const listResponse = await request('/api/budgets?page=1&limit=1', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.pagination.limit, 1);
  assert.equal(listResponse.body.items.length, 1);

  const updateResponse = await request(`/api/budgets/${budgetId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      amount: 400,
      notes: 'Updated cap'
    })
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.amount, 400);

  const deleteResponse = await request(`/api/budgets/${budgetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(deleteResponse.status, 200);
  assert.match(deleteResponse.body.message, /deleted/i);
});

test('transaction CRUD and summary flow works for an authenticated user', async () => {
  const authPayload = await registerAndLogin();

  const categoryOptionsResponse = await request('/api/transactions/category-options', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(categoryOptionsResponse.status, 200);
  assert.ok(categoryOptionsResponse.body.income.includes('Salary'));
  assert.ok(categoryOptionsResponse.body.expense.includes('Dining'));

  const budgetResponse = await request('/api/budgets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      name: 'Transportation',
      category: 'Travel',
      amount: 200,
      period: 'monthly'
    })
  });

  assert.equal(budgetResponse.status, 201);

  const createResponse = await request('/api/transactions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      budget: budgetResponse.body._id,
      type: 'expense',
      category: 'Fuel',
      amount: 45.5,
      note: 'Gas station'
    })
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.category, 'Fuel');
  assert.equal(createResponse.body.note, 'Gas station');

  const transactionId = createResponse.body._id;

  const summaryResponse = await request('/api/transactions/summary', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.expense, 45.5);
  assert.equal(summaryResponse.body.income, 0);

  const updateResponse = await request(`/api/transactions/${transactionId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      amount: 50,
      note: 'Updated fuel total'
    })
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.amount, 50);
  assert.equal(updateResponse.body.note, 'Updated fuel total');

  const listResponse = await request('/api/transactions', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.pagination.limit, 10);
  assert.equal(listResponse.body.items.length, 1);

  const deleteResponse = await request(`/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(deleteResponse.status, 200);
  assert.match(deleteResponse.body.message, /deleted/i);
});

test('transaction creation rejects invalid category for type', async () => {
  const authPayload = await registerAndLogin();

  const createResponse = await request('/api/transactions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    },
    body: JSON.stringify({
      type: 'income',
      category: 'Dining',
      amount: 100,
      description: 'Should fail'
    })
  });

  assert.equal(createResponse.status, 400);
  assert.match(createResponse.body.message, /Category.*type/i);
});

test('refresh and logout endpoints manage token lifecycle', async () => {
  const authPayload = await registerAndLogin();

  const refreshResponse = await request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: authPayload.refreshToken
    })
  });

  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshResponse.body.accessToken);
  assert.ok(refreshResponse.body.refreshToken);

  const logoutResponse = await request('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshResponse.body.accessToken}`
    }
  });

  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.body.message, /logged out/i);

  const failedRefreshResponse = await request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshResponse.body.refreshToken
    })
  });

  assert.equal(failedRefreshResponse.status, 401);
});

test('pagination query validation rejects invalid values', async () => {
  const authPayload = await registerAndLogin();

  const response = await request('/api/budgets?page=0&limit=abc', {
    headers: {
      Authorization: `Bearer ${authPayload.accessToken}`
    }
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Page|Limit/i);
});

test('forgot-password and reset-password flow updates credentials', async () => {
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Reset User',
      email: 'reset@example.com',
      password: 'Password123!'
    })
  });

  const forgotResponse = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'reset@example.com'
    })
  });

  assert.equal(forgotResponse.status, 200);
  assert.ok(forgotResponse.body.resetToken);

  const resetResponse = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: forgotResponse.body.resetToken,
      password: 'NewPassword123!'
    })
  });

  assert.equal(resetResponse.status, 200);
  assert.match(resetResponse.body.message, /reset/i);

  const oldLoginResponse = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'reset@example.com',
      password: 'Password123!'
    })
  });

  assert.equal(oldLoginResponse.status, 401);
});

test('reset-password rejects weak passwords', async () => {
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Reset Weak User',
      email: 'reset-weak@example.com',
      password: 'Password123!'
    })
  });

  const forgotResponse = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'reset-weak@example.com'
    })
  });

  const resetResponse = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: forgotResponse.body.resetToken,
      password: 'weakpass'
    })
  });

  assert.equal(resetResponse.status, 400);
  assert.match(resetResponse.body.message, /uppercase|lowercase|number|symbol/i);
});

test('reset-password rejects invalid token', async () => {
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Reset User 2',
      email: 'reset2@example.com',
      password: 'Password123!'
    })
  });

  const response = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: 'not-a-valid-token',
      password: 'NewPassword123!'
    })
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /invalid|expired/i);
});
