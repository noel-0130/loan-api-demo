import express from 'express';
import { z } from 'zod';
import { createLoan, getLoan, approveLoan } from './db';
import { requireAuth, signToken } from './auth';
import { paymentsRouter } from './payments';

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
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  if (parsed.data.password !== 'password123') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.status(200).json({ token: signToken(parsed.data.username) });
});

app.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ userId: (req as any).userId });
});

app.post('/loans', requireAuth, async (req, res) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const userId = (req as any).userId as string;
  const loan = await createLoan(userId, parsed.data.amount, parsed.data.termMonths);
  res.status(201).json(loan);
});

app.post('/loans/:id/approve', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const loan = await getLoan(id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }
  res.status(200).json(await approveLoan(id));
});

app.use(paymentsRouter);
