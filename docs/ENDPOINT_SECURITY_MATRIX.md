# PULSE — Endpoint Security Matrix

| Method | Path | Auth Required | Ownership Check | Target Status |
|---|---|---|---|---|
| `GET` | `/health` | No (Public) | N/A | Minimal `{"status": "ok"}` only (no DB/env details) |
| `POST` | `/api/v1/auth/sync` | Yes (`Bearer`) | Verified Firebase UID | Private |
| `GET` | `/api/v1/profile` | Yes (`Bearer`) | `user.id` | Private |
| `PATCH` | `/api/v1/profile` | Yes (`Bearer`) | `user.id` | Private |
| `POST` | `/api/v1/onboarding` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/transactions` | Yes (`Bearer`) | `Transaction.user_id == user.id` | Private |
| `POST` | `/api/v1/transactions` | Yes (`Bearer`) | Scoped to `user.id` | Private |
| `PATCH` | `/api/v1/transactions/{id}` | Yes (`Bearer`) | `Transaction.id == id AND user_id == user.id` | Private |
| `DELETE` | `/api/v1/transactions/{id}` | Yes (`Bearer`) | `Transaction.id == id AND user_id == user.id` | Private |
| `POST` | `/api/v1/transactions/import` | Yes (`Bearer`) | `StorageService` scoped to `user.id` | Private |
| `POST` | `/api/v1/transactions/import/confirm` | Yes (`Bearer`) | Scoped to `user.id` | Private |
| `GET` | `/api/v1/analytics/overview` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/analytics/categories` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/analytics/trends` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/analytics/insights` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/forecast` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/recurring` | Yes (`Bearer`) | `user.id` | Private |
| `PATCH` | `/api/v1/recurring/{merchant_name}` | Yes (`Bearer`) | `RecurringPayment.user_id == user.id` | Private |
| `GET` | `/api/v1/goals` | Yes (`Bearer`) | `SavingsGoal.user_id == user.id` | Private |
| `POST` | `/api/v1/goals` | Yes (`Bearer`) | Scoped to `user.id` | Private |
| `PATCH` | `/api/v1/goals/{id}` | Yes (`Bearer`) | `SavingsGoal.id == id AND user_id == user.id` | Private |
| `POST` | `/api/v1/goals/{id}/contributions` | Yes (`Bearer`) | `SavingsGoal.id == id AND user_id == user.id` | Private |
| `POST` | `/api/v1/simulator/evaluate` | Yes (`Bearer`) | `user.id` | Private |
| `GET` | `/api/v1/ai/status` | **FIX: Add `Bearer`** | N/A (remove `missing_config`) | Private |
| `POST` | `/api/v1/ai/chat` | Yes (`Bearer`) | `AIConversation.user_id == user.id` | Private |
| `GET` | `/api/v1/ai/conversations` | Yes (`Bearer`) | `AIConversation.user_id == user.id` | Private |
| `GET` | `/api/v1/ai/conversations/{id}` | Yes (`Bearer`) | `AIConversation.id == id AND user_id == user.id` | Private |
| `GET` | `/api/v1/notifications` | Yes (`Bearer`) | `Notification.user_id == user.id` | Private |
| `PATCH` | `/api/v1/notifications/{id}/read` | Yes (`Bearer`) | `Notification.id == id AND user_id == user.id` | Private |
| `PATCH` | `/api/v1/notification-preferences` | Yes (`Bearer`) | `NotificationPreference.user_id == user.id` | Private |
| `POST` | `/api/v1/notifications/test-email` | Yes (`Bearer`) | Sends to verified `user.email` only | Private |
| `*` | `/api/v1/demo/*` (17 routes) | **REMOVE** | N/A | Deleted (404) |
