# Loan API Demo

Sample backend project to demonstrate API development and automated testing.

## Stack
Node.js, TypeScript, Express, Zod, JWT, Mocha, Chai, Supertest

## Setup
```bash
npm install
npm start
npm test
```

## Endpoints
- `GET /health`: service health check
- `POST /login`: returns a JWT (demo password: `password123`)
- `GET /me`: protected route, requires `Authorization: Bearer <token>`
- `POST /loans`: create a loan application (validated with Zod)
- `POST /loans/:id/approve`: approve a pending loan

## Tests
- Health check returns 200 and `status: ok`
- Auth: valid login returns JWT
- Auth: wrong password returns 401
- Auth: invalid body returns 400 (Zod)
- Auth: protected route works with valid token
- Auth: missing or invalid token returns 401
- Loans: create a pending loan
- Loans: invalid or missing fields return 400 (Zod)
- Loans: request without token returns 401
- Loans: approve a loan, and 404 for a missing loan

## Progress
- [x] Project setup and health check
- [x] Auth (JWT login, 401 handling)
- [x] Loans (apply, approve, Zod validation)
- [ ] Payments (idempotency)
