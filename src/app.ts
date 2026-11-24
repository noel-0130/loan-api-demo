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
