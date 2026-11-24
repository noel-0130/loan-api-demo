import express from 'express';
import { z } from 'zod';
import { db } from './store';
import { requireAuth, signToken } from './auth';

export const app = express();
app.use(express.json());

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const loanSchema = z.object({
  amount: z.number().positive().max(100000),
  termMonths: z.number().int().min(1).max(36),
});

const paymentSchema = z.object({
  loanId: z.number().int(),
  amount: z.number().positive(),
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Demo login: any username, password must be "password123"
app.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (parsed.data.password !== 'password123') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.status(200).json({ token: signToken(parsed.data.username) });
});

app.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ userId: (req as any).userId });
});

app.post('/loans', requireAuth, (req, res) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const loan = {
    id: db.nextLoanId++,
    userId: (req as any).userId as string,
    ...parsed.data,
    status: 'pending' as const,
  };
  db.loans.push(loan);
  return res.status(201).json(loan);
});

app.post('/loans/:id/approve', requireAuth, (req, res) => {
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  loan.status = 'approved';
  return res.status(200).json(loan);
});

app.post('/payments', requireAuth, (req, res) => {
  const key = req.header('Idempotency-Key');
  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }

  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const fingerprint = JSON.stringify(parsed.data);
  const existing = db.idempotency.get(key);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return res
        .status(422)
        .json({ error: 'Idempotency-Key reused with a different request' });
    }
    return res.status(201).json(existing.payment);
  }

  const loan = db.loans.find((l) => l.id === parsed.data.loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.status !== 'approved') {
    return res.status(409).json({ error: 'Loan not approved' });
  }

  const payment = { id: db.nextPaymentId++, ...parsed.data };
  db.payments.push(payment);
  db.idempotency.set(key, { fingerprint, payment });
  return res.status(201).json(payment);
});
