# Loan API Demo

Sample backend project to demonstrate API development and automated testing.

## Stack
Node.js, TypeScript, Express, Mocha, Chai, Supertest

## Setup
```bash
npm install
npm start
npm test
```

## Endpoints
- `GET /health`: service health check

## Tests
- Health check returns 200 and `status: ok`

## Progress
- [x] Project setup and health check
- [ ] Auth (JWT login, 401 handling)
- [ ] Loans (apply, approve, Zod validation)
- [ ] Payments (idempotency)
