# Devlog for backend

This project evolved from a basic JWT budget backend into a stricter per-user
budgeting API with session hydration, password recovery, and pie-chart-ready
summaries.
• Built JWT auth with login, register, refresh, logout, and /api/auth/me.
• Added password reset flow with hashed reset tokens, expiry, and strong password validation.
• Enforced strict per-user data isolation using ownerId as the primary ownership
key for budgets and transactions.
• Added legacy compatibility and a migration path to backfill ownerId for existing
Atlas documents.
• Hardened read/write routes so every budget and transaction query is scoped to
the authenticated user.
• Added session reload support by returning entries from auth responses so a
returning user can restore saved data on next visit.
• Added transaction summary breakdowns by category so the frontend can render
a pie chart directly.
• Normalized budget payload aliases so frontend variants like budgetName still
save correctly.
• Added tests for auth, isolation, category validation, password reset, session
reload, and migration behavior.

# Current State
• Budgets and transactions are saved under authenticated ownership.
• Existing records can be backfilled to ownerId.
• Login returns both the user and their saved entries.
• Transaction summaries now include pie-chart-friendly category data.
